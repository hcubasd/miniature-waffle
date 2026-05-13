import { describe, expect, it } from "vitest";

import { findPalettes } from "../src/index.ts";

describe("findPalettes", () => {
	it("returns the expected canonical 3-color palette at L=75", () => {
		expect(findPalettes(75, 3)).toEqual([
			["#86BCFF", "#FDA098", "#83C893"],
		]);
	});

	it("returns one singleton palette per effective-circle color", () => {
		const palettes = findPalettes(75, 1);

		expect(palettes).toHaveLength(256);
		expect(new Set(palettes.map(([color]) => color)).size).toBe(256);
	});

	it("rejects vertex counts above the effective circle size", () => {
		expect(() => findPalettes(0, 2)).toThrow(/n must be an integer in \[1, 1\]/);
	});
});
