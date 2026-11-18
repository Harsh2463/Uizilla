import { useCallback, useEffect, useRef, useState } from "react";

/**
 * StrideBarSite — a four-section landing page for a fictional plant-protein bar
 * brand, built around ONE travelling 3D bar wrapper.
 *
 *  1. Hero      Five bars on a 3D arc (WebGL). Drag, click, arrow keys or autoplay
 *               change flavour; the page colour grows out from behind the centre bar.
 *  2. Inside    Pinned section. The bar you picked flies in and flips 180° at each
 *               of four steps, then spins through a storm of its own ingredients.
 *  3. Shop      The same bar lands exactly on its own card (and follows its tilt).
 *  4. Builder   Build a 3-pack; bars fly into the basket in the nav.
 *
 * It scrolls INSIDE its own box (give the parent a height) so it can sit in a
 * card or a preview; every "viewport" measure in the page is that box.
 *
 * DEPENDENCIES (nothing is installed; all are loaded at runtime):
 *   • React 18                       – the only npm dependency
 *   • three@0.160.0 (WebGL)          – imported on first render from
 *                                      https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js
 *                                      (RoomEnvironment is NOT needed: a small
 *                                      equivalent environment is built from core three)
 *   • Google Fonts                   – Archivo Black, Inter, DM Mono (stylesheet link)
 *   • images.higgs.ai                – the wrapper / ingredient sprite sheet (also
 *                                      read into WebGL textures, needs CORS: it sends *)
 *   • d8j0ntlcm91z4.cloudfront.net   – the optional intro video
 *   • Browser APIs: WebGL, Canvas 2D, Web Animations, IntersectionObserver,
 *                   ResizeObserver, Pointer Events
 */

const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js";
const SHEET_URL =
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261116_132032_30242d8c-5062-4d60-8a3d-238f0a2ff788.png&w=2200&q=85";
const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20261116_131908_b6239896-c077-450c-ad91-575153973fcf.mp4";
const FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Archivo+Black&family=DM+Mono:wght@400;500&family=Inter:wght@100..900&display=swap";

const SW = 2688;
const SH = 1520;
const BH = (849 + 8) / (403 + 8); // wrapper height in units (width = 1)

const FLAVORS = [
  { name: "Peanut Cocoa", color: "#b79474", box: [98, 145, 403, 849], bit: 1, ing: "Peanuts, oats, dates, cocoa, pea protein, sea salt." },
  { name: "Berry Oat", color: "#ab9ac4", box: [620, 145, 402, 849], bit: 0, ing: "Oats, blueberries, raspberries, dates, pea protein, almonds." },
  { name: "Salted Caramel", color: "#d1ad6c", box: [1137, 145, 402, 849], bit: 2, ing: "Dates, cashews, oats, pea protein, sea salt, vanilla." },
  { name: "Mint Chip", color: "#94bdb4", box: [1661, 145, 402, 849], bit: 3, ing: "Oats, dark chocolate, almonds, pea protein, peppermint oil." },
  { name: "Strawberry", color: "#d396a7", box: [2184, 145, 403, 849], bit: 4, ing: "Oats, strawberries, dates, cashews, pea protein, lemon." },
];
const BITS = [
  [650, 1090, 340, 305],
  [110, 1125, 280, 255],
  [1175, 1110, 320, 285],
  [1680, 1085, 380, 305],
  [2280, 1095, 250, 295],
];

const STEPS = [
  { head: ["REAL FOOD,", "FIRST"], cap: ["Oats, nuts, fruit.", "Nothing you can't say."], ang: 0 },
  { head: ["PRESSED,", "NOT BAKED"], cap: ["Real ingredients.", "Clean energy."], ang: 180 },
  { head: ["WRAPPED", "SAME DAY"], cap: ["Cold-pressed at dawn.", "Sealed by noon."], ang: 360 },
  { head: null, cap: ["12g plant protein.", "No crash."], ang: 720 },
];

/** Slot table for the arc: [dx, dy, height, rz, ry] in hero units, by |k|. */
const SLOTS = [
  [0, 0, 430, 0, 0],
  [245, 24, 330, 4, 16],
  [452, 44, 312, 8, 26],
  [660, 80, 296, 12, 34],
  [860, 118, 280, 15, 40],
];

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const num = (v, fb) => (Number.isFinite(Number(v)) ? Number(v) : fb);
const mod = (a, n) => ((a % n) + n) % n;

/** CSS cubic-bezier as a function of time (solved per call). */
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = (s) => ((ax * s + bx) * s + cx) * s;
  const Y = (s) => ((ay * s + by) * s + cy) * s;
  return (t) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let lo = 0, hi = 1, s = t;
    for (let i = 0; i < 24; i++) {
      const x = X(s);
      if (Math.abs(x - t) < 1e-5) break;
      if (x < t) lo = s; else hi = s;
      s = (lo + hi) / 2;
    }
    return Y(s);
  };
}
const GLIDE = bezier(0.25, 0.75, 0.2, 1);
const ENTER = bezier(0.16, 1, 0.3, 1);
const easeIO = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const sineIO = (t) => -(Math.cos(Math.PI * t) - 1) / 2;

function mixHex(a, b, t) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",")})`;
}

/** Sprite crop style for a sheet box. */
function spr(box, pad = 0) {
  const [x0, y0, w0, h0] = box;
  const x = x0 - pad, y = y0 - pad, w = w0 + 2 * pad, h = h0 + 2 * pad;
  return {
    backgroundImage: "var(--sheet)",
    backgroundRepeat: "no-repeat",
    backgroundSize: `${(SW / w) * 100}% ${(SH / h) * 100}%`,
    backgroundPosition: `${(x / (SW - w)) * 100}% ${(y / (SH - h)) * 100}%`,
  };
}
const wrapper = (i) => spr(FLAVORS[i].box, 4);

// ── CSS ─────────────────────────────────────────────────────────────────────
const U = (v) => `calc(var(--u) * ${v})`;
const Wd = (v) => `calc(var(--w) * ${v})`;
const N = (v) => `calc(var(--n) * ${v})`;

const CSS = `
.stb{--flav:#ab9ac4;--rv:transparent;--ease:cubic-bezier(.22,.8,.24,1);position:relative;width:100%;height:100%;overflow:hidden;z-index:0;background:var(--cream);color:var(--ink);font-family:Inter,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;-webkit-font-smoothing:antialiased}
.stb *,.stb *::before,.stb *::after{box-sizing:border-box}
.stb button{font:inherit;color:inherit;cursor:pointer;border:0;background:none;padding:0}
.stb .disp{font-family:"Archivo Black",Impact,"Arial Black",sans-serif;font-weight:400;text-transform:uppercase;letter-spacing:-.01em;line-height:.92}
.stb .mono{font-family:"DM Mono",ui-monospace,Menlo,Consolas,monospace}
.stb .scroller{position:absolute;inset:0;overflow-y:auto;overflow-x:hidden;scrollbar-width:none}
.stb .scroller::-webkit-scrollbar{display:none}
.stb.locked .scroller{overflow:hidden}
.stb .spr{display:block;background-repeat:no-repeat}
.stb .gl{position:sticky;top:0;display:block;width:100%;height:var(--H);margin-bottom:calc(var(--H) * -1);z-index:2;pointer-events:none}
.stb .infront{position:sticky;top:0;width:100%;height:var(--H);margin-bottom:calc(var(--H) * -1);z-index:3;pointer-events:none;visibility:hidden;overflow:hidden}
.stb .frame{position:absolute;left:50%;top:50%;width:1440px;height:900px;margin:-450px 0 0 -720px;transform:scale(var(--k));transform-origin:50% 50%}
.stb.phone .frame{width:390px;height:780px;margin:-390px 0 0 -195px}

/* nav */
.stb .nav{position:absolute;left:0;right:0;top:0;height:${N(94)};z-index:50;display:flex;align-items:center;justify-content:space-between;padding:0 ${N(37)} 0 ${N(42)};color:var(--ink);transform:translateY(-110%);transition:color .4s}
.stb .brand{display:flex;align-items:center;gap:${N(10)};font-weight:800;font-size:${N(15.5)};letter-spacing:.06em}
.stb .brand svg{width:${N(36)};height:${N(36)}}
.stb .pill{position:relative;display:flex;padding:${N(5)};border:1.5px solid rgba(255,255,255,.9);background:rgba(255,255,255,.08);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border-radius:99px;transition:border-color .4s,background .4s}
.stb .pill .hl{position:absolute;top:${N(5)};bottom:${N(5)};left:0;width:0;background:#fff;border-radius:99px;transition:left .5s var(--ease),width .5s var(--ease)}
.stb .pill a{position:relative;z-index:1;padding:${N(9)} ${N(18)};font-size:${N(14.5)};font-weight:500;border-radius:99px;cursor:pointer;color:inherit;text-decoration:none}
.stb .pill a.on{font-weight:600;color:#1c1a1f}
.stb.nav-light .pill{border-color:rgba(28,26,31,.14);background:rgba(255,255,255,.35)}
.stb.nav-dark .nav{color:var(--cream)}
.stb.nav-dark .pill{border-color:rgba(240,232,224,.25);background:rgba(255,255,255,.06)}
.stb .nright{display:flex;align-items:center;gap:${N(8)}}
.stb .chip{display:grid;place-items:center;height:${N(37)};padding:0 ${N(14)};border:1.5px solid currentColor;border-radius:99px;font-size:${N(13)};font-weight:700}
.stb .basket{position:relative;width:${N(44)};padding:0;border-color:currentColor}
.stb .basket svg{width:${N(18)};height:${N(18)}}
.stb .badge{position:absolute;top:${N(-7)};right:${N(-5)};min-width:18px;height:18px;padding:0 5px;border-radius:99px;background:var(--ink);color:var(--cream);font:500 10.5px/18px "DM Mono",monospace;text-align:center;transform:scale(0)}
.stb .badge.on{transform:scale(1)}
.stb .cta{height:${N(37)};padding:0 ${N(18)};border-radius:99px;background:var(--ink);color:var(--cream);font-size:${N(14.5)};font-weight:600;white-space:nowrap}
.stb.nav-dark .cta{background:#8fa8a3;color:#191a1e}

/* hero */
.stb .hero{position:relative;height:var(--H);min-height:300px;overflow:hidden;background:var(--flav)}
.stb .reveal{position:absolute;inset:0;background:var(--rv);visibility:hidden}
.stb .rings{position:absolute;left:50%;top:41%;width:${U(2200)};height:${U(2200)};margin:${U(-1100)} 0 0 ${U(-1100)};border-radius:50%;background:repeating-radial-gradient(circle,rgba(255,255,255,.13) 0,rgba(255,255,255,.02) ${U(40)},rgba(255,255,255,.13) ${U(80)});-webkit-mask-image:radial-gradient(circle,#000 0 22%,rgba(0,0,0,.55) 34%,transparent 52%);mask-image:radial-gradient(circle,#000 0 22%,rgba(0,0,0,.55) 34%,transparent 52%);pointer-events:none;opacity:0}
.stb .bit{position:absolute;opacity:0;filter:blur(1.5px);pointer-events:none}
.stb .arc{position:absolute;inset:0;touch-action:pan-y;cursor:grab}
.stb.dragging .arc{cursor:grabbing}
.stb.dragging{user-select:none}
.stb .play{position:absolute;left:50%;top:calc(50% + var(--u) * 200);width:${U(52)};height:${U(52)};margin:${U(-26)} 0 0 ${U(-26)};border-radius:50%;background:#fff;z-index:60;display:grid;place-items:center;box-shadow:0 6px 20px rgba(40,28,60,.12);transition:transform .2s;opacity:0}
.stb .play:hover{transform:scale(1.08)}.stb .play:active{transform:scale(.94)}
.stb .play svg{width:${U(18)};height:${U(18)};fill:none;stroke:var(--ink);stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;transition:transform .2s}
.stb .play:hover svg{transform:translateX(2px)}
.stb .title{position:absolute;left:0;right:0;top:calc(50% + var(--u) * 265);text-align:center;z-index:60;color:var(--ink);font-size:${U(96)};pointer-events:none}
.stb .title .tl{display:block;position:relative}
.stb .title .wd{display:inline-block;white-space:nowrap}
.stb .title .ch{display:inline-block}
.stb .count{position:absolute;right:calc(50% - var(--u) * 692);top:calc(50% + var(--u) * 215);z-index:1;font-size:${U(200)};color:transparent;-webkit-text-stroke:1.5px rgba(255,255,255,.9);pointer-events:none;opacity:0}
.stb .auto{position:absolute;right:calc(50% - var(--u) * 680);top:calc(50% + var(--u) * 170);z-index:60;display:flex;align-items:center;gap:10px;color:#fff;font:500 11px "DM Mono",monospace;letter-spacing:.14em;text-transform:uppercase;opacity:0}
.stb .auto i{display:grid;place-items:center;width:26px;height:26px;border:1.3px solid #fff;border-radius:50%}
.stb .auto svg{width:10px;height:10px;fill:#fff}

/* intro */
.stb .intro{position:absolute;inset:0;z-index:100;background:#ab9ac4;overflow:hidden}
.stb .intro video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.stb .skip{position:absolute;top:${U(28)};right:${U(36)};height:38px;padding:0 18px;border-radius:99px;background:rgba(255,255,255,.85);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);font:500 12px "DM Mono",monospace;letter-spacing:.12em;text-transform:uppercase;z-index:2}
.stb .logo{position:absolute;inset:0;display:none;place-items:center;background:var(--cream)}
.stb .logo.on{display:grid}
.stb .logo div{display:flex;align-items:center;gap:${U(18)};animation:stbStamp .38s ease-out both}
.stb .logo svg{width:${U(120)};height:${U(120)}}
.stb .logo b{font-weight:800;font-size:${U(72)};letter-spacing:.06em}
@keyframes stbStamp{0%{transform:scale(.72);opacity:0}70%{transform:scale(1.04);opacity:1}100%{transform:scale(1);opacity:1}}

/* inside */
.stb .inside{position:relative;height:calc(var(--H) * 5);background:var(--flav)}
.stb .pin{position:sticky;top:0;height:var(--H);overflow:hidden}
.stb .in-dark{position:absolute;inset:0;background:#120d16;opacity:0}
.stb .in-num{position:absolute;left:510px;top:240px;width:640px;text-align:center;font-size:428px;color:transparent;-webkit-text-stroke:1.6px #fff;line-height:.9}
.stb .in-bar{position:absolute;left:665px;top:110px;width:330px;height:694px}
.stb .in-head{position:absolute;left:40px;top:300px;font-size:88px;color:var(--cream);line-height:.93}
.stb .in-icons{position:absolute;left:1292px;top:310px;display:grid;gap:4px;pointer-events:auto}
.stb .in-icons button{display:grid;place-items:center;width:66px;height:66px;border:1.5px solid #fff;border-radius:50%;color:#fff;transition:background .3s,color .3s}
.stb .in-icons button.on{background:var(--cream);color:var(--ink);border-color:var(--cream)}
.stb .in-icons svg{width:26px;height:26px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.stb .in-cap{position:absolute;right:42px;top:596px;text-align:right;font:400 14px/1.5 "DM Mono",monospace;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.92)}
.stb .storm{position:absolute;inset:0}
.stb .piece{position:absolute;left:0;top:0;opacity:0;will-change:transform}

/* shop */
.stb .shop{position:relative;background:var(--cream);padding:${Wd(96)} ${Wd(39)} ${Wd(80)}}
.stb .shop h2{margin:0;font-size:${Wd(94)};line-height:.86}
.stb .ln{display:block;overflow:hidden;padding-bottom:.04em}
.stb .ln>span{display:block;transform:translateY(105%);transition:transform 1s var(--ease)}
.stb .ln:nth-child(2)>span{transition-delay:.08s}
.stb .in .ln>span{transform:none}
.stb .shop .cap{position:absolute;left:${Wd(1128)};top:${Wd(132)};font:400 ${Wd(15.5)}/1.42 "DM Mono",monospace;opacity:0;transform:translateY(24px);transition:opacity 1s var(--ease),transform 1s var(--ease)}
.stb .in .cap{opacity:1;transform:none}
.stb .cards{display:grid;grid-template-columns:repeat(5,1fr);gap:${Wd(18)};margin-top:${Wd(24)};perspective:1200px}
.stb .card{position:relative;height:${Wd(390)};border-radius:${Wd(22)};background:var(--c);transform-style:preserve-3d;transition:transform .4s var(--ease),box-shadow .4s,opacity .8s;opacity:0;cursor:pointer}
.stb .in .card{opacity:1}
.stb .card.tilt{transition:transform .15s,box-shadow .15s;box-shadow:0 24px 40px -18px rgba(40,30,20,.35)}
.stb .card.press{transform:scale(.97)!important}
.stb .card .nm{position:absolute;left:0;right:0;top:${Wd(26)};text-align:center;color:#fbf7f2;font-size:${Wd(30.5)}}
.stb .card .pk{position:absolute;left:50%;top:${Wd(104)};width:${Wd(121)};height:${Wd(255)};margin-left:${Wd(-60.5)};transform:translateZ(30px);filter:drop-shadow(0 ${Wd(8)} ${Wd(12)} rgba(40,24,40,.3))}
.stb .card.live .pk{visibility:hidden}
.stb .card .add{position:absolute;right:${Wd(16)};bottom:${Wd(15)};width:${Wd(44)};height:${Wd(44)};min-width:34px;min-height:34px;border-radius:50%;background:#1c1a1f;box-shadow:0 0 0 2px #fff;display:grid;place-items:center;transform:translateZ(40px);transition:scale .2s}
.stb .card .add:hover{scale:1.1}
.stb .card .add svg{width:45%;height:45%;stroke:#fff;stroke-width:2;stroke-linecap:round;fill:none}

/* builder */
.stb .range{position:relative;background:var(--dark);color:var(--cream);min-height:var(--H);overflow:hidden;padding:max(${Wd(92)},calc((var(--H) - ${Wd(540)}) / 2)) ${Wd(50)} ${Wd(100)}}
.stb .range h2{margin:0;font-size:${Wd(72.5)};line-height:.93;position:relative;z-index:1}
.stb .range h2 .num{display:inline-grid;place-items:center;width:${Wd(74)};height:${Wd(72)};border-radius:${Wd(14)};background:var(--cream);color:var(--dark);font-size:.86em;vertical-align:baseline}
.stb .glowwrap{position:absolute;width:${Wd(600)};height:${Wd(600)};left:${Wd(740)};top:calc(max(${Wd(92)},calc((var(--H) - ${Wd(540)}) / 2)) - ${Wd(80)})}
.stb .glow{position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle,var(--g) 0,color-mix(in srgb,var(--g) 50%,transparent) 32%,transparent 68%);animation:stbGlow .6s ease-out}
@keyframes stbGlow{from{opacity:.55}to{opacity:1}}
.stb .slot{position:absolute;width:${Wd(170)};height:${Wd(240)};margin:${Wd(-120)} 0 0 ${Wd(-85)};display:grid;place-items:center}
.stb .slot .sb{position:absolute;width:${Wd(92)};height:${Wd(194)};filter:drop-shadow(0 ${Wd(10)} ${Wd(14)} rgba(0,0,0,.4));animation:stbRise .55s var(--ease) both}
@keyframes stbRise{from{transform:translateY(${Wd(-40)}) scale(.8);opacity:0}to{transform:none;opacity:1}}
.stb .slot .x{position:absolute;width:${Wd(48)};height:${Wd(48)};min-width:30px;min-height:30px;border-radius:50%;background:#26272c;box-shadow:0 0 0 2px var(--cream);display:grid;place-items:center;transition:transform .5s var(--ease)}
.stb .slot.full .x{transform:translateY(${Wd(-108)}) scale(.85)}
.stb .slot .x svg{width:42%;height:42%;stroke:var(--cream);stroke-width:2;stroke-linecap:round;fill:none}
.stb .thumbs{display:flex;gap:${Wd(24)};margin-top:${Wd(36)};position:relative;z-index:1}
.stb .thumb{display:grid;justify-items:center;gap:${Wd(8)};width:${Wd(107)}}
.stb .thumb .sq{position:relative;width:${Wd(107)};height:${Wd(107)};border-radius:${Wd(16)};background:var(--c);display:grid;place-items:center;transition:transform .25s}
.stb .thumb:hover .sq{transform:translateY(-4px)}
.stb .thumb .sq .spr{width:${Wd(36)};height:${Wd(76)}}
.stb .thumb .tn{font-weight:800;font-size:${Wd(11)};text-transform:uppercase;letter-spacing:.04em;text-align:center}
.stb .thumb .ring{position:absolute;right:${Wd(6)};top:${Wd(6)};display:grid;place-items:center;width:${Wd(24)};height:${Wd(24)};min-width:18px;min-height:18px;border:1.5px solid var(--cream);border-radius:50%;font:500 ${Wd(11)} "DM Mono",monospace;opacity:0}
.stb .thumb .ring.on{opacity:1;background:var(--cream);color:var(--dark)}
.stb .buy{position:relative;z-index:1;margin-top:${Wd(40)};height:${Wd(54)};min-height:44px;padding:0 ${Wd(28)};border-radius:99px;background:var(--cream);color:var(--dark);font-weight:700;font-size:max(14px,${Wd(16)});display:inline-flex;align-items:center;gap:${Wd(14)};transition:opacity .3s,background .3s}
.stb .buy .pr{font:500 1em "DM Mono",monospace;opacity:.7}
.stb .buy:disabled{opacity:.38;cursor:default}
.stb .buy.done{background:#8fa8a3;opacity:1}

/* fly + misc */
.stb .fly{position:absolute;z-index:70;pointer-events:none;filter:drop-shadow(0 10px 14px rgba(0,0,0,.25))}

/* phone */
.stb.phone .nav{height:64px;padding:0 16px}
.stb.phone .brand{font-size:14px}.stb.phone .brand svg{width:30px;height:30px}
.stb.phone .pill{position:absolute;left:50%;bottom:calc(-1 * (var(--H) - 78px));top:auto;transform:translateX(-50%);background:rgba(255,255,255,.55);padding:4px}
.stb.phone .pill a{padding:0 12px;height:34px;display:grid;place-items:center;font-size:13px}
.stb.phone .pill .hl{top:4px;bottom:4px}
.stb.phone .chip.off{display:none}
.stb.phone .chip{height:34px;font-size:12px}.stb.phone .basket{width:40px}.stb.phone .cta{height:34px;font-size:13px;padding:0 14px}
.stb.phone .title{top:auto;bottom:calc(120px + env(safe-area-inset-bottom,0px));font-size:clamp(40px,12.5vw,64px)}
.stb.phone .count{top:76px;right:14px;font-size:56px}
.stb.phone .auto{top:142px;right:16px}
.stb.phone .play{width:48px;height:48px;margin:-24px 0 0 -24px;top:auto;bottom:calc(120px + env(safe-area-inset-bottom,0px) + 90px)}
.stb.phone .rings{width:1500px;height:1500px;margin:-750px 0 0 -750px;background:repeating-radial-gradient(circle,rgba(255,255,255,.13) 0,rgba(255,255,255,.02) 30px,rgba(255,255,255,.13) 60px)}
.stb.phone .in-head{left:16px;top:84px;font-size:40px}
.stb.phone .in-num{left:90px;top:250px;width:210px;font-size:210px}
.stb.phone .in-bar{left:115px;top:200px;width:160px;height:336px}
.stb.phone .in-icons{left:0;right:0;top:auto;bottom:118px;display:flex;justify-content:center;gap:6px}
.stb.phone .in-icons button{width:52px;height:52px}
.stb.phone .in-cap{left:0;right:0;top:auto;bottom:80px;text-align:center;font-size:11.5px}
.stb.phone .shop{padding:84px 18px 60px}.stb.phone .shop h2{font-size:62px}
.stb.phone .shop .cap{position:static;margin-top:14px;font-size:13.5px}
.stb.phone .cards{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;margin:22px -18px 0;padding:0 18px;perspective:none;scrollbar-width:none}
.stb.phone .card{flex:0 0 min(68vw,300px);height:min(108vw,440px);border-radius:18px;scroll-snap-align:center}
.stb.phone .card .nm{top:24px;font-size:26px}
.stb.phone .card .pk{width:31%;height:60%;top:28%;margin-left:-15.5%}
.stb.phone .card .add{width:44px;height:44px;right:14px;bottom:14px}
.stb.phone .range{padding:84px 18px 60px}.stb.phone .range h2{font-size:44px}
.stb.phone .range h2 .num{width:46px;height:44px;border-radius:9px}
.stb.phone .glowwrap{position:relative;left:auto;top:auto;width:min(100%,360px);height:min(100%,360px);aspect-ratio:1;margin:16px auto 0}
.stb.phone .slot{width:90px;height:130px;margin:-65px 0 0 -45px}
.stb.phone .slot .sb{width:52px;height:110px}
.stb.phone .slot.full .x{transform:translateY(-62px) scale(.85)}
.stb.phone .thumbs{gap:0;justify-content:space-between}
.stb.phone .thumb{width:18.4%}.stb.phone .thumb .sq{width:100%;height:auto;aspect-ratio:1}
.stb.phone .thumb .sq .spr{width:34%;height:72%}.stb.phone .thumb .tn{font-size:9.5px}
.stb.phone .buy{width:100%;justify-content:center;height:54px;font-size:15px}
@media (prefers-reduced-motion:reduce){.stb *{animation:none!important;transition:none!important}}
`;

// ── back-of-wrapper drawing ─────────────────────────────────────────────────
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx, text, maxW) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const w of words) {
    const t = line ? line + " " + w : w;
    if (ctx.measureText(t).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

function frontCanvas(img, f) {
  const [bx, by, bw, bh] = f.box;
  const cw = Math.round((bw + 8) * 1.5 * 0.75);
  const ch = Math.round(cw * BH);
  const c = document.createElement("canvas");
  c.width = cw;
  c.height = ch;
  const sc = img.naturalWidth / SW;
  c.getContext("2d").drawImage(img, (bx - 4) * sc, (by - 4) * sc, (bw + 8) * sc, (bh + 8) * sc, 0, 0, cw, ch);
  return c;
}

function backCanvas(img, f, idx) {
  const [bx, by, bw, bh] = f.box;
  const cw = Math.round((bw + 8) * 1.5 * 0.75);
  const ch = Math.round(cw * BH);
  const c = document.createElement("canvas");
  c.width = cw;
  c.height = ch;
  const x = c.getContext("2d");
  const sc = img.naturalWidth / SW;
  // silhouette + crimp shading from the mirrored art
  x.save();
  x.translate(cw, 0);
  x.scale(-1, 1);
  x.drawImage(img, (bx - 4) * sc, (by - 4) * sc, (bw + 8) * sc, (bh + 8) * sc, 0, 0, cw, ch);
  x.restore();
  x.globalCompositeOperation = "source-atop";
  x.globalAlpha = 0.9;
  x.fillStyle = f.color;
  x.fillRect(0, ch * 0.075, cw, ch * 0.85);
  x.globalAlpha = 0.35;
  x.fillRect(0, 0, cw, ch * 0.075);
  x.fillRect(0, ch * 0.925, cw, ch * 0.075);
  x.globalAlpha = 1;
  const g = x.createLinearGradient(0, 0, cw, 0);
  g.addColorStop(0, "rgba(0,0,0,.10)");
  g.addColorStop(0.28, "rgba(255,255,255,.14)");
  g.addColorStop(0.5, "rgba(255,255,255,0)");
  g.addColorStop(0.8, "rgba(0,0,0,.04)");
  g.addColorStop(1, "rgba(0,0,0,.14)");
  x.fillStyle = g;
  x.fillRect(0, ch * 0.075, cw, ch * 0.85);
  x.globalCompositeOperation = "source-over";

  const ink = mixHex(f.color, "#1c1a1f", 0.78);
  const W = cw, H = ch;
  const AB = `${"Archivo Black"}`;
  x.fillStyle = ink;
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.font = `400 ${0.085 * W}px "${AB}", Impact, sans-serif`;
  x.fillText("STRIDE", W / 2, H * 0.15);
  x.font = `500 ${0.042 * W}px "DM Mono", monospace`;
  x.fillText(`${f.name.toUpperCase()} · 50 G`, W / 2, H * 0.185);

  // nutrition panel
  x.fillStyle = "rgba(255,255,255,.92)";
  rrect(x, W * 0.15, H * 0.215, W * 0.7, H * 0.36, 0.03 * W);
  x.fill();
  x.fillStyle = "#1c1a1f";
  x.textAlign = "left";
  x.font = `400 ${0.058 * W}px "${AB}", Impact, sans-serif`;
  x.fillText("NUTRITION", W * 0.18, H * 0.2425);
  x.font = `400 ${0.032 * W}px "DM Mono", monospace`;
  x.fillText("Serving size 1 bar (50 g)", W * 0.18, H * 0.262);
  x.fillRect(W * 0.18, H * 0.272, W * 0.64, Math.max(2, H * 0.004));
  const rows = [["Calories", "210"], ["Protein", "12 g"], ["Total fat", "9 g"], ["Carbohydrate", "22 g"], ["Fibre", "6 g"], ["Sugars", "8 g"], ["Salt", "0.2 g"]];
  rows.forEach(([a, b], i) => {
    const y = H * (0.3 + 0.034 * i);
    x.font = `${i < 2 ? 500 : 400} ${0.034 * W}px "DM Mono", monospace`;
    x.textAlign = "left";
    x.fillText(a, W * 0.18, y);
    x.textAlign = "right";
    x.fillText(b, W * 0.82, y);
    x.fillStyle = "rgba(28,26,31,.18)";
    x.fillRect(W * 0.18, y + H * 0.013, W * 0.64, 1);
    x.fillStyle = "#1c1a1f";
  });

  // ingredients
  x.fillStyle = ink;
  x.textAlign = "center";
  x.font = `500 ${0.036 * W}px "DM Mono", monospace`;
  x.fillText("INGREDIENTS", W / 2, H * 0.62);
  x.font = `400 ${0.034 * W}px "DM Mono", monospace`;
  wrapText(x, f.ing, W * 0.7).forEach((ln, i) => x.fillText(ln, W / 2, H * (0.645 + 0.022 * i)));

  // barcode
  x.fillStyle = "rgba(255,255,255,.95)";
  rrect(x, W * 0.28, H * 0.735, W * 0.44, H * 0.098, 0.02 * W);
  x.fill();
  let s = 1234 + idx * 77;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  x.fillStyle = "#1c1a1f";
  let bxp = W * 0.3;
  while (bxp < W * 0.7) {
    const bwid = Math.max(1, W * (0.003 + rnd() * 0.007));
    x.fillRect(bxp, H * 0.742, bwid, H * 0.062);
    bxp += bwid + W * (0.004 + rnd() * 0.006);
  }
  x.font = `400 ${0.024 * W}px "DM Mono", monospace`;
  x.fillText("8 06543 00" + (210 + idx) + " 7", W / 2, H * 0.82);
  x.fillStyle = ink;
  x.font = `500 ${0.04 * W}px "DM Mono", monospace`;
  x.fillText("PRESSED, NOT BAKED", W / 2, H * 0.885);
  return c;
}

// ── 3D bar geometry ─────────────────────────────────────────────────────────
function barGeometry(THREE, back) {
  const g = new THREE.PlaneGeometry(1, BH, 30, 64);
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  const CR = 0.062;
  for (let i = 0; i < pos.count; i++) {
    const u = uv.getX(i);
    const v = uv.getY(i);
    const ex = Math.abs(2 * u - 1);
    const ev = Math.min(v, 1 - v);
    let z;
    if (ev < CR) z = 0.006 + 0.006 * Math.abs(Math.sin(u * Math.PI * 34));
    else {
      const across = Math.pow(Math.max(0, 1 - Math.pow(ex, 2.6)), 0.62);
      const along = Math.pow(clamp((ev - CR) / 0.11), 0.7);
      z = 0.012 + 0.118 * across * along + 0.004 * Math.sin(23 * u + 31 * v) * across;
    }
    pos.setZ(i, back ? -z : z);
    if (back) uv.setX(i, 1 - u);
  }
  if (back) {
    const idx = g.index;
    for (let i = 0; i < idx.count; i += 3) {
      const b = idx.getX(i + 1);
      idx.setX(i + 1, idx.getX(i + 2));
      idx.setX(i + 2, b);
    }
  }
  g.computeVertexNormals();
  return g;
}

/** A small stand-in for three's RoomEnvironment: a dim box with a few bright panels. */
function makeEnvironment(THREE, renderer) {
  const scene = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(12, 12, 12), new THREE.MeshBasicMaterial({ color: 0x8a8a92, side: THREE.BackSide }));
  scene.add(room);
  const panel = (w, h, x, y, z, v) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color().setScalar(v), side: THREE.DoubleSide }));
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    scene.add(m);
  };
  panel(5, 5, 0, 5.6, 0, 26);
  panel(3, 6, -5.6, 1, 1, 14);
  panel(3, 6, 5.6, 0, 2, 10);
  panel(6, 3, 0, 1, 5.6, 8);
  panel(4, 2, 0, -5.6, 0, 3);
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(scene, 0.04);
  pm.dispose();
  return rt.texture;
}

// ── tiny icons ──────────────────────────────────────────────────────────────
const ICONS = [
  <path key="0" d="M5 19C5 10 11 5 20 4c0 9-5 15-14 15zM5 19 14 10" />,
  <g key="1"><path d="M12 4c2 3 2 5 0 8M12 4c-2 3-2 5 0 8M12 12c2 3 2 5 0 8M12 12c-2 3-2 5 0 8" /><path d="M6 8c2 1 3 2 3 4M18 8c-2 1-3 2-3 4" /></g>,
  <path key="2" d="M12 20S4 15 4 9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15 12 20 12 20z" />,
  <path key="3" d="M13 3 5 14h6l-1 7 8-11h-6z" />,
];

const MARK = (
  <svg viewBox="0 0 36 36">
    <circle cx="18" cy="18" r="18" fill="currentColor" />
    <path d="M6 26 14 12l5 8 3-4 8 10z" fill="var(--mark,#f0e8e0)" />
  </svg>
);

const POSITIONS = [[50.2, 37], [34.8, 59.3], [64.8, 59.3]];
const SECTIONS = ["flavors", "inside", "shop", "range"];

export default function StrideBarSite({
  brand = "STRIDE",
  startFlavor = 1,
  introEnabled = true,
  introVideo = VIDEO_URL,
  autoplay = true,
  autoplayMs = 3200,
  smoothScroll = true,
  discountLabel = "% OFF",
  ctaLabel = "First dibs",
  packPrice = "$7.48",
  inkColor = "#1c1a1f",
  creamColor = "#f0e8e0",
  darkColor = "#191a1e",
  interactive = true,
  style = {},
}) {
  const rootRef = useRef(null);
  const propsRef = useRef({});
  propsRef.current = { brand, startFlavor, introEnabled, introVideo, autoplay, autoplayMs, smoothScroll, interactive };

  const [selected, setSelected] = useState(clamp(Math.round(num(startFlavor, 1)), 0, 4));
  const [slots, setSlots] = useState([null, null, null]);
  const [cart, setCart] = useState(0);
  const [buy, setBuy] = useState("idle");
  const [glow, setGlow] = useState("rgba(148,189,180,.72)");
  const [glowKey, setGlowKey] = useState(0);
  const [autoOn, setAutoOn] = useState(!!autoplay);
  const touched = useRef(false);
  const selRef = useRef(selected);
  selRef.current = selected;
  const slotsRef = useRef(slots);
  slotsRef.current = slots;
  const autoRef = useRef(autoOn);
  autoRef.current = autoOn;
  const eng = useRef({});
  const [showIntro] = useState(() => introEnabled && interactive && !(typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches));

  // ── fly-to-cart (DOM only) ────────────────────────────────────────────────
  const fly = useCallback((srcEl, delay, onLand) => {
    const root = rootRef.current;
    const basket = root && root.querySelector('[data-k="basket"]');
    if (!root || !basket || !srcEl) return onLand && onLand();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return onLand && onLand();
    const rr = root.getBoundingClientRect();
    const s = srcEl.getBoundingClientRect();
    const b = basket.getBoundingClientRect();
    const cs = getComputedStyle(srcEl);
    const el = document.createElement("div");
    el.className = "fly";
    el.style.cssText += `left:${s.left - rr.left}px;top:${s.top - rr.top}px;width:${s.width}px;height:${s.height}px;background-image:${cs.backgroundImage};background-size:${cs.backgroundSize};background-position:${cs.backgroundPosition};background-repeat:no-repeat;`;
    root.appendChild(el);
    const dx = b.left + b.width / 2 - (s.left + s.width / 2);
    const dy = b.top + b.height / 2 - (s.top + s.height / 2);
    const k = Math.min(0.2, 30 / Math.max(1, s.height));
    const lift = Math.min(160, 0.35 * Math.abs(dy) + 60);
    const anim = el.animate(
      [
        { transform: "translate(0,0) scale(1) rotate(0deg)", opacity: 1 },
        { transform: `translate(${dx * 0.4}px,${dy * 0.4 - lift}px) scale(${0.45 + k}) rotate(-10deg)`, opacity: 1, offset: 0.45 },
        { transform: `translate(${dx}px,${dy}px) scale(${k}) rotate(-18deg)`, opacity: 0.15 },
      ],
      { duration: 900, delay, easing: "cubic-bezier(.5,0,.2,1)", fill: "both" }
    );
    anim.onfinish = () => {
      el.remove();
      basket.animate([{ transform: "scale(1)" }, { transform: "scale(1.18)" }, { transform: "scale(1)" }], { duration: 320 });
      onLand && onLand();
    };
  }, []);

  const addBag = (i, e) => {
    e.stopPropagation();
    const card = e.currentTarget.closest(".card");
    fly(card.querySelector(".pk"), 0, () => setCart((c) => c + 1));
  };

  const addSlot = (i) => {
    touched.current = true;
    setSlots((s) => {
      const k = s.indexOf(null);
      if (k < 0) return s;
      const n = s.slice();
      n[k] = i;
      return n;
    });
    setGlow(mixRgba(FLAVORS[i].color, 0.72));
    setGlowKey((g) => g + 1);
  };
  const removeSlot = (k) => {
    touched.current = true;
    setSlots((s) => s.map((v, i) => (i === k ? null : v)));
  };
  const full = slots.every((v) => v !== null);
  const emptyN = slots.filter((v) => v === null).length;
  const buyNow = () => {
    if (!full || buy !== "idle") return;
    const els = Array.from(rootRef.current.querySelectorAll('[data-k="slotbar"]'));
    els.forEach((el, i) => fly(el, i * 120, i === els.length - 1 ? () => setCart((c) => c + 1) : undefined));
    setTimeout(() => {
      setSlots([null, null, null]);
      setBuy("done");
      setTimeout(() => setBuy("idle"), 1600);
    }, 60);
  };

  // ── the engine ────────────────────────────────────────────────────────────
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const P = () => propsRef.current;
    const q = (k) => root.querySelector(`[data-k="${k}"]`);
    const qa = (k) => Array.from(root.querySelectorAll(`[data-k="${k}"]`));
    const scroller = q("scroller");
    const canvas = q("gl");
    const hero = q("hero");
    const inside = q("inside");
    const shop = q("shop");
    const range = q("range");
    const inFront = q("inFront");
    const titleEl = q("title");
    const countEl = q("count");
    const reveal = q("reveal");
    const arc = q("arc");
    const inBar = q("inBar");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let dead = false;
    const timers = [];
    const later = (fn, ms) => {
      const t = setTimeout(fn, ms);
      timers.push(t);
      return t;
    };
    const cleanups = [];
    const on = (el, ev, fn, opt) => {
      el.addEventListener(ev, fn, opt);
      cleanups.push(() => el.removeEventListener(ev, fn, opt));
    };

    // fonts
    if (!document.querySelector('link[data-stb-fonts]')) {
      const l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = FONTS_URL;
      l.setAttribute("data-stb-fonts", "");
      document.head.appendChild(l);
    }

    // ── geometry of the box ────────────────────────────────────────────────
    let W = 0, H = 0, phone = false, u = 1, kk = 1, rr = { left: 0, top: 0 };
    const measure = () => {
      const r = root.getBoundingClientRect();
      W = r.width;
      H = r.height;
      rr = r;
      phone = W < 820;
      root.classList.toggle("phone", phone);
      u = phone ? Math.min(W / 560, H / 980) : Math.min(W / 1440, H / 900);
      kk = phone ? Math.min(W / 390, H / 780) : Math.min(W / 1440, H / 900);
      const st = root.style;
      st.setProperty("--u", u + "px");
      st.setProperty("--w", W / 1440 + "px");
      st.setProperty("--n", Math.min(W / 1440, 1) + "px");
      st.setProperty("--H", H + "px");
      st.setProperty("--k", String(kk));
      if (glReady) resizeGL();
      fitTitle();
    };

    // ── state ──────────────────────────────────────────────────────────────
    let entered = false;
    let pos = -2.6;
    let target = clamp(Math.round(num(P().startFlavor, 1)), 0, 4);
    let tween = null; // { from, to, t0, dur }
    let flavor = mod(target, 5);
    let lastInteract = performance.now();
    let pending = null;
    let revealT = null;
    let curTitle = null;
    const cardTilt = [0, 1, 2, 3, 4].map(() => ({ x: 0, y: 0 }));
    let pokeT0 = -1e9;
    let step = -1;
    let flipAng = 0;
    let flipTween = null;
    let stepFlavorShown = -1;
    root.style.setProperty("--flav", FLAVORS[flavor].color);
    root.style.setProperty("--sheet", `url("${SHEET_URL}")`);

    const heroCenter = () => ({ cx: W / 2, cy: phone ? H * 0.4 : H / 2 - 78 * u, spread: phone ? 1.02 : 1 });

    // ── title / counter ────────────────────────────────────────────────────
    let tctx = null;
    const nameWidth = (s) => {
      if (!tctx) tctx = document.createElement("canvas").getContext("2d");
      tctx.font = '400 100px "Archivo Black", Impact, sans-serif';
      return tctx.measureText(s.toUpperCase()).width;
    };
    const titleSize = (name) => {
      if (phone) {
        const wmax = Math.max(...name.split(" ").map(nameWidth));
        return Math.min(clamp(W * 0.125, 40, 64), ((W - 36) * 100) / Math.max(1, wmax));
      }
      return Math.min(96 * u, (760 * u * 100) / Math.max(1, nameWidth(name)));
    };
    function fitTitle() {
      if (curTitle) titleEl.style.fontSize = titleSize(FLAVORS[flavor].name) + "px";
    }
    const buildTitle = (name) => {
      const d = document.createElement("span");
      d.className = "tl";
      const words = name.split(" ");
      words.forEach((w, wi) => {
        const wd = document.createElement("span");
        wd.className = "wd";
        Array.from(w).forEach((c) => {
          const s = document.createElement("span");
          s.className = "ch";
          s.textContent = c;
          wd.appendChild(s);
        });
        d.appendChild(wd);
        if (wi < words.length - 1) d.appendChild(document.createTextNode(" "));
      });
      return d;
    };
    const swapTitle = (name, dir, animate) => {
      titleEl.style.fontSize = titleSize(name) + "px";
      const nd = buildTitle(name);
      titleEl.setAttribute("aria-label", name);
      const old = curTitle;
      curTitle = nd;
      titleEl.appendChild(nd);
      if (!animate || reduced) {
        if (old) old.remove();
        return;
      }
      const sgn = dir >= 0 ? 1 : -1;
      if (old) {
        old.style.cssText += "position:absolute;left:0;right:0;top:0";
        const chs = old.querySelectorAll(".ch");
        chs.forEach((c, i) =>
          c.animate([{ transform: "translateY(0)", opacity: 1 }, { transform: `translateY(${-110 * sgn}%)`, opacity: 0 }], { duration: 300, delay: i * 11, easing: "cubic-bezier(.45,0,.75,.3)", fill: "forwards" })
        );
        later(() => old.remove(), 300 + chs.length * 11 + 60);
      }
      nd.querySelectorAll(".ch").forEach((c, i) =>
        c.animate([{ transform: `translateY(${110 * sgn}%)`, opacity: 0 }, { transform: "translateY(0)", opacity: 1 }], { duration: 620, delay: 120 + i * 22, easing: "cubic-bezier(.22,1,.36,1)", fill: "both" })
      );
    };
    const fade = (el, setter, instant) => {
      if (instant || reduced) return setter();
      // the out-animation holds the hidden state until the text swaps; the in-animation then
      // only paints its own start, so the element's normal (inline) opacity takes over afterwards
      const outA = el.animate([{ translate: "0 0", opacity: 1 }, { translate: "0 -10px", opacity: 0 }], { duration: 240, easing: "cubic-bezier(.5,0,.75,0)", fill: "forwards" });
      later(() => {
        outA.cancel();
        setter();
        el.animate([{ translate: "0 14px", opacity: 0 }, { translate: "0 0", opacity: 1 }], { duration: 460, easing: "cubic-bezier(.22,1,.36,1)", fill: "backwards" });
      }, 280);
    };
    const setCount = (n, animate) => {
      if (!animate || reduced) {
        countEl.textContent = "0" + (n + 1);
        return;
      }
      countEl.animate([{ translate: "0 0", opacity: 1 }, { translate: "0 -10px", opacity: 0 }], { duration: 220, easing: "cubic-bezier(.5,0,.75,0)", fill: "forwards" });
      later(() => {
        countEl.textContent = "0" + (n + 1);
        countEl.animate([{ translate: "0 14px", opacity: 0 }, { translate: "0 0", opacity: 1 }], { duration: 380, easing: "cubic-bezier(.22,1,.36,1)", fill: "forwards" });
      }, 280);
    };

    // ── flavour change ─────────────────────────────────────────────────────
    const finishReveal = () => {
      if (!revealT) return;
      root.style.setProperty("--flav", revealT.color);
      reveal.style.visibility = "hidden";
      reveal.style.webkitMaskImage = reveal.style.maskImage = "";
      revealT = null;
    };
    const changeFlavor = (fl, dir) => {
      if (fl === flavor && curTitle) return;
      flavor = fl;
      finishReveal();
      const f = FLAVORS[fl];
      if (reduced) {
        root.style.setProperty("--flav", f.color);
      } else {
        const { cx, cy } = heroCenter();
        const far = Math.max(Math.hypot(cx, cy), Math.hypot(W - cx, cy), Math.hypot(cx, H - cy), Math.hypot(W - cx, H - cy));
        root.style.setProperty("--rv", f.color);
        reveal.style.background = f.color;
        reveal.style.visibility = "visible";
        revealT = { t0: performance.now(), dur: 420, color: f.color, cx, cy, R: 1.45 * far };
      }
      swapTitle(f.name, dir, true);
      setCount(fl, true);
      setSelected(fl);
      selRef.current = fl;
      if (step === 3) refreshStep4();
    };

    // ── hero tween ─────────────────────────────────────────────────────────
    const goTo = (to, dur) => {
      if (!entered) return;
      lastInteract = performance.now();
      if (reduced) {
        pos = target = to;
        tween = null;
        const fl = mod(to, 5);
        if (fl !== flavor) changeFlavor(fl, 1);
        return;
      }
      const d = dur != null ? dur : 650 + 160 * Math.max(0, Math.abs(to - pos) - 1);
      tween = { from: pos, to, t0: performance.now(), dur: d };
      const dir = to >= target ? 1 : -1;
      target = to;
      const fl = mod(to, 5);
      if (fl !== flavor) {
        pending = { at: performance.now() + d * 0.12, fl, dir };
      }
    };
    eng.current.goTo = goTo;

    // ── GL ─────────────────────────────────────────────────────────────────
    let THREE = null, renderer = null, scene = null, camera = null, bars = [], trav = null, geoF = null, geoB = null;
    let glReady = false, fronts = [], backs = [], shadowTex = null, raycaster = null, D = 1500;
    let frontTex = [], backTex = [];
    let envTex = null;

    const makeBar = () => {
      const matOpts = { transparent: true, alphaTest: 0.5, roughness: 0.45, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.32, envMapIntensity: 0.42 };
      const mf = new THREE.MeshPhysicalMaterial(matOpts);
      const mb = new THREE.MeshPhysicalMaterial(matOpts);
      const group = new THREE.Group();
      const f = new THREE.Mesh(geoF, mf);
      const b = new THREE.Mesh(geoB, mb);
      group.add(f, b);
      const sm = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false });
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 1.04 * BH), sm);
      sh.renderOrder = -1;
      scene.add(group, sh);
      return { group, mf, mb, sh, sm, f, b, flavor: -1, k: 0 };
    };
    const setBarFlavor = (bar, fl) => {
      if (bar.flavor === fl) return;
      bar.flavor = fl;
      bar.mf.map = frontTex[fl];
      bar.mb.map = backTex[fl] || frontTex[fl];
      bar.mf.needsUpdate = bar.mb.needsUpdate = true;
    };
    const place = (bar, st) => {
      const vis = st.op > 0.01;
      bar.group.visible = vis;
      bar.sh.visible = vis;
      if (!vis) return;
      bar.mf.opacity = bar.mb.opacity = st.op;
      const s = st.h / BH;
      bar.group.position.set(st.x - W / 2, H / 2 - st.y, st.z || 0);
      bar.group.scale.set(s * (st.sx || 1), s * (st.sy || 1), s);
      bar.group.rotation.set((st.rx || 0) * Math.PI / 180, (st.ry || 0) * Math.PI / 180, -(st.rz || 0) * Math.PI / 180, "ZYX");
      const sc = st.h;
      bar.sh.position.set(st.x - W / 2, H / 2 - st.y - 0.05 * sc, (st.z || 0) - 0.32 * sc);
      bar.sh.rotation.set(0, 0, -(st.rz || 0) * Math.PI / 180);
      bar.sh.scale.set(sc * Math.max(0.3, Math.abs(Math.cos(((st.ry || 0) * Math.PI) / 180))), sc, 1);
      bar.sm.opacity = 0.5 * st.op * (st.shadow == null ? 1 : st.shadow);
    };
    const resizeGL = () => {
      D = clamp(1500 * Math.min(W / 1440, H / 900), 1000, 2200);
      camera.position.set(0, 0, D);
      camera.fov = (2 * Math.atan(H / 2 / D) * 180) / Math.PI;
      camera.near = 10;
      camera.far = 4 * D;
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, phone ? 1.75 : 2));
      renderer.setSize(W, H, false);
    };

    const initGL = async () => {
      try {
        const [mod3, img] = await Promise.all([
          import(/* @vite-ignore */ THREE_URL),
          new Promise((res, rej) => {
            const im = new Image();
            im.crossOrigin = "anonymous";
            im.onload = () => res(im);
            im.onerror = rej;
            im.src = SHEET_URL;
          }),
        ]);
        if (dead) return;
        THREE = mod3;
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.NoToneMapping;
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(30, 1, 10, 6000);
        envTex = makeEnvironment(THREE, renderer);
        scene.environment = envTex;
        scene.add(new THREE.AmbientLight(0xffffff, 0.55));
        const key = new THREE.DirectionalLight(0xffffff, 1.1);
        key.position.set(-0.6, 0.9, 1.4);
        scene.add(key);
        geoF = barGeometry(THREE, false);
        geoB = barGeometry(THREE, true);
        const sc = document.createElement("canvas");
        sc.width = sc.height = 128;
        const sx = sc.getContext("2d");
        const rg = sx.createRadialGradient(64, 64, 0, 64, 64, 64);
        rg.addColorStop(0, "rgba(30,18,40,.55)");
        rg.addColorStop(1, "rgba(30,18,40,0)");
        sx.fillStyle = rg;
        sx.fillRect(0, 0, 128, 128);
        shadowTex = new THREE.CanvasTexture(sc);
        const tex = (c) => {
          const t = new THREE.CanvasTexture(c);
          t.colorSpace = THREE.SRGBColorSpace;
          t.anisotropy = 8;
          return t;
        };
        frontTex = FLAVORS.map((f) => tex(frontCanvas(img, f)));
        backTex = frontTex.slice();
        const drawBacks = () => {
          backTex = FLAVORS.map((f, i) => tex(backCanvas(img, f, i)));
          [...bars, trav].forEach((b) => b && (b.flavor = -1));
        };
        // the back panels use the web fonts; draw once they have loaded
        Promise.all([
          document.fonts.load('400 40px "Archivo Black"'),
          document.fonts.load('400 40px "DM Mono"'),
          document.fonts.load('500 40px "DM Mono"'),
          document.fonts.load('700 40px "Inter"'),
        ]).catch(() => {}).then(() => {
          if (dead || !THREE) return;
          drawBacks();
          fitTitle();
        });
        for (let i = 0; i < 11; i++) bars.push(makeBar());
        trav = makeBar();
        raycaster = new THREE.Raycaster();
        glReady = true;
        resizeGL();
      } catch (e) {
        console.warn("StrideBarSite: 3D could not start (three.js or the sprite sheet failed to load).", e);
      }
    };

    // ── arc layout ─────────────────────────────────────────────────────────
    const arcState = (k, now, j) => {
      const { cx, cy, spread } = heroCenter();
      const a = Math.min(4, Math.abs(k));
      const i = Math.min(3, Math.floor(a));
      const f = a - i;
      const s0 = SLOTS[i], s1 = SLOTS[i + 1];
      const sg = k < 0 ? -1 : 1;
      const dx = lerp(s0[0], s1[0], f), dy = lerp(s0[1], s1[1], f), h = lerp(s0[2], s1[2], f);
      const rz = lerp(s0[3], s1[3], f), ry = lerp(s0[4], s1[4], f);
      let y = cy + dy * u;
      let rzv = sg * rz;
      if (!reduced) {
        const b = Math.sin((now / 4600) * Math.PI * 2 + 1.37 * j);
        y -= (0.5 * b + 0.5) * 9 * u;
        rzv += 0.4 * b;
      }
      return {
        x: cx + sg * dx * u * spread,
        y,
        h: h * u,
        rz: rzv,
        ry: sg * ry,
        rx: 0,
        z: -a * 34 * u,
        op: a <= 3.3 ? 1 : clamp(1 - (a - 3.3) / 0.6),
        sx: 1,
        sy: 1,
        shadow: 1,
      };
    };
    const rectOf = (el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left - rr.left + r.width / 2, y: r.top - rr.top + r.height / 2, h: r.height, w: r.width };
    };
    const mixState = (a, b, t) => {
      const o = {};
      for (const k of ["x", "y", "h", "rz", "ry", "rx", "z", "op", "shadow", "sx", "sy"]) o[k] = lerp(a[k] == null ? (k === "sx" || k === "sy" || k === "shadow" ? 1 : 0) : a[k], b[k] == null ? (k === "sx" || k === "sy" || k === "shadow" ? 1 : 0) : b[k], t);
      return o;
    };

    // ── section 2 ──────────────────────────────────────────────────────────
    const head = q("head"), cap = q("cap"), numEl = q("num"), dark = q("dark");
    const iconBtns = qa("icon");
    const pieces = qa("piece");
    const storm = pieces.map((el, i) => {
      let s = 9301 + i * 131;
      const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
      const fav = rnd() < 0.7;
      return { el, a: rnd() * Math.PI * 2, ph: i / 20 + rnd() * 0.03, spin: (rnd() * 2 - 1) * 360, size: 0.7 + rnd() * 0.7, fav, bit: Math.floor(rnd() * 5), bitSet: -1 };
    });
    const stepHead = (s) => {
      if (s < 3) return STEPS[s].head.join("<br>");
      const words = FLAVORS[selRef.current].name.toUpperCase().split(" ");
      return words.map((w) => (w.length > 9 ? `<span style="font-size:.72em">${w}</span>` : w)).join("<br>");
    };
    const refreshStep4 = () => fade(head, () => (head.innerHTML = stepHead(3)));
    const setStepText = (s, instant) => {
      fade(head, () => (head.innerHTML = stepHead(s)), instant);
      fade(numEl, () => (numEl.textContent = "0" + (s + 1)), instant);
      fade(cap, () => (cap.innerHTML = STEPS[s].cap.join("<br>")), instant);
      iconBtns.forEach((b, i) => b.classList.toggle("on", i === s));
    };
    iconBtns.forEach((b, i) => {
      b.onclick = () => {
        const sc = scroller.scrollTop;
        const top = inside.getBoundingClientRect().top - scroller.getBoundingClientRect().top + sc;
        const span = inside.offsetHeight - H;
        scroller.scrollTo({ top: top + span * ((i + 0.5) * 0.19), behavior: reduced ? "auto" : "smooth" });
      };
    });

    // ── nav ────────────────────────────────────────────────────────────────
    const links = qa("link");
    const hl = q("hl");
    let navActive = -1;
    const secEls = [hero, inside, shop, range];
    const updateNav = () => {
      let a = 0;
      secEls.forEach((el, i) => {
        if (el.getBoundingClientRect().top - rr.top <= H * 0.35) a = i;
      });
      if (a !== navActive) {
        navActive = a;
        links.forEach((l, i) => l.classList.toggle("on", i === a));
        const l = links[a];
        if (l && hl) {
          hl.style.left = l.offsetLeft + "px";
          hl.style.width = l.offsetWidth + "px";
        }
        root.classList.toggle("nav-light", a === 2);
        root.classList.toggle("nav-dark", a === 3);
      }
    };
    links.forEach((l, i) => {
      l.onclick = (e) => {
        e.preventDefault();
        const top = secEls[i].getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
        scroller.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
      };
    });

    // ── input: drag, tap, keys, wheel ──────────────────────────────────────
    let dr = null;
    let vel = 0;
    const slotPx = () => 245 * u * heroCenter().spread;
    on(arc, "pointerdown", (e) => {
      if (!P().interactive || e.button > 0 || !entered) return;
      dr = { x0: e.clientX, pos0: pos, moved: false, t: performance.now(), lx: e.clientX, id: e.pointerId };
      vel = 0;
      lastInteract = performance.now();
    });
    on(arc, "pointermove", (e) => {
      if (dr) {
        const dx = e.clientX - dr.x0;
        if (!dr.moved && Math.abs(dx) > 6) {
          dr.moved = true;
          tween = null;
          try { arc.setPointerCapture(dr.id); } catch (er) { /* best effort */ }
          root.classList.add("dragging");
        }
        if (dr.moved) {
          const now = performance.now();
          const np = dr.pos0 - dx / slotPx();
          const v = (np - pos) / Math.max(1, now - dr.t);
          vel = vel * 0.6 + v * 0.4;
          dr.t = now;
          pos = np;
          lastInteract = now;
          const fl = mod(Math.round(pos), 5);
          if (false && fl) void fl;
        }
      } else if (glReady && e.pointerType === "mouse") {
        const hit = pick(e.clientX, e.clientY);
        arc.style.cursor = hit ? "pointer" : "";
      }
    });
    const endDrag = (e, cancel) => {
      if (!dr) return;
      const d = dr;
      dr = null;
      root.classList.remove("dragging");
      if (d.moved) {
        let to = Math.round(pos + (cancel ? 0 : clamp(vel * 220, -2, 2)));
        if (cancel && Math.abs(pos - Math.round(pos)) < 0.02) to = Math.round(pos);
        const dur = Math.max(380, 650 * Math.min(1, Math.abs(to - pos) + 0.35));
        goTo(to, dur);
      } else if (!cancel && glReady) {
        const hit = pick(e.clientX, e.clientY);
        if (hit != null) goTo(target + Math.round(hit));
      }
    };
    on(arc, "pointerup", (e) => endDrag(e, false));
    on(arc, "pointercancel", (e) => endDrag(e, true));
    const pick = (cx, cy) => {
      if (!raycaster) return null;
      const x = ((cx - rr.left) / W) * 2 - 1;
      const y = -(((cy - rr.top) / H) * 2 - 1);
      raycaster.setFromCamera({ x, y }, camera);
      const list = bars.filter((b) => b.group.visible && b.k != null);
      const objs = list.flatMap((b) => [b.f, b.b]);
      const hit = raycaster.intersectObjects(objs, false)[0];
      if (!hit) return null;
      const bar = list.find((b) => b.f === hit.object || b.b === hit.object);
      return bar ? bar.k : null;
    };
    on(window, "keydown", (e) => {
      if (!P().interactive || !entered) return;
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const vis = heroVisible();
      if (vis < 0.5) return;
      stopSmooth();
      goTo(target + (e.key === "ArrowRight" ? 1 : -1));
    });
    on(q("play"), "click", () => goTo(target + 1));
    const heroVisible = () => {
      const r = hero.getBoundingClientRect();
      const vt = Math.max(r.top, rr.top), vb = Math.min(r.bottom, rr.top + H);
      return clamp((vb - vt) / Math.max(1, r.height));
    };

    // smooth wheel scrolling (desktop mouse / trackpad)
    let sTarget = null;
    let sExpect = null;
    let sRaf = 0;
    const stopSmooth = () => { sTarget = null; };
    const canSmooth = () => P().smoothScroll && P().interactive && !reduced && !root.classList.contains("locked") && !window.matchMedia("(pointer: coarse)").matches;
    on(scroller, "wheel", (e) => {
      if (!canSmooth() || e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      const max = scroller.scrollHeight - scroller.clientHeight;
      const unit = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? scroller.clientHeight : 1;
      sTarget = clamp((sTarget == null ? scroller.scrollTop : sTarget) + e.deltaY * unit, 0, max);
    }, { passive: false });
    on(scroller, "keydown", stopSmooth);
    on(scroller, "pointerdown", stopSmooth);

    // ── shop interactions ──────────────────────────────────────────────────
    const cards = qa("card");
    cards.forEach((card, i) => {
      const fine = window.matchMedia("(pointer: fine)").matches;
      card.onpointermove = (e) => {
        if (!fine || !P().interactive) return;
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        cardTilt[i].x = x;
        cardTilt[i].y = y;
        card.classList.add("tilt");
        card.style.transform = `translateY(-8px) rotateX(${-y * 12}deg) rotateY(${x * 12}deg)`;
      };
      card.onpointerleave = () => {
        cardTilt[i].x = cardTilt[i].y = 0;
        card.classList.remove("tilt", "press");
        card.style.transform = "";
      };
      card.onpointerdown = () => card.classList.add("press");
      card.onpointerup = () => card.classList.remove("press");
      card.onclick = (e) => {
        if (e.target.closest(".add")) return;
        if (card.classList.contains("live")) pokeT0 = performance.now();
        else card.querySelector(".pk").animate([{ transform: "translateZ(30px) scale(1,1)" }, { transform: "translateZ(30px) scale(1.06,.93)", offset: 0.3 }, { transform: "translateZ(30px) scale(.97,1.04)", offset: 0.6 }, { transform: "translateZ(30px) scale(1,1)" }], { duration: 500 });
      };
    });

    // reveal-on-view
    const io = new IntersectionObserver((es) => es.forEach((en) => en.isIntersecting && en.target.classList.add("in")), { root: scroller, threshold: 0.18 });
    qa("rv").forEach((el) => io.observe(el));
    const rio = new IntersectionObserver((es) => {
      es.forEach((en) => {
        if (en.isIntersecting && !touched.current && !eng.current.filled) {
          eng.current.filled = true;
          const s = selRef.current;
          [0, 1, 2].forEach((n, i) => later(() => !touched.current && setSlots((cur) => cur.map((v, k) => (k === i ? mod(s + i, 5) : v))), 250 + 160 * i));
          setGlow(mixRgba(FLAVORS[s].color, 0.72));
          setGlowKey((g) => g + 1);
        }
      });
    }, { root: scroller, threshold: 0.3 });
    rio.observe(range);

    // ── frame loop ─────────────────────────────────────────────────────────
    let raf = 0;
    let lastT = performance.now();
    let travPhoneScrolled = false;
    const ANG = STEPS.map((s) => s.ang);
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(100, now - lastT);
      lastT = now;
      const r0 = root.getBoundingClientRect();
      if (Math.abs(r0.width - W) > 0.5 || Math.abs(r0.height - H) > 0.5) measure();
      rr = r0;

      // smooth wheel
      if (sTarget != null) {
        const cur = scroller.scrollTop;
        // someone else moved the scroll (a link, a step icon, the keyboard): let go
        if (sExpect != null && Math.abs(cur - sExpect) > 3) sTarget = null;
      }
      if (sTarget != null) {
        const cur = scroller.scrollTop;
        const nx = cur + (sTarget - cur) * (1 - Math.exp(-dt / 120));
        scroller.scrollTop = nx;
        sExpect = scroller.scrollTop;
        if (Math.abs(sTarget - nx) < 0.5) sTarget = null;
      } else sExpect = null;

      // hero position tween
      if (tween) {
        const t = clamp((now - tween.t0) / tween.dur);
        pos = lerp(tween.from, tween.to, tween.ease ? tween.ease(t) : GLIDE(t));
        if (t >= 1) { pos = tween.to; tween = null; }
      }
      if (pending && now >= pending.at) {
        const p = pending;
        pending = null;
        changeFlavor(p.fl, p.dir);
      }
      if (dr && dr.moved) {
        const fl = mod(Math.round(pos), 5);
        if (fl !== flavor) { target = Math.round(pos); changeFlavor(fl, 1); }
      }
      if (revealT) {
        const t = clamp((now - revealT.t0) / revealT.dur);
        const rad = revealT.R * GLIDE(t);
        const f = Math.max(60, 0.35 * rad);
        const m = `radial-gradient(circle at ${revealT.cx}px ${revealT.cy}px, #000 ${Math.max(0, rad - f)}px, transparent ${rad}px)`;
        reveal.style.webkitMaskImage = reveal.style.maskImage = m;
        if (t >= 1) finishReveal();
      }

      // autoplay
      if (entered && autoRef.current && P().interactive && !dr && !tween && document.visibilityState === "visible" && heroVisible() >= 0.6 && now - lastInteract >= num(P().autoplayMs, 3200)) {
        lastInteract = now;
        goTo(target + 1);
      }

      // section progress
      const secTop = inside.getBoundingClientRect().top - rr.top;
      const secH = inside.offsetHeight;
      const secBottom = secTop + secH;
      const shopTop = shop.getBoundingClientRect().top - rr.top;
      const heroTop = hero.getBoundingClientRect().top - rr.top;
      const p = clamp(-secTop / Math.max(1, secH - H));
      const sIdx = Math.floor(Math.min(p, 0.759) / 0.19);
      const qs = clamp((p - 0.76) / 0.24);
      const p1 = clamp(1 - secTop / H);
      const p3 = clamp((H - shopTop) / (0.7 * H));

      // front layer (sticky look)
      const visible = secTop < H && secBottom > 0;
      inFront.style.visibility = visible ? "visible" : "hidden";
      if (visible) {
        const pinY = secTop > 0 ? secTop : secBottom < H ? secBottom - H : 0;
        inFront.style.transform = `translateY(${pinY}px)`;
        const fo = 1 - clamp(4 * qs);
        inFront.firstElementChild.style.opacity = fo;
        numEl.style.opacity = fo;
        dark.style.opacity = clamp(3.5 * qs) * 0.42;
      }

      // steps + flip
      if (sIdx !== step) {
        const first = step < 0;
        const prev = step;
        step = sIdx;
        setStepText(sIdx, first || reduced);
        const to = ANG[sIdx];
        if (first || reduced) { flipAng = to; flipTween = null; }
        else {
          const half = clamp(Math.abs(to - flipAng) / 180, 0.4, 2);
          flipTween = { from: flipAng, to, t0: now, dur: 720 * half };
        }
        void prev;
      }
      if (flipTween) {
        const t = clamp((now - flipTween.t0) / flipTween.dur);
        flipAng = lerp(flipTween.from, flipTween.to, sineIO(t));
        if (t >= 1) { flipAng = flipTween.to; flipTween = null; }
      }
      if (step === 3 && stepFlavorShown !== selRef.current) stepFlavorShown = selRef.current;

      // storm
      const R = 0.55 * Math.hypot(W, H);
      const base = 0.085 * Math.min(W, H);
      storm.forEach((pc) => {
        const s = clamp((qs - 0.45 * pc.ph) / 0.55);
        if (reduced || qs <= 0 || qs >= 1 || s <= 0 || s >= 1) { pc.el.style.opacity = 0; return; }
        const bit = pc.fav ? FLAVORS[selRef.current].bit : pc.bit;
        if (pc.bitSet !== bit) {
          pc.bitSet = bit;
          const st = spr(BITS[bit]);
          Object.assign(pc.el.style, st);
          const sz = base * pc.size;
          pc.el.style.width = sz + "px";
          pc.el.style.height = (sz * BITS[bit][3]) / BITS[bit][2] + "px";
        }
        const radius = (0.06 + Math.pow(s, 1.5) * 0.95) * R;
        const x = W / 2 + Math.cos(pc.a) * radius;
        const y = H / 2 + Math.sin(pc.a) * radius * 0.8;
        const sc = 0.2 + 1.7 * s;
        const w0 = parseFloat(pc.el.style.width), h0 = parseFloat(pc.el.style.height);
        pc.el.style.transform = `translate(${x - w0 / 2}px,${y - h0 / 2}px) rotate(${pc.spin * s}deg) scale(${sc})`;
        pc.el.style.opacity = Math.sin(Math.PI * s) * clamp(5 * qs) * clamp(6 * (1 - qs));
      });

      // 3D bars
      if (glReady) {
        const jT = Math.round(target);
        const flT = mod(jT, 5);
        const j0 = Math.floor(pos);
        const fade = 1 - clamp(1.6 * p1);
        for (let j = j0 - 5; j <= j0 + 5; j++) {
          const bar = bars[mod(j, 11)];
          if (j === jT) { bar.group.visible = false; bar.sh.visible = false; bar.k = null; continue; }
          const st = arcState(j - pos, now, j);
          st.y += heroTop;
          st.op *= fade;
          setBarFlavor(bar, mod(j, 5));
          bar.k = j - target;
          place(bar, st);
        }
        // the traveller
        const A = arcState(jT - pos, now, jT);
        A.y += heroTop;
        let S = A;
        if (p1 > 0) {
          const rb = rectOf(inBar);
          const spin = 720 * qs;
          const bob = reduced ? 0 : Math.sin((now / 2600) * Math.PI * 2) * 6;
          const B = { x: rb.x, y: rb.y + bob, h: rb.h, rz: 14, ry: flipAng + spin, rx: 0, z: 0, op: 1, shadow: 1, sx: 1, sy: 1 };
          S = mixState(A, B, easeIO(p1));
          if (p3 > 0) {
            const pk = root.querySelector(`.card[data-i="${flT}"] .pk`);
            if (pk) {
              const rc = rectOf(pk);
              const tl = cardTilt[flT];
              const C = { x: rc.x, y: rc.y, h: rc.h, rz: 0, ry: Math.round((flipAng + spin) / 360) * 360 + tl.x * 14, rx: -tl.y * 14, z: 30, op: 1, shadow: 0.7, sx: 1, sy: 1 };
              S = mixState(B, C, easeIO(p3));
              if (phone && !travPhoneScrolled) {
                travPhoneScrolled = true;
                const strip = shop.querySelector(".cards");
                const cd = strip && strip.children[flT];
                if (cd) strip.scrollTo({ left: cd.offsetLeft - (strip.clientWidth - cd.clientWidth) / 2, behavior: "smooth" });
              }
            }
          } else travPhoneScrolled = false;
        }
        // click squash on the live card
        const pk = (now - pokeT0) / 500;
        if (pk >= 0 && pk < 1) {
          const kfs = [[0, 1, 1], [0.3, 1.06, 0.93], [0.6, 0.97, 1.04], [1, 1, 1]];
          let i = 0;
          while (i < 2 && pk > kfs[i + 1][0]) i++;
          const f = (pk - kfs[i][0]) / (kfs[i + 1][0] - kfs[i][0]);
          S = { ...S, sx: lerp(kfs[i][1], kfs[i + 1][1], f), sy: lerp(kfs[i][2], kfs[i + 1][2], f) };
        }
        setBarFlavor(trav, flT);
        trav.k = 0;
        place(trav, S);
        renderer.render(scene, camera);
      }
      updateNav();
    };

    // ── intro → entrance ───────────────────────────────────────────────────
    const intro = q("intro");
    const enterHero = () => {
      if (entered || dead) return;
      entered = true;
      if (intro) intro.style.display = "none";
      root.classList.remove("locked");
      const nav = q("nav");
      const anim = (el, kf, o) => el && !reduced && el.animate(kf, { fill: "both", ...o });
      if (reduced) {
        [nav, q("play"), countEl, q("auto"), q("rings")].forEach((el) => el && (el.style.opacity = "1"));
        nav.style.transform = "none";
        qa("bit").forEach((b) => (b.style.opacity = ".55"));
        pos = target;
        const f = FLAVORS[flavor];
        swapTitle(f.name, 1, false);
        setCount(flavor, false);
        return;
      }
      anim(nav, [{ transform: "translateY(-110%)" }, { transform: "translateY(0)" }], { duration: 900, easing: "cubic-bezier(.22,.9,.24,1)" });
      nav.style.transform = "none";
      anim(q("rings"), [{ opacity: 0, transform: "scale(.85)" }, { opacity: 1, transform: "scale(1)" }], { duration: 1100, easing: "ease-out" });
      q("rings").style.opacity = "1";
      [[q("play"), 500], [countEl, 620], [q("auto"), 740]].forEach(([el, d]) => {
        anim(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 600, delay: d });
        el.style.opacity = "1";
      });
      swapTitle(FLAVORS[flavor].name, 1, false);
      setCount(flavor, false);
      pos = -2.6;
      tween = { from: -2.6, to: target, t0: performance.now(), dur: 1700, ease: ENTER };
      lastInteract = performance.now();
      qa("bit").forEach((b, i) => {
        b.animate([{ opacity: 0 }, { opacity: 0.6 }], { duration: 900, delay: 300 + 90 * i, fill: "forwards" });
        const dx = (i % 2 ? -1 : 1) * (12 + (i % 3));
        b.animate(
          [
            { translate: "0 0", rotate: "0deg" },
            { translate: `${dx}px ${-(22 + 3 * i)}px`, rotate: `${i % 2 ? -10 : 12}deg` },
            { translate: "0 0", rotate: "0deg" },
          ],
          { duration: 7000 + 900 * i, iterations: Infinity, easing: "ease-in-out", composite: "add" }
        );
      });
    };

    const startIntro = () => {
      const video = intro && intro.querySelector("video");
      const logo = intro && intro.querySelector(".logo");
      root.classList.add("locked");
      let logoShown = false;
      const showLogo = () => {
        if (logoShown) return;
        logoShown = true;
        try { video && video.pause(); } catch (e) { /* ignore */ }
        logo && logo.classList.add("on");
        later(enterHero, 650 + 380);
      };
      const skip = q("skip");
      skip.onclick = enterHero;
      if (video) {
        const play = () => {
          try { video.currentTime = 0.55; } catch (e) { /* ignore */ }
          const pr = video.play();
          pr && pr.catch(() => {});
        };
        if (video.readyState >= 3) later(play, 0);
        else on(video, "canplay", play, { once: true });
        on(video, "ended", showLogo);
        on(video, "error", showLogo);
        later(() => !logoShown && video.currentTime < 0.6 && showLogo(), 3500 + 550);
        later(showLogo, 4600);
      } else later(showLogo, 300);
      later(enterHero, 9000);
    };

    // go
    titleEl.innerHTML = "";
    countEl.textContent = "";
    measure();
    swapTitle(FLAVORS[flavor].name, 1, false);
    setCount(flavor, false);
    if (!P().interactive || reduced || !P().introEnabled) {
      if (intro) intro.style.display = "none";
      if (P().interactive || true) {
        // entrance without the intro; a static card still shows the hero at rest
        enterHero();
        if (!P().interactive) { tween = null; pos = target; }
      }
    } else startIntro();
    initGL();
    raf = requestAnimationFrame(tick);
    on(window, "resize", measure);
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    cleanups.push(() => ro.disconnect(), () => io.disconnect(), () => rio.disconnect());
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => !dead && fitTitle());

    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      cleanups.forEach((f) => f());
      root.querySelectorAll(".fly").forEach((n) => n.remove());
      if (renderer) {
        try {
          bars.concat(trav ? [trav] : []).forEach((b) => { scene.remove(b.group); scene.remove(b.sh); b.mf.dispose(); b.mb.dispose(); b.sm.dispose(); });
          frontTex.concat(backTex).forEach((t) => t && t.dispose());
          if (envTex) envTex.dispose();
          geoF && geoF.dispose();
          geoB && geoB.dispose();
          renderer.dispose();
          renderer.forceContextLoss();
        } catch (e) { /* ignore */ }
      }
      glReady = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bitPositions = [
    [0.12, 0.2, 120, -18, 0],
    [0.86, 0.18, 96, 22, 2],
    [0.07, 0.74, 84, 12, 3],
    [0.655, 0.15, 78, -10, 4],
    [0.205, 0.885, 70, 30, 1],
  ];
  const counts = FLAVORS.map((_, i) => slots.filter((v) => v === i).length);

  return (
    <div
      ref={rootRef}
      className="stb"
      style={{ ...style, "--ink": inkColor, "--cream": creamColor, "--dark": darkColor, "--mark": creamColor }}
    >
      <style>{CSS}</style>

      <nav className="nav" data-k="nav">
        <div className="brand">
          <span style={{ color: "var(--ink)" }}>{MARK}</span>
          <span className="wm">{brand}</span>
        </div>
        <div className="pill">
          <span className="hl" data-k="hl" />
          {["Flavors", "Inside", "Shop", "Range"].map((l, i) => (
            <a key={l} data-k="link" href={`#${SECTIONS[i]}`}>
              {l}
            </a>
          ))}
        </div>
        <div className="nright">
          <span className="chip off">{discountLabel}</span>
          <span className="chip basket" data-k="basket" aria-label="Basket">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 8h14l-1.2 11H6.2zM9 8V6a3 3 0 0 1 6 0v2" />
            </svg>
            <span key={cart} className={"badge" + (cart > 0 ? " on" : "")} style={cart > 0 ? { animation: "stbPop .35s ease-out" } : undefined}>
              {cart}
            </span>
          </span>
          <button className="cta">{ctaLabel}</button>
        </div>
      </nav>
      <style>{"@keyframes stbPop{0%{transform:scale(0)}60%{transform:scale(1.5)}100%{transform:scale(1)}}"}</style>

      {showIntro && (
        <div className="intro" data-k="intro">
          <video src={introVideo} muted playsInline preload="auto" />
          <button className="skip" data-k="skip">
            Skip intro
          </button>
          <div className="logo">
            <div>
              <span style={{ color: "#1c1a1f", "--mark": "#f0e8e0", display: "block" }}>{MARK}</span>
              <b>{brand}</b>
            </div>
          </div>
        </div>
      )}
      {!showIntro && <div data-k="intro" style={{ display: "none" }} />}

      <div className="scroller" data-k="scroller">
        <canvas className="gl" data-k="gl" />
        <div className="infront" data-k="inFront">
          <div className="frame" data-k="frameFront">
            <div className="in-head disp" data-k="head" />
            <div className="in-icons">
              {ICONS.map((ic, i) => (
                <button key={i} data-k="icon" aria-label={`Step ${i + 1}`}>
                  <svg viewBox="0 0 24 24">{ic}</svg>
                </button>
              ))}
            </div>
            <div className="in-cap" data-k="cap" />
          </div>
          <div className="storm" data-k="storm">
            {Array.from({ length: 20 }, (_, i) => (
              <div key={i} className="piece spr" data-k="piece" />
            ))}
          </div>
        </div>

        <section className="hero" data-k="hero" id="flavors">
          <div className="reveal" data-k="reveal" />
          <div className="rings" data-k="rings" />
          <div className="bits">
            {bitPositions.map(([x, y, s, r, b], i) => (
              <div
                key={i}
                data-k="bit"
                className="bit spr"
                style={{
                  left: `${x * 100}%`,
                  top: `${y * 100}%`,
                  width: `calc(var(--u) * ${s})`,
                  height: `calc(var(--u) * ${(s * BITS[b][3]) / BITS[b][2]})`,
                  rotate: `${r}deg`,
                  ...spr(BITS[b]),
                }}
              />
            ))}
          </div>
          <div className="arc" data-k="arc" />
          <button className="play" data-k="play" aria-label="Next flavour">
            <svg viewBox="0 0 24 24">
              <path d="M4 12h15M13 6l6 6-6 6" />
            </svg>
          </button>
          <h1 className="title disp" data-k="title" aria-live="polite" />
          <div className="count disp" data-k="count" />
          <button className="auto" data-k="auto" aria-pressed={autoOn} onClick={() => setAutoOn((v) => !v)}>
            <i>
              {autoOn ? (
                <svg viewBox="0 0 10 10"><rect x="1.5" y="1" width="2.4" height="8" rx="1" /><rect x="6.1" y="1" width="2.4" height="8" rx="1" /></svg>
              ) : (
                <svg viewBox="0 0 10 10"><path d="M2 1l7 4-7 4z" /></svg>
              )}
            </i>
            Autoplay
          </button>
        </section>

        <section className="inside" data-k="inside" id="inside">
          <div className="pin">
            <div className="in-dark" data-k="dark" />
            <div className="frame" data-k="frameBack">
              <div className="in-num disp" data-k="num" />
              <div className="in-bar" data-k="inBar" />
            </div>
          </div>
        </section>

        <section className="shop" data-k="shop" id="shop">
          <div data-k="rv" style={{ position: "relative" }}>
            <h2 className="disp">
              <span className="ln"><span>GRAB</span></span>
              <span className="ln"><span>A BAG</span></span>
            </h2>
            <p className="cap">
              Five bold flavours. Same<br />real ingredients. Pick your<br />favourite (or try them all).
            </p>
            <div className="cards">
              {FLAVORS.map((f, i) => {
                const parts = f.name.split(" ");
                return (
                  <div key={f.name} className={"card" + (selected === i ? " live" : "")} data-k="card" data-i={i} style={{ "--c": f.color, transitionDelay: `${i * 80}ms` }}>
                    <div className="nm disp">
                      {parts[0]}
                      <br />
                      {parts.slice(1).join(" ") || " "}
                    </div>
                    <div className="pk spr" style={wrapper(i)} />
                    <button className="add" aria-label={`Add a bag of ${f.name} to the cart`} onClick={(e) => addBag(i, e)}>
                      <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="range" data-k="range" id="range">
          <h2 className="disp">
            <span style={{ display: "block" }}>BUILD YOUR</span>
            <span style={{ display: "block" }}><span className="num">3</span> PACK &amp;</span>
            <span style={{ display: "block" }}>SAVE $1.49</span>
          </h2>
          <div className="glowwrap">
            <div className="glow" key={glowKey} style={{ "--g": glow }} />
            {POSITIONS.map(([x, y], k) => (
              <div key={k} className={"slot" + (slots[k] !== null ? " full" : "")} style={{ left: `${x}%`, top: `${y}%` }}>
                {slots[k] !== null && <div key={slots[k] + "-" + k} className="sb spr" data-k="slotbar" style={wrapper(slots[k])} />}
                <button className="x" aria-label={slots[k] !== null ? "Remove bar" : "Empty slot"} onClick={() => slots[k] !== null && removeSlot(k)}>
                  <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></svg>
                </button>
              </div>
            ))}
          </div>
          <div className="thumbs">
            {FLAVORS.map((f, i) => (
              <button key={f.name} className="thumb" style={{ "--c": f.color }} onClick={() => addSlot(i)} aria-label={`Add ${f.name}`}>
                <span className="sq">
                  <span className={"ring" + (counts[i] ? " on" : "")}>{counts[i] > 1 ? counts[i] : counts[i] ? "✓" : ""}</span>
                  <span className="spr" style={wrapper(i)} />
                </span>
                <span className="tn">{f.name}</span>
              </button>
            ))}
          </div>
          <button className={"buy" + (buy === "done" ? " done" : "")} disabled={!full && buy !== "done"} onClick={buyNow}>
            <span>{buy === "done" ? "Added to cart" : full ? "Add to cart" : `Pick ${emptyN} more`}</span>
            {buy !== "done" && <span className="pr">{packPrice}</span>}
          </button>
        </section>
      </div>
    </div>
  );
}

function mixRgba(hex, a) {
  const p = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${p.join(",")},${a})`;
}
