import { useEffect, useMemo, useRef } from "react";

/**
 * GalleryTunnel — an endless tunnel of gridded walls that you fly down, with
 * coloured panels and pictures scattered on its floor, ceiling and sides
 * (WebGL). Press and hold to speed up.
 *
 * Self-contained: copy this single file into any React (16.8+) project and
 * render <GalleryTunnel />. No other packages, CSS or files needed (it draws
 * with plain WebGL, no three.js). It fills 100% of its parent, so give the
 * parent a height, e.g.
 *   <div style={{ height: 600 }}><GalleryTunnel /></div>
 * Missing or broken images automatically fall back to the built-in list.
 */

/* ---------------------------------------------------------------- constants */

const TUNNEL_WIDTH = 2;
const TUNNEL_HEIGHT = 1.8;
const SEGMENT_DEPTH = 1;
const NUM_SEGMENTS = 15;
const LINE_RADIUS = 0.003;
const SCROLL_TO_Z = 0.05;
const CAMERA_CHASE = 0.1;
const FADE_IN = 1; // seconds for a picture to fade in once loaded
const FOV = 45;
const FOG_FAR = NUM_SEGMENTS * SEGMENT_DEPTH * 0.95;

const DEFAULT_COLORS = ["#FF6A00", "#AB54F7", "#EA3737", "#0072E3", "#00AA3C", "#FFB200"];

const UNSPLASH = (id) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&q=80`;

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

/* ------------------------------------------------------------------ shaders */

const VERT = `
attribute vec3 position;
attribute vec2 uv;
uniform mat4 uProj;
uniform float uZ;      // this segment's position along the tunnel
uniform float uCamZ;   // the camera's position along the tunnel
varying vec2 vUv;
varying float vDepth;
void main() {
    vec3 view = position + vec3(0.0, 0.0, uZ - uCamZ);
    vDepth = -view.z;
    vUv = uv;
    gl_Position = uProj * vec4(view, 1.0);
}`;

const FRAG = `
precision highp float;
uniform sampler2D uTex;
uniform vec3 uColor;
uniform float uUseTex;
uniform float uAlpha;
uniform vec2 uRatio;     // cover-crop of the picture into its cell
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
varying vec2 vUv;
varying float vDepth;
void main() {
    vec3 c = uColor;
    if (uUseTex > 0.5) {
        vec2 uv = vUv * uRatio + (1.0 - uRatio) * 0.5;
        c = texture2D(uTex, uv).rgb;
    }
    float f = clamp((vDepth - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
    c = mix(c, uFogColor, f);
    gl_FragColor = vec4(c, uAlpha);
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

function hexToRgb(hex) {
  let h = String(hex || "").replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  if (Number.isNaN(n) || h.length !== 6) return [0, 0, 0];
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
    console.warn("GalleryTunnel shader:", gl.getShaderInfoLog(s));
  return s;
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

const srcOf = (image) => (typeof image === "string" ? image : (image?.src ?? ""));

/**
 * The tunnel's geometry for a grid of n x n cells per wall: one segment's slab
 * quads (floor, ceiling, left and right wall cells) and its grid lines. Lines
 * are two crossed thin quads, so they read as a thin tube from any angle.
 */
function buildGeometry(grid) {
  const cols = grid;
  const rows = grid;
  const hw = TUNNEL_WIDTH / 2;
  const hh = TUNNEL_HEIGHT / 2;
  const colW = TUNNEL_WIDTH / cols;
  const rowH = TUNNEL_HEIGHT / rows;
  const D = SEGMENT_DEPTH;

  // 5 floats per vertex: position(3) + uv(2)
  const slab = [];
  const aspects = [];
  const quad = (a, b, c, d) => {
    // corners with uv (0,0) (1,0) (1,1) (0,1)
    const v = (p, u, w) => slab.push(p[0], p[1], p[2], u, w);
    v(a, 0, 0); v(b, 1, 0); v(c, 1, 1);
    v(a, 0, 0); v(c, 1, 1); v(d, 0, 1);
  };
  for (let i = 0; i < cols; i++) {
    const x0 = -hw + i * colW;
    const x1 = x0 + colW;
    // floor: picture runs left-to-right with its top toward the far end.
    // ceiling: its top toward the camera, so it reads upright when you look up.
    quad([x0, -hh, 0], [x1, -hh, 0], [x1, -hh, -D], [x0, -hh, -D]);
    aspects.push(colW / D);
    quad([x0, hh, -D], [x1, hh, -D], [x1, hh, 0], [x0, hh, 0]);
    aspects.push(colW / D);
  }
  for (let j = 0; j < rows; j++) {
    const y0 = -hh + j * rowH;
    const y1 = y0 + rowH;
    // left wall: picture runs toward the far end; right wall: the other way
    quad([-hw, y0, 0], [-hw, y0, -D], [-hw, y1, -D], [-hw, y1, 0]);
    aspects.push(D / rowH);
    quad([hw, y0, -D], [hw, y0, 0], [hw, y1, 0], [hw, y1, -D]);
    aspects.push(D / rowH);
  }

  const lines = [];
  const R = LINE_RADIUS;
  const line = (p0, p1, axA, axB) => {
    for (const ax of [axA, axB]) {
      const o = [ax[0] * R, ax[1] * R, ax[2] * R];
      const a = [p0[0] - o[0], p0[1] - o[1], p0[2] - o[2]];
      const b = [p0[0] + o[0], p0[1] + o[1], p0[2] + o[2]];
      const c = [p1[0] + o[0], p1[1] + o[1], p1[2] + o[2]];
      const d = [p1[0] - o[0], p1[1] - o[1], p1[2] - o[2]];
      for (const p of [a, b, c, a, c, d]) lines.push(p[0], p[1], p[2], 0, 0);
    }
  };
  const X = [1, 0, 0];
  const Y = [0, 1, 0];
  const Z = [0, 0, 1];
  for (let i = 0; i <= cols; i++) {
    const x = -hw + i * colW;
    line([x, -hh, 0], [x, -hh, -D], X, Y);
    line([x, hh, 0], [x, hh, -D], X, Y);
  }
  for (let j = 1; j < rows; j++) {
    const y = -hh + j * rowH;
    line([-hw, y, 0], [-hw, y, -D], X, Y);
    line([hw, y, 0], [hw, y, -D], X, Y);
  }
  line([-hw, -hh, 0], [hw, -hh, 0], Y, Z);
  line([-hw, hh, 0], [hw, hh, 0], Y, Z);
  line([-hw, -hh, 0], [-hw, hh, 0], X, Z);
  line([hw, -hh, 0], [hw, hh, 0], X, Z);

  return {
    slab: new Float32Array(slab),
    lines: new Float32Array(lines),
    slotCount: aspects.length,
    aspects,
  };
}

/* ----------------------------------------------------------------- component */

export default function GalleryTunnel({
  images = FALLBACK_IMAGES,
  colors = DEFAULT_COLORS,
  background = "#000000",
  lineColor = "#B0B0B0",
  lineOpacity = 50,
  grid = 4,
  speed = 100,
  boost = 100,
  fade = 100,
  imageProxy = DEFAULT_IMAGE_PROXY,
  label = true,
  labelText = "Press to Start",
  labelFill = "#FFFFFF",
  labelColor = "#000000",
  style,
}) {
  const frameRef = useRef(null);
  const canvasRef = useRef(null);
  const cursorRef = useRef(null);
  const reducedRef = useRef(false);

  const urls = useMemo(() => {
    const list = (images ?? []).map(srcOf).filter(Boolean);
    return list.length ? list : FALLBACK_IMAGES.map((i) => i.src);
  }, [images]);
  const urlKey = urls.join("|");

  const palette = useMemo(() => {
    const list = (colors ?? []).filter(Boolean);
    return list.length ? list : DEFAULT_COLORS;
  }, [colors]);

  // Everything the render loop reads lives in a ref, so props can change live
  // without rebuilding the WebGL context.
  const live = useRef(null);
  live.current = {
    urls,
    urlKey: `${imageProxy}::${urlKey}`,
    imageProxy,
    palette,
    background,
    lineColor,
    lineOpacity: Math.min(100, Math.max(0, lineOpacity)) / 100,
    grid: Math.max(1, Math.min(12, Math.round(grid))),
    speed: Math.max(0, speed) / 100,
    boost: Math.max(0, boost) / 10,
    fade: Math.min(100, Math.max(0, fade)),
  };

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => (reducedRef.current = mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const frame = frameRef.current;
    const canvas = canvasRef.current;
    if (!frame || !canvas) return;

    const gl = canvas.getContext("webgl", {
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    if (!gl) return;

    /* ---- program ---- */
    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn("GalleryTunnel link:", gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);
    const aPos = gl.getAttribLocation(prog, "position");
    const aUv = gl.getAttribLocation(prog, "uv");
    const U = (n) => gl.getUniformLocation(prog, n);
    const u = {
      proj: U("uProj"), z: U("uZ"), camZ: U("uCamZ"), tex: U("uTex"),
      color: U("uColor"), useTex: U("uUseTex"), alpha: U("uAlpha"),
      ratio: U("uRatio"), fogColor: U("uFogColor"), fogNear: U("uFogNear"),
      fogFar: U("uFogFar"),
    };
    gl.uniform1i(u.tex, 0);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.CULL_FACE); // walls are seen from inside

    /* ---- geometry (rebuilt only when the grid changes) ---- */
    let geo = null;
    let slabBuf = null;
    let lineBuf = null;
    let builtGrid = 0;
    const buildBuffers = (n) => {
      if (slabBuf) gl.deleteBuffer(slabBuf);
      if (lineBuf) gl.deleteBuffer(lineBuf);
      geo = buildGeometry(n);
      slabBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, slabBuf);
      gl.bufferData(gl.ARRAY_BUFFER, geo.slab, gl.STATIC_DRAW);
      lineBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
      gl.bufferData(gl.ARRAY_BUFFER, geo.lines, gl.STATIC_DRAW);
      builtGrid = n;
    };
    const bindAttribs = (buf) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 20, 0);
      gl.enableVertexAttribArray(aUv);
      gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 20, 12);
    };

    /* ---- pictures: one texture each, fading in once loaded ---- */
    let images = [];
    let imagesKey = "";
    let alive = true;
    const disposeImages = () => {
      for (const im of images) if (im.tex) gl.deleteTexture(im.tex);
      images = [];
    };
    const buildImages = () => {
      disposeImages();
      imagesKey = live.current.urlKey;
      images = live.current.urls.map((src, i) => {
        const rec = { tex: null, aspect: 1, alpha: 0, ready: false };
        const img = new Image();
        img.crossOrigin = "anonymous";
        // Try the entry itself, then a built-in photo. If both fail the slab
        // simply stays blank.
        const tries = [
          src,
          proxied(src, live.current.imageProxy),
          FALLBACK_IMAGES[i % FALLBACK_IMAGES.length].src,
        ].filter((s, idx, a) => s && a.indexOf(s) === idx);
        let k = 0;
        img.onerror = () => {
          if (++k < tries.length) img.src = tries[k];
        };
        img.onload = () => {
          if (!alive || !img.naturalWidth) return;
          const tex = gl.createTexture();
          gl.bindTexture(gl.TEXTURE_2D, tex);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
          try {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
          } catch {
            // a host with no CORS header taints the image: leave the slab blank
            gl.deleteTexture(tex);
            return;
          } finally {
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
          }
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          rec.tex = tex;
          rec.aspect = img.naturalWidth / img.naturalHeight;
          rec.ready = true;
        };
        img.src = tries[0];
        return rec;
      });
    };

    /* ---- segments ---- */
    let segments = [];
    let imageIndex = 0;
    let colorIndex = 0;
    let populateIndex = 0;

    // Every other segment takes slabs; each of its slots is empty, a colour or
    // a picture at random. Colour / picture choice is stored as a running
    // index and resolved against the live lists at draw time.
    const populate = (seg) => {
      const takesSlabs = populateIndex % 2 === 0;
      populateIndex++;
      for (const slab of seg.slabs) {
        if (!takesSlabs || Math.random() > 0.5) {
          slab.vis = false;
          continue;
        }
        slab.vis = true;
        if (Math.random() > 0.5) {
          slab.type = 0;
          slab.idx = 5 * colorIndex++;
        } else {
          slab.type = 1;
          slab.idx = 3 * imageIndex++;
        }
      }
    };
    const buildSegments = (camZ) => {
      segments = [];
      const start = Math.ceil(camZ / SEGMENT_DEPTH) * SEGMENT_DEPTH;
      for (let i = 0; i < NUM_SEGMENTS; i++) {
        const seg = {
          z: start - i * SEGMENT_DEPTH,
          slabs: Array.from({ length: geo.slotCount }, () => ({ vis: false, type: 0, idx: 0 })),
        };
        populate(seg);
        segments.push(seg);
      }
    };

    /* ---- sizing ---- */
    const proj = new Float32Array(16);
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, frame.clientWidth);
      const h = Math.max(1, frame.clientHeight);
      const bw = Math.round(w * dpr);
      const bh = Math.round(h * dpr);
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw;
        canvas.height = bh;
      }
      gl.viewport(0, 0, bw, bh);
      perspective(proj, FOV, w / h, 1, 1000);
      gl.uniformMatrix4fv(u.proj, false, proj);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(frame);
    resize();

    /* ---- loop ---- */
    let raf = 0;
    let last = 0;
    let pressed = false;
    let scrollPos = 0;
    let camZ = 0;

    const animate = (now) => {
      if (!alive) return;
      raf = requestAnimationFrame(animate);
      const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
      last = now;
      const c = live.current;

      if (builtGrid !== c.grid) {
        buildBuffers(c.grid);
        buildSegments(camZ);
      }
      if (imagesKey !== c.urlKey) buildImages();

      // Frame-rate independent: 60 steps a second at speed 100.
      const rate = pressed ? c.boost : reducedRef.current ? 0 : c.speed;
      scrollPos += rate * dt * 60;
      const want = -SCROLL_TO_Z * scrollPos;
      camZ += (1 - Math.pow(1 - CAMERA_CHASE, dt * 60)) * (want - camZ);

      // Recycle segments that fall behind (or ahead) of the camera.
      const span = NUM_SEGMENTS * SEGMENT_DEPTH;
      for (const seg of segments) {
        if (seg.z > camZ + SEGMENT_DEPTH) {
          let min = 0;
          for (const s of segments) min = Math.min(min, s.z);
          seg.z = min - SEGMENT_DEPTH;
          populate(seg);
        } else if (seg.z < camZ - span - SEGMENT_DEPTH) {
          let max = -999999;
          for (const s of segments) max = Math.max(max, s.z);
          seg.z = max + SEGMENT_DEPTH;
          populate(seg);
        }
      }

      for (const im of images) if (im.ready && im.alpha < 1) im.alpha = Math.min(1, im.alpha + dt / FADE_IN);

      /* ---- draw ---- */
      const bg = hexToRgb(c.background);
      gl.clearColor(bg[0], bg[1], bg[2], 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniform3f(u.fogColor, bg[0], bg[1], bg[2]);
      gl.uniform1f(u.fogNear, Math.min(FOG_FAR * (1 - c.fade / 100), FOG_FAR - 0.01));
      gl.uniform1f(u.fogFar, FOG_FAR);
      gl.uniform1f(u.camZ, camZ);

      // slabs (opaque colours and fading pictures)
      gl.depthMask(true);
      bindAttribs(slabBuf);
      for (const seg of segments) {
        gl.uniform1f(u.z, seg.z);
        for (let s = 0; s < seg.slabs.length; s++) {
          const slab = seg.slabs[s];
          if (!slab.vis) continue;
          if (slab.type === 0) {
            const rgb = hexToRgb(c.palette[slab.idx % c.palette.length]);
            gl.uniform1f(u.useTex, 0);
            gl.uniform3f(u.color, rgb[0], rgb[1], rgb[2]);
            gl.uniform1f(u.alpha, 1);
          } else {
            const im = images[slab.idx % Math.max(1, images.length)];
            if (!im || !im.ready) continue;
            const cell = geo.aspects[s];
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, im.tex);
            gl.uniform1f(u.useTex, 1);
            gl.uniform2f(u.ratio, Math.min(cell / im.aspect, 1), Math.min(im.aspect / cell, 1));
            gl.uniform1f(u.alpha, im.alpha);
          }
          gl.drawArrays(gl.TRIANGLES, s * 6, 6);
        }
      }

      // grid lines, on top and without writing depth
      gl.depthMask(false);
      bindAttribs(lineBuf);
      const lc = hexToRgb(c.lineColor);
      gl.uniform1f(u.useTex, 0);
      gl.uniform3f(u.color, lc[0], lc[1], lc[2]);
      gl.uniform1f(u.alpha, c.lineOpacity);
      const lineVerts = geo.lines.length / 5;
      for (const seg of segments) {
        gl.uniform1f(u.z, seg.z);
        gl.drawArrays(gl.TRIANGLES, 0, lineVerts);
      }
    };
    raf = requestAnimationFrame(animate);

    /* ---- pointer: press to boost, label follows the cursor ---- */
    const onMove = (e) => {
      const el = cursorRef.current;
      if (!el) return;
      const rect = frame.getBoundingClientRect();
      el.style.left = `${e.clientX - rect.left}px`;
      el.style.top = `${e.clientY - rect.top}px`;
    };
    const onEnter = () => {
      const el = cursorRef.current;
      if (el) el.style.opacity = "1";
    };
    const release = () => {
      pressed = false;
      const el = cursorRef.current;
      if (el) el.style.transform = "translate(0%, -100%) scale(1)";
    };
    const onLeave = () => {
      release();
      const el = cursorRef.current;
      if (el) el.style.opacity = "0";
    };
    const onDown = () => {
      pressed = true;
      const el = cursorRef.current;
      if (el) el.style.transform = "translate(0%, -100%) scale(0.85)";
    };
    frame.addEventListener("pointermove", onMove);
    frame.addEventListener("pointerenter", onEnter);
    frame.addEventListener("pointerleave", onLeave);
    frame.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      frame.removeEventListener("pointermove", onMove);
      frame.removeEventListener("pointerenter", onEnter);
      frame.removeEventListener("pointerleave", onLeave);
      frame.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      disposeImages();
      if (slabBuf) gl.deleteBuffer(slabBuf);
      if (lineBuf) gl.deleteBuffer(lineBuf);
      gl.deleteProgram(prog);
      // No loseContext(): getContext returns the same context per canvas, so a
      // StrictMode remount would reuse a force-lost one.
    };
  }, []);

  return (
    <div
      ref={frameRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background,
        cursor: label ? "none" : "default",
        // vertical page scroll still works on touch
        touchAction: "pan-y",
        userSelect: "none",
        WebkitUserSelect: "none",
        ...style,
      }}
    >
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
      {label && (
        <div
          ref={cursorRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            transform: "translate(0%, -100%) scale(1)",
            pointerEvents: "none",
            opacity: 0,
            background: labelFill,
            color: labelColor,
            borderRadius: 9999,
            padding: "10px 20px",
            fontSize: 14,
            fontWeight: 500,
            transition: "transform 0.1s ease, opacity 0.2s ease",
            whiteSpace: "nowrap",
            userSelect: "none",
          }}
        >
          {labelText}
        </div>
      )}
    </div>
  );
}
