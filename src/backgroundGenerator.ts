import { buildEvenGaps, buildEvenIndices } from "./helpers/bresehham.js";
import {
	buildEffectiveCircleVertices,
	getPlusAEffectiveVertexIndex,
} from "./helpers/paletteGeometry.js";
import type {
	Background,
	BackgroundBand,
	BackgroundOptions,
	EffectiveCircleVertex,
	RgbColor,
} from "./types.js";

const ALPHA_CHANNEL = 255;

interface ColorWindow {
	colors: RgbColor[];
	weights: number[];
}

interface InternalBackgroundBand extends BackgroundBand {
	colorWindow: ColorWindow;
}

function validateBackgroundInputs(
	L: number,
	width: number,
	height: number,
	options: BackgroundOptions,
): void {
	if (!Number.isFinite(L) || L < 0 || L > 100) {
		throw new RangeError("L must be a finite number in [0, 100].");
	}

	if (!Number.isInteger(width) || width <= 0) {
		throw new RangeError("width must be a positive integer.");
	}

	if (!Number.isInteger(height) || height <= 0) {
		throw new RangeError("height must be a positive integer.");
	}

	if (
		options.seed !== undefined &&
		(!Number.isFinite(options.seed) || !Number.isInteger(options.seed))
	) {
		throw new RangeError("seed must be an integer when provided.");
	}
}

function createRng(seed: number): () => number {
	let state = seed >>> 0;

	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let value = Math.imul(state ^ (state >>> 15), state | 1);
		value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
		return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
	};
}

function imageSeed(seed: number, index: number): number {
	return (seed + Math.imul(index + 1, 0x9e3779b1)) >>> 0;
}

function colorWindowSize(
	width: number,
	bandHeight: number,
	availableColorsAbove: number,
): number {
	const area = width * bandHeight;
	const window = Math.max(1, Math.round(Math.log(area + (Math.E - 1))));
	return Math.min(window, availableColorsAbove);
}

function triangularWeights(windowSize: number): number[] {
	const weights = Array.from(
		{ length: windowSize },
		(_, index) => windowSize - index,
	);
	const total = weights.reduce((sum, weight) => sum + weight, 0);
	return weights.map((weight) => weight / total);
}

function chooseColorIndex(
	weights: readonly number[],
	rng: () => number,
): number {
	let threshold = rng();

	for (let index = 0; index < weights.length; index++) {
		threshold -= weights[index];
		if (threshold <= 0) {
			return index;
		}
	}

	return weights.length - 1;
}

function paintBand(
	data: Uint8ClampedArray,
	width: number,
	yStart: number,
	yEnd: number,
	colorWindow: ColorWindow,
	rng: () => number,
): void {
	for (let y = yStart; y < yEnd; y++) {
		for (let x = 0; x < width; x++) {
			const offset = (y * width + x) * 4;
			const color =
				colorWindow.colors[chooseColorIndex(colorWindow.weights, rng)];
			data[offset] = color.r;
			data[offset + 1] = color.g;
			data[offset + 2] = color.b;
			data[offset + 3] = ALPHA_CHANNEL;
		}
	}
}

function buildBandLayout(
	width: number,
	height: number,
	palette: readonly EffectiveCircleVertex[],
): InternalBackgroundBand[] {
	const bandHeights = buildEvenGaps(height, palette.length);
	const bands: InternalBackgroundBand[] = [];
	let yEnd = height;

	for (let index = 0; index < palette.length; index++) {
		const bandHeight = bandHeights[index];
		const yStart = yEnd - bandHeight;
		const vertex = palette[index];

		bands.push({
			bandIndex: index,
			yStart,
			yEnd,
			height: bandHeight,
			vertexIndex: vertex.index,
			nominalColor: vertex.hex,
			windowSize: colorWindowSize(width, bandHeight, palette.length - index),
			colorWindow: { colors: [], weights: [] },
		});

		yEnd = yStart;
	}

	for (const band of bands) {
		const colors: RgbColor[] = [];
		for (let offset = 0; offset < band.windowSize; offset++) {
			colors.push(palette[band.bandIndex + offset].rgb);
		}

		band.colorWindow = {
			colors,
			weights: triangularWeights(band.windowSize),
		};
	}

	return bands;
}

function buildAnchoredPaletteFromCircle(
	circleVertices: readonly EffectiveCircleVertex[],
	bandCount: number,
	startVertexIndex: number,
): EffectiveCircleVertex[] {
	return buildEvenIndices(
		circleVertices.length,
		bandCount,
		startVertexIndex,
	).map((index) => circleVertices[index]);
}

function renderBackground(
	width: number,
	height: number,
	bands: readonly InternalBackgroundBand[],
	seed: number,
	imageIndex: number,
): Uint8ClampedArray {
	const data = new Uint8ClampedArray(width * height * 4);
	const rng = createRng(imageSeed(seed, imageIndex));

	for (const band of bands) {
		paintBand(data, width, band.yStart, band.yEnd, band.colorWindow, rng);
	}

	return data;
}

/**
 * Generate one in-memory RGBA background per effective RGB-distinct circle
 * vertex for the given lightness and image size. Image 0 uses the +a vertex on
 * the bottom band; subsequent images rotate that starting vertex forward by one
 * step around the effective circle.
 */
export function generateBackgrounds(
	L: number,
	width: number,
	height: number,
	options: BackgroundOptions = {},
): Background[] {
	validateBackgroundInputs(L, width, height, options);

	const seed = options.seed ?? 0;
	const circleVertices = buildEffectiveCircleVertices(L);
	const circleVertexCount = circleVertices.length;
	const bandCount = Math.min(height, circleVertexCount);
	const plusAStartIndex = getPlusAEffectiveVertexIndex(circleVertices);
	const backgrounds: Background[] = [];

	for (let imageIndex = 0; imageIndex < circleVertexCount; imageIndex++) {
		const startVertexIndex = (plusAStartIndex + imageIndex) % circleVertexCount;
		const palette = buildAnchoredPaletteFromCircle(
			circleVertices,
			bandCount,
			startVertexIndex,
		);
		const bands = buildBandLayout(width, height, palette);

		backgrounds.push({
			index: imageIndex,
			width,
			height,
			startVertexIndex,
			startColor: palette[0].hex,
			bandCount,
			bands: bands.map(({ colorWindow: _colorWindow, ...band }) => band),
			data: renderBackground(width, height, bands, seed, imageIndex),
		});
	}

	return backgrounds;
}
