import { buildEvenGaps, buildIndicesFromGaps } from "./helpers/bresehham.js";
import { labToRgb } from "./helpers/converters.js";
import { findRadius } from "./helpers/radiusFinder.js";
import type { RgbTuple } from "./types.js";

const N = 256;
const ANCHOR_THETA = (3 * Math.PI) / 2;

export function findPalettes(L: number, n: number): RgbTuple[][] {
	if (!Number.isFinite(L) || L <= 0 || L >= 100) {
		throw new RangeError("L must be a finite number in (0, 100).");
	}
	if (!Number.isInteger(n) || n < 1 || n > N) {
		throw new RangeError(`n must be an integer in [1, ${N}].`);
	}

	const radius = findRadius(L);

	const vertices: RgbTuple[] = Array.from({ length: N }, (_, k) => {
		const theta = ANCHOR_THETA + (k * 2 * Math.PI) / N;
		const { r, g, b } = labToRgb(
			L,
			radius * Math.cos(theta),
			radius * Math.sin(theta),
		);
		return [r, g, b];
	});

	const gaps = buildEvenGaps(N, n);

	return Array.from({ length: N }, (_, start) =>
		buildIndicesFromGaps(N, gaps, start).map((i) => vertices[i]),
	);
}
