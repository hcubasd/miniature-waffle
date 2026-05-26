import { describe, expect, it } from "vitest";

import { findPalettes } from "../src/index.ts";

describe("findPalettes", () => {
	it("always returns 256 palettes", () => {
		expect(findPalettes(50, 1)).toHaveLength(256);
		expect(findPalettes(50, 3)).toHaveLength(256);
		expect(findPalettes(50, 256)).toHaveLength(256);
	});

	it("each palette has exactly n entries", () => {
		for (const n of [1, 3, 12]) {
			for (const palette of findPalettes(50, n)) {
				expect(palette).toHaveLength(n);
			}
		}
	});

	it("all RGB components are integers in [0, 255]", () => {
		for (const palette of findPalettes(50, 3)) {
			for (const [r, g, b] of palette) {
				expect(Number.isInteger(r) && r >= 0 && r <= 255).toBe(true);
				expect(Number.isInteger(g) && g >= 0 && g <= 255).toBe(true);
				expect(Number.isInteger(b) && b >= 0 && b <= 255).toBe(true);
			}
		}
	});

	it("consecutive palettes start at different colors (rotations)", () => {
		const palettes = findPalettes(50, 3);
		expect(palettes[0]).not.toEqual(palettes[1]);
	});

	it("throws for L on the boundary (open interval)", () => {
		expect(() => findPalettes(0, 3)).toThrow(RangeError);
		expect(() => findPalettes(100, 3)).toThrow(RangeError);
	});

	it("throws for n=0", () => {
		expect(() => findPalettes(50, 0)).toThrow(RangeError);
	});

	it("throws for n > 256", () => {
		expect(() => findPalettes(50, 257)).toThrow(RangeError);
	});

	it("throws for non-integer n", () => {
		expect(() => findPalettes(50, 1.5)).toThrow(RangeError);
	});
});
