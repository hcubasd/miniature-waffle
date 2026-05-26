export type RgbTuple = [number, number, number];

export interface RgbColor {
	r: number;
	g: number;
	b: number;
}

export interface LabColor {
	L: number;
	a: number;
	b: number;
}

export interface ColorMatch {
	input: RgbTuple;
	match: RgbTuple;
}

export interface NamedColorMatch {
	name: string;
	match: RgbTuple;
}
