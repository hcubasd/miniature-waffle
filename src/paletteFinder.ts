import {
	buildEffectiveCircleVertices,
	validatePolygonInputs,
} from "./helpers/paletteGeometry.js";
import { buildEvenGaps, buildIndicesFromGaps } from "./helpers/bresehham.js";
import type { HexColor } from "./types.js";

/**
 * Return all rotations of the Bresenham-distributed n-color palette on the
 * effective RGB-distinct circle at the given Lab lightness. Each entry is one
 * rotation: index 0 starts at the anchor vertex, index 1 shifts by one
 * position, and so on. The array length equals the effective circle size
 * (256 for most lightness values).
 *
 * At the degenerate extremes L=0 and L=100 the effective circle collapses to
 * a single color (black or white). Any positive integer n is accepted there;
 * the returned palette contains n copies of that one color.
 */
export function findPalettes(L: number, n: number): HexColor[][] {
	const vertices = buildEffectiveCircleVertices(L);
	if (vertices.length === 1) {
		if (!Number.isInteger(n) || n < 1) {
			throw new RangeError("n must be a positive integer.");
		}
		return [Array.from({ length: n }, () => vertices[0].hex)];
	}
	validatePolygonInputs(L, n, vertices.length);
	const gaps = buildEvenGaps(vertices.length, n);
	return vertices.map((_, startIndex) =>
		buildIndicesFromGaps(vertices.length, gaps, startIndex).map(
			(i) => vertices[i].hex,
		),
	);
}
