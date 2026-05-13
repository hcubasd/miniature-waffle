import {
	buildPaletteGeometries,
	validatePolygonInputs,
} from "./helpers/paletteGeometry.js";
import type { HexColor } from "./types.js";

/**
 * Return the RGB palettes induced by Bresenham-distributed n-vertex subsets of
 * the effective RGB-distinct circle at the given Lab lightness.
 *
 * For n > 1, palettes are deduplicated up to cyclic rotation.
 */
export function findPalettes(L: number, n: number): HexColor[][] {
	validatePolygonInputs(L, n);
	return buildPaletteGeometries(L, n).map((palette) =>
		palette.map((vertex) => vertex.hex),
	);
}
