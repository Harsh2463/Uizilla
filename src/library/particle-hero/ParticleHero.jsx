import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

/**
 * ParticleHero — a full hero section whose centrepiece is a photo rebuilt out
 * of GPU particles. Every pixel of the image above a small alpha threshold
 * becomes a point; the points sit at rest in the shape of the picture until
 * the cursor comes near, when they lift and orbit away from it and then ease
 * back. The physics run entirely on the GPU: a simulation pass writes each
 * particle's energy into a float texture, which the draw pass reads back as a
 * vertex texture, so no per-particle work happens on the CPU after the build.
 *
 * Around it sits the rest of the hero: a nav, a giant ghost word behind the
 * art, a headline and intro, stat cards, and a panel that opens from the
 * "how it works" button (Esc or the close button shuts it).
 *
 * The whole thing is laid out at a fixed design width and scaled to whatever
 * box it's given, so it reads the same in a full-page hero and in a small
 * preview card. Below `narrowAt` it switches to a stacked layout.
 *
 * Needs a WebGL context with float render targets for the physics. Without
 * them it still draws the picture, just at rest — see `u_static` below.
 *
 * The image is read pixel by pixel on a canvas, so it must be same-origin or
 * served with CORS headers (`crossOrigin="anonymous"` is set). A tainted
 * image is reported once and nothing is drawn.
 *
 * Self-contained: copy this single file into any React (16.8+) project. No
 * other packages, CSS or files needed. It fills 100% of its parent, so give
 * the parent a height, e.g.
 *   <div style={{ height: 720 }}><ParticleHero /></div>
 */

/* ---------------------------------------------------------------- constants */

const DPR_CAP = 2;
/** Wait this long after the image or density changes before rebuilding, so a
 * dragged density slider doesn't start a build on every step. */
const REBUILD_DEBOUNCE_MS = 200;
/** How long one frame may spend filling the particle arrays. The build is
 * spread across frames so a million-point image never blocks the page. */
const BUILD_BUDGET_MS = 8;
/** Pointer parked far outside the field, in world units. */
const OFF_FIELD = -10;
/** Pixels dimmer than this in the alpha channel never become particles. */
const ALPHA_FLOOR = 8;

const BASE_JITTER = 0;
const JITTER_X = 1;
const JITTER_Y = 1;
const JITTER_SPEED = 8;
const STRENGTH = 7;
const RETURN_SPEED = 0.03;
/** Dot diameter in px when `dotSize` is 100. */
const DOT_PX_AT_100 = 6;
const DENSITY_MIN = 50000;
const DENSITY_MAX = 2000000;

/** How much of the particle canvas the picture fills. The rest is headroom
 * the points fly into, so a lifted particle is never clipped at the edge. */
const FIELD_FILL = 0.7;

const DESIGN_W = 1400;
const DESIGN_W_NARROW = 520;
const FIT_FLOOR = 0.8; // smallest the picture gets, as a share of the hero height
const NARROW_ART_DROP = 170; // px the picture is pushed down in the stacked layout
const GHOST_PAD_NARROW = 34; // px kept clear either side of the ghost word there
/** The shortest the stage is ever laid out at. In a box shorter than this the
 * hero scales down to fit rather than squeezing the copy into the space and
 * leaving the art with none — in a short enough box the art would otherwise
 * be squeezed out altogether. */
const MIN_STAGE_H = 700;
const MIN_STAGE_H_NARROW = 620;

const FONT = "Arial, Helvetica, sans-serif";

/** A cut-out with a transparent background: only the figure becomes
 * particles. A photo without transparency turns into a solid rectangle of
 * points, which is a different (and usually worse looking) effect. */
const DEFAULT_IMAGE =
  "https://ik.imagekit.io/Harsh2463/jackets/Futuristic%20Orange-Black%20Cyborg%20Armor.png";

/* ------------------------------------------------------------------ shaders */

const QUAD_VS = `
precision highp float;
attribute vec2 a_quad;
varying vec2 v_uv;
void main() {
    v_uv = a_quad * 0.5 + 0.5;
    gl_Position = vec4(a_quad, 0.0, 1.0);
}`;

/** One texel per particle. rg carries its home, b its energy (how far it has
 * been pushed from home) and a that energy's velocity. Energy is a scalar, so
 * a particle always returns to exactly where it started. */
const SIM_FS = `
precision highp float;
uniform sampler2D u_posTex;
uniform sampler2D u_homeTex;
uniform vec2 u_mouse;
uniform float u_imageScale;
uniform float u_brushSize;
uniform float u_strength;
uniform float u_returnSpeed;
uniform float u_damping;
uniform float u_isInit;
varying vec2 v_uv;

void main() {
    vec4 data = texture2D(u_posTex, v_uv);
    vec2 home = texture2D(u_homeTex, v_uv).rg * u_imageScale;
    float energy = data.b;
    float velE = data.a;

    if (u_isInit > 0.5 || energy != energy || velE != velE) {
        energy = 0.0;
        velE = 0.0;
    }

    float forceE = (0.0 - energy) * (u_returnSpeed * 0.5);

    float d = distance(home, u_mouse);
    if (d < u_brushSize * 2.0 && u_mouse.x > -5.0) {
        float influence = smoothstep(u_brushSize * 2.0, 0.0, d);
        influence *= influence;
        forceE += influence * u_strength * 0.1;
    }

    velE += forceE;
    velE *= u_damping;
    energy += velE;
    energy = max(0.0, energy);

    gl_FragColor = vec4(home, energy, velE);
}`;

/** `u_static` is the no-float-target fallback: the home position comes
 * straight from a vertex attribute and the picture is drawn at rest. */
const DRAW_VS = `
precision highp float;
attribute vec4 a_color;
attribute vec2 a_uv;
attribute vec3 a_random;
attribute vec4 a_home;
attribute vec2 a_edge;
varying vec4 v_color;
uniform sampler2D u_posTex;
uniform float u_static;
uniform float u_imageScale;
uniform float u_time;
uniform float u_particleSize;
uniform float u_baseJitter;
uniform float u_interJitter;
uniform vec2 u_jitterAxis;
uniform float u_jitterSpeed;
uniform float u_brushSize;
uniform float u_aspect;
uniform float u_edgeOn;
uniform float u_edgeWidth;
uniform float u_edgeSide;
uniform float u_edgeAmp;

vec4 fetchState() {
    if (u_static > 0.5) return vec4(a_home.rg * u_imageScale, 0.0, 0.0);
    return texture2D(u_posTex, a_uv);
}

void main() {
    v_color = a_color;
    vec4 data = fetchState();
    vec2 homeXY = data.rg;
    float energy = clamp(data.b, 0.0, 2.5);

    vec3 rd = vec3(
        sin(a_random.x * 134.11 + a_random.y * 311.23),
        cos(a_random.y * 111.45 + a_random.z * 277.92),
        sin(a_random.z * 188.77 + a_random.x * 399.11)
    );
    vec2 randDir = (rd / max(length(rd), 0.0001)).xy;

    float t = u_time * u_jitterSpeed;
    float orbitSpeed = 0.5 + a_random.y * 1.5;
    float dir = a_random.z > 0.5 ? 1.0 : -1.0;
    vec2 orbit = vec2(
        sin(t * orbitSpeed * dir + a_random.x * 6.28),
        cos(t * orbitSpeed * dir + a_random.y * 6.28)
    );

    float maxStretch = u_brushSize * (u_interJitter * 0.01);
    float stretchPower = (energy / 2.5) * maxStretch;
    vec2 offset = randDir * u_jitterAxis * (u_baseJitter * 0.01 + stretchPower);

    float orbitRadius = u_brushSize * 0.1 * (energy / 2.5);
    offset += orbit * orbitRadius * (0.2 + a_random.x * 1.8);

    // Always-on band along the silhouette's edge: each dot there shimmers in
    // place and streams outward, fading as it goes, whether or not the cursor
    // is near. Everything outside the band stays at rest.
    if (u_edgeOn > 0.5) {
        float er = 1.0 - smoothstep(0.0, u_edgeWidth, a_edge.x);
        float el = 1.0 - smoothstep(0.0, u_edgeWidth, a_edge.y);
        float wr = (u_edgeSide < 1.5 || u_edgeSide > 2.5) ? er : 0.0;
        float wl = u_edgeSide > 1.5 ? el : 0.0;
        float bw = max(wr, wl);
        if (bw > 0.001) {
            float side = wr >= wl ? 1.0 : -1.0;
            float ph = fract(u_time * (0.12 + a_random.y * 0.25) + a_random.x);
            vec2 flow = vec2(side * ph * 1.4, (a_random.z - 0.5) * ph * 0.7);
            vec2 shimmer = orbit * (0.25 + a_random.x * 0.75) * 0.35;
            offset += (flow + shimmer) * u_edgeAmp * bw;
            v_color.a *= 1.0 - ph * ph * bw * 0.85;
        }
    }

    vec2 pos = homeXY + offset;
    gl_PointSize = u_particleSize;
    gl_Position = vec4(pos.x / u_aspect, pos.y, 0.0, 1.0);
}`;

/** Round point sprites, premultiplied. `u_alphaComp` thins each dot by how
 * many of them land on the same spot, so a dense field doesn't read as a
 * solid slab of colour. */
const DRAW_FS = `
precision highp float;
varying vec4 v_color;
uniform float u_alphaComp;
void main() {
    if (length(gl_PointCoord - vec2(0.5)) > 0.5) discard;
    float inv = clamp(1.0 - v_color.a, 0.0, 1.0);
    float a = inv <= 0.0 ? 1.0 : 1.0 - pow(inv, u_alphaComp);
    gl_FragColor = vec4(v_color.rgb * a, a);
}`;

const SIM_UNIFORMS = [
  "u_posTex", "u_homeTex", "u_mouse", "u_imageScale", "u_brushSize",
  "u_strength", "u_returnSpeed", "u_damping", "u_isInit",
];
const DRAW_UNIFORMS = [
  "u_posTex", "u_static", "u_imageScale", "u_time", "u_particleSize",
  "u_baseJitter", "u_interJitter", "u_jitterAxis", "u_jitterSpeed",
  "u_brushSize", "u_alphaComp", "u_aspect",
  "u_edgeOn", "u_edgeWidth", "u_edgeSide", "u_edgeAmp",
];

/* ------------------------------------------------------------- GL utilities */

function compileShader(gl, type, src, tag) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.warn("ParticleHero " + tag + ":", gl.getShaderInfoLog(sh));
    return null;
  }
  return sh;
}

function linkProgram(gl, vsSrc, fsSrc, tag) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc, tag + ".vert");
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc, tag + ".frag");
  if (!vs || !fs) return null;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn("ParticleHero " + tag + " link:", gl.getProgramInfoLog(prog));
    return null;
  }
  return prog;
}

function buildProgram(gl, vsSrc, fsSrc, names, tag) {
  const prog = linkProgram(gl, vsSrc, fsSrc, tag);
  if (!prog) return null;
  const u = {};
  for (let i = 0; i < names.length; i++) u[names[i]] = gl.getUniformLocation(prog, names[i]);
  return { prog, u };
}

function makeContext(canvas) {
  const opts = {
    alpha: true,
    antialias: false,
    premultipliedAlpha: true,
    depth: false,
    stencil: false,
    powerPreference: "high-performance",
  };
  let gl = canvas.getContext("webgl2", opts);
  let webgl2 = !!gl;
  let floatRT = false;
  if (gl) {
    floatRT = !!gl.getExtension("EXT_color_buffer_float");
  } else {
    gl = canvas.getContext("webgl", opts) || canvas.getContext("experimental-webgl", opts);
    if (!gl) return null;
    floatRT = !!(
      gl.getExtension("OES_texture_float") && gl.getExtension("WEBGL_color_buffer_float")
    );
  }
  // The draw pass reads the state texture from the vertex shader, so without
  // vertex texture units the physics can't be fed back in.
  if (gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) < 2) floatRT = false;
  return { gl, webgl2, floatRT };
}

function floatFormat(gl, webgl2) {
  return { internal: webgl2 ? gl.RGBA32F : gl.RGBA, format: gl.RGBA, type: gl.FLOAT };
}

function makeStateTexture(gl, fmt, size, pixels) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, fmt.internal, size, size, 0, fmt.format, fmt.type, pixels || null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.bindTexture(gl.TEXTURE_2D, null);
  return tex;
}

function makeRenderTarget(gl, fmt, size) {
  const tex = makeStateTexture(gl, fmt, size, null);
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { tex, fbo, ok };
}

/* --------------------------------------------------------- particle builder */

/**
 * Walks the image on a grid and keeps one particle per visited pixel that
 * isn't transparent. Returns a stepper rather than an array: `step(ms)` fills
 * for at most that long and reports whether it finished, so the caller can
 * spread a large build over several frames.
 */
function makeBuilder(data, w, h, aspect, target) {
  const step = Math.max(1, Math.sqrt((w * h) / Math.max(1, target)));
  const cols = Math.ceil(w / step) + 2;
  const rows = Math.ceil(h / step) + 2;
  const texSize = Math.max(2, Math.ceil(Math.sqrt(cols * rows)));
  const capacity = texSize * texSize;

  const home = new Float32Array(capacity * 4);
  const color = new Float32Array(capacity * 4);
  const uv = new Float32Array(capacity * 2);
  const rand = new Float32Array(capacity * 3);
  const edge = new Float32Array(capacity * 2);

  // Rightmost / leftmost opaque pixel of every row, so each particle can know
  // how far it sits from the silhouette's edge (as a fraction of image width).
  const rowR = new Int32Array(h).fill(-1);
  const rowL = new Int32Array(h).fill(-1);
  for (let r = 0; r < h; r++) {
    const base = r * w * 4;
    for (let x = w - 1; x >= 0; x--) {
      if (data[base + x * 4 + 3] >= ALPHA_FLOOR) { rowR[r] = x; break; }
    }
    for (let x = 0; x < w; x++) {
      if (data[base + x * 4 + 3] >= ALPHA_FLOOR) { rowL[r] = x; break; }
    }
  }

  let count = 0;
  let y = 0;
  let finished = false;

  return {
    texSize,
    get count() { return count; },
    get finished() { return finished; },
    step(budgetMs) {
      const t0 = performance.now();
      while (y < h && count < capacity) {
        const iy = Math.floor(y);
        for (let x = 0; x < w; x += step) {
          if (count >= capacity) break;
          const idx = (iy * w + Math.floor(x)) * 4;
          const a = data[idx + 3];
          if (a < ALPHA_FLOOR) continue;
          const i4 = count * 4;
          const i3 = count * 3;
          const i2 = count * 2;
          home[i4] = ((x / w) * 2 - 1) * aspect;
          home[i4 + 1] = (1 - y / h) * 2 - 1;
          home[i4 + 2] = 0;
          home[i4 + 3] = 0;
          color[i4] = data[idx] / 255;
          color[i4 + 1] = data[idx + 1] / 255;
          color[i4 + 2] = data[idx + 2] / 255;
          color[i4 + 3] = a / 255;
          rand[i3] = Math.random();
          rand[i3 + 1] = Math.random();
          rand[i3 + 2] = Math.random();
          edge[i2] = (rowR[iy] - x) / w;
          edge[i2 + 1] = (x - rowL[iy]) / w;
          uv[i2] = ((count % texSize) + 0.5) / texSize;
          uv[i2 + 1] = (Math.floor(count / texSize) + 0.5) / texSize;
          count++;
        }
        y += step;
        if (budgetMs > 0 && performance.now() - t0 >= budgetMs) break;
      }
      if (y >= h || count >= capacity) finished = true;
      return finished;
    },
    result() {
      return { home, color, uv, rand, edge, count, texSize, gridStep: step, srcH: h };
    },
  };
}

/** Roughly how many dots cover any one spot, from the grid spacing on screen
 * and the dot's diameter. Feeds `u_alphaComp`. */
function overlapCount(gridStep, srcH, imageScale, canvasH, diameterPx) {
  const spacing = (gridStep * imageScale * canvasH) / Math.max(1, srcH);
  if (!(spacing > 0) || !(diameterPx > 0)) return 1;
  return Math.max(1, ((Math.PI / 4) * diameterPx * diameterPx) / (spacing * spacing));
}

/* ------------------------------------------------------------ particle field */

function ParticleField({
  src,
  density,
  dotSize,
  reach,
  lift,
  damping,
  imageScale,
  stageScale,
  interactive,
  edge,
  onAspect,
  eventsRef,
}) {
  const hostRef = useRef(null);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const imageVer = useRef(0);
  const pointer = useRef({ tx: OFF_FIELD, ty: OFF_FIELD, sx: OFF_FIELD, sy: OFF_FIELD });
  const resizeRef = useRef(null);

  const effectiveDensity = useMemo(() => {
    const pct = Math.max(0, Math.min(100, density)) / 100;
    let base = Math.round(DENSITY_MIN + pct * (DENSITY_MAX - DENSITY_MIN));
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    if (dpr > 2) base = Math.floor(base * 0.75);
    // A preview a quarter of the size needs nowhere near the same count.
    return Math.max(DENSITY_MIN, Math.round(base * Math.min(1, Math.max(0.15, stageScale))));
  }, [density, stageScale]);

  // Everything the frame loop needs that a prop can change, read fresh each
  // tick so a slider lands on the very next frame without relinking anything.
  const live = useRef({});
  live.current = {
    brush: Math.max(0, Math.min(100, reach)) / 100,
    strength: STRENGTH,
    returnSpeed: RETURN_SPEED,
    damping: Math.max(1, Math.min(100, damping)) / 100,
    jitterSpeed: JITTER_SPEED,
    baseJitter: BASE_JITTER,
    interJitter: lift,
    particleSize: (Math.max(0, Math.min(100, dotSize)) / 100) * DOT_PX_AT_100,
    imageScale,
    density: effectiveDensity,
    stageScale,
    interactive,
    edge,
  };

  // Read the image's pixels once. Canvas reads are blocked for a cross-origin
  // image that arrives without CORS headers, and there is nothing to draw
  // without them, so say so plainly instead of failing silently.
  useEffect(() => {
    let dead = false;
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => {
      if (dead) return;
      const w = im.naturalWidth || im.width;
      const h = im.naturalHeight || im.height;
      if (!w || !h) return;
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(im, 0, 0, w, h);
      let data;
      try {
        data = ctx.getImageData(0, 0, w, h).data;
      } catch {
        console.warn("ParticleHero: image is cross-origin tainted, nothing to draw:", src);
        return;
      }
      imageRef.current = { data, w, h, aspect: w / h };
      imageVer.current++;
      onAspect?.(w / h);
    };
    im.onerror = () => console.warn("ParticleHero: image failed to load:", src);
    im.src = src;
    return () => {
      dead = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    const ctx = makeContext(canvas);
    if (!ctx) {
      console.warn("ParticleHero: no WebGL context");
      return;
    }
    const { gl, webgl2, floatRT } = ctx;
    if (!floatRT) {
      console.warn("ParticleHero: no float render target — drawing the image at rest, physics off");
    }
    const fmt = floatFormat(gl, webgl2);

    const sim = floatRT ? buildProgram(gl, QUAD_VS, SIM_FS, SIM_UNIFORMS, "sim") : { prog: null, u: {} };
    const draw = buildProgram(gl, DRAW_VS, DRAW_FS, DRAW_UNIFORMS, "draw");
    if (!draw || !sim) return;

    const attrs = {
      color: gl.getAttribLocation(draw.prog, "a_color"),
      uv: gl.getAttribLocation(draw.prog, "a_uv"),
      random: gl.getAttribLocation(draw.prog, "a_random"),
      home: gl.getAttribLocation(draw.prog, "a_home"),
      edge: gl.getAttribLocation(draw.prog, "a_edge"),
      quad: sim.prog ? gl.getAttribLocation(sim.prog, "a_quad") : -1,
    };

    const quadBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const dummyTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, dummyTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 0]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.bindTexture(gl.TEXTURE_2D, null);

    const bufColor = gl.createBuffer();
    const bufUv = gl.createBuffer();
    const bufRandom = gl.createBuffer();
    const bufHome = gl.createBuffer();
    const bufEdge = gl.createBuffer();

    let builtKey = "";
    let pendingKey = "";
    let pendingSince = 0;
    let builder = null;
    let count = 0;
    let texSize = 0;
    let homeTex = null;
    let rtA = null;
    let rtB = null;
    let ready = false;
    let seeded = false;
    let gridStep = 0;
    let srcH = 0;

    const disposeSet = () => {
      if (homeTex) gl.deleteTexture(homeTex);
      if (rtA) { gl.deleteTexture(rtA.tex); gl.deleteFramebuffer(rtA.fbo); }
      if (rtB) { gl.deleteTexture(rtB.tex); gl.deleteFramebuffer(rtB.fbo); }
      homeTex = null;
      rtA = null;
      rtB = null;
      ready = false;
    };

    const upload = (r) => {
      disposeSet();
      count = r.count;
      texSize = r.texSize;
      if (!count) return;

      homeTex = makeStateTexture(gl, fmt, texSize, r.home);

      gl.bindBuffer(gl.ARRAY_BUFFER, bufColor);
      gl.bufferData(gl.ARRAY_BUFFER, r.color.subarray(0, count * 4), gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, bufUv);
      gl.bufferData(gl.ARRAY_BUFFER, r.uv.subarray(0, count * 2), gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, bufRandom);
      gl.bufferData(gl.ARRAY_BUFFER, r.rand.subarray(0, count * 3), gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, bufEdge);
      gl.bufferData(gl.ARRAY_BUFFER, r.edge.subarray(0, count * 2), gl.STATIC_DRAW);
      if (!floatRT) {
        gl.bindBuffer(gl.ARRAY_BUFFER, bufHome);
        gl.bufferData(gl.ARRAY_BUFFER, r.home.subarray(0, count * 4), gl.STATIC_DRAW);
      }

      if (floatRT) {
        rtA = makeRenderTarget(gl, fmt, texSize);
        rtB = makeRenderTarget(gl, fmt, texSize);
        if (!rtA.ok || !rtB.ok) {
          console.warn("ParticleHero: float framebuffer incomplete");
          disposeSet();
          return;
        }
      }
      gridStep = r.gridStep;
      srcH = r.srcH;
      ready = true;
      seeded = false;
    };

    const simPass = (L, isInit, dst, srcTex) => {
      gl.useProgram(sim.prog);
      gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fbo);
      gl.viewport(0, 0, texSize, texSize);
      gl.disable(gl.BLEND);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, srcTex);
      gl.uniform1i(sim.u.u_posTex, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, homeTex);
      gl.uniform1i(sim.u.u_homeTex, 1);
      gl.uniform2f(sim.u.u_mouse, pointer.current.sx, pointer.current.sy);
      gl.uniform1f(sim.u.u_imageScale, L.imageScale);
      gl.uniform1f(sim.u.u_brushSize, L.brush);
      gl.uniform1f(sim.u.u_strength, L.strength);
      gl.uniform1f(sim.u.u_returnSpeed, L.returnSpeed);
      gl.uniform1f(sim.u.u_damping, L.damping);
      gl.uniform1f(sim.u.u_isInit, isInit);
      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
      gl.enableVertexAttribArray(attrs.quad);
      gl.vertexAttribPointer(attrs.quad, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    };

    let cssW = 0;
    let aspect = 16 / 9;
    const resize = () => {
      const L = live.current;
      // The hero scales the whole stage with a transform, so the canvas's
      // layout size is in design px. Folding that scale into the pixel ratio
      // keeps the backing store at the size actually shown on screen.
      const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP) * Math.max(0.1, L.stageScale || 1);
      cssW = canvas.clientWidth || host.clientWidth || 0;
      const cssH = canvas.clientHeight || host.clientHeight || 0;
      const w = Math.max(1, Math.round(cssW * dpr));
      const h = Math.max(1, Math.round(cssH * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      aspect = w / h;
      bounds = null;
    };
    resizeRef.current = resize;

    let bounds = null;
    const clearPointer = () => {
      const p = pointer.current;
      p.tx = OFF_FIELD; p.ty = OFF_FIELD;
      p.sx = OFF_FIELD; p.sy = OFF_FIELD;
    };

    const movePointer = (clientX, clientY) => {
      if (!bounds) bounds = host.getBoundingClientRect();
      const r = bounds;
      if (!r.width || !r.height) return;
      const nx = ((clientX - r.left) / r.width) * 2 - 1;
      const ny = -(((clientY - r.top) / r.height) * 2 - 1);
      pointer.current.tx = nx * (r.width / r.height);
      pointer.current.ty = ny;
    };

    const onMove = (e) => {
      if (!live.current.interactive) return;
      movePointer(e.clientX, e.clientY);
    };
    const onLeave = () => clearPointer();
    const onEnter = () => { bounds = null; };
    const onScroll = () => { bounds = null; };

    // Listen on the whole hero when given one, not just the canvas: the nav,
    // headline and cards sit on top of the art, and the cursor should keep
    // stirring the particles beneath them.
    const target = eventsRef?.current || host;
    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerenter", onEnter);
    target.addEventListener("pointerleave", onLeave);
    target.addEventListener("pointercancel", onLeave);
    window.addEventListener("scroll", onScroll, { passive: true });

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let visible = true;
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (!visible) clearPointer();
      },
      { threshold: 0.01 }
    );
    io.observe(host);

    gl.disable(gl.DEPTH_TEST);

    let raf = 0;
    let clock = 0;
    let lastClock = performance.now();

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const L = live.current;

      const dt = Math.min((now - lastClock) / 1000, 0.05);
      lastClock = now;
      clock += dt;

      const img = imageRef.current;
      const key = img ? imageVer.current + "|" + Math.round(L.density) : "";
      if (key && key !== builtKey && !builder) {
        if (key !== pendingKey) {
          pendingKey = key;
          pendingSince = now;
        } else if (now - pendingSince >= REBUILD_DEBOUNCE_MS) {
          builder = makeBuilder(img.data, img.w, img.h, img.aspect, L.density);
        }
      }
      if (builder && builder.step(BUILD_BUDGET_MS)) {
        upload(builder.result());
        builtKey = pendingKey;
        builder = null;
      }

      if (!visible || !ready || !count) return;

      // Ease the live pointer toward the real one; leaving the field eases
      // out more gently than moving within it, so the lift settles rather
      // than snapping the instant the cursor crosses the edge.
      const p = pointer.current;
      if (p.tx < -5) {
        p.sx += (p.tx - p.sx) * 0.08;
        p.sy += (p.ty - p.sy) * 0.08;
      } else if (p.sx < -5) {
        p.sx = p.tx;
        p.sy = p.ty;
      } else {
        p.sx += (p.tx - p.sx) * 0.15;
        p.sy += (p.ty - p.sy) * 0.15;
      }

      if (floatRT) {
        if (!seeded) {
          simPass(L, 1, rtA, homeTex);
          simPass(L, 1, rtB, homeTex);
          seeded = true;
        }
        simPass(L, 0, rtB, rtA.tex);
        const t = rtA;
        rtA = rtB;
        rtB = t;
      }

      gl.useProgram(draw.prog);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, floatRT ? rtA.tex : dummyTex);
      gl.uniform1i(draw.u.u_posTex, 0);
      gl.uniform1f(draw.u.u_static, floatRT ? 0 : 1);
      gl.uniform1f(draw.u.u_imageScale, L.imageScale);
      gl.uniform1f(draw.u.u_time, clock);
      gl.uniform1f(draw.u.u_aspect, aspect);
      gl.uniform1f(draw.u.u_baseJitter, L.baseJitter);
      gl.uniform1f(draw.u.u_interJitter, L.interJitter);
      gl.uniform2f(draw.u.u_jitterAxis, JITTER_X, JITTER_Y);
      gl.uniform1f(draw.u.u_jitterSpeed, L.jitterSpeed);
      gl.uniform1f(draw.u.u_brushSize, L.brush);
      const E = L.edge || {};
      gl.uniform1f(draw.u.u_edgeOn, E.on ? 1 : 0);
      gl.uniform1f(draw.u.u_edgeWidth, E.width || 0.1);
      gl.uniform1f(draw.u.u_edgeSide, E.side || 1);
      gl.uniform1f(draw.u.u_edgeAmp, E.amp || 0);

      const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP) * Math.max(0.1, L.stageScale || 1);
      let pointPx = L.particleSize * dpr * Math.max(1, cssW / 1200);
      // Never let a dot be smaller than the gap to its neighbour, or on a
      // small screen the background shows through as a faint regular grid.
      if (pointPx > 0 && gridStep > 0) {
        const spacingPx = (gridStep * L.imageScale * canvas.height) / Math.max(1, srcH);
        // Also keep dots wider than ~2 device pixels: smaller ones land on
        // the pixel grid unevenly and beat against it as faint blotches.
        pointPx = Math.max(pointPx, spacingPx * 1.6, 2.4);
      }
      gl.uniform1f(draw.u.u_particleSize, pointPx);
      gl.uniform1f(
        draw.u.u_alphaComp,
        1 / overlapCount(gridStep, srcH, L.imageScale, canvas.height, pointPx)
      );

      gl.bindBuffer(gl.ARRAY_BUFFER, bufColor);
      gl.enableVertexAttribArray(attrs.color);
      gl.vertexAttribPointer(attrs.color, 4, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, bufUv);
      gl.enableVertexAttribArray(attrs.uv);
      gl.vertexAttribPointer(attrs.uv, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, bufRandom);
      gl.enableVertexAttribArray(attrs.random);
      gl.vertexAttribPointer(attrs.random, 3, gl.FLOAT, false, 0, 0);
      if (attrs.edge >= 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, bufEdge);
        gl.enableVertexAttribArray(attrs.edge);
        gl.vertexAttribPointer(attrs.edge, 2, gl.FLOAT, false, 0, 0);
      }
      if (attrs.home >= 0) {
        if (floatRT) {
          gl.disableVertexAttribArray(attrs.home);
          gl.vertexAttrib4f(attrs.home, 0, 0, 0, 0);
        } else {
          gl.bindBuffer(gl.ARRAY_BUFFER, bufHome);
          gl.enableVertexAttribArray(attrs.home);
          gl.vertexAttribPointer(attrs.home, 4, gl.FLOAT, false, 0, 0);
        }
      }

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (pointPx > 0) gl.drawArrays(gl.POINTS, 0, count);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerenter", onEnter);
      target.removeEventListener("pointerleave", onLeave);
      target.removeEventListener("pointercancel", onLeave);
      window.removeEventListener("scroll", onScroll);
      disposeSet();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The canvas's layout size never changes when only the stage scale does, so
  // nothing else would tell the backing store to follow it.
  useEffect(() => {
    resizeRef.current?.();
  }, [stageScale]);

  return (
    <div ref={hostRef} style={{ position: "absolute", inset: 0 }}>
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", pointerEvents: "none" }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------- helpers */

/** `#rgb` / `#rrggbb` + an alpha → `rgba()`. Anything else is returned as is. */
function withAlpha(color, a) {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(color).trim());
  if (!m) return color;
  let h = m[1];
  if (h.length === 3) h = h.replace(/./g, (c) => c + c);
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Stat cards written as plain "Value | Text" lines, the shape the editor's
 * own list control writes. A line with no divider becomes the value alone. */
function parseStats(lines) {
  return (Array.isArray(lines) ? lines : [])
    .map((line) => String(line || "").trim())
    .filter(Boolean)
    .map((line) => {
      const i = line.indexOf("|");
      return i < 0
        ? { value: line, text: "" }
        : { value: line.slice(0, i).trim(), text: line.slice(i + 1).trim() };
    });
}

const DEFAULT_LINKS = ["HOW IT WORKS", "BENCHMARKS", "DOCS"];
const DEFAULT_STATS = [
  "94% | of flagged issues are confirmed by the author, not dismissed.",
  "40+ | languages and frameworks indexed across your repos.",
];

/* ----------------------------------------------------------------- component */

export default function ParticleHero({
  image = DEFAULT_IMAGE,
  brand = "studio.",
  links = DEFAULT_LINKS,
  ctaLabel = "Download",
  ghostWord = "studio",
  ghostOpacity = 0.55,
  heading = "Ship work that\\nsurvives review",
  intro = "Every change is read the moment it lands — catching the regression, naming what it touches, and writing the patch in your codebase's own idiom.",
  panelLabel = "See how it works",
  panelTitle = "Diff → analysis → patch.",
  panelBody = "The whole repository is indexed, not just the diff — so a changed function is traced to every caller, the tests that should have failed are flagged, and a suggested commit is opened for you to take or ignore.",
  stats = DEFAULT_STATS,
  density = 50,
  dotSize = 30,
  reach = 30,
  lift = 51,
  damping = 58,
  imageMode = "fullscreen",
  imageFit = "contain",
  imageZoom = 0.88,
  imageOffsetX = 25,
  imageOffsetY = 5,
  imageFill = FIELD_FILL,
  edgeParticles = true,
  edgeSide = "right",
  edgeWidth = 14,
  edgeMotion = 50,
  paper = "#030201",
  ink = "#F7EDE4",
  accent = "#D9480F",
  glow = "#C2521A",
  narrowAt = 900,
  interactive = true,
  onCta,
  style = {},
}) {
  const rootRef = useRef(null);
  const visualRef = useRef(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [band, setBand] = useState({ w: 0, h: 0 });
  const [aspect, setAspect] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const edge = useMemo(
    () => ({
      on: !!edgeParticles,
      side: edgeSide === "left" ? 2 : edgeSide === "both" ? 3 : 1,
      width: Math.max(1, Math.min(60, edgeWidth)) / 100,
      amp: (Math.max(0, Math.min(100, edgeMotion)) / 100) * 0.16,
    }),
    [edgeParticles, edgeSide, edgeWidth, edgeMotion]
  );

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const read = () => {
      const r = el.getBoundingClientRect();
      setBox({ w: r.width, h: r.height });
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fullscreen = imageMode !== "band";

  // The band the picture sits in (band mode only), in design px (a transform
  // doesn't change the layout size a ResizeObserver reports).
  useLayoutEffect(() => {
    const el = visualRef.current;
    if (!el) return;
    const read = () => setBand({ w: el.offsetWidth, h: el.offsetHeight });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fullscreen]);

  useEffect(() => {
    if (!panelOpen) return;
    const onKey = (e) => e.key === "Escape" && setPanelOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panelOpen]);

  // Stacked only when the box is both narrow and (roughly) portrait. A small
  // but landscape box, like a thumbnail card, keeps the wide composition and
  // simply scales it down.
  const narrow = box.w > 0 && box.w < narrowAt && box.h > box.w * 1.15;
  // Stacked: 520 wide at minimum, but a box that is wider than that at the
  // same scale (a tablet) gets a wider stage, so the picture runs edge to edge
  // instead of ending in hard vertical cuts either side of a centred column.
  const designW = narrow
    ? Math.max(DESIGN_W_NARROW, box.w / Math.min(box.w / DESIGN_W_NARROW, box.h / MIN_STAGE_H_NARROW))
    : DESIGN_W;
  // One scale for the whole hero: lay it out at a fixed design width, then
  // shrink it into whatever box it was given. Every size below is design px.
  const minStageH = narrow ? MIN_STAGE_H_NARROW : MIN_STAGE_H;
  const s =
    box.w > 0 && box.h > 0 ? Math.min(box.w / designW, box.h / minStageH) : 1;
  const stageH = box.h > 0 ? box.h / s : minStageH;
  // Centred when the height is what limited the scale, so the hero doesn't
  // sit against one edge with all the slack on the other.
  const stageX = Math.max(0, (box.w - designW * s) / 2);

  const fill = clamp(imageFill, 0.2, 1);
  // Fit the picture inside the band, then give the canvas room around it so
  // lifted particles aren't clipped at its edge.
  const ratio = aspect || 3 / 4;
  const fitH = band.w && band.h ? Math.min(band.h, band.w / ratio) : 0;
  const simH = fitH / fill;
  const simW = (fitH * ratio) / fill;

  // Full screen: the particle canvas is the whole stage, and the picture is
  // scaled inside it. The canvas is `canvasAspect` wide per unit of height and
  // the picture `fsRatio`, so "contain" shrinks it only when it is the wider
  // of the two, and "cover" grows it only when it is the narrower.
  //
  // A wide picture in the tall, narrow stacked layout would shrink to a thin
  // strip, so there it always fills (cover) and sits centred; the horizontal
  // shift that makes room for the copy on a wide hero has no meaning there.
  const fsRatio = aspect || 16 / 9;
  const canvasAspect = designW / stageH;
  const fsCover = narrow || imageFit === "cover";
  // In a squarish box "contain" would shrink the figure to a sliver, so it
  // never drops below FIT_FLOOR of the hero height; the shift below then keeps
  // the figure itself inside the frame.
  const fitScale = fsCover
    ? Math.max(1, canvasAspect / fsRatio)
    : Math.max(FIT_FLOOR, Math.min(1, canvasAspect / fsRatio));
  const fsScale = fitScale * clamp(imageZoom, 0.3, 2.5);
  // Width of the picture as a share of the hero, and the furthest right it can
  // be pushed before the figure (which fills the right ~40% of the picture)
  // would run off the edge.
  const imgWPct = fitScale * clamp(imageZoom, 0.3, 2.5) * (fsRatio / canvasAspect) * 100;
  const fsShiftX = narrow ? 0 : Math.min(clamp(imageOffsetX, -60, 60), 58 - 0.42 * imgWPct);
  // Stacked: the ghost word runs the full width right under the nav, and the
  // picture is pushed down (in design px, so it holds on any phone height)
  // until the helmet starts below the word instead of covering it.
  const fsShiftY = narrow
    ? ((NARROW_ART_DROP + (clamp(imageOffsetY, -60, 60) - 5) * 4) / Math.max(1, stageH)) * 100
    : (() => {
        // When the picture is shorter than the hero (a squarish box), slide it
        // down until its bottom meets the hero's bottom, where the fog takes over.
        const y = clamp(imageOffsetY, -60, 60);
        const bottom = 50 + y + fitScale * clamp(imageZoom, 0.3, 2.5) * 50;
        return y + Math.max(0, 100 - bottom);
      })();

  // Stacked layout: size the ghost word so it spans (almost) the whole width,
  // whatever the word is. Measured at a known size, then scaled to fit.
  const ghostRef = useRef(null);
  const [ghostFit, setGhostFit] = useState(0);
  useLayoutEffect(() => {
    if (!narrow) return;
    const el = ghostRef.current;
    if (!el) return;
    const measure = () => {
      el.style.fontSize = "100px";
      const w = el.offsetWidth;
      el.style.fontSize = "";
      if (w > 0) setGhostFit(clamp(((designW - 2 * GHOST_PAD_NARROW) * 100) / w, 60, 420));
    };
    measure();
    document.fonts?.ready?.then(measure);
  }, [narrow, ghostWord, designW]);

  const statList = parseStats(stats);
  const linkList = Array.isArray(links) ? links.filter(Boolean) : [];

  const handleCta = () => onCta?.();

  const muted = withAlpha(ink, 0.74);
  // A single-line editor field can't hold a real line break, so a typed "\n"
  // counts as one too.
  const headingText = String(heading).replace(/\\n/g, "\n");

  const navStyle = {
    position: "relative",
    zIndex: 20,
    flex: "0 0 auto",
    height: narrow ? 66 : 76,
    display: "grid",
    gridTemplateColumns: narrow ? "1fr auto" : "1fr auto 1fr",
    alignItems: "center",
    padding: narrow ? "0 18px" : "0 56px",
  };

  const ctaStyle = {
    justifySelf: "end",
    minWidth: narrow ? "auto" : 112,
    padding: narrow ? "10px 16px" : "12px 22px",
    border: `1.4px solid ${ink}`,
    borderRadius: 999,
    background: "transparent",
    color: "inherit",
    font: "inherit",
    fontSize: 12,
    cursor: "pointer",
  };

  const cardStyle = {
    boxSizing: "border-box",
    minHeight: narrow ? 132 : 142,
    padding: "17px 17px 15px",
    borderRadius: narrow ? 18 : 22,
    background: "rgba(24,10,4,0.55)",
    border: "1px solid rgba(255,190,150,0.22)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.28)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
  };

  const roundLinkStyle = {
    width: 34,
    height: 34,
    flex: "0 0 auto",
    border: 0,
    borderRadius: "50%",
    background: accent,
    color: "#FFFFFF",
    font: "inherit",
    fontSize: 15,
    lineHeight: 1,
    cursor: "pointer",
  };

  return (
    <div
      ref={rootRef}
      style={{
        ...style,
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        boxSizing: "border-box",
        color: ink,
        fontFamily: FONT,
        background: `radial-gradient(ellipse 110% 80% at 50% 100%, ${withAlpha(glow, 1)} 0%, ${withAlpha(glow, 0.8)} 28%, ${withAlpha(glow, 0.46)} 55%, ${withAlpha(glow, 0.16)} 82%, transparent 100%), ${paper}`,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: stageX,
          width: designW,
          height: stageH,
          transform: `scale(${s})`,
          transformOrigin: "top left",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ------------------------------------------------------------ nav */}
        <header style={navStyle}>
          <div
            style={{
              justifySelf: "start",
              fontSize: narrow ? 18 : 20,
              lineHeight: 1,
              fontWeight: 900,
              letterSpacing: "-0.06em",
            }}
          >
            {brand}
          </div>
          {!narrow && (
            <nav style={{ display: "flex", gap: 48, alignItems: "center" }} aria-label="Primary">
              {linkList.map((label, i) => (
                <span key={i} style={{ fontSize: 11, fontWeight: 700, letterSpacing: "-0.02em", color: ink }}>
                  {label}
                </span>
              ))}
            </nav>
          )}
          <button type="button" onClick={handleCta} style={ctaStyle}>
            {ctaLabel}
          </button>
        </header>

        {/* The word sits behind the art and under everything else (z 0). */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            zIndex: 0,
            top: narrow ? 70 : 38,
            left: 0,
            right: 0,
            textAlign: "center",
            // Cancels the trailing letter-space so the glyphs, not the box,
            // end up centred.
            textIndent: "-0.0627em",
            fontSize: narrow ? ghostFit || 160 : designW * 0.31,
            fontWeight: 700,
            lineHeight: 0.8,
            letterSpacing: "-0.09em",
            color: withAlpha("#FFE6D2", clamp(ghostOpacity, 0, 1)),
            userSelect: "none",
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          <span ref={ghostRef} style={{ display: "inline-block", letterSpacing: "-0.09em" }}>{ghostWord}</span>
        </div>

        {/* --------------------------------------------------------- visual */}
        {fullscreen ? (
          // The whole stage is the particle canvas. It sits above the ghost
          // word (z 0) and beneath the nav, headline and cards, which float
          // over the picture.
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 4,
              transform: `translate(${fsShiftX}%, ${fsShiftY}%)`,
              pointerEvents: "none",
            }}
          >
            <ParticleField
              src={image}
              density={density}
              dotSize={dotSize}
              reach={reach}
              lift={lift}
              damping={damping}
              imageScale={fsScale}
              stageScale={s}
              interactive={interactive}
              edge={edge}
              onAspect={setAspect}
              eventsRef={rootRef}
            />
          </div>
        ) : (
          <div
            ref={visualRef}
            style={
              narrow
                ? { position: "relative", zIndex: 4, flex: "1 1 auto", minHeight: 0, margin: "16px 0 8px" }
                : { position: "absolute", zIndex: 4, left: -28, width: designW * 1.04, top: 96, bottom: 380 }
            }
          >
            {simW > 0 && simH > 0 && (
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: simW,
                  height: simH,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <ParticleField
                  src={image}
                  density={density}
                  dotSize={dotSize}
                  reach={reach}
                  lift={lift}
                  damping={damping}
                  imageScale={fill}
                  stageScale={s}
                  interactive={interactive}
                  edge={edge}
                  onAspect={setAspect}
                  eventsRef={rootRef}
                />
              </div>
            )}
          </div>
        )}

        {/* In the stacked layout the copy runs over the bottom of the art, so
            the art fades into the page colour behind it. That keeps dark
            text readable on a dark picture, and hides the flat cut where a
            cropped render ends. */}
        {fullscreen && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              zIndex: 6,
              left: 0,
              right: 0,
              bottom: 0,
              height: narrow ? "52%" : "46%",
              background: `linear-gradient(to bottom, transparent 0%, ${withAlpha(glow, 0.32)} 42%, ${withAlpha(glow, 0.78)} 76%, ${glow} 100%)`,
              pointerEvents: "none",
            }}
          />
        )}

        {/* -------------------------------------------------- bottom layout */}
        <div
          style={
            narrow
              ? {
                  position: "relative",
                  zIndex: 8,
                  flex: "0 0 auto",
                  // Sits at the bottom: in band mode the band above takes the
                  // spare height; in full screen there is nothing there to.
                  marginTop: "auto",
                  display: "grid",
                  gridTemplateColumns: "1fr",
                  gap: 20,
                  padding: "0 18px 24px",
                }
              : {
                  position: "absolute",
                  zIndex: 8,
                  left: 0,
                  right: 0,
                  bottom: stageH * 0.058,
                  display: "grid",
                  gridTemplateColumns: "1.05fr 0.95fr 0.9fr",
                  alignItems: "end",
                  gap: 34,
                  padding: "0 49px",
                }
          }
        >
          <div style={{ alignSelf: "end" }}>
            <button
              type="button"
              onClick={() => setPanelOpen(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                border: 0,
                color: "#FFFFFF",
                background: accent,
                borderRadius: 999,
                padding: "12px 16px 12px 18px",
                margin: "0 0 18px",
                font: "inherit",
                fontSize: 11,
                cursor: "pointer",
                boxShadow: "0 5px 14px rgba(0,0,0,0.08)",
              }}
            >
              <span>{panelLabel}</span>
              <span aria-hidden="true" style={{ fontSize: 15, lineHeight: 1 }}>↗</span>
            </button>
            <h1
              style={{
                margin: 0,
                maxWidth: narrow ? "none" : 470,
                fontSize: narrow ? 48 : designW * 0.051,
                lineHeight: 0.88,
                letterSpacing: "-0.07em",
                fontWeight: 500,
                whiteSpace: "pre-line",
              }}
            >
              {headingText}
            </h1>
          </div>

          <p
            style={{
              margin: narrow ? 0 : "0 0 8px",
              maxWidth: narrow ? 500 : 390,
              color: muted,
              fontSize: narrow ? 14 : 12,
              lineHeight: 1.45,
            }}
          >
            {intro}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {statList.map((stat, i) => (
              <article key={i} style={cardStyle}>
                <strong style={{ fontSize: narrow ? 30 : 34, lineHeight: 1, letterSpacing: "-0.05em", fontWeight: 500 }}>
                  {stat.value}
                </strong>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 34px", gap: 10, alignItems: "end" }}>
                  <p style={{ margin: 0, color: withAlpha(ink, 0.7), fontSize: 8, lineHeight: 1.22 }}>{stat.text}</p>
                  <button type="button" aria-label={stat.value} onClick={handleCta} style={roundLinkStyle}>
                    ↗
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* ---------------------------------------------------------- panel */}
        {panelOpen && (
          <div
            style={{
              position: "absolute",
              zIndex: 50,
              right: narrow ? 18 : 28,
              bottom: narrow ? 18 : 28,
              left: narrow ? 18 : "auto",
              width: narrow ? "auto" : 420,
              padding: 28,
              borderRadius: 24,
              background: "#140803",
              color: "#FFFFFF",
              border: "1px solid rgba(255,190,150,0.25)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
            }}
          >
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              aria-label="Close"
              style={{
                position: "absolute",
                top: 14,
                right: 16,
                border: 0,
                background: "transparent",
                color: "#FFFFFF",
                font: "inherit",
                fontSize: 28,
                lineHeight: 1,
                cursor: "pointer",
              }}
            >
              ×
            </button>
            <span style={{ fontSize: 10, letterSpacing: "0.15em", opacity: 0.6 }}>
              {panelLabel.toUpperCase()}
            </span>
            <h2 style={{ fontSize: 30, lineHeight: 1, margin: "14px 0", letterSpacing: "-0.04em", fontWeight: 500 }}>
              {panelTitle}
            </h2>
            <p style={{ margin: 0, color: "#C6C6C6", lineHeight: 1.5, fontSize: 14 }}>{panelBody}</p>
          </div>
        )}
      </div>
    </div>
  );
}
