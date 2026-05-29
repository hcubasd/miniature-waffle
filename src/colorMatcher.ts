import { buildEvenGaps, buildIndicesFromGaps } from "./helpers/bresenham.js";
import { labToRgb, rgbToLab } from "./helpers/converters.js";
import { hungarian } from "./helpers/hungarian.js";
import { findRadius } from "./helpers/radiusFinder.js";
import type { RgbColor } from "./types.js";

const N = 256;
const ANCHOR_THETA = (3 * Math.PI) / 2;

export function matchColors(n: number, L?: number): RgbColor[][];
export function matchColors(colors: RgbColor[], L?: number): RgbColor[];
export function matchColors(
	input: number | RgbColor[],
	L = 75,
): RgbColor[][] | RgbColor[] {
	if (!Number.isFinite(L) || L < 0 || L > 100) {
		throw new RangeError("L must be a finite number in [0, 100].");
	}

	if (typeof input === "number") {
		const n = input;
		if (!Number.isInteger(n) || n < 1 || n > N) {
			throw new RangeError(`n must be an integer in [1, ${N}].`);
		}

		if (L === 0 || L === 100) {
			const color = labToRgb(L, 0, 0);
			const palette = Array.from({ length: n }, () => color);
			return Array.from({ length: N }, () => palette);
		}

		const radius = findRadius(L);
		const vertices: RgbColor[] = Array.from({ length: N }, (_, k) => {
			const theta = ANCHOR_THETA + (k * 2 * Math.PI) / N;
			return labToRgb(L, radius * Math.cos(theta), radius * Math.sin(theta));
		});

		const gaps = buildEvenGaps(N, n);
		return Array.from({ length: N }, (_, start) =>
			buildIndicesFromGaps(N, gaps, start).map((i) => vertices[i]),
		);
	}

	const colors = input;
	const count = colors.length;
	if (count < 1 || count > N) {
		throw new RangeError(`colors must have between 1 and ${N} entries.`);
	}

	const projected = colors.map((color, i) => {
		const lab = rgbToLab(color.r, color.g, color.b);
		if (lab.a === 0 && lab.b === 0) {
			throw new RangeError(`Color at index ${i} lies on the gray axis.`);
		}
		return { a: lab.a, b: lab.b };
	});

	const radius = findRadius(L);
	const circle = Array.from({ length: N }, (_, k) => {
		const theta = ANCHOR_THETA + (k * 2 * Math.PI) / N;
		return { a: radius * Math.cos(theta), b: radius * Math.sin(theta) };
	});

	const gaps = buildEvenGaps(N, count);

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
	const paletteRgb: RgbColor[] = bestIndices.map((i) =>
		labToRgb(L, circle[i].a, circle[i].b),
	);

	return projected.map((_, i) => paletteRgb[bestAssignment[i]]);
}

export function matchGrays(
	input: number | RgbColor[],
	startL = 0,
	endL = 100,
): RgbColor[] {
	if (!Number.isFinite(startL) || startL < 0 || startL > 100) {
		throw new RangeError("startL must be a finite number in [0, 100].");
	}
	if (!Number.isFinite(endL) || endL < 0 || endL > 100) {
		throw new RangeError("endL must be a finite number in [0, 100].");
	}

	const toGray = (lc: number): RgbColor => {
		const mapped = startL + (lc / 100) * (endL - startL);
		return labToRgb(mapped, 0, 0);
	};

	if (Array.isArray(input)) {
		if (input.length < 1 || input.length > N) {
			throw new RangeError(`colors must have between 1 and ${N} entries.`);
		}
		return input.map(({ r, g, b }) => {
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
