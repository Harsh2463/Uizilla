import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

/**
 * DepthGallery — a corridor of pictures receding into the frame, flown through
 * by the scroll. Only ever one picture is really being looked at: the plate
 * ahead of the camera dissolves into the one behind it as the scroll advances,
 * so the gallery reads as depth rather than as a list.
 *
 * Self-contained: copy this single file into any React (16.8+) project and
 * render <DepthGallery />. No other packages, CSS or files needed (plain DOM
 * and CSS, no WebGL). It fills 100% of its parent and scales the plates down on
 * small frames, so give the parent a height, e.g.
 *   <div style={{ height: 700 }}><DepthGallery /></div>
 * Missing or broken images automatically fall back to the built-in list.
 *
 * Four things hang off one number, the camera's position `p` measured in plate
 * slots (unbounded, because the corridor has no end):
 *
 *   1. RECESSION: the plate in focus sits one slot ahead of the camera and the
 *      next one two. Card Width is the size the focused plate lands at on
 *      screen: the geometry is pre-multiplied by the perspective divide it is
 *      about to take, so the slider means what it says at any Depth.
 *   2. DISSOLVE: the plate at floor(p) fades out over frac(p) while the one
 *      behind it fades in. Both indices are taken modulo the list, which is the
 *      whole of the loop. Every other plate is taken out of the paint.
 *   3. MOOD: the ground under everything is built from the picture's own
 *      colour, sampled off the image, and cross-faded on the same frac(p). Two
 *      slow blobs and a grain sit over it, as CSS gradients (no GL context).
 *   4. BREATH: scroll velocity, not position, drives a tilt, a scale pulse and
 *      a vertical drift. Hold still and the corridor is still.
 *
 * Side and depth are read off the *slot* rather than the picture's index, so an
 * odd-length list does not put two plates on one side across the wrap.
 *
 * The component owns its scroll: wheel and drag push a target that the
 * rendered position chases with a lerp, and the position wraps on its own span.
 * With `scrollLock` on, the wheel is consumed over the component, since the
 * corridor has no end to hand the scroll back at.
 *
 * After "Atmospheric Depth Gallery" by houmahani (Codrops), MIT licence.
 */

/* -------------------------------------------------------------- constants */

const UNSPLASH = (id) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=80`;

// Default pictures.
const DEFAULT_IMAGES = [
  "1713456047285-52a8d18d1912",
  "1629747387925-6905ff5a558a",
  "1568044853110-277196781802",
  "1787656235601-d0c3b837ed33",
  "1613698808499-f772ccb4f527",
  "1626858707111-2fefbc9a848e",
  "1542305983-c4100e4b8cd2",
  "1720569103781-daf2ecb89e1b",
  "1611938766054-6b4f25b06f2e",
  "1643059514529-f6689eeba463",
].map((id) => ({ src: UNSPLASH(id) }));

// Built-in fallback: used for any entry that is empty or fails to load.
const FALLBACK_IMAGES = [
  "1506744038136-46273834b3fb",
  "1469474968028-56623f02e42e",
  "1441974231531-c6227db76b6e",
  "1470071459604-3b5ec3a7fe05",
  "1501785888041-af3ef285b470",
  "1472214103451-9374bd1c798e",
  "1465146344425-f00d5f5c8f07",
  "1447752875215-b2761acb3c5d",
].map((id) => ({ src: UNSPLASH(id) }));

/** How many slots ahead of the camera the plate in focus sits. */
const VIEW_LEAD = 1;

/** Perspective as a multiple of Card Width, so the recession looks the same
 * whatever size the plates are cut to. */
const PERSPECTIVE_RATIO = 3.2;

/** Depth 0–10 → gap between plates, as a share of the perspective. */
const GAP_MIN = 0.26;
const GAP_RANGE = 0.9;

/** Spread 10 puts a plate this far off centre, as a share of Card Width. */
const SPREAD_RANGE = 0.6;

/** Wheel pixels to cross one plate at a gain of 1. */
const WHEEL_SPAN = 650;
const WHEEL_MIN = 0.4;
const WHEEL_RANGE = 1.6;

/** Drag moves further per pixel than the wheel does. */
const DRAG_GAIN = 1.8;

/** Slots per frame that count as flat out; the velocity effects normalise on it. */
const VELOCITY_MAX = 0.03;
const VELOCITY_DAMPING = 0.12;

/** Lerps for the things that chase a target inside the frame loop. */
const POINTER_SMOOTHING = 0.08;
const BREATH_SMOOTHING = 0.14;
const DRIFT_SMOOTHING = 0.05;
const BREATH_GAIN = 1.1;

/** The breath at Breath 5: a 2.6° lean and a 3% swell. */
const BREATH_TILT_DEG = 2.6;
const BREATH_SCALE = 0.03;

/** Extra pointer taken per slot of depth, so the parallax does not read as a flat slide. */
const DEPTH_INFLUENCE = 0.05;

/** Blobs are mixed this far back toward the ground, so they read as light. */
const BLOB_SOFTEN = 0.35;

/** Blob radii in frame units at Blob Size 5. */
const BLOB1_RADIUS = 0.55;
const BLOB2_RADIUS = 0.45;

/** Grain at Grain 10, as an overlay alpha. */
const GRAIN_RANGE = 0.28;

/** Weight added to every pixel when averaging a picture's colour. */
const SAMPLE_FLOOR = 0.08;

/** Edge of the noise tile, in pixels. */
const GRAIN_TILE = 128;

/** Plates shrink on frames narrower (or shorter) than this many card sizes. */
const FIT = 1 / 0.86;

/** What a plate falls back to when no picture can load. */
const NEUTRAL_TINT = { r: 168, g: 166, b: 160, a: 1 };
const PLACEHOLDER_TINTS = ["#FECA4F", "#80455A", "#FA7B71", "#3C72C6", "#7D936E"];

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

/* -------------------------------------------------------------- internals */

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const mix = (a, b, t) => a + (b - a) * t;
/** Positive modulo: JS % keeps the sign of the dividend. */
const wrap = (value, span) => ((value % span) + span) % span;

/* ------------------------------------------------------------------ colour */

function hslToRgb(h, s, l, a = 1) {
  const hue = ((h % 360) + 360) % 360;
  const sat = clamp(s, 0, 100) / 100;
  const lum = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * lum - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lum - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hue < 60) {
    r = c;
    g = x;
  } else if (hue < 120) {
    r = x;
    g = c;
  } else if (hue < 180) {
    g = c;
    b = x;
  } else if (hue < 240) {
    g = x;
    b = c;
  } else if (hue < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255, a };
}

function rgbToHsl(color) {
  const r = clamp(color.r, 0, 255) / 255;
  const g = clamp(color.g, 0, 255) / 255;
  const b = clamp(color.b, 0, 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: (((h * 60) % 360) + 360) % 360, s: s * 100, l: l * 100 };
}

/** Reads colours as rgba(...), hex, or hsl(...). */
function parseColor(input, fallback) {
  if (typeof input !== "string") return fallback;
  const value = input.trim().toLowerCase();
  if (!value) return fallback;

  if (value.charAt(0) === "#") {
    const hex = value.slice(1);
    const pair = (i) => parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    const single = (i) => parseInt(hex.charAt(i) + hex.charAt(i), 16);
    if (hex.length === 3 || hex.length === 4) {
      return {
        r: single(0),
        g: single(1),
        b: single(2),
        a: hex.length === 4 ? single(3) / 255 : 1,
      };
    }
    if (hex.length === 6 || hex.length === 8) {
      return {
        r: pair(0),
        g: pair(1),
        b: pair(2),
        a: hex.length === 8 ? pair(3) / 255 : 1,
      };
    }
    return fallback;
  }

  const parts = value.match(/-?[\d.]+/g);
  if (!parts || parts.length < 3) return fallback;
  const n = parts.map(Number);
  if (n.some((v) => !isFinite(v))) return fallback;
  if (value.indexOf("hsl") === 0) {
    return hslToRgb(n[0], n[1], n[2], parts.length > 3 ? n[3] : 1);
  }
  return { r: n[0], g: n[1], b: n[2], a: parts.length > 3 ? n[3] : 1 };
}

function mixRGB(a, b, t) {
  const k = clamp(t, 0, 1);
  return {
    r: mix(a.r, b.r, k),
    g: mix(a.g, b.g, k),
    b: mix(a.b, b.b, k),
    a: mix(a.a, b.a, k),
  };
}

function rgba(color, alpha) {
  return `rgba(${Math.round(clamp(color.r, 0, 255))}, ${Math.round(
    clamp(color.g, 0, 255)
  )}, ${Math.round(clamp(color.b, 0, 255))}, ${clamp(alpha, 0, 1).toFixed(3)})`;
}

const cssColor = (color) => rgba(color, color.a);

function toHex(color) {
  const part = (v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0");
  return `#${part(color.r)}${part(color.g)}${part(color.b)}`.toUpperCase();
}

/** The atmosphere one picture puts in the room: a pale wash of its own hue for
 * the ground, and two blobs a little brighter and a little turned. The ground
 * follows the picture's lightness part of the way, so a dark shot gets a
 * moodier room than a bright one. */
function moodFromTint(tint) {
  const { h, s, l } = rgbToHsl(tint);
  const groundL = clamp(58 + l * 0.32, 44, 92);
  const groundS = clamp(s * 0.34, 0, 46);
  return {
    background: hslToRgb(h, groundS, groundL),
    blob1: hslToRgb(h, clamp(s * 0.66, 0, 84), clamp(groundL + 9, 0, 96)),
    blob2: hslToRgb(h + 28, clamp(s * 0.52, 0, 72), clamp(groundL + 3, 0, 94)),
  };
}

/** Stand-in artwork, built from a plate's own colour. */
function placeholderFill(tint) {
  const { h, s, l } = rgbToHsl(tint);
  const near = `hsl(${h.toFixed(0)} ${clamp(s, 14, 82).toFixed(0)}% ${clamp(
    l + 14,
    20,
    92
  ).toFixed(0)}%)`;
  const far = `hsl(${(h + 34).toFixed(0)} ${clamp(s * 0.8, 10, 70).toFixed(
    0
  )}% ${clamp(l - 20, 8, 66).toFixed(0)}%)`;
  return `linear-gradient(155deg, ${near}, ${far})`;
}

/** One blob of the ground. The falloff is a smoothstep and a CSS gradient
 * interpolates straight, so the curve is spelled out in stops. `ellipse R% R%`
 * rather than `circle`, so it stretches to the frame. `k` scales its opacity. */
function blobLayer(color, cx, cy, radius, k = 1) {
  const x = (cx * 100).toFixed(2);
  // Frame units run up from the bottom, CSS percentages run down from the top.
  const y = ((1 - cy) * 100).toFixed(2);
  const r = (radius * 100).toFixed(2);
  return `radial-gradient(ellipse ${r}% ${r}% at ${x}% ${y}%, ${rgba(
    color,
    k
  )} 0%, ${rgba(color, 0.84 * k)} 25%, ${rgba(color, 0.5 * k)} 50%, ${rgba(
    color,
    0.16 * k
  )} 75%, ${rgba(color, 0)} 100%)`;
}

/* ------------------------------------------------------------- item shapes */

function imageOf(item) {
  const pick = (v) => {
    if (!v) return null;
    if (typeof v === "string") return v.trim() || null;
    return typeof v.src === "string" && v.src ? v.src : null;
  };
  if (item && typeof item === "object" && "image" in item) return pick(item.image);
  return pick(item);
}

function offsetOf(item) {
  if (item && typeof item === "object" && "offsetY" in item) {
    return typeof item.offsetY === "number" && isFinite(item.offsetY) ? item.offsetY : 0;
  }
  return 0;
}

/** Average colour of a picture, weighted toward its saturated pixels (a flat
 * mean of every pixel comes back mud). Kept off the displayed <img>: this one
 * asks for CORS, and a host that will not grant it should cost us a palette,
 * not the picture itself. */
function sampleTint(src, proxy, retried) {
  return new Promise((resolve) => {
    const probe = new window.Image();
    probe.crossOrigin = "anonymous";
    probe.onerror = () => {
      // A host that sends no CORS header still shows its picture here (the
      // <img> needs no header), but its colour cannot be read. Retry the
      // reading through the proxy so the room still takes the picture's colour.
      const via = retried ? "" : proxied(src, proxy);
      if (via) sampleTint(via, proxy, true).then(resolve);
      else resolve(null);
    };
    probe.onload = () => {
      try {
        const size = 12;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(probe, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;
        let r = 0;
        let g = 0;
        let b = 0;
        let weight = 0;
        for (let i = 0; i < data.length; i += 4) {
          const max = Math.max(data[i], data[i + 1], data[i + 2]);
          const min = Math.min(data[i], data[i + 1], data[i + 2]);
          const w = (max - min) / 255 + SAMPLE_FLOOR;
          r += data[i] * w;
          g += data[i + 1] * w;
          b += data[i + 2] * w;
          weight += w;
        }
        if (weight <= 0) {
          resolve(null);
          return;
        }
        resolve(toHex({ r: r / weight, g: g / weight, b: b / weight, a: 1 }));
      } catch {
        // A picture served without CORS headers taints the canvas and reading
        // it throws. The room then stays on the frame's own Background.
        resolve(null);
      }
    };
    probe.src = src;
  });
}

/** Sampled palettes outlive a mount, so changing a control does not send every
 * picture back through the canvas. */
const tintCache = new Map();

/* -------------------------------------------------------------- component */

export default function DepthGallery({
  images = DEFAULT_IMAGES,
  background = "#000000",
  depth = 5,
  spread = 5,
  cardWidth = 420,
  cardHeight = 520,
  radius = 4,
  moodStrength = 7,
  moodBlobSize = 5,
  moodGrain = 3,
  parallaxPointer = 5,
  parallaxBreath = 5,
  parallaxDrift = 5,
  sensitivity = 5,
  smoothing = 6,
  scrollLock = true,
  imageProxy = DEFAULT_IMAGE_PROXY,
  style,
}) {
  const containerRef = useRef(null);
  const groundRef = useRef(null);
  const plateNodes = useRef([]);
  const target = useRef(0);
  const current = useRef(0);
  const pointerTarget = useRef({ x: 0, y: 0 });

  const [tints, setTints] = useState({});
  const [grain, setGrain] = useState(null);
  const [failed, setFailed] = useState(() => new Set());
  const [box, setBox] = useState({ w: 0, h: 0 });
  const proxyRef = useRef(imageProxy);
  proxyRef.current = imageProxy;

  // Measure the frame so plates can shrink to fit small screens.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setBox({ w: r.width, h: r.height });
    const ro = new ResizeObserver(([entry]) =>
      setBox({ w: entry.contentRect.width, h: entry.contentRect.height })
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const k = box.w && box.h ? Math.min(1, box.w / (cardWidth * FIT), box.h / (cardHeight * FIT)) : 1;
  const cw = Math.max(1, cardWidth * k);
  const ch = Math.max(1, cardHeight * k);

  /* ---- each plate's picture: its own URL, else a built-in one if that failed */
  const slots = useMemo(() => {
    const list = Array.isArray(images) && images.length ? images : FALLBACK_IMAGES;
    return list.map((item, i) => {
      const want = imageOf(item);
      const backup = FALLBACK_IMAGES[i % FALLBACK_IMAGES.length].src;
      const src = [want, backup].find((s) => s && !failed.has(s)) || null;
      return { src, offsetY: offsetOf(item), index: i };
    });
  }, [images, failed]);

  const sourceKey = slots.map((s) => s.src || "").join("|");

  /* ---- every picture's colour has to come off the picture itself */
  useEffect(() => {
    const sources = slots.map((s) => s.src).filter((s, i, a) => s && a.indexOf(s) === i);
    if (!sources.length) return;
    let alive = true;

    const cached = {};
    sources.forEach((src) => {
      const hit = tintCache.get(src);
      if (hit) cached[src] = hit;
    });
    if (Object.keys(cached).length) setTints((prev) => ({ ...prev, ...cached }));

    sources
      .filter((src) => !tintCache.has(src))
      .forEach((src) => {
        sampleTint(src, proxyRef.current).then((hex) => {
          if (!hex) return;
          tintCache.set(src, hex);
          if (!alive) return;
          setTints((prev) => (prev[src] === hex ? prev : { ...prev, [src]: hex }));
        });
      });

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceKey]);

  /* ---- grain tile. Built in an effect, never during render. */
  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.width = GRAIN_TILE;
    canvas.height = GRAIN_TILE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const noise = ctx.createImageData(GRAIN_TILE, GRAIN_TILE);
    for (let i = 0; i < noise.data.length; i += 4) {
      const value = Math.round(Math.random() * 255);
      noise.data[i] = value;
      noise.data[i + 1] = value;
      noise.data[i + 2] = value;
      noise.data[i + 3] = 255;
    }
    ctx.putImageData(noise, 0, 0);
    setGrain(canvas.toDataURL());
  }, []);

  /* ---- the plates */
  const plates = useMemo(() => {
    const list = slots.map((slot) => {
      const tint = parseColor(
        slot.src ? tints[slot.src] : PLACEHOLDER_TINTS[slot.index % PLACEHOLDER_TINTS.length],
        NEUTRAL_TINT
      );
      return {
        src: slot.src,
        fill: slot.src ? null : placeholderFill(tint),
        offsetY: slot.offsetY,
        mood: moodFromTint(tint),
      };
    });
    // The dissolve is always between two plates, so a list of one is given a
    // second copy of itself to fly into.
    return list.length === 1 ? [list[0], { ...list[0] }] : list;
  }, [slots, tints]);

  /* ---- derived motion: abstract 0–10 scales mapped to real units */
  const perspective = Math.max(cw, 120) * PERSPECTIVE_RATIO;
  const gap = perspective * (GAP_MIN + (clamp(depth, 0, 10) / 10) * GAP_RANGE);
  // Card Width is what the focused plate measures on screen, so the plate is
  // cut oversize by exactly the perspective divide it is about to take.
  const scaleK = (perspective + gap) / perspective;
  const plateWidth = cw * scaleK;
  const plateHeight = ch * scaleK;
  const wheelToSlot =
    (WHEEL_MIN + (clamp(sensitivity, 0, 10) / 10) * WHEEL_RANGE) / WHEEL_SPAN;

  // Everything the animation frame needs, refreshed on every render so the
  // loop never has to be rebuilt when a control changes.
  const frame = useRef(null);
  frame.current = {
    plates,
    count: plates.length,
    gap,
    scaleK,
    spreadPx: (clamp(spread, 0, 10) / 10) * SPREAD_RANGE * cw,
    ease: 0.16 - (clamp(smoothing, 0, 10) / 10) * 0.135,
    wheelToSlot,
    dragToSlot: wheelToSlot * DRAG_GAIN,
    pointerAmount: (clamp(parallaxPointer, 0, 10) / 10) * 0.11 * cw,
    driftAmount: (clamp(parallaxDrift, 0, 10) / 10) * 0.035 * ch,
    breathTilt: (clamp(parallaxBreath, 0, 10) / 5) * BREATH_TILT_DEG,
    breathScale: (clamp(parallaxBreath, 0, 10) / 5) * BREATH_SCALE,
    ground: parseColor(background, { r: 255, g: 255, b: 255, a: 1 }),
    moodStrength: clamp(moodStrength, 0, 10) / 10,
    blob1Radius: BLOB1_RADIUS * (0.5 + clamp(moodBlobSize, 0, 10) / 10),
    blob2Radius: BLOB2_RADIUS * (0.5 + clamp(moodBlobSize, 0, 10) / 10),
    scrollLock,
  };

  /* ---- the frame loop */
  useEffect(() => {
    let raf = 0;
    let started = 0;
    let previous = current.current;
    let velocity = 0;
    let breath = 0;
    let drift = 0;
    const pointer = { x: 0, y: 0 };
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");

    // Put one plate at one slot of the corridor. Everything positional is read
    // off `slot` and `ahead`, never off the picture's index: the same picture
    // is a different place in the corridor on every lap.
    const place = (f, index, slot, opacity, ahead) => {
      const node = plateNodes.current[index];
      if (!node) return;
      const distance = ahead + VIEW_LEAD;
      const z = -distance * f.gap;
      const influence = opacity * (1 + distance * DEPTH_INFLUENCE);
      const side = wrap(slot, 2) === 0 ? -1 : 1;
      const x = side * f.spreadPx * f.scaleK + pointer.x * f.pointerAmount * influence;
      const y = pointer.y * f.pointerAmount * 0.5 * influence + drift * f.driftAmount;
      const lean = breath * opacity;
      const tiltX = -pointer.y * f.breathTilt * lean;
      const tiltY = pointer.x * f.breathTilt * lean;
      const pulse = 1 + f.breathScale * lean;

      node.style.visibility = "visible";
      node.style.opacity = opacity.toFixed(3);
      node.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, ${z.toFixed(
        2
      )}px) rotateX(${tiltX.toFixed(3)}deg) rotateY(${tiltY.toFixed(3)}deg) scale(${pulse.toFixed(4)})`;
    };

    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const f = frame.current;
      if (!f || f.count < 2) return;
      if (!started) started = now;
      const time = mq.matches ? 0 : now - started;

      current.current += (target.current - current.current) * f.ease;

      // Nothing bounds the scroll, so the position is folded back onto one lap
      // once it leaves it. Target and previous move by the same whole number
      // of laps, or the lerp would jump. An odd list folds on two laps rather
      // than one, so a plate never flips sides on the frame it lands.
      const span = f.count % 2 === 0 ? f.count : f.count * 2;
      if (current.current < -span || current.current > span) {
        const laps = Math.floor(current.current / span) * span;
        current.current -= laps;
        target.current -= laps;
        previous -= laps;
      }
      const position = current.current;

      // Velocity is measured on the rendered position, not the target, so a
      // flick the lerp is still catching up on keeps the corridor breathing.
      const raw = position - previous;
      previous = position;
      velocity += (raw - velocity) * VELOCITY_DAMPING;
      if (Math.abs(velocity) < 1e-6) velocity = 0;
      const calm = mq.matches ? 0 : 1; // "reduce motion": no lean, swell or drift
      const speed = clamp(Math.abs(velocity) / VELOCITY_MAX, 0, 1) * calm;
      const signed = clamp(velocity / VELOCITY_MAX, -1, 1) * calm;

      breath += (speed * BREATH_GAIN - breath) * BREATH_SMOOTHING;
      drift += (signed - drift) * DRIFT_SMOOTHING;
      pointer.x += (pointerTarget.current.x - pointer.x) * POINTER_SMOOTHING;
      pointer.y += (pointerTarget.current.y - pointer.y) * POINTER_SMOOTHING;

      const slot = Math.floor(position);
      const blend = position - slot;
      const focus = wrap(slot, f.count);
      const following = wrap(slot + 1, f.count);

      // Plates. Only the pair is ever painted; everything else is taken out of
      // the compositor rather than left at zero alpha.
      for (let i = 0; i < f.count; i += 1) {
        if (i === focus || i === following) continue;
        const node = plateNodes.current[i];
        if (!node || node.style.visibility === "hidden") continue;
        node.style.visibility = "hidden";
        node.style.opacity = "0";
      }
      place(f, focus, slot, 1 - blend, -blend);
      place(f, following, slot + 1, blend, 1 - blend);

      // The room: the picture's colour in focus, cross-faded with the next one
      // on the same fraction as the dissolve, travelling away from the flat
      // Background by Mood Strength. Two slow blobs drift over it.
      const ground = groundRef.current;
      if (ground) {
        const a = f.plates[focus]?.mood;
        const b = f.plates[following]?.mood;
        if (a && b) {
          const wash = mixRGB(f.ground, mixRGB(a.background, b.background, blend), f.moodStrength);
          const light1 = mixRGB(mixRGB(a.blob1, b.blob1, blend), wash, BLOB_SOFTEN);
          const light2 = mixRGB(mixRGB(a.blob2, b.blob2, blend), wash, BLOB_SOFTEN);
          const x1 = 0.3 + 0.12 * Math.sin(time * 0.00021);
          const y1 = 0.68 + 0.1 * Math.cos(time * 0.00017);
          const x2 = 0.72 + 0.1 * Math.cos(time * 0.00015);
          const y2 = 0.3 + 0.1 * Math.sin(time * 0.00023);
          ground.style.backgroundColor = cssColor(wash);
          ground.style.backgroundImage = `${blobLayer(
            light1,
            x1,
            y1,
            f.blob1Radius,
            f.moodStrength
          )}, ${blobLayer(light2, x2, y2, f.blob2Radius, f.moodStrength)}`;
        }
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  /* ---- wheel / trackpad. With scrollLock on, consumed over the component's
   * own bounds, so the page will not scroll past the section while the cursor
   * is inside it: there is no end of the corridor to hand the scroll back at. */
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const onWheel = (event) => {
      const f = frame.current;
      if (!f) return;
      if (f.scrollLock && event.cancelable) event.preventDefault();
      const delta =
        event.deltaMode === 1
          ? event.deltaY * 16
          : event.deltaMode === 2
            ? event.deltaY * window.innerHeight
            : event.deltaY;
      target.current += clamp(delta, -240, 240) * f.wheelToSlot;
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, []);

  /* ---- pointer drag */
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    let active = null;
    let lastY = 0;

    const onDown = (event) => {
      if (active !== null) return;
      active = event.pointerId;
      lastY = event.clientY;
      node.setPointerCapture(event.pointerId);
      node.style.cursor = "grabbing";
    };
    const onMove = (event) => {
      if (active !== event.pointerId) return;
      const f = frame.current;
      const dy = event.clientY - lastY;
      lastY = event.clientY;
      if (!f) return;
      // Dragging up pulls the corridor toward the viewer, so the camera
      // advances: the same sign a wheel-down gives.
      target.current -= dy * f.dragToSlot;
    };
    const onUp = (event) => {
      if (active !== event.pointerId) return;
      active = null;
      node.style.cursor = "grab";
      if (node.hasPointerCapture(event.pointerId)) node.releasePointerCapture(event.pointerId);
    };

    node.addEventListener("pointerdown", onDown);
    node.addEventListener("pointermove", onMove);
    node.addEventListener("pointerup", onUp);
    node.addEventListener("pointercancel", onUp);
    return () => {
      node.removeEventListener("pointerdown", onDown);
      node.removeEventListener("pointermove", onMove);
      node.removeEventListener("pointerup", onUp);
      node.removeEventListener("pointercancel", onUp);
    };
  }, []);

  /* ---- pointer parallax */
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const onMove = (event) => {
      const rect = node.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      pointerTarget.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      // Up is positive, matching the tilt it drives.
      pointerTarget.current.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    };
    const onLeave = () => {
      pointerTarget.current.x = 0;
      pointerTarget.current.y = 0;
    };
    node.addEventListener("pointermove", onMove);
    node.addEventListener("pointerleave", onLeave);
    return () => {
      node.removeEventListener("pointermove", onMove);
      node.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background,
        cursor: "grab",
        // vertical drags drive the corridor; horizontal pans stay with the page
        touchAction: "pan-x",
        userSelect: "none",
        WebkitUserSelect: "none",
        ...style,
      }}
    >
      {/* the room: flat ground, two drifting blobs */}
      <div
        ref={groundRef}
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: background,
          pointerEvents: "none",
        }}
      />

      {/* film grain: static, a function of position alone */}
      {grain && moodGrain > 0 ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${grain})`,
            backgroundSize: `${GRAIN_TILE}px ${GRAIN_TILE}px`,
            opacity: (clamp(moodGrain, 0, 10) / 10) * GRAIN_RANGE,
            mixBlendMode: "overlay",
            pointerEvents: "none",
          }}
        />
      ) : null}

      {/* the corridor */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          perspective: `${perspective}px`,
          perspectiveOrigin: "50% 50%",
          transformStyle: "preserve-3d",
          pointerEvents: "none",
        }}
      >
        {plates.map((plate, i) => (
          <div
            key={`plate-${i}-${plate.src || "fill"}`}
            ref={(el) => {
              plateNodes.current[i] = el;
            }}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: plateWidth,
              height: plateHeight,
              // Centred with margins, not a static translate(-50%, -50%): the
              // frame loop owns this element's `transform`.
              marginLeft: -plateWidth / 2,
              marginTop: -plateHeight / 2,
              borderRadius: Math.max(radius, 0) * scaleK,
              overflow: "hidden",
              background: plate.fill || undefined,
              backfaceVisibility: "hidden",
              visibility: "hidden",
              opacity: 0,
              willChange: "transform, opacity",
            }}
          >
            {plate.src ? (
              <img
                src={plate.src}
                alt=""
                draggable={false}
                onError={() =>
                  setFailed((prev) =>
                    prev.has(plate.src) ? prev : new Set(prev).add(plate.src)
                  )
                }
                style={{
                  width: "100%",
                  height: "100%",
                  display: "block",
                  objectFit: "cover",
                  // `cover` already overflows the box on one axis; this picks
                  // which part of that overflow you see, as a share of it.
                  objectPosition: `50% ${50 - (plate.offsetY / 250) * 50}%`,
                  pointerEvents: "none",
                }}
              />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
