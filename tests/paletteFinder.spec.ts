import { describe, expect, it } from "vitest";

import { findPalettes } from "../src/index.ts";

describe("findPalettes", () => {
	it("returns all rotations of the 3-color palette at L=75", () => {
		const palettes = findPalettes(75, 3);
		expect(palettes).toHaveLength(256);
		expect(palettes[0]).toEqual(["#86BCFF", "#FDA098", "#83C893"]);
	});

	it("returns one singleton palette per effective-circle color", () => {
		const palettes = findPalettes(75, 1);

		expect(palettes).toHaveLength(256);
		expect(new Set(palettes.map(([color]) => color)).size).toBe(256);
	});

	it("rejects vertex counts above the effective circle size", () => {
		expect(() => findPalettes(75, 257)).toThrow(
			/n must be an integer in \[1,/,
		);
	});

	it("collapses to n copies of the single color at L=0", () => {
		const palettes = findPalettes(0, 3);
		expect(palettes).toHaveLength(1);
		expect(palettes[0]).toEqual(["#000000", "#000000", "#000000"]);
	});

	it("collapses to n copies of the single color at L=100", () => {
		const palettes = findPalettes(100, 3);
		expect(palettes).toHaveLength(1);
		expect(palettes[0]).toEqual(["#FFFFFF", "#FFFFFF", "#FFFFFF"]);
	});
});
