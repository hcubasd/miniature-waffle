function validateSpreadInputs(total: number, parts: number): void {
	if (!Number.isInteger(total) || total <= 0) {
		throw new RangeError("total must be a positive integer.");
	}

	if (!Number.isInteger(parts) || parts <= 0 || parts > total) {
		throw new RangeError(
			"parts must be a positive integer no greater than total.",
		);
	}
}

function normalizePhase(parts: number, phase: number): number {
	if (!Number.isInteger(phase)) {
		throw new RangeError("phase must be an integer.");
	}

	return ((phase % parts) + parts) % parts;
}

export function buildEvenGaps(
	total: number,
	parts: number,
	phase = 0,
): number[] {
	validateSpreadInputs(total, parts);

	const normalizedPhase = normalizePhase(parts, phase);
	const baseGap = Math.floor(total / parts);
	const remainder = total % parts;
	let error = normalizedPhase;

	return Array.from({ length: parts }, () => {
		let gap = baseGap;
		error += remainder;
		if (error >= parts) {
			gap += 1;
			error -= parts;
		}
		return gap;
	});
}

export function minimalRotation(sequence: readonly number[]): number[] {
	let best = [...sequence];

	for (let offset = 1; offset < sequence.length; offset++) {
		const candidate = sequence.slice(offset).concat(sequence.slice(0, offset));

		for (let index = 0; index < sequence.length; index++) {
			if (candidate[index] === best[index]) continue;
			if (candidate[index] < best[index]) best = candidate;
			break;
		}
	}

	return best;
}

export function buildIndicesFromGaps(
	total: number,
	gaps: readonly number[],
	start = 0,
): number[] {
	if (!Number.isInteger(total) || total <= 0) {
		throw new RangeError("total must be a positive integer.");
	}

	if (!Array.isArray(gaps) || gaps.length === 0) {
		throw new RangeError("gaps must be a non-empty array.");
	}

	const normalizedStart = ((start % total) + total) % total;
	const indices = [normalizedStart];
	let current = normalizedStart;

	for (let index = 0; index < gaps.length - 1; index++) {
		const gap = gaps[index];
		if (!Number.isInteger(gap) || gap <= 0) {
			throw new RangeError("every gap must be a positive integer.");
		}
		current = (current + gap) % total;
		indices.push(current);
	}

	return indices;
}

export function buildEvenIndices(
	total: number,
	parts: number,
	start = 0,
	phase = 0,
): number[] {
	return buildIndicesFromGaps(total, buildEvenGaps(total, parts, phase), start);
}

export function buildUniqueGapSequences(
	total: number,
	parts: number,
): number[][] {
	validateSpreadInputs(total, parts);

	const unique = new Map<string, number[]>();
	for (let phase = 0; phase < parts; phase++) {
		const canonical = minimalRotation(buildEvenGaps(total, parts, phase));
		const key = canonical.join(",");
		if (!unique.has(key)) {
			unique.set(key, canonical);
		}
	}

	return [...unique.values()];
}
