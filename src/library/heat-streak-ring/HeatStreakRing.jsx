import { useEffect, useRef } from "react";

/**
 * HeatStreakRing — heavy capitals lying flat round the top of an open ring,
 * seen from just above, every letter smeared straight down into a curtain of
 * hairlines run through a thermal gradient map: black at the type, red and gold
 * under it, cooling to teal and fading out at a rim of its own.
 *
 * Self-contained: React and WebGL only. Fills its parent, so give the parent a
 * height. Every number below was measured off a reference poster (1080 × 1920):
 *
 *   The ring.   A true perspective view of a flat ring of type (camera 18.2°
 *       above its plane, 1.8 ring radii out; FIT_*). Front letters come out
 *       2.7× wider and 7.4× taller than the far ones. "TEXT BLUR EFFECT " closes
 *       the ring twice, the front gap turned 5.8° right of centre.
 *   The colour. One gradient map over a density field (RAMP_STOPS): dark teal →
 *       teal → pale cyan → gold → orange → red → oxblood → black. Letters are the
 *       same map over their blurred coverage.
 *   The streaks. Heat rises with the ink in a column, a hot head decays down the
 *       curtain so warm lobes taper like flames, long stems burn black and red
 *       with a second dark band, and every streak ends on a curve of its own.
 *   The hairlines. 7.26 px pitch; cores follow CORE_CURVE, gaps follow
 *       GAP_OF_CORE.
 *   The ground. Concrete grain over a flat colour.
 *
 * It moves: the ring turns (spin), heat pulses run down the curtain and line
 * ends shimmer. Speed 0 holds frame 0, which is the poster. The streak field is
 * solved on the CPU per hairline from the glyphs' own signed-distance fields
 * (one value per line and row, visible rows only) and drawn in one GPU pass.
 */

// ── Defaults used as fallbacks inside the engine ────────────────────────────
const DEFAULT_TEXT = "TEXT BLUR EFFECT";
const DEFAULT_BACKGROUND = "#161616";
const DEFAULT_HOT = "#A42409";
const DEFAULT_MID = "#E0CB50";
const DEFAULT_COOL = "#178899";
const DEFAULT_TEXT_COLOR = "#0A0A0A";

// ── Poster space ────────────────────────────────────────────────────────────
// Every length in the scene is in poster pixels (1080 × 1920), so the measured
// numbers drop in as they are. The frame shows rows COMP_TOP…COMP_BOTTOM.
const POSTER_H = 1920;
const COMP_TOP = 560;
const COMP_BOTTOM = 1920;
const COMP_H = COMP_BOTTOM - COMP_TOP;
/** Width the composition needs in view: the 806 px curtain plus its side type. */
const COMP_W = 900;
const COMP_CX = 540;
/** Scale value that is the poster's framing. */
const REF_SCALE = 225;
/** Poster px the framing centre sits above the ring's ellipse centre (the letters rise above it). */
const RING_LIFT = 30;

// Camera + layout fitted to the poster's type.
const FIT_K = 0.5568; // 1/D, perspective strength, at Bulge 30
const FIT_SIN = 0.3123; // sin(elevation) at Ring Tilt 33
const FIT_HALF = 403; // baseline circle half-width (px) at Ring Width 42
const FIT_AX = 0.9456; // the ring sits 5.4 % narrower than it is deep
const FIT_OX = 541.2;
const FIT_CY = 804.3; // ellipse centre (px) at Ring Y 42
const FIT_PHI0 = 0.1009; // rad; the front gap sits right of centre
const FIT_EM = 0.6236; // glyph em as a share of the advance that closes the ring
const FIT_HS = 0.9625; // glyph radial scale at Glyph Tilt 75
const FIT_TRACK = -0.012; // em added to every advance

// Streak field. Energy E per hairline row; a line core sits at
// CORE_CURVE(1 − e^−E) on the map.
const STREAK_SIDE = 1063; // px at Streak 70: L(c) = SIDE·(1 + FRONT·c + BACK·c²), c = cos θ
const STREAK_FRONT = 0.064;
const STREAK_BACK = 0.0675;
const INK_MAX = 1.293; // energy of a column: MAX·(1 − e^−(ink/RHO)^GAMMA) …
const INK_RHO = 60.5; // (ink: px of type down the column)
const INK_GAMMA = 1.078;
const STEM_K = 0.6875; // … + STEM_K per 100 px of ink beyond STEM_N: the long stems
const STEM_N = 37.5; //   burn black and red all the way down
const STEM_PULSE = 10; // stems take the pulse this much harder
const STEM_HEAD = 2; // and a short black drip right under a stem…
const STEM_HEAD_L = 0.04; // …over the first 4 %, then the red band
const COOL_DROP = 0.179; // front streaks lose heat along their length (far ones hold)
const COOL_POW = 1.74;
const FADE_START = 0.419; // then a long tip fade from 42 % down (Cool Start 30)
const HEAD_A = 1.628; // hot head under the type, decaying over HEAD_L of the streak
const HEAD_L = 0.165; // heavier columns stay hot longer, so warm lobes taper like flames
const PULSE_GAIN = 2.24; // Pulse Amp 35 → the dark second band
const PULSE_W = 0.05;
const PULSE_T0 = 0.23; // frame 0: pulse one 12.5 % down
const TAIL_K = 0.164; // faint lead above each letter
const TAIL_LEN = 16;
const BACK_COOL_K = 0.0703; // far curtain loses K·(Back Cool/30)² of its energy
const EDGE_K = 0.0547; // sides lose K·(Edge Cool/50)² (50 → 5.5 %, 100 → 22 %)

/**
 * Density → map position at a line core, quantile-matched to the poster's
 * hairline cores. The cores are bimodal — gold-on-teal near 0.68 and
 * orange-on-gold near 0.85 — which a smooth density cannot give on its own.
 */
const CORE_CURVE = [
  0.0, 0.017, 0.02, 0.023, 0.028, 0.035, 0.044, 0.052, 0.058, 0.067, 0.094, 0.147, 0.249,
  0.272, 0.286, 0.302, 0.322, 0.345, 0.362, 0.378, 0.391, 0.403, 0.411, 0.414, 0.423, 0.455,
  0.47, 0.493, 0.517, 0.537, 0.562, 0.582, 0.605, 0.627, 0.642, 0.65, 0.655, 0.657, 0.658,
  0.66, 0.663, 0.667, 0.673, 0.681, 0.689, 0.701, 0.721, 0.761, 0.8, 0.82, 0.826, 0.836,
  0.844, 0.849, 0.86, 0.867, 0.874, 0.879, 0.882, 0.891, 0.903, 0.913, 0.935, 0.985, 1.0,
];
/**
 * Gap density between hairlines as a function of the core's. Two regimes: cool
 * lines keep near-black gaps (a third of the core), hot ones sit on a gold floor
 * (≈0.69) and push their cores to orange.
 */
const GAP_OF_CORE = [
  [0, 0], [0.075, 0.015], [0.175, 0.03], [0.275, 0.04], [0.325, 0.05], [0.375, 0.08], [0.425, 0.11],
  [0.525, 0.15], [0.625, 0.18], [0.675, 0.22], [0.7, 0.34], [0.725, 0.47], [0.775, 0.66], [0.825, 0.69],
  [0.875, 0.69], [0.925, 0.76], [0.97, 0.84], [0.99, 0.93], [1, 0.97],
];
const ROW_STEP = 3; // px per field row
const QUAD_IDX = [0, 1, 2, 0, 2, 3];
const TN = 1024;
/** 255·(1 − e^−E) for E in 0…16 at 1/256 steps: the field's density, without an exp per cell. */
const DENSITY_LUT = (() => {
  const t = new Float32Array(4097);
  for (let i = 0; i <= 4096; i++) t[i] = 255 * (1 - Math.exp(-i / 256));
  return t;
})();

// Glyph atlas.
const ATLAS_PX = 96;
const SPREAD = 36;
const ATLAS_W = 1024;
const RIM_SIGMA = 0.6; // edge blur sigma (CSS px) per Rim px
const EDGE_OUT = 0.5; // ink edge sits this many sigma outside the fitted outline

/** The gradient map: 18 clusters (V = index / 17), rebuilt from the colour props. */
const DEF_TIP = [5, 74, 83];
const DEF_COOL = [23, 136, 153];
const DEF_MID = [224, 203, 80];
const DEF_HOT = [164, 36, 9];
const DEF_GLYPH = [10, 10, 10];
/** [rgb, anchor A, anchor B, mix toward B, alpha] — the colour props that tint each stop. */
const RAMP_STOPS = [
  [[3, 37, 42], "tip", "tip", 0, 0],
  [[12, 49, 56], "tip", "tip", 0, 1],
  [[4, 60, 69], "tip", "tip", 0, 1],
  [[5, 74, 83], "tip", "tip", 0, 1],
  [[9, 87, 97], "tip", "cool", 0.22, 1],
  [[15, 100, 114], "tip", "cool", 0.43, 1],
  [[17, 118, 134], "tip", "cool", 0.72, 1],
  [[23, 136, 153], "cool", "cool", 0, 1],
  [[78, 166, 168], "cool", "mid", 0.1, 1],
  [[128, 190, 178], "cool", "mid", 0.25, 1],
  [[167, 202, 152], "cool", "mid", 0.45, 1],
  [[196, 207, 135], "cool", "mid", 0.7, 1],
  [[224, 203, 80], "mid", "mid", 0, 1],
  [[243, 177, 82], "mid", "hot", 0.2, 1],
  [[226, 110, 45], "mid", "hot", 0.55, 1],
  [[164, 36, 9], "hot", "hot", 0, 1],
  [[100, 7, 8], "hot", "hot", 0, 1],
  [[10, 10, 10], "glyph", "glyph", 0, 1],
];

// ── Small helpers ───────────────────────────────────────────────────────────
function num(v, fb) {
  const n = typeof v === "number" ? v : typeof v === "string" ? parseFloat(v) : NaN;
  return Number.isFinite(n) ? n : fb;
}
function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}
function smoothstep(a, b, x) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}
function hash(n) {
  const s = Math.sin(n) * 43758.5453;
  return s - Math.floor(s);
}
function mulberry32(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rgbCache = new Map();
function parseRgb(c, fb) {
  if (typeof c !== "string") return fb;
  const hit = rgbCache.get(c);
  if (hit) return hit;
  let out = fb;
  const s = c.trim();
  if (s[0] === "#") {
    let h = s.slice(1);
    if (h.length === 3 || h.length === 4)
      h = h
        .split("")
        .map((x) => x + x)
        .join("");
    if (h.length >= 6) {
      const n = parseInt(h.slice(0, 6), 16);
      if (!isNaN(n)) out = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
  } else {
    const m = s.match(/rgba?\(([^)]+)\)/i);
    if (m) {
      const p = m[1]
        .split(/[\s,/]+/)
        .filter(Boolean)
        .map(parseFloat);
      if (p.length >= 3 && p.slice(0, 3).every((v) => Number.isFinite(v))) out = [p[0], p[1], p[2]];
    }
  }
  rgbCache.set(c, out);
  return out;
}
function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
/** Drag-to-spin strength; 0 when the component is not interactive. */
function dragOf(p) {
  return p.interactive === false ? 0 : num(p.advanced?.drag, 50);
}

// ── Fonts ───────────────────────────────────────────────────────────────────
const FALLBACK_STACK = `Impact, Haettenschweiler, "Arial Narrow Bold", "Arial Black", sans-serif`;
function fontFamilyOf(font) {
  return font && typeof font.fontFamily === "string" && font.fontFamily.trim() ? font.fontFamily.trim() : "Anton";
}
function fontWeightOf(font) {
  const w = num(font && font.fontWeight, NaN);
  return Number.isFinite(w) ? w : 400;
}
function fontCss(font, px) {
  const fam = fontFamilyOf(font);
  const famCss = fam.includes(",") || /^["']/.test(fam) ? fam : `"${fam}"`;
  return `normal ${fontWeightOf(font)} ${px}px ${famCss}, ${FALLBACK_STACK}`;
}
/** Letter spacing in em. */
function trackingOf(font) {
  return num(font && font.letterSpacing, 0);
}

/**
 * When no @font-face for the family is registered, ask Google Fonts for it once
 * (a family it does not know just 400s, and the fallback stack stands). Fonts
 * you already load yourself are used as they are.
 */
const requestedFonts = new Set();
function ensureFont(font, onReady) {
  const fam = fontFamilyOf(font);
  const fonts = typeof document !== "undefined" ? document.fonts : undefined;
  if (!fonts || fam.includes(",") || /^["']/.test(fam) || /^(serif|sans-serif|monospace|system-ui)$/i.test(fam)) {
    onReady();
    return;
  }
  const weight = fontWeightOf(font);
  const css = fontCss(font, ATLAS_PX);
  let registered = false;
  fonts.forEach((face) => {
    if (face.family.replace(/^["']|["']$/g, "") === fam) registered = true;
  });
  const key = `${fam}|${weight}`;
  if (registered || requestedFonts.has(key)) {
    fonts.load(css, "TEXT").then(onReady, onReady);
    return;
  }
  requestedFonts.add(key);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fam).replace(/%20/g, "+")}:wght@${weight}&display=swap`;
  link.onload = () => fonts.load(css, "TEXT").then(onReady, onReady);
  link.onerror = onReady;
  document.head.appendChild(link);
}

// ── Glyph SDF atlas ─────────────────────────────────────────────────────────
const INF = 1e20;
function edt1d(grid, offset, stride, length, f, v, z) {
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;
  f[0] = grid[offset];
  for (let q = 1, k = 0, s = 0; q < length; q++) {
    f[q] = grid[offset + q * stride];
    const q2 = q * q;
    do {
      const r = v[k];
      s = (f[q] - f[r] + q2 - r * r) / (q - r) / 2;
    } while (s <= z[k] && --k > -1);
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }
  for (let q = 0, k = 0; q < length; q++) {
    while (z[k + 1] < q) k++;
    const r = v[k];
    const qr = q - r;
    grid[offset + q * stride] = f[r] + qr * qr;
  }
}
function edt(grid, w, h, f, v, z) {
  for (let x = 0; x < w; x++) edt1d(grid, x, w, h, f, v, z);
  for (let y = 0; y < h; y++) edt1d(grid, y * w, 1, w, f, v, z);
}

function buildAtlas(chars, font, key) {
  const scratch = document.createElement("canvas");
  const ctx = scratch.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const css = fontCss(font, ATLAS_PX);
  ctx.font = css;
  const advance = new Map();
  const metrics = [];
  const seen = new Set();
  for (const ch of chars) {
    if (seen.has(ch)) continue;
    seen.add(ch);
    const m = ctx.measureText(ch);
    advance.set(ch, m.width / ATLAS_PX);
    if (ch.trim() === "") continue;
    const l = Math.ceil(Math.max(0, m.actualBoundingBoxLeft || 0));
    const r = Math.ceil(Math.max(m.width, m.actualBoundingBoxRight || 0));
    const asc = Math.ceil(m.actualBoundingBoxAscent || ATLAS_PX * 0.8);
    const des = Math.ceil(Math.max(0, m.actualBoundingBoxDescent || 0));
    metrics.push({ ch, w: l + r + 2 * SPREAD, h: asc + des + 2 * SPREAD, x0: SPREAD + l, y0: SPREAD + asc, adv: m.width });
  }
  // shelf packing
  let x = 0;
  let y = 0;
  let rowH = 0;
  const place = [];
  for (const m of metrics) {
    if (x + m.w > ATLAS_W) {
      x = 0;
      y += rowH;
      rowH = 0;
    }
    place.push({ x, y });
    x += m.w;
    rowH = Math.max(rowH, m.h);
  }
  const height = Math.max(1, y + rowH);
  const data = new Uint8Array(ATLAS_W * height);
  const cells = new Map();
  let maxW = 1;
  let maxH = 1;
  for (const m of metrics) {
    maxW = Math.max(maxW, m.w);
    maxH = Math.max(maxH, m.h);
  }
  const n = Math.max(maxW, maxH);
  const f = new Float64Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  scratch.width = maxW;
  scratch.height = maxH;
  for (let k = 0; k < metrics.length; k++) {
    const m = metrics[k];
    const p = place[k];
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, maxW, maxH);
    ctx.font = css;
    ctx.fillStyle = "#fff";
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    ctx.fillText(m.ch, m.x0, m.y0);
    const img = ctx.getImageData(0, 0, m.w, m.h).data;
    const size = m.w * m.h;
    const outer = new Float64Array(size);
    const inner = new Float64Array(size);
    for (let i = 0; i < size; i++) {
      const a = img[i * 4 + 3] / 255;
      if (a >= 1) {
        outer[i] = 0;
        inner[i] = INF;
      } else if (a <= 0) {
        outer[i] = INF;
        inner[i] = 0;
      } else {
        const d = 0.5 - a;
        outer[i] = d > 0 ? d * d : 0;
        inner[i] = d < 0 ? d * d : 0;
      }
    }
    edt(outer, m.w, m.h, f, v, z);
    edt(inner, m.w, m.h, f, v, z);
    const sdf = new Float32Array(size);
    for (let yy = 0; yy < m.h; yy++) {
      for (let xx = 0; xx < m.w; xx++) {
        const i = yy * m.w + xx;
        const s = clamp(Math.sqrt(inner[i]) - Math.sqrt(outer[i]), -SPREAD, SPREAD);
        sdf[i] = s;
        data[(p.y + yy) * ATLAS_W + p.x + xx] = Math.round(clamp(127.5 + (s * 127.5) / SPREAD, 0, 255));
      }
    }
    cells.set(m.ch, { x: p.x, y: p.y, w: m.w, h: m.h, ox: m.x0 + m.adv / 2, oy: m.y0, sdf });
  }
  return { key, cells, advance, data, height };
}

function sampleSdf(c, ax, ay) {
  const fx = ax - 0.5;
  const fy = ay - 0.5;
  if (fx < 0 || fy < 0 || fx >= c.w - 1 || fy >= c.h - 1) return -SPREAD;
  const x0 = fx | 0;
  const y0 = fy | 0;
  const tx = fx - x0;
  const ty = fy - y0;
  const i = y0 * c.w + x0;
  const s = c.sdf;
  const a = s[i] + (s[i + 1] - s[i]) * tx;
  const b = s[i + c.w] + (s[i + c.w + 1] - s[i + c.w]) * tx;
  return a + (b - a) * ty;
}

// ── Ground grain ────────────────────────────────────────────────────────────
/** 512² tile: L = fine grain with specks and pores, A = soft mottle. Seamless. */
function makeGrainTile() {
  const N = 512;
  const out = new Uint8Array(N * N * 2);
  const rnd = mulberry32(1337);
  const lat = (cells, salt) => {
    const g = new Float32Array(cells * cells);
    const r = mulberry32(salt);
    for (let i = 0; i < g.length; i++) g[i] = r();
    return (x, y) => {
      const fx = (x / N) * cells;
      const fy = (y / N) * cells;
      const x0 = Math.floor(fx);
      const y0 = Math.floor(fy);
      let tx = fx - x0;
      let ty = fy - y0;
      tx = tx * tx * (3 - 2 * tx);
      ty = ty * ty * (3 - 2 * ty);
      const xa = ((x0 % cells) + cells) % cells;
      const ya = ((y0 % cells) + cells) % cells;
      const xb = (xa + 1) % cells;
      const yb = (ya + 1) % cells;
      const a = g[ya * cells + xa] + (g[ya * cells + xb] - g[ya * cells + xa]) * tx;
      const b = g[yb * cells + xa] + (g[yb * cells + xb] - g[yb * cells + xa]) * tx;
      return a + (b - a) * ty;
    };
  };
  const m1 = lat(8, 11);
  const m2 = lat(16, 12);
  const m3 = lat(32, 13);
  const f1 = lat(128, 14);
  const f2 = lat(256, 15);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const mott = 0.5 * m1(x, y) + 0.3 * m2(x, y) + 0.2 * m3(x, y);
      let fine = 0.45 * f1(x, y) + 0.35 * f2(x, y) + 0.2 * rnd();
      // pores and specks, denser where the mottle is light (worn concrete)
      const r = rnd();
      if (r < 0.006 + 0.01 * mott) fine += 0.55 + 0.4 * rnd();
      else if (r > 0.985) fine -= 0.35;
      const i = (y * N + x) * 2;
      out[i] = Math.round(clamp(fine * 255, 0, 255));
      out[i + 1] = Math.round(clamp(mott * 255, 0, 255));
    }
  }
  return out;
}

// ── Matrices (row-major 3×3) ────────────────────────────────────────────────
function m3mul(a, b, out) {
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++) out[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
  return out;
}
function m3inv(m, out) {
  const [a, b, c, d, e, f, g, h, i] = [m[0], m[1], m[2], m[3], m[4], m[5], m[6], m[7], m[8]];
  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const det = a * A + b * B + c * C;
  const k = Math.abs(det) > 1e-12 ? 1 / det : 0;
  out[0] = A * k;
  out[1] = -(b * i - c * h) * k;
  out[2] = (b * f - c * e) * k;
  out[3] = B * k;
  out[4] = (a * i - c * g) * k;
  out[5] = -(a * f - c * d) * k;
  out[6] = C * k;
  out[7] = -(a * h - b * g) * k;
  out[8] = (a * e - b * d) * k;
  return out;
}
function m3set(out, a, b, c, d, e, f, g, h, i) {
  out[0] = a;
  out[1] = b;
  out[2] = c;
  out[3] = d;
  out[4] = e;
  out[5] = f;
  out[6] = g;
  out[7] = h;
  out[8] = i;
  return out;
}
/** Row-major → column-major float32 for uniformMatrix3fv. */
function m3gl(m, out) {
  out[0] = m[0];
  out[1] = m[3];
  out[2] = m[6];
  out[3] = m[1];
  out[4] = m[4];
  out[5] = m[7];
  out[6] = m[2];
  out[7] = m[5];
  out[8] = m[8];
  return out;
}

// ── Shaders ─────────────────────────────────────────────────────────────────
function shaderSrc(gl2, kind, body) {
  if (gl2)
    return (
      "#version 300 es\n" +
      (kind === "v"
        ? "#define ATTR in\n#define VARY out\n"
        : "precision highp float;\n#define VARY in\n#define TEX texture\nout vec4 outColor;\n#define FRAG outColor\n") +
      body
    );
  return (
    (kind === "v"
      ? "#define ATTR attribute\n#define VARY varying\n"
      : "#extension GL_OES_standard_derivatives : enable\nprecision highp float;\n#define VARY varying\n#define TEX texture2D\n#define FRAG gl_FragColor\n") +
    body
  );
}

const HASH = `
float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}
`;

/**
 * One hairline's value on the map. The field holds the density at line cores;
 * a gap sits a fixed step below its core, so the step is subtracted rather than
 * scaled. Needs uLook (gap step, line variance, flicker, clock), uSeed.
 */
const HAIRLINE = `
#define ROW0 (0.5 / 4.0)
#define ROW1 (1.5 / 4.0)
#define ROW2 (2.5 / 4.0)
#define ROW3 (3.5 / 4.0)
float hairline(float V, float f, float fw, float i, float y, out float prof) {
    prof = pow(0.5 + 0.5 * cos(6.2831853 * (f - 0.5)), 1.3);
    // under ~2.5 buffer px per line the profile folds to its mean (no moire)
    prof = mix(prof, 0.45, smoothstep(0.22, 0.5, fw));
    float gain = 1.0 + uLook.y * (hash12(vec2(i, uSeed)) - 0.5)
        + uLook.z * sin(uLook.w * (1.3 + 2.0 * hash12(vec2(i, uSeed + 17.0))) + 6.2831853 * hash12(vec2(i, uSeed + 41.0)));
    // brightness varies in energy, not density: saturated stems stay black
    float vg = 1.0 - pow(max(1.0 - V, 1e-4), max(gain, 0.0));
    float core = TEX(uLut, vec2(clamp(vg, 0.0, 1.0) * (255.0 / 256.0) + 0.5 / 256.0, ROW3)).r;
    float gap = TEX(uLut, vec2(core * (255.0 / 256.0) + 0.5 / 256.0, ROW2)).r;
    gap = max(0.0, core - (core - gap) * uLook.x);
    float v = mix(gap, core, prof);
    // dust riding the hairlines: pale specks that run down the curtain, each
    // line at its own pace, and twinkle as they go (frame 0 is the poster)
    float fall = 35.0 + 90.0 * hash12(vec2(i, uSeed + 5.0));
    float yy = y - mod(uLook.w, 600.0) * fall;
    float cell = floor(yy / 3.0);
    float sh = hash12(vec2(i * 1.37 + uSeed, cell));
    float sp = step(0.992, sh) * step(0.04, V);
    float tw = 0.6 + 0.4 * cos(uLook.w * (2.0 + 5.0 * hash12(vec2(cell, i + uSeed))));
    return mix(v, 0.53, sp * tw * prof);
}
`;

const VS_FULL = `
ATTR vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

/**
 * Background, grain and the hairline curtain. uV holds one density per hairline
 * and field row (L) plus the share of it that comes from front-half type (A).
 */
const FS_FULL = `
uniform vec2 uRes;
uniform float uPx;
uniform vec2 uFrame;
uniform mat3 uToContent;
uniform sampler2D uV;
uniform sampler2D uLut;
uniform sampler2D uGrain;
uniform vec4 uGeo;   // first line x, first row y, pitch, row step (poster px)
uniform vec2 uDim;   // lines, rows
uniform vec3 uBg;
uniform vec4 uLook;  // gap level, line variance, flicker, clock
uniform vec4 uLook2; // back brightness, glow, grain, vignette
uniform float uSeed;
${HASH}
${HAIRLINE}
void main() {
    vec2 css = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uPx;
    vec3 col = uBg;
    vec4 g1 = TEX(uGrain, css * (1.0 / 512.0));
    vec4 g2 = TEX(uGrain, css * (1.0 / 1531.0) + vec2(0.37, 0.61));
    col += ((g1.r - 0.5) + (g1.a - 0.5) * 0.35 + (g2.a - 0.5) * 0.45) * uLook2.z;

    vec3 hc = uToContent * vec3(css, 1.0);
    vec2 c = hc.xy / hc.z;
    float li = (c.x - uGeo.x) / uGeo.z;
    // lines per buffer pixel; taken before any branch
    float fw = length(vec2(dFdx(li), dFdy(li)));
    float i = floor(li);
    float f = li - i;
    if (hc.z > 0.0 && i >= 0.0 && i < uDim.x) {
        float vy = (c.y - uGeo.y) / (uGeo.w * uDim.y);
        vec2 t = TEX(uV, vec2((i + 0.5) / uDim.x, vy)).ra;
        float V = t.x;
        if (V > 0.003) {
            float prof;
            float v = hairline(V, f, fw, i, c.y, prof);
            vec4 sc = TEX(uLut, vec2(clamp(v, 0.0, 1.0) * (255.0 / 256.0) + 0.5 / 256.0, ROW0));
            sc.rgb *= mix(uLook2.x, 1.0, t.y);
            col = mix(col, sc.rgb, sc.a);
            if (uLook2.y > 0.0) {
                float vs = TEX(uV, vec2(li / uDim.x, vy)).r;
                vec4 gc = TEX(uLut, vec2(clamp(vs * 0.62, 0.0, 1.0) * (255.0 / 256.0) + 0.5 / 256.0, ROW0));
                col += gc.rgb * gc.a * uLook2.y * (1.0 - prof) * 0.22;
            }
        }
    }
    if (uLook2.w > 0.0) {
        vec2 q = css / uFrame - 0.5;
        float r = length(q * uFrame) / (0.5 * length(uFrame));
        col *= 1.0 - uLook2.w * smoothstep(0.35, 1.0, r);
    }
    FRAG = vec4(col, 1.0);
}
`;

const VS_GLYPH = `
ATTR vec3 aPos;
ATTR vec2 aUV;
ATTR vec4 aCell;
ATTR float aSide;
uniform mat3 uToClip;
VARY vec2 vUV;
VARY vec3 vC;
VARY vec4 vCell;
VARY float vSide;
void main() {
    vec3 p = uToClip * aPos;
    gl_Position = vec4(p.xy, 0.0, p.z);
    vUV = aUV;
    vC = aPos;
    vCell = aCell;
    vSide = aSide;
}
`;

/**
 * One glyph: the letter's coverage blurred across its edge (5 taps along the
 * SDF normal, sigma in CSS px) and read through the same gradient map as the
 * curtain. Thick strokes go black inside a gold rim; thin far strokes never
 * reach black and glow gold. Where the curtain behind is denser than the
 * blurred letter, the curtain wins, so counters show the lines through them.
 */
const FS_GLYPH = `
uniform sampler2D uAtlas;
uniform sampler2D uLut;
uniform sampler2D uV;
uniform vec4 uGly;   // spread, bold (atlas px), blur sigma (css px), buffer px per css px
uniform vec2 uAtlasTexel; // one atlas texel in uv
uniform vec4 uGeo;
uniform vec2 uDim;
uniform vec4 uDot;   // ghost-dot strength
uniform vec4 uLook;
uniform float uSeed;
VARY vec2 vUV;
VARY vec3 vC;
VARY vec4 vCell;
VARY float vSide;
${HASH}
${HAIRLINE}
float sdfAt(vec2 uv) {
    return (TEX(uAtlas, clamp(uv, vCell.xy, vCell.zw)).r - 0.5) * 2.0 * uGly.x + uGly.y;
}
void main() {
    float s0 = sdfAt(vUV);
    vec2 dUx = dFdx(vUV);
    vec2 dUy = dFdy(vUV);
    // Edge gradient from two atlas taps, carried to the screen through the
    // (smooth) uv derivatives: derivatives of the 8-bit SDF itself are stepped
    // and made the rim crinkle.
    vec2 ga = vec2(sdfAt(vUV + vec2(uAtlasTexel.x, 0.0)) - sdfAt(vUV - vec2(uAtlasTexel.x, 0.0)),
                   sdfAt(vUV + vec2(0.0, uAtlasTexel.y)) - sdfAt(vUV - vec2(0.0, uAtlasTexel.y))) * 0.5;
    vec2 gS = vec2(dot(ga, dUx / uAtlasTexel), dot(ga, dUy / uAtlasTexel));
    vec2 cp = vC.xy / vC.z;
    float li = (cp.x - uGeo.x) / uGeo.z;
    float fw = length(vec2(dFdx(li), dFdy(li)));
    float gl = max(length(gS), 1e-5);
    vec2 nrm = gS / gl;
    float sigB = max(uGly.z * uGly.w, 0.35);
    vec2 stepUV = (dUx * nrm.x + dUy * nrm.y) * sigB * 0.8;
    // the ink edge sits EDGE_OUT sigma outside the fitted black
    float off = ${EDGE_OUT.toFixed(3)} * sigB * gl;
    float V = 0.0;
    V += 0.0924 * clamp(0.5 + (sdfAt(vUV - 2.0 * stepUV) + off) / gl, 0.0, 1.0);
    V += 0.2414 * clamp(0.5 + (sdfAt(vUV - stepUV) + off) / gl, 0.0, 1.0);
    V += 0.3324 * clamp(0.5 + (s0 + off) / gl, 0.0, 1.0);
    V += 0.2414 * clamp(0.5 + (sdfAt(vUV + stepUV) + off) / gl, 0.0, 1.0);
    V += 0.0924 * clamp(0.5 + (sdfAt(vUV + 2.0 * stepUV) + off) / gl, 0.0, 1.0);

    // the curtain at this pixel (same hairline as the full pass)
    float i = floor(li);
    float f = li - i;
    float vy = (cp.y - uGeo.y) / (uGeo.w * uDim.y);
    float va = 0.0;
    float vs = 0.0;
    float prof = 0.5;
    if (i >= 0.0 && i < uDim.x) {
        va = TEX(uV, vec2((i + 0.5) / uDim.x, vy)).r;
        if (va > 0.003) vs = hairline(va, f, fw, i, cp.y, prof);
    }
    vec4 c = TEX(uLut, vec2(clamp(V, 0.0, 1.0) * (255.0 / 256.0) + 0.5 / 256.0, ROW1));
    vec3 rgb = c.rgb;
    // Hairlines from the type above can run on over thick strokes as dotted
    // rows; only where that curtain is hot. Off by default (uDot = 0).
    if (uDot.x > 0.0 && vSide > 0.0) {
        float core = 0.5 + 0.5 * cos(6.2831853 * (f - 0.5));
        float dots = uDot.x * vSide * smoothstep(0.78, 0.97, core) * smoothstep(0.985, 0.999, V)
            * smoothstep(0.5, 0.78, va) * (1.0 - smoothstep(0.3, 0.5, fw));
        vec4 dc = TEX(uLut, vec2(clamp(va * 0.86, 0.0, 1.0) * (255.0 / 256.0) + 0.5 / 256.0, ROW0));
        rgb = mix(rgb, dc.rgb, dots * dc.a);
    }
    // The blurred letter lies over the curtain by its own coverage; only its
    // faint teal fringe yields to a denser curtain behind it.
    float a = c.a * max(smoothstep(0.22, 0.5, V), smoothstep(vs - 0.03, vs + 0.03, V));
    FRAG = vec4(rgb * a, a);
}
`;

// ── Ramp ────────────────────────────────────────────────────────────────────
/** 256 × 4 RGBA: row 0 = the streak map (V → colour), row 1 = the glyph map, row 2 = gap of core, row 3 = core curve. */
function buildRamp(hot, mid, cool, tip, glyph, rim, out) {
  // Each stop is the reference colour, tinted by how far the colour props have
  // moved from their defaults (per channel, along the stop's anchor pair), so
  // the default palette reproduces the reference exactly. Text Color only fills
  // the letters; the curtain's burnt-black stems keep their black.
  const anchors = {
    tip: [tip, DEF_TIP],
    cool: [cool, DEF_COOL],
    mid: [mid, DEF_MID],
    hot: [hot, DEF_HOT],
    glyph: [DEF_GLYPH, DEF_GLYPH],
  };
  const stops = RAMP_STOPS.map(([rgb, A, B, t, alpha], k) => {
    const now = mix(anchors[A][0], anchors[B][0], t);
    const def = mix(anchors[A][1], anchors[B][1], t);
    const c = [
      Math.min(255, (rgb[0] * (now[0] + 8)) / (def[0] + 8)),
      Math.min(255, (rgb[1] * (now[1] + 8)) / (def[1] + 8)),
      Math.min(255, (rgb[2] * (now[2] + 8)) / (def[2] + 8)),
    ];
    return [k, c, alpha];
  });
  for (let i = 0; i < 256; i++) {
    const x = (i / 255) * 17;
    const k = Math.min(16, Math.floor(x));
    const t = x - k;
    const a = stops[k];
    const b = stops[k + 1];
    const o = i * 4;
    out[o] = Math.round(a[1][0] + (b[1][0] - a[1][0]) * t);
    out[o + 1] = Math.round(a[1][1] + (b[1][1] - a[1][1]) * t);
    out[o + 2] = Math.round(a[1][2] + (b[1][2] - a[1][2]) * t);
    out[o + 3] = Math.round(255 * (a[2] + (b[2] - a[2]) * t));
  }
  // Glyph row: the same map, with Rim Color laid over the pale-gold band the
  // edge crosses, and Text Color filling the solid inside (the last stop).
  const lift = [glyph[0] - DEF_GLYPH[0], glyph[1] - DEF_GLYPH[1], glyph[2] - DEF_GLYPH[2]];
  for (let i = 0; i < 256; i++) {
    const x = i / 255;
    const w = Math.exp(-(((x - 0.62) / 0.075) ** 2));
    const fill = clamp((x - 16 / 17) * 17, 0, 1);
    const o = i * 4;
    const o2 = (256 + i) * 4;
    out[o2] = Math.round(clamp(out[o] + (rim[0] - out[o]) * w + lift[0] * fill, 0, 255));
    out[o2 + 1] = Math.round(clamp(out[o + 1] + (rim[1] - out[o + 1]) * w + lift[1] * fill, 0, 255));
    out[o2 + 2] = Math.round(clamp(out[o + 2] + (rim[2] - out[o + 2]) * w + lift[2] * fill, 0, 255));
    out[o2 + 3] = out[o + 3];
  }
  let k = 0;
  for (let i = 0; i < 256; i++) {
    const x = i / 255;
    while (k < GAP_OF_CORE.length - 2 && x > GAP_OF_CORE[k + 1][0]) k++;
    const a = GAP_OF_CORE[k];
    const b = GAP_OF_CORE[k + 1];
    const g = a[1] + (b[1] - a[1]) * clamp((x - a[0]) / (b[0] - a[0]), 0, 1);
    const o3 = (512 + i) * 4;
    out[o3] = out[o3 + 1] = out[o3 + 2] = Math.round(g * 255);
    out[o3 + 3] = 255;
    const cx = x * (CORE_CURVE.length - 1);
    const c0 = Math.min(CORE_CURVE.length - 2, Math.floor(cx));
    const cvv = CORE_CURVE[c0] + (CORE_CURVE[c0 + 1] - CORE_CURVE[c0]) * (cx - c0);
    const o4 = (768 + i) * 4;
    out[o4] = out[o4 + 1] = out[o4 + 2] = Math.round(clamp(cvv, 0, 1) * 255);
    out[o4 + 3] = 255;
  }
}

// ── Component ───────────────────────────────────────────────────────────────
export default function HeatStreakRing({
  text = "TEXT BLUR EFFECT",
  background = "#161616",
  fontFamily = "Anton",
  fontWeight = "400",
  fontSize = 60,
  letterSpacing = 0,
  scale = 350,
  streakLength = 0,
  hot = "#A42409",
  mid = "#E0CB50",
  cool = "#178899",
  textColor = "#0A0A0A",
  tipColor = "#054A53",
  rimColor = "#D2CC8A",
  speed = 50,
  spin = 30,
  hover = 50,
  drag = 50,
  repeats = 2,
  seed = 7,
  streakCount = 111,
  lineWidth = 60,
  lengthJitter = 30,
  ringWidth = 42,
  ringTilt = 33,
  ringY = 42,
  bulge = 30,
  backSize = 28,
  glyphTilt = 75,
  heavy = 0,
  heatRun = 85,
  coolStart = 30,
  edgeShift = 50,
  backGain = 60,
  backShift = 30,
  glow = 30,
  rimPx = 2,
  grain = 50,
  vignette = 0,
  shimmer = 100,
  flicker = 10,
  pulses = 2,
  pulseMs = 2000,
  pulseAmp = 35,
  placeX = 0,
  placeY = 0,
  placeAngle = 0,
  placeTilt = 0,
  interactive = true,
  style = {},
}) {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const wakeRef = useRef(() => {});

  // Everything the engine reads, gathered in one object it picks up each frame.
  const cfg = {
    text,
    background,
    font: { fontFamily, fontWeight, fontSize, letterSpacing },
    scale,
    streakLength,
    colors: { text: textColor, hot, mid, cool },
    speed,
    hover,
    interactive,
    advanced: {
      repeats, seed, streakCount, ringWidth, ringTilt, ringY, bulge, backSize, glyphTilt, heavy,
      lengthJitter, lineWidth, glow, heatRun, coolStart, edgeShift, backGain, backShift, rimPx,
      rimColor, tipColor, drag, grain, vignette, spin, shimmer, flicker, pulses, pulseMs, pulseAmp,
    },
    placement: { x: placeX, y: placeY, angle: placeAngle, tilt: placeTilt },
  };
  const propsRef = useRef(cfg);
  propsRef.current = cfg;
  const propKey = JSON.stringify(cfg);
  const dragOn = dragOf(cfg) > 0;

  // A real change wakes the render loop (it sleeps when nothing is moving).
  useEffect(() => {
    wakeRef.current();
  }, [propKey]);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;

    const mq = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;

    // ── GL state ──
    let gl = null;
    let gl2 = false;
    let lost = false;
    let progFull = null;
    let progGlyph = null;
    let bufFull = null;
    let bufGlyph = null;
    let texV = null;
    let texLut = null;
    let texGrain = null;
    let texAtlas = null;
    let texVW = 0;
    let texVH = 0;
    let atlasUploaded = "";
    let lutKey = "";
    const uFull = {};
    const uGlyph = {};
    let aFull = -1;
    let aGPos = -1;
    let aGUV = -1;
    let aGCell = -1;
    let aGSide = -1;

    const compile = (g, type, s) => {
      const sh = g.createShader(type);
      if (!sh) return null;
      g.shaderSource(sh, s);
      g.compileShader(sh);
      if (!g.getShaderParameter(sh, g.COMPILE_STATUS) && !g.isContextLost()) {
        console.warn("HeatStreakRing shader:", g.getShaderInfoLog(sh));
        g.deleteShader(sh);
        return null;
      }
      return sh;
    };
    const link = (g, vs, fs) => {
      const v = compile(g, g.VERTEX_SHADER, shaderSrc(gl2, "v", vs));
      const f = compile(g, g.FRAGMENT_SHADER, shaderSrc(gl2, "f", fs));
      if (!v || !f) return null;
      const p = g.createProgram();
      if (!p) return null;
      g.attachShader(p, v);
      g.attachShader(p, f);
      g.linkProgram(p);
      if (!g.getProgramParameter(p, g.LINK_STATUS) && !g.isContextLost()) {
        console.warn("HeatStreakRing link:", g.getProgramInfoLog(p));
        return null;
      }
      return p;
    };
    const makeTex = (g, filter, wrap) => {
      const t = g.createTexture();
      g.bindTexture(g.TEXTURE_2D, t);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, filter);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, filter);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, wrap);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, wrap);
      return t;
    };

    const grainTile = makeGrainTile();

    const initGL = () => {
      const opts = {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        premultipliedAlpha: true,
        preserveDrawingBuffer: false,
        powerPreference: "low-power",
      };
      let g = null;
      const g2 = canvas.getContext("webgl2", opts);
      if (g2) {
        g = g2;
        gl2 = true;
      } else {
        g = canvas.getContext("webgl", opts) || canvas.getContext("experimental-webgl", opts);
        gl2 = false;
        if (g && !g.getExtension("OES_standard_derivatives")) g = null;
      }
      if (!g) return false;
      gl = g;
      progFull = link(g, VS_FULL, FS_FULL);
      progGlyph = link(g, VS_GLYPH, FS_GLYPH);
      if (!progFull || !progGlyph) {
        gl = null;
        return false;
      }
      for (const n of ["uRes", "uPx", "uFrame", "uToContent", "uV", "uLut", "uGrain", "uGeo", "uDim", "uBg", "uLook", "uLook2", "uSeed"])
        uFull[n] = g.getUniformLocation(progFull, n);
      for (const n of ["uToClip", "uAtlas", "uLut", "uV", "uGly", "uGeo", "uDim", "uDot", "uLook", "uSeed", "uAtlasTexel"])
        uGlyph[n] = g.getUniformLocation(progGlyph, n);
      aFull = g.getAttribLocation(progFull, "aPos");
      aGPos = g.getAttribLocation(progGlyph, "aPos");
      aGUV = g.getAttribLocation(progGlyph, "aUV");
      aGCell = g.getAttribLocation(progGlyph, "aCell");
      aGSide = g.getAttribLocation(progGlyph, "aSide");
      bufFull = g.createBuffer();
      g.bindBuffer(g.ARRAY_BUFFER, bufFull);
      g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), g.STATIC_DRAW);
      bufGlyph = g.createBuffer();
      g.pixelStorei(g.UNPACK_ALIGNMENT, 1);
      texV = makeTex(g, g.LINEAR, g.CLAMP_TO_EDGE);
      texLut = makeTex(g, g.LINEAR, g.CLAMP_TO_EDGE);
      texAtlas = makeTex(g, g.LINEAR, g.CLAMP_TO_EDGE);
      texGrain = makeTex(g, g.LINEAR, g.REPEAT);
      g.bindTexture(g.TEXTURE_2D, texGrain);
      g.texImage2D(g.TEXTURE_2D, 0, g.LUMINANCE_ALPHA, 512, 512, 0, g.LUMINANCE_ALPHA, g.UNSIGNED_BYTE, grainTile);
      texVW = 0;
      texVH = 0;
      atlasUploaded = "";
      lutKey = "";
      return true;
    };

    if (!initGL()) return; // The background stays on the root; nothing to draw with.

    // ── Size ──
    let W = 0;
    let H = 0;
    let shown = 1;
    let quality = 1;
    let bufScale = 1;
    const sizeCanvas = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      let k = dpr * clamp(shown, 1, 2) * quality;
      const budget = 4.2e6;
      if (W * H * k * k > budget) k = Math.sqrt(budget / Math.max(1, W * H));
      const cw = Math.max(1, Math.round(W * k));
      const ch = Math.max(1, Math.round(H * k));
      bufScale = cw / Math.max(1, W);
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw;
        canvas.height = ch;
        return true;
      }
      return false;
    };
    const measure = () => {
      W = root.offsetWidth;
      H = root.offsetHeight;
      const r = root.getBoundingClientRect();
      if (W > 0) {
        const s = r.width / W;
        if (Math.abs(s - shown) / shown > 0.05) shown = s;
      }
    };
    let needResize = true;
    const ro = new ResizeObserver(() => {
      measure();
      needResize = true;
      wake();
    });
    ro.observe(root);
    measure();

    // ── Visibility ──
    let onScreen = true;
    let tabVisible = document.visibilityState !== "hidden";
    const io =
      typeof IntersectionObserver === "function"
        ? new IntersectionObserver((es) => {
            for (const e of es) {
              onScreen = e.isIntersecting;
              if (e.boundingClientRect.width > 0 && W > 0) {
                const s = e.boundingClientRect.width / W;
                if (Math.abs(s - shown) / shown > 0.05) {
                  shown = s;
                  needResize = true;
                }
              }
            }
            wake();
          })
        : null;
    if (io) io.observe(root);
    const onVis = () => {
      tabVisible = document.visibilityState !== "hidden";
      wake();
    };
    document.addEventListener("visibilitychange", onVis);

    // ── Pointer (recorded only; the rect is read once per frame) ──
    const ptr = { cx: 0, cy: 0, inside: false, down: false, moved: false, lastX: 0, dragPx: 0, id: -1 };
    let rect = { left: 0, top: 0, width: 1, height: 1 };
    let rectDirty = true;
    let dragVel = 0;
    const onMove = (e) => {
      if (e.clientX === ptr.cx && e.clientY === ptr.cy && ptr.inside) return;
      if (ptr.down) {
        if (e.pointerType === "mouse" && e.buttons === 0) {
          ptr.down = false;
        } else {
          ptr.dragPx += e.clientX - ptr.lastX;
          ptr.lastX = e.clientX;
        }
      }
      ptr.cx = e.clientX;
      ptr.cy = e.clientY;
      ptr.inside = true;
      ptr.moved = true;
      wake();
    };
    const onLeave = () => {
      ptr.inside = false;
      wake();
    };
    const onDown = (e) => {
      ptr.cx = e.clientX;
      ptr.cy = e.clientY;
      ptr.inside = true;
      ptr.moved = true;
      const dk = dragOf(propsRef.current);
      if (dk <= 0) return;
      ptr.down = true;
      ptr.lastX = e.clientX;
      ptr.id = e.pointerId;
      dragVel = 0;
      if (e.pointerType === "mouse") e.preventDefault();
      try {
        root.setPointerCapture(e.pointerId);
      } catch {
        /* capture is best-effort */
      }
      wake();
    };
    const onUp = (e) => {
      if (!ptr.down) return;
      ptr.down = false;
      if (e.pointerType !== "mouse") ptr.inside = false;
      wake();
    };
    const onScroll = () => {
      rectDirty = true;
    };
    const noDrag = (e) => {
      if (ptr.down) e.preventDefault();
    };
    root.addEventListener("pointerenter", onMove);
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);
    root.addEventListener("pointerdown", onDown);
    root.addEventListener("pointerup", onUp);
    root.addEventListener("pointercancel", onUp);
    root.addEventListener("lostpointercapture", onUp);
    root.addEventListener("dragstart", noDrag);
    root.addEventListener("selectstart", noDrag);
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });

    // ── Fonts ──
    let fontKey = "";
    let fontReady = "";
    let fontsVersion = 0;
    const fontsApi = document.fonts;
    const onFontsDone = () => {
      fontsVersion++;
      wake();
    };
    if (fontsApi && fontsApi.addEventListener) fontsApi.addEventListener("loadingdone", onFontsDone);

    // ── Context loss ──
    const onLost = (e) => {
      e.preventDefault();
      lost = true;
      stop();
    };
    const onRestored = () => {
      lost = false;
      if (initGL()) {
        needResize = true;
        wake();
      }
    };
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);

    // ── Scene caches ──
    let atlas = null;
    let layoutKey = "";
    let layoutChars = [];
    let layoutTotal = 1;
    let layoutAnchor = 0;
    const lut = new Uint8Array(256 * 4 * 4);

    let N = 0; // hairlines
    let R = 0; // field rows
    let E = new Float32Array(1);
    let Fw = new Float32Array(1);
    let field = new Uint8Array(2);
    let lineLen = new Float32Array(1);
    let lineGain = new Float32Array(1);
    // Streak profiles over u = distance / length, TN steps (read nearest).
    const T = new Float32Array(TN + 1); // front streaks
    const Tb = new Float32Array(TN + 1); // far streaks (no loss along the way)
    const Ts = new Float32Array(TN + 1); // extra for long stems
    const pPos = new Float64Array(6);
    const pEnv = new Float64Array(6);
    const tailT = new Float32Array(64);
    for (let k = 0; k < 64; k++) tailT[k] = TAIL_K * Math.exp(-(k * ROW_STEP) / TAIL_LEN);
    const GV = 10; // floats per glyph vertex: X Y W, u v, cell rect, side-on share
    let glyphVerts = new Float32Array(6 * GV * 64);
    let sortedVerts = new Float32Array(30 * 64);

    const M = new Float64Array(9);
    const Minv = new Float64Array(9);
    const tmpA = new Float64Array(9);
    const tmpB = new Float64Array(9);
    const toContentGL = new Float32Array(9);
    const toClipGL = new Float32Array(9);

    // ── Animation state ──
    let raf = 0;
    let running = false;
    let lastTick = 0;
    let lastDraw = 0;
    let tt = 0;
    let over = 0;
    let downE = 0;
    let yawE = 0;
    let yawTgt = 0;
    let ptrTgt = COMP_CX;
    let ptrCX = COMP_CX;
    let dragAng = 0;
    let dirty = true;
    const gaps = [];
    let cadence = 16.7;
    let divisor = 1;
    // quality ladder
    const late = [];
    let ladderT = 0;
    let probe = null;
    let banUntil = 0;
    let goodSince = 0;

    function wake() {
      dirty = true;
      if (!running && !lost) {
        running = true;
        lastTick = 0;
        raf = requestAnimationFrame(tick);
      }
    }
    wakeRef.current = wake;
    function stop() {
      running = false;
      cancelAnimationFrame(raf);
    }

    // Width (em) of the reference phrase in this font: the ring is sized for it,
    // so a shorter text is repeated until it fills the same length instead of
    // being blown up to close the ring on its own.
    let refCtx = null;
    const refWidth = (font, ls) => {
      if (!refCtx) refCtx = document.createElement("canvas").getContext("2d");
      if (!refCtx) return 0;
      refCtx.font = fontCss(font, ATLAS_PX);
      const s = DEFAULT_TEXT + " ";
      return refCtx.measureText(s).width / ATLAS_PX + ls * Array.from(s).length;
    };

    const buildLayout = (font, phrase, repeatCount) => {
      if (!atlas) return;
      const ls = trackingOf(font) + FIT_TRACK;
      const key = `${atlas.key}|${phrase}|${repeatCount}|${ls}`;
      if (key === layoutKey) return;
      layoutKey = key;
      const one = Array.from(phrase + " ");
      const adv = one.map((ch) => (atlas.advance.get(ch) ?? 0.25) + ls);
      let oneW = 0;
      for (const a of adv) oneW += a;
      const ref = refWidth(font, ls);
      const copies = oneW > 1e-3 && ref > 0 ? clamp(Math.max(repeatCount, Math.round((repeatCount * ref) / oneW)), 1, 60) : repeatCount;
      const chars = [];
      let x = 0;
      for (let r = 0; r < copies; r++)
        for (let k = 0; k < one.length; k++) {
          chars.push({ ch: one[k], c: x + adv[k] / 2 });
          x += adv[k];
        }
      const sp = one.indexOf(" ");
      let anchor = 0;
      if (sp >= 0 && sp < one.length - 1) anchor = chars[sp].c;
      else {
        let pw = 0;
        for (let k = 0; k < one.length - 1; k++) pw += adv[k];
        anchor = pw / 2;
      }
      layoutChars = chars;
      layoutTotal = Math.max(1e-3, x);
      layoutAnchor = anchor;
    };

    // ── One frame ──
    const draw = (dt) => {
      const g = gl;
      if (!g || lost || W < 2 || H < 2) return;
      const p = propsRef.current;
      const adv = p.advanced;
      const pl = p.placement;
      const reduced = !!(mq && mq.matches);
      const hoverK = reduced || p.interactive === false ? 0 : clamp(num(p.hover, 50), 0, 100) / 50;
      const font = p.font;
      const phrase = typeof p.text === "string" ? p.text : DEFAULT_TEXT;

      // fonts → atlas
      const fk = fontCss(font, ATLAS_PX);
      if (fk !== fontKey) {
        fontKey = fk;
        const want = fk;
        ensureFont(font, () => {
          fontReady = want;
          fontsVersion++;
          wake();
        });
      }
      const chars = Array.from(new Set(Array.from(phrase + " ")));
      chars.sort();
      const aKey = `${fk}|${chars.join("")}|${fontReady === fk ? 1 : 0}|${fontsVersion}`;
      if (!atlas || atlas.key !== aKey) {
        const built = buildAtlas(chars, font, aKey);
        if (built) atlas = built;
        layoutKey = "";
      }
      if (!atlas) return;
      if (atlasUploaded !== atlas.key) {
        g.bindTexture(g.TEXTURE_2D, texAtlas);
        g.texImage2D(g.TEXTURE_2D, 0, g.LUMINANCE, ATLAS_W, atlas.height, 0, g.LUMINANCE, g.UNSIGNED_BYTE, atlas.data);
        atlasUploaded = atlas.key;
      }
      const repeatCount = Math.max(1, Math.round(num(adv.repeats, 2)));
      buildLayout(font, phrase, repeatCount);

      // palette
      const cols = p.colors;
      const cHot = cols.hot || DEFAULT_HOT;
      const cMid = cols.mid || DEFAULT_MID;
      const cCool = cols.cool || DEFAULT_COOL;
      const cText = cols.text || DEFAULT_TEXT_COLOR;
      const lk = `${cHot}|${cMid}|${cCool}|${adv.tipColor}|${cText}|${adv.rimColor}`;
      if (lk !== lutKey) {
        lutKey = lk;
        buildRamp(
          parseRgb(cHot, [164, 36, 9]),
          parseRgb(cMid, [224, 203, 80]),
          parseRgb(cCool, [23, 136, 153]),
          parseRgb(adv.tipColor, [5, 74, 83]),
          parseRgb(cText, [10, 10, 10]),
          parseRgb(adv.rimColor, [210, 204, 138]),
          lut
        );
        g.bindTexture(g.TEXTURE_2D, texLut);
        g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, 256, 4, 0, g.RGBA, g.UNSIGNED_BYTE, lut);
      }

      // ── frame → content map (one coordinate path for drawing and pointer) ──
      const S = Math.min(H, (W * COMP_H) / COMP_W);
      const sizeK = clamp(num(p.scale, REF_SCALE), 10, 400) / REF_SCALE;
      const m = (S / COMP_H) * sizeK;
      const ang = (clamp(num(pl.angle, 0), -180, 180) * Math.PI) / 180;
      const tlt = (clamp(num(pl.tilt, 0), -90, 90) * Math.PI) / 180;
      const Pp = 2.2 * S; // perspective distance of the lean
      const ox = W / 2 + (clamp(num(pl.x, 0), -50, 50) / 100) * W;
      const oy = H / 2 + (clamp(num(pl.y, 0), -50, 50) / 100) * H;
      // Frame on the ring itself, not on the curtain: the box is centred on the
      // ring (its ellipse centre, nudged up for the letters' height), so the
      // subject sits mid-box whatever the streak length.
      const ringMid = FIT_CY + (clamp(num(adv.ringY, 42), 10, 90) - 42) * (POSTER_H / 100) - RING_LIFT;
      m3set(tmpA, m, 0, -m * COMP_CX, 0, m, -m * ringMid, 0, 0, 1); // scale about the ring's centre
      const ca = Math.cos(ang);
      const sa = Math.sin(ang);
      m3set(tmpB, ca, -sa, 0, sa, ca, 0, 0, 0, 1);
      m3mul(tmpB, tmpA, M);
      m3set(tmpB, 1, 0, 0, 0, Math.cos(tlt), 0, 0, -Math.sin(tlt) / Pp, 1);
      m3mul(tmpB, M, tmpA);
      m3set(tmpB, 1, 0, ox, 0, 1, oy, 0, 0, 1);
      m3mul(tmpB, tmpA, M);
      m3inv(M, Minv);

      // ── pointer → content ──
      if (ptr.moved || rectDirty) {
        const r = root.getBoundingClientRect();
        rect = { left: r.left, top: r.top, width: Math.max(1, r.width), height: Math.max(1, r.height) };
        rectDirty = false;
        ptr.moved = false;
      }
      const fu = ((ptr.cx - rect.left) / rect.width) * W;
      const fv = ((ptr.cy - rect.top) / rect.height) * H;
      const hx = Minv[0] * fu + Minv[1] * fv + Minv[2];
      const hw = Minv[6] * fu + Minv[7] * fv + Minv[8];
      const pcx = hw !== 0 ? hx / hw : COMP_CX;

      // ── easing (secondary motion eases; the warm column follows in ~90 ms) ──
      const kE = 1 - Math.exp(-dt / 0.2);
      over += ((ptr.inside ? 1 : 0) - over) * kE;
      downE += ((ptr.down && ptr.inside ? 1 : 0) - downE) * (1 - Math.exp(-dt / 0.12));
      const half0 = FIT_HALF * (clamp(num(adv.ringWidth, 42), 10, 100) / 42);
      yawTgt = ptr.inside ? clamp((pcx - FIT_OX) / (2 * half0), -0.5, 0.5) : 0;
      yawE += (yawTgt - yawE) * kE;
      ptrTgt = pcx;
      ptrCX += (pcx - ptrCX) * (1 - Math.exp(-dt / 0.09));

      const speedF = clamp(num(p.speed, 50), 0, 100) / 50;
      if (!reduced) tt += dt * speedF * (1 + over * hoverK * 0.6);
      const time = reduced ? 0 : tt;

      // ── camera ──
      const sinE = clamp(FIT_SIN * (clamp(num(adv.ringTilt, 33), 5, 100) / 33), 0.03, 0.985);
      const cosE = Math.sqrt(1 - sinE * sinE);
      const kP = clamp(FIT_K * (clamp(num(adv.bulge, 30), 0, 90) / 30), 0, 0.85);
      const kc = kP * cosE;
      const F = (half0 * Math.sqrt(1 - kc * kc)) / FIT_AX;
      const cyE = FIT_CY + (clamp(num(adv.ringY, 42), 10, 90) - 42) * (POSTER_H / 100);
      const Oy = cyE - (F * sinE * kc) / (1 - kc * kc);
      const Ox = FIT_OX;
      const Fx = F * FIT_AX;

      // drag spins the ring: a drag across its width turns it half a revolution at 50, then coasts
      const dragK = clamp(dragOf(p), 0, 100) / 50;
      const dragContent = ptr.dragPx / Math.max(1e-3, (rect.width / Math.max(1, W)) * m);
      ptr.dragPx = 0;
      const radPx = (Math.PI / Math.max(1, 2 * half0)) * dragK;
      if (ptr.down) {
        const v = dt > 0 ? (dragContent * radPx) / dt : 0;
        dragVel += (clamp(v, -12, 12) - dragVel) * (1 - Math.exp(-dt / 0.08));
        dragAng += dragContent * radPx;
      } else {
        dragAng += dragVel * dt;
        dragVel *= Math.exp(-dt / 0.5);
        if (Math.abs(dragVel) < 1e-4) dragVel = 0;
      }
      const spinDeg = Math.max(1, num(adv.spin, 30));
      const phiW = FIT_PHI0 + ((-spinDeg * Math.PI) / 180) * time + yawE * hoverK * 0.6 + dragAng;

      // ── glyphs ──
      const fontPx = clamp(num(font.fontSize, 60), 4, 400);
      const emBase = ((2 * Math.PI) / layoutTotal) * FIT_EM * (fontPx / 60);
      const hs = FIT_HS * (clamp(num(adv.glyphTilt, 75), 10, 100) / 75);
      const backSizeK = clamp(num(adv.backSize, 28), 1, 100) / 28;
      const bold = (clamp(num(adv.heavy, 0), 0, 100) / 100) * 0.045 * ATLAS_PX;
      const nG = layoutChars.length;
      if (glyphVerts.length < nG * 6 * GV) glyphVerts = new Float32Array(nG * 6 * GV);

      // hairline grid in poster px, centred on the ring
      const streakCountV = clamp(num(adv.streakCount, 111), 20, 600);
      const pitch = Math.max(0.75, (2 * half0) / streakCountV);
      const reach = half0 + 0.35 * emBase * F * 1.6 + 16;
      const nLines = Math.min(1600, 2 * Math.ceil(reach / pitch));
      const lineX0 = Ox - (nLines / 2) * pitch;
      const sl = clamp(num(p.streakLength, 70), 0, 100) / 70;
      const ryE = (F * sinE) / (1 - kc * kc);
      const press = 1 + downE * hoverK * 0.25;
      const jit = clamp(num(adv.lengthJitter, 30), 0, 100) / 100;
      const Lmax =
        STREAK_SIDE * sl * (1 + Math.abs(STREAK_FRONT) + Math.abs(STREAK_BACK)) * (1 + jit / 2 + 0.08 * (num(adv.shimmer, 100) / 100)) * (1 + 0.25 * hoverK);
      const rowY0 = Math.floor(cyE - ryE - 0.3 * emBase * F - 4 * TAIL_LEN - 12);
      const rowY1 = Math.min(cyE + ryE + 20 + Lmax, cyE + ryE + 20 + 2600);
      const nRows = Math.min(1400, Math.max(2, Math.ceil((rowY1 - rowY0) / ROW_STEP)));
      if (nLines !== N || nRows !== R) {
        N = nLines;
        R = nRows;
        E = new Float32Array(N * R);
        Fw = new Float32Array(N * R);
        field = new Uint8Array(N * R * 2);
        lineLen = new Float32Array(N);
        lineGain = new Float32Array(N);
      }
      // Only rows the frame shows are solved: the curtain often runs past the
      // frame's foot, and those rows are never seen.
      let visY0 = Infinity;
      let visY1 = -Infinity;
      let visOk = true;
      for (let k = 0; k < 4; k++) {
        const fx = k & 1 ? W : 0;
        const fy = k & 2 ? H : 0;
        const hwv = Minv[6] * fx + Minv[7] * fy + Minv[8];
        if (hwv <= 1e-6) {
          visOk = false;
          break;
        }
        const cy = (Minv[3] * fx + Minv[4] * fy + Minv[5]) / hwv;
        if (cy < visY0) visY0 = cy;
        if (cy > visY1) visY1 = cy;
      }
      const rA = visOk ? clamp(Math.floor((visY0 - rowY0) / ROW_STEP) - 2, 0, R - 1) : 0;
      const rB = visOk ? clamp(Math.ceil((visY1 - rowY0) / ROW_STEP) + 2, 0, R - 1) : R - 1;
      E.fill(0, rA * N, (rB + 1) * N);
      Fw.fill(0, rA * N, (rB + 1) * N);

      // per-line length and gain
      const seedV = num(adv.seed, 7);
      const loopS = 360 / repeatCount / spinDeg;
      const ph2 = (2 * Math.PI * time) / loopS;
      const shimmerK = (clamp(num(adv.shimmer, 100), 0, 200) / 100) * 0.08;
      const edgeK = EDGE_K * (clamp(num(adv.edgeShift, 50), 0, 100) / 50) ** 2;
      const glowR = 0.2 * half0;
      for (let i = 0; i < N; i++) {
        const ii = i - (N >> 1);
        const h1 = hash(ii * 12.9898 + seedV * 78.233);
        const h2 = hash(ii * 39.3468 + seedV * 11.135);
        const h3 = hash(ii * 73.156 + seedV * 52.235);
        const h4 = hash(ii * 27.619 + seedV * 4.317);
        const x = lineX0 + (i + 0.5) * pitch;
        const q = (x - Ox) / Math.max(1, half0);
        const k1 = 1 + Math.floor(h4 * 3);
        const k2 = 2 + Math.floor(h3 * 2);
        const nn = 0.6 * Math.sin(ph2 * k1 + 2 * Math.PI * h2) + 0.4 * Math.sin(ph2 * k2 + 2 * Math.PI * h3);
        const band = 0.5 + 0.25 * Math.sin(q * 2.6 + seedV * 1.1) + 0.25 * Math.sin(q * 5.3 + seedV * 2.3 + ph2);
        lineLen[i] = (1 - jit / 2 + jit * (0.7 * band + 0.3 * h1) + shimmerK * nn) * press;
        const gx = (x - ptrCX) / glowR;
        lineGain[i] = (1 - edgeK * smoothstep(0.7, 1.05, Math.abs(q))) * (1 + over * hoverK * 0.35 * Math.exp(-gx * gx));
      }

      // streak profile along u = distance / length, with travelling pulses
      const heat = clamp(num(adv.heatRun, 85), 0, 200) / 85;
      const fadeStart = clamp(FADE_START + (clamp(num(adv.coolStart, 30), 0, 95) - 30) * 0.008, 0.05, 0.95);
      const pulseCount = Math.max(0, Math.round(num(adv.pulses, 2)));
      const pulseS = Math.max(0.1, num(adv.pulseMs, 2000) / 1000);
      const pAmp = (clamp(num(adv.pulseAmp, 35), 0, 100) / 100) * PULSE_GAIN;
      let nPulse = 0;
      for (let j = 0; j < pulseCount && j < 6 && pAmp > 0; j++) {
        const ph = time + PULSE_T0 * pulseS - (j * loopS) / pulseCount;
        const tau = (((ph % loopS) + loopS) % loopS) / pulseS;
        if (tau >= 1) continue;
        pPos[nPulse] = 0.5 - 0.5 * Math.cos(Math.PI * tau);
        pEnv[nPulse] = Math.sin(Math.PI * tau) * pAmp;
        nPulse++;
      }
      for (let k = 0; k <= TN; k++) {
        const u = (k + 0.5) / TN;
        const fade = 1 - smoothstep(fadeStart, 1, u);
        let pk = 0;
        for (let j = 0; j < nPulse; j++) {
          const d = (u - pPos[j]) / PULSE_W;
          pk += pEnv[j] * Math.exp(-d * d);
        }
        const boost = 1 + heat * HEAD_A * Math.exp(-u / HEAD_L) + pk;
        Tb[k] = fade * boost;
        T[k] = Math.pow(1 - COOL_DROP * u, COOL_POW) * Tb[k];
        Ts[k] = fade * (STEM_PULSE * pk + STEM_HEAD * heat * Math.exp(-u / STEM_HEAD_L));
      }

      const backCool = BACK_COOL_K * (clamp(num(adv.backShift, 30), 0, 100) / 30) ** 2;
      const invRow = 1 / ROW_STEP;
      let nv = 0;
      const quadOrder = [];
      for (let gi = 0; gi < nG; gi++) {
        const gc = layoutChars[gi];
        if (gc.ch.trim() === "") continue;
        const cell = atlas.cells.get(gc.ch);
        if (!cell) continue;
        const th = ((gc.c - layoutAnchor) / layoutTotal) * 2 * Math.PI + phiW;
        const sn = Math.sin(th);
        const cn = Math.cos(th);
        const front = (1 + cn) / 2;
        // the side letters carry the curtain above them as dotted rows
        const side = smoothstep(0.55, 0.85, Math.abs(sn));
        const em = emBase * (backSizeK + (1 - backSizeK) * front);
        if (em <= 0) continue;
        const Px = sn;
        const Pz = cn;
        const Tx = cn;
        const Tz = -sn;
        const Ux = -sn;
        const Uz = -cn;
        // quad corners (cell-local atlas px → world → poster)
        const A = ATLAS_PX;
        const cxs = [0, cell.w, cell.w, 0];
        const cys = [0, 0, cell.h, cell.h];
        let bx0 = Infinity;
        let bx1 = -Infinity;
        let by0 = Infinity;
        let by1 = -Infinity;
        const quad = [];
        let area = 0;
        const sx = [];
        const sy = [];
        for (let k = 0; k < 4; k++) {
          const a = (cxs[k] - cell.ox) / A;
          const b = (cell.oy - cys[k]) / A;
          const wx = Px + a * em * Tx + b * em * hs * Ux;
          const wz = Pz + a * em * Tz + b * em * hs * Uz;
          const den = 1 - kc * wz;
          const X = Ox * den + Fx * wx;
          const Y = Oy * den + F * sinE * wz;
          const px = X / den;
          const py = Y / den;
          sx.push(px);
          sy.push(py);
          if (px < bx0) bx0 = px;
          if (px > bx1) bx1 = px;
          if (py < by0) by0 = py;
          if (py > by1) by1 = py;
          quad.push(X, Y, den, (cell.x + cxs[k]) / ATLAS_W, (cell.y + cys[k]) / atlas.height);
        }
        for (let k = 0; k < 4; k++) {
          const k2 = (k + 1) & 3;
          area += sx[k] * sy[k2] - sx[k2] * sy[k];
        }
        area = Math.abs(area) / 2;
        if (area < 0.5) continue;
        const sigma = Math.sqrt(area / (cell.w * cell.h));
        // two triangles; the cell rect (half a texel in) keeps blur taps off the neighbours
        const o = nv * GV;
        const u0 = (cell.x + 0.5) / ATLAS_W;
        const v0 = (cell.y + 0.5) / atlas.height;
        const u1 = (cell.x + cell.w - 0.5) / ATLAS_W;
        const v1 = (cell.y + cell.h - 0.5) / atlas.height;
        for (let k = 0; k < 6; k++) {
          const q = QUAD_IDX[k] * 5;
          const w = o + k * GV;
          for (let c = 0; c < 5; c++) glyphVerts[w + c] = quad[q + c];
          glyphVerts[w + 5] = u0;
          glyphVerts[w + 6] = v0;
          glyphVerts[w + 7] = u1;
          glyphVerts[w + 8] = v1;
          glyphVerts[w + 9] = side;
        }
        quadOrder.push({ z: cn, o });
        nv += 6;

        // ── column scan: ink per hairline from the glyph's own SDF ──
        const baseDen = 1 - kc * Pz;
        const yBase = (Oy * baseDen + F * sinE * Pz) / baseDen;
        const L = STREAK_SIDE * sl * (1 + STREAK_FRONT * cn + STREAK_BACK * cn * cn);
        const far = (1 - front) * (1 - front);
        const E0k = INK_MAX * (1 - backCool * far);
        const i0 = Math.max(0, Math.floor((bx0 - lineX0) / pitch - 0.25));
        const i1 = Math.min(N - 1, Math.floor((bx1 - lineX0) / pitch + 0.25));
        const dy = clamp((by1 - by0) / 28, 0.5, 3);
        // Big letters have strokes many hairlines wide: one sample column per
        // line is exact enough. Small far ones take two, so a thin stroke
        // never slips between samples as it travels.
        const subs = cell.h * sigma > 8 * pitch ? 1 : 2;
        const cov = sigma / ((subs === 1 ? 1 : 0.5) * pitch);
        for (let i = i0; i <= i1; i++) {
          let n = 0;
          let yb = -Infinity;
          let yt = Infinity;
          for (let sub = 0; sub < subs; sub++) {
            const xs = lineX0 + (i + 0.5 + (subs === 1 ? 0 : sub * 0.5 - 0.25)) * pitch;
            const ddx = (xs - Ox) / Fx;
            for (let y = by0 + dy * 0.5; y < by1; y += dy) {
              const ddy = (y - Oy) / F;
              const wz = ddy / (sinE + kc * ddy);
              const wx = ddx * (1 - kc * wz);
              const rx = wx - Px;
              const rz = wz - Pz;
              const a = (rx * Tx + rz * Tz) / em;
              const b = (rx * Ux + rz * Uz) / (em * hs);
              const s = sampleSdf(cell, cell.ox + a * A, cell.oy - b * A) + bold;
              const cv = clamp(0.5 + s * cov, 0, 1);
              if (cv > 0) {
                n += cv * dy;
                if (cv > 0.5) {
                  if (y > yb) yb = y;
                  if (y < yt) yt = y;
                }
              }
            }
          }
          n /= subs;
          if (n < 0.05 || yb === -Infinity) continue;
          const e0 = E0k * (1 - Math.exp(-Math.pow(n / INK_RHO, INK_GAMMA))) * lineGain[i];
          const eS = E0k * (STEM_K / INK_MAX) * Math.max(0, n - STEM_N) * 0.01 * lineGain[i];
          const yEnd = yBase + L * lineLen[i];
          const span = yEnd - yb;
          if (span < 6 || e0 + eS <= 0) continue;
          // down the streak: e = (e0 + eS)·mix(Tb, T, front) + eS·Ts, row by row
          const cB = (e0 + eS) * (1 - front);
          const cF = (e0 + eS) * front;
          const dU = (ROW_STEP / span) * TN;
          let r = Math.max(rA, Math.floor((yb - rowY0) * invRow - 0.5));
          let t0 = rowY0 + (r + 0.5) * ROW_STEP - yb;
          // the first row is partly above the letter's foot
          let w = clamp(t0 * invRow + 0.5, 0, 1);
          let uu = (t0 > 0 ? t0 / span : 0) * TN;
          for (; r <= rB && uu < TN; r++, uu += dU) {
            if (w > 0) {
              const ui = uu | 0;
              const e = (cB * Tb[ui] + cF * T[ui] + eS * Ts[ui]) * w;
              const k = r * N + i;
              E[k] += e;
              Fw[k] += e * front;
            }
            if (w < 1) {
              t0 += ROW_STEP;
              w = clamp(t0 * invRow + 0.5, 0, 1);
              uu = (t0 > 0 ? t0 / span : 0) * TN - dU;
            }
          }
          // a faint lead above the letter
          r = Math.min(rB, Math.floor((yt - rowY0) * invRow - 0.5));
          for (; r >= rA; r--) {
            const yr = rowY0 + (r + 0.5) * ROW_STEP;
            const t = (yt - yr) * invRow;
            if (t < 0) continue;
            const ti = t | 0;
            if (ti >= 63) break;
            const e = (e0 + eS) * tailT[ti];
            const k = r * N + i;
            E[k] += e;
            Fw[k] += e * front;
          }
        }
      }
      // density = 1 − e^(−energy); A = share from front-half type
      for (let k = rA * N, n = (rB + 1) * N; k < n; k++) {
        const e = E[k];
        if (e <= 0) {
          field[2 * k] = 0;
          field[2 * k + 1] = 255;
          continue;
        }
        const x = e * 256;
        const xi = x | 0;
        field[2 * k] = xi >= 4096 ? 255 : (DENSITY_LUT[xi] + (DENSITY_LUT[xi + 1] - DENSITY_LUT[xi]) * (x - xi) + 0.5) | 0;
        field[2 * k + 1] = ((Fw[k] / e) * 255 + 0.5) | 0;
      }
      g.bindTexture(g.TEXTURE_2D, texV);
      if (texVW !== N || texVH !== R) {
        g.texImage2D(g.TEXTURE_2D, 0, g.LUMINANCE_ALPHA, N, R, 0, g.LUMINANCE_ALPHA, g.UNSIGNED_BYTE, field);
        texVW = N;
        texVH = R;
      } else
        g.texSubImage2D(g.TEXTURE_2D, 0, 0, rA, N, rB - rA + 1, g.LUMINANCE_ALPHA, g.UNSIGNED_BYTE, field.subarray(rA * N * 2, (rB + 1) * N * 2));

      // ── draw ──
      const lw = clamp(num(adv.lineWidth, 60), 0, 100) / 100;
      const lookGap = lw / 0.6;
      const lookVar = 0.3 * lw;
      const lookFlick = clamp(num(adv.flicker, 10), 0, 100) / 100;
      if (needResize) {
        sizeCanvas();
        needResize = false;
      }
      const bw = canvas.width;
      const bh = canvas.height;
      g.viewport(0, 0, bw, bh);
      g.disable(g.BLEND);
      g.useProgram(progFull);
      g.uniform2f(uFull.uRes, bw, bh);
      g.uniform1f(uFull.uPx, bufScale);
      g.uniform2f(uFull.uFrame, W, H);
      g.uniformMatrix3fv(uFull.uToContent, false, m3gl(Minv, toContentGL));
      g.uniform4f(uFull.uGeo, lineX0, rowY0, pitch, ROW_STEP);
      g.uniform2f(uFull.uDim, N, R);
      const bg = parseRgb(p.background || DEFAULT_BACKGROUND, [22, 22, 22]);
      g.uniform3f(uFull.uBg, bg[0] / 255, bg[1] / 255, bg[2] / 255);
      g.uniform4f(uFull.uLook, lookGap, lookVar, lookFlick, time);
      g.uniform4f(
        uFull.uLook2,
        0.4 + clamp(num(adv.backGain, 60), 0, 100) / 100,
        clamp(num(adv.glow, 30), 0, 100) / 100,
        (clamp(num(adv.grain, 50), 0, 100) / 100) * 0.25,
        clamp(num(adv.vignette, 0), 0, 100) / 100
      );
      g.uniform1f(uFull.uSeed, seedV);
      g.activeTexture(g.TEXTURE0);
      g.bindTexture(g.TEXTURE_2D, texV);
      g.uniform1i(uFull.uV, 0);
      g.activeTexture(g.TEXTURE1);
      g.bindTexture(g.TEXTURE_2D, texLut);
      g.uniform1i(uFull.uLut, 1);
      g.activeTexture(g.TEXTURE2);
      g.bindTexture(g.TEXTURE_2D, texGrain);
      g.uniform1i(uFull.uGrain, 2);
      g.bindBuffer(g.ARRAY_BUFFER, bufFull);
      g.enableVertexAttribArray(aFull);
      g.vertexAttribPointer(aFull, 2, g.FLOAT, false, 0, 0);
      g.drawArrays(g.TRIANGLES, 0, 3);
      g.disableVertexAttribArray(aFull);

      if (nv > 0) {
        // far type first
        quadOrder.sort((a, b) => a.z - b.z);
        const sorted = sortedVerts.length >= nv * GV ? sortedVerts : (sortedVerts = new Float32Array(nv * GV * 2));
        let w = 0;
        for (const q of quadOrder) {
          for (let k = 0; k < 6 * GV; k++) sorted[w + k] = glyphVerts[q.o + k];
          w += 6 * GV;
        }
        // content → clip
        m3set(tmpA, 2 / W, 0, -1, 0, -2 / H, 1, 0, 0, 1);
        m3mul(tmpA, M, tmpB);
        g.useProgram(progGlyph);
        g.uniformMatrix3fv(uGlyph.uToClip, false, m3gl(tmpB, toClipGL));
        g.uniform4f(uGlyph.uGly, SPREAD, bold, RIM_SIGMA * clamp(num(adv.rimPx, 2), 0, 8), bufScale);
        g.uniform4f(uGlyph.uGeo, lineX0, rowY0, pitch, ROW_STEP);
        g.uniform2f(uGlyph.uDim, N, R);
        // Off: the curtain's hairlines do not run on across the side letters' faces.
        g.uniform4f(uGlyph.uDot, 0, 0, 0, 0);
        g.uniform4f(uGlyph.uLook, lookGap, lookVar, lookFlick, time);
        g.uniform1f(uGlyph.uSeed, seedV);
        g.uniform2f(uGlyph.uAtlasTexel, 1 / ATLAS_W, 1 / atlas.height);
        g.activeTexture(g.TEXTURE0);
        g.bindTexture(g.TEXTURE_2D, texAtlas);
        g.uniform1i(uGlyph.uAtlas, 0);
        g.activeTexture(g.TEXTURE1);
        g.bindTexture(g.TEXTURE_2D, texLut);
        g.uniform1i(uGlyph.uLut, 1);
        g.activeTexture(g.TEXTURE2);
        g.bindTexture(g.TEXTURE_2D, texV);
        g.uniform1i(uGlyph.uV, 2);
        g.bindBuffer(g.ARRAY_BUFFER, bufGlyph);
        g.bufferData(g.ARRAY_BUFFER, sorted.subarray(0, nv * GV), g.DYNAMIC_DRAW);
        g.enableVertexAttribArray(aGPos);
        g.enableVertexAttribArray(aGUV);
        g.enableVertexAttribArray(aGCell);
        g.enableVertexAttribArray(aGSide);
        g.vertexAttribPointer(aGPos, 3, g.FLOAT, false, GV * 4, 0);
        g.vertexAttribPointer(aGUV, 2, g.FLOAT, false, GV * 4, 12);
        g.vertexAttribPointer(aGCell, 4, g.FLOAT, false, GV * 4, 20);
        g.vertexAttribPointer(aGSide, 1, g.FLOAT, false, GV * 4, 36);
        g.enable(g.BLEND);
        g.blendFunc(g.ONE, g.ONE_MINUS_SRC_ALPHA);
        g.drawArrays(g.TRIANGLES, 0, nv);
        g.disable(g.BLEND);
        g.disableVertexAttribArray(aGPos);
        g.disableVertexAttribArray(aGUV);
        g.disableVertexAttribArray(aGCell);
        g.disableVertexAttribArray(aGSide);
      }
    };

    const animating = () => {
      const p = propsRef.current;
      const reduced = !!(mq && mq.matches);
      const hasType = (typeof p.text === "string" ? p.text : DEFAULT_TEXT).trim() !== "";
      if (!reduced && hasType && num(p.speed, 50) > 0) return true;
      if (ptr.down || dragVel !== 0) return true;
      const tgtOver = ptr.inside ? 1 : 0;
      if (Math.abs(over - tgtOver) > 0.002) return true;
      if (Math.abs(downE - (ptr.down && ptr.inside ? 1 : 0)) > 0.002) return true;
      if (Math.abs(yawE - yawTgt) > 1e-4) return true;
      if (over > 0.002 && Math.abs(ptrCX - ptrTgt) > 0.5) return true;
      return false;
    };

    function tick(now) {
      if (!running) return;
      if (lastTick) {
        const gap = now - lastTick;
        if (gap > 0 && gap < 100) {
          gaps.push(gap);
          if (gaps.length > 15) gaps.shift();
          const s = [...gaps].sort((a, b) => a - b);
          cadence = s[s.length >> 1];
          // whole vsyncs per frame, never below ~57 fps (165 Hz → every 2nd, 120 → 2nd,
          // 90 → every one), with hysteresis so jittery cadences don't flip it
          const x = 17.5 / cadence;
          if (x < divisor - 0.1 || x >= divisor + 1.1) divisor = Math.max(1, Math.floor(x));
        }
      }
      lastTick = now;
      if (!onScreen || !tabVisible) {
        running = false;
        return;
      }
      const active = animating();
      if (!active && !dirty) {
        running = false;
        return;
      }
      const due = lastDraw === 0 || now - lastDraw >= (divisor - 0.5) * cadence;
      if (due) {
        const dt = lastDraw === 0 ? 0 : Math.min(0.05, Math.max(0, (now - lastDraw) / 1000));
        const gapDraw = lastDraw === 0 ? 0 : now - lastDraw;
        lastDraw = now;
        dirty = false;
        draw(dt);
        // ── quality ladder: judged on drawn-frame lateness vs the paced period ──
        if (gapDraw > 0 && active) {
          const target = Math.min(divisor * cadence, 33.4);
          late.push(gapDraw / target);
          if (late.length > 30) late.shift();
          if (now - ladderT > 1000 && late.length >= 20) {
            ladderT = now;
            const s = [...late].sort((a, b) => a - b);
            const med = s[s.length >> 1];
            if (probe && now - probe.at > 1500) {
              if (med > probe.before * 0.87) {
                quality = probe.prev;
                needResize = true;
                banUntil = now + 30000;
              }
              probe = null;
            } else if (!probe && med > 1.3 && quality > 0.6 && now > banUntil) {
              probe = { at: now, before: med, prev: quality };
              quality = Math.max(0.6, quality * 0.85);
              needResize = true;
              late.length = 0;
            } else if (!probe && med < 1.08) {
              if (!goodSince) goodSince = now;
              if (now - goodSince > 4000 && quality < 1 && now > banUntil) {
                quality = Math.min(1, quality / 0.85);
                needResize = true;
                goodSince = now;
              }
            } else goodSince = 0;
          }
        }
      }
      raf = requestAnimationFrame(tick);
    }
    wake();

    return () => {
      stop();
      wakeRef.current = () => {};
      ro.disconnect();
      if (io) io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      root.removeEventListener("pointerenter", onMove);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("pointerdown", onDown);
      root.removeEventListener("pointerup", onUp);
      root.removeEventListener("pointercancel", onUp);
      root.removeEventListener("lostpointercapture", onUp);
      root.removeEventListener("dragstart", noDrag);
      root.removeEventListener("selectstart", noDrag);
      window.removeEventListener("scroll", onScroll, true);
      if (fontsApi && fontsApi.removeEventListener) fontsApi.removeEventListener("loadingdone", onFontsDone);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      const g = gl;
      if (g && !g.isContextLost()) {
        g.deleteProgram(progFull);
        g.deleteProgram(progGlyph);
        g.deleteBuffer(bufFull);
        g.deleteBuffer(bufGlyph);
        g.deleteTexture(texV);
        g.deleteTexture(texLut);
        g.deleteTexture(texGrain);
        g.deleteTexture(texAtlas);
      }
    };
  }, []);

  return (
    <div
      ref={rootRef}
      style={{
        ...style,
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background,
        touchAction: "pan-y",
        cursor: dragOn ? "grab" : undefined,
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}
