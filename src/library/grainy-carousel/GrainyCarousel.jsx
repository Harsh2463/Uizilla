import { useEffect, useRef } from "react";

/**
 * GrainyCarousel — an endless strip of pictures that dissolves into grain as it
 * reaches the left and right edges of the frame. Drag it, flick it, click
 * either side to step, or let it run.
 *
 * Self-contained: copy this single file into any React (16.8+) project and
 * render <GrainyCarousel />. No other packages, CSS or files needed.
 * It fills 100% of its parent and scales the cards down to fit small screens,
 * so give the parent a height, e.g.
 *   <div style={{ height: 600 }}><GrainyCarousel /></div>
 * Missing or broken images automatically fall back to the built-in list.
 *
 * How it works: the strip is drawn on a 2D canvas, then pushed through one
 * WebGL pass that warps and darkens the two edge bands with animated noise.
 * If WebGL is unavailable the plain 2D strip is shown instead.
 */

/* ---------------------------------------------------------------- constants */

/** Px of strip travel per px of pointer travel at Drag 0, and at Drag 100. 1:1 is Drag 25. */
const DRAG_GAIN_MIN = 0.5;
const DRAG_GAIN_MAX = 2.5;
/** Px of pointer travel that turns a click into a drag. */
const CLICK_SLOP = 5;
/** Strip travel at Speed 50 in smooth mode, px/sec. */
const SMOOTH_AT_50 = 90;
/** Seconds between steps at Speed 50 in snap mode. */
const SNAP_INTERVAL_AT_50 = 5;
/** Noise rate at Grain Speed 50. */
const NOISE_AT_50 = 0.15;
/** Per-frame lerp at Damping 100. */
const DAMP_AT_100 = 0.5;
/** Grain band width scales with the frame: this fraction of it on a tiny frame,
 *  rising in a straight line to the full width at 1920px, and no further. */
const GRAIN_MIN_SCALE = 0.3;
const GRAIN_MAX_FRAME = 1920;

const UNSPLASH = (id) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&h=800&q=80`;

// Built-in images: used by default, and for any entry that is empty or fails to load.
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

// Last resort when even the built-in photos cannot load (offline, blocked):
// an inline numbered gradient, which can never fail.
const DUMMY_PAIRS = [
  ["FF7A45", "FFB199"],
  ["4D7CFE", "9BC1FF"],
  ["16C79A", "9BE7C4"],
  ["FFC53D", "FFE9A8"],
  ["B15CFF", "E0B8FF"],
  ["FF4D7E", "FFB3C7"],
];
const dummyImage = (i, w = 1200, h = 800) => {
  const [a, b] = DUMMY_PAIRS[i % DUMMY_PAIRS.length];
  const n = String(i + 1).padStart(2, "0");
  return (
    `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'%3E` +
    `%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E` +
    `%3Cstop offset='0' stop-color='%23${a}'/%3E%3Cstop offset='1' stop-color='%23${b}'/%3E` +
    `%3C/linearGradient%3E%3C/defs%3E%3Crect width='${w}' height='${h}' fill='url(%23g)'/%3E` +
    `%3Ctext x='50%25' y='50%25' dy='.35em' text-anchor='middle' ` +
    `font-family='Helvetica, Arial, sans-serif' font-size='${Math.round(Math.min(w, h) * 0.34)}' ` +
    `font-weight='700' fill='rgba(255,255,255,0.9)'%3E${n}%3C/text%3E%3C/svg%3E`
  )
    .replace(/ /g, "%20")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29");
};

/* ------------------------------------------------------------------ shaders */

const VERT = `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
}`;

// highp: the domain (uv * grainScale) walks far enough that mediump would
// quantise the noise into bands.
const FRAG = `
precision highp float;

uniform sampler2D tDiffuse;
uniform float uTime;
uniform vec2  uResolution;
uniform float uEdgeWidth;
uniform float uNoiseSpeed;
uniform float uGrainScale;
uniform float uGrainAmount;
uniform float uGrainHeight; // 0..1, how far the grain spreads up and down

varying vec2 vUv;

vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m  = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m * m * m * m;
  vec3 x  = 2.0 * fract(p * C.www) - 1.0;
  vec3 h  = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * snoise(p);
    p  = p * 2.1 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

void main() {
  float leftBand  = 1.0 - smoothstep(0.0, uEdgeWidth, vUv.x);
  float rightBand = smoothstep(1.0 - uEdgeWidth, 1.0, vUv.x);
  float xMask     = max(leftBand, rightBand);

  if (xMask <= 0.001) {
      gl_FragColor = texture2D(tDiffuse, vUv);
      return;
  }

  float mask = pow(xMask, 3.0) * 3.0;
  float ar = uResolution.x / max(uResolution.y, 1.0);

  float t = uTime * uNoiseSpeed * (uGrainScale * 0.015);

  vec2 noiseUV = vec2(vUv.x * ar, vUv.y) * uGrainScale;

  float dx = fbm(noiseUV + vec2(t, t * 0.5)) * uGrainAmount;
  float dy = fbm(noiseUV + vec2(-t * 0.3, t * 0.8)) * uGrainAmount * uGrainHeight;

  vec2 warpedUV = vUv + vec2(dx, dy) * mask;

  vec4 col = vec4(0.0);
  if (warpedUV.x >= 0.0 && warpedUV.x <= 1.0 && warpedUV.y >= 0.0 && warpedUV.y <= 1.0) {
      col = texture2D(tDiffuse, warpedUV);
  }

  float colorDecay = max(smoothstep(1.0, 0.1, mask / 6.0), 0.1);

  gl_FragColor = vec4(col.rgb * colorDecay, col.a);
}`;

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

/* ------------------------------------------------------------------ helpers */

// CSS-style cubic-bezier easing, so the snap step needs no animation library.
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sx = (t) => ((ax * t + bx) * t + cx) * t;
  const sy = (t) => ((ay * t + by) * t + cy) * t;
  const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = sx(t) - x;
      if (Math.abs(e) < 1e-5) break;
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    return sy(Math.min(1, Math.max(0, t)));
  };
}
const EASE_OUT = bezier(0, 0, 0.58, 1);

/**
 * Cover-crop `img` into the rounded box at (boxX, boxY, boxW, boxH).
 * `pct` is a percent of the maximum radius (half the short side); 100 is a
 * true circle at any aspect.
 */
function drawCover(ctx, img, boxX, boxY, boxW, boxH, pct) {
  const t = Math.max(0, Math.min(100, pct)) / 100;
  const short = Math.min(boxW, boxH);
  const x = boxX + (t * (boxW - short)) / 2;
  const y = boxY + (t * (boxH - short)) / 2;
  const w = boxW - t * (boxW - short);
  const h = boxH - t * (boxH - short);
  const r = (t * short) / 2;
  if (!img.complete || !img.naturalWidth) return;
  const imgRatio = img.naturalWidth / img.naturalHeight;
  const boxRatio = w / h;
  let sx, sy, sw, sh;
  if (imgRatio > boxRatio) {
    sh = img.naturalHeight;
    sw = sh * boxRatio;
    sx = (img.naturalWidth - sw) / 2;
    sy = 0;
  } else {
    sw = img.naturalWidth;
    sh = sw / boxRatio;
    sx = 0;
    sy = (img.naturalHeight - sh) / 2;
  }
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  ctx.restore();
}

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
    console.warn("GrainyCarousel shader:", gl.getShaderInfoLog(s));
  return s;
}

// Turns the props into the units the frame loop works in.
function resolve(p) {
  const list = p.images && p.images.length ? p.images : FALLBACK_IMAGES;
  const srcs = list.map((it) => (typeof it === "string" ? it : it?.src) || "");
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  return {
    srcs,
    mediaKey: `${p.imageProxy}::${srcs.join("|")}`,
    imageProxy: p.imageProxy,
    cardWidth: Math.max(1, Math.round(p.cardWidth)),
    cardHeight: Math.max(1, Math.round(p.cardHeight)),
    gap: p.gap,
    rounded: p.rounded,
    mode: p.mode,
    duration: Math.max(0, p.duration),
    dragGain:
      DRAG_GAIN_MIN +
      (clamp(p.drag, 0, 100) / 100) * (DRAG_GAIN_MAX - DRAG_GAIN_MIN),
    smoothRate: (p.speed / 50) * SMOOTH_AT_50,
    snapInterval: p.speed <= 0 ? Infinity : SNAP_INTERVAL_AT_50 * (50 / p.speed),
    damping: (clamp(p.damping, 1, 100) / 100) * DAMP_AT_100,
    zoom: clamp(p.zoom, 0, 100) / 100,
    noiseSpeed: (p.grainSpeed / 50) * NOISE_AT_50,
    grainWidth: clamp(p.grainWidth, 0, 150) / 100,
    grainHeight: clamp(p.grainHeight, 0, 100) / 100,
    grainAmount: clamp(p.grainAmount, 0, 100) / 100,
    grainScale: p.grainScale,
  };
}

/* ----------------------------------------------------------------- component */

export default function GrainyCarousel({
  images = FALLBACK_IMAGES,
  background = "#0B0A10",
  cardWidth = 711,
  cardHeight = 400,
  gap = 20,
  rounded = 8,
  speed = 155,
  mode = "snap",
  duration = 0.5,
  drag = 25,
  damping = 60,
  zoom = 5,
  imageProxy = DEFAULT_IMAGE_PROXY,
  grainWidth = 40,
  grainHeight = 50,
  grainAmount = 10,
  grainScale = 250,
  grainSpeed = 50,
  style,
}) {
  const hostRef = useRef(null);
  const glCanvasRef = useRef(null);
  const fallbackRef = useRef(null);
  const reducedRef = useRef(false);

  // Every live input is read from this ref inside the loop, so props can change
  // without rebuilding the WebGL context.
  const live = useRef(null);
  live.current = resolve({
    images,
    cardWidth,
    cardHeight,
    gap,
    rounded,
    speed,
    mode,
    duration,
    drag,
    damping,
    zoom,
    grainWidth,
    grainHeight,
    grainAmount,
    grainScale,
    grainSpeed,
  });

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => (reducedRef.current = mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = glCanvasRef.current;
    const fallback = fallbackRef.current;
    if (!host || !canvas || !fallback) return;

    // The strip is composed here and uploaded as one texture.
    const strip = document.createElement("canvas");
    const stripCtx = strip.getContext("2d");

    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false });

    let prog = null;
    let tex = null;
    let uTime, uResolution, uEdgeWidth, uNoiseSpeed, uGrainScale, uGrainAmount, uGrainHeight;
    let posBuf = null;
    let uvBuf = null;
    let hasGL = false;

    if (gl) {
      prog = gl.createProgram();
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        hasGL = true;
        gl.useProgram(prog);
        // prettier-ignore
        const verts = new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]);
        // prettier-ignore
        const uvs = new Float32Array([0,0, 1,0, 0,1, 0,1, 1,0, 1,1]);
        posBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
        gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
        const aPos = gl.getAttribLocation(prog, "position");
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
        uvBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
        gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
        const aUv = gl.getAttribLocation(prog, "uv");
        gl.enableVertexAttribArray(aUv);
        gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0);
        uTime = gl.getUniformLocation(prog, "uTime");
        uResolution = gl.getUniformLocation(prog, "uResolution");
        uEdgeWidth = gl.getUniformLocation(prog, "uEdgeWidth");
        uNoiseSpeed = gl.getUniformLocation(prog, "uNoiseSpeed");
        uGrainScale = gl.getUniformLocation(prog, "uGrainScale");
        uGrainAmount = gl.getUniformLocation(prog, "uGrainAmount");
        uGrainHeight = gl.getUniformLocation(prog, "uGrainHeight");
        tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      }
    }
    canvas.style.opacity = hasGL ? "1" : "0";
    fallback.style.opacity = hasGL ? "0" : "1";

    // -- media ---------------------------------------------------------------
    // Images live in a variable, not state: a setState per load would re-render
    // the tree for nothing.
    let loaded = [];
    let mediaKey = "";
    const buildMedia = () => {
      mediaKey = live.current.mediaKey;
      loaded = live.current.srcs.map((src, i) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        // Try the entry itself, then a built-in photo, then an inline gradient.
        const tries = [
          src,
          proxied(src, live.current.imageProxy),
          FALLBACK_IMAGES[i % FALLBACK_IMAGES.length].src,
          dummyImage(i),
        ].filter((s, idx, a) => s && a.indexOf(s) === idx);
        let k = 0;
        img.onerror = () => {
          if (++k < tries.length) img.src = tries[k];
        };
        img.src = tries[0];
        return img;
      });
    };
    buildMedia();

    // -- sizing ----------------------------------------------------------------
    let vw = 1;
    let vh = 1;
    let dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      vw = Math.max(1, host.clientWidth);
      vh = Math.max(1, host.clientHeight);
      const bw = Math.round(vw * dpr);
      const bh = Math.round(vh * dpr);
      for (const c of [canvas, fallback, strip]) {
        c.width = bw;
        c.height = bh;
      }
      if (gl && hasGL) gl.viewport(0, 0, bw, bh);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    // -- interaction -----------------------------------------------------------
    let scrollX = 0;
    let targetX = 0;
    let snap = null; // { from, delta, t0, dur } while a step is animating
    let snapTimer = 0;
    let itemWidth = 1;
    let centerOffset = 0;
    const ptr = { active: false, id: -1, last: 0, x0: 0, y0: 0, click: true };

    const onDown = (e) => {
      ptr.active = true;
      snap = null;
      ptr.id = e.pointerId;
      ptr.last = e.clientX;
      ptr.x0 = e.clientX;
      ptr.y0 = e.clientY;
      ptr.click = true;
    };
    const onMove = (e) => {
      if (!ptr.active || e.pointerId !== ptr.id) return;
      targetX -= (e.clientX - ptr.last) * live.current.dragGain;
      ptr.last = e.clientX;
      snapTimer = 0;
      if (
        Math.abs(e.clientX - ptr.x0) > CLICK_SLOP ||
        Math.abs(e.clientY - ptr.y0) > CLICK_SLOP
      )
        ptr.click = false;
    };
    const onUp = (e) => {
      if (!ptr.active || e.pointerId !== ptr.id) return;
      ptr.active = false;
      if (!loaded.length || itemWidth <= 0) return;
      const current = Math.round((targetX + centerOffset) / itemWidth);
      if (ptr.click) {
        // Which picture was clicked, in the host's own untransformed coordinates.
        const clickX = e.target === host || host.contains(e.target) ? e.offsetX : vw / 2;
        const steps = Math.round((clickX - vw / 2) / itemWidth);
        targetX = (current + steps) * itemWidth - centerOffset;
        snapTimer = 0;
      } else if (live.current.mode === "snap") {
        targetX = current * itemWidth - centerOffset;
      }
    };
    const onWheel = (e) => {
      if (live.current.mode === "smooth") targetX += e.deltaX || e.deltaY;
    };
    host.addEventListener("pointerdown", onDown);
    // Released on window: a pointer that leaves mid-drag still resolves.
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    host.addEventListener("wheel", onWheel, { passive: true });

    // -- loop ------------------------------------------------------------------
    let raf = 0;
    let last = performance.now();
    let lastSig = "";
    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const c = live.current;

      if (c.mediaKey !== mediaKey) buildMedia();

      // Cards shrink on small frames so neighbours stay visible on a phone.
      // Full size whenever the frame is at least 1.5 cards wide.
      const k = Math.min(
        1,
        vw / (c.cardWidth * 1.5),
        vh / (c.cardHeight * 1.25)
      );
      const drawW = c.cardWidth * k;
      const drawH = c.cardHeight * k;
      itemWidth = drawW + c.gap * k;
      const total = Math.max(1, loaded.length * itemWidth);
      centerOffset = (vw - drawW) / 2;
      // Grain band on each side, as a share of the frame. It is a fraction of a
      // card's width, and it also narrows on smaller frames: 30% of its size on
      // a tiny frame, growing steadily to 100% at 1920px wide (no wider after).
      const frameScale =
        GRAIN_MIN_SCALE +
        (1 - GRAIN_MIN_SCALE) * Math.min(1, vw / GRAIN_MAX_FRAME);
      const edge = Math.min(1, Math.max(0.0005, (c.grainWidth * drawW * frameScale) / vw));

      if (!ptr.active && loaded.length && !reducedRef.current) {
        if (c.mode === "smooth") {
          targetX += c.smoothRate * k * dt;
        } else if (Number.isFinite(c.snapInterval)) {
          snapTimer += dt;
          if (snapTimer >= c.snapInterval) {
            const current = Math.round((targetX + centerOffset) / itemWidth);
            targetX = (current + 1) * itemWidth - centerOffset;
            snapTimer = 0;
            if (c.duration > 0) {
              snap = { from: scrollX, delta: targetX - scrollX, t0: now, dur: c.duration * 1000 };
            } else {
              snap = null;
              scrollX = targetX;
            }
          }
        }
      }

      if (snap) {
        const p = Math.min(1, (now - snap.t0) / snap.dur);
        scrollX = snap.from + snap.delta * EASE_OUT(p);
        if (p >= 1) snap = null;
      } else {
        // Smooth mode and every drag chase their target with a damping filter.
        const lf = 1 - Math.pow(1 - c.damping, dt * 60);
        scrollX += (targetX - scrollX) * lf;
      }

      let visualScale = 1;
      if (c.mode === "snap" && c.zoom > 0) {
        const nearest =
          Math.round((scrollX + centerOffset) / itemWidth) * itemWidth - centerOffset;
        let ratio = Math.min(Math.abs(scrollX - nearest) / (itemWidth / 2), 1);
        ratio = ratio * ratio * (3 - 2 * ratio);
        visualScale = 1 - ratio * c.zoom;
      }

      // --- compose the strip, only when something changed -------------------
      const ready = loaded.reduce((n, im) => n + (im.complete && im.naturalWidth ? 1 : 0), 0);
      const sig = [
        scrollX.toFixed(3), visualScale.toFixed(4), vw, vh, dpr,
        drawW, drawH, itemWidth, c.rounded, ready, loaded.length,
      ].join("|");
      if (stripCtx && sig !== lastSig) {
        lastSig = sig;
        stripCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        stripCtx.clearRect(0, 0, vw, vh);
        if (loaded.length) {
          stripCtx.save();
          if (visualScale !== 1) {
            stripCtx.translate(vw / 2, vh / 2);
            stripCtx.scale(visualScale, visualScale);
            stripCtx.translate(-vw / 2, -vh / 2);
          }
          const y = (vh - drawH) / 2;
          let wrapped = scrollX % total;
          if (wrapped < 0) wrapped += total;
          let x = -wrapped;
          const leftBound = -vw * 1.5;
          const rightBound = vw * 2.5;
          while (x < rightBound) {
            for (let i = 0; i < loaded.length; i++) {
              const px = x + i * itemWidth;
              if (px + drawW > leftBound && px < rightBound)
                drawCover(stripCtx, loaded[i], px, y, drawW, drawH, c.rounded);
            }
            x += total;
          }
          stripCtx.restore();
        }
        if (gl && hasGL) {
          gl.bindTexture(gl.TEXTURE_2D, tex);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, strip);
        } else {
          const fb = fallback.getContext("2d");
          if (fb) {
            fb.setTransform(1, 0, 0, 1, 0, 0);
            fb.clearRect(0, 0, fallback.width, fallback.height);
            fb.drawImage(strip, 0, 0);
          }
        }
      }

      // --- edge pass (the grain animates every frame) ------------------------
      if (gl && hasGL) {
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform1f(uTime, now * 0.001);
        gl.uniform2f(uResolution, canvas.width, canvas.height);
        gl.uniform1f(uEdgeWidth, edge);
        gl.uniform1f(uNoiseSpeed, reducedRef.current ? 0 : c.noiseSpeed);
        gl.uniform1f(uGrainScale, c.grainScale);
        gl.uniform1f(uGrainAmount, c.grainAmount);
        gl.uniform1f(uGrainHeight, c.grainHeight);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      host.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      host.removeEventListener("wheel", onWheel);
      if (gl && hasGL) {
        if (tex) gl.deleteTexture(tex);
        if (posBuf) gl.deleteBuffer(posBuf);
        if (uvBuf) gl.deleteBuffer(uvBuf);
        if (prog) gl.deleteProgram(prog);
      }
      // No loseContext(): getContext returns the same context per canvas, so a
      // StrictMode remount would reuse a force-lost one.
    };
  }, []);

  return (
    <div
      ref={hostRef}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        isolation: "isolate",
        cursor: "pointer",
        // vertical page scroll still works on touch; horizontal drags move the strip
        touchAction: "pan-y",
        userSelect: "none",
        WebkitUserSelect: "none",
        background,
        ...style,
      }}
    >
      <canvas
        ref={glCanvasRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />
      {/* Plain 2D copy of the strip, shown only where WebGL is missing. */}
      <canvas
        ref={fallbackRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: 0,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
