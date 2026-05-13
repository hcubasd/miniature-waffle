export { generateBackgrounds } from "./backgroundGenerator.js";
export { matchAnsiColors, matchColors } from "./colorMatcher.js";
export {
	generateAnsiForegrounds,
	generateForegrounds,
	generateForegroundSteps,
} from "./foregroundGenerator.js";
export { findPalettes } from "./paletteFinder.js";
export type {
	Background,
	BackgroundBand,
	BackgroundOptions,
	ColorInput,
	ColorReference,
	ForegroundMapping,
	ForegroundStep,
	GenerateForegroundStepsResult,
	GenerateForegroundsResult,
	HexColor,
	LabColor,
	MatchColorsResult,
	MatchInput,
	NamedColor,
	PaletteMatch,
	RgbColor,
	RgbTuple,
} from "./types.js";
