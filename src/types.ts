export type HexColor = `#${string}`;
export type RgbTuple = [number, number, number];
export type ColorReference = "black" | "white";
export type ColorInput = HexColor | string | RgbTuple | RgbColor;

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

export interface NamedColor {
	name: string;
	color: HexColor;
}

export interface CircleVertex {
	index: number;
	theta: number;
	lab: LabColor;
	rgb: RgbColor;
	hex: HexColor;
}

export interface EffectiveCircleVertex extends CircleVertex {
	effectiveIndex: number;
}

export interface MatchInput {
	index: number;
	inputName?: string;
	inputColor: HexColor;
	originalLab: LabColor;
	projectedLab: LabColor;
}

export interface MatchPairing {
	inputIndex: number;
	inputName?: string;
	inputColor: HexColor;
	projectedLab: LabColor;
	paletteIndex: number;
	paletteColor: HexColor;
	paletteLab: LabColor;
	distance: number;
}

export interface PaletteMatch {
	totalDistance: number;
	palette: HexColor[];
	pairing: MatchPairing[];
}

export interface MatchColorsResult {
	L: number;
	n: number;
	inputs: MatchInput[];
	matches: PaletteMatch[];
}

export interface BackgroundBand {
	bandIndex: number;
	yStart: number;
	yEnd: number;
	height: number;
	vertexIndex: number;
	nominalColor: HexColor;
	windowSize: number;
}

export interface Background {
	index: number;
	width: number;
	height: number;
	startVertexIndex: number;
	startColor: HexColor;
	bandCount: number;
	bands: BackgroundBand[];
	data: Uint8ClampedArray;
}

export interface BackgroundOptions {
	seed?: number;
}

export interface ForegroundMapping {
	index: number;
	inputName?: string;
	inputColor: HexColor;
	originalLab: LabColor;
	projectedL: number;
	foregroundLab: LabColor;
	foregroundColor: HexColor;
}

export interface GenerateForegroundsResult {
	L: number;
	reference: ColorReference;
	foregrounds: HexColor[];
	mappings: ForegroundMapping[];
}

export interface ForegroundStep {
	index: number;
	foregroundLab: LabColor;
	foregroundColor: HexColor;
}

export interface GenerateForegroundStepsResult {
	L: number;
	reference: ColorReference;
	saturation: number;
	count: number;
	foregrounds: HexColor[];
	steps: ForegroundStep[];
}
