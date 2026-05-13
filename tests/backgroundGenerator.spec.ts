import { describe, expect, it } from "vitest";

import { generateBackgrounds } from "../src/index.ts";

describe("generateBackgrounds", () => {
	it("reduces 1x1 backgrounds to the nominal effective-circle colors", () => {
		const backgrounds = generateBackgrounds(75, 1, 1);
		const firstBackground = backgrounds[0];
		const secondBackground = backgrounds[1];

		expect(backgrounds).toHaveLength(256);
		expect(firstBackground).toMatchObject({
			startColor: "#FB9DBA",
			bandCount: 1,
		});
		expect(firstBackground).toBeDefined();
		expect(secondBackground).toBeDefined();
		expect(Array.from(firstBackground?.data ?? [])).toEqual([251, 157, 186, 255]);
		expect(Array.from(secondBackground?.data ?? [])).toEqual([252, 157, 184, 255]);
		expect(
			new Set(backgrounds.map((background) => background.startColor)).size,
		).toBe(256);
	});

	it("spreads extra scanlines across bands when height exceeds the band count", () => {
		const [background] = generateBackgrounds(75, 3, 257, { seed: 123 });

		expect(background.bandCount).toBe(256);
		expect(background.bands).toHaveLength(256);
		expect(background.bands.filter((band) => band.height === 2)).toHaveLength(
			1,
		);
		expect(background.bands.filter((band) => band.height === 1)).toHaveLength(
			255,
		);
	});
});
