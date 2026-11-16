import { useEffect, useRef } from "react";

/**
 * ZoomGallery — pictures that burst out of (or collapse into) the middle of the
 * frame, one after another, in a steady crowd. Every picture is born, hangs for
 * a moment, then zooms away, and the next is already on its way.
 *
 * Self-contained: copy this single file into any React (16.8+) project and
 * render <ZoomGallery />. No other packages, CSS or files needed (plain DOM, no
 * animation library). It fills 100% of its parent and scales its pictures with
 * the frame, up to 1920px and beyond, so give the parent a height, e.g.
 *   <div style={{ height: 700 }}><ZoomGallery /></div>
 * A picture that fails to load is swapped for a coloured placeholder, so the
 * flow never stalls.
 *
 * Two MODES:
 *   "straight"  each picture leaves the centre along its own ray: out, hold,
 *               away. Blank Area is the radius it starts from.
 *   "spiral"    each picture follows one of twenty curling paths through the
 *               centre. Direction sets the spin.
 *
 * Appear and Disappear each run "outToIn" (arrive from the edge / shrink away)
 * or "inToOut" (grow from the middle / burst past you), with their own easing.
 * Everything is timed on one clock, so Speed, hover slow-motion and Pause move
 * the whole scene together.
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

// Directions the pictures leave the middle in (percent positions round the frame).
const ZONES = [
  [18, 18], [82, 18], [18, 82], [82, 82], [32, 14], [50, 12], [68, 14],
  [32, 86], [50, 88], [68, 86], [14, 35], [14, 55], [14, 72], [86, 35],
  [86, 55], [86, 72], [28, 28], [72, 28], [28, 72], [72, 72], [42, 16],
  [58, 16], [42, 84], [58, 84], [16, 45], [84, 45],
];

// Picture shapes (relative sizes).
const SHAPES = [
  { w: 200, h: 200 }, { w: 240, h: 240 }, { w: 280, h: 280 },
  { w: 160, h: 250 }, { w: 180, h: 280 }, { w: 280, h: 165 },
  { w: 340, h: 195 }, { w: 220, h: 150 },
];

// Twenty spiral paths, drawn once: entry angle, spin, number of turns.
const SPIRALS = Array.from({ length: 20 }, () => ({
  start: Math.random() * Math.PI * 2,
  spin: Math.random() < 0.5 ? 1 : -1,
  turns: 1.2 + Math.random() * 0.8,
}));

// Easings. Each maps 0..1 to 0..1 (the "back" ones overshoot on purpose).
const bounceOut = (t) => {
  const n = 7.5625, d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
  return n * (t -= 2.625 / d) * t + 0.984375;
};
const EASE = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => 1 - (1 - t) * (1 - t),
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  cubicIn: (t) => t * t * t,
  cubicOut: (t) => 1 - Math.pow(1 - t, 3),
  cubicInOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  expoIn: (t) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
  expoOut: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  expoInOut: (t) =>
    t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
  circIn: (t) => 1 - Math.sqrt(1 - t * t),
  circOut: (t) => Math.sqrt(1 - Math.pow(t - 1, 2)),
  circInOut: (t) =>
    t < 0.5 ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2 : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2,
  backIn: (t) => 2.70158 * t * t * t - 1.70158 * t * t,
  backOut: (t) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2),
  backInOut: (t) => {
    const c = 1.70158 * 1.525;
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c + 1) * 2 * t - c)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c + 1) * (t * 2 - 2) + c) + 2) / 2;
  },
  bounceOut,
  bounceIn: (t) => 1 - bounceOut(1 - t),
};

const PLACEHOLDERS = [
  ["#ff7a59", "#ffc371"], ["#6a5cff", "#3fa9ff"], ["#12b886", "#a6f0c6"],
  ["#ff4d8d", "#ffb199"], ["#f5c542", "#f08a24"], ["#2dd4bf", "#3b82f6"],
  ["#a78bfa", "#f472b6"], ["#94a3b8", "#e2e8f0"],
];
const placeholder = (i) => {
  const [a, b] = PLACEHOLDERS[Math.abs(i) % PLACEHOLDERS.length];
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/>` +
    `<stop offset="1" stop-color="${b}"/></linearGradient></defs>` +
    `<rect width="400" height="300" fill="url(#g)"/>` +
    `<circle cx="300" cy="90" r="70" fill="#fff" fill-opacity=".18"/>` +
    `<circle cx="110" cy="230" r="110" fill="#000" fill-opacity=".10"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const urlOf = (it) =>
  typeof it === "string" ? it.trim() : it && typeof it.src === "string" ? it.src.trim() : "";

/* -------------------------------------------------------------- component */

/**
 * Ready-made looks. A variant is a starting point: it sets the values below in
 * one go, and anything you pass yourself still overrides it. "square" (the
 * default) is rounded square tiles filled edge to edge, flowing fast; "classic"
 * is mixed shapes, whole pictures, a calmer pace.
 */
export const VARIANTS = {
  square: {},
  classic: {
    imageScale: 2,
    shape: "mixed",
    imageFit: "contain",
    cornerRadius: 0,
    speed: 100,
  },
};

export default function ZoomGallery(props) {
  // `variant` picks a look from VARIANTS; anything else you pass overrides it.
  return <ZoomGalleryView {...VARIANTS[props.variant]} {...props} />;
}

function ZoomGalleryView({
  variant = "square",
  images = DEFAULT_IMAGES,
  background = "#000000",
  mode = "straight",
  direction = "clockwise",
  appearStyle = "outToIn",
  appearDuration = 2,
  holdTime = 2,
  appearEase = "easeInOut",
  fadeIn = 100,
  disappearStyle = "outToIn",
  disappearDuration = 1,
  disappearEase = "easeInOut",
  fadeOut = 100,
  imageScale = 3,
  blankArea = 45,
  crowdDensity = 10,
  crowdDelay = 0,
  shape = "square",
  imageFit = "cover",
  imageOrder = "random",
  fluidSize = true,
  peakScale = 100,
  burstZoom = 100,
  travel = 100,
  spiralTurns = 100,
  spiralFlow = 12,
  cornerRadius = 15,
  borderWidth = 0,
  borderColor = "#FFFFFF",
  shadow = 0,
  tileBackground = "",
  maxOpacity = 100,
  depthDim = 0,
  tilt = 0,
  spin = 0,
  speed = 196,
  hoverSlow = 0,
  playing = true,
  dotGrid = 6,
  dotSize = 40,
  dotColor = "#FFFFFF",
  vignette = 0,
  style,
}) {
  const rootRef = useRef(null);
  const layerRef = useRef(null);

  // The engine reads the latest props from here every frame, so edits apply
  // at once (to pictures already in flight where it makes sense, to the next
  // ones otherwise) and the loop never restarts.
  const cfg = useRef({});
  cfg.current = {
    images, background, mode, direction, appearStyle, appearDuration, holdTime,
    appearEase, fadeIn, disappearStyle, disappearDuration, disappearEase, fadeOut,
    imageScale, blankArea, crowdDensity, crowdDelay, shape, imageFit, imageOrder,
    fluidSize, peakScale, burstZoom, travel, spiralTurns, spiralFlow, cornerRadius,
    borderWidth, borderColor, shadow, tileBackground, maxOpacity, depthDim, tilt,
    spin, speed, hoverSlow, playing,
  };

  const hovering = useRef(false);

  useEffect(() => {
    const root = rootRef.current;
    const layer = layerRef.current;
    if (!root || !layer) return;

    const tiles = [];
    const size = { w: root.clientWidth || 800, h: root.clientHeight || 600 };
    const recent = [];
    let seq = 0;
    let zone = 0;
    let z = 1;
    let clock = 0;
    let lastSpawn = -Infinity;
    let batch = 0;
    let nextBatchAt = 0;
    let last = performance.now();
    let raf = 0;
    const cache = new Map();

    const ro = new ResizeObserver(() => {
      size.w = root.clientWidth || size.w;
      size.h = root.clientHeight || size.h;
    });
    ro.observe(root);

    const pool = () => {
      const list = (Array.isArray(cfg.current.images) ? cfg.current.images : []).map(urlOf).filter(Boolean);
      return list.length ? list : DEFAULT_IMAGES.map(urlOf);
    };

    // Warm the browser cache so a picture is ready the moment it is wanted.
    const preload = () => {
      pool().forEach((src) => {
        if (cache.has(src)) return;
        const im = new Image();
        im.referrerPolicy = "no-referrer";
        im.src = src;
        cache.set(src, im);
      });
    };

    const nextImage = () => {
      const p = pool();
      if (cfg.current.imageOrder === "sequential") return p[seq++ % p.length];
      let free = p.filter((s) => !recent.includes(s));
      if (!free.length) {
        recent.length = 0;
        free = p;
      }
      const s = pick(free);
      recent.push(s);
      if (recent.length > Math.max(3, p.length - 1)) recent.shift();
      return s;
    };

    /* One tile's whole life is planned up front as three segments (appear,
       hold, leave) of position and scale, so it can be sampled at any age. */
    const plan = (t, c, k) => {
      const entry = Math.max(0.01, c.appearDuration);
      const hold = Math.max(0, c.holdTime);
      const exit = Math.max(0.01, c.disappearDuration);
      const aIn = c.appearStyle === "inToOut";
      const dOut = c.disappearStyle === "inToOut";
      const peak = rand(0.7, 1.1) * (c.peakScale / 100);
      const s0 = rand(0.1, 0.4);
      const s3 = rand(3.0, 4.5) * (c.burstZoom / 100);
      const fadeDur = exit * (c.fadeOut / 100);
      const base = { entry, hold, exit, fadeDur, entryEase: EASE[c.appearEase] || EASE.easeInOut,
        exitEase: EASE[c.disappearEase] || EASE.easeInOut, peak };

      if (c.mode === "spiral") {
        const path = pick(SPIRALS);
        const R = Math.hypot(size.w / 2, size.h / 2) * 1.1;
        const spinDir = c.direction === "clockwise" ? 1 : c.direction === "anticlockwise" ? -1 : path.spin;
        const startR = aIn ? 0 : R;
        const endR = dOut ? R : 0;
        const midR = R * (c.blankArea / 100);
        const mid = pick([0.45, 0.5, 0.55]);
        const turns = path.turns * (c.spiralTurns / 100);
        const at = (u) => {
          const r = u <= mid ? startR + (midR - startR) * (u / mid) : midR + (endR - midR) * ((u - mid) / (1 - mid));
          const a = path.start + spinDir * u * turns * Math.PI * 2;
          return [Math.cos(a) * r, Math.sin(a) * r];
        };
        return { ...base, spiral: true, at, aIn, flow: c.spiralFlow / 100,
          scaleAt: (u) => (aIn ? peak * u : peak * (1 - u)) };
      }

      const exitScale = dOut ? s3 : 0.08;
      const sign = dOut ? 1 : -1;
      const entryD = rand(80, 140) * k * (c.travel / 100);
      const exitD = rand(160, 260) * k * (c.travel / 100);
      const ca = t.cos, sa = t.sin;
      const f = 0.15; // how far the slow drift goes along the way out
      let A, B, C;
      if (aIn) {
        const x1 = ca * entryD, y1 = sa * entryD;
        const x2 = x1 + sign * ca * exitD, y2 = y1 + sign * sa * exitD;
        const xD = x1 + (x2 - x1) * f, yD = y1 + (y2 - y1) * f;
        const sD = peak + (exitScale - peak) * f;
        A = [{ x: 0, y: 0, s: s0 }, { x: x1, y: y1, s: peak }];
        B = [A[1], { x: xD, y: yD, s: sD }];
        C = [B[1], { x: x2, y: y2, s: exitScale }];
      } else {
        const sx = ca * entryD * 2.5, sy = sa * entryD * 2.5;
        const ex = sign * ca * exitD, ey = sign * sa * exitD;
        const sD = peak + (exitScale - peak) * f;
        A = [{ x: sx, y: sy, s: s3 }, { x: 0, y: 0, s: peak }];
        B = [A[1], { x: ex * f, y: ey * f, s: sD }];
        C = [B[1], { x: ex, y: ey, s: exitScale }];
      }
      return { ...base, A, B, C };
    };

    // Position, scale and opacity of a planned tile at a given age.
    const sample = (p, age) => {
      const total = p.entry + p.hold + p.exit;
      let x, y, s, o;
      if (p.spiral) {
        const tt = clamp(age / total, 0, 1);
        const u = clamp(tt + Math.sin(tt * Math.PI * 2) * p.flow, 0, 1);
        [x, y] = p.at(u);
        s = p.scaleAt(u);
      } else if (age < p.entry) {
        const e = p.entryEase(age / p.entry);
        x = lerp(p.A[0].x, p.A[1].x, e); y = lerp(p.A[0].y, p.A[1].y, e); s = lerp(p.A[0].s, p.A[1].s, e);
      } else if (age < p.entry + p.hold) {
        const e = (age - p.entry) / p.hold;
        x = lerp(p.B[0].x, p.B[1].x, e); y = lerp(p.B[0].y, p.B[1].y, e); s = lerp(p.B[0].s, p.B[1].s, e);
      } else {
        const e = p.exitEase(clamp((age - p.entry - p.hold) / p.exit, 0, 1));
        x = lerp(p.C[0].x, p.C[1].x, e); y = lerp(p.C[0].y, p.C[1].y, e); s = lerp(p.C[0].s, p.C[1].s, e);
      }
      if (age < p.entry) {
        const span = Math.max(0.01, p.entry * (cfg.current.fadeIn / 100));
        o = clamp(p.entryEase(clamp(age / span, 0, 1)), 0, 1);
      } else if (age < p.entry + p.hold) o = 1;
      else {
        const since = age - p.entry - p.hold;
        o = p.fadeDur > 0 ? clamp(1 - p.exitEase(clamp(since / p.fadeDur, 0, 1)), 0, 1) : 1;
      }
      return [x, y, Math.max(0.001, s), o, total];
    };

    const spawn = () => {
      const c = cfg.current;
      const src = nextImage();
      if (!src) return;
      const k = c.fluidSize ? clamp(Math.sqrt(size.w * size.h) / 800, 0.5, 1.5) : 1;

      let shapes = SHAPES;
      if (c.shape === "square") shapes = SHAPES.filter((s) => s.w === s.h);
      else if (c.shape === "landscape") shapes = SHAPES.filter((s) => s.w > s.h);
      else if (c.shape === "portrait") shapes = SHAPES.filter((s) => s.h > s.w);
      const sh = pick(shapes);
      const user = 0.125 + ((clamp(c.imageScale, 1, 20) - 1) / 19) * 4.875;
      const eff = Math.min(user * k, size.w / sh.w, size.h / sh.h);
      const w = Math.round(sh.w * eff);
      const h = Math.round(sh.h * eff);

      const zn = ZONES[zone++ % ZONES.length];
      const ang = Math.atan2(zn[1] - 50, zn[0] - 50) + rand(-0.25, 0.25) + rand(-0.3, 0.3);
      const cos = Math.cos(ang), sin = Math.sin(ang);
      const rad = c.mode === "spiral" ? 0 : (c.blankArea / 100) * Math.hypot(size.w / 2, size.h / 2);
      const cx = size.w / 2 + cos * rad;
      const cy = size.h / 2 + sin * rad;

      const el = document.createElement("div");
      el.style.cssText =
        `position:absolute;left:${cx - w / 2}px;top:${cy - h / 2}px;width:${w}px;height:${h}px;` +
        `overflow:hidden;pointer-events:none;will-change:transform,opacity;opacity:0;z-index:${z++};` +
        `transform-origin:center center;box-sizing:border-box;`;
      const im = document.createElement("img");
      im.alt = "";
      im.decoding = "async";
      im.referrerPolicy = "no-referrer";
      im.draggable = false;
      im.style.cssText = "width:100%;height:100%;display:block;";

      const t = { el, im, w, h, cos, sin, k, age: 0, ready: false, born: clock, plan: null, rot: rand(-1, 1), rot0: 0, dead: false };
      const begin = () => {
        if (t.ready || t.dead) return;
        t.ready = true;
        t.plan = plan(t, cfg.current, k);
      };
      let swapped = false;
      im.onerror = () => {
        if (swapped) return;
        swapped = true;
        im.style.objectFit = "cover";
        im.src = placeholder(seq++ + zone);
      };
      im.onload = begin;
      im.src = src;
      el.appendChild(im);
      layer.appendChild(el);
      tiles.push(t);
    };

    const remove = (i) => {
      tiles[i].dead = true;
      tiles[i].el.remove();
      tiles.splice(i, 1);
    };

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const c = cfg.current;
      const raw = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!c.playing) return;
      const slow = hovering.current ? 1 - clamp(c.hoverSlow, 0, 100) / 100 : 1;
      const dt = raw * (c.speed / 100) * slow;
      clock += dt;

      // Spawning, paced so about `crowdDensity` tiles are alive at once.
      const target = Math.max(1, Math.round(c.crowdDensity));
      if (c.crowdDelay <= 0) {
        const life = Math.max(0.05, c.appearDuration) + Math.max(0, c.holdTime) + Math.max(0.05, c.disappearDuration);
        if (clock - lastSpawn >= Math.max(0.02, life / target)) {
          spawn();
          lastSpawn = clock;
        }
      } else if (clock >= nextBatchAt && batch < target && clock - lastSpawn >= 0.05) {
        spawn();
        batch++;
        lastSpawn = clock;
        if (batch >= target) {
          nextBatchAt = clock + c.crowdDelay;
          batch = 0;
        }
      }

      // Look of every tile, refreshed so edits show on the ones in flight.
      const shadowPx = c.shadow / 100;
      for (let i = tiles.length - 1; i >= 0; i--) {
        const t = tiles[i];
        if (!t.ready) {
          // A picture that never arrives is dropped rather than left waiting.
          if (clock - t.born > 12) remove(i);
          continue;
        }
        t.age += dt;
        const [x, y, s, o, total] = sample(t.plan, t.age);
        if (t.age >= total) {
          remove(i);
          continue;
        }
        const st = t.el.style;
        const rot = t.rot * c.tilt + (c.spin * t.age) * (t.rot < 0 ? -1 : 1);
        st.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) scale(${s.toFixed(4)}) rotate(${rot.toFixed(2)}deg)`;
        const dim = 1 - (c.depthDim / 100) * (1 - clamp(s, 0, 1));
        st.opacity = (o * (c.maxOpacity / 100) * dim).toFixed(3);
        st.borderRadius = `${c.cornerRadius}px`;
        st.background = c.tileBackground || c.background;
        st.border = c.borderWidth > 0 ? `${c.borderWidth}px solid ${c.borderColor}` : "none";
        st.boxShadow = shadowPx > 0 ? `0 ${(24 * shadowPx).toFixed(0)}px ${(60 * shadowPx).toFixed(0)}px rgba(0,0,0,${(0.55 * shadowPx).toFixed(2)})` : "none";
        if (t.im.style.objectFit !== "cover") t.im.style.objectFit = c.imageFit;
      }
    };

    preload();
    raf = requestAnimationFrame((n) => {
      last = n;
      frame(n);
    });

    // Warm new pictures when the list is edited.
    const preloadTimer = setInterval(preload, 1500);
    const leave = () => (hovering.current = false);
    const enter = () => (hovering.current = true);
    root.addEventListener("pointerenter", enter);
    root.addEventListener("pointerleave", leave);

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(preloadTimer);
      ro.disconnect();
      root.removeEventListener("pointerenter", enter);
      root.removeEventListener("pointerleave", leave);
      tiles.forEach((t) => (t.dead = true));
      layer.replaceChildren();
    };
  }, []);

  const dots = clamp(dotGrid, 0, 100) / 100;
  const vig = clamp(vignette, 0, 100) / 100;

  return (
    <div
      ref={rootRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: 160,
        background,
        overflow: "hidden",
        ...style,
      }}
    >
      <div ref={layerRef} style={{ position: "absolute", inset: 0 }} />
      {dots > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: dots,
            pointerEvents: "none",
            zIndex: 2147483000,
            backgroundImage: `radial-gradient(circle, ${dotColor} 1px, transparent 1px)`,
            backgroundSize: `${Math.max(8, dotSize)}px ${Math.max(8, dotSize)}px`,
          }}
        />
      )}
      {vig > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 2147483001,
            background: `radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,${vig}) 100%)`,
          }}
        />
      )}
    </div>
  );
}
