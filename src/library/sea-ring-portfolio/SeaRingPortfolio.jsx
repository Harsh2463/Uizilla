import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

/**
 * SeaRingPortfolio — an animated portfolio section: a serif sentence with three stats over a
 * rounded panel holding a looping sunlit-sea video, inside which a 3D ring of 16 landscape
 * video cards surrounds the viewer and spins with the wheel, drag and touch. A second view
 * ("Build") shows the sea behind a headline and a fill-in-the-blanks project brief.
 *
 * Opening sequence: the name rises letter by letter, a percentage counts up while the card
 * posters load, the cards assemble into a small tilted ring, the ring expands to wrap the
 * viewer while the loader fades, the panel's clip closes to its rounded frame and the name
 * flies into the nav wordmark.
 *
 * Self-contained: React only (CSS 3D transforms, no WebGL). It fills its parent, so give the
 * parent a height. All sizes follow the box it is placed in, not the window.
 *
 * DEPENDENCIES: React 18 (npm). Loaded at runtime: the Newsreader, Geist and Geist Mono fonts
 * (Google Fonts), the sea still and video, and your card posters / videos (URLs).
 */

const CF = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/";
const R2 = "https://pub-86dc5b5484314368ac5436a674b0d919.r2.dev/";
const proxy = (u, w) => `https://images.higgs.ai/?default=1&output=webp&url=${encodeURIComponent(u)}&w=${w}&q=85`;
const FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Geist+Mono:wght@100..900&family=Geist:wght@100..900&family=Newsreader:wght@300..500&family=Antonio:wght@600;700&display=swap";

const DEFAULT_HEADLINE = ["THE FUTURE OF", "ENTERTAINMENT"];
// "Title | video | poster | width x height | world | link slug"
// "Title | video | poster | width x height | world | link slug" (the size no longer matters: every card shares one box)
const DEFAULT_CARDS = [
  "Look Circle |  | https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1000&q=75 | 1600x900 | brand | look-circle",
  "Video Studio |  | https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1000&q=75 | 1440x810 | build | video-studio",
  "Balloon Drop |  | https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=75 | 1600x900 | brand | balloon-drop",
  "Fox Couture |  | https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1000&q=75 | 1440x900 | brand | fox-couture",
  "Laptop Portfolio |  | https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1000&q=75 | 1440x810 | build | laptop-portfolio",
  "Ink Portfolio |  | https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=1000&q=75 | 1440x810 | build | ink-portfolio",
  "Clothing Rail |  | https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=75 | 1500x1000 | brand | clothing-rail",
  "Spin Product |  | https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1000&q=75 | 1500x1000 | brand | spin-product",
  "Sphere Gallery |  | https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1000&q=75 | 1440x810 | learn | sphere-gallery",
  "Video Editor |  | https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=75 | 1440x810 | build | video-editor",
  "Card Story |  | https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=1000&q=75 | 1440x900 | learn | card-story",
  "Year Recap |  | https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1000&q=75 | 1440x900 | learn | year-recap",
  "Future Fashion |  | https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=1000&q=75 | 1440x900 | brand | future-fashion",
  "VHS Archive |  | https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=1000&q=75 | 1600x900 | learn | vhs-archive",
  "Moss Island |  | https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1000&q=75 | 1600x900 | build | moss-island",
  "Outfit Carousel |  | https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1000&q=75 | 1600x900 | brand | outfit-carousel",
];
// the same sites with their clips, used when Media is set to videos and the card list is still the default
const DEFAULT_VIDEO_CARDS = [
  "Look Circle | aaaf/look-circle-hero.mp4 | hf_20261111_034848_928e6733-ce60-48f4-9a65-14dc76a1d74b | 1600x900 | brand | look-circle",
  "Video Studio | aaaf/kolibrie-landing.mp4 | hf_20261110_232427_5e9a291a-5c3e-4f0e-9506-06fedc0020f4 | 1440x810 | build | video-studio",
  "Balloon Drop | aaaf/balloon-drop-hero-edge.mp4 | hf_20261109_030427_0961b20a-ba6b-4094-8ea2-de5916dfa0b3 | 1600x900 | brand | balloon-drop",
  "Fox Couture | aaaf/fox-couture-hero.mp4 | hf_20261107_154307_13b28214-7ca8-4b2a-b8aa-a2f84e7cfcec | 1440x900 | brand | fox-couture",
  "Laptop Portfolio | aaaf/laptop-portfolio.mp4 | hf_20261111_030305_aa366bc0-85e3-4f61-82c1-cbf8ae8217a3 | 1440x810 | build | laptop-portfolio",
  "Ink Portfolio | aaaf/ink-portfolio.mp4 | hf_20261111_001348_8bc89068-e31a-4ccf-a6cb-893ff11c134f | 1440x810 | build | ink-portfolio",
  "Clothing Rail | aaaf/clothing-rail-hero.mp4 | hf_20261108_064619_5aab2bf3-3e14-41b3-9421-250f3c9eac47 | 1500x1000 | brand | clothing-rail",
  "Spin Product | aaaf/spin-product-hero.mp4 | hf_20261107_113531_66f5b631-47f4-45da-8094-29dc04544d61 | 1500x1000 | brand | spin-product",
  "Sphere Gallery | aaaf/sphere-gallery.mp4 | hf_20261111_011719_6594eb98-1eff-4903-9888-f4617764070d | 1440x810 | learn | sphere-gallery",
  "Video Editor | aaaf/glaze-motion.mp4 | hf_20261110_223913_74dc89fd-5948-4da9-8749-3bcd3f40fd8d | 1440x810 | build | video-editor",
  "Card Story | aaaf/kinestra-card-story-v2.mp4 | hf_20261108_020030_b8d50a01-c927-44a4-ad51-ab48c283c9d5 | 1440x900 | learn | card-story",
  "Year Recap | aaaf/halftone-recap.mp4 | hf_20261107_001441_a517a376-cfaa-415e-95d8-ea8b61c1727c | 1440x900 | learn | year-recap",
  "Future Fashion | aaaf/orbe-future-mode.mp4 | hf_20261106_084953_1d74b316-6fa3-4558-a532-462e7ae8d559 | 1440x900 | brand | future-fashion",
  "VHS Archive | aaaf/vhs-arc-hero.mp4 | hf_20261105_045553_51e4ba42-a8a4-4702-ad5f-18c0e2a5ba85 | 1600x900 | learn | vhs-archive",
  "Moss Island | aaaf/mossline-hero.mp4 | hf_20261106_032528_99eb9a00-a553-40b6-8b97-017e918971c6 | 1600x900 | build | moss-island",
  "Outfit Carousel | aaaf/try-the-look-hero.mp4 | hf_20261105_051536_4f458170-47a1-440e-a08c-8ed434394ce8 | 1600x900 | brand | outfit-carousel",
];

const WORLDS = {
  build: { label: "BUILD", color: "#3AA8D0", on: "#04121A" },
  brand: { label: "BRAND", color: "#EEF4F6", on: "#0A0E11" },
  learn: { label: "LEARN", color: "#9ED8E4", on: "#0E2A3B" },
};

// [left %, top %, width px, duration s, delay s]
const PETALS_BACK = [[4,14,9,29,0],[14,4,7,34,-12],[24,26,8,31,-21],[36,10,6,37,-5],[46,30,9,27,-16],[56,6,7,33,-27],[66,20,8,30,-9],[76,2,6,36,-24],[86,24,9,28,-3],[94,12,7,35,-18],[30,44,6,39,-31],[60,40,7,32,-13]];
const PETALS_FRONT = [[10,50,14,23,-6],[40,62,12,26,-19],[70,56,16,21,-11],[88,46,13,24,-2],[52,70,11,28,-23]];
const FRONT_COLORS = ["#D6EEF3", "#FFFFFF", "#FFFFFF", "#D6EEF3", "#D6EEF3"];
const MOTES = [[8,62,10,14,-2],[18,40,6,18,-9],[27,70,14,16,-5],[36,52,8,20,-13],[44,30,5,17,-3],[53,66,12,15,-11],[61,44,7,19,-7],[69,74,16,14,-1],[77,36,6,21,-15],[85,58,11,16,-8],[92,46,7,18,-4],[13,82,9,22,-17],[48,84,13,17,-6],[72,22,5,23,-19]];

const SLOTS = 16;
const DEFAULT_NONE = [];
// every card has the same 16:9 box; the picture or clip is cropped to fill it (object-fit: cover)
const CARD_RATIO = 16 / 9;

/** A generated "site preview" picture, used when media is switched to placeholders or a URL is missing. */
function placeholderPoster(title, i, world, ratio) {
  const w = 720;
  const h = Math.round(w / ratio);
  const hue = (196 + i * 29) % 360;
  const tint = world === "build" ? 200 : world === "learn" ? 188 : 210;
  const t = String(title).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const svg =
    "<svg xmlns='http://www.w3.org/2000/svg' width='" + w + "' height='" + h + "' viewBox='0 0 " + w + " " + h + "'>" +
    "<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='hsl(" + hue + ",55%,22%)'/><stop offset='1' stop-color='hsl(" + ((hue + 40) % 360) + ",60%,40%)'/></linearGradient>" +
    "<radialGradient id='r' cx='.78' cy='.2' r='.7'><stop offset='0' stop-color='hsl(" + tint + ",80%,75%)' stop-opacity='.55'/><stop offset='1' stop-color='transparent'/></radialGradient></defs>" +
    "<rect width='100%' height='100%' fill='url(#g)'/><rect width='100%' height='100%' fill='url(#r)'/>" +
    "<rect x='0' y='0' width='100%' height='" + Math.round(h * 0.1) + "' fill='rgba(0,0,0,.25)'/>" +
    "<circle cx='" + Math.round(h * 0.05) + "' cy='" + Math.round(h * 0.05) + "' r='" + Math.round(h * 0.014) + "' fill='rgba(255,255,255,.6)'/>" +
    "<circle cx='" + Math.round(h * 0.09) + "' cy='" + Math.round(h * 0.05) + "' r='" + Math.round(h * 0.014) + "' fill='rgba(255,255,255,.4)'/>" +
    "<rect x='" + Math.round(w * 0.08) + "' y='" + Math.round(h * 0.4) + "' width='" + Math.round(w * 0.5) + "' height='" + Math.round(h * 0.035) + "' rx='" + Math.round(h * 0.017) + "' fill='rgba(255,255,255,.55)'/>" +
    "<rect x='" + Math.round(w * 0.08) + "' y='" + Math.round(h * 0.47) + "' width='" + Math.round(w * 0.36) + "' height='" + Math.round(h * 0.03) + "' rx='" + Math.round(h * 0.015) + "' fill='rgba(255,255,255,.3)'/>" +
    "<rect x='" + Math.round(w * 0.08) + "' y='" + Math.round(h * 0.6) + "' width='" + Math.round(w * 0.2) + "' height='" + Math.round(h * 0.09) + "' rx='" + Math.round(h * 0.045) + "' fill='rgba(255,255,255,.85)'/>" +
    "<text x='" + Math.round(w * 0.08) + "' y='" + Math.round(h * 0.3) + "' font-family='Georgia,serif' font-size='" + Math.round(h * 0.11) + "' fill='white'>" + t + "</text>" +
    "<text x='" + Math.round(w * 0.08) + "' y='" + Math.round(h * 0.94) + "' font-family='monospace' font-size='" + Math.round(h * 0.04) + "' letter-spacing='3' fill='rgba(255,255,255,.55)'>PLACEHOLDER</text></svg>";
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}
const GRAIN = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const num = (v, fb) => (Number.isFinite(Number(v)) ? Number(v) : fb);
const mod = (a, n) => ((a % n) + n) % n;
const DEG = Math.PI / 180;

function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = (s) => ((ax * s + bx) * s + cx) * s;
  const Y = (s) => ((ay * s + by) * s + cy) * s;
  return (t) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let lo = 0, hi = 1, s = t;
    for (let i = 0; i < 20; i++) {
      const x = X(s);
      if (Math.abs(x - t) < 1e-5) break;
      if (x < t) lo = s; else hi = s;
      s = (lo + hi) / 2;
    }
    return Y(s);
  };
}
const EXPAND = bezier(0.5, 0, 0.15, 1);

/** A damped spring, stepped by hand: { x, v, t, k, c, m }. */
const spring = (x, k, c, m = 1) => ({ x, v: 0, t: x, k, c, m });
function stepSpring(s, dt) {
  const n = Math.max(1, Math.ceil(dt / 0.008));
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    s.v += ((s.k * (s.t - s.x) - s.c * s.v) / s.m) * h;
    s.x += s.v * h;
  }
}
const settled = (s) => Math.abs(s.t - s.x) < 0.01 && Math.abs(s.v) < 0.01;

function parseCards(list, mode, images, videos) {
  const clean = (l) => (Array.isArray(l) ? l : []).map((x) => String(x).trim()).filter(Boolean);
  const arr = (Array.isArray(list) ? list : []).map((l) => String(l)).filter((l) => l.trim());
  const imgs = clean(images);
  const vids = clean(videos);
  // The image and video lists can replace (or add to) the media of the cards by position.
  const count = Math.max(arr.length, imgs.length, vids.length);
  return Array.from({ length: count }, (_, i) => {
    const line = arr[i] !== undefined ? arr[i] : `Card ${i + 1}`;
    const p = line.split("|").map((x) => x.trim());
    let [title = `Site ${i + 1}`, video = "", poster = "", size = "1600x900", world = "brand", link = ""] = p;
    if (imgs[i]) poster = imgs[i];
    if (vids[i]) video = vids[i];
    const m = /^(\d+(?:\.\d+)?)\s*[x×:]\s*(\d+(?:\.\d+)?)$/i.exec(size);
    const ratio = m ? num(m[1], 16) / Math.max(1, num(m[2], 9)) : num(size, 16 / 9) || 16 / 9;
    const wd = WORLDS[world] && world !== "ai" ? world : "brand";
    const rt = clamp(ratio, 0.5, 3);
    const ph = placeholderPoster(title, i, wd, rt);
    const realVideo = !video ? "" : /^https?:|^data:|^\//i.test(video) ? video : R2 + video;
    const realPoster = !poster ? "" : /^https?:|^data:|^\//i.test(poster) ? poster : proxy(CF + poster + ".png", 720);
    return {
      title,
      ph,
      // images + videos: your files. images only: your posters, no clips. placeholders: generated art, no media needed.
      video: mode === "video" ? realVideo : "",
      poster: mode === "placeholder" ? ph : realPoster || ph,
      ratio: rt,
      world: wd,
      link: !link ? "" : /^https?:/i.test(link) ? link : "https://motionsites.ai/?prompt=" + link,
      num: i + 1,
    };
  });
}


const CSS = `
.nrs{--paper:#030204;--deep:#030204;--surface:#141C22;--ink:#EEF4F6;--soft:#9FB4BF;--muted:#647C8A;--line:rgba(238,244,246,.14);--accent:#772DFF;--btn:#1E86AC;--btn2:#2597C0;--sage:#9ED8E4;--night:#05090C;--onsky:#0E2A3B;--ease:cubic-bezier(.22,1,.36,1);--serif:"Newsreader",Georgia,serif;--mono:"Geist Mono",ui-monospace,monospace;--sans:"Geist",system-ui,sans-serif;position:relative;width:100%;height:100%;overflow:hidden;background:var(--paper);color:var(--ink);font-family:var(--sans);-webkit-font-smoothing:antialiased;color-scheme:dark}
.nrs *{box-sizing:border-box}
.nrs a{color:inherit;text-decoration:none}
.nrs button{font:inherit;color:inherit;cursor:pointer;background:none;border:0;padding:0}
.nrs::before{content:"";position:absolute;inset:-50%;background-image:${GRAIN};opacity:.045;mix-blend-mode:screen;pointer-events:none;z-index:200}
/* nav */
.nrs .nav{position:absolute;left:0;right:0;top:0;z-index:50;height:calc(var(--u)*92);display:flex;align-items:center;justify-content:space-between;padding:0 calc(var(--u)*46) 0 calc(var(--u)*45)}
.nrs .wm{font-family:var(--serif);font-size:calc(var(--u)*40);letter-spacing:-.02em;line-height:1;white-space:nowrap;cursor:pointer}
.nrs .wm span{display:inline-block}
.nrs .wmRest{opacity:0;transition:opacity .9s}
.nrs .wmFirst{opacity:0}
.nrs.ready .wmRest,.nrs.ready .wmFirst,.nrs.noIntro .wmRest,.nrs.noIntro .wmFirst{opacity:1}
.nrs[data-nav="0"] .nav{display:none}
/* views */
.nrs .view{position:absolute;inset:0;display:none;flex-direction:column;padding-top:0;overflow-x:hidden;overflow-y:auto;scrollbar-width:none}
.nrs .view.home{overflow:hidden}
.nrs .view.on{display:flex}
.nrs .stage{flex:1;min-height:0;display:flex;flex-direction:column}
.nrs[data-nav="0"] .view{padding-top:0}
.nrs[data-nav="0"] .home .stage{padding-top:calc(var(--u)*18)}
/* frame */
.nrs .frame{position:relative;flex:1;min-height:0;margin:calc(var(--u)*16) calc(var(--u)*16) calc(var(--u)*22);border-radius:calc(var(--u)*22);background:var(--deep);isolation:isolate;overflow:hidden;clip-path:inset(0 round calc(var(--u)*22));transition:clip-path 1.1s cubic-bezier(.5,0,.1,1)}
.nrs .frame.open{overflow:visible;background:transparent;z-index:101;clip-path:inset(var(--ft) var(--fr) var(--fb) var(--fl) round 0);transition:none}
.nrs .frame.enter{z-index:101;background:transparent}
.nrs .scene{position:absolute;inset:-4%;z-index:0;will-change:transform;transition:opacity .9s;container-type:size}
.nrs.intro:not(.revealed) .home .scene{opacity:0}
/* violet radial glow over the full height, fading to black at the sides */
/* a perfectly round glow: its diameter is the smaller of 60% of the width and the full height, so it stays a complete circle at any size (the diameter is the smaller of 80% of the width and 94% of the height of the panel, so it follows the panel height and never gets cut off) */
.nrs .rib{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;mix-blend-mode:screen}
.nrs .glow{position:absolute;left:50%;top:50%;width:min(80cqw,94cqh);aspect-ratio:1/1;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle closest-side,color-mix(in srgb,var(--glow) 45%,white),transparent 100%) center/38% 38% no-repeat,radial-gradient(circle closest-side,var(--glow) 0%,color-mix(in srgb,var(--glow) 78%,black) 30%,color-mix(in srgb,var(--glow) 38%,black) 55%,color-mix(in srgb,var(--glow) 20%,black) 78%,var(--paper) 98%)}
/* big bold headline, centred horizontally and vertically as one tight block and lit by the glow behind it */
.nrs .bt{position:absolute;inset:0;z-index:1;pointer-events:none;display:flex;flex-direction:column;justify-content:space-between;align-items:center;padding:4% 0;opacity:0;transition:opacity .9s}
.nrs.revealed .bt,.nrs.noIntro .bt{opacity:1}
.nrs .bt span{display:block;text-align:center;font-family:"Antonio","Big Shoulders Display","Barlow Condensed",Impact,sans-serif;font-weight:700;text-transform:uppercase;line-height:.86;letter-spacing:.01em;white-space:nowrap;font-size:min(calc(var(--bw) * 11.8),calc(var(--bh) * 23));background-image:linear-gradient(90deg,color-mix(in srgb,var(--htxt) 30%,black) 0%,color-mix(in srgb,var(--htxt) 60%,black) 20%,color-mix(in srgb,var(--htxt) 85%,black) 40%,var(--htxt) 50%,color-mix(in srgb,var(--htxt) 85%,black) 60%,color-mix(in srgb,var(--htxt) 60%,black) 80%,color-mix(in srgb,var(--htxt) 30%,black) 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
/* phones: the circle spans the full width of the screen (height follows, so it stays round) and the headline is larger */
.nrs.sm .glow{width:100cqw}
/* wide screens: the upper line sits a little closer to the ring row */
.nrs:not(.sm) .bt span:first-child{transform:translateY(calc(var(--bh) * 6))}
.nrs.sm .bt{display:block;padding:0}
.nrs.sm .bt span{position:absolute;top:47%;font-size:calc(var(--bw) * 14.5);transform:translate(-50%,-50%) rotate(-90deg)}
.nrs.sm .bt span:first-child{left:15%}
.nrs.sm .bt span:last-child{left:86%}
.nrs .petal,.nrs .mote,.nrs .mist{display:none}
.nrs .grain{position:absolute;inset:-4%;background-image:${GRAIN};opacity:.07;mix-blend-mode:screen;pointer-events:none;animation:nrsJit .9s steps(5) infinite}
@keyframes nrsJit{0%{transform:translate(0,0)}20%{transform:translate(-3%,2%)}40%{transform:translate(2%,-3%)}60%{transform:translate(-1%,-2%)}80%{transform:translate(3%,1%)}100%{transform:translate(0,0)}}
.nrs .fx{position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .9s}
.nrs.revealed .fx,.nrs.noIntro .fx{opacity:1}
.nrs .petal{position:absolute;border-radius:80% 0;height:calc(var(--w) * .62);width:var(--w);background:var(--pc);opacity:0;box-shadow:0 1px 3px rgba(14,42,59,.18);animation:nrsDrift var(--dur) linear var(--dl) infinite}
.nrs .petal.m{animation-name:nrsDriftM}
@keyframes nrsDrift{0%{opacity:0;transform:translate(calc(var(--bw)*-6),calc(var(--bh)*-12)) rotate(0)}8%{opacity:.85}50%{transform:translate(calc(var(--bw)*14),calc(var(--bh)*18)) rotate(260deg)}92%{opacity:.85}100%{opacity:0;transform:translate(calc(var(--bw)*34),calc(var(--bh)*46)) rotate(540deg)}}
@keyframes nrsDriftM{0%{opacity:0;transform:translate(calc(var(--bw)*6),calc(var(--bh)*-12)) rotate(0)}8%{opacity:.85}50%{transform:translate(calc(var(--bw)*-12),calc(var(--bh)*16)) rotate(-240deg)}92%{opacity:.85}100%{opacity:0;transform:translate(calc(var(--bw)*-28),calc(var(--bh)*44)) rotate(-500deg)}}
.nrs .mote{position:absolute;border-radius:50%;width:var(--w);height:var(--w);background:radial-gradient(circle,#f2fbfd,#bfeaf3 45%,transparent 70%);opacity:0;animation:nrsMote var(--dur) ease-in-out var(--dl) infinite}
@keyframes nrsMote{0%{opacity:0;transform:scale(.6)}20%{opacity:.9}50%{opacity:.55;transform:translate(14px,calc(var(--bh)*-9)) scale(1)}80%{opacity:.85}100%{opacity:0;transform:translate(-6px,calc(var(--bh)*-20)) scale(.7)}}
.nrs .mist{position:absolute;left:-6%;right:-6%;bottom:-4%;height:46%;z-index:3;pointer-events:none;opacity:0;transform:translateY(18%);background:radial-gradient(60% 70% at 18% 100%,rgba(250,252,253,.78),transparent 70%),radial-gradient(55% 60% at 82% 100%,rgba(250,252,253,.7),transparent 72%),linear-gradient(to top,rgba(246,250,251,.55),transparent 75%);transition:opacity .9s,transform 1.6s var(--ease)}
.nrs.revealed .mist,.nrs.noIntro .mist{opacity:.92;transform:none}
/* ring */
.nrs .wall{position:absolute;inset:0;z-index:2;cursor:grab;touch-action:pan-y pinch-zoom;user-select:none}
.nrs .wall.drag{cursor:grabbing}
.nrs .lens{position:absolute;left:0;right:0;top:calc(var(--H) * -1);bottom:calc(var(--H) * -1);perspective:1000px}
.nrs .rg3d{position:absolute;left:50%;top:50%;width:0;height:0;transform-style:preserve-3d}
.nrs .card{position:absolute;height:160px;top:-80px;transform-style:preserve-3d;opacity:0;display:block}
.nrs .tilt{position:absolute;inset:0;transform-style:preserve-3d}
.nrs .cframe{position:absolute;inset:-9px;border:3px solid var(--wc);border-radius:24px;box-shadow:0 40px 80px -30px var(--wc);clip-path:inset(0 100% 0 0 round 24px);transition:clip-path .55s var(--ease);pointer-events:none}
.nrs .card:hover .cframe{clip-path:inset(0 0 0 0 round 24px)}
.nrs .face{position:absolute;inset:0;border-radius:var(--cr,16px);overflow:hidden;backface-visibility:hidden;background:var(--onsky);box-shadow:0 18px 36px -24px rgba(0,0,0,.45);}
.nrs:not(.sm) .face:not(.curved){-webkit-box-reflect:below 10px linear-gradient(transparent 52%,rgba(255,255,255,.32))}
.nrs .face img,.nrs .face video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover !important}
.nrs .curve{display:none}
/* a bent card: thin vertical slices laid along an arc (see Round Carousel); it replaces the flat picture */
.nrs .face.curved{overflow:visible;transform-style:preserve-3d;border-radius:0;background:transparent;box-shadow:none;-webkit-box-reflect:none;backface-visibility:visible}
.nrs:not(.sm) .face.curved{border-radius:var(--cr,16px);box-shadow:0 18px 36px -24px rgba(0,0,0,.45)}
/* a bent card cannot use -webkit-box-reflect (it flattens the 3D bend), so its reflection is drawn by hand */
.nrs .curve .rf{display:none;position:absolute;left:0;top:calc(100% + 10px);width:100%;height:100%;background:var(--poster) center/cover no-repeat;transform:scaleY(-1);-webkit-mask-image:linear-gradient(to top,rgba(0,0,0,.32),transparent 48%);mask-image:linear-gradient(to top,rgba(0,0,0,.32),transparent 48%);border-radius:var(--cr,16px);pointer-events:none}
.nrs:not(.sm) .face.curved .rf{display:block}
.nrs .face.curved .curve{display:block;position:absolute;inset:0;transform-style:preserve-3d}
.nrs .face.curved>img,.nrs .face.curved>video{visibility:hidden}
.nrs .face.curved .chip,.nrs .face.curved .bar,.nrs .face.curved .dim{transform:translateZ(var(--lift,3px))}
.nrs .curve .sl{position:absolute;top:0;height:100%;overflow:hidden;background:var(--onsky)}
.nrs .curve .sh,.nrs .curve .hl{position:absolute;inset:0;pointer-events:none;opacity:var(--ck,1)}
.nrs .curve .vc{display:none;position:absolute;left:0;top:0;width:100%;height:100%}
.nrs .face.vplay .curve .vc{display:block}
.nrs .curve .sp{position:absolute;top:0;left:0;background-image:var(--poster);background-size:cover !important;background-position:center;background-repeat:no-repeat}
.nrs .face video{opacity:0;transition:opacity .4s}
.nrs .face video.on{opacity:1}
.nrs .chip{position:absolute;left:14px;bottom:14px;display:flex;align-items:center;gap:7px;padding:5px 11px;border-radius:99px;background:rgba(0,0,0,.45);color:#fff;font-family:var(--mono);font-size:13px;transition:opacity .3s}
.nrs .chip i{width:6px;height:6px;border-radius:50%;background:var(--wc)}
.nrs .card:hover .chip{opacity:0}
.nrs .dim{position:absolute;inset:0;background:var(--paper);opacity:0;transition:opacity .4s;pointer-events:none}
.nrs .bar{position:absolute;left:12px;right:12px;bottom:12px;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:11px 14px;border-radius:12px;background:var(--wc);color:var(--on);clip-path:inset(0 100% 0 0);transition:clip-path .5s var(--ease) .05s}
.nrs .card:hover .bar{clip-path:inset(0 0 0 0)}
.nrs .bar small{display:block;font-family:var(--mono);font-weight:500;font-size:12px;letter-spacing:.12em}
.nrs .bar b{display:block;font-family:var(--serif);font-weight:400;font-size:22px;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nrs .bar em{font-style:normal;transform:translate(-6px,6px);transition:transform .5s cubic-bezier(.34,1.56,.64,1) .15s;font-size:18px}
.nrs .card:hover .bar em{transform:none}
/* loader */
.nrs .loader{position:absolute;inset:0;z-index:100;background:var(--paper);color:var(--ink);transition:opacity .9s}
.nrs .loader.out{opacity:0;pointer-events:none}
.nrs .ldName{position:absolute;left:4%;top:3.2%;font-family:var(--serif);font-size:clamp(64px,calc(var(--W)*.09),150px);line-height:.95;letter-spacing:-.03em;display:flex}
.nrs .ldName .lm{overflow:hidden;display:inline-block;padding-bottom:.08em;margin-bottom:-.08em}
.nrs .ldName .lm>span{display:inline-block;transform:translateY(105%) rotate(8deg);animation:nrsRise 1s var(--ease) both;animation-delay:var(--d)}
@keyframes nrsRise{to{transform:none}}
.nrs .ldDot{transition:opacity .5s}
.nrs .loader.out .ldDot{opacity:0}
.nrs .ldCap{position:absolute;right:5%;bottom:4%;text-align:right}
.nrs .ldCap .cap{font-family:var(--mono);font-size:12px;letter-spacing:.14em;color:var(--soft);min-height:1em}
.nrs .odo{display:flex;align-items:baseline;justify-content:flex-end;font-family:var(--mono);font-size:clamp(80px,calc(var(--W)*.12),180px);letter-spacing:-.09em;line-height:1;overflow:hidden;height:1.05em}
.nrs .odo .inner{display:flex;align-items:baseline;transform:translateY(105%);animation:nrsRise .9s var(--ease) .2s both}
.nrs .loader.out .odo .inner{transform:translateY(-110%);animation:none;transition:transform .5s cubic-bezier(.6,0,.8,.4)}
.nrs .dg{display:inline-block;height:1em;overflow:hidden}
.nrs .dg.off{display:none}
.nrs .dg .col{display:flex;flex-direction:column;transition:transform .7s var(--ease)}
.nrs .dg .col span{display:block;height:1em;line-height:1}
.nrs .odo small{font-size:.22em;letter-spacing:.05em;margin-left:.2em}
.nrs .skip{position:absolute;left:4%;bottom:4%;width:44px;height:44px;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(238,244,246,.16);display:grid;place-items:center;color:var(--ink)}
.nrs .fly{position:absolute;z-index:150;left:0;top:0;font-family:var(--serif);letter-spacing:-.03em;line-height:.95;transform-origin:0 0;white-space:nowrap;pointer-events:none;color:var(--ink)}
/* phone */
.nrs.sm .nav{height:64px;padding:0 16px}
.nrs.sm .wm{font-size:24px}
.nrs.sm .wall{touch-action:pan-x pinch-zoom}
/* phones: the small white drifting petals read as stray white squares next to the cards, so they are hidden */
.nrs.sm .petal{display:none}
.nrs.sm .face,.nrs.sm .face.curved{-webkit-box-reflect:none !important;box-shadow:none !important}
.nrs.sm .cframe{box-shadow:none}
.nrs.sm .frame{margin:10px 10px 10px;border-radius:20px;clip-path:inset(0 round 20px)}
.nrs.sm .frame.open{clip-path:inset(var(--ft) var(--fr) var(--fb) var(--fl) round 0)}
@media (prefers-reduced-motion:reduce){.nrs *{animation:none!important;transition:none!important}.nrs .loader{display:none}}
`;


// ── ribbon beams: the Ribbon Glow shader drawn behind the ring, in the theme colours ──
const RibbonBeam = (() => {
  const MAX_DPR = 1.5;

  // Field shape, fixed: 84 folded layers, how far the pointer twists / drags the plane.
  const LAYERS = 84;
  const TWIST = 1.25;
  const DRAG = 0.18;

  const VERT_SRC = `#version 300 es
  const vec2 P[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
  void main() { gl_Position = vec4(P[gl_VertexID], 0.0, 1.0); }
  `;

  const FIELD_SRC = `#version 300 es
  precision highp float;
  uniform vec2 uRes;
  uniform float uTime;
  uniform vec3 uC1;
  uniform vec3 uC2;
  uniform float uSize;
  uniform float uAngle;
  uniform vec2 uMouse;
  uniform float uOn;
  uniform float uReach;
  uniform vec2 uVel;
  out vec4 o;

  const float LAYERS = ${LAYERS.toFixed(1)};
  const float TWIST = ${TWIST.toFixed(3)};
  const float DRAG = ${DRAG.toFixed(3)};
  const float GAIN = 0.62;
  const vec2 CENTRE = vec2(-0.62, 0.24);
  const float TILT = 0.6;
  const float ZOOM = 1.05;
  const float THETA = 2.13;
  const float SHEAR = 0.963;
  const float SHRINK = 0.953;
  const vec2 WARP_FREQ = vec2(0.42, 2.4);
  const vec2 WARP_AMP = vec2(0.13, 0.027);
  const vec2 ASPECT = vec2(2.1, 0.17);
  const float OFFSET = 0.36;
  const float GLOW = 0.0021;
  const float SOFT = 0.0019;
  const float FALLOFF = 0.37;
  const float PHASE = 12.0;
  const float CYCLE = 0.16;
  const float HUE_TRAVEL = 2.0;

  mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }

  void main() {
    vec2 R = uRes;
    vec2 pos = (gl_FragCoord.xy - 0.5 * R) / R.y;

    // The plane swirls around the pointer and is dragged by its motion. Skipped
    // outright at zero weight so a hover of 0 leaves the frame untouched.
    vec2 d = pos - uMouse;
    float w = uOn * exp(-dot(d, d) / (uReach * uReach));
    if (w > 1e-4) pos = uMouse + rot(w * TWIST) * d * (1.0 - 0.3 * min(w, 1.0)) - uVel * min(w, 1.0) * DRAG;

    pos = rot(uAngle) * pos / uSize;
    float t = uTime * 0.49 + PHASE;
    float breath = (-sin(uTime * 0.735) + sin(uTime * 0.49 + 1.0)) * 0.25 + 0.5;
    vec2 u = rot(TILT) * ((pos - CENTRE) * (ZOOM - breath * 0.085));
    mat2 fold = mat2(cos(THETA), sin(THETA), -SHEAR, cos(THETA));

    vec3 col = vec3(0.0);
    for (float i = 1.0; i <= LAYERS; i += 1.0) {
      u.x -= sin(u.y * WARP_FREQ.x + t + i * 0.007) * WARP_AMP.x;
      u.y -= sin(u.x * WARP_FREQ.y - t + i * 0.02) * WARP_AMP.y;
      u = fold * u * SHRINK;
      vec2 q = (u - vec2(OFFSET + breath * 0.1, 0.0)) * ASPECT;
      float g = GLOW / (dot(q, q) + SOFT) * (0.25 + breath * 0.4);
      float r = length(u);
      float k = sin(i * CYCLE + t * 1.2 + r * HUE_TRAVEL) * 0.5 + 0.5;
      col += g * mix(uC1, uC2, k) * (0.62 + 0.5 * k) * exp2(-r * FALLOFF);
    }
    vec3 x = max(col * GAIN, 0.0);
    col = (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14);
    col = pow(clamp(col, 0.0, 1.0), vec3(0.85, 0.92, 0.98));
    col *= 1.0 - smoothstep(0.5, 1.6, length(pos)) * 0.07;
    o = vec4(col, 1.0);
  }
  `;

  const FINISH_SRC = `#version 300 es
  precision highp float;
  uniform sampler2D uField;
  uniform vec2 uRes;
  uniform float uTime;
  uniform vec3 uBg;
  uniform float uPaper;
  out vec4 o;

  float ign(vec2 p, float f) { p += 5.588238 * mod(f, 64.0); return fract(52.9829189 * fract(0.06711056 * p.x + 0.00583715 * p.y)); }

  void main() {
    vec2 frag = gl_FragCoord.xy;
    vec3 L = max(texture(uField, frag / uRes).rgb, 0.0);
    // Dark ground: the ribbons are light, screened over it. Light ground: the
    // same hues laid on as pigment, the paper showing where the light is dim.
    vec3 dark = uBg + L * (1.0 - uBg);
    float strength = clamp(max(L.r, max(L.g, L.b)), 0.0, 1.0);
    vec3 paper = uBg * (1.0 - strength) + L * 0.96;
    vec3 col = mix(dark, paper, uPaper);
    col += (ign(frag, floor(uTime * 24.0)) - 0.5) / 255.0;
    o = vec4(clamp(col, 0.0, 1.0), 1.0);
  }
  `;

  const colorCache = new Map();

  // Accepts #rgb / #rrggbb, rgb()/rgba() and hsl()/hsla(); returns [r, g, b] in 0..1 or null.
  function parseColor(input) {
    if (!input) return null;
    const key = String(input);
    if (colorCache.has(key)) return colorCache.get(key);
    const s = key.trim();
    let out = null;
    if (s.charAt(0) === "#") {
      let h = s.slice(1);
      if (h.length === 3 || h.length === 4) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      if (h.length >= 6) {
        const r = parseInt(h.slice(0, 2), 16);
        const g = parseInt(h.slice(2, 4), 16);
        const b = parseInt(h.slice(4, 6), 16);
        if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) out = [r / 255, g / 255, b / 255];
      }
    } else {
      const m = s.match(/^(rgba?|hsla?)\(([^)]*)\)/i);
      if (m) {
        const parts = m[2].split(/[\s,/]+/).filter(Boolean);
        const f = (i) => parseFloat(parts[i]);
        if (parts.length >= 3 && [0, 1, 2].every((i) => Number.isFinite(f(i)))) {
          if (m[1].toLowerCase().startsWith("rgb")) {
            const ch = (i) => (parts[i].endsWith("%") ? f(i) / 100 : f(i) / 255);
            out = [ch(0), ch(1), ch(2)];
          } else {
            const hh = (((f(0) % 360) + 360) % 360) / 360;
            const ss = f(1) / 100;
            const ll = f(2) / 100;
            const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
            const p = 2 * ll - q;
            const hue = (t) => {
              t = t < 0 ? t + 1 : t > 1 ? t - 1 : t;
              if (t < 1 / 6) return p + (q - p) * 6 * t;
              if (t < 1 / 2) return q;
              if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
              return p;
            };
            out = [hue(hh + 1 / 3), hue(hh), hue(hh - 1 / 3)];
          }
          out = out.map((c) => Math.min(1, Math.max(0, c)));
        }
      }
    }
    colorCache.set(key, out);
    return out;
  }

  const color = (input, fallback) => (Array.isArray(input) ? input : parseColor(input) || parseColor(fallback));
  const num = (v, fb) => (typeof v === "number" && isFinite(v) ? v : fb);
  const clampN = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

  function link(gl, frag, label) {
    const shader = (type, src) => {
      const sh = gl.createShader(type);
      if (!sh) return null;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error(`RibbonGlow ${label} shader:`, gl.getShaderInfoLog(sh));
        gl.deleteShader(sh);
        return null;
      }
      return sh;
    };
    const vs = shader(gl.VERTEX_SHADER, VERT_SRC);
    const fs = shader(gl.FRAGMENT_SHADER, frag);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    if (!prog) return null;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(`RibbonGlow ${label} link:`, gl.getProgramInfoLog(prog));
      gl.deleteProgram(prog);
      return null;
    }
    return prog;
  }

  function locations(gl, prog, names) {
    const out = {};
    for (const n of names) out[n] = gl.getUniformLocation(prog, n);
    return out;
  }

  // The half-resolution field target: half float where the GPU can render to it, 8-bit otherwise.
  function fieldTarget(gl) {
    const fbo = gl.createFramebuffer();
    let tex = null;
    let w = 0;
    let h = 0;
    let half = !!gl.getExtension("EXT_color_buffer_float");
    return {
      fbo,
      texture: () => tex,
      width: () => w,
      height: () => h,
      resize(nw, nh) {
        if (nw === w && nh === h && tex) return;
        for (let attempt = 0; attempt < 2; attempt++) {
          if (tex) gl.deleteTexture(tex);
          tex = gl.createTexture();
          gl.bindTexture(gl.TEXTURE_2D, tex);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.texImage2D(gl.TEXTURE_2D, 0, half ? gl.RGBA16F : gl.RGBA8, nw, nh, 0, gl.RGBA, half ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null);
          gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
          gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
          const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
          if (ok || !half) break;
          half = false;
        }
        w = nw;
        h = nh;
      },
      dispose() {
        if (tex) gl.deleteTexture(tex);
        gl.deleteFramebuffer(fbo);
      },
    };
  }

  // Pointer in CSS px relative to the root, and whether it is over it.
  function trackPointer(root) {
    const p = { tx: 0, ty: 0, inside: false };
    const read = (e) => {
      const r = root.getBoundingClientRect();
      p.tx = e.clientX - r.left;
      p.ty = e.clientY - r.top;
      p.inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    };
    const out = (e) => {
      if (!e.relatedTarget) p.inside = false;
    };
    window.addEventListener("pointermove", read, { passive: true });
    window.addEventListener("pointerdown", read, { passive: true });
    document.addEventListener("pointerout", out);
    return {
      p,
      dispose() {
        window.removeEventListener("pointermove", read);
        window.removeEventListener("pointerdown", read);
        document.removeEventListener("pointerout", out);
      },
    };
  }


  return function RibbonBeam({ c1, c2, speed, opacity, hover, reach }) {
    const canvasRef = useRef(null);
    const vRef = useRef({});
    const still = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // both ribbon colours stay on the glow colour's side: the second is only 22% of the way toward the headline colour
    const a1 = parseColor(c1) || [0.47, 0.18, 1];
    const a2 = parseColor(c2) || a1;
    const lean = a1.map((v, i) => v + (a2[i] - v) * 0.22);
    vRef.current = {
      c1: a1,
      c2: lean,
      speed: still ? 0 : clampN(num(speed, 50), 0, 100) / 50,
      size: 1,
      angle: (-180 * Math.PI) / 180,
      hover: clampN(num(hover, 100), 0, 200) / 100,
      reach: clampN(num(reach, 240), 10, 800),
    };
    useEffect(() => {
      const canvas = canvasRef.current;
      const root = canvas ? canvas.parentElement : null;
      if (!canvas || !root) return;
      const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, depth: false, stencil: false });
      if (!gl) return;
      const field = link(gl, FIELD_SRC, "field");
      const finish = link(gl, FINISH_SRC, "finish");
      if (!field || !finish) return;
      const uf = locations(gl, field, ["uRes", "uTime", "uC1", "uC2", "uSize", "uAngle", "uMouse", "uOn", "uReach", "uVel"]);
      const un = locations(gl, finish, ["uField", "uRes", "uTime", "uBg", "uPaper"]);
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      const target = fieldTarget(gl);
      const pointer = trackPointer(root);
      const ptr = pointer.p;

      // Eased pointer state, in CSS px (y down) and CSS px per second.
      let mx = 0;
      let my = 0;
      let vx = 0;
      let vy = 0;
      let on = 0;
      let raf = 0;
      let last = -1;
      let clock = 0;
      let visible = true;
      const host = root.closest(".nrs");

      // Skip the work while the component is off screen.
      const io = typeof IntersectionObserver !== "undefined" ? new IntersectionObserver((es) => { visible = es[0].isIntersecting; }) : null;
      if (io) io.observe(root);

      const render = (now) => {
        raf = requestAnimationFrame(render);
        // wait until the loader has opened the section, and skip the work while off screen
        if (!visible || document.visibilityState === "hidden" || (host && !host.classList.contains("revealed"))) {
          last = -1;
          return;
        }
        const dt = last < 0 ? 0 : clampN((now - last) / 1000, 0, 0.05);
        last = now;
        const v = vRef.current;
        clock = (clock + dt * v.speed) % 3600;

        const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
        const cw = canvas.clientWidth || 1200;
        const ch = canvas.clientHeight || 800;
        const bw = Math.max(1, Math.round(cw * dpr));
        const bh = Math.max(1, Math.round(ch * dpr));
        if (canvas.width !== bw || canvas.height !== bh) {
          canvas.width = bw;
          canvas.height = bh;
        }
        target.resize(Math.max(1, Math.round(bw / 2)), Math.max(1, Math.round(bh / 2)));

        // Presence fades in and out; position is lightly smoothed; velocity is its smoothed derivative.
        const present = ptr.inside ? 1 : 0;
        if (present && on < 0.02) {
          mx = ptr.tx;
          my = ptr.ty;
        }
        on += (present - on) * (1 - Math.exp(-dt * 5));
        const k = 1 - Math.exp(-dt * 16);
        const nx = mx + (ptr.tx - mx) * k;
        const ny = my + (ptr.ty - my) * k;
        if (dt > 0) {
          const kv = 1 - Math.exp(-dt * 8);
          vx += ((nx - mx) / dt - vx) * kv;
          vy += ((ny - my) / dt - vy) * kv;
        }
        mx = nx;
        my = ny;
        const vLen = Math.hypot(vx, vy) / ch;
        const vCap = vLen > 3 ? 3 / vLen : 1;

        const c1 = color(v.c1, "#772DFF");
        const c2 = color(v.c2, "#C19AFF");
        const bg = [0, 0, 0]; // drawn as light only: the canvas is screen-blended over the glow

        // Pass 1: the field, at half resolution.
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
        gl.viewport(0, 0, target.width(), target.height());
        gl.useProgram(field);
        gl.uniform2f(uf.uRes, target.width(), target.height());
        gl.uniform1f(uf.uTime, clock);
        gl.uniform3f(uf.uC1, c1[0], c1[1], c1[2]);
        gl.uniform3f(uf.uC2, c2[0], c2[1], c2[2]);
        gl.uniform1f(uf.uSize, v.size);
        gl.uniform1f(uf.uAngle, v.angle);
        gl.uniform2f(uf.uMouse, (mx - cw / 2) / ch, (ch / 2 - my) / ch);
        gl.uniform1f(uf.uOn, on * v.hover);
        gl.uniform1f(uf.uReach, v.reach / ch);
        gl.uniform2f(uf.uVel, (vx / ch) * vCap, (-vy / ch) * vCap);
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        // Pass 2: upsample and composite over the background.
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, bw, bh);
        gl.useProgram(finish);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, target.texture());
        gl.uniform1i(un.uField, 0);
        gl.uniform2f(un.uRes, bw, bh);
        gl.uniform1f(un.uTime, clock);
        gl.uniform3f(un.uBg, bg[0], bg[1], bg[2]);
        gl.uniform1f(un.uPaper, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      };

      raf = requestAnimationFrame(render);
      return () => {
        cancelAnimationFrame(raf);
        if (io) io.disconnect();
        pointer.dispose();
        target.dispose();
        gl.deleteVertexArray(vao);
        gl.deleteProgram(field);
        gl.deleteProgram(finish);
      };
    }, []);

    return <canvas ref={canvasRef} className="rib" aria-hidden="true" style={{ opacity: clampN(num(opacity, 60), 0, 100) / 100 }} />;
  };
})();

export default function SeaRingPortfolio({
  name = "studio",
  cards = DEFAULT_CARDS,
  headline = DEFAULT_HEADLINE,
  mediaMode = "images",
  cardImages = DEFAULT_NONE,
  cardVideos = DEFAULT_NONE,
  cardHeight = 160,
  cardWidthScale = 1,
  cornerRadius = 16,
  ringSpacing = 1,
  depth = 1,
  mobileDepth = 1,
  curve = 0,
  mobileCurve = 22,
  curveDirection = "hug",
  curveShade = 0.55,
  showNav = true,
  intro = true,
  autoSpin = true,
  spinSpeed = 0.3,
  paper = "#030204",
  ink = "#EEF4F6",
  accent = "#772DFF",
  glowColor = "#772DFF",
  ribbons = true,
  ribbonSpeed = 50,
  ribbonOpacity = 60,
  headlineColor = "#C19AFF",
  interactive = true,
  style = {},
}) {
  const rootRef = useRef(null);
  const view = "home"; // the section is a single view now
  const [capLen, setCapLen] = useState(0);
  // Bumped whenever the opening sequence has to start over from a clean state: it is toggled, or the
  // media mode changes (which reloads every poster). The loader and the engine are rebuilt on it.
  const [runKey, setRunKey] = useState(0);

  const sites = useMemo(() => {
    const isDefault = Array.isArray(cards) && cards.join("|") === DEFAULT_CARDS.join("|");
    return parseCards(mediaMode === "video" && isDefault ? DEFAULT_VIDEO_CARDS : cards, mediaMode, cardImages, cardVideos);
  }, [cards, mediaMode, cardImages, cardVideos]);
  const first = String(name).trim().split(/\s+/)[0] || "studio";
  const N = Math.max(1, sites.length);

  const propsRef = useRef({});
  propsRef.current = { sites, interactive, autoSpin, spinSpeed, intro, view, mediaMode, cardHeight, cardWidthScale, cornerRadius, ringSpacing, depth, mobileDepth, curve, mobileCurve, curveDirection, curveShade };
  const apiRef = useRef({});
  const viewRef = useRef(view);
  viewRef.current = view;

  const prevRun = useRef({ intro, mediaMode });
  useEffect(() => {
    const p = prevRun.current;
    if (p.intro !== intro || p.mediaMode !== mediaMode) {
      prevRun.current = { intro, mediaMode };
      setRunKey((k) => k + 1);
    }
  }, [intro, mediaMode]);

  // type the loader caption
  useEffect(() => {
    setCapLen(0);
    if (!intro) return;
    const full = "LOADING SITES";
    let i = 0;
    let iv;
    const t0 = setTimeout(() => {
      iv = setInterval(() => {
        i++;
        setCapLen(i);
        if (i >= full.length) clearInterval(iv);
      }, 45);
    }, 350);
    return () => {
      clearTimeout(t0);
      clearInterval(iv);
    };
  }, [intro, runKey]);

  // ── engine ────────────────────────────────────────────────────────────────
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const q = (k) => root.querySelector(`[data-k="${k}"]`);
    const qa = (k) => Array.from(root.querySelectorAll(`[data-k="${k}"]`));
    if (!document.querySelector("link[data-nrs-fonts]")) {
      const l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = FONTS_URL;
      l.setAttribute("data-nrs-fonts", "");
      document.head.appendChild(l);
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(pointer: fine)").matches;
    let dead = false;
    const timers = [];
    const later = (fn, ms) => {
      const t = setTimeout(fn, ms);
      timers.push(t);
      return t;
    };
    const cleanups = [];
    const on = (el, ev, fn, o) => {
      el.addEventListener(ev, fn, o);
      cleanups.push(() => el.removeEventListener(ev, fn, o));
    };

    // a previous run (React StrictMode mounts twice in development) may have left state behind
    root.classList.remove("intro", "revealed", "ready", "entered", "noIntro");
    const ld0 = q("loader");
    if (ld0) { ld0.style.display = ""; ld0.classList.remove("out"); }
    const fr0 = q("frame");
    if (fr0) fr0.classList.remove("open", "enter");
    const fly0 = q("fly");
    if (fly0) { fly0.style.display = "none"; fly0.getAnimations && fly0.getAnimations().forEach((a) => a.cancel()); }
    const wall0 = q("wall");
    if (wall0) wall0.classList.remove("drag");
    qa("card").forEach((c) => { c.style.display = ""; c.style.opacity = ""; c.style.transform = ""; });

    // ── size ──
    let W = 800, H = 600, phone = false, u = 1;
    let frameC = 0.5; // frame centre y (px, in root)
    let lastPhone = null;
    const measure = () => {
      const r = root.getBoundingClientRect();
      W = Math.max(1, r.width);
      H = Math.max(1, r.height);
      phone = W <= 820;
      u = phone ? W / 390 : Math.min(W, 1.6 * H) / 1440;
      root.classList.toggle("sm", phone);
      if (lastPhone !== null && lastPhone !== phone && typeof syncSlots === "function") syncSlots(true);
      lastPhone = phone;
      const st = root.style;
      st.setProperty("--u", u + "px");
      st.setProperty("--W", W + "px");
      st.setProperty("--H", H + "px");
      st.setProperty("--bw", W / 100 + "px");
      st.setProperty("--bh", H / 100 + "px");
      const fr = q("frame");
      if (fr && viewRef.current === "home") {
        const b = fr.getBoundingClientRect();
        frameC = b.top - r.top + b.height / 2;
        st.setProperty("--ft", -(b.top - r.top) + "px");
        st.setProperty("--fl", -(b.left - r.left) + "px");
        st.setProperty("--fr", -(r.right - b.right) + "px");
        st.setProperty("--fb", -(r.bottom - b.bottom) + "px");
      }
    };

    // ── ring state ──
    const wall = q("wall");
    const lens = q("lens");
    const ring = q("ring");
    const cardEls = qa("card");
    const slotSite = new Array(SLOTS).fill(-1);
    const sitesNowEarly = () => propsRef.current.sites;
    const cardApi = cardEls.map((el) => ({
      el,
      tilt: el.querySelector(".tilt"),
      face: el.querySelector(".face"),
      holder: el.querySelector(".curve"),
      img: el.querySelector("img"),
      vid: el.querySelector("video"),
      title: el.querySelector(".bar b"),
      world: el.querySelector(".bar small"),
      num: el.querySelector(".chip span"),
      rx: spring(0, 180, 24), ry: spring(0, 180, 24), tz: spring(0, 180, 24),
      want: false,
      vidSrc: "",
    }));
    // Bends a card like a section of a cylinder: many thin vertical slices laid along a circular arc, each
    // showing its own part of the picture. "hug" curves the edges toward the viewer (following the ring);
    // "bulge" curves them away.
    let curveK = 0; // 0 = flat (loader) .. 1 = full curve; follows the ring's expansion
    const curveDeg = () => {
      const P = propsRef.current;
      return clamp(num(phone ? P.mobileCurve : P.curve, 0), 0, 120);
    };
    // Sets how far a card is bent (kk 0..1 of its full curve), so the bend can grow smoothly while the
    // ring moves from the loader formation to its opened position instead of switching on at once.
    // Bent cards cannot show a <video> directly, so the playing clip is copied into each slice's canvas
    // (cover-fitted, ~30 fps, only for cards that are playing).
    const drawCurveVideo = (c) => {
      const m = c.cm;
      const v = c.vid;
      if (!m || !m.cv || v.readyState < 2 || !v.videoWidth) return;
      if (c.lastT === v.currentTime) return;
      c.lastT = v.currentTime;
      const sc = Math.max(m.w / v.videoWidth, m.h / v.videoHeight);
      const offX = (m.w - v.videoWidth * sc) / 2;
      const offY = (m.h - v.videoHeight * sc) / 2;
      for (let i = 0; i < m.sl.length; i++) {
        const sl = m.sl[i];
        if (!sl.cv) continue;
        const g = sl.cv.getContext("2d");
        if (m.vertical) g.drawImage(v, -offX / sc, (sl.p0 - offY) / sc, m.w / sc, sl.win / sc, 0, 0, sl.cv.width, sl.cv.height);
        else g.drawImage(v, (sl.p0 - offX) / sc, -offY / sc, sl.win / sc, m.h / sc, 0, 0, sl.cv.width, sl.cv.height);
      }
    };
    const applyCurve = (c, kk) => {
      const m = c.cm;
      c.ck = kk;
      if (!m) return;
      c.holder.style.setProperty("--ck", kk.toFixed(3));
      const dk = m.deg * kk;
      const R = dk > 0.01 ? m.len / (dk * DEG) : 0;
      // how far the bent edges stick out toward the viewer: a card whose edge would cross the camera plane is hidden
      c.lift = R && m.hug ? R * (1 - Math.cos(m.len / 2 / R)) : 0;
      // the hover content (chip, bar, dim) is flat, so it sits just in front of the nearest part of the bend
      c.face.style.setProperty("--lift", (3 + (R && m.hug ? R * (1 - Math.cos(m.len / 2 / R)) : 0)).toFixed(1) + "px");
      const sg = m.vertical ? (m.hug ? 1 : -1) : m.hug ? -1 : 1;
      for (let i = 0; i < m.sl.length; i++) {
        const { d, cc } = m.sl[i];
        let dd = 0, dz = 0, rot = 0;
        if (R) {
          const phi = cc / R;
          dd = R * Math.sin(phi) - cc;
          dz = m.hug ? R * (1 - Math.cos(phi)) : R * (Math.cos(phi) - 1);
          rot = sg * phi;
        }
        d.style.transform = m.vertical
          ? `translate3d(0,${dd}px,${dz}px) rotateX(${rot}rad)`
          : `translate3d(${dd}px,0,${dz}px) rotateY(${rot}rad)`;
      }
    };
    const buildCurve = (c, w, h, site) => {
      const holder = c.holder;
      if (!holder) return;
      holder.textContent = "";
      c.cm = null;
      const deg = curveDeg();
      const on = deg > 0.5;
      c.face.classList.toggle("curved", on);
      if (!on) return;
      const P = propsRef.current;
      const hug = P.curveDirection !== "bulge";
      const corner = clamp(num(P.cornerRadius, 16), 0, 60);
      // The bend follows the direction of travel: desktop moves sideways, so the card bends along its
      // width (vertical slices, curved left/right edges); phones move vertically, so it bends along its
      // height (horizontal slices, curved top/bottom edges) and the left/right edges stay straight.
      const shade = clamp(num(P.curveShade, 0.55), 0, 1) * 0.85;
      const vertical = phone;
      const len = vertical ? h : w;
      const n = clamp(Math.ceil(len / 6), 20, 48);
      const sw = len / n;
      const win = sw + 4;
      // in video mode each slice also carries a canvas that is fed the playing clip (see drawCurveVideo)
      const withVideo = P.mediaMode === "video" && !!(site && site.video);
      const meta = { sl: [], len, deg, hug, vertical, w, h, cv: withVideo };
      const frag = document.createDocumentFragment();
      for (let k = 0; k < n; k++) {
        const p0 = k * sw - 1.5;
        const cc = p0 + win / 2 - len / 2;
        const d = document.createElement("div");
        meta.sl.push({ d, cc });
        d.className = "sl";
        const p = document.createElement("div");
        p.className = "sp";
        if (vertical) {
          d.style.cssText = `left:0;width:100%;top:${p0}px;height:${win}px`;
          if (k === 0) d.style.borderRadius = `${corner}px ${corner}px 0 0`;
          else if (k === n - 1) d.style.borderRadius = `0 0 ${corner}px ${corner}px`;
          p.style.top = -p0 + "px";
        } else {
          d.style.cssText = `top:0;height:100%;left:${p0}px;width:${win}px`;
          if (k === 0) d.style.borderRadius = `${corner}px 0 0 ${corner}px`;
          else if (k === n - 1) d.style.borderRadius = `0 ${corner}px ${corner}px 0`;
          p.style.left = -p0 + "px";
        }
        p.style.width = w + "px";
        p.style.height = h + "px";
        d.appendChild(p);
        if (withVideo) {
          const cvs = document.createElement("canvas");
          cvs.className = "vc";
          cvs.width = Math.max(1, Math.round(vertical ? w : win));
          cvs.height = Math.max(1, Math.round(vertical ? win : h));
          if (vertical) cvs.style.top = -0 + "px";
          d.appendChild(cvs);
          meta.sl[meta.sl.length - 1].cv = cvs;
          meta.sl[meta.sl.length - 1].p0 = p0;
          meta.sl[meta.sl.length - 1].win = win;
        }
        // Lighting follows the bend. The light comes from the top (phones) or the right (desktop), so the
        // part of the arc that faces it is brightened and the part turned away is darkened; both grow
        // toward the edges, plus a little occlusion shadow at the very rim. A concave card (hug) faces
        // its edges inward, a bulging card faces them outward, so the lit side swaps.
        // Each slice carries a gradient across its own width (not one flat value), so the lighting
        // changes smoothly over the whole card and no strips show.
        const dark = (t) => {
          const at = Math.min(1, Math.abs(t));
          const facing = (hug === vertical ? t : -t) > 0 ? 1 : -1; // 1 = turned toward the light
          return shade * (Math.pow(at, 1.7) * (facing > 0 ? 0.35 : 1.05) + 0.3 * Math.pow(at, 5));
        };
        const lite = (t) => {
          const at = Math.min(1, Math.abs(t));
          return (hug === vertical ? t : -t) > 0 ? shade * 0.3 * Math.pow(at, 1.4) : 0;
        };
        const t0 = (p0 + 1.5 - len / 2) / (len / 2);
        const t1 = (p0 + win - 1.5 - len / 2) / (len / 2);
        const dir = vertical ? "to bottom" : "to right";
        const sh = document.createElement("div");
        sh.className = "sh";
        sh.style.background = `linear-gradient(${dir},rgba(0,0,0,${dark(t0).toFixed(3)}),rgba(0,0,0,${dark(t1).toFixed(3)}))`;
        const hl = document.createElement("div");
        hl.className = "hl";
        hl.style.background = `linear-gradient(${dir},rgba(255,255,255,${lite(t0).toFixed(3)}),rgba(255,255,255,${lite(t1).toFixed(3)}))`;
        d.appendChild(hl);
        d.appendChild(sh);
        frag.appendChild(d);
      }
      if (!vertical) {
        const rf = document.createElement("div");
        rf.className = "rf";
        frag.appendChild(rf);
      }
      holder.appendChild(frag);
      c.cm = meta;
      applyCurve(c, curveK);
    };
    const applySite = (e, idx) => {
      const sites = propsRef.current.sites;
      const s = sites[idx];
      const c = cardApi[e];
      if (!s || !c) return;
      slotSite[e] = idx;
      const P0 = propsRef.current;
      const ch = clamp(num(P0.cardHeight, 160), 60, 420);
      const w = ch * CARD_RATIO * clamp(num(P0.cardWidthScale, 1), 0.4, 2);
      c.el.style.height = ch + "px";
      c.el.style.top = -ch / 2 + "px";
      c.el.style.width = w + "px";
      c.el.style.left = -w / 2 + "px";
      c.el.dataset.world = s.world;
      c.el.style.setProperty("--wc", WORLDS[s.world].color);
      c.el.style.setProperty("--on", WORLDS[s.world].on);
      c.el.href = s.link || "#";
      if (s.link) { c.el.target = "_blank"; c.el.rel = "noopener"; } else { c.el.removeAttribute("target"); }
      c.img.src = s.poster || "";
      c.el.style.setProperty("--poster", `url("${s.poster || ""}")`);
      buildCurve(c, w, ch, s);
      c.title.textContent = s.title;
      c.world.textContent = WORLDS[s.world].label;
      c.num.textContent = "No. " + String(s.num).padStart(2, "0");
      c.face.classList.remove("vplay");
      c.lastT = -1;
      if (c.vidSrc) {
        c.vid.pause();
        c.vid.removeAttribute("src");
        c.vid.load();
        c.vid.classList.remove("on");
        c.vidSrc = "";
      }
    };
    const syncSlots = (force) => {
      const N2 = Math.max(1, propsRef.current.sites.length);
      for (let e = 0; e < SLOTS; e++) {
        const idx = ((e + Math.min(3, N2 - 1)) % N2 + N2) % N2;
        if (force || slotSite[e] < 0) applySite(e, idx);
      }
    };
    apiRef.current.sync = () => syncSlots(true);

    let rot = spring(0, 150, 27); // displayed rotation follows target
    let formation = 0; // intro
    let exp = 0; // expansion
    let introDone = false;
    let interactiveOn = false;
    let revealed = false;
    let drag = null;
    let dragMoved = false;
    let lastDragEnd = -1e9;
    let hoverCard = false;
    let ease = 1;
    let pointer = { x: -1, y: -1, nx: 0, ny: 0, has: false };
    const par = { x: spring(0, 40, 18), y: spring(0, 40, 18) };
    let frameNo = 0;
    let focusIn = false;

    const finishIntro = () => {
      formation = 1;
      exp = 1;
      revealed = true;
      introDone = true;
      interactiveOn = true;
      root.classList.add("revealed", "ready", "entered");
      const fr = q("frame");
      fr && fr.classList.remove("open", "enter");
      const ld = q("loader");
      ld && (ld.style.display = "none");
      const fl = q("fly");
      fl && (fl.style.display = "none");
      measure();
    };
    const state = { skip: finishIntro };

    // ── intro ──
    const useIntro = propsRef.current.intro && !reduced && propsRef.current.interactive !== false;
    let t0 = performance.now();
    let tReveal = 0;
    let tForm = 0; // intro clock in ms, advanced per frame (capped) so a long frame can't jump the animation
    let tRev = 0;
    let shown = 0;
    let posterLoaded = 0;
    const odoCols = qa("odo");
    const setOdo = (v) => {
      const val = Math.round(clamp(v, 0, 100));
      const d = [Math.floor(val / 100), Math.floor((val % 100) / 10), val % 10];
      odoCols.forEach((col, i) => {
        col.parentElement.classList.toggle("off", i < 2 && val < (i === 0 ? 100 : 10));
        col.style.transform = `translateY(${-d[i] * 10}%)`;
      });
    };
    let odoFrom = 0, odoTo = 0, odoT = 0, odoCur = 0;

    const sitesNow = () => propsRef.current.sites;
    const posters = () => {
      const s = sitesNow().slice(0, SLOTS);
      return s.map((x) => x.poster).filter(Boolean);
    };

    measure();
    syncSlots(true);
    if (!useIntro) {
      root.classList.add("noIntro");
      finishIntro();
      const ld = q("loader");
      ld && (ld.style.display = "none");
    } else {
      root.classList.add("intro");
      const fr = q("frame");
      fr && fr.classList.add("open");
      const list = posters();
      const total = Math.max(1, list.length);
      list.forEach((src) => {
        const im = new Image();
        const done = () => {
          if (dead) return;
          posterLoaded++;
          odoFrom = odoCur;
          odoTo = (posterLoaded / total) * 100;
          odoT = performance.now();
        };
        im.onload = done;
        im.onerror = done;
        im.src = src;
      });
      if (!list.length) posterLoaded = total;
      state.total = total;
      later(() => {
        if (!revealed) {
          posterLoaded = total;
          odoFrom = odoCur;
          odoTo = 100;
          odoT = performance.now();
        }
      }, 9000);
    }

    const startReveal = (now) => {
      revealed = true;
      tReveal = now;
      tRev = 0;
      const ld = q("loader");
      ld && ld.classList.add("out");
      later(() => ld && (ld.style.display = "none"), 1000);
      root.classList.add("revealed");
      const fr = q("frame");
      if (fr) {
        fr.classList.remove("open");
        fr.classList.add("enter");
        later(() => fr.classList.remove("enter"), 1150);
      }
      // the loader name flies into the nav wordmark
      const src = q("ldFirst");
      const dst = q("wmFirst");
      const fly = q("fly");
      if (src && dst && fly && !reduced && dst.getBoundingClientRect().width > 0) {
        const a = src.getBoundingClientRect();
        const b = dst.getBoundingClientRect();
        const rr = root.getBoundingClientRect();
        const fs0 = parseFloat(getComputedStyle(src).fontSize) || 64;
        const fs1 = parseFloat(getComputedStyle(dst).fontSize) || 40;
        fly.textContent = src.textContent;
        fly.style.fontSize = fs0 + "px";
        fly.style.display = "block";
        fly.style.left = a.left - rr.left + "px";
        fly.style.top = a.top - rr.top + "px";
        const k = fs1 / fs0;
        const an = fly.animate(
          [{ transform: "translate(0,0) scale(1)" }, { transform: `translate(${b.left - a.left}px,${b.top - a.top}px) scale(${k})` }],
          { duration: 1300, easing: "cubic-bezier(.65,0,.35,1)", fill: "forwards" }
        );
        an.onfinish = () => {
          root.classList.add("ready");
          fly.style.display = "none";
        };
      } else root.classList.add("ready");
    };

    // ── input: wheel over the ring, drag, pointer ──
    on(root, "pointermove", (e) => {
      const r = root.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
      pointer.nx = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
      pointer.ny = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
      pointer.has = true;
      if (fine && !reduced) {
        par.x.t = pointer.nx;
        par.y.t = pointer.ny;
      }
    });
    on(wall, "wheel", (e) => {
      if (!propsRef.current.interactive || !interactiveOn || viewRef.current !== "home") return;
      if (e.ctrlKey || e.metaKey) return;
      e.preventDefault();
      const d0 = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      const d = d0 * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? H : 1);
      // vertical wheel: scrolling down moves the cards up, like content
      rot.t += (phone ? -0.5 : 0.5) * clamp(d, -480, 480);
      if (reduced) rot.x = rot.t;
    }, { passive: false });
    on(wall, "pointerdown", (e) => {
      if (!propsRef.current.interactive || !interactiveOn || (e.pointerType === "mouse" && e.button !== 0)) return;
      drag = { x: e.clientX, y: e.clientY, m0: rot.t, id: e.pointerId };
      dragMoved = false;
    });
    on(window, "pointermove", (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      const dd = phone ? dy : Math.abs(dx) >= Math.abs(dy) ? dx : dy;
      if (Math.abs(dd) > 4 && !dragMoved) {
        dragMoved = true;
        wall.classList.add("drag");
      }
      if (dragMoved) {
        rot.t = drag.m0 + 0.2 * dd;
        if (reduced) rot.x = rot.t;
      }
    });
    const endDrag = () => {
      if (!drag) return;
      if (dragMoved) lastDragEnd = performance.now();
      drag = null;
      wall.classList.remove("drag");
    };
    on(window, "pointerup", endDrag);
    on(window, "pointercancel", endDrag);
    on(wall, "click", (e) => {
      const ca = e.target.closest && e.target.closest("a.card");
      if (ca && ca.getAttribute("href") === "#") e.preventDefault();
      if (performance.now() - lastDragEnd < 50) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);
    on(wall, "focusin", () => (focusIn = true));
    on(wall, "focusout", () => (focusIn = false));
    on(window, "keydown", (e) => {
      if (e.key === "Escape" && !introDone) finishIntro();
    });
    // per-card hover tilt
    cardApi.forEach((c) => {
      c.el.addEventListener("pointermove", (e) => {
        const r = c.el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        c.ry.t = 24 * x;
        c.rx.t = -20 * y;
        c.tz.t = 45;
      });
      c.el.addEventListener("pointerleave", () => {
        c.ry.t = c.rx.t = c.tz.t = 0;
      });
    });

    // ── videos ──
    const syncSea = () => {
      const on = propsRef.current.mediaMode === "video";
      qa("seaV").forEach((v) => {
        const mine = v.dataset.view === viewRef.current;
        if (on && mine && !reduced && document.visibilityState === "visible") {
          if (!v.getAttribute("src")) v.src = v.dataset.src;
          v.play().catch(() => {});
        } else if (!v.paused) v.pause();
      });
    };
    apiRef.current.syncSea = syncSea;
    on(document, "visibilitychange", syncSea);
    let lastView = "";

    // ── frame loop ──
    let raf = 0;
    let last = performance.now();
    let framePar = 0;
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000);
      const k = Math.min(3, (now - last) / 16.67);
      const stepMs = Math.min(100, now - last);
      last = now;
      const P = propsRef.current;
      if (viewRef.current !== lastView) {
        lastView = viewRef.current;
        syncSea();
        measure();
      }
      // intro clock
      if (!introDone) {
        if (useIntro && !revealed) {
          tForm += stepMs;
          formation = clamp(tForm / 2600);
          // odometer tween
          const t = clamp((now - odoT) / 650);
          odoCur = odoFrom + (odoTo - odoFrom) * (1 - Math.pow(1 - t, 3));
          setOdo(odoCur);
          const total = state.total || 1;
          if (formation >= 1 && posterLoaded >= total) startReveal(now);
        }
        if (revealed && useIntro) {
          tRev += stepMs;
          exp = EXPAND(clamp(tRev / 1900));
          if (tRev >= 1050) root.classList.add("entered");
          if (tRev >= 1900) {
            introDone = true;
            interactiveOn = true;
            exp = 1;
          }
        }
      }
      const homeOn = viewRef.current === "home";
      if (homeOn) {
        frameNo++;
        // hover over a card slows the spin
        if (frameNo % 3 === 0 && pointer.has) {
          const el = document.elementFromPoint(pointer.x + root.getBoundingClientRect().left, pointer.y + root.getBoundingClientRect().top);
          hoverCard = !!(el && el.closest && el.closest(".card") && root.contains(el));
        }
        ease += ((hoverCard ? 0.2 : 1) - ease) * Math.min(1, 0.08 * k);
        if (!drag && !focusIn && !reduced && P.autoSpin) {
          const sp = num(P.spinSpeed, 0.3);
          const dir = phone ? -1 : 1; // vertical wheel flows upward
          if (revealed) rot.t += dir * sp * (introDone ? 1 : 0.5 + 0.5 * exp) * ease * k;
        }
        if (reduced) rot.x = rot.t;
        else stepSpring(rot, dt);
        layoutRing(now, dt);
      }
      // pointer parallax
      if (fine && !reduced) {
        stepSpring(par.x, dt);
        stepSpring(par.y, dt);
        if (!settled(par.x) || !settled(par.y) || framePar++ < 2) {
          qa("depth").forEach((el) => {
            const d = num(el.dataset.depth, 0);
            el.style.transform = `translate(${-par.x.x * d}px,${-par.y.x * d * 0.5}px)`;
          });
        }
      }
    };

    const layoutRing = (now, dt) => {
      const sites = propsRef.current.sites;
      const N2 = Math.max(1, sites.length);
      const e = exp;
      // Phones: the ring turns about the HORIZONTAL axis, so the cards travel up and down (a vertical
      // wheel) while each card stays landscape. It is also tighter and deeper once open: a smaller
      // radius, a closer camera and the front of the ring pushed toward the viewer. Desktop keeps the
      // original horizontal ring.
      const vert = phone;
      const PP = propsRef.current;
      const spacing = clamp(num(PP.ringSpacing, 1), 0.4, 2.5);
      // depth is set separately for desktop (the ring travels sideways) and phones (it travels up and down),
      // and scales with the length of the screen along that travel axis so it feels alike on every device
      const axis = vert ? H : W;
      const wf = Math.sqrt(clamp(axis / (vert ? 640 : 1280), 0.7, 1.4));
      // Depth only changes the perspective strength (a nearer camera = a deeper, more dramatic ring); the ring
      // size and its push toward you stay as set. It is scaled by the screen length along the travel axis (wf).
      const dep = clamp(num(vert ? PP.mobileDepth : PP.depth, 1), 0.3, 3) * wf;
      // The ring grows with the cards: its radius, camera distance and push scale with the card size along the
      // direction of travel (the card's width on desktop, its height on phones), so the gaps between cards stay in
      // proportion at any card size.
      const cardH = clamp(num(PP.cardHeight, 160), 60, 420);
      const sizeK = vert ? cardH / 160 : (cardH * CARD_RATIO * clamp(num(PP.cardWidthScale, 1), 0.4, 2)) / (160 * CARD_RATIO);
      const endR = (vert ? 560 : 1800) * spacing * sizeK;
      const endP = ((vert ? 420 : 760) / dep) * sizeK;
      const endTilt = 0;
      const endScale = vert ? 1.05 : 2.3;
      const push = vert ? 240 * sizeK * e : 0;
      // the forming ring is leaned over: about X on desktop, about Y for the vertical wheel
      const tilt = vert ? 0 : -22 * (1 - e);
      const tiltV = vert ? 22 * (1 - e) + endTilt * e : 0;
      const tr = (vert ? tiltV : tilt) * DEG;
      const radius = 460 * sizeK + (endR - 460 * sizeK) * e;
      const anchor = vert ? 0 : -radius * Math.sin(tr) + 460 * sizeK * Math.sin(-22 * DEG) * (1 - e);
      const persp = 1000 * sizeK + (endP - 1000 * sizeK) * e;
      const roll = vert ? 16 * (1 - e) : -20 * (1 - e);
      const s0 = vert ? 0.78 : 0.52; // phones: a bit larger cards in the loading ring
      const cardScale = s0 + (endScale - s0) * e * e;
      const wallScale = phone ? 0.8 : H <= 760 ? 0.9 : 1.1;
      const fit = Math.min(1.05, (W - 32) / 1240, (0.66 * H) / 800) / wallScale;
      const A = wallScale * (fit + (1 - fit) * e);
      const introOff = (vert ? 0.5 : 0.44) * H - frameC; // phones: the loading ring sits at the centre
      lens.style.perspective = persp * A + "px";
      lens.style.perspectiveOrigin = `50% calc(50% + ${introOff * (1 - e)}px)`;
      const off = introOff * (1 - e) + anchor * A;
      const ix = vert ? 0 : 160 * Math.sin(roll * DEG) * A; // phones: stay on the centre line
      const s = wallScale * (fit + (1 - fit) * e);
      ring.style.transform = vert
        ? `translate3d(${ix}px,${off}px,${push}px) rotateZ(${roll}deg) rotateY(${tiltV}deg) scale3d(${s},${s},${A})`
        : `translate3d(${ix}px,${off}px,${push}px) rotateZ(${roll}deg) rotateX(${tilt}deg) scale3d(${s},${s},${A})`;
      // the ring starts turning the moment the opening begins (rot.x is 0 until then), so the motion
      // carries on from the loader into the opened ring with no jump or pause
      const rv = revealed ? rot.x : 0;
      curveK = Math.round(e * 30) / 30; // steps keep the per-frame work small while the bend grows
      for (let slot = 0; slot < SLOTS; slot++) {
        const c = cardApi[slot];
        const raw = (360 * slot) / SLOTS + rv + 180;
        const a0 = Math.floor(raw / 360);
        const r = mod(raw, 360) - 180;
        if (revealed) {
          const want = mod(slot - a0 * SLOTS + Math.min(3, N2 - 1), N2);
          if (slotSite[slot] !== want) applySite(slot, want);
        }
        const n = mod(r + 180, 360);
        const a = n / 360;
        const i = clamp((formation - 0.7 * a) / 0.3);
        const sm = 1 - Math.pow(1 - i, 3);
        const l = -180 + n * sm;
        const cr = radius - (1 - sm) * a * 24;
        const x = vert ? 0 : -Math.sin(l * DEG) * cr;
        const y = vert ? Math.sin(l * DEG) * cr : 0;
        const z = -Math.cos(l * DEG) * cr;
        const appear = Math.min(1, 2.5 * i);
        // cards on the far side of the opened ring fade out as it opens (no pop when the intro ends)
        const far = revealed && Math.abs(r) > 96;
        const farFade = far ? Math.max(0, 1 - e * 1.25) : 1;
        // a card whose edge gets close to the camera plane is hidden early: near it the 3D projection clips the card
        // into stray shapes (e.g. a white square at the centre) that grow as the depth is increased
        const hidden = (z + push) * Math.cos(tr) >= persp * 0.6 - (c.lift || 0) * 1.5 || (far && farFade <= 0.01);
        const el = c.el;
        if (hidden) {
          if (el.style.display !== "none") el.style.display = "none";
          c.want = false;
          c.pre = false;
        } else {
          if (el.style.display === "none") el.style.display = "";
          el.style.transform = vert
            ? `translate3d(0,${y}px,${z}px) rotateX(${l}deg) scale(${cardScale})`
            : `translate3d(${x}px,0,${z}px) rotateY(${l}deg) scale(${cardScale})`;
          el.style.opacity = appear * farFade;
          c.face.style.transform = z > (radius * radius) / persp ? (vert ? "rotateX(180deg)" : "rotateY(180deg)") : "";
          if (c.cm && c.ck !== curveK) applyCurve(c, curveK);
          const vOk = exp > 0.9 && !reduced && document.visibilityState === "visible";
          c.pre = vOk && Math.abs(r) <= 150; // start loading before the card turns to face you, never mid-motion
          c.want = vOk && Math.abs(r) <= 100; // every card you can see plays
        }
        // hover tilt springs
        if (!settled(c.rx) || !settled(c.ry) || !settled(c.tz)) {
          stepSpring(c.rx, dt);
          stepSpring(c.ry, dt);
          stepSpring(c.tz, dt);
          c.tilt.style.transform = `translateZ(${c.tz.x}px) rotateX(${c.rx.x}deg) rotateY(${c.ry.x}deg)`;
        }
        // preview videos: play only when on screen
        if (c.pre && !c.vidSrc) {
          const st = sites[slotSite[slot]];
          if (st && st.video) {
            c.vidSrc = st.video;
            c.vid.src = st.video;
          }
        }
        if (c.vidSrc) {
          if (c.want && c.vid.paused) c.vid.play().catch(() => {});
          else if (!c.want && !c.vid.paused) c.vid.pause();
          if (c.want && c.cm && c.cm.cv && !c.vid.paused && (frameNo & 1) === 0) drawCurveVideo(c);
        }
      }
    };
    cardApi.forEach((c, e) => {
      c.vid.addEventListener("playing", () => {
        c.vid.classList.add("on");
        if (c.cm && c.cm.cv) c.face.classList.add("vplay");
      });
      c.vid.addEventListener("error", () => {
        c.vid.classList.remove("on");
        c.face.classList.remove("vplay");
      });
      c.img.addEventListener("error", () => {
        const st = sitesNowEarly()[slotSite[e]];
        if (st && c.img.getAttribute("src") !== st.ph) {
          c.img.src = st.ph;
          c.el.style.setProperty("--poster", `url("${st.ph}")`);
        }
      });
    });

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    cleanups.push(() => ro.disconnect());
    syncSea();
    raf = requestAnimationFrame(tick);
    on(q("skip") || root, "click", () => !introDone && finishIntro());

    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      cleanups.forEach((f) => f());
      cardApi.forEach((c) => {
        try { c.vid.pause(); c.vid.removeAttribute("src"); c.vid.load(); } catch (er) { /* ignore */ }
      });
      qa("seaV").forEach((v) => { try { v.pause(); } catch (er) { /* ignore */ } });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runKey]);

  // keep the ring's slots in step with an edited card list or media mode
  useEffect(() => {
    if (apiRef.current.sync) apiRef.current.sync();
  }, [sites, cardHeight, cardWidthScale, cornerRadius, curve, mobileCurve, curveDirection, curveShade]);
  useEffect(() => {
    if (apiRef.current.syncSea) apiRef.current.syncSea();
  }, [mediaMode, view]);

  const petals = (list, front) =>
    list.map(([l, t, w, d, dl], i) => (
      <span
        key={(front ? "f" : "b") + i}
        className={"petal" + (i % 3 === 0 ? " m" : "")}
        style={{ left: `${l}%`, top: `${t}%`, "--w": `${w}px`, "--dur": `${d}s`, "--dl": `${dl}s`, "--pc": front ? FRONT_COLORS[i] : i % 2 === 0 ? "#FFFFFF" : "#D6EEF3" }}
      />
    ));
  const motes = MOTES.map(([l, t, w, d, dl], i) => (
    <span key={i} className="mote" style={{ left: `${l}%`, top: `${t}%`, "--w": `${w}px`, "--dur": `${d}s`, "--dl": `${dl}s` }} />
  ));

  const scene = () => (
    <div className="scene" data-k="depth" data-depth="10">
      <div className="glow" />
      {ribbons ? <RibbonBeam c1={glowColor} c2={headlineColor} speed={ribbonSpeed} opacity={ribbonOpacity} hover={35} reach={170} /> : null}
      <div className="grain" />
    </div>
  );

  return (
    <div
      ref={rootRef}
      className="nrs"
      data-nav={showNav ? "1" : "0"}
      style={{ ...style, "--cr": `${clamp(num(cornerRadius, 16), 0, 60)}px`, "--paper": paper, "--ink": ink, "--accent": accent, "--glow": glowColor, "--htxt": headlineColor }}
    >
      <style>{CSS}</style>

      {/* loader */}
      {intro && (
        <div className="loader" data-k="loader" key={runKey}>
          <div className="ldName" aria-hidden="true">
            <span data-k="ldFirst" style={{ display: "flex" }}>
              {Array.from(first).map((ch, i) => (
                <span key={i} className="lm"><span style={{ "--d": `${0.1 + i * 0.08}s` }}>{ch}</span></span>
              ))}
            </span>
            <span className="lm ldDot"><span style={{ "--d": `${0.1 + first.length * 0.08}s` }}>.</span></span>
          </div>
          <div className="ldCap">
            <div className="cap">{"LOADING SITES".slice(0, capLen)}</div>
            <div className="odo">
              <div className="inner">
                {[0, 1, 2].map((i) => (
                  <span key={i} className={"dg" + (i < 2 ? " off" : "")}>
                    <span className="col" data-k="odo">
                      {Array.from({ length: 10 }, (_, d) => <span key={d}>{d}</span>)}
                    </span>
                  </span>
                ))}
                <small>%</small>
              </div>
            </div>
          </div>
          <button className="skip" data-k="skip" aria-label="Skip intro">↗</button>
        </div>
      )}
      <div className="fly" data-k="fly" style={{ display: "none" }} />

      {/* nav */}
      <nav className="nav">
        <a className="wm" aria-label={name}>
          <span className="wmFirst" data-k="wmFirst">{first}</span>
          <span className="wmRest">.</span>
        </a>
      </nav>

      {/* HOME */}
      <section className={"view home" + (view === "home" ? " on" : "")}>
        <div className="stage">
          <div className="frame" data-k="frame">
            {scene()}
            <div className="bt" aria-hidden="true">
              {(Array.isArray(headline) ? headline : DEFAULT_HEADLINE).slice(0, 2).map((t, i) => (
                <span key={i}>{t}</span>
              ))}
            </div>
            <div className="fx" data-k="depth" data-depth="22">{petals(PETALS_BACK, false)}</div>
            <div className="wall" data-k="wall">
              <div className="lens" data-k="lens">
                <div className="rg3d" data-k="ring">
                  {Array.from({ length: SLOTS }, (_, e) => {
                    const idx = ((e + Math.min(3, N - 1)) % N + N) % N;
                    const s = sites[idx];
                    const chh = clamp(num(cardHeight, 160), 60, 420);
                    const w = chh * CARD_RATIO * clamp(num(cardWidthScale, 1), 0.4, 2);
                    const wc = WORLDS[s ? s.world : "brand"];
                    return (
                      <a key={e} className="card" data-k="card" data-world={s ? s.world : "brand"} href={s && s.link ? s.link : "#"} target={s && s.link ? "_blank" : undefined} rel="noopener" style={{ width: w, left: -w / 2, height: chh, top: -chh / 2, "--wc": wc.color, "--on": wc.on }}>
                        <div className="tilt">
                          <div className="cframe" />
                          <div className="face">
                            <div className="curve" />
                            <img src={s ? s.poster : ""} alt="" draggable="false" />
                            <video muted loop playsInline preload="auto" />
                            <div className="chip"><i /><span>{s ? "No. " + String(s.num).padStart(2, "0") : ""}</span></div>
                            <div className="dim" />
                            <div className="bar">
                              <div>
                                <small>{wc.label}</small>
                                <b>{s ? s.title : ""}</b>
                              </div>
                              <em>↗</em>
                            </div>
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>
            <div data-k="depth" data-depth="34" style={{ position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none" }}><div className="mist" /></div>
            <div className="fx" data-k="depth" data-depth="48" style={{ zIndex: 3 }}>{petals(PETALS_FRONT, true)}</div>
            <div className="fx" data-k="depth" data-depth="40" style={{ zIndex: 4 }}>{motes}</div>
          </div>
        </div>
      </section>

    </div>
  );
}

