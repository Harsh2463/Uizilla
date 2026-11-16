import { useEffect, useMemo, useRef, useState } from "react";

/**
 * ClothingFlip — a shop rail of garments hanging edge-on from a bar, drifting
 * left on a loop. Point at one and it turns to face you while its neighbours
 * part to make room; click it and it lifts to the middle of the frame, the rail
 * steps back into the dark, and a caption opens under it: counter, title,
 * price, a button, and arrows to browse the rest of the rail.
 *
 * It is Magazine Flip's engine (plain WebGL, one drawing per garment, the pointer
 * answered by drawing the rail again with each garment's number as its colour)
 * laid out as a rail instead of a rail. Only the garment's own pixels
 * count: transparent corners neither draw nor take a click.
 *
 * Self-contained: copy this single file into any React (16.8+) project and
 * render <ClothingFlip />. No other packages, CSS or files needed (no three.js).
 * It fills 100% of its parent, so give the parent a height, e.g.
 *   <div style={{ height: 640 }}><ClothingFlip images={products} /></div>
 *
 * Each entry of `images` is a product:
 *   { src, title?, price?, buyUrl?, buyLabel? }
 * `src` is ONE picture of the garment on its hanger, ideally a cut-out on a
 * transparent background with the hook at the top. The edge-on view is that
 * same picture turned on its edge, so nothing has to be shot twice. A bare URL
 * string also works. `onBuy(item, index)` is called when the button is pressed
 * (and `buyUrl`, if set, opens in a new tab). `onOpen` and `onClose` fire as a
 * product opens and closes.
 *
 * Layout: one number (the wheel position) walks the rail, which wraps on its
 * own length so it runs forever. Sizes in px are solved against a fixed camera,
 * so a garment measured in px is the same fraction of the frame at any size.
 */

/* --------------------------------------------------------------- constants */

/** Vertical field of view. Narrow, so a garment turned edge-on reads as a sliver rather than a wedge. */
const CAM_FOV = 30;
/** How far back the camera sits, in world units. */
const CAM_Z = 6;
/** World units of frame height visible at z = 0. */
const VIEW_HEIGHT = 2 * CAM_Z * Math.tan((CAM_FOV * Math.PI) / 360);
/** Segments across the garment, so edges stay smooth. */
const PAGE_SEGMENTS = 40;
/** Most garments that can exist in the deck. */
const MAX_PAGES = 60;
/** A garment's thickness as a fraction of its width. */
const THICKNESS_RATIO = 0.005;
/** Atlas cells are square powers of two and capped, so a long list stays in one texture. */
const CELL_MAX = 1024;
const ATLAS_MAX = 4096;

const PLACEHOLDER_ASPECTS = [0.72, 1.5, 0.78, 1.33, 1.0, 1.62, 0.68, 1.2, 0.86, 1.45];
const PLACEHOLDER_COUNT = 10;

/** How dark the rail goes behind a garment that is being held up. */
const CORRIDOR_DIM = 0.1;
/** A pointer that travels further than this (px), or is held longer (ms), was not a tap. */
const TAP_SLOP = 6;
const TAP_MS = 600;
/** The ID buffer is the whole frame, redrawn at up to this on its long side.
 * Hover and tap share it, so the card that lights up is the card that opens. */
const PICK_MAX = 900;
/** The garment under the pointer is re-checked at most this often, in ms. */
const HOVER_MS = 70;


/** Used for every sample product until you add your own pictures. */
const SAMPLE_IMAGE =
  "https://ik.imagekit.io/Harsh2463/jackets/Believe%20in%20Yourself%20Hoodie.png?updatedAt=1794681506967";

// There is no built-in stand-in picture: an entry whose picture cannot be loaded
// shows a numbered placeholder instead.
const FALLBACK_IMAGES = [];

/** Sample products, so the component is a working shop display out of the box.
 * Replace `src`, the text and `buyUrl` with your own. */
export const DEFAULT_PRODUCTS = [
  { src: SAMPLE_IMAGE, title: "Believe in Yourself Hoodie", price: "$98", buyUrl: "https://example.com/shop/believe-hoodie" },
  { src: SAMPLE_IMAGE, title: "Everyday Pullover", price: "$84", buyUrl: "https://example.com/shop/everyday-pullover" },
  { src: SAMPLE_IMAGE, title: "Midnight Zip Hoodie", price: "$112", buyUrl: "https://example.com/shop/midnight-zip" },
  { src: SAMPLE_IMAGE, title: "Studio Oversized Hoodie", price: "$120", buyUrl: "https://example.com/shop/studio-oversized" },
  { src: SAMPLE_IMAGE, title: "Heavyweight Crew", price: "$92", buyUrl: "https://example.com/shop/heavyweight-crew" },
  { src: SAMPLE_IMAGE, title: "Core Black Hoodie", price: "$88", buyUrl: "https://example.com/shop/core-black" },
  { src: SAMPLE_IMAGE, title: "Night Run Hoodie", price: "$104", buyUrl: "https://example.com/shop/night-run" },
  { src: SAMPLE_IMAGE, title: "Classic Pocket Hoodie", price: "$90", buyUrl: "https://example.com/shop/classic-pocket" },
  { src: SAMPLE_IMAGE, title: "Essential Hoodie", price: "$76", buyUrl: "https://example.com/shop/essential" },
  { src: SAMPLE_IMAGE, title: "Signature Hoodie", price: "$130", buyUrl: "https://example.com/shop/signature" },
];

/* ----------------------------------------------------------------- helpers */

function clamp(v, lo, hi, fallback) {
  const n = typeof v === "number" && isFinite(v) ? v : fallback;
  return Math.max(lo, Math.min(hi, n));
}

/** A link from your own data: only web and mail links are allowed through. */
function safeUrl(url) {
  if (typeof url !== "string") return "";
  const u = url.trim();
  if (!u) return "";
  if (/^(https?:|mailto:|tel:|\/|#|\.)/i.test(u)) return u;
  return /^[a-z][a-z0-9+.-]*:/i.test(u) ? "" : u;
}

/** One entry of `images`, in any of its accepted shapes. */
function itemOf(entry) {
  const base = entry && typeof entry === "object" ? entry : {};
  const image = typeof entry === "string" ? entry : (base.image ?? base.src ?? "");
  const src = typeof image === "string" ? image : (image?.src ?? "");
  return {
    src,
    title: String(base.title ?? ""),
    price: String(base.price ?? ""),
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

/** Height reserved under a held-up garment for its caption, in px. */
function captionReserve(h, enabled) {
  return enabled ? Math.round(Math.min(210, h * 0.4)) : 0;
}

/**
 * Panel values are abstract scales; the shader wants world units. Every mapping
 * lands its default on a sensible number, so a default instance looks right and
 * the sliders open out from there.
 */
function settingsFor(cfg, viewWidthPx, viewHeightPx) {
  const worldPerPx = VIEW_HEIGHT / Math.max(1, viewHeightPx);
  const viewAspect = Math.max(1, viewWidthPx) / Math.max(1, viewHeightPx);
  const rawW = clamp(cfg.garmentWidth, 40, 1200, 300);
  const rawH = clamp(cfg.garmentHeight, 40, 1600, 360);
  // Garments shrink to fit small frames, so a phone shows the same composition.
  const fit = Math.min(1, (viewHeightPx * 0.7) / rawH, (viewWidthPx * 0.85) / rawW);
  const pageWidthPx = rawW * fit;
  const pageHeightPx = rawH * fit;
  const pageWidth = pageWidthPx * worldPerPx;
  const pageHeight = pageHeightPx * worldPerPx;
  const spacing = clamp(cfg.spacing, 0, 10, 5);
  const smoothing = clamp(cfg.smoothing, 0, 10, 5);
  const sway = clamp(cfg.sway, 0, 10, 5);
  const drift = clamp(cfg.drift, -10, 10, 1.5);
  const sideTurn = clamp(cfg.sideTurn, 0, 10, 8);

  // How far each garment is turned from facing you, at rest. 10 is edge-on.
  const restYaw = (Math.min(88, 15 + sideTurn * 7.5) * Math.PI) / 180;
  // Hanger to hanger along the rail.
  const pageSpacing = pageWidth * (0.12 + spacing * 0.065);
  // When one turns to face you, its neighbours step aside by just enough.
  const sliver = pageWidth * Math.abs(Math.cos(restYaw));
  const part = Math.max(0, pageWidth * 0.515 + sliver * 0.5 + pageWidth * 0.05 - pageSpacing);
  // `pages` is the least number of hangers; a wide frame gets more, so the rail
  // is always longer than the frame and its seam is never on screen.
  const pitchPx = pageSpacing / worldPerPx;
  const need = Math.ceil((viewWidthPx + pageWidthPx * 2) / Math.max(1, pitchPx)) + 2;
  const pages = Math.round(clamp(Math.max(clamp(cfg.pages, 4, MAX_PAGES, 10), need), 4, MAX_PAGES, 10));

  // Where a held-up garment sits: in front of the rail, but never so close to
  // the camera that it clips.
  const focusZ = Math.min(CAM_Z * 0.55, pageWidth * 0.75);
  // The frame, measured on that plane rather than at the origin.
  const planeHeight = (VIEW_HEIGHT * (CAM_Z - focusZ)) / CAM_Z;
  const planeWidth = planeHeight * viewAspect;
  const fill = 0.7 + clamp(cfg.zoom, 0, 10, 5) * 0.04;

  // The part of the frame the held-up garment is fitted into: everything above
  // its caption, and clear of the arrows at either side.
  const reserve = captionReserve(viewHeightPx, cfg.showDetails && cfg.tap);
  const rx0 = 0.09;
  const rx1 = 0.91;
  const ry0 = 0;
  const ry1 = Math.max(0.2, (viewHeightPx - reserve) / viewHeightPx);
  const rw = rx1 - rx0;
  const rh = ry1 - ry0;

  return {
    pageWidth,
    pageHeight,
    pageWidthPx,
    pageHeightPx,
    worldPerPx,
    pages,
    pageSpacing,
    thickness: pageWidth * THICKNESS_RATIO,
    restYaw,
    part,
    sway,
    // Geometric, so the top of the slider reaches a genuinely heavy rail.
    lerp: 0.35 * Math.pow(0.82, smoothing),
    driftPerSecond: drift * pageWidth * 0.12,
    wheel: 0.4 + clamp(cfg.scrollSens, 0, 10, 5) * 0.16,
    tapToView: cfg.tap !== false,
    focusZ,
    focusX: ((rx0 + rx1) / 2 - 0.5) * planeWidth,
    focusY: -((ry0 + ry1) / 2 - 0.5) * planeHeight,
    // Whichever of the two axes runs out first.
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
uniform float uRestYaw;
uniform float uPart;
uniform float uSway;
uniform float uTime;
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

mat3 rotY(float a) {
    return mat3(cos(a), 0.0, sin(a), 0.0, 1.0, 0.0, -sin(a), 0.0, cos(a));
}

mat3 rotZ(float a) {
    return mat3(cos(a), sin(a), 0.0, -sin(a), cos(a), 0.0, 0.0, 0.0, 1.0);
}

void main() {
    float aIndex = uIndex;

    // The geometry is a unit box and the garment's size arrives as uniforms, so
    // a width drag is a uniform write rather than a geometry rebuild.
    vec3 basePos = vec3(
        position.x * uPageWidth,
        position.y * uPageHeight,
        position.z * uPageThickness
    );

    // Where this hanger is along the bar. The rail is walked in x, and wrapped
    // on its own length; the wrap is done on the garment's centre and applied as
    // one offset to all of its vertices, so a garment never tears at the seam.
    float fromMiddle = aIndex - (uMeshCount - 1.0) * 0.5;
    float period = uMeshCount * uPageSpacing;
    float xRail = mod(uPageSpacing * fromMiddle - uScrollY + period * 0.5, period) - period * 0.5;

    // --- tap to view: 1 only on the garment being held up.
    float focused = step(abs(aIndex - uFocusIndex), 0.5);
    float e = focused * uFocusProgress;

    // --- hover: the garment under the pointer turns to face you and swells a
    // little; everything to its left steps left and everything to its right
    // steps right, so it has room. None of this applies once one is held up.
    float hovered = step(abs(aIndex - uHoverIndex), 0.5);
    float hasHover = step(-0.5, uHoverIndex);
    float hov = hovered * uHoverMix * (1.0 - uFocusProgress);
    float fmH = uHoverIndex - (uMeshCount - 1.0) * 0.5;
    float xH = mod(uPageSpacing * fmH - uScrollY + period * 0.5, period) - period * 0.5;
    float side = sign(xRail - xH) * (1.0 - hovered) * hasHover;
    float part = side * uPart * uHoverMix * (1.0 - uFocusProgress);

    float k = mix(1.0, uFocusScale, e) * (1.0 + 0.05 * hov);

    // Garments hang from the hook at the top of the picture: they turn about
    // the vertical through it and swing about it, and they grow from it.
    vec3 hook = vec3(0.0, uPageHeight * 0.5 * k, 0.0);
    vec3 p = basePos * k - hook;

    // The camera looks at a garment off to one side along a slanted ray, so the
    // same yaw would show the ones on the right more of their face than the ones
    // on the left. Adding the viewing angle makes every one equally edge-on, as
    // if the rail were seen straight on.
    float view = atan(xRail + part, ${CAM_Z.toFixed(1)});
    float yaw = (uRestYaw + view) * (1.0 - hov) * (1.0 - e);
    // A fast pass swings them a little behind the bar, and each also sways
    // gently on its own. Held up or hovered, they hang still.
    float swing = clamp(uSpeedY / uPageWidth * 0.6, -0.2, 0.2)
        + sin(uTime * 1.25 + aIndex * 2.399) * 0.018;
    float tilt = swing * uSway * 0.2 * (1.0 - e) * (1.0 - hov * 0.7);

    p = rotY(yaw) * p;
    p = rotZ(tilt) * p;
    p += hook;

    // Rigid at every point of the blend: it turns and travels, it never
    // stretches. Its place on the rail fades out as it comes to the middle.
    p.x += (xRail + part) * (1.0 - e);
    p.z += uFocusZ * e;
    p.xy += uFocusXY * e;

    gl_Position = uProj * vec4(p - vec3(0.0, 0.0, ${CAM_Z.toFixed(1)}), 1.0);

    vUv = uv;
    // Everything but the garment being held up steps back into the dark.
    vDim = uFocusProgress * (1.0 - focused);
    vHover = hov;
    vOther = uHoverMix * (1.0 - hovered) * hasHover * (1.0 - uFocusProgress);
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
uniform float uPick;

varying vec2 vUv;
varying float vDim;
varying float vHover;
varying float vOther;

void main() {
    // Contain, never crop: the whole garment on its own proportions, pinned to
    // the top of the garment so every hook meets the bar whatever the picture's
    // shape. Whatever is left over is empty and draws nothing.
    vec2 uv = vUv;
    float s = uAspect / uPageAspect;
    if (s >= 1.0) {
        uv.y = 1.0 - (1.0 - uv.y) * s;
    } else {
        uv.x = (uv.x - 0.5) / s + 0.5;
    }
    bool outside = uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0;

    // The cell's rect is stored inset by a texel, so a garment's edge never
    // picks up its neighbour in the atlas.
    vec2 atlasUv = mix(uRect.xy, uRect.zw, clamp(uv, 0.0, 1.0));
    vec4 color = texture2D(uAtlas, atlasUv);

    // Only the garment itself is there: its transparent corners neither draw
    // nor answer the pointer.
    if (outside || color.a < 0.08) discard;

    // The picking pass: the garment's index as a colour, offset by one so that
    // nothing at all reads back as zero.
    if (uPick > 0.5) {
        gl_FragColor = vec4((uIndex + 1.0) / 255.0, 0.0, 0.0, 1.0);
        return;
    }

    // The atlas is uploaded premultiplied, so colour is already weighted by alpha.
    vec3 rgb = color.rgb * mix(1.0, ${CORRIDOR_DIM.toFixed(2)}, vDim);
    // Hover: the garment under the pointer brightens; the others fall back a
    // touch, so the one that will open is clear.
    rgb *= 1.0 + 0.1 * vHover;
    rgb *= 1.0 - 0.14 * vOther;
    gl_FragColor = vec4(rgb, color.a);
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
      "ClothingFlip: this picture's host sends no CORS header, so it is being retried through the image proxy — " +
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
 * picture's rect and aspect. A list that repeats one address gets one cell, and
 * the canvas is a power of two so WebGL1 can mipmap it, which is what makes
 * garments seen almost edge-on look clean.
 */
async function buildAtlas(sources, proxy) {
  const list = sources.length ? sources : [""];
  const unique = [];
  const slot = list.map((src, i) => {
    const key = src || `\u0000${i}`; // empty entries stay separate stand-ins
    let at = unique.findIndex((u) => u.key === key);
    if (at < 0) {
      unique.push({ key, src, i });
      at = unique.length - 1;
    }
    return at;
  });
  const images = await Promise.all(unique.map((u) => loadWithFallback(u.src, u.i, proxy)));

  const n = unique.length;
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  const cell = Math.min(CELL_MAX, prevPow2(Math.floor(ATLAS_MAX / Math.max(cols, rows))));
  const canvas = document.createElement("canvas");
  canvas.width = nextPow2(cols * cell);
  canvas.height = nextPow2(rows * cell);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const cells = [];
  for (let i = 0; i < n; i++) {
    const cx = (i % cols) * cell;
    const cy = Math.floor(i / cols) * cell;
    const img = images[i];
    const aspect =
      img && img.naturalHeight > 0
        ? img.naturalWidth / img.naturalHeight
        : PLACEHOLDER_ASPECTS[i % PLACEHOLDER_ASPECTS.length];
    // Contained, never stretched: the cell holds the whole picture on its own
    // proportions.
    const w = aspect >= 1 ? cell : cell * aspect;
    const h = aspect >= 1 ? cell / aspect : cell;
    const dx = cx + (cell - w) / 2;
    const dy = cy + (cell - h) / 2;
    if (img) ctx.drawImage(img, dx, dy, w, h);
    else drawPlaceholder(ctx, i, dx, dy, w, h);

    // A texel of inset on every side: mipmaps average across cell borders
    // otherwise, and a garment seen at a grazing angle is deep in the mip chain.
    const u0 = (dx + 1) / canvas.width;
    const u1 = (dx + w - 1) / canvas.width;
    const vTop = 1 - (dy + 1) / canvas.height;
    const vBottom = 1 - (dy + h - 1) / canvas.height;
    cells.push({ rect: [u0, vBottom, u1, vTop], aspect });
  }

  // Every picture was checked before it got here, so the canvas is clean and
  // one unusable host costs its own slot rather than the whole rail.
  return { canvas, cells: slot.map((at) => cells[at]) };
}

/* ------------------------------------------------------------------- scene */

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
    console.warn("ClothingFlip shader:", gl.getShaderInfoLog(s));
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
  "uScrollY", "uSpeedY", "uRestYaw", "uPart", "uSway", "uTime", "uFocusIndex",
  "uFocusProgress", "uFocusScale", "uFocusZ", "uPageAspect", "uHoverIndex",
  "uHoverMix",
];

class ClothingScene {
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

    // Where the input has pushed the rail, and the eased value it rides.
    this.scroll = { target: 0, current: 0, speed: 0 };
    this.drag = { active: false, lastX: 0, id: -1 };
    // Which garment is being held up, how far out of the line it has travelled,
    // and which way it is going. `index` outlives `target` reaching 0, because
    // the garment keeps its identity all the way back into the rail.
    this.focus = { index: -1, t: 0, target: 0, queued: -1, fast: false };
    // Where the pointer went down, and which garment was under it at that moment:
    // the rail is still drifting, so by the time a press is let go the garment
    // the user aimed at is no longer at those coordinates.
    this.tap = { x: 0, y: 0, at: 0, id: -1, hit: -1 };
    // The pointer, and which garment it is over. `index` outlives `target` going
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
      console.warn("ClothingFlip link:", gl.getProgramInfoLog(prog));
      throw new Error("link failed");
    }
    gl.useProgram(prog);
    this.prog = prog;
    this.loc = {};
    for (const n of [
      ...FLOAT_UNIFORMS, "uProj", "uIndex", "uFocusXY", "uRect", "uAspect",
      "uPick", "uAtlas",
    ]) {
      this.loc[n] = gl.getUniformLocation(prog, n);
    }
    gl.uniform1i(this.loc.uAtlas, 0);

    // Geometry, built once: the garment's real size is applied in the vertex shader.
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

    // A clear 1x1 to draw with while the real atlas is still decoding: nothing shows until the pictures land.
    this.blank = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.blank);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 0])
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.CULL_FACE); // both faces of a garment can be seen
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    // Per-garment data, written once and read at draw time.
    this.rects = new Float32Array(MAX_PAGES * 4);
    this.aspects = new Float32Array(MAX_PAGES).fill(1);
    for (let i = 0; i < MAX_PAGES; i++) this.rects.set([0, 0, 1, 1], i * 4);

    this.u = { uPageAspect: 1 };
    for (const n of FLOAT_UNIFORMS) if (!(n in this.u)) this.u[n] = 0;
    this.u.uFocusIndex = -1;
    this.u.uFocusXY = [0, 0];
    this.u.uHoverIndex = -1;
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

  /* ---- everything the panel owns is a uniform or a per-garment value ---- */

  applyConfig() {
    const S = this.settings();
    const u = this.u;
    u.uMeshCount = S.pages;
    u.uPageWidth = S.pageWidth;
    u.uPageHeight = S.pageHeight;
    u.uPageThickness = S.thickness;
    u.uPageSpacing = S.pageSpacing;
    u.uRestYaw = S.restYaw;
    u.uPart = S.part;
    u.uSway = S.sway;
    u.uPageAspect = S.pageWidthPx / S.pageHeightPx;
    u.uFocusScale = S.focusScale;
    u.uFocusZ = S.focusZ;
    u.uFocusXY = [S.focusX, S.focusY];
    // A garment that has just been configured out of existence cannot be left
    // held up with nothing to put it back.
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

  /** Which picture each garment shows: the list, repeated across the deck. */
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
        // Premultiplied, so a garment's edge mixes into the mip chain without a
        // dark halo from the transparent pixels round it.
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas.canvas);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.generateMipmap(gl.TEXTURE_2D);
        // The point of this component is garments seen almost edge-on, which is
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
   * Which garment is drawn at a point, answered by drawing it: the deck is
   * re-rendered through the same vertex shader with each garment's index written
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

  /** Which garment the pointer is over has changed. */
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

  /** Open a garment, or (with one up) put it back. */
  open(index) {
    this.focus.index = index;
    this.focus.target = 1;
    this.hooks.onOpen?.(index);
  }

  close() {
    const f = this.focus;
    if (f.index >= 0 && (f.target === 1 || f.queued >= 0)) {
      f.queued = -1;
      f.fast = false;
      f.target = 0;
      this.hooks.onClose?.();
    }
  }

  /** With one held up: put it back and bring the next one (dir 1) or the
   * previous one (dir -1) out of the rail, at twice the usual pace. */
  browse(dir) {
    const f = this.focus;
    if (f.index < 0 || (f.target !== 1 && f.queued < 0)) return;
    const n = this.settings().pages;
    const from = f.queued >= 0 ? f.queued : f.index;
    const next = (((from + dir) % n) + n) % n;
    f.queued = next;
    f.target = 0;
    f.fast = true;
    this.hooks.onBrowse?.(next);
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
    if (event.key === "Escape") {
      this.close();
    } else if ((event.key === "ArrowRight" || event.key === "ArrowLeft") && this.focus.index >= 0) {
      event.preventDefault();
      this.browse(event.key === "ArrowRight" ? 1 : -1);
    }
  };

  wheelScale(event) {
    // deltaMode 1 is lines and 2 is pages; both have to become pixels.
    if (event.deltaMode === 1) return 16;
    if (event.deltaMode === 2) return this.height;
    return 1;
  }

  onWheel = (event) => {
    if (this.disposed) return;
    // A garment is being read; the line it came out of holds still under it.
    if (this.focus.index >= 0) return;
    if (this.cfg.scrollLock && event.cancelable) event.preventDefault();
    const scale = this.wheelScale(event);
    const dx = event.deltaX * scale;
    const dy = event.deltaY * scale;
    // Whichever axis the gesture is on wins: a trackpad's sideways swipe or a
    // mouse wheel both drive the rail.
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
    // The rail does not scroll under a garment being read, but the press is
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
    // a drag on the rail and must not also open a garment.
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
    // list has not changed. Everything else is a uniform or a per-garment value.
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
      const base = dt / Math.max(0.05, S.viewDuration);
      const rate = this.focus.fast ? base * 2.4 : base;
      this.focus.t = Math.min(1, Math.max(0, this.focus.t + (this.focus.target ? rate : -rate)));
      if (this.focus.t === 0 && this.focus.target === 0) {
        if (this.focus.queued >= 0) {
          // Browsing: the last one is home, so the next comes out.
          this.focus.index = this.focus.queued;
          this.focus.queued = -1;
          this.focus.target = 1;
        } else {
          this.focus.index = -1;
        }
      }
      if (this.focus.t === 1) this.focus.fast = false;
    }
    u.uTime = (now / 1000) % 3600;
    u.uFocusIndex = this.focus.index;
    u.uFocusProgress = power2InOut(this.focus.t);

    this.setCursor(
      this.focus.index >= 0 && (this.focus.target === 1 || this.focus.queued >= 0)
        ? "zoom-out"
        : this.drag.active
          ? "grabbing"
          : this.hover.target >= 0
            ? "pointer"
            : "grab"
    );

    // The rail holds still under a garment being read, while it travels back,
    // and while the pointer is on one, so what you are aiming at does not slide
    // away. "Reduce motion" turns the drift off.
    if (
      S.driftPerSecond !== 0 && this.focus.index < 0 && !this.reduced.matches &&
      this.hover.target < 0 && !this.drag.active
    ) {
      this.push(S.driftPerSecond * dt);
    }

    // Frame-rate independent forms of per-frame constants, so a 120Hz display
    // does not settle twice as fast and curl half as hard.
    const k = dt * 60;
    const ease = 1 - Math.pow(1 - S.lerp, k);
    this.scroll.current += (this.scroll.target - this.scroll.current) * ease;
    this.scroll.speed *= Math.pow(0.835, k);

    // The shader wraps on one full rail length, so walking both ends of the
    // lerp back by exactly that is invisible, and it keeps a rail scrolled
    // for an hour inside float precision.
    const period = S.pages * S.pageSpacing;
    if (Math.abs(this.scroll.current) > period) {
      const wrap = Math.sign(this.scroll.current) * period;
      this.scroll.current -= wrap;
      this.scroll.target -= wrap;
    }

    u.uScrollY = this.scroll.current;
    u.uSpeedY = this.scroll.speed;

    // Which card is under the pointer. The deck is re-checked a few times a
    // second, and only when the pointer or the rail has actually moved.
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

const SANS = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const SERIF = "'Instrument Serif', 'Playfair Display', Georgia, 'Times New Roman', serif";

function Arrow({ dir, onClick, color }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir < 0 ? "Previous product" : "Next product"}
      style={{
        position: "absolute",
        top: "calc((100% - var(--cf-reserve)) / 2)",
        [dir < 0 ? "left" : "right"]: "clamp(10px, 5%, 56px)",
        transform: "translateY(-50%)",
        width: 46,
        height: 46,
        borderRadius: 999,
        border: `1px solid ${color}66`,
        background: "transparent",
        color,
        cursor: "pointer",
        display: "grid",
        placeItems: "center",
        pointerEvents: "auto",
        padding: 0,
      }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d={dir < 0 ? "M10 3 5 8l5 5" : "M6 3l5 5-5 5"}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

export default function ClothingFlip({
  images = DEFAULT_PRODUCTS,
  background = "#0E0E10",
  pages = 10,
  spacing = 5,
  sideTurn = 8,
  garmentWidth = 300,
  garmentHeight = 360,
  tap = true,
  zoom = 5,
  openSpeed = 5,
  drift = 1.5,
  smoothing = 5,
  sway = 5,
  scrollSens = 5,
  scrollLock = true,
  showDetails = true,
  showRail = true,
  railColor = "#C9CBD1",
  imageProxy = DEFAULT_IMAGE_PROXY,
  hoverEffect = true,
  hoverLabel = true,
  buyLabel = "See availability",
  captionColor = "#F4F4F5",
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
  const [railY, setRailY] = useState(-100);

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
    sideTurn,
    garmentWidth,
    garmentHeight,
    tap,
    zoom,
    openSpeed,
    drift,
    smoothing,
    sway,
    scrollSens,
    scrollLock,
    showDetails,
    hoverEffect,
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
      scene = new ClothingScene(host, canvas, cfgRef.current, {
        onOpen: (index) => {
          setPanel({ index, open: true });
          const list = live.current.items;
          if (list.length) live.current.onOpen?.(list[index % list.length], index % list.length);
        },
        onBrowse: (index) => {
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
  // picture list changed), and seat the bar at the hooks.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.updateConfig(cfgRef.current);
    const S = scene.settings();
    const y = scene.height / 2 - S.pageHeightPx / 2 + S.pageHeightPx * 0.022;
    setRailY((prev) => (Math.abs(prev - y) < 0.5 ? prev : y));
  });

  /* ---- the caption under a held-up garment ---- */
  const item = items.length ? items[panel.index % items.length] : null;
  const number = panel.index >= 0 ? (items.length ? panel.index % items.length : panel.index) + 1 : 0;
  const title = item?.title || (number ? `Item ${String(number).padStart(2, "0")}` : "");
  const label = item?.buyLabel || buyLabel;
  const showCaption = showDetails && tap && panel.index >= 0;
  const reserve = captionReserve(box.h, showDetails && tap);

  const press = () => {
    if (!item) return;
    live.current.onBuy?.(item, panel.index % Math.max(1, items.length));
  };

  const pill = {
    display: "inline-block",
    marginTop: 10,
    padding: "13px 30px",
    borderRadius: 999,
    border: `1px solid ${captionColor}b3`,
    background: "transparent",
    color: captionColor,
    fontFamily: SANS,
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    textDecoration: "none",
    cursor: "pointer",
    pointerEvents: "auto",
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background,
        "--cf-reserve": `${reserve}px`,
        ...style,
      }}
    >
      {/* the bar the hangers hang from: behind the garments, stepping back with them */}
      {showRail && railY > -50 && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: railY - 5,
            height: 10,
            background: `linear-gradient(180deg, rgba(0,0,0,0.42) 0%, ${railColor} 34%, ${railColor} 56%, rgba(0,0,0,0.5) 100%), ${railColor}`,
            boxShadow: "0 6px 14px rgba(0,0,0,0.45)",
            opacity: panel.open ? 0.22 : 1,
            transition: "opacity 600ms ease",
            pointerEvents: "none",
          }}
        />
      )}

      <div
        ref={hostRef}
        role="img"
        aria-label="A rail of clothing that drifts past; point at one to see it from the front and click it for its details"
        style={{
          position: "absolute",
          inset: 0,
          cursor: "grab",
          // The rail is walked sideways, so a touch drag across it has to reach
          // the pointer handlers. Vertical page scrolling still gets through.
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
            background: "#FFFFFF",
            color: "#111111",
            boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
            fontFamily: SANS,
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

      {showCaption && (
        <div
          role="dialog"
          aria-label={title}
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 4,
            color: captionColor,
            opacity: panel.open ? 1 : 0,
            transition: `opacity 300ms ease ${panel.open ? "260ms" : "0ms"}`,
          }}
        >
          <Arrow dir={-1} color={captionColor} onClick={() => sceneRef.current?.browse(-1)} />
          <Arrow dir={1} color={captionColor} onClick={() => sceneRef.current?.browse(1)} />

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
              background: "rgba(127,127,127,0.18)",
              color: "inherit",
              fontSize: 15,
              lineHeight: 1,
              cursor: "pointer",
              pointerEvents: "auto",
            }}
          >
            ✕
          </button>

          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 16,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              padding: "0 16px",
            }}
          >
            <div style={{ fontFamily: SANS, fontSize: 12.5, letterSpacing: "0.14em", opacity: 0.55 }}>
              {String(number).padStart(2, "0")} / {String(Math.max(1, items.length)).padStart(2, "0")}
            </div>
            <div
              style={{
                marginTop: 6,
                fontFamily: SERIF,
                fontStyle: "italic",
                fontWeight: 400,
                fontSize: "clamp(26px, 4.4vw, 38px)",
                lineHeight: 1.1,
              }}
            >
              {title}
            </div>
            {item?.price ? (
              <div style={{ marginTop: 6, fontFamily: SANS, fontSize: 16, letterSpacing: "0.08em", opacity: 0.62 }}>
                {item.price}
              </div>
            ) : null}
            {item?.buyUrl ? (
              <a href={item.buyUrl} target="_blank" rel="noopener noreferrer" onClick={press} style={pill}>
                {label}
              </a>
            ) : (
              <button type="button" onClick={press} style={pill}>
                {label}
              </button>
            )}
            {box.w >= 560 && (
              <div style={{ marginTop: 12, fontFamily: SANS, fontSize: 11.5, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.42 }}>
                ← → Browse · Esc close
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
