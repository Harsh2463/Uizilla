import { useEffect, useMemo, useRef } from "react";

/**
 * RotatingGallery — a vertical column of pictures that scrolls forever and
 * twists as each card passes through the frame (WebGL). Scroll, drag or swipe
 * it; tap a picture to bring it forward, tap again to send it back.
 *
 * Self-contained: copy this single file into any React (16.8+) project and
 * render <RotatingGallery />. No other packages, CSS or files needed.
 * It fills 100% of its parent and scales the cards down on narrow frames, so
 * give the parent a height, e.g.
 *   <div style={{ height: 700 }}><RotatingGallery /></div>
 * Missing or broken images automatically fall back to the built-in list, and
 * to a painted placeholder if that fails too.
 *
 * `scrollLock`: when on, the wheel turns the column instead of scrolling the
 * page while the pointer is over it. `hold` says how many screens of scrolling
 * it keeps before handing the wheel back (10 = never).
 */

/* -------------------------------------------------------------- constants */

const UNSPLASH = (id) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=80`;

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

/** A 45° lens 20 units back. Every world measurement derives from it. */
const CAMERA_FOV = 45;
const CAMERA_Z = 20;

/** The frame's height in world units: it falls out of the lens alone. */
const VIEWPORT_HEIGHT = 2 * Math.tan((CAMERA_FOV * Math.PI) / 180 / 2) * CAMERA_Z;

/** The twist is handed out along the plane's width, so that axis needs the vertices. */
const WIDTH_SEGMENTS = 100;
const MAX_DPR = 2;
const PLACEHOLDER_COUNT = 8;

/** A pixel of gesture moves the column a pixel, at sensitivity 5. */
const GESTURE_GAIN = 1;
/** A single wheel event never advances more than this. */
const WHEEL_CLAMP = 240;
/** A gap longer than this ends a run of wheel events. */
const WHEEL_RUN_GAP = 400;

/* The tap: one curve out and the same curve back. */
const FOCUS_SECONDS = 0.6;
/** How much of the frame the chosen picture is brought up to fill. */
const FOCUS_FILL = 0.82;
const FOCUS_MAX_SCALE = 4;
/** What the rest of the column falls to while one picture is up. */
const FOCUS_DIM = 0.28;
/** A press that travels further than this, or lasts longer, was not a tap. */
const TAP_SLOP_PX = 6;
const TAP_MS = 500;

/** Half-width of the corner's antialiased edge, in CSS pixels. */
const EDGE_AA_PX = 1.5;
/** The column is repeated until it is this many cards longer than the frame. */
const WRAP_SLACK_CARDS = 3;
const MAX_PLANES = 120;

/** Cards shrink on frames narrower than this many card widths. */
const FIT_WIDTH = 1 / 0.85;

/**
 * Wraps a position into the window [-span/2, span/2): the trick behind a column
 * that runs forever in BOTH directions. Nothing is remembered between frames,
 * so reversing is free.
 */
function wrapTo(value, span) {
  return value - span * Math.floor(value / span + 0.5);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/** Symmetric, so playing the progress backwards retraces the path exactly. */
function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Smoothing 0–10 → the lerp the scroll rides (geometric, 0.25 down to 0.004). */
function easeFor(smoothing) {
  return 0.25 * Math.pow(0.016, clamp(smoothing, 0, 10) / 10);
}

/** Hold 0–10 → how many screens of scrolling the section may swallow. 10 never lets go. */
function holdFor(hold) {
  const held = clamp(hold, 0, 10);
  return held >= 10 ? Infinity : held * VIEWPORT_HEIGHT;
}

function srcOf(value) {
  if (!value) return null;
  if (typeof value === "string") return value.trim() || null;
  if (value.src) return value.src;
  const first = value.srcSet?.split(",")[0]?.trim().split(/\s+/)[0];
  return first || null;
}

/** Rows may be { src, offsetY } or a bare URL. offsetY slides the picture in its window. */
function resolveEntry(entry) {
  if (entry && typeof entry === "object") {
    return {
      src: srcOf(entry),
      offsetY: typeof entry.offsetY === "number" ? entry.offsetY : 0,
    };
  }
  return { src: srcOf(entry), offsetY: 0 };
}

/** Stand-in artwork, painted rather than fetched, for a picture that cannot load. */
function makePlaceholder(index) {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 640;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const hue = (index * 47 + 200) % 360;
  const gradient = ctx.createLinearGradient(0, 0, 512, 640);
  gradient.addColorStop(0, `hsl(${hue} 42% 44%)`);
  gradient.addColorStop(1, `hsl(${(hue + 50) % 360} 58% 9%)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 640);
  return canvas;
}

/* ---------------------------------------------------------------- shaders */

const VERTEX_SHADER = `
precision highp float;

attribute vec3 position;
attribute vec2 uv;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

uniform float uPosition;
uniform float uSpin;
uniform float uFlat;
uniform float uDistortion;
uniform vec3 distortionAxis;
uniform vec3 rotationAxis;

varying vec2 vUv;

float PI = 3.141592653589793238;

mat4 rotationMatrix(vec3 axis, float angle) {
    axis = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;

    return mat4(oc * axis.x * axis.x + c,          oc * axis.x * axis.y - axis.z * s, oc * axis.z * axis.x + axis.y * s, 0.0,
                oc * axis.x * axis.y + axis.z * s, oc * axis.y * axis.y + c,          oc * axis.y * axis.z - axis.x * s, 0.0,
                oc * axis.z * axis.x - axis.y * s, oc * axis.y * axis.z + axis.x * s, oc * axis.z * axis.z + c,          0.0,
                0.0,                               0.0,                               0.0,                              1.0);
}

vec3 rotate(vec3 v, vec3 axis, float angle) {
    mat4 m = rotationMatrix(axis, angle);
    return (m * vec4(v, 1.0)).xyz;
}

float qinticInOut(float t) {
    return t < 0.5
        ? +16.0 * pow(t, 5.0)
        : -0.5 * abs(pow(2.0 * t - 2.0, 5.0)) + 1.0;
}

void main() {
    vUv = uv;

    float norm = 0.5;

    vec3 newpos = position;

    // Where this vertex sits along the twist axis: the head start it gets,
    // which is what turns a flip into a twist.
    float offset = (dot(distortionAxis, position) + norm / 2.0) / norm;

    float localprogress = clamp(
        (fract(uPosition * uSpin * 0.01) - 0.01 * uDistortion * offset) /
            (1.0 - 0.01 * uDistortion),
        0.0,
        2.0
    );

    // uFlat unwinds the turn down to nothing at 1. It scales the ANGLE, so the
    // plane relaxes out of its twist with every vertex arriving flat together.
    localprogress = qinticInOut(localprogress) * PI * (1.0 - uFlat);

    newpos = rotate(newpos, rotationAxis, localprogress);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(newpos, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;

uniform vec2 uImageSize;
uniform vec2 uPlaneSize;
uniform sampler2D tMap;
uniform float uOffset;
uniform float uRadius;
uniform float uAA;
uniform float uDim;

varying vec2 vUv;

void main() {
    // Cover, not stretch: the largest centred rectangle of the CARD's aspect
    // that fits inside the picture.
    vec2 ratio = vec2(
        min((uPlaneSize.x / uPlaneSize.y) / (uImageSize.x / uImageSize.y), 1.0),
        min((uPlaneSize.y / uPlaneSize.x) / (uImageSize.y / uImageSize.x), 1.0)
    );

    // The offset picks which band of the cropped overflow shows, clamped to
    // the slack that actually exists.
    float slack = (1.0 - ratio.y) * 0.5;
    float shift = clamp(uOffset * ratio.y, -slack, slack);

    vec2 uv = vec2(
        vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
        vUv.y * ratio.y + (1.0 - ratio.y) * 0.5 + shift
    );

    vec3 rgb = texture2D(tMap, uv).rgb * uDim;

    // Rounded corner, cut in the card's own surface space so the twist carries it.
    vec2 halfSize = uPlaneSize * 0.5;
    vec2 q = abs((vUv - 0.5) * uPlaneSize) - halfSize + uRadius;
    float dist = min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - uRadius;
    float alpha = 1.0 - smoothstep(-uAA, uAA, dist);

    // Premultiplied: the canvas composites over the container's background.
    gl_FragColor = vec4(rgb * alpha, alpha);
}
`;

/* ------------------------------------------------------------- gl helpers */

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn("RotatingGallery: shader failed —", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function link(gl) {
  const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn("RotatingGallery: program failed —", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

/** A unit quad centred on the origin, with v = 1 at the top. */
function buildPlane(segments) {
  const cols = segments + 1;
  const position = new Float32Array(cols * 2 * 3);
  const uv = new Float32Array(cols * 2 * 2);
  const index = new Uint16Array(segments * 6);

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < cols; col++) {
      const i = row * cols + col;
      const u = col / segments;
      const v = 1 - row;
      position[i * 3] = u - 0.5;
      position[i * 3 + 1] = v - 0.5;
      position[i * 3 + 2] = 0;
      uv[i * 2] = u;
      uv[i * 2 + 1] = v;
    }
  }
  for (let col = 0; col < segments; col++) {
    const a = col;
    const b = col + 1;
    const c = cols + col;
    const d = cols + col + 1;
    index.set([a, c, b, b, c, d], col * 6);
  }
  return { position, uv, index };
}

/** Column-major perspective matrix. */
function perspective(out, fovDeg, aspect, near, far) {
  const f = 1 / Math.tan((fovDeg * Math.PI) / 180 / 2);
  out.fill(0);
  out[0] = f / aspect;
  out[5] = f;
  out[10] = (far + near) / (near - far);
  out[11] = -1;
  out[14] = (2 * far * near) / (near - far);
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

/* -------------------------------------------------------------- component */

export default function RotatingGallery({
  images = FALLBACK_IMAGES,
  background = "#000000",
  spacing = 16,
  cardWidth = 400,
  cardHeight = 300,
  radius = 16,
  spin = 5,
  twist = 3,
  axis = "y",
  tap = true,
  scrollLock = false,
  hold = 10,
  scrollSensitivity = 10,
  smoothing = 0,
  drag = true,
  dragSensitivity = 10,
  imageProxy = DEFAULT_IMAGE_PROXY,
  style,
}) {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);

  const entries = useMemo(() => (images ?? []).map(resolveEntry), [images]);
  const count = entries.length || PLACEHOLDER_COUNT;
  // The load effect only cares that the URLs changed, not that the parent
  // hands back a fresh array on every render.
  const srcKey = entries.map((entry) => entry.src ?? "").join("\n");

  // Everything the render loop reads, refreshed every render so the loop is
  // never rebuilt and a dragged slider lands on the next frame.
  const live = useRef(null);
  live.current = {
    entries,
    count,
    spacing,
    cardWidth,
    cardHeight,
    radius,
    spin,
    twist,
    axis,
    tap,
    scrollLock,
    hold,
    scrollSensitivity,
    smoothing,
    drag,
    dragSensitivity,
  };

  // Decoded pictures waiting to be uploaded, and whether the set is dirty.
  const decoded = useRef({ list: [], dirty: true });
  // Read inside the loader, so changing the proxy does not rebuild the scene.
  const proxyRef = useRef(imageProxy);
  proxyRef.current = imageProxy;

  /* -------------------------------------------------------- image load --- */

  useEffect(() => {
    let alive = true;
    const srcs = srcKey ? srcKey.split("\n") : [];
    decoded.current.list = srcs.map(() => null);
    decoded.current.dirty = true;

    srcs.forEach((src, slot) => {
      const img = new Image();
      // WebGL may only upload a picture the page is allowed to read, so ask
      // for CORS access up front.
      img.crossOrigin = "anonymous";
      // Try the entry itself, then a built-in photo. If both fail, a painted
      // placeholder is used at upload time.
      const tries = [
        src,
        proxied(src, proxyRef.current),
        FALLBACK_IMAGES[slot % FALLBACK_IMAGES.length].src,
      ].filter((s, i, a) => s && a.indexOf(s) === i);
      let k = 0;
      img.onload = () => {
        if (!alive) return;
        decoded.current.list[slot] = img;
        // A flag the render loop reads: uploading from here would race the
        // context's own setup.
        decoded.current.dirty = true;
      };
      img.onerror = () => {
        if (!alive) return;
        if (++k < tries.length) {
          img.src = tries[k];
          return;
        }
        decoded.current.list[slot] = null;
        decoded.current.dirty = true;
      };
      img.src = tries[0] ?? FALLBACK_IMAGES[slot % FALLBACK_IMAGES.length].src;
    });

    return () => {
      alive = false;
    };
  }, [srcKey, imageProxy]);

  /* ------------------------------------------------------------- scene --- */

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root) return;

    const options = { alpha: true, antialias: true, premultipliedAlpha: true };
    const gl =
      canvas.getContext("webgl", options) ||
      canvas.getContext("experimental-webgl", options);
    if (!gl) {
      console.warn("RotatingGallery: WebGL is unavailable.");
      return;
    }

    const program = link(gl);
    if (!program) return;
    gl.useProgram(program);

    /* ------------------------------------------------------ geometry --- */

    const plane = buildPlane(WIDTH_SEGMENTS);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, plane.position, gl.STATIC_DRAW);
    const aPosition = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);

    const uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, plane.uv, gl.STATIC_DRAW);
    const aUv = gl.getAttribLocation(program, "uv");
    gl.enableVertexAttribArray(aUv);
    gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, plane.index, gl.STATIC_DRAW);

    const uniform = (name) => gl.getUniformLocation(program, name);
    const uProjection = uniform("projectionMatrix");
    const uModelView = uniform("modelViewMatrix");
    const uPosition = uniform("uPosition");
    const uSpin = uniform("uSpin");
    const uDistortion = uniform("uDistortion");
    const uDistortionAxis = uniform("distortionAxis");
    const uRotationAxis = uniform("rotationAxis");
    const uPlaneSize = uniform("uPlaneSize");
    const uImageSize = uniform("uImageSize");
    const uOffset = uniform("uOffset");
    const uRadius = uniform("uRadius");
    const uAA = uniform("uAA");
    const uFlat = uniform("uFlat");
    const uDim = uniform("uDim");
    gl.uniform1i(uniform("tMap"), 0);

    // The column is drawn in order and nothing needs to occlude anything. The
    // blend is for the corner radius, and it is premultiplied.
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    /* ------------------------------------------------------ textures --- */

    const placeholders = new Map();
    const placeholderFor = (index) => {
      if (!placeholders.has(index)) placeholders.set(index, makePlaceholder(index));
      return placeholders.get(index) ?? null;
    };

    const slots = [];

    const growTo = (n) => {
      while (slots.length < n) {
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        // No mipmaps: a picture of arbitrary size needs none.
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        slots.push({ tex, width: 0, height: 0 });
      }
      while (slots.length > n) {
        const slot = slots.pop();
        if (slot?.tex) gl.deleteTexture(slot.tex);
      }
    };

    const uploadAll = (n) => {
      growTo(n);
      const list = decoded.current.list;
      // Without this the pictures arrive upside down.
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      for (let i = 0; i < n; i++) {
        const slot = slots[i];
        const img = list[i] ?? null;
        const source = img ?? placeholderFor(i);
        gl.bindTexture(gl.TEXTURE_2D, slot.tex);
        if (!source) continue;
        // A picture from a host that serves no CORS header taints the context
        // and this throws. Caught so the frame still draws and the slot is
        // cleared rather than retried sixty times a second.
        try {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
          slot.width = img?.naturalWidth ?? source.width;
          slot.height = img?.naturalHeight ?? source.height;
        } catch (err) {
          console.warn(
            "RotatingGallery: a picture cannot be drawn — its host sends no CORS header.",
            err
          );
          decoded.current.list[i] = null;
          slot.width = 0;
          slot.height = 0;
        }
      }
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      decoded.current.dirty = false;
    };

    /* ---------------------------------------------------------- size --- */

    let cssW = 1;
    let cssH = 1;
    // World units per CSS pixel. Written by resize, read by the gestures so a
    // pixel of wheel is a pixel of column at any frame size.
    let unitsPerPx = VIEWPORT_HEIGHT;
    const projection = new Float32Array(16);
    const modelView = new Float32Array(16);

    const resize = () => {
      const w = canvas.clientWidth || 1;
      const h = canvas.clientHeight || 1;
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const bw = Math.max(1, Math.round(w * dpr));
      const bh = Math.max(1, Math.round(h * dpr));
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw;
        canvas.height = bh;
      }
      cssW = w;
      cssH = h;
      unitsPerPx = VIEWPORT_HEIGHT / h;
      gl.viewport(0, 0, bw, bh);
      perspective(projection, CAMERA_FOV, bw / bh, 0.1, 100);
      gl.uniformMatrix4fv(uProjection, false, projection);
    };
    resize();
    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => resize()) : null;
    observer?.observe(canvas);

    /* ------------------------------------------------------- gesture --- */

    const scroll = { current: 0, target: 0, grabbed: 0 };

    // The tap. `index` is the plane that is up (or on its way home), `phase`
    // walks 0→1 and back at a fixed rate, and `target` is where it is walking
    // to. One number, played forwards or backwards, makes the return the
    // outward path in reverse.
    const focus = { index: -1, phase: 0, target: 0 };

    // Last frame's layout, so a tap is tested against what is actually on screen.
    const layout = { ys: [], sx: 0, sy: 0, count: 0 };

    // Which plane is under a pointer, or -1. Measured against each card's
    // UNTWISTED box, so the middle picture is never the hardest to choose.
    const pick = (clientX, clientY) => {
      const rect = root.getBoundingClientRect();
      if (!rect.width || !rect.height) return -1;
      const worldX = ((clientX - rect.left) / rect.width - 0.5) * cssW * unitsPerPx;
      const worldY = (0.5 - (clientY - rect.top) / rect.height) * cssH * unitsPerPx;
      if (Math.abs(worldX) > layout.sx / 2) return -1;
      let best = -1;
      let bestDistance = Infinity;
      for (let i = 0; i < layout.count; i++) {
        const distance = Math.abs(worldY - layout.ys[i]);
        if (distance <= layout.sy / 2 && distance < bestDistance) {
          best = i;
          bestDistance = distance;
        }
      }
      return best;
    };

    const applyCursor = () => {
      root.style.cursor =
        focus.index >= 0 ? "zoom-out" : live.current.drag ? "grab" : "default";
    };

    const onTap = (clientX, clientY) => {
      if (!live.current.tap) return;
      if (focus.index >= 0) {
        // Anywhere at all sends it back down the way it came.
        focus.target = 0;
        applyCursor();
        return;
      }
      const hit = pick(clientX, clientY);
      if (hit < 0) return;
      focus.index = hit;
      focus.target = 1;
      // The column stops where it stands, so the picture has a place to return to.
      scroll.target = scroll.current;
      applyCursor();
    };

    // How much scrolling the lock has spent, and which way it is spending it.
    let spent = 0;
    let spentDir = 0;
    // Whether THIS run of wheel events is being held, and when the last one
    // arrived. Decided once at the start of a run and kept to its end, so the
    // page is never snatched out from under a gesture.
    let runLocked = false;
    let lastWheelAt = -Infinity;

    const onWheel = (event) => {
      let delta = event.deltaY;
      if (event.deltaMode === 1) delta *= 16;
      else if (event.deltaMode === 2) delta *= root.clientHeight || 800;
      delta = clamp(delta, -WHEEL_CLAMP, WHEEL_CLAMP);
      const travel =
        delta * unitsPerPx * GESTURE_GAIN * (live.current.scrollSensitivity / 5);

      if (focus.index >= 0) {
        // A picture is up: the column is held still and the page must not
        // slide out from behind it either.
        if (live.current.scrollLock && event.cancelable) event.preventDefault();
        return;
      }

      const now = performance.now();
      const started = now - lastWheelAt > WHEEL_RUN_GAP;
      lastWheelAt = now;

      if (live.current.scrollLock && travel !== 0) {
        const direction = Math.sign(travel);
        const turned = direction !== spentDir;
        if (turned) {
          // Turning round is a fresh pass at the section.
          spentDir = direction;
          spent = 0;
        }
        if (started || turned) runLocked = spent < holdFor(live.current.hold);
        if (runLocked) {
          // Spent in SCROLLING, not in travel, so raising the sensitivity does
          // not quietly shorten the hold.
          spent += Math.abs(delta) * unitsPerPx;
          if (event.cancelable) event.preventDefault();
        }
      } else if (!live.current.scrollLock) {
        runLocked = false;
      }

      scroll.target += travel;
    };

    let touchY = null;
    const onTouchStart = (event) => {
      touchY = event.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (event) => {
      const y = event.touches[0]?.clientY;
      if (y == null || touchY == null) return;
      const delta = clamp(touchY - y, -WHEEL_CLAMP, WHEEL_CLAMP);
      touchY = y;
      if (focus.index >= 0) return;
      scroll.target +=
        delta * unitsPerPx * GESTURE_GAIN * (live.current.scrollSensitivity / 5);
    };
    const onTouchEnd = () => {
      touchY = null;
    };

    let dragStart = null;
    // Where a press started, so a release can tell a tap from a drag or swipe.
    let pressed = null;

    const onPointerDown = (event) => {
      pressed = { x: event.clientX, y: event.clientY, at: performance.now() };
      // Touch already drives the column through the passive path above. A
      // picture that is up holds the column still, so nothing may drag it.
      if (!live.current.drag || event.pointerType === "touch" || focus.index >= 0) return;
      dragStart = event.clientY;
      scroll.grabbed = scroll.target;
      root.setPointerCapture?.(event.pointerId);
      root.style.cursor = "grabbing";
    };
    const onPointerMove = (event) => {
      if (dragStart == null) return;
      scroll.target =
        scroll.grabbed +
        (dragStart - event.clientY) *
          unitsPerPx *
          GESTURE_GAIN *
          (live.current.dragSensitivity / 5);
    };
    const onPointerUp = (event) => {
      if (dragStart != null) {
        dragStart = null;
        root.releasePointerCapture?.(event.pointerId);
      }
      if (pressed) {
        const travelled = Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y);
        const held = performance.now() - pressed.at;
        pressed = null;
        if (travelled <= TAP_SLOP_PX && held <= TAP_MS) {
          onTap(event.clientX, event.clientY);
          return;
        }
      }
      applyCursor();
    };
    const onPointerCancel = () => {
      dragStart = null;
      pressed = null;
      applyCursor();
    };

    // Not passive: the lock has to be able to keep the page still.
    root.addEventListener("wheel", onWheel, { passive: false });
    root.addEventListener("touchstart", onTouchStart, { passive: true });
    root.addEventListener("touchmove", onTouchMove, { passive: true });
    root.addEventListener("touchend", onTouchEnd, { passive: true });
    root.addEventListener("touchcancel", onTouchEnd, { passive: true });
    root.addEventListener("pointerdown", onPointerDown);
    root.addEventListener("pointermove", onPointerMove);
    root.addEventListener("pointerup", onPointerUp);
    root.addEventListener("pointercancel", onPointerCancel);

    /* ----------------------------------------------------- offscreen --- */

    let visible = true;
    const intersect =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            (records) => {
              const showing = records[records.length - 1]?.isIntersecting ?? true;
              // Left the frame: the next approach gets the whole hold again.
              if (!showing) {
                spent = 0;
                spentDir = 0;
                runLocked = false;
              }
              visible = showing;
            },
            { rootMargin: "200px" }
          )
        : null;
    intersect?.observe(root);

    // "Reduce motion": the column no longer coasts after a gesture.
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");

    /* --------------------------------------------------------- frame --- */

    let sources = -1;
    let raf = 0;
    let previous = performance.now();

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - previous) / 1000, 0.1);
      previous = now;
      if (!visible) return;

      const props = live.current;
      const pictures = Math.max(1, props.count);

      resize();

      if (sources !== pictures) {
        decoded.current.dirty = true;
        sources = pictures;
      }
      if (decoded.current.dirty) uploadAll(pictures);

      // The tap, walked at a fixed rate so out and back take the same time.
      if (focus.phase !== focus.target) {
        const way = focus.target > focus.phase ? 1 : -1;
        focus.phase = clamp(focus.phase + (way * dt) / FOCUS_SECONDS, 0, 1);
        if (focus.phase === 0) focus.index = -1;
      }
      const lifted = easeInOut(focus.phase);

      // The scroll, frame-rate normalised. A picture that is up holds the
      // column exactly where it stood.
      if (focus.index < 0) {
        const smoothing = mq.matches ? 0 : props.smoothing;
        const ease = 1 - Math.pow(1 - easeFor(smoothing), dt * 60);
        scroll.current += (scroll.target - scroll.current) * ease;
      }

      const viewportH = VIEWPORT_HEIGHT;

      // Cards shrink on narrow frames so they never overflow a phone.
      const k = Math.min(1, cssW / (props.cardWidth * FIT_WIDTH));
      const sx = Math.max(0.001, props.cardWidth * k * unitsPerPx);
      const sy = Math.max(0.001, props.cardHeight * k * unitsPerPx);
      const step = sy + Math.max(0, props.spacing) * k * unitsPerPx;

      // How long the column has to be: the wrap point sits half a column from
      // the centre, so the column must clear the frame plus a few cards. A
      // short list is repeated rather than left with a hole.
      const spanNeeded = viewportH + WRAP_SLACK_CARDS * sy;
      const repeats = Math.max(
        1,
        Math.min(
          Math.max(1, Math.floor(MAX_PLANES / pictures)),
          Math.ceil(spanNeeded / (step * pictures))
        )
      );
      const n = pictures * repeats;
      const total = step * n;

      // A picture cannot stay up if its column has been rebuilt underneath it.
      if (focus.index >= n) {
        focus.index = -1;
        focus.phase = 0;
        focus.target = 0;
      }

      // Where the chosen picture is brought to: the middle of the frame, flat,
      // and forward until it fills FOCUS_FILL of the smaller dimension.
      const viewportW = viewportH * (cssW / Math.max(1, cssH));
      const focusScale = clamp(
        Math.min((FOCUS_FILL * viewportH) / sy, (FOCUS_FILL * viewportW) / sx),
        1,
        FOCUS_MAX_SCALE
      );
      const focusDepth = CAMERA_Z * (1 - 1 / focusScale);

      // What is on screen, for the next tap to be tested against.
      if (layout.ys.length !== n) layout.ys.length = n;
      for (let i = 0; i < n; i++) {
        layout.ys[i] = wrapTo(step * i - scroll.current, total);
      }
      layout.sx = sx;
      layout.sy = sy;
      layout.count = n;

      gl.uniform1f(uSpin, clamp(props.spin, 0, 10));
      gl.uniform1f(uDistortion, clamp(props.twist, 0, 10));
      // The head start runs across the plane AND up it, which keeps the twist
      // from reading as a hinge.
      gl.uniform3f(uDistortionAxis, 1, 1, 0);
      if (props.axis === "x") gl.uniform3f(uRotationAxis, 1, 0, 0);
      else gl.uniform3f(uRotationAxis, 0, 1, 0);
      gl.uniform2f(uPlaneSize, sx, sy);
      gl.uniform1f(
        uRadius,
        clamp(props.radius * k * unitsPerPx, 0, Math.min(sx, sy) / 2)
      );
      gl.uniform1f(uAA, EDGE_AA_PX * unitsPerPx);

      gl.clear(gl.COLOR_BUFFER_BIT);

      const drawPlane = (i) => {
        const chosen = i === focus.index;
        // Folded into one window centred on the screen, so the column presents
        // the same face to a scroll up as to a scroll down.
        const home = layout.ys[i];
        // The chosen picture walks its own offset out to nothing, so it
        // arrives dead centre and leaves from exactly where it stood.
        const y = chosen ? home * (1 - lifted) : home;

        // Screen position → rotation phase; `fract` in the shader turns it into
        // the repeating turn. Read at the picture's HOME position even as it
        // lifts, so the twist it unwinds is the one it was caught in.
        gl.uniform1f(uPosition, 10 + (5 * (chosen ? home : y)) / viewportH);
        gl.uniform1f(uFlat, chosen ? lifted : 0);
        gl.uniform1f(uDim, chosen ? 1 : 1 - (1 - FOCUS_DIM) * lifted);

        modelView.fill(0);
        modelView[0] = sx;
        modelView[5] = sy;
        modelView[10] = 1;
        modelView[13] = y;
        modelView[14] = -CAMERA_Z + (chosen ? focusDepth * lifted : 0);
        modelView[15] = 1;
        gl.uniformMatrix4fv(uModelView, false, modelView);

        // The list repeats along the column, so a plane past the end of it
        // shows the picture that many places from the start.
        const source = i % pictures;
        const slot = slots[source];
        if (!slot) return;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, slot.tex);
        // No measurement yet means no aspect to honour: the card's own size
        // fills the box, the right first paint.
        if (slot.width > 0 && slot.height > 0) gl.uniform2f(uImageSize, slot.width, slot.height);
        else gl.uniform2f(uImageSize, sx, sy);
        // Read here rather than baked in at upload, so the picture re-frames live.
        const offsetPx = props.entries[source]?.offsetY ?? 0;
        gl.uniform1f(uOffset, offsetPx / Math.max(1, props.cardHeight));

        gl.drawElements(gl.TRIANGLES, plane.index.length, gl.UNSIGNED_SHORT, 0);
      };

      // The chosen picture goes last: nothing writes depth, so last is in front.
      for (let i = 0; i < n; i++) if (i !== focus.index) drawPlane(i);
      if (focus.index >= 0 && focus.index < n) drawPlane(focus.index);
    };
    raf = requestAnimationFrame(frame);

    /* ------------------------------------------------------ teardown --- */

    return () => {
      cancelAnimationFrame(raf);
      observer?.disconnect();
      intersect?.disconnect();
      root.removeEventListener("wheel", onWheel);
      root.removeEventListener("touchstart", onTouchStart);
      root.removeEventListener("touchmove", onTouchMove);
      root.removeEventListener("touchend", onTouchEnd);
      root.removeEventListener("touchcancel", onTouchEnd);
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerup", onPointerUp);
      root.removeEventListener("pointercancel", onPointerCancel);
      slots.forEach((slot) => slot.tex && gl.deleteTexture(slot.tex));
      gl.deleteBuffer(positionBuffer);
      gl.deleteBuffer(uvBuffer);
      gl.deleteBuffer(indexBuffer);
      gl.deleteProgram(program);
      // Never loseContext(): getContext hands the same context back per
      // canvas, so a remount would find a dead one.
    };
  }, []);

  return (
    <div
      ref={rootRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background,
        // The wheel and the finger are read without being taken, so the page
        // still scrolls past the section.
        touchAction: "pan-y",
        cursor: drag ? "grab" : "default",
        userSelect: "none",
        WebkitUserSelect: "none",
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          display: "block",
        }}
      />
    </div>
  );
}
