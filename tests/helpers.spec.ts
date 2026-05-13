import { describe, expect, it } from "vitest";

import { buildEvenGaps, buildUniqueGapSequences } from "../src/helpers/bresehham.ts";
import { labToRgb, rgbToLab } from "../src/helpers/converters.ts";
import { getEffectiveCircleVertexCount } from "../src/helpers/paletteGeometry.ts";

describe("helper math", () => {
	it("keeps the known effective-circle counts across representative lightness values", () => {
		expect(getEffectiveCircleVertexCount(0)).toBe(1);
		expect(getEffectiveCircleVertexCount(1)).toBe(16);
		expect(getEffectiveCircleVertexCount(5)).toBe(32);
		expect(getEffectiveCircleVertexCount(10)).toBe(64);
		expect(getEffectiveCircleVertexCount(25)).toBe(128);
		expect(getEffectiveCircleVertexCount(50)).toBe(128);
		expect(getEffectiveCircleVertexCount(75)).toBe(256);
		expect(getEffectiveCircleVertexCount(95)).toBe(64);
		expect(getEffectiveCircleVertexCount(100)).toBe(1);
	});

	it("builds Bresenham-style gap distributions deterministically", () => {
		expect(buildEvenGaps(10, 3)).toEqual([3, 3, 4]);
		expect(buildUniqueGapSequences(10, 3)).toEqual([[3, 3, 4]]);
	});

	it("round-trips a representative RGB color through Lab", () => {
		const lab = rgbToLab(255, 0, 0);
		const rgb = labToRgb(lab.L, lab.a, lab.b);

		expect(rgb).toEqual({ r: 255, g: 0, b: 0 });
	});
});
