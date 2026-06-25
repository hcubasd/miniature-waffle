import { matchColors } from "https://esm.sh/miniature-waffle";

// — Perlin noise —
function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
function lerp(a, b, t) { return a + t * (b - a); }
const GRADS = [[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
function grad(hash, x, y) {
  const [gx, gy] = GRADS[hash & 7];
  return gx * x + gy * y;
}

let perm = new Uint8Array(512);

function buildPerm(seed) {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  let s = seed;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = p[i]; p[i] = p[j]; p[j] = tmp;
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
}

function perlin2(x, y) {
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
  x -= Math.floor(x); y -= Math.floor(y);
  const u = fade(x), v = fade(y);
  const aa = perm[perm[X] + Y],   ab = perm[perm[X] + Y + 1];
  const ba = perm[perm[X+1] + Y], bb = perm[perm[X+1] + Y + 1];
  return lerp(
    lerp(grad(aa, x,   y),   grad(ba, x-1, y),   u),
    lerp(grad(ab, x,   y-1), grad(bb, x-1, y-1), u),
    v
  );
}

// — State: seeded once on load —
buildPerm(Math.floor(Math.random() * 99999));
const rotation = Math.floor(Math.random() * 256);
const palette = matchColors(256, 75)[rotation];

// — Rendering —
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

function renderTo(targetCtx, W, H) {
  if (W === 0 || H === 0) return;

  const raw = new Float32Array(W * H);
  let min = Infinity, max = -Infinity;
  const scale = 2 / W; // 2:1 field: x in [0,2), y in [0,1)

  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const v = perlin2(i * scale, j * scale);
      raw[j * W + i] = v;
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }

  const range = max - min || 1;
  const img = targetCtx.createImageData(W, H);

  for (let p = 0; p < W * H; p++) {
    const t = (raw[p] - min) / range;
    const { r, g, b } = palette[Math.round(t * 255)];
    const i4 = p * 4;
    img.data[i4]     = r;
    img.data[i4 + 1] = g;
    img.data[i4 + 2] = b;
    img.data[i4 + 3] = 255;
  }

  targetCtx.putImageData(img, 0, 0);
}

// — Canvas cover sizing —
// Canvas is always 2:1 in pixel dimensions (W = 2H).
// In landscape: H = max(screenH, screenW/2) so canvas covers the viewport.
// In portrait:  H = max(screenW, screenH/2), then the canvas element is
//               rotated 90° so its long axis runs vertically on screen.
function resize() {
  const sw = window.innerWidth, sh = window.innerHeight;
  const portrait = sh > sw;

  let W, H;
  if (portrait) {
    H = Math.round(Math.max(sw, sh / 2));
    W = H * 2;
  } else {
    H = Math.round(Math.max(sh, sw / 2));
    W = H * 2;
  }

  // Always sync the transform (orientation may flip without a dimension change).
  canvas.style.transform = portrait
    ? "translate(-50%, -50%) rotate(90deg)"
    : "translate(-50%, -50%)";

  if (W === canvas.width && H === canvas.height) return;

  // Render offscreen first, then swap — prevents a visible blank frame.
  // Setting canvas.width/height clears the canvas; doing it right before
  // drawImage means the browser never paints the blank state.
  const off = document.createElement("canvas");
  off.width = W;
  off.height = H;
  renderTo(off.getContext("2d"), W, H);
  canvas.width  = W;
  canvas.height = H;
  ctx.drawImage(off, 0, 0);
}

window.addEventListener("resize", resize);

// — Download (always landscape 2:1): click the canvas —
canvas.style.cursor = "pointer";
canvas.addEventListener("click", () => {
  const input = prompt("Width in pixels:");
  if (!input) return;
  const w = Math.round(Number(input));
  if (!w || w <= 0) return;
  const h = Math.round(w / 2);

  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  renderTo(off.getContext("2d"), w, h);

  off.toBlob(blob => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `miniature-waffle-${w}x${h}.png`;
    a.click();
    URL.revokeObjectURL(a.href);
  });
});

// — Init —
resize();
