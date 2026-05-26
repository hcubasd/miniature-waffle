import { buildEvenGaps, buildIndicesFromGaps } from "./helpers/bresehham.js";
import { labToRgb, rgbToLab } from "./helpers/converters.js";
import { hungarian } from "./helpers/hungarian.js";
import { findRadius } from "./helpers/radiusFinder.js";
import type { ColorMatch, NamedColorMatch, RgbTuple } from "./types.js";

const N = 256;
const ANCHOR_THETA = (3 * Math.PI) / 2;

const ANSI_COLORS: { name: string; rgb: RgbTuple }[] = [
	{ name: "black", rgb: [0, 0, 0] },
	{ name: "red", rgb: [128, 0, 0] },
	{ name: "green", rgb: [0, 128, 0] },
	{ name: "yellow", rgb: [128, 128, 0] },
	{ name: "blue", rgb: [0, 0, 128] },
	{ name: "magenta", rgb: [128, 0, 128] },
	{ name: "cyan", rgb: [0, 128, 128] },
	{ name: "white", rgb: [192, 192, 192] },
	{ name: "brightBlack", rgb: [128, 128, 128] },
	{ name: "brightRed", rgb: [255, 0, 0] },
	{ name: "brightGreen", rgb: [0, 255, 0] },
	{ name: "brightYellow", rgb: [255, 255, 0] },
	{ name: "brightBlue", rgb: [0, 0, 255] },
	{ name: "brightMagenta", rgb: [255, 0, 255] },
	{ name: "brightCyan", rgb: [0, 255, 255] },
	{ name: "brightWhite", rgb: [255, 255, 255] },
];

const ANSI_CHROMATIC_COLORS = ANSI_COLORS.filter(
	({ rgb: [r, g, b] }) => !(r === g && g === b),
);

export function matchColors(colors: RgbTuple[], L: number): ColorMatch[] {
	if (!Number.isFinite(L) || L <= 0 || L >= 100) {
		throw new RangeError("L must be a finite number in (0, 100).");
	}
	const n = colors.length;
	if (n < 1 || n > N) {
		throw new RangeError(`colors must have between 1 and ${N} entries.`);
	}

	const projected = colors.map(([r, g, b], i) => {
		const lab = rgbToLab(r, g, b);
		if (lab.a === 0 && lab.b === 0) {
			throw new RangeError(`Color at index ${i} lies on the gray axis.`);
		}
		return { input: [r, g, b] as RgbTuple, a: lab.a, b: lab.b };
	});

	const radius = findRadius(L);
	const circle = Array.from({ length: N }, (_, k) => {
		const theta = ANCHOR_THETA + (k * 2 * Math.PI) / N;
		return { a: radius * Math.cos(theta), b: radius * Math.sin(theta) };
	});

	const gaps = buildEvenGaps(N, n);

	let bestTotal = Infinity;
	let bestAssignment: number[] = [];
	let bestStart = 0;

	for (let start = 0; start < N; start++) {
		const indices = buildIndicesFromGaps(N, gaps, start);
		const palette = indices.map((i) => circle[i]);
		const cost = projected.map((p) =>
			palette.map((v) => Math.hypot(p.a - v.a, p.b - v.b)),
		);
		const { total, assignment } = hungarian(cost);
		if (total < bestTotal) {
			bestTotal = total;
			bestAssignment = assignment;
			bestStart = start;
		}
	}

	const bestIndices = buildIndicesFromGaps(N, gaps, bestStart);
	const paletteRgb: RgbTuple[] = bestIndices.map((i) => {
		const { r, g, b } = labToRgb(L, circle[i].a, circle[i].b);
		return [r, g, b];
	});

	return projected.map((p, i) => ({
		input: p.input,
		match: paletteRgb[bestAssignment[i]],
	}));
}

export function matchGrays(
	input: number | RgbTuple[],
	L: number,
	reference: number,
): RgbTuple[] {
	if (!Number.isFinite(L) || L < 0 || L > 100) {
		throw new RangeError("L must be a finite number in [0, 100].");
	}
	if (!Number.isFinite(reference) || reference < 0 || reference > 100) {
		throw new RangeError("reference must be a finite number in [0, 100].");
	}
	if (L === reference) {
		throw new RangeError("L and reference must not be equal.");
	}

	const toGray = (lc: number): RgbTuple => {
		const mapped = L + (lc / 100) * (reference - L);
		const { r, g, b } = labToRgb(mapped, 0, 0);
		return [r, g, b];
	};

	if (Array.isArray(input)) {
		return input.map(([r, g, b]) => {
			const { L: lc } = rgbToLab(r, g, b);
			return toGray(lc);
		});
	}

	const n = input;
	if (!Number.isInteger(n) || n < 1 || n > N) {
		throw new RangeError(`n must be an integer in [1, ${N}].`);
	}
	if (n === 1) {
		return [toGray(0)];
	}
	return Array.from({ length: n }, (_, i) => toGray((i / (n - 1)) * 100));
}

export function matchAnsiColors(L: number): NamedColorMatch[] {
	return matchColors(
		ANSI_CHROMATIC_COLORS.map((c) => c.rgb),
		L,
	).map((result, i) => ({
		name: ANSI_CHROMATIC_COLORS[i].name,
		match: result.match,
	}));
}

export function matchAnsiGrays(
	L: number,
	reference: number,
): NamedColorMatch[] {
	return matchGrays(
		ANSI_COLORS.map((c) => c.rgb),
		L,
		reference,
	).map((match, i) => ({
		name: ANSI_COLORS[i].name,
		match,
	}));
}
