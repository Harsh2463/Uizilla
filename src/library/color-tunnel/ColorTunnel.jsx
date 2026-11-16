import { useEffect, useMemo, useRef, useState } from "react";

/**
 * ColorTunnel — rings of curved cards lining a tunnel and flowing out from the
 * vanishing point. Every card is a solid colour (with an optional soft blend
 * into the next colour) and carries a word that bends round the tunnel with it,
 * so the lettering curves exactly as the card does.
 *
 * Self-contained: copy this single file into any React (16.8+) project and
 * render <ColorTunnel />. No other packages, CSS or files needed (plain WebGL 2,
 * no three.js, no images to load). It fills 100% of its parent, so give the
 * parent a height, e.g.
 *   <div style={{ height: 640 }}><ColorTunnel /></div>
 *
 * `colors` is the palette the cards take turns in, and `texts` the words. Both
 * wrap round, and the word shifts one place each time the palette comes round,
 * so the same pairings do not repeat in lockstep. Move the pointer over it to
 * tilt the tunnel and slow it; press and hold to speed it up.
 */

/* ----------------------------------------------------------------- defaults */

export const DEFAULT_COLORS = [
  "#FF5A5F",
  "#FFB400",
  "#12B886",
  "#7B61FF",
  "#FF7AB6",
  "#22C1E6",
  "#F5D90A",
  "#3B82F6",
  "#FF8A3D",
  "#84CC16",
  "#B45CFF",
  "#14B8A6",
];

export const DEFAULT_TEXTS = [
  "Create",
  "Play",
  "Dream",
  "Build",
  "Explore",
  "Design",
  "Shine",
  "Bold",
  "Move",
  "Wonder",
  "Spark",
  "Flow",
];

/**
 * Ready-made looks. A variant is a starting point: it sets the values below in
 * one go, and any prop you pass yourself still wins over it. "night" is the
 * defaults of this file, so it needs nothing.
 */
export const VARIANTS = {
  night: {},
  // Pale grey room, six cards a ring, angular facets, boosted colour, grain and a vignette.
  studio: {
    background: "#bababa",
    textSize: 49,
    scale: 62,
    cardsPerRing: 6,
    gap: 2,
    rounded: 17,
    depthFade: 57,
    depthSpread: 100,
    gradient: 49,
    periodMs: 5400,
    spinDeg: 19,
    twist: 87,
    ringCount: 9,
    ringRatio: 154,
    nearRing: 225,
    fov: 63,
    vanishY: -50,
    fadeIn: 56,
    edgeShade: 74,
    rimOpacity: 11,
    rimWidth: 2,
    saturation: 200,
    hover: 98,
    hoverTilt: 9,
    pressBoost: 600,
    followMs: 670,
    segments: 4,
    grain: 40,
    vignette: 37,
  },
};

/* ------------------------------------------------------------------ helpers */

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const mod = (v, m) => ((v % m) + m) % m;

/** "#abc" or "#aabbcc" to [r, g, b] in 0..1. Anything else is mid grey. */
function parseHex(hex) {
  let h = String(hex || "").replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  if (Number.isNaN(n) || h.length !== 6) return [0.5, 0.5, 0.5];
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

const luma = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

function noiseUrl() {
  if (typeof document === "undefined") return "";
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d");
  if (!x) return "";
  const d = x.createImageData(128, 128);
  for (let i = 0; i < d.data.length; i += 4) {
    const v = Math.random() * 255;
    d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
    d.data[i + 3] = 255;
  }
  x.putImageData(d, 0, 0);
  return c.toDataURL();
}

/** Greedy word wrap into lines no wider than maxW. */
function wrapWords(ctx, text, maxW) {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [""];
  const lines = [];
  let line = words[0];
  for (let i = 1; i < words.length; i++) {
    const next = `${line} ${words[i]}`;
    if (ctx.measureText(next).width <= maxW) line = next;
    else {
      lines.push(line);
      line = words[i];
    }
  }
  lines.push(line);
  return lines;
}

/**
 * One word as a white-on-clear picture, sized to the card's own proportions so
 * the lettering is not stretched. It is laid over the card in the card's own
 * coordinates, which is what makes it follow the curve of the tunnel.
 */
function drawWord(text, aspect, o) {
  const W = 1024;
  const H = clamp(Math.round(W / aspect), 128, 1024);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const x = c.getContext("2d");
  if (!x) return c;
  const label = o.uppercase ? text.toUpperCase() : text;
  const maxW = W * 0.86;
  const maxH = H * 0.84;
  const family = o.fontFamily || "sans-serif";
  let size = H * clamp(o.textSize / 100, 0.05, 1);
  let lines = [label];
  for (let tries = 0; tries < 16; tries++) {
    x.font = `${o.fontWeight} ${size}px ${family}`;
    lines = wrapWords(x, label, maxW);
    const widest = Math.max(...lines.map((l) => x.measureText(l).width));
    if (widest <= maxW && lines.length * size * 1.08 <= maxH) break;
    size *= 0.9;
  }
  x.fillStyle = "#ffffff";
  x.textAlign = "center";
  x.textBaseline = "middle";
  const lh = size * 1.08;
  const top = H / 2 - ((lines.length - 1) * lh) / 2;
  lines.forEach((l, i) => x.fillText(l, W / 2, top + i * lh));
  return c;
}

/* --------------------------------------------------------------------- WebGL */

const VERT = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aUV;
uniform float uTh0;
uniform float uThW;
uniform float uZN;
uniform float uZF;
uniform mat3 uRot;
uniform float uF;
uniform float uAsp;
uniform vec2 uVP;
uniform vec2 uSize;
out vec2 vLocal;
out vec2 vUV;
out float vZ;
void main() {
    float th = uTh0 + aUV.x * uThW;
    float z = mix(uZN, uZF, aUV.y);
    vec3 p = uRot * vec3(cos(th), sin(th), z);
    vZ = z;
    vUV = aUV;
    vLocal = vec2((0.5 - aUV.x) * uSize.x, (0.5 - aUV.y) * uSize.y);
    const float n = 0.02;
    const float fa = 80.0;
    gl_Position = vec4(p.x * uF / uAsp + uVP.x * p.z, p.y * uF + uVP.y * p.z,
        (fa + n) / (fa - n) * p.z - 2.0 * fa * n / (fa - n), p.z);
}`;

const FRAG = `#version 300 es
precision highp float;
in vec2 vLocal;
in vec2 vUV;
in float vZ;
uniform sampler2D uTex;
uniform vec2 uSize;
uniform float uRad;
uniform vec3 uColA;
uniform vec3 uColB;
uniform float uGrad;
uniform vec3 uTextCol;
uniform float uTextOn;
uniform float uAlpha;
uniform float uLogZ0;
uniform float uLogSpan;
uniform float uFade;
uniform float uFadePow;
uniform float uRim;
uniform float uRimPx;
uniform float uEdge;
uniform float uSat;
out vec4 outColor;
float sdRound(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + vec2(r);
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
void main() {
    float d = sdRound(vLocal, uSize * 0.5, uRad);
    float aa = max(fwidth(d), 1e-6);
    float mask = clamp(0.5 - d / aa, 0.0, 1.0);

    // The card's colour, blending across it into the next colour in the palette.
    float gt = clamp(vUV.x * 0.7 + (1.0 - vUV.y) * 0.3, 0.0, 1.0);
    vec3 col = mix(uColA, uColB, uGrad * smoothstep(0.0, 1.0, gt));

    // The word, laid on in the card's own coordinates so it bends with the card.
    float word = texture(uTex, vec2(vUV.x, 1.0 - vUV.y)).a;
    col = mix(col, uTextCol, word * uTextOn);

    float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col = mix(vec3(lum), col, uSat);
    float px = -d / aa;
    float rim = clamp(1.0 - abs(px - uRimPx * 0.5) / (uRimPx * 0.5 + 0.5), 0.0, 1.0);
    col = mix(col, vec3(1.0), uRim * rim);
    float s = clamp(0.5 - vLocal.y / max(uSize.y, 1e-4), 0.0, 1.0);
    col *= 1.0 - uEdge * s * s;
    float lz = clamp((log(max(vZ, 1e-3)) - uLogZ0) / max(uLogSpan, 1e-3), 0.0, 1.0);
    // How far the dark reaches: a high spread starts it at the nearest rings and
    // grades it over every ring, so the tunnel reads as deep rather than as a
    // bright front with a dark back.
    col *= 1.0 - uFade * pow(smoothstep(0.0, 1.0, lz), uFadePow);
    float alpha = mask * uAlpha;
    outColor = vec4(col * alpha, alpha);
}`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error("Shader compile failed: " + log);
  }
  return sh;
}

function createProgram(gl) {
  const p = gl.createProgram();
  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.bindAttribLocation(p, 0, "aUV");
  gl.linkProgram(p);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error("Program link failed: " + gl.getProgramInfoLog(p));
  }
  return p;
}

const UNIFORMS = [
  "uTh0", "uThW", "uZN", "uZF", "uRot", "uF", "uAsp", "uVP", "uSize", "uTex",
  "uRad", "uAlpha", "uLogZ0", "uLogSpan", "uFade", "uFadePow", "uRim", "uRimPx", "uEdge",
  "uSat", "uColA", "uColB", "uGrad", "uTextCol", "uTextOn",
];

/** The card as `seg` strips across and 2 down, so its curve is smooth. */
function meshData(seg) {
  const out = [];
  const rows = 2;
  for (let i = 0; i < seg; i++) {
    for (let j = 0; j < rows; j++) {
      const u0 = i / seg;
      const u1 = (i + 1) / seg;
      const v0 = j / rows;
      const v1 = (j + 1) / rows;
      out.push(u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1);
    }
  }
  return new Float32Array(out);
}

/* ---------------------------------------------------------------- component */

export default function ColorTunnel(props) {
  // `variant` picks a look from VARIANTS; anything else you pass overrides it.
  return <ColorTunnelView {...VARIANTS[props.variant]} {...props} />;
}

function ColorTunnelView({
  variant = "night",
  colors = DEFAULT_COLORS,
  texts = DEFAULT_TEXTS,
  background = "#0A0A12",
  showText = true,
  textSize = 40,
  fontFamily = "'Helvetica Neue', Helvetica, Arial, sans-serif",
  fontWeight = 800,
  uppercase = true,
  autoContrast = true,
  textColor = "#FFFFFF",
  speed = 50,
  scale = 50,
  cardsPerRing = 4,
  gap = 10,
  rowGap = 20,
  rounded = 12,
  depthFade = 95,
  depthSpread = 90,
  gradient = 35,
  periodMs = 6000,
  spinDeg = 6,
  twist = 50,
  ringCount = 7,
  ringRatio = 170,
  nearRing = 188,
  fov = 70,
  vanishY = 0,
  fadeIn = 25,
  edgeShade = 25,
  rimOpacity = 15,
  rimWidth = 1,
  saturation = 100,
  hover = 100,
  hoverTilt = 6,
  hoverSlow = 60,
  pressBoost = 295,
  followMs = 350,
  segments = 24,
  grain = 0,
  vignette = 0,
  style,
}) {
  // Read through a ref every frame, so dragging a slider shows up on the next
  // frame without the renderer being torn down and rebuilt.
  const live = useRef(null);
  live.current = {
    colors, texts, showText, textSize, fontFamily, fontWeight, uppercase, autoContrast,
    textColor, speed, scale, cardsPerRing, gap, rowGap, rounded, depthFade, depthSpread, gradient,
    periodMs, spinDeg, twist, ringCount, ringRatio, nearRing, fov, vanishY, fadeIn,
    edgeShade, rimOpacity, rimWidth, saturation, hover, hoverTilt, hoverSlow,
    pressBoost, followMs, segments,
  };

  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const grainRef = useRef(null);
  const ptr = useRef({ tx: 0, ty: 0, tOver: 0, tPress: 0, x: 0, y: 0, over: 0, press: 0 });
  const grainUrl = useMemo(() => noiseUrl(), []);
  const [unsupported, setUnsupported] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: true });
    if (!gl) {
      setUnsupported(true);
      return;
    }

    const prog = createProgram(gl);
    const U = {};
    for (const name of UNIFORMS) U[name] = gl.getUniformLocation(prog, name);
    const aniso = gl.getExtension("EXT_texture_filter_anisotropic");

    const vao = gl.createVertexArray();
    const vbo = gl.createBuffer();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    let meshSeg = -1;
    let vertCount = 0;
    const ensureMesh = (seg) => {
      if (seg === meshSeg) return;
      meshSeg = seg;
      const data = meshData(seg);
      vertCount = data.length / 2;
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    };

    const makeTex = (source) => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, 4);
      return t;
    };

    // A clear 1x1 for cards with no word.
    const blank = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, blank);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // The words, one texture each, made when first needed and made again only
    // when something that changes how they look has changed.
    let wordKey = "";
    let words = new Map();
    const clearWords = () => {
      words.forEach((t) => gl.deleteTexture(t));
      words = new Map();
    };
    const wordTexture = (text, aspect, p) => {
      const hit = words.get(text);
      if (hit) return hit;
      const t = makeTex(drawWord(text, aspect, p));
      words.set(text, t);
      return t;
    };

    let cw = 1;
    let ch = 1;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, root.offsetWidth);
      const h = Math.max(1, root.offsetHeight);
      cw = Math.max(1, Math.round(w * dpr));
      ch = Math.max(1, Math.round(h * dpr));
      if (canvas.width !== cw) canvas.width = cw;
      if (canvas.height !== ch) canvas.height = ch;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(root);

    const mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    let reduced = !!mq?.matches;
    const onMq = () => {
      reduced = !!mq?.matches;
    };
    mq?.addEventListener?.("change", onMq);

    const onUp = () => {
      ptr.current.tPress = 0;
    };
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    let palKey = "";
    let palette = [[0.5, 0.5, 0.5]];

    let raf = 0;
    let last = -1;
    let travel = 0;
    let spin = 0;
    let grainClock = 0;
    const rot = new Float32Array(9);

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const dt = last < 0 ? 0 : Math.min((now - last) / 1000, 1 / 20);
      last = now;
      const p = live.current;
      const P = ptr.current;

      const hk = Math.max(0, p.hover / 50);
      const follow = dt <= 0 ? 0 : 1 - Math.exp(-dt / Math.max(0.01, p.followMs / 1000));
      P.x += (P.tx - P.x) * follow;
      P.y += (P.ty - P.y) * follow;
      P.over += (P.tOver - P.over) * follow;
      P.press += (P.tPress - P.press) * follow;

      const speedK = Math.max(0, p.speed) / 50;
      if (!reduced) {
        const boost = 1 + P.press * hk * (p.pressBoost / 100);
        travel += ((dt * speedK) / Math.max(0.1, p.periodMs / 1000)) * boost;
        const slow = 1 - Math.min(1, P.over * hk * (p.hoverSlow / 100));
        spin += dt * speedK * p.spinDeg * (Math.PI / 180) * slow;
      }

      if (grainRef.current) {
        grainClock += dt;
        if (grainClock > 1 / 12) {
          grainClock = 0;
          grainRef.current.style.backgroundPosition = `${Math.floor(Math.random() * 128)}px ${Math.floor(Math.random() * 128)}px`;
        }
      }

      ensureMesh(Math.max(4, Math.min(64, Math.round(p.segments))));

      gl.viewport(0, 0, cw, ch);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(prog);
      gl.bindVertexArray(vao);
      gl.activeTexture(gl.TEXTURE0);
      gl.uniform1i(U.uTex, 0);

      const asp = cw / ch;
      const fovR = (Math.max(20, Math.min(120, p.fov)) * Math.PI) / 180;
      const f = Math.max(10, p.scale) / 100 / Math.tan(fovR / 2);
      const tilt = reduced ? 0 : ((p.hoverTilt * Math.PI) / 180) * hk * P.over;
      const ya = P.x * tilt;
      const pb = -P.y * tilt;
      const ca = Math.cos(ya), sa = Math.sin(ya), cb = Math.cos(pb), sb = Math.sin(pb);
      rot[0] = ca; rot[1] = 0; rot[2] = -sa;
      rot[3] = sa * sb; rot[4] = cb; rot[5] = ca * sb;
      rot[6] = sa * cb; rot[7] = -sb; rot[8] = ca * cb;
      gl.uniformMatrix3fv(U.uRot, false, rot);
      gl.uniform1f(U.uF, f);
      gl.uniform1f(U.uAsp, asp);
      gl.uniform2f(U.uVP, 0, (p.vanishY / 100) * 2);

      const n = Math.max(3, Math.min(24, Math.round(p.cardsPerRing)));
      const slot = (Math.PI * 2) / n;
      const thW = slot * (1 - Math.max(0, Math.min(90, p.gap)) / 100);
      const g = Math.max(1.05, p.ringRatio / 100);
      const z0 = Math.max(0.1, p.nearRing / 100);
      const K = Math.max(2, Math.min(12, Math.round(p.ringCount)));
      const half = Math.pow(g, Math.max(0.05, Math.min(1, 1 - p.rowGap / 100)) / 2);
      const w = thW;
      const h = half - 1 / half;
      gl.uniform2f(U.uSize, w, h);
      gl.uniform1f(U.uThW, thW);
      gl.uniform1f(U.uRad, (Math.max(0, Math.min(100, p.rounded)) / 100) * 0.5 * Math.min(w, h));
      // The fade is measured from one ring nearer than the first full ring, so
      // the big rings at the front are part of the gradient, not outside it.
      gl.uniform1f(U.uLogZ0, Math.log(z0) - Math.log(g));
      gl.uniform1f(U.uLogSpan, Math.log(g) * Math.max(1, K - 1));
      gl.uniform1f(U.uFade, Math.max(0, Math.min(100, p.depthFade)) / 100);
      // 0 keeps the near rings bright and drops off late; 100 grades from the front.
      gl.uniform1f(U.uFadePow, 2.4 - (Math.max(0, Math.min(100, p.depthSpread)) / 100) * 2.0);
      gl.uniform1f(U.uRim, Math.max(0, Math.min(100, p.rimOpacity)) / 100);
      gl.uniform1f(U.uRimPx, Math.max(0.5, p.rimWidth));
      gl.uniform1f(U.uEdge, Math.max(0, Math.min(100, p.edgeShade)) / 100);
      gl.uniform1f(U.uSat, Math.max(0, p.saturation) / 100);
      gl.uniform1f(U.uGrad, Math.max(0, Math.min(100, p.gradient)) / 100);

      // The palette, parsed again only when it changes.
      const list = Array.isArray(p.colors) && p.colors.length ? p.colors : DEFAULT_COLORS;
      const pk = list.join(",");
      if (pk !== palKey) {
        palKey = pk;
        palette = list.map(parseHex);
      }
      const nc = palette.length;

      // The words, made again only when how they look has changed. The card's
      // proportions are part of that, so Gap, Row Gap and Cards per Ring all
      // re-set the lettering to fit.
      const wordList = (Array.isArray(p.texts) ? p.texts : []).map((t) => String(t ?? "").trim()).filter(Boolean).slice(0, 48);
      const aspect = clamp(w / h, 0.3, 6);
      const wk = [aspect.toFixed(2), p.textSize, p.fontFamily, p.fontWeight, p.uppercase, wordList.join("\u0001")].join("|");
      if (wk !== wordKey) {
        wordKey = wk;
        clearWords();
      }
      const wordOpts = { textSize: p.textSize, fontFamily: p.fontFamily, fontWeight: p.fontWeight, uppercase: p.uppercase };
      const manual = parseHex(p.textColor);
      const showWords = p.showText && wordList.length > 0;
      gl.uniform1f(U.uTextOn, showWords ? 1 : 0);

      const fu = travel - Math.floor(travel);
      const base = Math.floor(travel);
      const fadeInK = Math.max(0.01, p.fadeIn / 100);

      for (let k = K - 1; k >= -3; k--) {
        const pos = k - fu;
        const zc = z0 * Math.pow(g, pos);
        let alpha = Math.max(0, Math.min(1, (K - 1 - pos) / fadeInK));
        alpha = alpha * alpha * (3 - 2 * alpha);
        if (reduced) alpha = 1;
        if (alpha <= 0.001) continue;
        gl.uniform1f(U.uAlpha, alpha);
        gl.uniform1f(U.uZN, zc / half);
        gl.uniform1f(U.uZF, zc * half);
        const ringN = base + k;
        const ringRot = ringN * (p.twist / 100) * slot - spin;
        for (let j = 0; j < n; j++) {
          const thetaC = ringRot + (j + 0.5) * slot;
          gl.uniform1f(U.uTh0, thetaC - thW / 2);
          const seq = ringN * n + j;
          const a = palette[mod(seq, nc)];
          const b = palette[mod(seq + 1, nc)];
          gl.uniform3f(U.uColA, a[0], a[1], a[2]);
          gl.uniform3f(U.uColB, b[0], b[1], b[2]);
          let tex = blank;
          if (showWords) {
            // The word moves on one place every time the palette comes round.
            const label = wordList[mod(seq + Math.floor(seq / nc), wordList.length)];
            tex = wordTexture(label, aspect, wordOpts);
            const tc = p.autoContrast
              ? (luma(a) + luma(b) * Math.min(1, p.gradient / 100)) / (1 + Math.min(1, p.gradient / 100)) > 0.6
                ? [0.06, 0.06, 0.09]
                : [1, 1, 1]
              : manual;
            gl.uniform3f(U.uTextCol, tc[0], tc[1], tc[2]);
          }
          gl.bindTexture(gl.TEXTURE_2D, tex);
          gl.drawArrays(gl.TRIANGLES, 0, vertCount);
        }
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mq?.removeEventListener?.("change", onMq);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      clearWords();
      gl.deleteTexture(blank);
      gl.deleteBuffer(vbo);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(prog);
    };
  }, []);

  const onPointerMove = (e) => {
    const r = rootRef.current?.getBoundingClientRect();
    if (!r || r.width <= 0 || r.height <= 0) return;
    const P = ptr.current;
    P.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
    P.ty = -(((e.clientY - r.top) / r.height) * 2 - 1);
    P.tOver = 1;
  };
  const onPointerLeave = () => {
    const P = ptr.current;
    P.tx = 0;
    P.ty = 0;
    P.tOver = 0;
  };
  const onPointerDown = (e) => {
    onPointerMove(e);
    ptr.current.tPress = 1;
  };

  const grainK = Math.max(0, Math.min(100, grain)) / 100;
  const vignetteK = Math.max(0, Math.min(100, vignette)) / 100;

  return (
    <div
      ref={rootRef}
      onPointerMove={onPointerMove}
      onPointerEnter={onPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerDown={onPointerDown}
      style={{
        ...style,
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background,
        isolation: "isolate",
        // Vertical page scrolling still works over it.
        touchAction: "pan-y",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
      />
      {unsupported && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            color: "rgba(255,255,255,0.6)",
            font: "14px system-ui, sans-serif",
          }}
        >
          WebGL 2 is not available in this browser.
        </div>
      )}
      {vignetteK > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,${vignetteK}) 100%)`,
          }}
        />
      )}
      {grainK > 0 && grainUrl && (
        <div
          ref={grainRef}
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            backgroundImage: `url(${grainUrl})`,
            backgroundSize: "128px 128px",
            opacity: grainK * 0.5,
            mixBlendMode: "overlay",
          }}
        />
      )}
    </div>
  );
}
