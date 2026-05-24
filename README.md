# miniature-waffle

`miniature-waffle` is a TypeScript library for building, matching, and rasterizing
discrete color structures derived from a regular polygon on the constant-lightness
plane of CIE Lab.

The repo now works with **two related circle notions**:

1. **Internal circle** — always the exact regular **256-gon** in Lab used by the
   closed-form geometry.
2. **Effective circle** — the largest power-of-two subset of that 256-gon whose
   RGB-quantized vertices are all distinct at the requested `L`. This is one of
   `256, 128, 64, 32, 16, 8, 4, 2, 1`.

All public RGB-facing modules operate on the **effective** circle, so for every
`L` the library produces palettes made only of unique RGB colors.

## Package exports

The package ships compiled **ESM JavaScript** plus **`.d.ts` declarations** from
`dist/`, while the source lives in `src/` as TypeScript.

For local development:

```sh
npm install
npm run build
```

Public root export:

```js
import {
  findPalettes,
  matchColors,
  matchAnsiColors,
  generateBackgrounds,
  generateForegrounds,
  generateAnsiForegrounds,
  generateForegroundSteps,
} from "miniature-waffle";
```

This package intentionally exposes a **single public entry point**. Internal
module layout is not part of the public API.

## What the library does

The current public capabilities are:

1. **Palette generation** — generate unique RGB palettes from Bresenham-distributed
   `n`-gons on the effective circle.
2. **Palette matching** — project input RGB colors onto the constant-`L` Lab
   plane and match them to the best palette using the Hungarian algorithm.
3. **Background generation** — generate one in-memory RGBA background per
   effective-circle start vertex.
4. **Foreground generation** — map input colors or evenly spaced steps to the
   Lab gray axis under a black/white endpoint convention.

Lab is internal machinery; all public colors are RGB-facing.

## Public API

### `findPalettes(L, n)`

Returns the RGB palettes induced by Bresenham-distributed `n`-vertex subsets of
the **effective** circle at lightness `L`.

- `L`: finite number in `[0, 100]`
- `n`: integer in `[1, effective circle size at L]`
- return type: `string[][]`
- each color is `#RRGGBB`

Behavior:

- if the effective circle at `L` has size `m`, then `findPalettes(L, m)` returns
  the full unique circle palette
- `findPalettes(L, 1)` returns one singleton palette per unique effective-circle
  color
- at the degenerate extremes `L = 0` and `L = 100` the effective circle
  collapses to a single color (black or white); any positive integer `n` is
  accepted and the returned palette contains `n` copies of that one color

Example:

```js
const palettes = findPalettes(75, 3);
```

### `matchColors(colors, L)`

Matches a set of input colors against all unique `n`-gon palettes at lightness
`L`, where `n = colors.length`.

Accepted input formats:

- `#RRGGBB`
- `[r, g, b]`
- `{ r, g, b }`

Each channel must be an integer in `[0, 255]`.

The input count must satisfy:

```text
1 <= colors.length <= effective circle size at L
```

Return shape:

```js
{
  L: number,
  n: number,
  inputs: [
    {
      index: number,
      inputName?: string,
      inputColor: "#RRGGBB",
      originalLab: { L: number, a: number, b: number },
      projectedLab: { L: number, a: number, b: number }
    }
  ],
  matches: [
    {
      totalDistance: number,
      palette: ["#RRGGBB", ...],
      pairing: [
        {
          inputIndex: number,
          inputName?: string,
          inputColor: "#RRGGBB",
          projectedLab: { L: number, a: number, b: number },
          paletteIndex: number,
          paletteColor: "#RRGGBB",
          paletteLab: { L: number, a: number, b: number },
          distance: number
        }
      ]
    }
  ]
}
```

If multiple palettes tie for minimum total distance, all are returned.

Degenerate case:

- if any input color lies on the RGB gray axis `(i, i, i)`, matching throws

### `matchAnsiColors(L)`

Applies `matchColors` to the 12 non-gray ANSI colors:

```js
[
  { name: "red", color: "#800000" },
  { name: "green", color: "#008000" },
  { name: "yellow", color: "#808000" },
  { name: "blue", color: "#000080" },
  { name: "magenta", color: "#800080" },
  { name: "cyan", color: "#008080" },
  { name: "brightRed", color: "#FF0000" },
  { name: "brightGreen", color: "#00FF00" },
  { name: "brightYellow", color: "#FFFF00" },
  { name: "brightBlue", color: "#0000FF" },
  { name: "brightMagenta", color: "#FF00FF" },
  { name: "brightCyan", color: "#00FFFF" }
]
```

This requires the effective circle size at `L` to be at least `12`; otherwise it
throws for the same reason `matchColors` would.

### `generateBackgrounds(L, width, height, options?)`

Generates one in-memory RGBA image per effective-circle vertex.

- `L`: finite number in `[0, 100]`
- `width`: positive integer
- `height`: positive integer
- `options.seed`: optional integer seed for reproducible randomness

Return shape:

```js
[
  {
    index: number,
    width: number,
    height: number,
    startVertexIndex: number,
    startColor: "#RRGGBB",
    bandCount: number,
    bands: [
      {
        bandIndex: number,
        yStart: number,
        yEnd: number,
        height: number,
        vertexIndex: number,
        nominalColor: "#RRGGBB",
        windowSize: number
      }
    ],
    data: Uint8ClampedArray
  }
]
```

Behavior:

- if the effective circle size at `L` is `m`, the function returns **`m`**
  images, not always 256
- image `0` uses the `+a` vertex on the bottom band
- subsequent images rotate that bottom-band start through all effective-circle
  vertices
- `bandCount = min(height, effective circle size)`
- if `height >= effective circle size`, extra scanlines are spread evenly across
  those bands
- within each band, pixels are sampled from the nominal band color plus the
  colors above it, using triangular weights over a logarithmic window size
- `data` is RGBA row-major image data suitable for `ImageData`, canvas, WebGL,
  or custom PNG encoding

### `generateForegrounds(colors, L, reference)`

Projects input colors onto the Lab gray axis.

- `colors`: non-empty array of colors in any accepted RGB format
- `L`: finite number in `[0, 100]`
- `reference`: `"black"` or `"white"`

For each input color:

1. convert to Lab
2. keep only its scalar Lab lightness `L_in`
3. map `L_in` linearly so:
   - original black maps to the requested center `L`
   - original white maps to black if `reference = "black"`
   - original white maps to white if `reference = "white"`
4. convert `(L_out, 0, 0)` back to RGB

Return shape:

```js
{
  L: number,
  reference: "black" | "white",
  foregrounds: ["#RRGGBB", ...],
  mappings: [
    {
      index: number,
      inputName?: string,
      inputColor: "#RRGGBB",
      originalLab: { L: number, a: number, b: number },
      projectedL: number,
      foregroundLab: { L: number, a: number, b: number },
      foregroundColor: "#RRGGBB"
    }
  ]
}
```

### `generateAnsiForegrounds(L, reference)`

Applies `generateForegrounds` to the 16 ANSI colors:

```js
[
  { name: "black", color: "#000000" },
  { name: "red", color: "#800000" },
  { name: "green", color: "#008000" },
  { name: "yellow", color: "#808000" },
  { name: "blue", color: "#000080" },
  { name: "magenta", color: "#800080" },
  { name: "cyan", color: "#008080" },
  { name: "white", color: "#C0C0C0" },
  { name: "brightBlack", color: "#808080" },
  { name: "brightRed", color: "#FF0000" },
  { name: "brightGreen", color: "#00FF00" },
  { name: "brightYellow", color: "#FFFF00" },
  { name: "brightBlue", color: "#0000FF" },
  { name: "brightMagenta", color: "#FF00FF" },
  { name: "brightCyan", color: "#00FFFF" },
  { name: "brightWhite", color: "#FFFFFF" }
]
```

### `generateForegroundSteps(L, reference, count, saturation?)`

Returns evenly spaced grayscale steps on the Lab `L` axis from a start
lightness to the chosen reference endpoint.

- `L`: finite number in `[0, 100]`
- `reference`: `"black"` or `"white"`
- `count`: positive integer
- `saturation`: optional finite number in `[0, 1]`, default `0`

The `saturation` parameter shifts the start lightness toward the reference
endpoint by a fraction of the gap between `L` and the reference:

$$
\text{startL} = L + \text{saturation} \times (L_r - L)
$$

where `L_r = 0` for `"black"` and `L_r = 100` for `"white"`. Steps are then
evenly spaced from `startL` to `L_r`.

At `saturation = 0` (default) the first step is exactly `L`, preserving the
original behavior.

For example:

```js
generateForegroundSteps(75, "black", 3)
// saturation defaults to 0, startL = 75
// → L = 75, 37.5, 0

generateForegroundSteps(75, "black", 3, 1/3)
// startL = 75 + (1/3) * (0 - 75) = 50
// → L = 50, 25, 0
```

Return shape:

```js
{
  L: number,
  reference: "black" | "white",
  saturation: number,
  count: number,
  foregrounds: ["#RRGGBB", ...],
  steps: [
    {
      index: number,
      foregroundLab: { L: number, a: number, b: number },
      foregroundColor: "#RRGGBB"
    }
  ]
}
```

## Repo structure

```text
src/
  backgroundGenerator.ts
  colorMatcher.ts
  foregroundGenerator.ts
  index.ts
  paletteFinder.ts
  helpers/
    bresehham.ts
    colorFormats.ts
    converters.ts
    hungarian.ts
    paletteGeometry.ts
    radiusFinder.ts
  types.ts
```

- `src/paletteFinder.ts`: public palette-generation logic
- `src/colorMatcher.ts`: public palette-matching logic
- `src/backgroundGenerator.ts`: public in-memory background generator logic
- `src/foregroundGenerator.ts`: public grayscale foreground generator logic
- `src/index.ts`: root package exports
- `src/helpers/radiusFinder.ts`: exact internal 256-gon radius solver
- `src/helpers/paletteGeometry.ts`: internal/effective circle logic and palette
  geometry
- `src/helpers/bresehham.ts`: evenly distributed integer-spacing logic
- `src/helpers/colorFormats.ts`: shared RGB/hex normalization helpers
- `src/helpers/hungarian.ts`: minimum-cost bipartite assignment
- `src/helpers/converters.ts`: RGB/Lab conversion helpers
- `src/types.ts`: public and internal shared TypeScript types

## Mathematical model

### 1. Internal exact 256-gon

Fix a Lab lightness `L*`. The internal circle is the regular 256-gon

$$
v_k(r) = \left(L^\*,\; r(L^\*) \cos \theta_k,\; r(L^\*) \sin \theta_k\right),
\qquad
\theta_k = \frac{3\pi}{2} + \frac{2\pi k}{256},
\qquad
k = 0, \dots, 255.
$$

Its radius is

$$
r(L^\*) =
\min_{0 \le k < 256}
\sup \left\{ r \ge 0 : v_k(r) \text{ maps into sRGB} \right\}.
$$

The radius computation is exact for this 256-direction model: it handles the
piecewise Lab inverse explicitly, solves polynomial channel boundaries in closed
form, and does not use numerical optimization to choose the radius at a given
`L`.

### 2. Effective RGB-distinct circle

The public library does not always expose all 256 internal vertices. Instead it
chooses the largest power-of-two subset of the internal 256-gon whose
RGB-quantized colors are all distinct:

$$
256,\;128,\;64,\;32,\;16,\;8,\;4,\;2,\;1.
$$

Starting from 256, the subset is halved until uniqueness holds. This makes the
RGB-facing APIs well-defined even at extreme lightness values such as `L = 0`
and `L = 100`, where many internal Lab vertices collapse to the same RGB color.

### 3. Bresenham polygons on the effective circle

If the effective circle size is `m`, then for any requested

$$
n \in \{1, \dots, m\},
$$

the library builds `n`-vertex subsets using evenly distributed cyclic gaps. If

$$
m = qn + s,
\qquad
q = \left\lfloor \frac{m}{n} \right\rfloor,
\qquad
0 \le s < n,
$$

then the gap sizes lie in `{q, q + 1}` with exactly `s` larger gaps. The shared
`bresehham.js` helper implements this integer distribution and is reused for:

- palette vertex selection
- background band-height distribution

### 4. Matching formulation

Given input RGB colors

$$
c_0, \dots, c_{n-1},
$$

the matcher converts each color to Lab,

$$
c_i \mapsto \left(L_i^\*, a_i, b_i\right),
$$

then projects onto the requested constant-`L*` plane:

$$
\pi_L(c_i) = \left(L^\*, a_i, b_i\right).
$$

For each candidate palette

$$
P = \{v_0, \dots, v_{n-1}\},
$$

the cost matrix is the planar Lab distance

$$
d_{ij} = \sqrt{(a_i - a(v_j))^2 + (b_i - b(v_j))^2}.
$$

The library runs the Hungarian algorithm on that `n × n` matrix and returns all
minimum-cost matches in case of ties.

### 5. Background formulation

If the effective circle size at `L` is `m`, then `generateBackgrounds` returns
`m` images.

Each image uses

$$
b = \min(\text{height}, m)
$$

horizontal bands.

- if `height >= m`, extra scanlines are spread across the `m` bands
- if `height < m`, the band colors come from an anchored regular `height`-gon on
  the effective circle

Within each band, pixels are sampled from the nominal color plus the colors
above it, using a window size

$$
\min\left(
\mathrm{round}\left(\ln(A + (e - 1))\right),
\text{available colors above}
\right),
$$

where `A = width × bandHeight`.

### 6. Foreground formulation

Given an input color with Lab lightness `L_in`, the foreground generator ignores
chromaticity and remaps only the scalar lightness.

For a chosen center lightness `L_c` and reference endpoint `L_r`,

$$
L_r =
\begin{cases}
0, & \text{if reference is black} \\\\
100, & \text{if reference is white}
\end{cases}
$$

the mapped foreground lightness is

$$
L_{\text{out}} =
\max\left(
0,
\min\left(
100,
L_c + \frac{L_r - L_c}{100} L_{\text{in}}
\right)
\right).
$$

The output RGB foreground is then the neutral Lab point

$$
\left(L_{\text{out}}, 0, 0\right)
$$

converted back to RGB.

## Current project state

This repo is now centered on the following end state:

**an exact internal Lab 256-gon, plus RGB-facing public APIs that automatically
collapse to the largest unique effective circle available at the requested
lightness.**

That means:

- the underlying geometry stays mathematically exact at 256 directions
- the public outputs stay RGB-distinct
- low- and high-lightness edge cases are handled by the same model, without
  special-case hacks
