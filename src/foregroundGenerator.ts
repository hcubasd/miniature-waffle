import { normalizeRgbColor, rgbToHex } from "./helpers/colorFormats.js";
import { labToRgb, rgbToLab } from "./helpers/converters.js";
import type {
	ColorInput,
	ColorReference,
	ForegroundMapping,
	ForegroundStep,
	GenerateForegroundStepsResult,
	GenerateForegroundsResult,
	NamedColor,
} from "./types.js";

const ANSI_16_COLORS = [
	{ name: "black", color: "#000000" },
	{ name: "red", color: "#800000" },
	{ name: "green", color: "#008000" },
	{ name: "yellow", color: "#808000" },
	{ name: "blue", color: "#000080" },
	{ name: "magenta", color: "#800080" },
	{ name: "cyan", color: "#008080" },
	{ name: "white", color: "#C0C0C0" },
	{ name: "brightBlack", color: "#808080" },
	{ name: "brightRed", color: "#FF0000" },
	{ name: "brightGreen", color: "#00FF00" },
	{ name: "brightYellow", color: "#FFFF00" },
	{ name: "brightBlue", color: "#0000FF" },
	{ name: "brightMagenta", color: "#FF00FF" },
	{ name: "brightCyan", color: "#00FFFF" },
	{ name: "brightWhite", color: "#FFFFFF" },
] satisfies ReadonlyArray<NamedColor>;

function validateReferenceLightness(
	L: number,
	reference: ColorReference,
): void {
	if (!Number.isFinite(L) || L < 0 || L > 100) {
		throw new RangeError("L must be a finite number in [0, 100].");
	}

	if (reference !== "black" && reference !== "white") {
		throw new RangeError('reference must be either "black" or "white".');
	}
}

function validateInputs(
	colors: readonly ColorInput[],
	L: number,
	reference: ColorReference,
): void {
	validateReferenceLightness(L, reference);

	if (!Array.isArray(colors) || colors.length === 0) {
		throw new RangeError("colors must be a non-empty array.");
	}
}

function mapProjectedLightness(
	sourceL: number,
	anchorL: number,
	reference: ColorReference,
): number {
	const referenceL = reference === "black" ? 0 : 100;
	return Math.max(
		0,
		Math.min(100, anchorL + ((referenceL - anchorL) * sourceL) / 100),
	);
}

function buildForegroundEntries(
	colors: readonly ColorInput[],
	L: number,
	reference: ColorReference,
	labels: readonly string[] = [],
): ForegroundMapping[] {
	return colors.map((color, index) => {
		const rgb = normalizeRgbColor(color);
		const originalLab = rgbToLab(rgb.r, rgb.g, rgb.b);
		const targetL = mapProjectedLightness(originalLab.L, L, reference);
		const foregroundRgb = labToRgb(targetL, 0, 0);

		return {
			index,
			inputName: labels[index],
			inputColor: rgbToHex(rgb),
			originalLab,
			projectedL: originalLab.L,
			foregroundLab: { L: targetL, a: 0, b: 0 },
			foregroundColor: rgbToHex(foregroundRgb),
		};
	});
}

function buildForegroundStepEntries(
	L: number,
	reference: ColorReference,
	count: number,
	saturation: number,
): ForegroundStep[] {
	if (!Number.isInteger(count) || count <= 0) {
		throw new RangeError("count must be a positive integer.");
	}

	const referenceL = reference === "black" ? 0 : 100;
	const startL = L + saturation * (referenceL - L);

	return Array.from({ length: count }, (_, index) => {
		const stepL =
			count === 1
				? startL
				: startL + ((referenceL - startL) * index) / (count - 1);
		const rgb = labToRgb(stepL, 0, 0);

		return {
			index,
			foregroundLab: { L: stepL, a: 0, b: 0 },
			foregroundColor: rgbToHex(rgb),
		};
	});
}

/**
 * Project input colors to the Lab L axis, then remap that scalar lightness
 * linearly so black maps to the requested center lightness L and white maps to
 * either black or white depending on the chosen reference.
 */
export function generateForegrounds(
	colors: readonly ColorInput[],
	L: number,
	reference: ColorReference,
): GenerateForegroundsResult {
	validateInputs(colors, L, reference);

	const mappings = buildForegroundEntries(colors, L, reference);
	return {
		L,
		reference,
		foregrounds: mappings.map((entry) => entry.foregroundColor),
		mappings,
	};
}

/**
 * Return evenly spaced grayscale steps on the Lab L axis from the start
 * lightness to the chosen reference endpoint.
 *
 * The optional `saturation` parameter (default `0`) shifts the start lightness
 * toward the reference by a fraction: `startL = L + saturation * (referenceL - L)`.
 * At `saturation = 0` (default) the first step is exactly `L`; at
 * `saturation = 1` both start and end collapse to the reference endpoint.
 */
export function generateForegroundSteps(
	L: number,
	reference: ColorReference,
	count: number,
	saturation = 0,
): GenerateForegroundStepsResult {
	validateReferenceLightness(L, reference);
	if (!Number.isFinite(saturation) || saturation < 0 || saturation > 1) {
		throw new RangeError("saturation must be a finite number in [0, 1].");
	}

	const steps = buildForegroundStepEntries(L, reference, count, saturation);
	return {
		L,
		reference,
		saturation,
		count,
		foregrounds: steps.map((entry) => entry.foregroundColor),
		steps,
	};
}

/**
 * Apply generateForegrounds to the 16 ANSI colors.
 */
export function generateAnsiForegrounds(
	L: number,
	reference: ColorReference,
): GenerateForegroundsResult {
	validateInputs(
		ANSI_16_COLORS.map((entry) => entry.color),
		L,
		reference,
	);

	const mappings = buildForegroundEntries(
		ANSI_16_COLORS.map((entry) => entry.color),
		L,
		reference,
		ANSI_16_COLORS.map((entry) => entry.name),
	);

	return {
		L,
		reference,
		foregrounds: mappings.map((entry) => entry.foregroundColor),
		mappings,
	};
}
