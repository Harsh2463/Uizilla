import { useEffect, useRef } from "react";

/**
 * RotundaCarousel — a ring of pictures seen from INSIDE it (WebGL).
 *
 * Self-contained: copy this single file into any React (16.8+) project and
 * render <RotundaCarousel />. No other packages, CSS or files needed.
 * It fills 100% of its parent, so give the parent a height, e.g.
 *   <div style={{ height: 600 }}><RotundaCarousel /></div>
 * Missing or broken images automatically fall back to the built-in list.
 *
 * How it works
 * - The camera stands on the ring's axis and the pictures hang on the wall
 *   around it. The camera offset is clamped to 0.9 of the radius, so a ray
 *   from the eye crosses the wall exactly once: nothing can hide anything
 *   else, so there is no depth buffer, no sorting and no face culling.
 * - A gap between two panels shows the background, never the far wall.
 * - One texture per image, resampled to a power-of-two canvas so mipmaps and
 *   anisotropic filtering work on WebGL1.
 * - Dragging uses the inverse projection: the wall point under the pointer
 *   when you press stays under the pointer while you drag.
 * - The ring is derived from the panels: radius = n * (width + gap) / 2pi,
 *   so Width : Height is the picture aspect you type, and Width : Gap is how
 *   much of the wall is picture.
 * - Very few images make very wide panels (angular size = 2pi * width /
 *   (n * (width + gap))). Raise Gap or lower Width if panels get too big.
 */

/* ---------------------------------------------------------------- constants */

const RADIUS = 1; // the ring. Fixed: with the camera on the axis only ratios matter.
const SEG = 28; // facets per panel; a 45-degree arc is smooth past ~20
const FOV = 50; // vertical field of view, degrees
const DPR_CAP = 2;
const TEX_CAP = 2048; // per-image texture edge, before the device limit
const SPIN_AT_50 = 0.14; // rad/sec drift at speed 50
// A flick is delta / dt. Bound the divisor and the result so one fast gesture
// cannot spin the ring dozens of turns a second.
const MOVE_DT_FLOOR = 4; // ms
const MAX_FLICK = 12; // rad/sec
// Camera offset is a fraction of the radius and must stay strictly inside the
// wall, or the "one hit per ray" guarantee stops holding.
const DIST_MAX = 0.9;
// How much a panel seen edge-on is dimmed. Only matters once the camera backs
// away from the centre.
const GRAZE_DIM = 0.42;
// Antialias width of the rounded corner (panel units) when fwidth() is missing.
const AA_FALLBACK = 0.004;

const UNSPLASH = (id) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=80`;

// Built-in images: used by default, and whenever an `images` entry is empty or
// fails to load.
const FALLBACK_IMAGES = [
  "1506905925346-21bda4d32df4",
  "1470071459604-3b5ec3a7fe05",
  "1441974231531-c6227db76b6e",
  "1501785888041-af3ef285b470",
  "1418065460487-3e41a6c84dc5",
  "1519681393784-d120267933ba",
  "1497436072909-60f360e1d4b1",
  "1433086966358-54859d0ed716",
].map((id) => ({ src: UNSPLASH(id) }));

/* ------------------------------------------------------------------ shaders */

// All of the 3D is here: the bend around the ring, the camera-relative
// transform, the projection and the grazing shade.
const VERT = `
precision highp float;

attribute vec2 aCell;   // (s across the panel arc 0..1, v down the panel 0..1)

uniform float uArc0;    // where this panel starts, radians
uniform float uSpan;    // how much of the ring it covers, radians
uniform float uYaw;
uniform float uHeight;  // panel height, world units
uniform float uPitch;
uniform float uDist;    // camera offset along +z, always < RADIUS
uniform float uRadius;
uniform float uFocal;   // 1 / tan(fov / 2)
uniform float uAspect;

varying vec2  vUv;
varying float vFace;

void main() {
    float th = uArc0 + aCell.x * uSpan + uYaw;
    vec3 p = vec3(uRadius * sin(th), (0.5 - aCell.y) * uHeight, uRadius * cos(th));

    // Camera-relative FIRST, then pitch, so tilt turns the eye in place instead
    // of swinging it around the origin (which could lift it out of the ring).
    vec3 rel = p - vec3(0.0, 0.0, uDist);
    float c = cos(uPitch);
    float s = sin(uPitch);
    vec3 q = vec3(rel.x, rel.y * c - rel.z * s, rel.y * s + rel.z * c);

    // Clip space, not a pre-divide: part of the wall is always behind the eye,
    // so triangles straddle the camera plane. Handing the GPU w = depth lets
    // the hardware clip them at w = 0. z is 0: there is no depth test.
    float w = -q.z;
    gl_Position = vec4(q.x * uFocal / uAspect, q.y * uFocal, 0.0, w);

    // Mirrored: seen from inside, increasing theta moves LEFT on screen.
    vUv = vec2(1.0 - aCell.x, aCell.y);

    // Grazing shade (both vectors pre-pitch; pitch is a rigid rotation).
    vec3 n = -vec3(sin(th), 0.0, cos(th));
    vec3 toCam = normalize(vec3(0.0, 0.0, uDist) - p);
    vFace = clamp(dot(n, toCam), 0.0, 1.0);
}
`;

// deriv: whether OES_standard_derivatives is available. The extension pragma
// has to come before every non-preprocessor token.
const FRAG = (deriv) =>
  `${deriv ? "#extension GL_OES_standard_derivatives : enable\n" : ""}precision highp float;

${deriv ? "#define AAW(x) fwidth(x)" : `#define AAW(x) ${AA_FALLBACK.toFixed(4)}`}

uniform sampler2D uTex;
uniform float uHas;         // 1 = a picture is loaded, 0 = placeholder
uniform vec3  uTint;        // placeholder colour, one hue per slot
uniform float uTexAspect;   // the picture's own w/h
uniform float uPanelAspect; // the panel's world w/h
uniform float uRound;       // 0..1, fraction of half the panel's short side
uniform float uGraze;

varying vec2  vUv;
varying float vFace;

void main() {
    // COVER, never contain: the rounded corner must wrap the image.
    vec2 uv = vUv - 0.5;
    float ra = uTexAspect / uPanelAspect;
    if (ra > 1.0) uv.x /= ra; else uv.y *= ra;
    uv += 0.5;

    vec3 pic = texture2D(uTex, uv).rgb;
    vec3 hold = uTint * (1.0 - 0.28 * vUv.y);
    vec3 rgb = mix(hold, pic, uHas);

    // Rounded rect in panel units (height = 1), so the corner is a circle on
    // the wall, not an ellipse, at every item count.
    vec2 hs = vec2(uPanelAspect, 1.0) * 0.5;
    vec2 pp = (vUv - 0.5) * vec2(uPanelAspect, 1.0);
    float r = uRound * min(hs.x, hs.y);
    vec2 d = abs(pp) - hs + r;
    float sd = min(max(d.x, d.y), 0.0) + length(max(d, vec2(0.0))) - r;
    float w = max(AAW(sd), 1e-5);
    float a = 1.0 - smoothstep(-w, w, sd);

    float shade = mix(uGraze, 1.0, vFace);
    gl_FragColor = vec4(rgb * shade * a, a);
}
`;

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

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.warn("RotundaCarousel shader:", gl.getShaderInfoLog(sh));
  }
  return sh;
}

// Nearest power of two, clamped. Resampling to POT makes mipmaps legal on
// WebGL1; the picture is drawn full-bleed, so UVs still address the same content.
function potFit(n, cap) {
  let p = 64;
  while (p * 2 <= Math.min(n, cap)) p *= 2;
  const up = Math.min(p * 2, cap);
  return Math.abs(up - n) < Math.abs(n - p) ? up : p;
}

// Muted, so an unfilled slot reads as a waiting panel rather than an error.
function slotTint(i, n) {
  const h = ((i / Math.max(1, n)) * 360 + 210) % 360;
  const s = 0.3;
  const l = 0.42;
  const k = (m) => (m + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (m) =>
    l - a * Math.max(-1, Math.min(Math.min(k(m) - 3, 9 - k(m)), 1));
  return [f(0), f(8), f(4)];
}

// Shortest signed way from a to b, so yaw never jumps a turn at the atan2 seam.
function wrapPi(x) {
  const t = Math.PI * 2;
  return ((((x + Math.PI) % t) + t) % t) - Math.PI;
}

/* ----------------------------------------------------------------- component */

export default function RotundaCarousel({
  images = FALLBACK_IMAGES,
  background = "#0B0A10",
  gap = 0,
  panelWidth = 2000,
  panelHeight = 1340,
  rounded = 3,
  distance = 90,
  tilt = 0,
  speed = 100,
  imageProxy = DEFAULT_IMAGE_PROXY,
  damping = 100,
  hover = 200,
  style,
}) {
  const hostRef = useRef(null);
  const canvasRef = useRef(null);

  // Everything the render loop reads lives in a ref, so props can change live
  // without rebuilding the WebGL context.
  const live = useRef({});
  live.current = {
    images,
    imageProxy,
    gap,
    panelWidth,
    panelHeight,
    rounded,
    distance,
    tilt,
    speed,
    damping,
    hover,
  };

  // Drag state. `vel` is yaw radians per second, carried out of the gesture as
  // inertia; `hoverAmt` eases so entering the wall does not snap the drift.
  const drag = useRef({ down: 0, over: 0, grab: 0, vel: 0, lastT: 0, hoverAmt: 0 });
  const reducedRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => (reducedRef.current = mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
      depth: false,
    });
    if (!gl) return;

    const deriv = !!gl.getExtension("OES_standard_derivatives");

    /* ---- program ---- */
    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG(deriv));
    const prog = gl.createProgram();
    if (!vs || !fs || !prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn("RotundaCarousel link:", gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    const aCell = gl.getAttribLocation(prog, "aCell");
    const U = (n) => gl.getUniformLocation(prog, n);
    const u = {
      arc0: U("uArc0"),
      span: U("uSpan"),
      yaw: U("uYaw"),
      height: U("uHeight"),
      pitch: U("uPitch"),
      dist: U("uDist"),
      radius: U("uRadius"),
      focal: U("uFocal"),
      aspect: U("uAspect"),
      tex: U("uTex"),
      has: U("uHas"),
      tint: U("uTint"),
      texAspect: U("uTexAspect"),
      panelAspect: U("uPanelAspect"),
      round: U("uRound"),
      graze: U("uGraze"),
    };

    /* ---- one unit panel, reused by every draw. Its arc and height are
           uniforms, so adding an image never touches this buffer. ---- */
    const verts = new Float32Array((SEG + 1) * 4);
    for (let i = 0; i <= SEG; i++) {
      const t = i / SEG;
      verts[i * 4] = t;
      verts[i * 4 + 1] = 0;
      verts[i * 4 + 2] = t;
      verts[i * 4 + 3] = 1;
    }
    const cellBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cellBuf);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    const vertCount = (SEG + 1) * 2;

    /* ---- textures ---- */
    const maxTex = Math.max(
      256,
      Math.min(TEX_CAP, gl.getParameter(gl.MAX_TEXTURE_SIZE))
    );
    const anisoExt = gl.getExtension("EXT_texture_filter_anisotropic");
    const aniso = anisoExt
      ? {
          pname: anisoExt.TEXTURE_MAX_ANISOTROPY_EXT,
          max: Math.min(
            8,
            gl.getParameter(anisoExt.MAX_TEXTURE_MAX_ANISOTROPY_EXT)
          ),
        }
      : null;

    // A 1x1 transparent texture for placeholder panels. Sampling an unbound
    // unit is undefined and shows up as noise on some drivers.
    const blank = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, blank);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 0])
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const cache = new Map();
    const pending = new Set();
    const failed = new Set();

    const ensure = (src) => {
      if (!src || cache.has(src) || pending.has(src) || failed.has(src)) return;
      pending.add(src);
      const im = new Image();
      im.crossOrigin = "anonymous";
      im.onerror = () => {
        pending.delete(src);
        // A host that sends no CORS header is retried through the proxy; only
        // then is the slot given up to a built-in picture.
        const via = proxied(src, live.current.imageProxy);
        if (via && !cache.has(via) && !failed.has(via)) {
          failed.add(src);
          ensure(via);
          return;
        }
        failed.add(src);
      };
      im.onload = () => {
        pending.delete(src);
        if (!im.naturalWidth || !im.naturalHeight) {
          failed.add(src);
          return;
        }
        const w = potFit(im.naturalWidth, maxTex);
        const h = potFit(im.naturalHeight, maxTex);
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const cx = c.getContext("2d");
        if (!cx) return;
        cx.drawImage(im, 0, 0, w, h);
        const t = gl.createTexture();
        if (!t) return;
        gl.bindTexture(gl.TEXTURE_2D, t);
        // v = 0 is the panel's TOP, which is the canvas's first uploaded row.
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        // Mipmaps for panels the camera has backed away from, anisotropy for
        // the ones near the silhouette.
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(
          gl.TEXTURE_2D,
          gl.TEXTURE_MIN_FILTER,
          gl.LINEAR_MIPMAP_LINEAR
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.pname, aniso.max);
        cache.set(src, { tex: t, aspect: im.naturalWidth / im.naturalHeight });
      };
      im.src = src;
    };

    gl.disable(gl.DEPTH_TEST);
    // No face culling: from inside a convex cylinder every wall point is hit by
    // exactly one ray, so culling would only add a winding assumption.
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); // shader premultiplies

    /* ---- sizing: measure the element itself ---- */
    let cssW = 0;
    let cssH = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
      cssW = canvas.clientWidth || host.clientWidth || 0;
      cssH = canvas.clientHeight || host.clientHeight || 0;
      const w = Math.max(1, Math.round(cssW * dpr));
      const h = Math.max(1, Math.round(cssH * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    /* ---- drag: the inverse projection, so the wall stays under the pointer ---- */
    // What the last frame actually rendered with; the pointer maths needs the
    // same numbers or the grabbed point drifts as the dials move.
    const view = { focal: 1, aspect: 1, dist: 0, pitch: 0 };
    let yaw = 0;

    // Screen point -> the ring angle its ray lands on (or null if degenerate).
    const screenTheta = (ox, oy) => {
      const w = host.offsetWidth || 1;
      const h = host.offsetHeight || 1;
      const nx = (ox / w) * 2 - 1;
      const ny = 1 - (oy / h) * 2;

      // Camera-space ray, looking down -z.
      const dx = (nx * view.aspect) / view.focal;
      const dy = ny / view.focal;
      const dz = -1;
      // Un-pitch it: the vertex shader applies the pitch last, so it comes off first.
      const c = Math.cos(view.pitch);
      const s = Math.sin(view.pitch);
      const wz = -dy * s + dz * c;

      // Intersect r = RADIUS with the ray from (0, 0, dist). The constant term
      // is negative for every dist < RADIUS, so exactly one root is forward.
      const a = dx * dx + wz * wz;
      const b = 2 * view.dist * wz;
      const cc = view.dist * view.dist - RADIUS * RADIUS;
      if (a <= 1e-9) return null;
      const disc = b * b - 4 * a * cc;
      if (disc < 0) return null;
      const t = (-b + Math.sqrt(disc)) / (2 * a);
      if (!(t > 0)) return null;
      return Math.atan2(t * dx, view.dist + t * wz);
    };

    const onDown = (e) => {
      const th = screenTheta(e.offsetX, e.offsetY);
      if (th == null) return;
      const d = drag.current;
      d.down = 1;
      d.vel = 0;
      d.lastT = e.timeStamp;
      // The geometric angle grabbed; holding it fixed pins the picture to the pointer.
      d.grab = th - yaw;
      host.style.cursor = "grabbing";
      try {
        // Capture, so a drag that wanders off the component keeps arriving here.
        host.setPointerCapture(e.pointerId);
      } catch {
        /* no capture here: the drag simply ends at the edge */
      }
    };
    const onMove = (e) => {
      const d = drag.current;
      d.over = 1;
      if (!d.down) return;
      const th = screenTheta(e.offsetX, e.offsetY);
      if (th == null) return;
      const delta = wrapPi(th - d.grab - yaw);
      yaw += delta;
      const dt = Math.max(MOVE_DT_FLOOR, e.timeStamp - d.lastT) / 1000;
      d.lastT = e.timeStamp;
      // Blended, so one stuttering event does not decide the whole flick.
      const v = d.vel * 0.4 + (delta / dt) * 0.6;
      d.vel = Math.max(-MAX_FLICK, Math.min(MAX_FLICK, v));
    };
    const onUp = () => {
      drag.current.down = 0;
      host.style.cursor = "grab";
    };
    const onLeave = () => {
      drag.current.over = 0;
      drag.current.down = 0;
      host.style.cursor = "grab";
    };
    host.addEventListener("pointerdown", onDown);
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);
    host.addEventListener("pointercancel", onUp);
    // On window, not host: a flick that releases outside must still let go.
    window.addEventListener("pointerup", onUp);

    /* ---- loop ---- */
    let raf = 0;
    let last = performance.now();

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      if (cssW <= 0 || cssH <= 0) {
        resize();
        if (cssW <= 0 || cssH <= 0) return;
      }

      const L = live.current;
      const list =
        Array.isArray(L.images) && L.images.length ? L.images : FALLBACK_IMAGES;
      const n = list.length;

      const d = drag.current;
      // Hover eases in so the slow-down reads as the wall noticing the pointer.
      d.hoverAmt += ((d.over ? 1 : 0) - d.hoverAmt) * Math.min(1, dt * 6);

      if (!d.down) {
        // Damping: higher settles faster. Frame-rate independent.
        yaw += d.vel * dt;
        d.vel *= Math.exp(-dt * (0.5 + (L.damping / 100) * 7));
        // Autonomous drift, slowed by however much the pointer rests on the
        // wall. Hover 0 is off, 100 stops it, above that it backs up.
        // "Reduce motion" turns the drift off; dragging still works.
        if (!reducedRef.current) {
          const slow = 1 - (L.hover / 100) * d.hoverAmt;
          yaw += (L.speed / 50) * SPIN_AT_50 * slow * dt;
        }
      }
      yaw = yaw % (Math.PI * 2); // bounded, for float32 precision in sin/cos

      /* ---- geometry from the item count ---- */
      // The ring closes around n panels and n gaps, so the circumference IS
      // n * (Width + Gap). Everything below is that normalised to RADIUS = 1.
      const itemArc = (Math.PI * 2) / n;
      const pw = Math.max(1, L.panelWidth);
      const ph = Math.max(1, L.panelHeight);
      const circum = Math.max(1, n * (pw + Math.max(0, L.gap)));
      const span = Math.min(itemArc, (Math.PI * 2 * pw) / circum);
      const worldW = RADIUS * span;
      const worldH = Math.max(1e-4, (Math.PI * 2 * ph) / circum);
      const panelAspect = worldW / worldH; // exactly Width : Height

      const vAspect = Math.max(0.05, cssW / Math.max(1, cssH));
      const focal = 1 / Math.tan(((FOV / 2) * Math.PI) / 180);
      const dist = Math.max(0, Math.min(DIST_MAX, L.distance / 100) * RADIUS);
      const pitch = (L.tilt * Math.PI) / 180;

      view.focal = focal;
      view.aspect = vAspect;
      view.dist = dist;
      view.pitch = pitch;

      gl.useProgram(prog);
      gl.uniform1f(u.yaw, yaw);
      gl.uniform1f(u.height, worldH);
      gl.uniform1f(u.pitch, pitch);
      gl.uniform1f(u.dist, dist);
      gl.uniform1f(u.radius, RADIUS);
      gl.uniform1f(u.focal, focal);
      gl.uniform1f(u.aspect, vAspect);
      gl.uniform1f(u.span, span);
      gl.uniform1f(u.panelAspect, panelAspect);
      gl.uniform1f(u.round, Math.max(0, Math.min(100, L.rounded)) / 100);
      gl.uniform1f(u.graze, GRAZE_DIM);
      gl.uniform1i(u.tex, 0);
      gl.activeTexture(gl.TEXTURE0);

      gl.bindBuffer(gl.ARRAY_BUFFER, cellBuf);
      gl.enableVertexAttribArray(aCell);
      gl.vertexAttribPointer(aCell, 2, gl.FLOAT, false, 0, 0);

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      for (let i = 0; i < n; i++) {
        // Empty or broken URLs fall back to a built-in image for that slot.
        const want = list[i]?.src || "";
        const src =
          want && !failed.has(want)
            ? want
            : FALLBACK_IMAGES[i % FALLBACK_IMAGES.length].src;
        ensure(src);
        const hit = cache.get(src);
        gl.uniform1f(u.arc0, i * itemArc + (itemArc - span) * 0.5);
        if (hit) {
          gl.bindTexture(gl.TEXTURE_2D, hit.tex);
          gl.uniform1f(u.has, 1);
          gl.uniform1f(u.texAspect, hit.aspect);
          gl.uniform3f(u.tint, 0, 0, 0);
        } else {
          // Still loading: draw a tinted placeholder so the frame is never empty.
          gl.bindTexture(gl.TEXTURE_2D, blank);
          gl.uniform1f(u.has, 0);
          gl.uniform1f(u.texAspect, panelAspect);
          const t = slotTint(i, n);
          gl.uniform3f(u.tint, t[0], t[1], t[2]);
        }
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, vertCount);
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      host.removeEventListener("pointerdown", onDown);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      host.removeEventListener("pointercancel", onUp);
      window.removeEventListener("pointerup", onUp);
      cache.forEach((v) => gl.deleteTexture(v.tex));
      cache.clear();
      gl.deleteTexture(blank);
      gl.deleteBuffer(cellBuf);
      // No loseContext(): getContext() hands back the SAME force-lost context
      // on the next StrictMode mount and renders black.
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
        background,
        cursor: "grab",
        touchAction: "pan-y",
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
