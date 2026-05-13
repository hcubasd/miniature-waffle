import { describe, expect, it } from "vitest";

import { matchAnsiColors, matchColors } from "../src/index.ts";

describe("matchColors", () => {
	it("matches a single red input to the closest singleton palette at L=75", () => {
		const result = matchColors(["#FF0000"], 75);

		expect(result.n).toBe(1);
		expect(result.inputs).toHaveLength(1);
		expect(result.matches).toHaveLength(1);
		expect(result.matches[0]?.palette).toEqual(["#F9A38D"]);
		expect(result.matches[0]?.totalDistance).toBeCloseTo(66.08566654615795, 10);
		expect(result.matches[0]?.pairing[0]).toMatchObject({
			inputColor: "#FF0000",
			paletteColor: "#F9A38D",
			paletteIndex: 0,
			inputIndex: 0,
		});
	});

	it("rejects grayscale inputs", () => {
		expect(() => matchColors(["#808080"], 75)).toThrow(/gray axis/);
	});
});

describe("matchAnsiColors", () => {
	it("returns a single best ANSI match at L=75", () => {
		const result = matchAnsiColors(75);

		expect(result.n).toBe(12);
		expect(result.matches).toHaveLength(1);
		expect(result.matches[0]?.palette.slice(0, 4)).toEqual([
			"#86BCFF",
			"#BCB0F6",
			"#E4A4DE",
			"#FB9DBA",
		]);
		expect(result.inputs.map((input) => input.inputName).slice(0, 4)).toEqual([
			"red",
			"green",
			"yellow",
			"blue",
		]);
	});
});
