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
 */
export function findPalettes(L: number, n: number): HexColor[][] {
	validatePolygonInputs(L, n);
	const vertices = buildEffectiveCircleVertices(L);
	const gaps = buildEvenGaps(vertices.length, n);
	return vertices.map((_, startIndex) =>
		buildIndicesFromGaps(vertices.length, gaps, startIndex).map(
			(i) => vertices[i].hex,
		),
	);
}
