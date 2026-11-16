import { useEffect, useMemo, useRef, useState } from "react";

/**
 * MagazineFlip — a corridor of sheets seen at a grazing angle that you walk
 * through with the wheel or a drag. Tap a sheet and it lifts out of the line,
 * turns to face you and fills the frame, and (for a shop) a product panel opens
 * beside it with the title, price, description, specifications and a Buy button.
 *
 * Self-contained: copy this single file into any React (16.8+) project and
 * render <MagazineFlip />. No other packages, CSS or files needed (plain WebGL,
 * no three.js). It fills 100% of its parent and scales the sheets down on small
 * frames, so give the parent a height, e.g.
 *   <div style={{ height: 640 }}><MagazineFlip images={products} /></div>
 *
 * Each entry of `images` is a product:
 *   { src, offsetY?, title?, price?, description?, specs?, buyUrl?, buyLabel? }
 * where specs is a list of [label, value] pairs. `onBuy(item, index)` is called
 * when Buy is pressed (and `buyUrl`, if set, opens in a new tab). `onOpen` and
 * `onClose` fire as a product opens and closes. Missing or broken images fall
 * back to the built-in list, then to a numbered stand-in.
 *
 * Layout: one number (the wheel position) walks the corridor. Panel sizes in px
 * are solved against a fixed camera, so a page measured in px is the same
 * fraction of the frame at any size. The corridor is wrapped on its own length,
 * so it runs forever. Which sheet is under the pointer is answered by drawing
 * the deck again with each sheet's index as its colour and reading one pixel
 * back, so curl, crop and overlap all count.
 */

/* --------------------------------------------------------------- constants */

/** Vertical field of view; a wider one flattens the grazing angle the effect is built on. */
const CAM_FOV = 75;
/** How far back the camera sits, in world units. */
const CAM_Z = 6;
/** World units of frame height visible at z = 0. */
const VIEW_HEIGHT = 2 * CAM_Z * Math.tan((CAM_FOV * Math.PI) / 360);
/** Segments across the sheet, so the bow curves rather than folds. */
const PAGE_SEGMENTS = 40;
/** Most sheets that can exist in the deck. */
const MAX_PAGES = 60;
/** A sheet's thickness as a fraction of its width. */
const THICKNESS_RATIO = 0.005;
/** ±this is the picture's own leading or trailing edge flush with the sheet. */
const OFFSET_RANGE = 250;
/** Atlas cells are square powers of two and capped, so a long list stays in one texture. */
const CELL_MAX = 512;
const ATLAS_MAX = 4096;

const PLACEHOLDER_ASPECTS = [0.72, 1.5, 0.78, 1.33, 1.0, 1.62, 0.68, 1.2, 0.86, 1.45];
const PLACEHOLDER_COUNT = 10;

/** How dark the corridor goes behind a sheet that is being held up. */
const CORRIDOR_DIM = 0.22;
/** A pointer that travels further than this (px), or is held longer (ms), was not a tap. */
const TAP_SLOP = 6;
const TAP_MS = 600;
/** The ID buffer is the whole frame, redrawn at up to this on its long side.
 * Hover and tap share it, so the card that lights up is the card that opens. */
const PICK_MAX = 900;
/** The sheet under the pointer is re-checked at most this often, in ms. */
const HOVER_MS = 70;

/** Product panel: width on wide frames, and the share of the frame it takes on narrow ones. */
const PANEL_MARGIN = 16;

const UNSPLASH = (id) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=80`;

// Built-in fallback pictures: used for any entry that is empty or fails to load.
const FALLBACK_IMAGES = [
  "1506744038136-46273834b3fb",
  "1469474968028-56623f02e42e",
  "1441974231531-c6227db76b6e",
  "1470071459604-3b5ec3a7fe05",
  "1501785888041-af3ef285b470",
  "1472214103451-9374bd1c798e",
  "1465146344425-f00d5f5c8f07",
  "1447752875215-b2761acb3c5d",
].map((id) => UNSPLASH(id));

/** Sample products, so the component is a working shop display out of the box.
 * Replace `src`, the text and `buyUrl` with your own. */
export const DEFAULT_PRODUCTS = [
  {
    src: UNSPLASH("1542291026-7eec264c27ff"),
    title: "Aero Run Sneakers",
    price: "$129",
    description: "Lightweight everyday runner with a responsive foam midsole and a breathable recycled-mesh upper.",
    specs: [["Material", "Recycled mesh"], ["Weight", "240 g"], ["Drop", "8 mm"], ["Colour", "Crimson"]],
    buyUrl: "https://example.com/shop/aero-run",
  },
  {
    src: UNSPLASH("1523275335684-37898b6baf30"),
    title: "Meridian Watch",
    price: "$249",
    description: "A clean analogue watch with a sapphire-coated crystal and a stainless steel case.",
    specs: [["Case", "40 mm steel"], ["Movement", "Quartz"], ["Water resistance", "50 m"], ["Strap", "Leather"]],
    buyUrl: "https://example.com/shop/meridian-watch",
  },
  {
    src: UNSPLASH("1505740420928-5e560c06d30e"),
    title: "Studio Headphones",
    price: "$199",
    description: "Over-ear wireless headphones with active noise cancelling and a long-life battery.",
    specs: [["Battery", "40 hours"], ["Connection", "Bluetooth 5.3"], ["Weight", "260 g"], ["Noise cancelling", "Active"]],
    buyUrl: "https://example.com/shop/studio-headphones",
  },
  {
    src: UNSPLASH("1572635196237-14b3f281503f"),
    title: "Aviator Sunglasses",
    price: "$89",
    description: "Polarised aviators in a lightweight metal frame with full UV400 protection.",
    specs: [["Lens", "Polarised"], ["UV protection", "UV400"], ["Frame", "Metal"], ["Fit", "Medium"]],
    buyUrl: "https://example.com/shop/aviator-sunglasses",
  },
  {
    src: UNSPLASH("1526170375885-4d8ecf77b99f"),
    title: "Mirrorless Camera",
    price: "$899",
    description: "A compact mirrorless body with fast autofocus, built for travel and everyday shooting.",
    specs: [["Sensor", "24 MP APS-C"], ["Video", "4K 30p"], ["Weight", "410 g"], ["Mount", "E-mount"]],
    buyUrl: "https://example.com/shop/mirrorless-camera",
  },
  {
    src: UNSPLASH("1553062407-98eeb64c6a62"),
    title: "Trail Backpack",
    price: "$119",
    description: "A 28-litre daypack with a padded laptop sleeve, rain cover and ventilated back panel.",
    specs: [["Capacity", "28 L"], ["Material", "Ripstop nylon"], ["Laptop sleeve", "Up to 15\""], ["Weight", "850 g"]],
    buyUrl: "https://example.com/shop/trail-backpack",
  },
  {
    src: UNSPLASH("1585386959984-a4155224a1ad"),
    title: "Eau de Parfum",
    price: "$75",
    description: "A warm, woody fragrance with notes of amber, cedar and bergamot.",
    specs: [["Volume", "50 ml"], ["Concentration", "Eau de parfum"], ["Notes", "Amber, cedar"], ["Longevity", "8 hours"]],
    buyUrl: "https://example.com/shop/eau-de-parfum",
  },
  {
    src: UNSPLASH("1546868871-7041f2a55e12"),
    title: "Smart Watch",
    price: "$329",
    description: "A fitness-first smartwatch with GPS, heart-rate tracking and a bright always-on display.",
    specs: [["Display", "1.4\" AMOLED"], ["Battery", "7 days"], ["GPS", "Built in"], ["Water resistance", "5 ATM"]],
    buyUrl: "https://example.com/shop/smart-watch",
  },
];

/* ----------------------------------------------------------------- helpers */

function clamp(v, lo, hi, fallback) {
  const n = typeof v === "number" && isFinite(v) ? v : fallback;
  return Math.max(lo, Math.min(hi, n));
}

function hexToRgb(hex) {
  let h = String(hex || "").replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  if (Number.isNaN(n) || h.length !== 6) return [1, 1, 1];
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** A link from your own data: only web and mail links are allowed through. */
function safeUrl(url) {
  if (typeof url !== "string") return "";
  const u = url.trim();
  if (!u) return "";
  if (/^(https?:|mailto:|tel:|\/|#|\.)/i.test(u)) return u;
  return /^[a-z][a-z0-9+.-]*:/i.test(u) ? "" : u;
}

function normSpecs(specs) {
  if (!Array.isArray(specs)) return [];
  return specs
    .map((s) =>
      Array.isArray(s)
        ? [String(s[0] ?? ""), String(s[1] ?? "")]
        : s && typeof s === "object"
          ? [String(s.label ?? ""), String(s.value ?? "")]
          : ["", ""]
    )
    .filter((s) => s[0] || s[1]);
}

/** One entry of `images`, in any of its accepted shapes. */
function itemOf(entry) {
  const base = entry && typeof entry === "object" ? entry : {};
  const image = typeof entry === "string" ? entry : (base.image ?? base.src ?? "");
  const src = typeof image === "string" ? image : (image?.src ?? "");
  const off = Number(base.offsetY);
  return {
    src,
    offsetY: isFinite(off) ? off : 0,
    title: String(base.title ?? ""),
    price: String(base.price ?? ""),
    description: String(base.description ?? ""),
    specs: normSpecs(base.specs),
    buyUrl: safeUrl(base.buyUrl),
    buyLabel: typeof base.buyLabel === "string" ? base.buyLabel : "",
  };
}

/** power2.inOut: what the tap blend is eased with. */
function power2InOut(t) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

const nextPow2 = (n) => {
  let p = 1;
  while (p < n) p *= 2;
  return p;
};
const prevPow2 = (n) => {
  let p = 1;
  while (p * 2 <= n) p *= 2;
  return p;
};

/**
 * Where the product panel sits for a frame of this size: beside the picture on
 * wide frames, under it on narrow ones. Used by both the scene (to move the
 * held-up sheet out of the way) and the panel itself.
 */
function panelGeometry(w, h, enabled) {
  if (!enabled) return { mode: "none", size: 0 };
  if (w >= 720 && w / h >= 1.15) {
    return { mode: "right", size: Math.min(400, Math.max(300, w * 0.36)) };
  }
  return { mode: "bottom", size: Math.round(h * 0.52) };
}

/**
 * Panel values are abstract scales; the shader wants world units. Every mapping
 * lands its default on a sensible number, so a default instance looks right and
 * the sliders open out from there.
 */
function settingsFor(cfg, viewWidthPx, viewHeightPx) {
  const worldPerPx = VIEW_HEIGHT / Math.max(1, viewHeightPx);
  const viewAspect = Math.max(1, viewWidthPx) / Math.max(1, viewHeightPx);
  const rawW = clamp(cfg.pageWidth, 40, 1200, 600);
  const rawH = clamp(cfg.pageHeight, 40, 1600, 500);
  // Sheets shrink to fit small frames, so a phone shows the same composition.
  const fit = Math.min(1, (viewHeightPx * 0.8) / rawH);
  const pageWidthPx = rawW * fit;
  const pageHeightPx = rawH * fit;
  const pageWidth = pageWidthPx * worldPerPx;
  const pageHeight = pageHeightPx * worldPerPx;
  const spacing = clamp(cfg.spacing, 0, 10, 5);
  const smoothing = clamp(cfg.smoothing, 0, 10, 5);
  const wave = clamp(cfg.wave, 0, 10, 5);
  const drift = clamp(cfg.drift, -10, 10, 2);

  // Where a held-up sheet sits: in front of the corridor, but never so close to
  // the camera that it clips.
  const focusZ = Math.min(CAM_Z * 0.55, pageWidth * 0.75);
  // The frame, measured on that plane rather than at the origin.
  const planeHeight = (VIEW_HEIGHT * (CAM_Z - focusZ)) / CAM_Z;
  const planeWidth = planeHeight * viewAspect;
  const fill = 0.6 + clamp(cfg.zoom, 0, 10, 5) * 0.04;

  // The region of the frame the held-up sheet is fitted into: all of it, or the
  // part not covered by the product panel.
  const panel = panelGeometry(viewWidthPx, viewHeightPx, cfg.showDetails && cfg.tap);
  let rx0 = 0;
  let ry0 = 0;
  let rx1 = 1;
  let ry1 = 1;
  if (panel.mode === "right") rx1 = Math.max(0.2, (viewWidthPx - panel.size - PANEL_MARGIN * 1.5) / viewWidthPx);
  if (panel.mode === "bottom") ry1 = Math.max(0.2, (viewHeightPx - panel.size - PANEL_MARGIN) / viewHeightPx);
  const rw = rx1 - rx0;
  const rh = ry1 - ry0;

  return {
    pageWidth,
    pageHeight,
    pageWidthPx,
    pageHeightPx,
    worldPerPx,
    pages: Math.round(clamp(cfg.pages, 4, MAX_PAGES, 20)),
    // Proportional to the sheet: the deck holds its composition when Page Width moves.
    pageSpacing: pageWidth * (0.1 + spacing * 0.08),
    thickness: pageWidth * THICKNESS_RATIO,
    tilt: (clamp(cfg.tilt, -45, 45, 0) * Math.PI) / 180,
    turn: (clamp(cfg.turn, -60, 60, 0) * Math.PI) / 180,
    wave: pageWidth * 0.04 * wave,
    // Geometric, so the top of the slider reaches a genuinely heavy corridor.
    lerp: 0.35 * Math.pow(0.82, smoothing),
    driftPerSecond: drift * pageWidth * 0.15,
    wheel: 0.4 + clamp(cfg.scrollSens, 0, 10, 5) * 0.16,
    tapToView: cfg.tap !== false,
    focusZ,
    focusX: ((rx0 + rx1) / 2 - 0.5) * planeWidth,
    focusY: -((ry0 + ry1) / 2 - 0.5) * planeHeight,
    // Whichever of the two axes runs out first, so a landscape page in a tall
    // region is held at the region's width and a portrait one at its height.
    focusScale: Math.min(
      (planeHeight * rh * fill) / pageHeight,
      (planeWidth * rw * fill) / pageWidth
    ),
    // Seconds out of the line, and the same back.
    viewDuration: 1.6 - clamp(cfg.openSpeed, 0, 10, 5) * 0.13,
  };
}

/* ------------------------------------------------------------------ shader */

const PAGE_VERTEX = `
attribute vec3 position;
attribute vec2 uv;

uniform mat4 uProj;
uniform float uIndex;
uniform float uPageThickness;
uniform float uPageWidth;
uniform float uPageHeight;
uniform float uMeshCount;
uniform float uPageSpacing;
uniform float uScrollY;
uniform float uSpeedY;
uniform float uWave;
uniform float uTilt;
uniform float uTurn;
uniform float uFocusIndex;
uniform float uFocusProgress;
uniform float uFocusScale;
uniform float uFocusZ;
uniform vec2 uFocusXY;
uniform float uHoverIndex;
uniform float uHoverMix;

varying vec2 vUv;
varying float vDim;
varying float vHover;
varying float vOther;

const float HALF_TURN = 3.14159265359;

mat3 rotY(float a) {
    return mat3(cos(a), 0.0, sin(a), 0.0, 1.0, 0.0, -sin(a), 0.0, cos(a));
}

mat3 rotX(float a) {
    return mat3(1.0, 0.0, 0.0, 0.0, cos(a), -sin(a), 0.0, sin(a), cos(a));
}

void main() {
    float PI = HALF_TURN;
    float aIndex = uIndex;

    // The geometry is a unit box and the sheet's size arrives as uniforms, so a
    // Page Width drag is a uniform write rather than a geometry rebuild.
    vec3 basePos = vec3(
        position.x * uPageWidth,
        position.y * uPageHeight,
        position.z * uPageThickness
    );

    // Sheets turn about the spine (the left edge). It is also the pivot the tap
    // blend walks away from.
    vec3 rotationCenter = vec3(-uPageWidth * 0.5, 0.0, 0.0);

    float fromMiddle = aIndex - (uMeshCount - 1.0) * 0.5;

    // The resting pose: the same pair of angles on every sheet. Tilt and Turn
    // are measured from it: at 0 you get the grazing three-quarter view, and
    // positive Turn swings the sheets round to face you.
    float yAngle = -PI * 0.5 + uTurn;
    float xAngle = uTilt;

    // The corridor is walked in the sheet's own Z, before the rotation.
    // Wrapping is done on the sheet's centre and applied as one offset to all of
    // its vertices, or a sheet would tear in half as it crossed the seam.
    float boxCenterZ = uPageSpacing * (-fromMiddle);
    float maxZ = uMeshCount * (uPageSpacing + uPageThickness) * 0.5;

    // Bow along the sheet's own height, scaled by how fast the corridor moves.
    float bow = sin((position.y + 0.5) * 2.0) * uWave;
    float speed = clamp(uSpeedY / uPageWidth * 4.0, -2.0, 2.0);

    float zCorridor = mod(boxCenterZ - uScrollY + maxZ, 2.0 * maxZ) - maxZ
        - bow * speed;

    // --- tap to view: 1 only on the sheet being held up.
    float focused = step(abs(aIndex - uFocusIndex), 0.5);
    float e = focused * uFocusProgress;

    // Rigid at every point of the blend: the pivot walks from the spine to the
    // sheet's own centre, both angles unwind to zero, its place in the corridor
    // fades, and it grows. It turns and travels, it never stretches.
    // Hover: the sheet under the pointer swells a little; with one hovered, the
    // rest step back. Neither applies once a sheet is being held up.
    float hovered = step(abs(aIndex - uHoverIndex), 0.5);
    float hov = hovered * uHoverMix * (1.0 - uFocusProgress);
    float k = mix(1.0, uFocusScale, e) * (1.0 + 0.045 * hov);
    vec3 pivot = rotationCenter * (1.0 - e);

    vec3 vertexLocal = basePos * k - pivot;
    vertexLocal.z += zCorridor * (1.0 - e);

    vec3 rotated = rotY(yAngle * (1.0 - e)) * vertexLocal + pivot;
    // Half a page back along Z and half a page along X, so the corridor stands
    // centred on the origin rather than hanging off its spine.
    rotated.z -= uPageWidth * 0.5 * (1.0 - e);
    rotated.x += uPageWidth * 0.5 * (1.0 - e);

    vec3 newPosition = rotX(xAngle * (1.0 - e)) * rotated;
    newPosition.z += uFocusZ * e;
    newPosition.xy += uFocusXY * e;

    gl_Position = uProj * vec4(newPosition - vec3(0.0, 0.0, ${CAM_Z.toFixed(1)}), 1.0);

    vUv = uv;
    // Everything but the sheet being held up steps back into the dark.
    vDim = uFocusProgress * (1.0 - focused);
    vHover = hov;
    vOther = uHoverMix * (1.0 - hovered) * (1.0 - uFocusProgress);
}
`;

const PAGE_FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform sampler2D uAtlas;
uniform float uPageAspect;
uniform float uIndex;
uniform vec4 uRect;
uniform float uAspect;
uniform float uOffset;
uniform float uPick;
uniform vec3 uHoverColor;

varying vec2 vUv;
varying float vDim;
varying float vHover;
varying float vOther;

void main() {
    // The picking pass: the sheet's index as a colour, offset by one so that
    // nothing at all reads back as zero.
    if (uPick > 0.5) {
        gl_FragColor = vec4((uIndex + 1.0) / 255.0, 0.0, 0.0, 1.0);
        return;
    }

    // Cover, on the picture's own aspect: the sheet crops the overflow instead
    // of squeezing the photograph into the page's proportions. Exactly one axis
    // overflows, and Offset slides the picture through it.
    vec2 uv = vUv;
    float s = uAspect / uPageAspect;
    float band = min(s, 1.0 / s);
    float slack = (1.0 - band) * 0.5;
    float slide = clamp(uOffset, -1.0, 1.0) * slack;
    if (s >= 1.0) {
        uv.x = (uv.x - 0.5) * band + 0.5 - slide;
    } else {
        uv.y = (uv.y - 0.5) * band + 0.5 + slide;
    }

    // The cell's rect is stored inset by a texel, so a sheet's edge never picks
    // up its neighbour in the atlas.
    vec2 atlasUv = mix(uRect.xy, uRect.zw, clamp(uv, 0.0, 1.0));
    vec4 color = texture2D(uAtlas, atlasUv);

    // Darkened, not faded: alpha would put see-through sheets into the depth
    // buffer ahead of solid ones.
    vec3 rgb = color.rgb * mix(1.0, ${CORRIDOR_DIM.toFixed(2)}, vDim);

    // Hover: the card under the pointer brightens and gets a thin outline in the
    // highlight colour; the others fall back, so the one that will open is clear.
    float border = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
    float edge = 1.0 - smoothstep(0.0, 0.014, border);
    rgb *= 1.0 + 0.12 * vHover;
    rgb = mix(rgb, uHoverColor, edge * vHover);
    rgb *= 1.0 - 0.34 * vOther;
    gl_FragColor = vec4(rgb * color.a, color.a);
}
`;

/* ---------------------------------------------------------------- geometry */

/** A unit box: front and back faces on a PAGE_SEGMENTS grid, plus thin edges. */
function buildBox() {
  const verts = [];
  const idx = [];
  const grid = (fn, gx, gy) => {
    const base = verts.length / 5;
    for (let iy = 0; iy <= gy; iy++) {
      for (let ix = 0; ix <= gx; ix++) {
        verts.push(...fn(ix / gx, 1 - iy / gy));
      }
    }
    for (let iy = 0; iy < gy; iy++) {
      for (let ix = 0; ix < gx; ix++) {
        const a = base + iy * (gx + 1) + ix;
        const b = a + 1;
        const c = a + gx + 1;
        const d = c + 1;
        idx.push(a, c, b, c, d, b);
      }
    }
  };
  const S = PAGE_SEGMENTS;
  grid((u, v) => [u - 0.5, v - 0.5, 0.5, u, v], S, S); // front
  grid((u, v) => [0.5 - u, v - 0.5, -0.5, u, v], S, S); // back, u runs the other way
  grid((u, v) => [-0.5, v - 0.5, u - 0.5, 0, v], 1, S); // left edge
  grid((u, v) => [0.5, v - 0.5, u - 0.5, 1, v], 1, S); // right edge
  grid((u) => [u - 0.5, 0.5, 0, u, 1], S, 1); // top edge
  grid((u) => [u - 0.5, -0.5, 0, u, 0], S, 1); // bottom edge
  return { verts: new Float32Array(verts), idx: new Uint16Array(idx) };
}

/* ------------------------------------------------------------------- atlas */

/** One decoded image per URL per document, shared by every instance. */
const imageCache = new Map();
const imagePending = new Map();

function loadImage(url) {
  if (imageCache.has(url)) return Promise.resolve(imageCache.get(url) ?? null);
  const pending = imagePending.get(url);
  if (pending) return pending;
  const p = new Promise((resolve) => {
    const img = new window.Image();
    // Without this the atlas canvas is tainted the moment a cross-origin
    // picture lands on it and the texture upload throws.
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageCache.set(url, img);
      resolve(img);
    };
    img.onerror = () => {
      imageCache.set(url, null);
      resolve(null);
    };
    img.src = url;
  });
  imagePending.set(url, p);
  return p;
}

/**
 * Some hosts serve a picture but send no Access-Control-Allow-Origin header.
 * WebGL has to read the pixels, so the browser refuses those outright. When the
 * direct load fails, the URL is retried through this proxy, which fetches the
 * picture server-side and serves it back with the header. Pass a different
 * template (with {url}) as the `imageProxy` prop, or "" to switch it off and
 * fall back to a built-in picture instead. Your image addresses are sent to
 * whichever proxy you name, so for a shop prefer hosting the pictures yourself
 * or pointing this at your own proxy route.
 */
const DEFAULT_IMAGE_PROXY = "https://images.weserv.nl/?url={url}";

function proxied(url, template) {
  if (!template || !url) return "";
  // Already proxied, a data: URI or a same-origin path: nothing to route.
  if (/^(data:|blob:)/i.test(url)) return "";
  if (!/^https?:\/\//i.test(url)) return "";
  if (template.indexOf(url) >= 0) return "";
  return template.replace("{url}", encodeURIComponent(url));
}

/** Whether a decoded picture can actually be drawn into a canvas we then read.
 * A host that sends no CORS header taints it, and the atlas upload would throw.
 * Tested per picture, so one bad host costs that slot only. */
let taintScratch = null;
function canUseImage(img) {
  try {
    if (!taintScratch) {
      taintScratch = document.createElement("canvas");
      taintScratch.width = 1;
      taintScratch.height = 1;
    }
    const ctx = taintScratch.getContext("2d", { willReadFrequently: true });
    if (!ctx) return false;
    ctx.clearRect(0, 0, 1, 1);
    ctx.drawImage(img, 0, 0, 1, 1);
    ctx.getImageData(0, 0, 1, 1);
    return true;
  } catch {
    console.warn(
      "MagazineFlip: this picture's host sends no CORS header, so it is being retried through the image proxy — " +
        (img?.src || "")
    );
    return false;
  }
}

/** The entry's own picture, else a built-in one, else null (a numbered stand-in). */
async function loadWithFallback(src, i, proxy) {
  const tries = [
    src,
    proxied(src, proxy),
    FALLBACK_IMAGES[i % FALLBACK_IMAGES.length],
  ].filter((s, idx, a) => s && a.indexOf(s) === idx);
  for (const url of tries) {
    const img = await loadImage(url);
    if (img && canUseImage(img)) return img;
  }
  return null;
}

function drawPlaceholder(ctx, index, x, y, w, h) {
  const hue = (index * 47) % 360;
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, `hsl(${hue}, 22%, 27%)`);
  grad.addColorStop(0.55, `hsl(${hue}, 18%, 13%)`);
  grad.addColorStop(1, `hsl(${(hue + 40) % 360}, 24%, 23%)`);
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = Math.max(1, Math.round(w * 0.008));
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.fillStyle = "rgba(255,255,255,0.68)";
  ctx.font = `500 ${Math.round(Math.min(w, h) * 0.26)}px ui-sans-serif, system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(index + 1).padStart(2, "0"), x + w / 2, y + h / 2);
}

/**
 * Draw every picture into one canvas of square cells and return it with each
 * picture's rect and aspect. The canvas is a power of two so WebGL1 can mipmap
 * it, which is what makes sheets seen almost edge-on look clean.
 */
async function buildAtlas(sources, proxy) {
  const n = Math.max(1, sources.length);
  const images = await Promise.all(sources.map((src, i) => loadWithFallback(src, i, proxy)));

  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  const cell = Math.min(CELL_MAX, prevPow2(Math.floor(ATLAS_MAX / Math.max(cols, rows))));
  const canvas = document.createElement("canvas");
  canvas.width = nextPow2(cols * cell);
  canvas.height = nextPow2(rows * cell);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const paint = (useImages) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cells = [];
    for (let i = 0; i < n; i++) {
      const cx = (i % cols) * cell;
      const cy = Math.floor(i / cols) * cell;
      const img = useImages ? images[i] : null;
      const aspect =
        img && img.naturalHeight > 0
          ? img.naturalWidth / img.naturalHeight
          : PLACEHOLDER_ASPECTS[i % PLACEHOLDER_ASPECTS.length];
      // Contained, never stretched: the cell holds the whole picture on its own
      // proportions and the shader crops from there.
      const w = aspect >= 1 ? cell : cell * aspect;
      const h = aspect >= 1 ? cell / aspect : cell;
      const dx = cx + (cell - w) / 2;
      const dy = cy + (cell - h) / 2;
      if (img) ctx.drawImage(img, dx, dy, w, h);
      else drawPlaceholder(ctx, i, dx, dy, w, h);

      // A texel of inset on every side: mipmaps average across cell borders
      // otherwise, and a sheet seen at a grazing angle is deep in the mip chain.
      const u0 = (dx + 1) / canvas.width;
      const u1 = (dx + w - 1) / canvas.width;
      const vTop = 1 - (dy + 1) / canvas.height;
      const vBottom = 1 - (dy + h - 1) / canvas.height;
      cells.push({ rect: [u0, vBottom, u1, vTop], aspect });
    }
    return cells;
  };

  // Every picture was checked before it got here, so the canvas is clean and
  // one unusable host costs its own slot rather than the whole deck.
  const cells = paint(true);
  return { canvas, cells };
}

/* ------------------------------------------------------------------- scene */

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
    console.warn("MagazineFlip shader:", gl.getShaderInfoLog(s));
  return s;
}

/** Column-major perspective matrix. */
function perspective(out, fovDeg, aspect, near, far) {
  const f = 1 / Math.tan((fovDeg * Math.PI) / 360);
  out.fill(0);
  out[0] = f / aspect;
  out[5] = f;
  out[10] = (far + near) / (near - far);
  out[11] = -1;
  out[14] = (2 * far * near) / (near - far);
}

const FLOAT_UNIFORMS = [
  "uPageThickness", "uPageWidth", "uPageHeight", "uMeshCount", "uPageSpacing",
  "uScrollY", "uSpeedY", "uWave", "uTilt", "uTurn", "uFocusIndex",
  "uFocusProgress", "uFocusScale", "uFocusZ", "uPageAspect", "uHoverIndex",
  "uHoverMix",
];

class MagazineScene {
  constructor(host, canvas, cfg, hooks) {
    this.host = host;
    this.canvas = canvas;
    this.cfg = cfg;
    this.hooks = hooks;
    this.width = 1;
    this.height = 1;
    this.dpr = 1;
    this.frameId = 0;
    this.lastT = 0;
    this.disposed = false;
    this.atlasToken = 0;
    this.atlasKey = "";
    this.atlasTex = null;
    this.settingsCache = null;
    this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    // Where the input has pushed the corridor, and the eased value it rides.
    this.scroll = { target: 0, current: 0, speed: 0 };
    this.drag = { active: false, lastX: 0, id: -1 };
    // Which sheet is being held up, how far out of the line it has travelled,
    // and which way it is going. `index` outlives `target` reaching 0, because
    // the sheet keeps its identity all the way back into the corridor.
    this.focus = { index: -1, t: 0, target: 0 };
    // Where the pointer went down, and which sheet was under it at that moment:
    // the corridor is still drifting, so by the time a press is let go the sheet
    // the user aimed at is no longer at those coordinates.
    this.tap = { x: 0, y: 0, at: 0, id: -1, hit: -1 };
    // The pointer, and which sheet it is over. `index` outlives `target` going
    // to -1 so the card can fade back out instead of snapping.
    this.pointer = { x: 0, y: 0, over: false, moved: false };
    this.hover = { index: -1, mix: 0, target: -1, lastAt: 0, lastScroll: 0 };

    const gl = canvas.getContext("webgl", {
      antialias: true,
      alpha: true,
      premultipliedAlpha: true,
    });
    if (!gl) throw new Error("no webgl");
    this.gl = gl;

    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, PAGE_VERTEX));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, PAGE_FRAGMENT));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn("MagazineFlip link:", gl.getProgramInfoLog(prog));
      throw new Error("link failed");
    }
    gl.useProgram(prog);
    this.prog = prog;
    this.loc = {};
    for (const n of [
      ...FLOAT_UNIFORMS, "uProj", "uIndex", "uFocusXY", "uRect", "uAspect",
      "uOffset", "uPick", "uAtlas", "uHoverColor",
    ]) {
      this.loc[n] = gl.getUniformLocation(prog, n);
    }
    gl.uniform1i(this.loc.uAtlas, 0);

    // Geometry, built once: the sheet's real size is applied in the vertex shader.
    const box = buildBox();
    this.indexCount = box.idx.length;
    this.vbuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbuf);
    gl.bufferData(gl.ARRAY_BUFFER, box.verts, gl.STATIC_DRAW);
    this.ibuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, box.idx, gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "position");
    const aUv = gl.getAttribLocation(prog, "uv");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 20, 0);
    gl.enableVertexAttribArray(aUv);
    gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 20, 12);

    // A neutral 1x1 to draw with while the real atlas is still decoding.
    this.blank = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.blank);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
      new Uint8Array([46, 46, 48, 255])
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.CULL_FACE); // both faces of a sheet can be seen
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    // Per-sheet data, written once and read at draw time.
    this.rects = new Float32Array(MAX_PAGES * 4);
    this.aspects = new Float32Array(MAX_PAGES).fill(1);
    this.offsets = new Float32Array(MAX_PAGES);
    for (let i = 0; i < MAX_PAGES; i++) this.rects.set([0, 0, 1, 1], i * 4);

    this.u = { uWave: 0.4, uPageAspect: 1 };
    for (const n of FLOAT_UNIFORMS) if (!(n in this.u)) this.u[n] = 0;
    this.u.uFocusIndex = -1;
    this.u.uFocusXY = [0, 0];
    this.u.uHoverIndex = -1;
    this.u.uHoverColor = [1, 1, 1];
    this.proj = new Float32Array(16);

    // The ID buffer for picking, sized on demand.
    this.pickFbo = null;
    this.pickTex = null;
    this.pickDepth = null;
    this.pickW = 0;
    this.pickH = 0;
    this.pickBuf = new Uint8Array(4);

    this.applyConfig();
    this.loadAtlas();
  }

  settings() {
    if (!this.settingsCache) {
      this.settingsCache = settingsFor(this.cfg, this.width, this.height);
    }
    return this.settingsCache;
  }

  /* ---- everything the panel owns is a uniform or a per-sheet value ---- */

  applyConfig() {
    const S = this.settings();
    const u = this.u;
    u.uMeshCount = S.pages;
    u.uPageWidth = S.pageWidth;
    u.uPageHeight = S.pageHeight;
    u.uPageThickness = S.thickness;
    u.uPageSpacing = S.pageSpacing;
    u.uWave = S.wave;
    u.uTilt = S.tilt;
    u.uTurn = S.turn;
    u.uPageAspect = S.pageWidthPx / S.pageHeightPx;
    u.uFocusScale = S.focusScale;
    u.uFocusZ = S.focusZ;
    u.uFocusXY = [S.focusX, S.focusY];
    u.uHoverColor = hexToRgb(this.cfg.hoverColor);
    this.writeOffsets();
    // A sheet that has just been configured out of existence cannot be left held
    // up with nothing to put it back.
    if (this.focus.index >= S.pages || !S.tapToView) this.clearFocus();
  }

  clearFocus() {
    const had = this.focus.index >= 0 && this.focus.target === 1;
    this.focus.index = -1;
    this.focus.t = 0;
    this.focus.target = 0;
    this.u.uFocusIndex = -1;
    this.u.uFocusProgress = 0;
    if (had) this.hooks.onClose?.();
  }

  /** Offsets are read where the picture is drawn, so dragging one re-frames
   * every sheet already on screen. Normalised to ±1: what the panel calls 250
   * is the end of the picture, not 250 of anything. */
  writeOffsets() {
    const list = this.cfg.items;
    const count = Math.max(1, list.length);
    for (let i = 0; i < MAX_PAGES; i++) {
      const item = list.length ? list[i % count] : null;
      this.offsets[i] = item ? clamp(item.offsetY, -OFFSET_RANGE, OFFSET_RANGE, 0) / OFFSET_RANGE : 0;
    }
  }

  /** Which picture each sheet shows: the list, repeated across the deck. */
  writeCells() {
    const cells = this.atlas?.cells;
    if (!cells || !cells.length) return;
    for (let i = 0; i < MAX_PAGES; i++) {
      const c = cells[i % cells.length];
      this.rects.set(c.rect, i * 4);
      this.aspects[i] = c.aspect;
    }
  }

  sourceList() {
    const list = this.cfg.items;
    if (list && list.length) return list.map((item) => item.src);
    return Array.from({ length: PLACEHOLDER_COUNT }, () => "");
  }

  loadAtlas() {
    const sources = this.sourceList();
    const key = `${this.cfg.imageProxy}::${sources.join("|")}`;
    // Keyed on the list, not on whether the build has landed: a config change
    // that arrives while pictures are still decoding must not start a second build.
    if (key === this.atlasKey) return;
    this.atlasKey = key;
    const token = ++this.atlasToken;
    buildAtlas(sources, this.cfg.imageProxy)
      .then((atlas) => {
        if (this.disposed || token !== this.atlasToken || !atlas) return;
        const gl = this.gl;
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        // The rects assume v runs up, so the canvas is uploaded flipped.
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas.canvas);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.generateMipmap(gl.TEXTURE_2D);
        // The point of this component is sheets seen almost edge-on, which is
        // exactly what trilinear filtering alone blurs to mush.
        const ext = gl.getExtension("EXT_texture_filter_anisotropic");
        if (ext) {
          const max = gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
          gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, max));
        }
        if (this.atlasTex) gl.deleteTexture(this.atlasTex);
        this.atlasTex = tex;
        this.atlas = atlas;
        this.writeCells();
      })
      .catch(() => {});
  }

  /* ------------------------------------------------------------- draw ---- */

  applyUniforms() {
    const gl = this.gl;
    const L = this.loc;
    for (const n of FLOAT_UNIFORMS) gl.uniform1f(L[n], this.u[n]);
    gl.uniform2f(L.uFocusXY, this.u.uFocusXY[0], this.u.uFocusXY[1]);
    gl.uniform3f(L.uHoverColor, this.u.uHoverColor[0], this.u.uHoverColor[1], this.u.uHoverColor[2]);
    gl.uniformMatrix4fv(L.uProj, false, this.proj);
  }

  drawPages(pick) {
    const gl = this.gl;
    const L = this.loc;
    const n = this.settings().pages;
    gl.uniform1f(L.uPick, pick ? 1 : 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.atlasTex || this.blank);
    for (let i = 0; i < n; i++) {
      gl.uniform1f(L.uIndex, i);
      gl.uniform4f(
        L.uRect,
        this.rects[i * 4], this.rects[i * 4 + 1], this.rects[i * 4 + 2], this.rects[i * 4 + 3]
      );
      gl.uniform1f(L.uAspect, this.aspects[i]);
      gl.uniform1f(L.uOffset, this.offsets[i]);
      gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);
    }
  }

  /* ------------------------------------------------------------- pick ---- */

  ensurePick(w, h) {
    const gl = this.gl;
    if (this.pickFbo && this.pickW === w && this.pickH === h) return;
    if (this.pickFbo) {
      gl.deleteFramebuffer(this.pickFbo);
      gl.deleteTexture(this.pickTex);
      gl.deleteRenderbuffer(this.pickDepth);
    }
    this.pickTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.pickTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.pickDepth = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.pickDepth);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h);
    this.pickFbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.pickFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.pickTex, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.pickDepth);
    this.pickW = w;
    this.pickH = h;
  }

  /**
   * Which sheet is drawn at a point, answered by drawing it: the deck is
   * re-rendered through the same vertex shader with each sheet's index written
   * out as a colour, and the pixel under the pointer is read back.
   */
  pick(clientX, clientY) {
    const rect = this.host.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return -1;
    // Normalised against the box that is actually on screen, so a browser or CSS
    // zoom above the frame cannot slide every hit sideways.
    const u = (clientX - rect.left) / rect.width;
    const v = (clientY - rect.top) / rect.height;
    if (u < 0 || v < 0 || u >= 1 || v >= 1) return -1;

    // One scale for both axes, so the ID buffer keeps the camera's aspect.
    const scale = Math.min(1, PICK_MAX / Math.max(this.width, this.height));
    const tw = Math.max(1, Math.round(this.width * scale));
    const th = Math.max(1, Math.round(this.height * scale));
    const gl = this.gl;
    this.ensurePick(tw, th);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.pickFbo);
    gl.viewport(0, 0, tw, th);
    gl.disable(gl.BLEND);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    this.applyUniforms();
    this.drawPages(true);
    gl.readPixels(
      Math.min(tw - 1, Math.floor(u * tw)),
      Math.min(th - 1, Math.floor((1 - v) * th)), // rows count from the bottom
      1, 1, gl.RGBA, gl.UNSIGNED_BYTE, this.pickBuf
    );
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.enable(gl.BLEND);

    const hit = this.pickBuf[0] - 1;
    return hit >= 0 && hit < this.settings().pages ? hit : -1;
  }

  /** Which sheet the pointer is over has changed. */
  setHover(hit) {
    if (hit === this.hover.target) return;
    this.hover.target = hit;
    if (hit >= 0 && this.hover.index !== hit) {
      this.hover.index = hit;
      // Moving straight from one card to the next re-triggers the highlight.
      this.hover.mix = Math.min(this.hover.mix, 0.35);
    }
    this.hooks.onHover?.(hit);
  }

  /** Open a sheet, or (with one up) put it back. */
  open(index) {
    this.focus.index = index;
    this.focus.target = 1;
    this.hooks.onOpen?.(index);
  }

  close() {
    if (this.focus.index >= 0 && this.focus.target === 1) {
      this.focus.target = 0;
      this.hooks.onClose?.();
    }
  }

  onTap(hit) {
    if (!this.settings().tapToView) return;
    if (this.focus.index >= 0) {
      this.close();
      return;
    }
    if (hit >= 0) this.open(hit);
  }

  /* ------------------------------------------------------------ input ---- */

  onKeyDown = (event) => {
    if (event.key === "Escape") this.close();
  };

  wheelScale(event) {
    // deltaMode 1 is lines and 2 is pages; both have to become pixels.
    if (event.deltaMode === 1) return 16;
    if (event.deltaMode === 2) return this.height;
    return 1;
  }

  onWheel = (event) => {
    if (this.disposed) return;
    // A sheet is being read; the line it came out of holds still under it.
    if (this.focus.index >= 0) return;
    if (this.cfg.scrollLock && event.cancelable) event.preventDefault();
    const scale = this.wheelScale(event);
    const dx = event.deltaX * scale;
    const dy = event.deltaY * scale;
    // Whichever axis the gesture is on wins: a trackpad's sideways swipe or a
    // mouse wheel both drive the corridor.
    const dominant = Math.abs(dx) > Math.abs(dy) ? dx : dy;
    const S = this.settings();
    this.push(dominant * S.worldPerPx * S.wheel);
  };

  onPointerDown = (event) => {
    if (this.disposed || event.button !== 0) return;
    // Answered against the frame the user was looking at when they pressed.
    // The hit is taken first and the clock started after, so a slow device's
    // pick cannot eat the tap's time allowance.
    const hit =
      this.focus.index < 0 && this.settings().tapToView
        ? this.pick(event.clientX, event.clientY)
        : -1;
    this.tap = {
      x: event.clientX,
      y: event.clientY,
      at: performance.now(),
      id: event.pointerId,
      hit,
    };
    this.host.setPointerCapture?.(event.pointerId);
    // The corridor does not scroll under a sheet being read, but the press is
    // still tracked so that letting go can put it back.
    if (this.focus.index >= 0) return;
    this.drag.active = true;
    this.drag.lastX = event.clientX;
    this.drag.id = event.pointerId;
  };

  onPointerMove = (event) => {
    if (event.pointerType === "touch") {
      this.pointer.over = false;
    } else {
      this.pointer.x = event.clientX;
      this.pointer.y = event.clientY;
      this.pointer.over = true;
      this.pointer.moved = true;
    }
    if (!this.drag.active || event.pointerId !== this.drag.id) return;
    const delta = this.drag.lastX - event.clientX;
    this.drag.lastX = event.clientX;
    // Finger travel is shorter than wheel travel, so it is scaled up.
    const S = this.settings();
    this.push(delta * 2 * S.worldPerPx * S.wheel);
  };

  onPointerUp = (event) => {
    if (event.pointerId === this.drag.id) {
      this.drag.active = false;
      this.drag.id = -1;
    }
    if (event.pointerId !== this.tap.id) return;
    this.host.releasePointerCapture?.(event.pointerId);
    this.tap.id = -1;
    // A press that stayed put and was let go quickly is a tap; anything else was
    // a drag on the corridor and must not also open a sheet.
    const moved = Math.hypot(event.clientX - this.tap.x, event.clientY - this.tap.y);
    if (moved <= TAP_SLOP && performance.now() - this.tap.at <= TAP_MS) {
      this.onTap(this.tap.hit);
    }
  };

  onPointerLeave = () => {
    this.pointer.over = false;
  };

  onPointerCancel = (event) => {
    if (event.pointerId === this.drag.id) {
      this.drag.active = false;
      this.drag.id = -1;
    }
    if (event.pointerId === this.tap.id) {
      this.host.releasePointerCapture?.(event.pointerId);
      this.tap.id = -1;
    }
  };

  push(worldDelta) {
    if (!isFinite(worldDelta)) return;
    this.scroll.target += worldDelta;
    this.scroll.speed += worldDelta;
  }

  attach() {
    const n = this.host;
    n.addEventListener("wheel", this.onWheel, { passive: false });
    n.addEventListener("pointerdown", this.onPointerDown);
    n.addEventListener("pointermove", this.onPointerMove);
    n.addEventListener("pointerup", this.onPointerUp);
    n.addEventListener("pointercancel", this.onPointerCancel);
    n.addEventListener("pointerleave", this.onPointerLeave);
    // Escape closes what a tap opened.
    window.addEventListener("keydown", this.onKeyDown);
  }

  detach() {
    const n = this.host;
    n.removeEventListener("wheel", this.onWheel);
    n.removeEventListener("pointerdown", this.onPointerDown);
    n.removeEventListener("pointermove", this.onPointerMove);
    n.removeEventListener("pointerup", this.onPointerUp);
    n.removeEventListener("pointercancel", this.onPointerCancel);
    n.removeEventListener("pointerleave", this.onPointerLeave);
    window.removeEventListener("keydown", this.onKeyDown);
  }

  /* ------------------------------------------------------------- host ---- */

  setSize(width, height) {
    if (this.disposed) return;
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.round(this.width * this.dpr));
    this.canvas.height = Math.max(1, Math.round(this.height * this.dpr));
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    perspective(this.proj, CAM_FOV, this.width / this.height, 0.1, 200);
    this.settingsCache = null;
    this.applyConfig();
  }

  updateConfig(cfg) {
    if (this.disposed) return;
    this.cfg = cfg;
    this.settingsCache = null;
    // Only the picture list owns a texture, and loadAtlas is a no-op when the
    // list has not changed. Everything else is a uniform or a per-sheet value.
    this.loadAtlas();
    this.applyConfig();
    this.writeCells();
  }

  setCursor(value) {
    if (this.host.style.cursor !== value) this.host.style.cursor = value;
  }

  start() {
    this.attach();
    this.lastT = performance.now();
    const loop = () => {
      if (this.disposed) return;
      this.frameId = requestAnimationFrame(loop);
      this.step();
    };
    this.frameId = requestAnimationFrame(loop);
  }

  step() {
    const now = performance.now();
    let dt = (now - this.lastT) / 1000;
    this.lastT = now;
    if (!isFinite(dt) || dt < 0) dt = 0;
    // A background tab must not deposit a minute of drift in one frame.
    if (dt > 0.05) dt = 0.05;

    const S = this.settings();
    const u = this.u;
    const gl = this.gl;

    // The one blend, played forwards on a tap and backwards on the next. Linear
    // in time and eased on the way to the shader, so opening and closing are the
    // same curve read in opposite directions.
    if (this.focus.index >= 0) {
      const rate = dt / Math.max(0.05, S.viewDuration);
      this.focus.t = Math.min(1, Math.max(0, this.focus.t + (this.focus.target ? rate : -rate)));
      if (this.focus.t === 0 && this.focus.target === 0) this.focus.index = -1;
    }
    u.uFocusIndex = this.focus.index;
    u.uFocusProgress = power2InOut(this.focus.t);

    this.setCursor(
      this.focus.index >= 0 && this.focus.target === 1
        ? "zoom-out"
        : this.drag.active
          ? "grabbing"
          : this.hover.target >= 0
            ? "pointer"
            : "grab"
    );

    // The corridor holds still under a sheet being read, and while it travels
    // back, so it lands where it left. "Reduce motion" turns the drift off.
    if (S.driftPerSecond !== 0 && this.focus.index < 0 && !this.reduced.matches) {
      this.push(S.driftPerSecond * dt);
    }

    // Frame-rate independent forms of per-frame constants, so a 120Hz display
    // does not settle twice as fast and curl half as hard.
    const k = dt * 60;
    const ease = 1 - Math.pow(1 - S.lerp, k);
    this.scroll.current += (this.scroll.target - this.scroll.current) * ease;
    this.scroll.speed *= Math.pow(0.835, k);

    // The shader wraps on one full corridor length, so walking both ends of the
    // lerp back by exactly that is invisible, and it keeps a corridor scrolled
    // for an hour inside float precision.
    const period = S.pages * (S.pageSpacing + S.thickness);
    if (Math.abs(this.scroll.current) > period) {
      const wrap = Math.sign(this.scroll.current) * period;
      this.scroll.current -= wrap;
      this.scroll.target -= wrap;
    }

    u.uScrollY = this.scroll.current;
    u.uSpeedY = this.scroll.speed;

    // Which card is under the pointer. The deck is re-checked a few times a
    // second, and only when the pointer or the corridor has actually moved.
    const h = this.hover;
    const canHover =
      this.cfg.hoverEffect && S.tapToView && this.pointer.over &&
      !this.drag.active && this.focus.index < 0;
    if (canHover) {
      const moved = this.pointer.moved || Math.abs(this.scroll.current - h.lastScroll) > 1e-3;
      if (moved && now - h.lastAt > HOVER_MS) {
        h.lastAt = now;
        h.lastScroll = this.scroll.current;
        this.pointer.moved = false;
        this.setHover(this.pick(this.pointer.x, this.pointer.y));
      }
    } else if (h.target !== -1) {
      this.setHover(-1);
    }
    const goal = h.target >= 0 ? 1 : 0;
    h.mix += (goal - h.mix) * (1 - Math.pow(0.0001, dt));
    if (goal === 0 && h.mix < 0.01) {
      h.mix = 0;
      h.index = -1;
    }
    u.uHoverIndex = h.index;
    u.uHoverMix = h.mix;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    this.applyUniforms();
    this.drawPages(false);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    this.detach();
    const gl = this.gl;
    if (this.atlasTex) gl.deleteTexture(this.atlasTex);
    gl.deleteTexture(this.blank);
    gl.deleteBuffer(this.vbuf);
    gl.deleteBuffer(this.ibuf);
    if (this.pickFbo) {
      gl.deleteFramebuffer(this.pickFbo);
      gl.deleteTexture(this.pickTex);
      gl.deleteRenderbuffer(this.pickDepth);
    }
    gl.deleteProgram(this.prog);
    // No loseContext(): getContext returns the same context per canvas, so a
    // StrictMode remount would reuse a force-lost one.
  }
}

/* --------------------------------------------------------------- component */

export default function MagazineFlip({
  images = DEFAULT_PRODUCTS,
  background = "#000000",
  pages = 20,
  spacing = 5,
  tilt = 0,
  turn = 0,
  pageWidth = 600,
  pageHeight = 500,
  tap = true,
  zoom = 5,
  openSpeed = 5,
  drift = 2,
  smoothing = 5,
  wave = 5,
  scrollSens = 5,
  scrollLock = true,
  showDetails = true,
  imageProxy = DEFAULT_IMAGE_PROXY,
  hoverEffect = true,
  hoverLabel = true,
  hoverColor = "#FFFFFF",
  buyLabel = "Buy now",
  panelBackground = "#FFFFFF",
  panelColor = "#111111",
  accent = "#111111",
  onBuy,
  onOpen,
  onClose,
  style,
}) {
  const hostRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const [panel, setPanel] = useState({ index: -1, open: false });
  const [hoverIdx, setHoverIdx] = useState(-1);
  const tipRef = useRef(null);
  const placeRef = useRef(null);
  const lastPtr = useRef({ x: 0, y: 0 });
  const [box, setBox] = useState({ w: 0, h: 0 });

  const items = useMemo(
    () => (Array.isArray(images) ? images : []).map(itemOf),
    [images]
  );

  // Rebuilt per render and read through a ref, so dragging a slider shows up on
  // the next frame without the setup effect tearing the renderer down.
  const cfg = {
    items,
    pages,
    spacing,
    tilt,
    turn,
    pageWidth,
    pageHeight,
    tap,
    zoom,
    openSpeed,
    drift,
    smoothing,
    wave,
    scrollSens,
    scrollLock,
    showDetails,
    hoverEffect,
    hoverColor,
    imageProxy,
  };
  const cfgRef = useRef(cfg);
  cfgRef.current = cfg;

  // Callbacks the scene calls, kept fresh without rebuilding it.
  const live = useRef({});
  live.current = { items, onBuy, onOpen, onClose };

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    let scene;
    try {
      scene = new MagazineScene(host, canvas, cfgRef.current, {
        onOpen: (index) => {
          setPanel({ index, open: true });
          const list = live.current.items;
          if (list.length) live.current.onOpen?.(list[index % list.length], index % list.length);
        },
        onClose: () => {
          setPanel((p) => ({ ...p, open: false }));
          live.current.onClose?.();
        },
        onHover: (index) => setHoverIdx(index),
      });
    } catch {
      // No WebGL: an empty frame rather than a thrown render.
      return;
    }
    sceneRef.current = scene;
    const measure = () => {
      scene.setSize(host.clientWidth, host.clientHeight);
      setBox({ w: host.clientWidth, h: host.clientHeight });
    };
    measure();
    scene.start();
    const ro = new ResizeObserver(measure);
    ro.observe(host);

    // The hover label follows the pointer, written straight to the node so
    // moving the mouse never re-renders React.
    const placeTip = () => {
      const tip = tipRef.current;
      if (!tip) return;
      const rect = host.getBoundingClientRect();
      let x = lastPtr.current.x - rect.left + 16;
      let y = lastPtr.current.y - rect.top + 18;
      if (x + tip.offsetWidth > rect.width - 8) x = lastPtr.current.x - rect.left - tip.offsetWidth - 16;
      if (y + tip.offsetHeight > rect.height - 8) y = lastPtr.current.y - rect.top - tip.offsetHeight - 14;
      tip.style.transform = `translate(${Math.max(8, x)}px, ${Math.max(8, y)}px)`;
    };
    const onMove = (e) => {
      if (e.pointerType === "touch") return;
      lastPtr.current = { x: e.clientX, y: e.clientY };
      placeTip();
    };
    host.addEventListener("pointermove", onMove);
    placeRef.current = placeTip;
    return () => {
      host.removeEventListener("pointermove", onMove);
      ro.disconnect();
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  // Put the label where the pointer is the moment it appears.
  useEffect(() => {
    placeRef.current?.();
  }, [hoverIdx]);

  // Push every prop change into the scene (cheap: nothing is rebuilt unless the
  // picture list changed).
  useEffect(() => {
    sceneRef.current?.updateConfig(cfgRef.current);
  });

  /* ---- the product panel ---- */
  const geo = panelGeometry(box.w, box.h, showDetails && tap);
  const item = items.length ? items[panel.index % items.length] : null;
  const number = panel.index >= 0 ? (items.length ? panel.index % items.length : panel.index) + 1 : 0;
  const title = item?.title || (number ? `Item ${String(number).padStart(2, "0")}` : "");
  const label = item?.buyLabel || buyLabel;
  const showPanel = geo.mode !== "none" && panel.index >= 0;

  const press = () => {
    if (!item) return;
    live.current.onBuy?.(item, panel.index % Math.max(1, items.length));
  };

  const panelStyle = {
    position: "absolute",
    boxSizing: "border-box",
    background: panelBackground,
    color: panelColor,
    borderRadius: 18,
    padding: "22px 22px 0",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    opacity: panel.open ? 1 : 0,
    pointerEvents: panel.open ? "auto" : "none",
    transform: panel.open
      ? "none"
      : geo.mode === "right"
        ? "translateX(28px)"
        : "translateY(28px)",
    transition: `opacity 280ms ease ${panel.open ? "240ms" : "0ms"}, transform 280ms ease ${
      panel.open ? "240ms" : "0ms"
    }`,
    ...(geo.mode === "right"
      ? { top: PANEL_MARGIN, bottom: PANEL_MARGIN, right: PANEL_MARGIN, width: geo.size }
      : { left: 12, right: 12, bottom: 12, height: geo.size }),
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background,
        ...style,
      }}
    >
      <div
        ref={hostRef}
        role="img"
        aria-label="A corridor of products you scroll through; tap one to see its details"
        style={{
          position: "absolute",
          inset: 0,
          cursor: "grab",
          // The corridor is walked sideways, so a touch drag across it has to
          // reach the pointer handlers. Vertical page scrolling still gets through.
          touchAction: "pan-y",
          userSelect: "none",
          WebkitUserSelect: "none",
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
        />
      </div>

      {hoverLabel && hoverEffect && tap && hoverIdx >= 0 && !panel.open && items.length > 0 && (
        <div
          ref={tipRef}
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            pointerEvents: "none",
            zIndex: 5,
            padding: "8px 12px",
            borderRadius: 10,
            background: panelBackground,
            color: panelColor,
            boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
            fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
            fontSize: 13,
            lineHeight: 1.3,
            whiteSpace: "nowrap",
          }}
        >
          {(() => {
            const it = items[hoverIdx % items.length];
            return (
              <>
                <div style={{ fontWeight: 600 }}>
                  {it.title || `Item ${String((hoverIdx % items.length) + 1).padStart(2, "0")}`}
                  {it.price ? <span style={{ fontWeight: 500, opacity: 0.6 }}> · {it.price}</span> : null}
                </div>
                <div style={{ fontSize: 11, opacity: 0.55, marginTop: 2 }}>Click to view</div>
              </>
            );
          })()}
        </div>
      )}

      {showPanel && (
        <div role="dialog" aria-label={title} style={panelStyle}>
          <button
            type="button"
            onClick={() => sceneRef.current?.close()}
            aria-label="Close"
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              width: 34,
              height: 34,
              borderRadius: 999,
              border: "none",
              background: "rgba(127,127,127,0.16)",
              color: "inherit",
              fontSize: 16,
              lineHeight: 1,
              cursor: "pointer",
            }}
          >
            ✕
          </button>

          <div style={{ paddingRight: 40 }}>
            <div style={{ fontSize: 22, fontWeight: 650, lineHeight: 1.2 }}>{title}</div>
            {item?.price ? (
              <div style={{ marginTop: 6, fontSize: 20, fontWeight: 600 }}>{item.price}</div>
            ) : null}
          </div>

          {item?.description ? (
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, opacity: 0.75 }}>
              {item.description}
            </p>
          ) : null}

          {item?.specs?.length ? (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.55, marginBottom: 6 }}>
                Specifications
              </div>
              <dl style={{ margin: 0 }}>
                {item.specs.map(([k, v], i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 16,
                      padding: "8px 0",
                      borderTop: "1px solid rgba(127,127,127,0.25)",
                      fontSize: 14,
                    }}
                  >
                    <dt style={{ opacity: 0.65 }}>{k}</dt>
                    <dd style={{ margin: 0, fontWeight: 500, textAlign: "right" }}>{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}

          {/* pinned to the bottom of the panel, so Buy is always reachable */}
          <div
            style={{
              marginTop: "auto",
              position: "sticky",
              bottom: 0,
              background: panelBackground,
              padding: "10px 0 22px",
            }}
          >
            {item?.buyUrl ? (
              <a
                href={item.buyUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={press}
                style={buyStyle(accent)}
              >
                {label}
              </a>
            ) : (
              <button type="button" onClick={press} style={buyStyle(accent)}>
                {label}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function buyStyle(accent) {
  return {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    padding: "14px 18px",
    border: "none",
    borderRadius: 12,
    background: accent,
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: 600,
    textAlign: "center",
    textDecoration: "none",
    cursor: "pointer",
  };
}
