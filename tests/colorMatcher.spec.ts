import { describe, expect, it } from "vitest";

import { matchColors, matchGrays } from "../src/index.ts";
import type { RgbColor } from "../src/index.ts";

describe("matchColors — n-gon mode", () => {
	it("always returns 256 palettes", () => {
		expect(matchColors(1)).toHaveLength(256);
		expect(matchColors(3)).toHaveLength(256);
		expect(matchColors(256)).toHaveLength(256);
	});

	it("each palette has exactly n entries", () => {
		for (const n of [1, 3, 12]) {
			for (const palette of matchColors(n)) {
				expect(palette).toHaveLength(n);
			}
		}
	});

	it("all RGB components are integers in [0, 255]", () => {
		for (const palette of matchColors(3)) {
			for (const { r, g, b } of palette) {
				expect(Number.isInteger(r) && r >= 0 && r <= 255).toBe(true);
				expect(Number.isInteger(g) && g >= 0 && g <= 255).toBe(true);
				expect(Number.isInteger(b) && b >= 0 && b <= 255).toBe(true);
			}
		}
	});

	it("consecutive palettes are different rotations", () => {
		const palettes = matchColors(3);
		expect(palettes[0]).not.toEqual(palettes[1]);
	});

	it("L=0 returns 256 palettes of n blacks", () => {
		const palettes = matchColors(3, 0);
		expect(palettes).toHaveLength(256);
		for (const palette of palettes) {
			for (const color of palette) {
				expect(color).toEqual<RgbColor>({ r: 0, g: 0, b: 0 });
			}
		}
	});

	it("L=100 returns 256 palettes of n whites", () => {
		const palettes = matchColors(3, 100);
		expect(palettes).toHaveLength(256);
		for (const palette of palettes) {
			for (const color of palette) {
				expect(color).toEqual<RgbColor>({ r: 255, g: 255, b: 255 });
			}
		}
	});

	it("uses L=75 by default", () => {
		expect(() => matchColors(3)).not.toThrow();
	});

	it("n=2 returns 256 palettes of 2 colors", () => {
		const palettes = matchColors(2);
		expect(palettes).toHaveLength(256);
		for (const palette of palettes) {
			expect(palette).toHaveLength(2);
		}
	});

	it("throws for n=0", () => {
		expect(() => matchColors(0)).toThrow(RangeError);
	});

	it("throws for n > 256", () => {
		expect(() => matchColors(257)).toThrow(RangeError);
	});

	it("throws for L out of [0, 100]", () => {
		expect(() => matchColors(3, -1)).toThrow(RangeError);
		expect(() => matchColors(3, 101)).toThrow(RangeError);
	});
});

describe("matchColors — color matching mode", () => {
	it("returns one result per input", () => {
		const colors: RgbColor[] = [
			{ r: 255, g: 0, b: 0 },
			{ r: 0, g: 255, b: 0 },
			{ r: 0, g: 0, b: 255 },
		];
		expect(matchColors(colors)).toHaveLength(3);
	});

	it("result components are integers in [0, 255]", () => {
		for (const { r, g, b } of matchColors([{ r: 255, g: 0, b: 0 }])) {
			expect(Number.isInteger(r) && r >= 0 && r <= 255).toBe(true);
			expect(Number.isInteger(g) && g >= 0 && g <= 255).toBe(true);
			expect(Number.isInteger(b) && b >= 0 && b <= 255).toBe(true);
		}
	});

	it("uses L=75 by default", () => {
		expect(() => matchColors([{ r: 255, g: 0, b: 0 }])).not.toThrow();
	});

	it("throws for a gray input", () => {
		expect(() => matchColors([{ r: 0, g: 0, b: 0 }])).toThrow(/gray axis/);
	});

	it("throws for empty input", () => {
		expect(() => matchColors([])).toThrow(RangeError);
	});

	it("throws for more than 256 colors", () => {
		const colors = Array.from({ length: 257 }, () => ({ r: 255, g: 0, b: 0 }));
		expect(() => matchColors(colors)).toThrow(RangeError);
	});

	it("L=0 returns all blacks", () => {
		const result = matchColors([{ r: 255, g: 0, b: 0 }], 0);
		expect(result[0]).toEqual<RgbColor>({ r: 0, g: 0, b: 0 });
	});

	it("L=100 returns all whites", () => {
		const result = matchColors([{ r: 255, g: 0, b: 0 }], 100);
		expect(result[0]).toEqual<RgbColor>({ r: 255, g: 255, b: 255 });
	});

	it("throws for L out of [0, 100]", () => {
		expect(() => matchColors([{ r: 255, g: 0, b: 0 }], -1)).toThrow(RangeError);
		expect(() => matchColors([{ r: 255, g: 0, b: 0 }], 101)).toThrow(
			RangeError,
		);
	});
});

describe("matchGrays — step mode", () => {
	it("n=2, default range gives black then white", () => {
		expect(matchGrays(2)).toEqual([
			{ r: 0, g: 0, b: 0 },
			{ r: 255, g: 255, b: 255 },
		]);
	});

	it("reversed range gives white then black", () => {
		expect(matchGrays(2, 100, 0)).toEqual([
			{ r: 255, g: 255, b: 255 },
			{ r: 0, g: 0, b: 0 },
		]);
	});

	it("n=1 returns a single gray at startL", () => {
		const result = matchGrays(1, 50, 100);
		expect(result).toHaveLength(1);
		const { r, g, b } = result[0]!;
		expect(r).toBe(g);
		expect(g).toBe(b);
	});

	it("n=5 returns 5 grays in ascending order", () => {
		const result = matchGrays(5, 0, 100);
		expect(result).toHaveLength(5);
		for (let i = 1; i < result.length; i++) {
			expect(result[i]!.r).toBeGreaterThanOrEqual(result[i - 1]!.r);
		}
	});

	it("startL === endL returns n identical grays", () => {
		const result = matchGrays(3, 50, 50);
		expect(result).toHaveLength(3);
		expect(result[0]).toEqual(result[1]);
		expect(result[1]).toEqual(result[2]);
	});

	it("uses startL=0 endL=100 by default", () => {
		expect(() => matchGrays(3)).not.toThrow();
	});

	it("n=256 returns 256 grays", () => {
		expect(matchGrays(256)).toHaveLength(256);
	});

	it("throws for n=0", () => {
		expect(() => matchGrays(0)).toThrow(RangeError);
	});

	it("throws for startL or endL out of [0, 100]", () => {
		expect(() => matchGrays(3, -1, 100)).toThrow(RangeError);
		expect(() => matchGrays(3, 0, 101)).toThrow(RangeError);
	});
});

describe("matchGrays — projection mode", () => {
	it("black and white round-trip", () => {
		expect(
			matchGrays([
				{ r: 0, g: 0, b: 0 },
				{ r: 255, g: 255, b: 255 },
			]),
		).toEqual([
			{ r: 0, g: 0, b: 0 },
			{ r: 255, g: 255, b: 255 },
		]);
	});

	it("all outputs are neutral grays (r=g=b)", () => {
		for (const { r, g, b } of matchGrays([
			{ r: 255, g: 0, b: 0 },
			{ r: 0, g: 128, b: 64 },
		])) {
			expect(r).toBe(g);
			expect(g).toBe(b);
		}
	});

	it("result components are integers in [0, 255]", () => {
		for (const { r, g, b } of matchGrays([
			{ r: 255, g: 0, b: 0 },
			{ r: 0, g: 128, b: 255 },
		])) {
			expect(Number.isInteger(r) && r >= 0 && r <= 255).toBe(true);
			expect(Number.isInteger(g) && g >= 0 && g <= 255).toBe(true);
			expect(Number.isInteger(b) && b >= 0 && b <= 255).toBe(true);
		}
	});

	it("returns same length as input", () => {
		const colors: RgbColor[] = [
			{ r: 255, g: 0, b: 0 },
			{ r: 0, g: 255, b: 0 },
			{ r: 0, g: 0, b: 255 },
		];
		expect(matchGrays(colors)).toHaveLength(3);
	});

	it("startL === endL maps all to the same gray", () => {
		const result = matchGrays(
			[
				{ r: 255, g: 0, b: 0 },
				{ r: 0, g: 0, b: 255 },
			],
			50,
			50,
		);
		expect(result[0]).toEqual(result[1]);
	});

	it("throws for empty array", () => {
		expect(() => matchGrays([])).toThrow(RangeError);
	});

	it("throws for more than 256 colors", () => {
		const colors = Array.from({ length: 257 }, () => ({ r: 255, g: 0, b: 0 }));
		expect(() => matchGrays(colors)).toThrow(RangeError);
	});
});
