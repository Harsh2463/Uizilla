import { useEffect, useRef } from "react";

/**
 * VideoRibbon — a scroll-driven portfolio hero.
 *
 * On a near-black page a two-part headline slides across the screen in opposite
 * directions while a continuous ribbon of live video cards spirals round the
 * viewer in 3D: small along the bottom, close in a shallow arc, round the left
 * edge, away along the top and off top right. The cards then land one by one in a
 * calm grid.
 *
 *  • ONE number drives everything: scroll progress p (0–1), smoothed each frame.
 *    Scrolling back reverses it exactly.
 *  • The ribbon slides along a fixed rail; the path never moves.
 *  • Cards are two-sided; the shader flips u when a card is seen from behind, so
 *    text in a video is never mirrored.
 *  • Any card with no media (or media that fails to load) shows an animated
 *    placeholder, so it always works out of the box.
 *
 * It scrolls INSIDE its own box (give the parent a height), so it can sit in a card
 * or a preview.
 *
 * DEPENDENCIES: React 18 (npm). Loaded at runtime: three@0.170.0 from jsDelivr,
 * the Inter Tight and IBM Plex Mono fonts from Google Fonts, and your media URLs
 * (videos need CORS headers to be used as textures).
 */

const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";
const FONTS_URL =
  "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Inter+Tight:wght@400;500;600&display=swap";

const R2 = "https://pub-86dc5b5484314368ac5436a674b0d919.r2.dev/";
const DEFAULT_WORK = [
  "Roadster 3D | " + R2 + "designs/roadster-3d-car-landing.mp4",
  "Living Portrait | " + R2 + "aaaf/living-portrait-hero.mp4",
  "Particle Self | " + R2 + "aaaf/oraciteslArea.mp4",
  "Robot Jellyfish | " + R2 + "aaaf/medusa-jellyfish-hero.mp4",
  "Ink Reveal | " + R2 + "designs/ink-reveal-hover.mp4",
  "Space Voyage | " + R2 + "designs/space-voyage-video.mp4",
  "Helion Dispatch | " + R2 + "designs/helion-dispatch-landing.mp4",
  "Honey Bee | " + R2 + "designs/honey-bee-melli-landing.mp4",
];

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const mix = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);
const out = (t) => 1 - (1 - t) ** 3;
const span = (p, a, b) => clamp((p - a) / (b - a));
const num = (v, fb) => (Number.isFinite(Number(v)) ? Number(v) : fb);

/** "Title | url" → { title, src }. A line with no "|" is a title with no media. */
function parseWork(list) {
  return (Array.isArray(list) ? list : [])
    .map((l) => String(l))
    .filter((l) => l.trim())
    .map((l, i) => {
      const k = l.indexOf("|");
      const title = (k >= 0 ? l.slice(0, k) : l).trim() || `Work ${i + 1}`;
      const src = k >= 0 ? l.slice(k + 1).trim() : "";
      return { title, src };
    })
    .slice(0, 16);
}
const isImage = (s) => /\.(png|jpe?g|webp|gif|avif|svg)(\?|#|$)/i.test(s) || /^data:image\//i.test(s);

const CSS = `
.vrb{--bg:#0a0a0b;--ink:#f4f1ea;--mid:#8d8b86;--line:color-mix(in srgb,var(--ink) 14%,transparent);position:relative;width:100%;height:100%;overflow:hidden;background:var(--bg);color:var(--ink);font-family:'Inter Tight',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.vrb *{box-sizing:border-box;margin:0;padding:0}
.vrb .sc{position:absolute;inset:0;overflow-y:auto;overflow-x:hidden;scrollbar-width:none}
.vrb .sc::-webkit-scrollbar{display:none}
.vrb .stage{position:sticky;top:0;height:var(--H);overflow:hidden;background:var(--bg)}
.vrb .hl{position:absolute;left:0;right:0;font-weight:400;font-size:clamp(40px,calc(var(--W) * .067 * var(--hs,1)),calc(130px * var(--hs,1)));line-height:1;letter-spacing:-.055em;white-space:nowrap;text-align:center;will-change:transform}
.vrb .l1{top:calc(50% - .98em)}
.vrb .l2{top:calc(50% + .03em)}
.vrb .hl span{display:inline-block}
.vrb .l1 span{margin-right:calc(var(--W) * .15)}
.vrb .l2 span{margin-left:calc(var(--W) * .15)}
.vrb .cap{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:15em;text-align:center;font-size:clamp(9px,calc(var(--W) * .0074),13px);font-weight:500;line-height:1.3;letter-spacing:.03em;text-transform:uppercase;color:var(--ink)}
.vrb .gl{position:absolute;inset:0;width:100%;height:100%;display:block}
.vrb .bot{position:absolute;left:32px;right:32px;bottom:26px;display:grid;grid-template-columns:1fr auto 1fr;align-items:end;font-size:12.5px;line-height:1.35;pointer-events:none}
.vrb .bot p{color:var(--ink);max-width:21em}
.vrb .bot .mid{font:400 11.5px 'IBM Plex Mono',monospace;letter-spacing:.06em}
.vrb .bot .mid s{text-decoration:none;color:var(--mid);margin:0 .9em}
.vrb .bot .r{justify-self:end;display:flex;gap:12px;align-items:center;font:400 11.5px 'IBM Plex Mono',monospace;letter-spacing:.06em}
.vrb .bot .r:after{content:"";width:22px;height:1px;background:var(--ink)}
.vrb .rule{position:absolute;left:3.5%;right:3.5%;top:50%;height:1px;background:var(--line);transform-origin:left;transform:scaleX(0)}
.vrb .name{position:absolute;left:0;top:0;padding:6px 11px;background:var(--ink);color:var(--bg);border-radius:99px;font-size:11.5px;font-weight:600;letter-spacing:.04em;pointer-events:none;opacity:0;transition:opacity .16s;white-space:nowrap}
.vrb.sm .bot{left:18px;right:18px;bottom:18px;grid-template-columns:1fr auto}
.vrb.sm .bot .mid{display:none}
.vrb.sm .bot p{max-width:17em;font-size:11px}
.vrb.noui .bot{display:none}
`;

// ── cards: rounded-rect shader, cover fit, flips u when seen from behind ──
const VS = `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const FS = `uniform sampler2D map;uniform vec2 cover;uniform float aspect,ready,radius;varying vec2 vUv;
void main(){
  vec2 q=(abs(vUv-.5)-.5)*vec2(aspect,1.)+radius;
  float d=length(max(q,0.))+min(max(q.x,q.y),0.)-radius;
  float px=fwidth(d),a=1.-smoothstep(-px,px,d);
  if(a<.01)discard;
  vec2 uv=vUv;if(!gl_FrontFacing)uv.x=1.-uv.x;
  vec3 c=mix(vec3(.075),texture2D(map,(uv-.5)*cover+.5).rgb,ready);
  float edge=smoothstep(-.012-px,-.012,d);
  gl_FragColor=vec4(mix(c,vec3(1.),edge*.1),a);
}`;

const CARD_W = 2.1, CARD_H = 1.32, GAP = 0.03, STEP = CARD_W + GAP, NX = 28, NY = 3;
const PH0 = -1.5, PH1 = Math.PI * 2 + 1.35;
const FOV = 35, GZ = 8, SAMPLES = 1200;
const RIB_A = 0.14, RIB_B = 0.63;

export default function VideoRibbon({
  line1 = "CRAFT IN",
  line2 = "MOTION",
  caption = "Exploring ideas through daily design practice.",
  footerText = "Concepts, explorations and interface experiments shared openly as part of our creative process.",
  categories = "VISUALS/FILM/MUSIC/EXPERIMENTS",
  showreelLabel = "VIEW SHOWREEL",
  work = DEFAULT_WORK,
  placeholders = true,
  background = "#0a0a0b",
  inkColor = "#f4f1ea",
  midColor = "#8d8b86",
  headlineScale = 1,
  scrollLength = 900,
  smoothing = 0.09,
  mobileZoom = 1.35,
  cardRadius = 0.018,
  showFooter = true,
  interactive = true,
  style = {},
}) {
  const rootRef = useRef(null);
  const cfgRef = useRef({});
  cfgRef.current = { work, placeholders, smoothing, cardRadius, interactive, scrollLength, mobileZoom };
  const workKey = JSON.stringify(work) + "|" + placeholders;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const q = (k) => root.querySelector(`[data-k="${k}"]`);
    const sc = q("sc"), track = q("track"), canvas = q("gl"), nameEl = q("name"), stage = q("stage");
    const l1 = q("l1"), l2 = q("l2"), capEl = q("cap"), ruleEl = q("rule");
    let dead = false;
    let raf = 0;
    const cleanups = [];
    const on = (el, ev, fn, o) => {
      el.addEventListener(ev, fn, o);
      cleanups.push(() => el.removeEventListener(ev, fn, o));
    };

    if (!document.querySelector("link[data-vrb-fonts]")) {
      const l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = FONTS_URL;
      l.setAttribute("data-vrb-fonts", "");
      document.head.appendChild(l);
    }

    // ── box ────────────────────────────────────────────────────────────────
    let W = 1, H = 1, asp = 1, cols = 3, rows = 2, tanH = 0.3153;
    let target = 0, p = 0;
    let visible = true;
    let lastZoom = null;
    let THREE = null, renderer = null, scene = null, camera = null;
    let cards = [];
    let path = null, PATH_L = 1;
    const pathP = [], pathT = [];

    const readScroll = () => {
      const max = track.offsetHeight - sc.clientHeight;
      target = max > 0 ? clamp(sc.scrollTop / max) : 0;
    };
    const measure = () => {
      const r = root.getBoundingClientRect();
      W = Math.max(1, r.width);
      H = Math.max(1, r.height);
      asp = W / H;
      root.style.setProperty("--W", W + "px");
      root.style.setProperty("--H", H + "px");
      root.classList.toggle("sm", W < 760);
      if (renderer) {
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(W, H, false);
        camera.aspect = asp;
        // Narrow boxes widen the camera so the whole ribbon fits; zoom back in a little there
        // (phones only) so the strip reads bigger.
        const zoom = W < 760 ? clamp(num(cfgRef.current.mobileZoom, 1.35), 0.8, 2.5) : 1;
        lastZoom = cfgRef.current.mobileZoom;
        camera.fov = asp < 16 / 9 ? (Math.atan(0.561 / (asp * zoom)) * 360) / Math.PI : FOV;
        camera.updateProjectionMatrix();
        tanH = Math.tan((camera.fov * Math.PI) / 360);
      }
      cols = asp < 0.9 ? 2 : 3;
      rows = asp < 0.9 ? 3 : 2;
      readScroll();
    };

    // ── media ──────────────────────────────────────────────────────────────
    const makePlaceholder = (c) => {
      const pc = document.createElement("canvas");
      pc.width = 640;
      pc.height = 400;
      const ctx = pc.getContext("2d");
      const tex = new THREE.CanvasTexture(pc);
      tex.colorSpace = THREE.NoColorSpace;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
      c.ph = {
        canvas: pc,
        tex,
        draw: (t) => {
          const hue = (c.i * 47 + t * 14) % 360;
          const g = ctx.createLinearGradient(0, 0, 640, 400);
          g.addColorStop(0, `hsl(${hue} 55% 22%)`);
          g.addColorStop(1, `hsl(${(hue + 70) % 360} 60% 38%)`);
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, 640, 400);
          for (let k = 0; k < 4; k++) {
            const a = t * (0.5 + k * 0.23) + c.i + k * 1.7;
            ctx.beginPath();
            ctx.arc(320 + Math.cos(a) * (180 + k * 30), 200 + Math.sin(a * 1.3) * 110, 70 + k * 26, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${(hue + k * 40) % 360} 70% 60% / .22)`;
            ctx.fill();
          }
          ctx.fillStyle = "rgba(255,255,255,.92)";
          ctx.font = '500 34px "Inter Tight", system-ui, sans-serif';
          ctx.textBaseline = "alphabetic";
          ctx.fillText(c.title, 32, 352);
          ctx.fillStyle = "rgba(255,255,255,.55)";
          ctx.font = '400 15px "IBM Plex Mono", monospace';
          ctx.fillText("PLACEHOLDER · ADD MEDIA", 32, 60);
        },
      };
      c.ph.draw(0);
      c.mat.uniforms.map.value = tex;
      c.mat.uniforms.cover.value.set(1, 1);
      c.mat.uniforms.ready.value = 1;
      c.kind = "ph";
    };
    const setCover = (c, w, h) => {
      const va = w / h, ca = CARD_W / CARD_H;
      c.mat.uniforms.cover.value.set(va > ca ? ca / va : 1, va > ca ? 1 : va / ca);
      c.mat.uniforms.ready.value = 1;
    };

    const buildCards = () => {
      const items = parseWork(cfgRef.current.work);
      const usePh = cfgRef.current.placeholders;
      const list = items.length ? items : usePh ? Array.from({ length: 6 }, (_, i) => ({ title: `Work ${i + 1}`, src: "" })) : [];
      cards = list.map(({ title, src }, i) => {
        const geo = new THREE.PlaneGeometry(1, 1, NX, NY);
        const mat = new THREE.ShaderMaterial({
          vertexShader: VS,
          fragmentShader: FS,
          transparent: true,
          side: THREE.DoubleSide,
          uniforms: {
            map: { value: null },
            cover: { value: new THREE.Vector2(1, 1) },
            aspect: { value: CARD_W / CARD_H },
            ready: { value: 0 },
            radius: { value: cfgRef.current.cardRadius },
          },
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.frustumCulled = false;
        scene.add(mesh);
        const c = { i, title, src, geo, mat, mesh, rect: null, kind: "", v: null, tex: null, ph: null };
        const fallback = () => {
          if (dead || c.kind === "ph") return;
          if (usePh) {
            if (c.v) { try { c.v.pause(); } catch (e) { /* ignore */ } }
            makePlaceholder(c);
          }
        };
        if (!src) {
          if (usePh) makePlaceholder(c);
        } else if (isImage(src)) {
          c.kind = "img";
          new THREE.TextureLoader().setCrossOrigin("anonymous").load(
            src,
            (t) => {
              if (dead) return;
              t.colorSpace = THREE.NoColorSpace;
              c.tex = t;
              mat.uniforms.map.value = t;
              setCover(c, t.image.naturalWidth || t.image.width, t.image.naturalHeight || t.image.height);
            },
            undefined,
            fallback
          );
        } else {
          const v = document.createElement("video");
          Object.assign(v, { crossOrigin: "anonymous", muted: true, loop: true, playsInline: true, preload: "auto", src });
          v.setAttribute("playsinline", "");
          const tex = new THREE.VideoTexture(v);
          tex.colorSpace = THREE.NoColorSpace;
          tex.minFilter = THREE.LinearFilter;
          tex.magFilter = THREE.LinearFilter;
          tex.generateMipmaps = false;
          mat.uniforms.map.value = tex;
          c.kind = "video";
          c.v = v;
          c.tex = tex;
          v.addEventListener("loadeddata", () => !dead && c.kind === "video" && setCover(c, v.videoWidth, v.videoHeight));
          v.addEventListener("error", fallback);
        }
        return c;
      });
    };

    // ── path ───────────────────────────────────────────────────────────────
    const buildPath = () => {
      const pts = [];
      for (let i = 0; i <= 160; i++) {
        const t = i / 160, ph = mix(PH0, PH1, t), cs = Math.cos(ph), u = 2 * t - 1;
        // a shallow arc close to the camera, then long runs far behind it
        const depth = cs > 0 ? 7.6 + 16.4 * cs ** 0.9 : 7.6 + 2.2 * cs;
        const edge = 0.84 + 0.5 * span(0.14 - t, 0, 0.14) + 0.8 * span(t, 0.84, 1);
        pts.push(new THREE.Vector3(edge * Math.sin(ph) * depth * 0.561, 0.5 * Math.sign(u) * Math.abs(u) ** 1.4 * depth * 0.63, -depth));
      }
      path = new THREE.CatmullRomCurve3(pts, false, "centripetal");
      path.arcLengthDivisions = 1500;
      PATH_L = path.getLength();
      pathP.length = pathT.length = 0;
      for (let i = 0; i <= SAMPLES; i++) {
        const u = i / SAMPLES;
        pathP.push(path.getPointAt(u));
        pathT.push(path.getTangentAt(u));
      }
    };

    // ── poses ──────────────────────────────────────────────────────────────
    let op, ot, up, Y, vp;
    const at = (s, o, t) => {
      const f = clamp(s / PATH_L) * SAMPLES, i = Math.min(SAMPLES - 1, Math.floor(f)), k = f - i;
      o.lerpVectors(pathP[i], pathP[i + 1], k);
      t.lerpVectors(pathT[i], pathT[i + 1], k).normalize();
    };
    const grid = (i) => {
      const vh = 2 * GZ * tanH, vw = vh * asp, gw = vw * (cols === 3 ? 0.74 : 0.88), gap = gw * 0.017;
      const cw = (gw - gap * (cols - 1)) / cols, ch = cw / (CARD_W / CARD_H), gh = ch * rows + gap * 1.6 * (rows - 1);
      const c = i % cols, r = Math.floor(i / cols);
      return { x: -gw / 2 + cw / 2 + c * (cw + gap), y: gh / 2 - ch / 2 - r * (ch + gap * 1.6), w: cw, h: ch, vw, vh, c, r };
    };
    const poseRibbon = (c, head) => {
      const pos = c.geo.attributes.position, centre = head - c.i * STEP;
      for (let iy = 0; iy <= NY; iy++)
        for (let ix = 0; ix <= NX; ix++) {
          const k = iy * (NX + 1) + ix, lu = ix / NX - 0.5, lv = 0.5 - iy / NY;
          at(centre + lu * CARD_W, op, ot);
          // keep the sheet upright, leaning a little into the turn
          up.copy(Y).addScaledVector(ot, -Y.dot(ot)).normalize();
          vp.copy(op).addScaledVector(up, lv * CARD_H);
          pos.setXYZ(k, vp.x, vp.y, vp.z);
        }
      pos.needsUpdate = true;
    };
    const poseGrid = (c, qv) => {
      const g = grid(c.i), pos = c.geo.attributes.position;
      const dx = (g.c - (cols - 1) / 2) * 1.2, dy = g.r < rows / 2 ? 1 : -1;
      const ox = dx * g.vw * 0.62 * (1 - qv), oy = dy * g.vh * (g.c === 1 ? 0.95 : 0.34) * (1 - qv), tilt = (1 - qv) * 0.22 * (g.c - 1 || 0.5) * dy;
      const cs = Math.cos(tilt), sn = Math.sin(tilt);
      for (let iy = 0; iy <= NY; iy++)
        for (let ix = 0; ix <= NX; ix++) {
          const k = iy * (NX + 1) + ix, x = (ix / NX - 0.5) * g.w, y = (0.5 - iy / NY) * g.h;
          pos.setXYZ(k, g.x + ox + x * cs - y * sn, g.y + oy + x * sn + y * cs, -GZ - (1 - qv) * 0.6 * Math.sin((ix / NX) * Math.PI));
        }
      pos.needsUpdate = true;
      c.rect = g;
    };

    const render = (now) => {
      const pp = p;
      const rise = 1 - out(span(pp, 0, 0.12));
      const run = mix(-50, 76, span(pp, 0, 0.58));
      const vw = W / 100, vh = H / 100;
      l1.style.transform = `translate3d(${run * vw}px,${rise * 34 * vh}px,0)`;
      l2.style.transform = `translate3d(${-run * vw}px,${rise * 34 * vh}px,0)`;
      capEl.style.opacity = 1 - span(pp, 0.52, 0.57);
      capEl.style.transform = `translate(-50%,calc(-50% + ${rise * 34 * vh}px))`;
      ruleEl.style.transform = `scaleX(${ease(span(pp, 0.72, 0.86))})`;
      const n = cards.length;
      const pr = span(pp, RIB_A, RIB_B), head = mix(0, PATH_L + n * STEP, pr);
      for (const c of cards) {
        const s = head - c.i * STEP, end = PATH_L - CARD_W;
        if (s < end) {
          c.mesh.visible = s > CARD_W;
          c.rect = null;
          if (c.mesh.visible) poseRibbon(c, head);
        } else if (c.i < cols * rows) {
          // each card flies to its slot the moment it leaves the rail
          const st = mix(RIB_A, RIB_B, (end + c.i * STEP) / (PATH_L + n * STEP)), qv = out(span(pp, st, st + 0.13));
          c.mesh.visible = qv > 0.001;
          if (c.mesh.visible) poseGrid(c, qv);
        } else {
          c.mesh.visible = false;
          c.rect = null;
        }
        if (c.kind === "ph" && c.mesh.visible && c.ph) {
          c.ph.draw(now / 1000);
          c.ph.tex.needsUpdate = true;
        }
      }
      renderer.render(scene, camera);
    };

    // ── hover name ─────────────────────────────────────────────────────────
    on(stage, "pointermove", (e) => {
      if (!cfgRef.current.interactive) return;
      const r = stage.getBoundingClientRect();
      let hit = null;
      if (p > 0.86) {
        const nx = (e.clientX - r.left) / W - 0.5, ny = 0.5 - (e.clientY - r.top) / H;
        for (const c of cards) {
          const g = c.rect;
          if (!g) continue;
          const x = nx * g.vw, y = ny * g.vh;
          if (Math.abs(x - g.x) < g.w / 2 && Math.abs(y - g.y) < g.h / 2) hit = c;
        }
      }
      nameEl.style.opacity = hit ? 1 : 0;
      if (hit) {
        nameEl.textContent = hit.title;
        nameEl.style.transform = `translate(${e.clientX - r.left + 14}px,${e.clientY - r.top + 16}px)`;
      }
    });
    on(stage, "pointerleave", () => (nameEl.style.opacity = 0));
    on(sc, "scroll", readScroll, { passive: true });

    // ── start ──────────────────────────────────────────────────────────────
    const io = new IntersectionObserver(([en]) => (visible = en.isIntersecting), { threshold: 0 });
    io.observe(root);
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    measure();

    (async () => {
      try {
        THREE = await import(/* @vite-ignore */ THREE_URL);
        if (dead) return;
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        renderer.setClearColor(0, 0);
        renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
        op = new THREE.Vector3();
        ot = new THREE.Vector3();
        up = new THREE.Vector3();
        Y = new THREE.Vector3(0, 1, 0);
        vp = new THREE.Vector3();
        buildPath();
        buildCards();
        measure();
        let last = performance.now();
        const loop = (now) => {
          raf = requestAnimationFrame(loop);
          const dt = Math.min(100, now - last);
          last = now;
          if (!visible) return;
          if (cfgRef.current.mobileZoom !== lastZoom) measure();
          // p eases toward the scroll position, frame-rate independent
          const k = 1 - Math.pow(1 - clamp(num(cfgRef.current.smoothing, 0.09), 0.01, 1), dt / 16.667);
          p += (target - p) * k;
          if (Math.abs(target - p) < 0.00005) p = target;
          const rad = clamp(num(cfgRef.current.cardRadius, 0.018), 0, 0.1);
          for (const c of cards) c.mat.uniforms.radius.value = rad;
          for (const c of cards) {
            if (c.kind !== "video" || !c.v) continue;
            if (c.mesh.visible && c.v.paused) c.v.play().catch(() => {});
            else if (!c.mesh.visible && !c.v.paused) c.v.pause();
          }
          render(now);
        };
        raf = requestAnimationFrame(loop);
      } catch (e) {
        console.warn("VideoRibbon: three.js could not load.", e);
      }
    })();

    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      cleanups.forEach((f) => f());
      io.disconnect();
      ro.disconnect();
      cards.forEach((c) => {
        if (c.v) {
          try { c.v.pause(); c.v.removeAttribute("src"); c.v.load(); } catch (e) { /* ignore */ }
        }
        c.tex && c.tex.dispose();
        c.ph && c.ph.tex.dispose();
        c.geo.dispose();
        c.mat.dispose();
      });
      cards = [];
      if (renderer) renderer.dispose();
    };
    // the engine is rebuilt when the media list changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workKey]);

  const cats = String(categories).split("/").map((s) => s.trim()).filter(Boolean);

  return (
    <div
      ref={rootRef}
      className={"vrb" + (showFooter ? "" : " noui")}
      style={{ ...style, "--bg": background, "--ink": inkColor, "--mid": midColor, "--hs": headlineScale, "--W": "800px", "--H": "600px" }}
    >
      <style>{CSS}</style>
      <div className="sc" data-k="sc">
        <div className="track" data-k="track" style={{ height: `calc(var(--H) * ${num(scrollLength, 900) / 100})` }}>
          <main className="stage" data-k="stage">
            <h1 aria-label={`${line1} ${line2}`} style={{ position: "absolute", inset: 0, fontSize: "inherit" }}>
              <div className="hl l1" data-k="l1" aria-hidden="true"><span>{line1}</span></div>
              <div className="hl l2" data-k="l2" aria-hidden="true"><span>{line2}</span></div>
            </h1>
            <div className="cap" data-k="cap">{caption}</div>
            <div className="rule" data-k="rule" />
            <canvas className="gl" data-k="gl" />
            <footer className="bot">
              <p>{footerText}</p>
              <div className="mid">
                {cats.map((c, i) => (
                  <span key={i}>{i > 0 && <s>/</s>}{c}</span>
                ))}
              </div>
              <div className="r">{showreelLabel}</div>
            </footer>
            <div className="name" data-k="name" />
          </main>
        </div>
      </div>
    </div>
  );
}
