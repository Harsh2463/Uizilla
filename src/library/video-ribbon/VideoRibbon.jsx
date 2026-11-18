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

const GRAIN = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='g' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1.1 -.25'/></filter><rect width='100%' height='100%' filter='url(%23g)'/></svg>\")";
const MOTTLE = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='520' height='520'><filter id='m' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='.012 .02' numOctaves='3' seed='7' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .05  0 0 0 0 0  0 0 0 0 .2  0 0 0 1.6 -.55'/></filter><rect width='100%' height='100%' filter='url(%23m)'/></svg>\")";
const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";
const FONTS_URL =
  "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Inter+Tight:wght@400;500;600&family=Anton&display=swap";

const DEFAULT_BG = "https://ik.imagekit.io/Harsh2463/jackets/Fallen%20Purple%20King%20and%20Bronze%20Knight.png?tr=w-1920,f-webp,q-85";
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
.vrb .stage{position:sticky;top:0;height:var(--H);overflow:hidden;background:var(--bg);contain:layout paint}
.vrb .bgfx{position:absolute;inset:0;pointer-events:none;background:radial-gradient(62% 58% at 74% 64%,color-mix(in srgb,var(--accent) 60%,transparent),transparent 72%),radial-gradient(46% 46% at 18% 78%,color-mix(in srgb,var(--accent) 38%,transparent),transparent 74%),radial-gradient(40% 36% at 50% 8%,color-mix(in srgb,var(--accent) 22%,transparent),transparent 78%),linear-gradient(180deg,color-mix(in srgb,var(--accent) 14%,var(--bg)),var(--bg) 62%)}
.vrb .ghost{position:absolute;left:50%;top:var(--gtop,36%);transform:translate(-50%,calc(-50% + var(--gy,0px))) rotate(var(--gr,0deg));white-space:nowrap;pointer-events:none;font-family:'Anton','Inter Tight',Impact,sans-serif;font-weight:400;line-height:1;text-transform:uppercase;letter-spacing:.01em;opacity:var(--go,.7);will-change:transform}
.vrb .ghost .gch{display:inline-block;color:transparent;background-image:var(--ggrain),var(--gmottle),linear-gradient(180deg,transparent 38%,rgba(12,0,36,.42) 100%),linear-gradient(100deg,color-mix(in srgb,var(--gc) var(--ta),var(--gc2)),color-mix(in srgb,var(--gc) var(--tb),var(--gc2)));background-size:240px 240px,520px 520px,100% 100%,100% 100%;-webkit-background-clip:text;background-clip:text;animation:vrbDrop 1s cubic-bezier(.22,1,.36,1) both;animation-delay:calc(260ms + var(--i) * 110ms)}
@keyframes vrbDrop{from{transform:translateY(-130%);opacity:0}to{transform:none;opacity:1}}
.vrb .bgblur{position:absolute;inset:-6%;pointer-events:none;background-repeat:no-repeat;background-position:center bottom;background-size:cover;filter:blur(var(--bgblur,34px)) saturate(1.15);opacity:calc(var(--bgop,.9) * .62)}
.vrb .bgimg{position:absolute;left:0;right:0;bottom:0;top:var(--bgtop,22%);pointer-events:none;background-repeat:no-repeat;background-position:var(--bgpos,right) var(--bgposy,100%);background-size:var(--bgsize,var(--bgfit,contain));filter:brightness(calc(.4 + .6 * var(--bgop,.55)));transform:scale(var(--bgscale,1.25));transform-origin:var(--bgpos,right) bottom;-webkit-mask-image:var(--bgtopmask),var(--bgedge);mask-image:var(--bgtopmask),var(--bgedge);-webkit-mask-composite:source-in;mask-composite:intersect}
.vrb .bgvig{position:absolute;inset:0;pointer-events:none;background:radial-gradient(120% 95% at 50% 58%,transparent 52%,color-mix(in srgb,var(--bg) 85%,transparent) 100%),linear-gradient(180deg,color-mix(in srgb,var(--bg) 55%,transparent),transparent 28%)}
.vrb .hl{color:var(--hc,var(--ink));position:absolute;left:0;right:0;font-weight:400;font-size:clamp(40px,calc(var(--W) * .067 * var(--hs,1)),calc(130px * var(--hs,1)));line-height:1;letter-spacing:-.055em;white-space:nowrap;text-align:center;will-change:transform}
.vrb .l1{top:calc(50% - .98em)}
.vrb .l2{top:calc(50% + .03em)}
.vrb .hl span{display:inline-block}
.vrb .l1 span{margin-right:calc(var(--W) * .15)}
.vrb .l2 span{margin-left:calc(var(--W) * .15)}
.vrb .cap{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:15em;text-align:center;font-size:clamp(9px,calc(var(--W) * .0074),13px);font-weight:500;line-height:1.3;letter-spacing:.03em;text-transform:uppercase;color:var(--ink)}
.vrb .gl{position:absolute;inset:0;width:100%;height:100%;display:block;transform:translateZ(0)}
.vrb .bot{position:absolute;left:32px;right:32px;bottom:26px;display:grid;grid-template-columns:1fr auto 1fr;align-items:end;font-size:12.5px;line-height:1.35;pointer-events:none}
.vrb .bot .mid{font:400 11.5px 'IBM Plex Mono',monospace;letter-spacing:.06em}
.vrb .bot .mid s{text-decoration:none;color:var(--mid);margin:0 .9em}
.vrb .rule{position:absolute;left:3.5%;right:3.5%;top:50%;height:1px;background:var(--line);transform-origin:left;transform:scaleX(0)}
.vrb .name{position:absolute;left:0;top:0;padding:6px 11px;background:var(--ink);color:var(--bg);border-radius:99px;font-size:11.5px;font-weight:600;letter-spacing:.04em;pointer-events:none;opacity:0;transition:opacity .16s;white-space:nowrap}
.vrb.sm .bot{left:18px;right:18px;bottom:18px;grid-template-columns:1fr auto 1fr}
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
  categories = "VISUALS/FILM/MUSIC/EXPERIMENTS",
  work = DEFAULT_WORK,
  placeholders = true,
  background = "#0b0213",
  showGhost = true,
  ghostText = "MOTION",
  ghostColor = "#c54ff0",
  ghostColor2 = "#5a35f0",
  ghostOpacity = 70,
  ghostSize = 1,
  ghostDirection = "horizontal",
  ghostTravel = 80,
  headlineColor = "#d25cf2",
  inkColor = "#f6edff",
  midColor = "#b394dc",
  accentColor = "#8a2be2",
  bgImage = DEFAULT_BG,
  bgImageOpacity = 55,
  bgImageFit = "cover",
  bgImageTop = 20,
  bgImageHeadroom = 11,
  bgImageMaxWidth = 155,
  bgImageSide = "full",
  bgImageScale = 1.2,
  bgImageBlur = 34,
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
  cfgRef.current = { work, placeholders, smoothing, cardRadius, interactive, scrollLength, mobileZoom, ghostTravel, ghostDirection };
  const bgAspect = useRef(1672 / 941);
  const workKey = JSON.stringify(work) + "|" + placeholders;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const q = (k) => root.querySelector(`[data-k="${k}"]`);
    const sc = q("sc"), track = q("track"), canvas = q("gl"), nameEl = q("name"), stage = q("stage");
    const l1 = q("l1"), l2 = q("l2"), capEl = q("cap"), ruleEl = q("rule"), ghostEl = q("ghost");
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
    let lastLen = null;
    let scrollMax = 1; // cached, so a scroll event never forces a layout read
    let forceRender = true; // something other than scrolling changed: draw once
    let dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const dprCap = dpr;
    let THREE = null, renderer = null, scene = null, camera = null;
    let cards = [];
    let path = null, PATH_L = 1;
    const pathP = [], pathT = [];

    const readScroll = () => {
      target = scrollMax > 0 ? clamp(sc.scrollTop / scrollMax) : 0;
    };
    const measure = () => {
      const r = root.getBoundingClientRect();
      W = Math.max(1, r.width);
      H = Math.max(1, r.height);
      asp = W / H;
      root.style.setProperty("--W", W + "px");
      root.style.setProperty("--H", H + "px");
      root.classList.toggle("sm", W < 760);
      scrollMax = track.offsetHeight - sc.clientHeight;
      lastLen = cfgRef.current.scrollLength;
      forceRender = true;
      if (renderer) {
        renderer.setPixelRatio(dpr);
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
          const hue = 262 + ((c.i * 23 + t * 6) % 64);
          const g = ctx.createLinearGradient(0, 0, 640, 400);
          g.addColorStop(0, `hsl(${hue} 55% 22%)`);
          g.addColorStop(1, `hsl(${(hue + 32) % 360} 62% 36%)`);
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, 640, 400);
          for (let k = 0; k < 4; k++) {
            const a = t * (0.5 + k * 0.23) + c.i + k * 1.7;
            ctx.beginPath();
            ctx.arc(320 + Math.cos(a) * (180 + k * 30), 200 + Math.sin(a * 1.3) * 110, 70 + k * 26, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${(hue + k * 18) % 360} 75% 62% / .22)`;
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
      forceRender = true;
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
          Object.assign(v, { crossOrigin: "anonymous", muted: true, loop: true, playsInline: true, preload: "metadata", src });
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

    // Draws a frame. `full` is true when the scroll position moved (or the layout changed);
    // otherwise only placeholder canvases and video textures need to refresh, so none of the
    // DOM writes or geometry work is repeated.
    const render = (now, full) => {
      const pp = p;
      if (full) {
        // the background word drifts up with the scroll (and back down when scrolling back), all
        // letters together. Set as a plain transform so only the compositor moves it.
        if (ghostEl) {
          const gd = cfgRef.current.ghostDirection;
          const rot = gd === "down" ? 90 : gd === "up" ? -90 : 0;
          ghostEl.style.transform = `translate(-50%,calc(-50% + ${-pp * H * (num(cfgRef.current.ghostTravel, 80) / 100)}px)) rotate(${rot}deg)`;
        }
        const rise = 1 - out(span(pp, 0, 0.12));
        const run = mix(-50, 76, span(pp, 0, 0.58));
        const vw = W / 100, vh = H / 100;
        l1.style.transform = `translate3d(${run * vw}px,${rise * 34 * vh}px,0)`;
        l2.style.transform = `translate3d(${-run * vw}px,${rise * 34 * vh}px,0)`;
        capEl.style.opacity = 1 - span(pp, 0.52, 0.57);
        capEl.style.transform = `translate(-50%,calc(-50% + ${rise * 34 * vh}px))`;
        ruleEl.style.transform = `scaleX(${ease(span(pp, 0.72, 0.86))})`;
      }
      const n = cards.length;
      const pr = span(pp, RIB_A, RIB_B), head = mix(0, PATH_L + n * STEP, pr);
      const layoutKey = `|${cols}|${rows}|${W}|${H}`;
      for (const c of cards) {
        if (full) {
          const s = head - c.i * STEP, end = PATH_L - CARD_W;
          if (s < end) {
            c.mesh.visible = s > CARD_W;
            c.rect = null;
            if (c.mesh.visible) {
              const key = head.toFixed(4);
              if (c.key !== key) {
                poseRibbon(c, head);
                c.key = key;
              }
            }
          } else if (c.i < cols * rows) {
            // each card flies to its slot the moment it leaves the rail
            const st = mix(RIB_A, RIB_B, (end + c.i * STEP) / (PATH_L + n * STEP)), qv = out(span(pp, st, st + 0.13));
            c.mesh.visible = qv > 0.001;
            if (c.mesh.visible) {
              // a card that has settled in its slot is not re-posed while the others still move
              const key = qv.toFixed(4) + layoutKey;
              if (c.key !== key) {
                poseGrid(c, qv);
                c.key = key;
              }
            }
          } else {
            c.mesh.visible = false;
            c.rect = null;
          }
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
        // MSAA only where pixels are big; on dense screens it costs a lot and shows little
        renderer = new THREE.WebGLRenderer({ canvas, antialias: (window.devicePixelRatio || 1) <= 1.5, alpha: true, powerPreference: "high-performance" });
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
        let lastP = -1;
        let warmed = false;
        let frame = 0;
        let prevRendered = false;
        let avg = 16.7;
        let sinceAdapt = 0;
        const loop = (now) => {
          raf = requestAnimationFrame(loop);
          const dt = Math.min(100, now - last);
          last = now;
          if (!visible) {
            prevRendered = false;
            return;
          }
          if (cfgRef.current.mobileZoom !== lastZoom || cfgRef.current.scrollLength !== lastLen) measure();
          // p eases toward the scroll position, frame-rate independent
          const k = 1 - Math.pow(1 - clamp(num(cfgRef.current.smoothing, 0.09), 0.01, 1), dt / 16.667);
          p += (target - p) * k;
          if (Math.abs(target - p) < 0.00005) p = target;
          const moved = p !== lastP;
          // start loading the rest of the videos only once scrolling begins
          if (!warmed && p > 0.01) {
            warmed = true;
            cards.forEach((c) => c.v && (c.v.preload = "auto"));
          }
          const rad = clamp(num(cfgRef.current.cardRadius, 0.018), 0, 0.1);
          if (cards.length && cards[0].mat.uniforms.radius.value !== rad) {
            cards.forEach((c) => (c.mat.uniforms.radius.value = rad));
            forceRender = true;
          }
          if (moved || forceRender) {
            // visibility only changes when the scroll position (or layout) does
            for (const c of cards) {
              if (c.kind !== "video" || !c.v) continue;
              if (c.mesh.visible && c.v.paused) c.v.play().catch(() => {});
              else if (!c.mesh.visible && !c.v.paused) c.v.pause();
            }
          }
          // idle, nothing on screen that animates: don't touch the GPU at all
          const animating = cards.some((c) => c.mesh.visible && (c.kind === "video" || c.kind === "ph"));
          if (!moved && !forceRender && !animating) {
            prevRendered = false;
            return;
          }
          // only a playing video / placeholder is changing: 30 fps is plenty
          if (!moved && !forceRender && (frame++ & 1)) return;
          const full = moved || forceRender;
          forceRender = false;
          lastP = p;
          render(now, full);
          // keep it smooth: lower the pixel ratio if frames run long, raise it again when there is headroom
          if (prevRendered && dt < 120) {
            avg = avg * 0.92 + dt * 0.08;
            if (++sinceAdapt >= 45) {
              sinceAdapt = 0;
              let next = dpr;
              if (avg > 24 && dpr > 0.75) next = Math.max(0.75, dpr * 0.85);
              else if (avg < 15.5 && dpr < dprCap) next = Math.min(dprCap, dpr * 1.1);
              if (next !== dpr) {
                dpr = next;
                renderer.setPixelRatio(dpr);
                renderer.setSize(W, H, false);
                forceRender = true;
              }
            }
          }
          prevRendered = true;
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

  // Full-screen picture: keep the SAME size (cover) but slide it down just far enough that the
  // subject's top stays in view at any box width; the extra is trimmed from the floor below
  // instead. `headroom` is how much of the picture's empty top (as % of its height) may be cropped.
  const full = bgImageSide === "full";
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const apply = () => {
      const r = root.getBoundingClientRect();
      let pos = 100;
      let size = "";
      if (full && bgImageFit !== "contain" && r.width > 0 && r.height > 0) {
        // Width follows the box: fill it like "cover", but never grow wider than maxWidth % of the box
        // (so on a narrow or tall screen the whole subject stays in view, and the gradient shows above it).
        const coverW = Math.max(r.width, r.height * bgAspect.current);
        const imgW = Math.max(r.width, Math.min(coverW, (r.width * num(bgImageMaxWidth, 155)) / 100));
        size = imgW + "px auto";
        const Hi = imgW / bgAspect.current; // picture height at that width
        if (Hi > r.height) pos = clamp(((num(bgImageHeadroom, 11) / 100) * Hi) / (Hi - r.height), 0, 1) * 100;
      }
      root.style.setProperty("--bgposy", pos + "%");
      if (size) root.style.setProperty("--bgsize", size);
      else root.style.removeProperty("--bgsize");
    };
    let live = true;
    if (bgImage) {
      const im = new Image();
      im.onload = () => {
        if (!live) return;
        if (im.naturalWidth && im.naturalHeight) bgAspect.current = im.naturalWidth / im.naturalHeight;
        apply();
      };
      im.src = bgImage;
    }
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(root);
    return () => {
      live = false;
      ro.disconnect();
    };
  }, [bgImage, full, bgImageFit, bgImageHeadroom, bgImageMaxWidth]);

  const cats = String(categories).split("/").map((s) => s.trim()).filter(Boolean);

  return (
    <div
      ref={rootRef}
      className={"vrb" + (showFooter ? "" : " noui")}
      style={{ ...style, "--bg": background, "--ink": inkColor, "--hc": headlineColor, "--mid": midColor, "--accent": accentColor, "--bgop": clamp(num(bgImageOpacity, 55), 0, 100) / 100, "--bgfit": bgImageFit === "cover" ? "cover" : "contain", "--bgtop": (full ? 0 : clamp(num(bgImageTop, 20), 0, 60)) + "%", "--bgscale": full ? 1 : clamp(num(bgImageScale, 1.2), 0.6, 2), "--bgblur": clamp(num(bgImageBlur, 34), 0, 80) + "px", "--bgpos": bgImageSide === "left" ? "left" : bgImageSide === "right" ? "right" : "center", "--bgtopmask": full ? "none" : "linear-gradient(to bottom,transparent 0,#000 16%)", "--bgedge": full ? "none" : bgImageSide === "left" ? "linear-gradient(to left,transparent 0,#000 7%)" : bgImageSide === "center" ? "linear-gradient(to right,transparent 0,#000 18%,#000 82%,transparent 100%)" : "linear-gradient(to right,transparent 0,#000 7%)", "--hs": headlineScale, "--W": "800px", "--H": "600px" }}
    >
      <style>{CSS}</style>
      <div className="sc" data-k="sc">
        <div className="track" data-k="track" style={{ height: `calc(var(--H) * ${num(scrollLength, 900) / 100})` }}>
          <main className="stage" data-k="stage">
            <div className="bgfx" />
            {showGhost && String(ghostText).trim() ? (
              <div
                className="ghost"
                data-k="ghost"
                aria-hidden="true"
                style={{
                  fontSize:
                    ghostDirection === "up" || ghostDirection === "down"
                      ? `calc(var(--H) * ${(0.92 * clamp(num(ghostSize, 1), 0.3, 2)) / (Math.max(2, String(ghostText).trim().length) * 0.52)})`
                      : `min(calc(var(--H) * ${0.5 * clamp(num(ghostSize, 1), 0.3, 2)}), calc(var(--W) * ${(0.9 * clamp(num(ghostSize, 1), 0.3, 2)) / (Math.max(2, String(ghostText).trim().length) * 0.52)}))`,
                  "--gr": ghostDirection === "down" ? "90deg" : ghostDirection === "up" ? "-90deg" : "0deg",
                  "--gtop": ghostDirection === "up" || ghostDirection === "down" ? "50%" : "36%",
                  "--gc": ghostColor,
                  "--gc2": ghostColor2,
                  "--ggrain": GRAIN,
                  "--gmottle": MOTTLE,
                  "--go": clamp(num(ghostOpacity, 70), 0, 100) / 100,
                }}
              >
                {Array.from(String(ghostText).trim()).map((ch, i, arr) => {
                  const n = Math.max(1, arr.length);
                  return ch === " " ? (
                    <span key={i} className="gs">{"\u00A0"}</span>
                  ) : (
                    <span key={i} className="gch" style={{ "--i": i, "--ta": `${(i / n) * 100}%`, "--tb": `${((i + 1) / n) * 100}%` }}>
                      {ch}
                    </span>
                  );
                })}
              </div>
            ) : null}
            {bgImage && !full ? <div className="bgblur" style={{ backgroundImage: `url("${bgImage}")` }} /> : null}
            {bgImage ? <div className="bgimg" style={{ backgroundImage: `url("${bgImage}")` }} /> : null}
            <div className="bgvig" />
            <h1 aria-label={`${line1} ${line2}`} style={{ position: "absolute", inset: 0, fontSize: "inherit" }}>
              <div className="hl l1" data-k="l1" aria-hidden="true"><span>{line1}</span></div>
              <div className="hl l2" data-k="l2" aria-hidden="true"><span>{line2}</span></div>
            </h1>
            <div className="cap" data-k="cap">{caption}</div>
            <div className="rule" data-k="rule" />
            <canvas className="gl" data-k="gl" />
            <footer className="bot">
              <div />
              <div className="mid">
                {cats.map((c, i) => (
                  <span key={i}>{i > 0 && <s>/</s>}{c}</span>
                ))}
              </div>
              <div />
            </footer>
            <div className="name" data-k="name" />
          </main>
        </div>
      </div>
    </div>
  );
}
