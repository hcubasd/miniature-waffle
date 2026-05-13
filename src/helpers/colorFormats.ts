import type { ColorInput, HexColor, RgbColor, RgbTuple } from "../types.js";

function isRgbChannel(value: unknown): value is number {
	return (
		typeof value === "number" &&
		Number.isInteger(value) &&
		value >= 0 &&
		value <= 255
	);
}

function isRgbTuple(value: unknown): value is RgbTuple {
	return (
		Array.isArray(value) &&
		value.length === 3 &&
		value.every((channel) => isRgbChannel(channel))
	);
}

function isRgbObject(value: unknown): value is RgbColor {
	return (
		typeof value === "object" &&
		value !== null &&
		"r" in value &&
		"g" in value &&
		"b" in value &&
		isRgbChannel(value.r) &&
		isRgbChannel(value.g) &&
		isRgbChannel(value.b)
	);
}

export function rgbToHex({ r, g, b }: RgbColor): HexColor {
	return `#${[r, g, b]
		.map((channel) => channel.toString(16).padStart(2, "0").toUpperCase())
		.join("")}` as HexColor;
}

export function normalizeHex(hex: string): HexColor {
	const match = /^#?([0-9a-f]{6})$/iu.exec(hex);
	const hexDigits = match?.[1];
	if (!hexDigits) {
		throw new TypeError("Color strings must be #RRGGBB hex values.");
	}

	return `#${hexDigits.toUpperCase()}` as HexColor;
}

export function normalizeRgbColor(color: ColorInput): RgbColor {
	if (typeof color === "string") {
		const hex = normalizeHex(color);
		return {
			r: Number.parseInt(hex.slice(1, 3), 16),
			g: Number.parseInt(hex.slice(3, 5), 16),
			b: Number.parseInt(hex.slice(5, 7), 16),
		};
	}

	if (isRgbTuple(color)) {
		const [r, g, b] = color;
		return { r, g, b };
	}

	if (isRgbObject(color)) {
		return { r: color.r, g: color.g, b: color.b };
	}

	throw new TypeError(
		"Each color must be a #RRGGBB string, an [r, g, b] array, or an { r, g, b } object with 8-bit channels.",
	);
}
