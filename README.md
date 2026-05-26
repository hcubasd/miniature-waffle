# miniature-waffle

A TypeScript library for building perceptually-uniform color palettes and
grayscale mappings from the CIE Lab color space.

The core idea: for a given lightness `L*`, inscribe the largest regular 256-gon
on the constant-`L*` plane that fits inside the sRGB gamut. Subsets of that
polygon are maximally spread color palettes. All public APIs return `[r, g, b]`
tuples — Lab is internal machinery.

## Install

```sh
npm install miniature-waffle
```

## API

```ts
import {
  findPalettes,
  matchColors,
  matchGrays,
  matchAnsiColors,
  matchAnsiGrays,
} from "miniature-waffle";
```

All channel values are integers in `[0, 255]`. `RgbTuple` is `[r, g, b]`.

---

### `findPalettes(L, n)`

Returns all 256 rotations of an `n`-color palette at lightness `L`.

```ts
findPalettes(L: number, n: number): RgbTuple[][]
```

- `L` — finite number in `(0, 100)` exclusive
- `n` — integer in `[1, 256]`

Each palette is a Bresenham-distributed `n`-gon on the 256-gon at `L`. The 256
returned palettes are cyclic rotations of the same gap pattern — consecutive
palettes are offset by one step around the circle.

```ts
const palettes = findPalettes(50, 3);
// 256 palettes, each with 3 RgbTuples
const [r, g, b] = palettes[0][0]; // first color of first palette
```

---

### `matchColors(colors, L)`

Matches a set of input colors to the best-fit palette on the constant-`L` plane
using the Hungarian algorithm.

```ts
matchColors(colors: RgbTuple[], L: number): ColorMatch[]
```

- `colors` — 1 to 256 entries; no color may lie on the Lab gray axis
- `L` — finite number in `(0, 100)` exclusive

For each input color the algorithm:

1. Converts to Lab and reads off `(a, b)`, discarding the input's own lightness
2. Builds every Bresenham-distributed `n`-gon palette on the 256-gon at `L`
3. Runs the Hungarian algorithm on each rotation and keeps the one with minimum
   total `(a, b)`-plane distance
4. Returns the matched palette color for each input

```ts
interface ColorMatch {
  input: RgbTuple;  // the original input color
  match: RgbTuple;  // the palette color assigned to it
}
```

Colors with `a = b = 0` in Lab (pure black `[0, 0, 0]`) throw a `RangeError`.

```ts
const results = matchColors([[255, 0, 0], [0, 128, 255]], 75);
results[0].input;  // [255, 0, 0]
results[0].match;  // closest palette color at L=75
```

---

### `matchGrays(input, L, reference)`

Maps colors or evenly-spaced steps onto the Lab gray axis between `L` and
`reference`.

```ts
matchGrays(input: number | RgbTuple[], L: number, reference: number): RgbTuple[]
```

- `L` — finite number in `[0, 100]`
- `reference` — finite number in `[0, 100]`, must differ from `L`

`L` is the dark endpoint, `reference` is the light endpoint. A color's input
luminance `L*_in ∈ [0, 100]` maps linearly to the output range:

$$
L_{\text{out}} = L + \frac{L^*_{\text{in}}}{100} \cdot (\text{reference} - L)
$$

**Step mode** — `input` is an integer `n ∈ [1, 256]`: returns `n` neutral grays
evenly spaced from `L` (at `L*_in = 0`) to `reference` (at `L*_in = 100`).

```ts
matchGrays(2, 0, 100);   // [[0,0,0], [255,255,255]]
matchGrays(2, 100, 0);   // [[255,255,255], [0,0,0]]
matchGrays(5, 20, 80);   // 5 grays spanning L*=20 to L*=80
```

**Projection mode** — `input` is a `RgbTuple[]`: extracts each color's
luminance `L*_in` via `rgbToLab`, maps it with the formula above, returns
`(L_out, 0, 0)` as RGB.

```ts
matchGrays([[255, 0, 0], [0, 128, 0]], 0, 100);
// red and green projected to grays at their respective luminances
```

---

### `matchAnsiColors(L)`

Applies `matchColors` to the 12 chromatic ANSI terminal colors at lightness `L`.

```ts
matchAnsiColors(L: number): NamedColorMatch[]
```

```ts
interface NamedColorMatch {
  name: string;
  match: RgbTuple;
}
```

The 12 colors (the 4 neutral grays — black, white, brightBlack, brightWhite —
are excluded since they lie on the gray axis):

| name | original |
|---|---|
| red | `[128, 0, 0]` |
| green | `[0, 128, 0]` |
| yellow | `[128, 128, 0]` |
| blue | `[0, 0, 128]` |
| magenta | `[128, 0, 128]` |
| cyan | `[0, 128, 128]` |
| brightRed | `[255, 0, 0]` |
| brightGreen | `[0, 255, 0]` |
| brightYellow | `[255, 255, 0]` |
| brightBlue | `[0, 0, 255]` |
| brightMagenta | `[255, 0, 255]` |
| brightCyan | `[0, 255, 255]` |

---

### `matchAnsiGrays(L, reference)`

Applies `matchGrays` (projection mode) to all 16 ANSI terminal colors.

```ts
matchAnsiGrays(L: number, reference: number): NamedColorMatch[]
```

Returns 16 `NamedColorMatch` entries in ANSI order (black → … → brightWhite),
each mapped to a neutral gray at its luminance within `[L, reference]`.

```ts
matchAnsiGrays(0, 100);
// black → [0,0,0], brightWhite → [255,255,255], colors in between by luminance
```

---

## Mathematical model

### 1. The 256-gon and its radius

Fix a Lab lightness $L^*$. The library uses the regular 256-gon centered on the
neutral axis, anchored at angle $\frac{3\pi}{2}$ (the $-b$ direction):

$$
v_k = \left(L^*,\; r(L^*)\cos\theta_k,\; r(L^*)\sin\theta_k\right),
\qquad
\theta_k = \frac{3\pi}{2} + \frac{2\pi k}{256},
\qquad k = 0,\dots,255.
$$

The radius is the largest value such that all 256 vertices remain inside sRGB:

$$
r(L^*) = \min_{0 \le k < 256} \sup\!\left\{ r \ge 0 : v_k(r) \in \text{sRGB} \right\}.
$$

Each per-direction boundary is found in closed form. The Lab → linear RGB
pipeline is piecewise cubic in `r` (the $f^{-1}$ branches of the CIE
piecewise function composed with the sRGB matrix). The solver finds all
polynomial roots in each piecewise interval and picks the smallest crossing.

### 2. Bresenham n-gons

To build an `n`-color palette from the 256 vertices, the library uses
integer-ratio gap spacing. If

$$
256 = qn + s, \qquad q = \left\lfloor \frac{256}{n} \right\rfloor, \qquad 0 \le s < n,
$$

then the gap sequence has $n - s$ gaps of size $q$ and $s$ gaps of size $q + 1$.
All 256 rotations of this pattern give the 256 palettes returned by
`findPalettes`.

### 3. Hungarian matching

Given $n$ input colors projected to $(a_i, b_i)$ on the constant-$L^*$ plane,
and a candidate palette $\{v_0, \dots, v_{n-1}\}$, the cost matrix is the
planar Lab distance:

$$
d_{ij} = \sqrt{(a_i - a_j)^2 + (b_i - b_j)^2}.
$$

The Hungarian algorithm (Kuhn–Munkres, $O(n^3)$) finds the assignment
$\sigma : [n] \to [n]$ minimising $\sum_i d_{i,\sigma(i)}$.
`matchColors` runs this over all 256 rotations and returns the assignment
from the rotation with the smallest total cost.

### 4. Gray mapping

The gray mapping in `matchGrays` is a linear remap of a color's Lab lightness
$L^*_{\text{in}} \in [0, 100]$ into the requested range $[L, \text{reference}]$:

$$
L_{\text{out}} = L + \frac{L^*_{\text{in}}}{100} \cdot (\text{reference} - L).
$$

The output color is the neutral Lab point $(L_{\text{out}}, 0, 0)$ converted
back to sRGB. For step mode with $n$ steps, the input luminances are
$0, \frac{100}{n-1}, \frac{200}{n-1}, \dots, 100$ (i.e. $\frac{100i}{n-1}$ for
$i = 0, \dots, n-1$), with $n = 1$ returning just $L_{\text{out}} = L$.

## Repo structure

```
src/
  index.ts             — public entry point
  paletteFinder.ts     — findPalettes
  colorMatcher.ts      — matchColors, matchGrays, matchAnsiColors, matchAnsiGrays
  types.ts             — RgbTuple, ColorMatch, NamedColorMatch (+ internal Lab/Rgb)
  helpers/
    radiusFinder.ts    — exact 256-gon radius via polynomial root-finding
    bresehham.ts       — Bresenham integer gap distribution
    hungarian.ts       — O(n³) Kuhn-Munkres assignment
    converters.ts      — sRGB ↔ CIE Lab
tests/
  paletteFinder.spec.ts
  colorMatcher.spec.ts
  helpers.spec.ts
```

## Development

```sh
npm install
npm test          # vitest
npm run build     # tsc → dist/
```
