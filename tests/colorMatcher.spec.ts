import { describe, expect, it } from "vitest";

import {
	matchAnsiColors,
	matchAnsiGrays,
	matchColors,
	matchGrays,
} from "../src/index.ts";

const CHROMATIC_ANSI_NAMES = [
	"red",
	"green",
	"yellow",
	"blue",
	"magenta",
	"cyan",
	"brightRed",
	"brightGreen",
	"brightYellow",
	"brightBlue",
	"brightMagenta",
	"brightCyan",
];

const ALL_ANSI_NAMES = [
	"black",
	"red",
	"green",
	"yellow",
	"blue",
	"magenta",
	"cyan",
	"white",
	"brightBlack",
	"brightRed",
	"brightGreen",
	"brightYellow",
	"brightBlue",
	"brightMagenta",
	"brightCyan",
	"brightWhite",
];

describe("matchColors", () => {
	it("returns one result per input with input preserved", () => {
		const colors: [number, number, number][] = [
			[255, 0, 0],
			[0, 255, 0],
			[0, 0, 255],
		];
		const results = matchColors(colors, 75);
		expect(results).toHaveLength(3);
		for (let i = 0; i < colors.length; i++) {
			expect(results[i]?.input).toEqual(colors[i]);
		}
	});

	it("match components are integers in [0, 255]", () => {
		for (const {
			match: [r, g, b],
		} of matchColors([[255, 0, 0]], 75)) {
			expect(Number.isInteger(r) && r >= 0 && r <= 255).toBe(true);
			expect(Number.isInteger(g) && g >= 0 && g <= 255).toBe(true);
			expect(Number.isInteger(b) && b >= 0 && b <= 255).toBe(true);
		}
	});

	it("throws for a gray input", () => {
		// Only pure black (0,0,0) gives exactly a=0, b=0 through the matrix multiply.
		// Neutral grays like [128,128,128] have sub-epsilon a/b due to FP noise and pass through.
		expect(() => matchColors([[0, 0, 0]], 75)).toThrow(/gray axis/);
	});

	it("throws for L on the boundary", () => {
		expect(() => matchColors([[255, 0, 0]], 0)).toThrow(RangeError);
		expect(() => matchColors([[255, 0, 0]], 100)).toThrow(RangeError);
	});

	it("throws for empty input", () => {
		expect(() => matchColors([], 75)).toThrow(RangeError);
	});

	it("throws for more than 256 colors", () => {
		const colors = Array.from(
			{ length: 257 },
			() => [255, 0, 0] as [number, number, number],
		);
		expect(() => matchColors(colors, 75)).toThrow(RangeError);
	});
});

describe("matchGrays — step mode", () => {
	it("n=2, L=0 to reference=100 gives black then white", () => {
		expect(matchGrays(2, 0, 100)).toEqual([
			[0, 0, 0],
			[255, 255, 255],
		]);
	});

	it("reversed range gives white then black", () => {
		expect(matchGrays(2, 100, 0)).toEqual([
			[255, 255, 255],
			[0, 0, 0],
		]);
	});

	it("n=1 returns a single gray at L", () => {
		const result = matchGrays(1, 50, 100);
		expect(result).toHaveLength(1);
		const [r, g, b] = result[0]!;
		expect(r).toBe(g);
		expect(g).toBe(b);
	});

	it("n=5 returns 5 grays in ascending lightness order", () => {
		const result = matchGrays(5, 0, 100);
		expect(result).toHaveLength(5);
		for (let i = 1; i < result.length; i++) {
			expect(result[i]![0]).toBeGreaterThanOrEqual(result[i - 1]![0]);
		}
	});

	it("throws for L === reference", () => {
		expect(() => matchGrays(3, 50, 50)).toThrow(RangeError);
	});

	it("throws for n=0", () => {
		expect(() => matchGrays(0, 0, 100)).toThrow(RangeError);
	});

	it("throws for L out of [0, 100]", () => {
		expect(() => matchGrays(3, -1, 100)).toThrow(RangeError);
		expect(() => matchGrays(3, 101, 0)).toThrow(RangeError);
	});
});

describe("matchGrays — projection mode", () => {
	it("black and white round-trip", () => {
		expect(
			matchGrays(
				[
					[0, 0, 0],
					[255, 255, 255],
				],
				0,
				100,
			),
		).toEqual([
			[0, 0, 0],
			[255, 255, 255],
		]);
	});

	it("result components are integers in [0, 255]", () => {
		for (const [r, g, b] of matchGrays(
			[
				[255, 0, 0],
				[0, 128, 255],
			],
			0,
			100,
		)) {
			expect(Number.isInteger(r) && r >= 0 && r <= 255).toBe(true);
			expect(Number.isInteger(g) && g >= 0 && g <= 255).toBe(true);
			expect(Number.isInteger(b) && b >= 0 && b <= 255).toBe(true);
		}
	});

	it("all outputs are neutral grays (r=g=b)", () => {
		for (const [r, g, b] of matchGrays(
			[
				[255, 0, 0],
				[0, 128, 64],
			],
			0,
			100,
		)) {
			expect(r).toBe(g);
			expect(g).toBe(b);
		}
	});

	it("returns same length as input", () => {
		const colors: [number, number, number][] = [
			[255, 0, 0],
			[0, 255, 0],
			[0, 0, 255],
		];
		expect(matchGrays(colors, 0, 100)).toHaveLength(3);
	});
});

describe("matchAnsiColors", () => {
	it("returns exactly 12 chromatic ANSI colors", () => {
		const result = matchAnsiColors(75);
		expect(result).toHaveLength(12);
		expect(result.map((r) => r.name)).toEqual(CHROMATIC_ANSI_NAMES);
	});

	it("match components are integers in [0, 255]", () => {
		for (const {
			match: [r, g, b],
		} of matchAnsiColors(75)) {
			expect(Number.isInteger(r) && r >= 0 && r <= 255).toBe(true);
			expect(Number.isInteger(g) && g >= 0 && g <= 255).toBe(true);
			expect(Number.isInteger(b) && b >= 0 && b <= 255).toBe(true);
		}
	});

	it("throws for L on the boundary", () => {
		expect(() => matchAnsiColors(0)).toThrow(RangeError);
		expect(() => matchAnsiColors(100)).toThrow(RangeError);
	});
});

describe("matchAnsiGrays", () => {
	it("returns all 16 ANSI colors in order", () => {
		const result = matchAnsiGrays(0, 100);
		expect(result).toHaveLength(16);
		expect(result.map((r) => r.name)).toEqual(ALL_ANSI_NAMES);
	});

	it("all outputs are neutral grays (r=g=b)", () => {
		for (const {
			match: [r, g, b],
		} of matchAnsiGrays(0, 100)) {
			expect(r).toBe(g);
			expect(g).toBe(b);
		}
	});

	it("black maps darker than white", () => {
		const result = matchAnsiGrays(0, 100);
		const black = result.find((r) => r.name === "black")!.match[0];
		const white = result.find((r) => r.name === "white")!.match[0];
		expect(black).toBeLessThan(white);
	});

	it("throws for L === reference", () => {
		expect(() => matchAnsiGrays(50, 50)).toThrow(RangeError);
	});
});
