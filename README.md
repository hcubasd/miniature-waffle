# miniature-waffle

A TypeScript library for building perceptually-uniform color palettes and
grayscale mappings from the CIE Lab color space.

The core idea: for a given lightness `L*`, inscribe the largest regular 256-gon
on the constant-`L*` plane that fits inside the sRGB gamut. Subsets of that
polygon are maximally spread color palettes. All public APIs use `RgbColor`
(`{ r, g, b }` integers in `[0, 255]`) — Lab is internal machinery.

## Install

```sh
npm install miniature-waffle
```

## API

```ts
import { matchColors, matchGrays } from "miniature-waffle";
```

---

### `matchColors(input, L?)`

```ts
matchColors(n: number, L?: number): RgbColor[][]
matchColors(colors: RgbColor[], L?: number): RgbColor[]
```

- `n` or `colors` — integer `n ∈ [1, 256]`, or 1–256 `RgbColor` entries
- `L` — finite number in `[0, 100]`, default `75`

**n-gon mode** — returns all 256 Bresenham rotations of an `n`-color palette at
lightness `L`. At `L=0` or `L=100` all palettes contain `n` blacks or whites.

```ts
const palettes = matchColors(3);         // 256 palettes of 3 colors at L=75
const palettes50 = matchColors(3, 50);   // same at L=50
const { r, g, b } = palettes[0][0];
```

**Color matching mode** — projects each input color onto the constant-`L` plane,
finds the Bresenham `n`-gon rotation with minimum total `(a, b)`-plane distance
via the Hungarian algorithm, returns one matched palette color per input.
Colors on the Lab gray axis (`a = b = 0`) throw a `RangeError`.

```ts
const matches = matchColors([{ r: 255, g: 0, b: 0 }, { r: 0, g: 128, b: 255 }]);
matches[0];  // palette color assigned to { r: 255, g: 0, b: 0 }
matches[1];  // palette color assigned to { r: 0, g: 128, b: 255 }
```

---

### `matchGrays(input, startL?, endL?)`

```ts
matchGrays(input: number | RgbColor[], startL?: number, endL?: number): RgbColor[]
```

- `input` — integer `n ∈ [1, 256]`, or a `RgbColor[]`
- `startL` — finite number in `[0, 100]`, default `0`
- `endL` — finite number in `[0, 100]`, default `100`

Maps colors or evenly-spaced steps onto the Lab gray axis between `startL` and
`endL`. A color's luminance `L*_in ∈ [0, 100]` maps linearly:

$$
L_{\text{out}} = \text{startL} + \frac{L^{\ast}_{\text{in}}}{100} \cdot (\text{endL} - \text{startL})
$$

`startL === endL` is valid and collapses all outputs to the same gray.
Swap `startL` and `endL` to invert the direction.

**Step mode** — `input` is an integer `n`: returns `n` neutral grays evenly
spaced from `startL` to `endL`.

```ts
matchGrays(2);            // [black, white]
matchGrays(2, 100, 0);    // [white, black]
matchGrays(5, 20, 80);    // 5 grays spanning L*=20 to L*=80
```

**Projection mode** — `input` is a `RgbColor[]`: maps each color to a gray at
its luminance within `[startL, endL]`.

```ts
matchGrays([{ r: 255, g: 0, b: 0 }, { r: 0, g: 128, b: 0 }]);
// red and green projected to grays at their respective luminances
```

---

## Mathematical model

### 1. The 256-gon and its radius

Fix a Lab lightness $L^{\ast}$. The library uses the regular 256-gon centered on the
neutral axis, anchored at angle $\frac{3\pi}{2}$ (the $-b$ direction):

$$
v_k = \left(L^{\ast},\; r(L^{\ast})\cos\theta_k,\; r(L^{\ast})\sin\theta_k\right),
\qquad
\theta_k = \frac{3\pi}{2} + \frac{2\pi k}{256},
\qquad k = 0,\dots,255.
$$

The radius is the largest value such that all 256 vertices remain inside sRGB:

$$
r(L^{\ast}) = \min_{0 \le k < 256} \sup\left\lbrace r \ge 0 : v_k(r) \in \text{sRGB} \right\rbrace.
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
`matchColors` in n-gon mode.

### 3. Hungarian matching

Given $n$ input colors projected to $(a_i, b_i)$ on the constant-$L^{\ast}$ plane,
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
$L^{\ast}_{\text{in}} \in [0, 100]$ into the requested range $[\text{startL}, \text{endL}]$:

$$
L_{\text{out}} = \text{startL} + \frac{L^{\ast}_{\text{in}}}{100} \cdot (\text{endL} - \text{startL}).
$$

The output color is the neutral Lab point $(L_{\text{out}}, 0, 0)$ converted
back to sRGB. For step mode with $n$ steps, the input luminances are
$0, \frac{100}{n-1}, \frac{200}{n-1}, \dots, 100$ (i.e. $\frac{100i}{n-1}$ for
$i = 0, \dots, n-1$), with $n = 1$ returning just $L_{\text{out}} = \text{startL}$.

## Repo structure

```
src/
  index.ts             — public entry point
  colorMatcher.ts      — matchColors, matchGrays
  types.ts             — RgbColor (+ internal Lab)
  helpers/
    radiusFinder.ts    — exact 256-gon radius via polynomial root-finding
    bresenham.ts       — Bresenham integer gap distribution
    hungarian.ts       — O(n³) Kuhn-Munkres assignment
    converters.ts      — sRGB ↔ CIE Lab
tests/
  colorMatcher.spec.ts
  helpers.spec.ts
```

## Development

```sh
npm install
npm test          # vitest
npm run build     # tsc → dist/
```
