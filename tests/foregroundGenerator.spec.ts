import { describe, expect, it } from "vitest";

import {
	generateAnsiForegrounds,
	generateForegroundSteps,
	generateForegrounds,
} from "../src/index.ts";

describe("generateForegrounds", () => {
	it("maps colors to grayscale lightness around the requested anchor", () => {
		const result = generateForegrounds(
			["#000000", "#FFFFFF", "#FF0000"],
			75,
			"black",
		);

		expect(result.foregrounds).toEqual(["#B9B9B9", "#000000", "#525252"]);
		expect(result.mappings[0]).toMatchObject({
			inputColor: "#000000",
			foregroundColor: "#B9B9B9",
			foregroundLab: { L: 75, a: 0, b: 0 },
		});
		expect(result.mappings[1]?.foregroundLab.L).toBe(0);
		expect(result.mappings[2]?.foregroundLab.L).toBeCloseTo(
			35.069404394019585,
			10,
		);
	});
});

describe("generateAnsiForegrounds", () => {
	it("returns the expected ANSI grayscale mapping at L=75, reference black", () => {
		const result = generateAnsiForegrounds(75, "black");

		expect(result.foregrounds.slice(0, 4)).toEqual([
			"#B9B9B9",
			"#868686",
			"#5F5F5F",
			"#555555",
		]);
		expect(result.mappings[0]?.inputName).toBe("black");
		expect(result.mappings.at(-1)?.foregroundColor).toBe("#000000");
	});
});

describe("generateForegroundSteps", () => {
	it("returns evenly spaced grayscale steps", () => {
		expect(generateForegroundSteps(75, "black", 3)).toMatchObject({
			L: 75,
			reference: "black",
			saturation: 0,
			foregrounds: ["#B9B9B9", "#585858", "#000000"],
			steps: [
				{ index: 0, foregroundLab: { L: 75, a: 0, b: 0 } },
				{ index: 1, foregroundLab: { L: 37.5, a: 0, b: 0 } },
				{ index: 2, foregroundLab: { L: 0, a: 0, b: 0 } },
			],
		});
	});

	it("shifts the start lightness toward the reference with saturation", () => {
		// L=75, reference=black (referenceL=0), saturation=1/3
		// startL = 75 + (1/3) * (0 - 75) = 75 - 25 = 50
		// steps: 50 → 25 → 0
		const result = generateForegroundSteps(75, "black", 3, 1 / 3);
		expect(result.saturation).toBe(1 / 3);
		expect(result.steps[0]?.foregroundLab.L).toBeCloseTo(50, 10);
		expect(result.steps[1]?.foregroundLab.L).toBeCloseTo(25, 10);
		expect(result.steps[2]?.foregroundLab.L).toBeCloseTo(0, 10);
	});

	it("saturation=0.5 on L=50 black reference starts at 25", () => {
		// startL = 50 + 0.5 * (0 - 50) = 25
		const result = generateForegroundSteps(50, "black", 3, 0.5);
		expect(result.steps[0]?.foregroundLab.L).toBeCloseTo(25, 10);
		expect(result.steps[2]?.foregroundLab.L).toBeCloseTo(0, 10);
	});

	it("saturation=1 collapses start to the reference endpoint", () => {
		// startL = referenceL = 0 for black, so all steps are 0
		const result = generateForegroundSteps(75, "black", 3, 1);
		for (const step of result.steps) {
			expect(step.foregroundLab.L).toBeCloseTo(0, 10);
		}
	});

	it("throws for saturation out of [0, 1]", () => {
		expect(() => generateForegroundSteps(75, "black", 3, -0.1)).toThrow(
			RangeError,
		);
		expect(() => generateForegroundSteps(75, "black", 3, 1.1)).toThrow(
			RangeError,
		);
	});
});
