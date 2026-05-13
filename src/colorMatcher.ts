import { rgbToLab } from "./helpers/converters.js";
import { hungarian } from "./helpers/hungarian.js";
import {
	buildPaletteGeometries,
	validatePolygonInputs,
} from "./helpers/paletteGeometry.js";
import { normalizeRgbColor, rgbToHex } from "./helpers/colorFormats.js";
import type {
	ColorInput,
	HexColor,
	LabColor,
	MatchColorsResult,
	MatchInput,
	NamedColor,
	PaletteMatch,
	RgbColor,
} from "./types.js";

const MATCH_EPSILON = 1e-9;

const ANSI_COLORS = [
	{ name: "red", color: "#800000" },
	{ name: "green", color: "#008000" },
	{ name: "yellow", color: "#808000" },
	{ name: "blue", color: "#000080" },
	{ name: "magenta", color: "#800080" },
	{ name: "cyan", color: "#008080" },
	{ name: "brightRed", color: "#FF0000" },
	{ name: "brightGreen", color: "#00FF00" },
	{ name: "brightYellow", color: "#FFFF00" },
	{ name: "brightBlue", color: "#0000FF" },
	{ name: "brightMagenta", color: "#FF00FF" },
	{ name: "brightCyan", color: "#00FFFF" },
] satisfies ReadonlyArray<NamedColor>;

interface NormalizedInput {
	index: number;
	name?: string;
	rgb: RgbColor;
	hex: HexColor;
	lab: LabColor;
	projectedLab: LabColor;
}

function normalizeInputColors(
	colors: readonly ColorInput[],
	L: number,
	labels: readonly string[] = [],
): NormalizedInput[] {
	if (!Array.isArray(colors) || colors.length === 0) {
		throw new RangeError("colors must be a non-empty array.");
	}

	return colors.map((color, index) => {
		const rgb = normalizeRgbColor(color);
		if (rgb.r === rgb.g && rgb.g === rgb.b) {
			throw new RangeError(
				`Input color at index ${index} lies on the gray axis and cannot be matched.`,
			);
		}

		const lab = rgbToLab(rgb.r, rgb.g, rgb.b);
		return {
			index,
			name: labels[index],
			rgb,
			hex: rgbToHex(rgb),
			lab,
			projectedLab: { L, a: lab.a, b: lab.b },
		};
	});
}

function planarDistance(pointA: LabColor, pointB: LabColor): number {
	return Math.hypot(pointA.a - pointB.a, pointA.b - pointB.b);
}

function paletteCostMatrix(
	projectedInputs: readonly NormalizedInput[],
	palette: ReturnType<typeof buildPaletteGeometries>[number],
): number[][] {
	return projectedInputs.map((input) =>
		palette.map((vertex) => planarDistance(input.projectedLab, vertex.lab)),
	);
}

function pairMatch(
	projectedInputs: readonly NormalizedInput[],
	palette: ReturnType<typeof buildPaletteGeometries>[number],
	assignment: readonly number[],
	totalDistance: number,
): PaletteMatch {
	return {
		totalDistance,
		palette: palette.map((vertex) => vertex.hex),
		pairing: assignment.map((paletteIndex, inputIndex) => {
			const input = projectedInputs[inputIndex];
			const vertex = palette[paletteIndex];
			return {
				inputIndex,
				inputName: input.name,
				inputColor: input.hex,
				projectedLab: input.projectedLab,
				paletteIndex,
				paletteColor: vertex.hex,
				paletteLab: vertex.lab,
				distance: planarDistance(input.projectedLab, vertex.lab),
			};
		}),
	};
}

/**
 * Match input RGB colors to the unique Bresenham n-gons at the given L by
 * projecting the inputs orthogonally onto the constant-L Lab plane and solving
 * the minimum-total-distance assignment for every candidate palette.
 */
export function matchColors(
	colors: readonly ColorInput[],
	L: number,
): MatchColorsResult {
	const n = Array.isArray(colors) ? colors.length : 0;
	validatePolygonInputs(L, n);

	const projectedInputs = normalizeInputColors(colors, L);
	const palettes = buildPaletteGeometries(L, n);

	let bestTotal = Number.POSITIVE_INFINITY;
	const matches: PaletteMatch[] = [];

	for (const palette of palettes) {
		const { total, assignment } = hungarian(
			paletteCostMatrix(projectedInputs, palette),
		);
		const match = pairMatch(projectedInputs, palette, assignment, total);

		if (total + MATCH_EPSILON < bestTotal) {
			bestTotal = total;
			matches.length = 0;
			matches.push(match);
		} else if (Math.abs(total - bestTotal) <= MATCH_EPSILON) {
			matches.push(match);
		}
	}

	const inputs: MatchInput[] = projectedInputs.map((input) => ({
		index: input.index,
		inputName: input.name,
		inputColor: input.hex,
		originalLab: input.lab,
		projectedLab: input.projectedLab,
	}));

	return {
		L,
		n,
		inputs,
		matches,
	};
}

/**
 * Match the 12 non-gray ANSI colors at the given L.
 */
export function matchAnsiColors(L: number): MatchColorsResult {
	const result = matchColors(
		ANSI_COLORS.map((entry) => entry.color),
		L,
	);

	const names = ANSI_COLORS.map((entry) => entry.name);

	return {
		...result,
		inputs: result.inputs.map((input, index) => ({
			...input,
			inputName: names[index],
		})),
		matches: result.matches.map((match) => ({
			...match,
			pairing: match.pairing.map((pair) => ({
				...pair,
				inputName: names[pair.inputIndex],
			})),
		})),
	};
}
