import { labToRgb } from "./converters.js";
import {
	buildEvenIndices,
	buildIndicesFromGaps,
	buildUniqueGapSequences,
} from "./bresehham.js";
import { rgbToHex } from "./colorFormats.js";
import { findRadius } from "./radiusFinder.js";
import type { CircleVertex, EffectiveCircleVertex } from "../types.js";

export const MAX_CIRCLE_VERTEX_COUNT = 256;
export const ANCHOR_THETA = (3 * Math.PI) / 2;
export const PLUS_A_VERTEX_INDEX = 64;

function validateLightness(L: number): void {
	if (!Number.isFinite(L) || L < 0 || L > 100) {
		throw new RangeError("L must be a finite number in [0, 100].");
	}
}

function validateVertexCount(n: number, maxVertexCount: number): void {
	if (!Number.isInteger(n) || n < 1 || n > maxVertexCount) {
		throw new RangeError(`n must be an integer in [1, ${maxVertexCount}].`);
	}
}

function selectCircleSubset(
	circleVertices: readonly CircleVertex[],
	count: number,
): CircleVertex[] {
	const step = MAX_CIRCLE_VERTEX_COUNT / count;
	return Array.from(
		{ length: count },
		(_, index) => circleVertices[index * step],
	);
}

function hasUniqueRgb(vertices: readonly CircleVertex[]): boolean {
	return new Set(vertices.map((vertex) => vertex.hex)).size === vertices.length;
}

function annotateEffectiveIndices(
	vertices: readonly CircleVertex[],
): EffectiveCircleVertex[] {
	return vertices.map((vertex, effectiveIndex) => ({
		...vertex,
		effectiveIndex,
	}));
}

export function validatePolygonInputs(
	L: number,
	n: number,
	maxVertexCount: number | null = null,
): void {
	validateLightness(L);
	validateVertexCount(n, maxVertexCount ?? getEffectiveCircleVertexCount(L));
}

export function buildCircleVertices(L: number): CircleVertex[] {
	validateLightness(L);

	const radius = findRadius(L);

	return Array.from({ length: MAX_CIRCLE_VERTEX_COUNT }, (_, index) => {
		const theta =
			ANCHOR_THETA + (index * 2 * Math.PI) / MAX_CIRCLE_VERTEX_COUNT;
		const a = radius * Math.cos(theta);
		const b = radius * Math.sin(theta);
		const rgb = labToRgb(L, a, b);

		return {
			index,
			theta,
			lab: { L, a, b },
			rgb,
			hex: rgbToHex(rgb),
		};
	});
}

export function buildEffectiveCircleVertices(
	L: number,
): EffectiveCircleVertex[] {
	const fullCircleVertices = buildCircleVertices(L);

	for (let count = MAX_CIRCLE_VERTEX_COUNT; count >= 1; count /= 2) {
		const subset = selectCircleSubset(fullCircleVertices, count);
		if (hasUniqueRgb(subset)) {
			return annotateEffectiveIndices(subset);
		}
	}

	throw new Error(`Failed to derive an RGB-distinct circle for L=${L}.`);
}

export function getEffectiveCircleVertexCount(L: number): number {
	return buildEffectiveCircleVertices(L).length;
}

export function getPlusAEffectiveVertexIndex(
	circleVertices: readonly EffectiveCircleVertex[],
): number {
	const index = circleVertices.findIndex(
		(vertex) => vertex.index === PLUS_A_VERTEX_INDEX,
	);
	return index === -1 ? 0 : index;
}

export function buildPaletteGeometries(
	L: number,
	n: number,
): EffectiveCircleVertex[][] {
	const circleVertices = buildEffectiveCircleVertices(L);
	validatePolygonInputs(L, n, circleVertices.length);

	if (n === 1) {
		return circleVertices.map((vertex) => [vertex]);
	}

	const uniquePalettes = new Map<string, EffectiveCircleVertex[]>();

	for (const canonicalGaps of buildUniqueGapSequences(
		circleVertices.length,
		n,
	)) {
		const key = canonicalGaps.join(",");

		if (!uniquePalettes.has(key)) {
			const indices = buildIndicesFromGaps(
				circleVertices.length,
				canonicalGaps,
			);
			uniquePalettes.set(
				key,
				indices.map((index) => circleVertices[index]),
			);
		}
	}

	return [...uniquePalettes.values()];
}

export function buildAnchoredPaletteGeometry(
	L: number,
	n: number,
	startIndex: number,
): EffectiveCircleVertex[] {
	const circleVertices = buildEffectiveCircleVertices(L);
	validatePolygonInputs(L, n, circleVertices.length);
	if (n === 1) {
		const normalizedIndex =
			((startIndex % circleVertices.length) + circleVertices.length) %
			circleVertices.length;
		return [circleVertices[normalizedIndex]];
	}

	return buildEvenIndices(circleVertices.length, n, startIndex).map(
		(index) => circleVertices[index],
	);
}
