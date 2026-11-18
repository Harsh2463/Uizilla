import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

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
const SEA_IMG = proxy(CF + "hf_20261111_224417_17e8d78c-9384-4a50-93b4-92510f1957db.png", 2048);
const SEA_VID = CF + "hf_20261111_232613_bf108dd9-dc98-4729-9163-748475f20b61.mp4";
const FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Geist+Mono:wght@100..900&family=Geist:wght@100..900&family=Newsreader:wght@300..500&display=swap";

const DEFAULT_SENTENCE =
  "I craft products for [startups|build],\\nshowreels for [labels|brand] and free toolkits\\nfor [learners|learn]. Or just [chat with Noa|ai].";
const DEFAULT_STATS = ["11.4M+ | PLAYS", "38.2K | COMMUNITY", "24.9K | MEMBERS"];
const DEFAULT_COMPANIES = ["Fernway", "Quill Labs"];
// "Title | video | poster | width x height | world | link slug"
const DEFAULT_CARDS = [
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
  build: { label: "BUILD", color: "#3AA8D0", on: "#04121A", blurb: "Software for startups, from first sketch to a shipped product." },
  brand: { label: "BRAND", color: "#EEF4F6", on: "#0A0E11", blurb: "Showreels and launch sites for labels that want to move." },
  learn: { label: "LEARN", color: "#9ED8E4", on: "#0E2A3B", blurb: "Free toolkits and breakdowns for learners, one site at a time." },
  ai: { label: "NOA'S ASSISTANT", color: "#9ED8E4", on: "#0A0E11", blurb: "Answers about projects, rates and timelines, in Noa's own words." },
};

// [left %, top %, width px, duration s, delay s]
const PETALS_BACK = [[4,14,9,29,0],[14,4,7,34,-12],[24,26,8,31,-21],[36,10,6,37,-5],[46,30,9,27,-16],[56,6,7,33,-27],[66,20,8,30,-9],[76,2,6,36,-24],[86,24,9,28,-3],[94,12,7,35,-18],[30,44,6,39,-31],[60,40,7,32,-13]];
const PETALS_FRONT = [[10,50,14,23,-6],[40,62,12,26,-19],[70,56,16,21,-11],[88,46,13,24,-2],[52,70,11,28,-23]];
const FRONT_COLORS = ["#D6EEF3", "#FFFFFF", "#FFFFFF", "#D6EEF3", "#D6EEF3"];
const MOTES = [[8,62,10,14,-2],[18,40,6,18,-9],[27,70,14,16,-5],[36,52,8,20,-13],[44,30,5,17,-3],[53,66,12,15,-11],[61,44,7,19,-7],[69,74,16,14,-1],[77,36,6,21,-15],[85,58,11,16,-8],[92,46,7,18,-4],[13,82,9,22,-17],[48,84,13,17,-6],[72,22,5,23,-19]];

const SLOTS = 16;

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
const SEA_PH =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='1600' height='900' viewBox='0 0 1600 900'><defs>" +
      "<linearGradient id='s' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#9fd6ea'/><stop offset='1' stop-color='#eaf7fb'/></linearGradient>" +
      "<linearGradient id='w' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#59bfe0'/><stop offset='1' stop-color='#1f7fa6'/></linearGradient>" +
      "<radialGradient id='u' cx='.7' cy='.18' r='.5'><stop offset='0' stop-color='#fff' stop-opacity='.95'/><stop offset='1' stop-color='#fff' stop-opacity='0'/></radialGradient></defs>" +
      "<rect width='1600' height='900' fill='url(#s)'/><rect width='1600' height='900' fill='url(#u)'/>" +
      "<rect y='420' width='1600' height='480' fill='url(#w)'/>" +
      "<g fill='none' stroke='#fff' stroke-opacity='.35' stroke-width='3'><path d='M0 520q100-24 200 0t200 0 200 0 200 0 200 0 200 0 200 0 200 0'/><path d='M0 620q100-30 200 0t200 0 200 0 200 0 200 0 200 0 200 0 200 0'/><path d='M0 740q100-36 200 0t200 0 200 0 200 0 200 0 200 0 200 0 200 0'/></g>" +
      "<g fill='#fff'><circle cx='120' cy='860' r='34'/><circle cx='210' cy='880' r='26'/><circle cx='330' cy='866' r='30'/><circle cx='1250' cy='872' r='32'/><circle cx='1390' cy='860' r='36'/><circle cx='1500' cy='884' r='28'/></g></svg>"
  );
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

function parseCards(list, mode) {
  const arr = (Array.isArray(list) ? list : []).map((l) => String(l)).filter((l) => l.trim());
  return arr.map((line, i) => {
    const p = line.split("|").map((x) => x.trim());
    const [title = `Site ${i + 1}`, video = "", poster = "", size = "1600x900", world = "brand", link = ""] = p;
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

/** "I craft [startups|build], …" → lines of tokens. A choice swallows the punctuation after it. */
function parseSentence(text) {
  const lines = String(text).replace(/\\n/g, "\n").split("\n");
  let wi = 0;
  let ci = 0;
  return lines.map((line) => {
    const toks = [];
    const re = /\[([^\]|]+)\|([a-z]+)\]([,.;:!?]*)/gi;
    let last = 0;
    let m;
    const words = (s) => s.split(/\s+/).filter(Boolean);
    while ((m = re.exec(line))) {
      words(line.slice(last, m.index)).forEach((w) => toks.push({ type: "w", text: w, i: wi++ }));
      const ws = words(m[1]);
      if (m[3] && ws.length) ws[ws.length - 1] += m[3];
      toks.push({ type: "c", world: WORLDS[m[2]] ? m[2] : "brand", words: ws.map((w) => ({ text: w, i: wi++ })), n: ++ci, i: wi });
      last = m.index + m[0].length;
    }
    words(line.slice(last)).forEach((w) => toks.push({ type: "w", text: w, i: wi++ }));
    return toks;
  });
}

const CSS = `
.nrs{--paper:#0A0E11;--deep:#111920;--surface:#141C22;--ink:#EEF4F6;--soft:#9FB4BF;--muted:#647C8A;--line:rgba(238,244,246,.14);--accent:#3AA8D0;--btn:#1E86AC;--btn2:#2597C0;--sage:#9ED8E4;--night:#05090C;--onsky:#0E2A3B;--ease:cubic-bezier(.22,1,.36,1);--serif:"Newsreader",Georgia,serif;--mono:"Geist Mono",ui-monospace,monospace;--sans:"Geist",system-ui,sans-serif;position:relative;width:100%;height:100%;overflow:hidden;background:var(--paper);color:var(--ink);font-family:var(--sans);-webkit-font-smoothing:antialiased;color-scheme:dark}
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
.nrs .links{display:flex;gap:calc(var(--u)*10);font-family:var(--mono);font-size:calc(var(--u)*13);letter-spacing:.1em;text-transform:uppercase;color:var(--soft);opacity:0;transition:opacity .9s}
.nrs.ready .links,.nrs.noIntro .links{opacity:1}
.nrs .links i{font-style:normal;color:var(--muted)}
.nrs .links a{position:relative;padding-bottom:3px;cursor:pointer}
.nrs .links a::after{content:"";position:absolute;left:0;right:0;bottom:0;height:1.5px;background:var(--accent);transform:scaleX(0);transform-origin:left;transition:transform .5s var(--ease)}
.nrs .links a:hover::after,.nrs .links a[aria-current=page]::after{transform:scaleX(1)}
.nrs .links a[aria-current=page]{color:var(--ink)}
.nrs[data-nav="0"] .nav{display:none}
/* views */
.nrs .view{position:absolute;inset:0;display:none;flex-direction:column;padding-top:calc(var(--u)*92);overflow-x:hidden;overflow-y:auto;scrollbar-width:none}
.nrs .view.home{overflow:hidden}
.nrs .view.on{display:flex}
.nrs .view.build.on{animation:nrsFade .6s both}
@keyframes nrsFade{from{opacity:0}to{opacity:1}}
.nrs .stage{flex:1;min-height:0;display:flex;flex-direction:column}
.nrs[data-nav="0"] .view{padding-top:0}
.nrs[data-nav="0"] .home .stage{padding-top:calc(var(--u)*18)}
/* top row */
.nrs .top{display:grid;grid-template-columns:1fr auto;column-gap:calc(var(--u)*40);padding:calc(var(--u)*8) calc(var(--u)*46) calc(var(--u)*26) calc(var(--u)*45);position:relative;z-index:4}
.nrs .sentence{font-family:var(--serif);font-weight:400;font-size:calc(var(--u)*45);line-height:calc(var(--u)*50);letter-spacing:-.005em;max-width:calc(var(--u)*800)}
.nrs .sentence .ln{display:block}
.nrs .wd{display:inline-block;overflow:hidden;padding-bottom:.08em;margin-bottom:-.08em;vertical-align:top;transition:opacity .4s}
.nrs .wd>span{display:inline-block;transform:translateY(110%);transition:transform .9s var(--ease);transition-delay:var(--d,0s),0s}
.nrs.entered .wd>span{transform:none}
.nrs.noIntro .wd>span{transform:none}
.nrs .choice{position:relative;display:inline;white-space:nowrap;cursor:pointer;font-weight:500}
.nrs .choice .mk{position:absolute;inset:.1em -.12em -.02em;background:var(--wc);transform:scaleX(0);transform-origin:left;transition:transform .5s var(--ease);z-index:-1;pointer-events:none}
.nrs .choice .ul{position:absolute;left:0;right:0;bottom:.02em;height:max(2px,.05em);background:var(--accent);transform:scaleX(0);transform-origin:left;transition:transform 1s var(--ease);transition-delay:calc(var(--d,0s) + .35s)}
.nrs.entered .choice .ul,.nrs.noIntro .choice .ul{transform:scaleX(1)}
.nrs .choice sup{font-family:var(--serif);font-size:max(10px,.34em);vertical-align:top;position:relative;top:-.05em;margin-left:.1em;color:var(--ink);opacity:0;transition:opacity .8s;transition-delay:calc(var(--d,0s) + .5s)}
.nrs.entered .choice sup,.nrs.noIntro .choice sup{opacity:1}
.nrs .sentence.hovering .wd{opacity:.28}
.nrs .sentence.hovering .choice.active .wd{opacity:1;color:var(--on)}
.nrs .sentence.hovering .choice.active .mk{transform:scaleX(1)}
.nrs .stats{display:flex;margin:0;border-left:1px solid var(--line);padding-left:calc(var(--u)*39);align-self:start}
.nrs .stat{padding:0 calc(var(--u)*28);border-left:1px solid var(--line);opacity:0;transform:translateY(14px)}
.nrs .stat:first-child{border-left:0;padding-left:0}
.nrs .stat:last-child{padding-right:0}
.nrs .stat b{display:block;font-family:var(--serif);font-weight:400;font-size:calc(var(--u)*38);line-height:1;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.nrs .stat span{display:block;margin-top:calc(var(--u)*14);font-family:var(--mono);font-size:calc(var(--u)*12);letter-spacing:.14em;text-transform:uppercase;color:var(--soft)}
.nrs.entered .stat,.nrs.noIntro .stat{opacity:1;transform:none;transition:opacity .9s var(--ease),transform .9s var(--ease)}
.nrs.entered .stat:nth-child(1),.nrs.noIntro .stat:nth-child(1){transition-delay:.35s}
.nrs.entered .stat:nth-child(2),.nrs.noIntro .stat:nth-child(2){transition-delay:.45s}
.nrs.entered .stat:nth-child(3),.nrs.noIntro .stat:nth-child(3){transition-delay:.55s}
/* frame */
.nrs .frame{position:relative;flex:1;min-height:0;margin:0 calc(var(--u)*16) calc(var(--u)*22);border-radius:calc(var(--u)*22);background:var(--deep);isolation:isolate;overflow:hidden;clip-path:inset(0 round calc(var(--u)*22));transition:clip-path 1.1s cubic-bezier(.5,0,.1,1)}
.nrs .frame.open{overflow:visible;background:transparent;z-index:101;clip-path:inset(var(--ft) var(--fr) var(--fb) var(--fl) round 0);transition:none}
.nrs .frame.enter{z-index:101;background:transparent}
.nrs .scene{position:absolute;inset:-4%;z-index:0;will-change:transform;transition:opacity .9s}
.nrs.intro:not(.revealed) .home .scene{opacity:0}
.nrs .scene img,.nrs .scene video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 62%}
.nrs .scene video{opacity:0;transition:opacity .8s}
.nrs .scene video.on{opacity:1}
.nrs .build .scene img,.nrs .build .scene video{object-position:50% 70%}
.nrs .grain{position:absolute;inset:-4%;background-image:${GRAIN};opacity:.07;mix-blend-mode:screen;pointer-events:none;animation:nrsJit .9s steps(5) infinite}
@keyframes nrsJit{0%{transform:translate(0,0)}20%{transform:translate(-3%,2%)}40%{transform:translate(2%,-3%)}60%{transform:translate(-1%,-2%)}80%{transform:translate(3%,1%)}100%{transform:translate(0,0)}}
.nrs .fx{position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .9s}
.nrs.revealed .fx,.nrs.noIntro .fx,.nrs .build .fx{opacity:1}
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
.nrs .ring{position:absolute;left:50%;top:50%;width:0;height:0;transform-style:preserve-3d}
.nrs .card{position:absolute;height:160px;top:-80px;transform-style:preserve-3d;opacity:0;display:block}
.nrs .tilt{position:absolute;inset:0;transform-style:preserve-3d}
.nrs .cframe{position:absolute;inset:-9px;border:3px solid var(--wc);border-radius:24px;box-shadow:0 40px 80px -30px var(--wc);clip-path:inset(0 100% 0 0 round 24px);transition:clip-path .55s var(--ease);pointer-events:none}
.nrs .card:hover .cframe{clip-path:inset(0 0 0 0 round 24px)}
.nrs .face{position:absolute;inset:0;border-radius:16px;overflow:hidden;backface-visibility:hidden;background:var(--onsky);box-shadow:0 18px 36px -24px rgba(0,0,0,.45);-webkit-box-reflect:below 10px linear-gradient(transparent 52%,rgba(255,255,255,.32))}
.nrs .face img,.nrs .face video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.nrs .face video{opacity:0;transition:opacity .4s}
.nrs .face video.on{opacity:1}
.nrs .chip{position:absolute;left:14px;bottom:14px;display:flex;align-items:center;gap:7px;padding:5px 11px;border-radius:99px;background:rgba(0,0,0,.45);color:#fff;font-family:var(--mono);font-size:13px;transition:opacity .3s}
.nrs .chip i{width:6px;height:6px;border-radius:50%;background:var(--wc)}
.nrs .card:hover .chip{opacity:0}
.nrs .dim{position:absolute;inset:0;background:var(--paper);opacity:0;transition:opacity .4s;pointer-events:none}
.nrs[data-focus=build] .card:not([data-world=build]) .dim,.nrs[data-focus=brand] .card:not([data-world=brand]) .dim,.nrs[data-focus=learn] .card:not([data-world=learn]) .dim{opacity:.6}
.nrs .bar{position:absolute;left:12px;right:12px;bottom:12px;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:11px 14px;border-radius:12px;background:var(--wc);color:var(--on);clip-path:inset(0 100% 0 0);transition:clip-path .5s var(--ease) .05s}
.nrs .card:hover .bar{clip-path:inset(0 0 0 0)}
.nrs .bar small{display:block;font-family:var(--mono);font-weight:500;font-size:12px;letter-spacing:.12em}
.nrs .bar b{display:block;font-family:var(--serif);font-weight:400;font-size:22px;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nrs .bar em{font-style:normal;transform:translate(-6px,6px);transition:transform .5s cubic-bezier(.34,1.56,.64,1) .15s;font-size:18px}
.nrs .card:hover .bar em{transform:none}
/* preview */
.nrs .pvAnchor{position:absolute;left:0;top:0;z-index:80;pointer-events:none;will-change:transform}
.nrs .pv{position:absolute;width:260px;border-radius:16px;background:var(--surface);box-shadow:0 30px 60px -28px #000,0 0 0 1px rgba(238,244,246,.1);overflow:hidden;opacity:0;transform:scale(.85);transition:opacity .25s,transform .35s var(--ease)}
.nrs .pv.on{opacity:1;transform:scale(1)}
.nrs .pv .med{height:146px;background:#0E2A3B center/cover}
.nrs .pv .med video{width:100%;height:100%;object-fit:cover;display:block}
.nrs .pv .meta{padding:12px 14px 14px;font-size:12px;line-height:1.5;color:var(--soft)}
.nrs .pv .meta p{margin:0;font-family:var(--mono);font-weight:500;font-size:11px;letter-spacing:.1em;color:var(--ink);display:flex;align-items:center;gap:8px;margin-bottom:4px}
.nrs .pv .meta p i{width:8px;height:8px;background:var(--wc)}
.nrs .pv.ai{background:var(--night)}
.nrs .pv.ai .med{display:none}
.nrs .pv .ask{display:none;padding:18px 16px 4px;font-family:var(--serif);font-size:28px;color:#fff;line-height:1.1}
.nrs .pv.ai .ask{display:block}
.nrs .pv .ask::after{content:"";display:inline-block;width:2px;height:.8em;margin-left:4px;background:var(--sage);vertical-align:-.05em;animation:nrsCaret 1s step-end infinite}
@keyframes nrsCaret{50%{opacity:0}}
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
/* build */
.nrs .build .panel{position:relative;flex:none;margin:calc(var(--u)*-15) calc(var(--u)*22) 0 calc(var(--u)*24);height:calc(var(--u)*716);border-radius:calc(var(--u)*24);clip-path:inset(0 round calc(var(--u)*24));overflow:hidden;background:var(--deep);display:flex;flex-direction:column;align-items:center}
.nrs .build h2{position:relative;z-index:2;margin:calc(var(--u)*86) 0 0;text-align:center;font-family:var(--serif);font-weight:460;font-size:calc(var(--u)*88);line-height:calc(var(--u)*76);letter-spacing:-.015em;color:var(--onsky)}
.nrs .build h2 .ln{display:block}
.nrs .build .wd>span{transition-duration:.8s}
.nrs .build.in .wd>span{transform:none}
.nrs .brief{position:relative;z-index:2;margin-top:calc(var(--u)*60);width:calc(var(--u)*542);padding:calc(var(--u)*28) calc(var(--u)*30) calc(var(--u)*25);border-radius:calc(var(--u)*16);background:color-mix(in srgb,var(--surface) 86%,transparent);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);box-shadow:0 40px 80px -40px rgba(0,0,0,.8),inset 0 0 0 1px rgba(238,244,246,.08);display:flex;flex-direction:column;gap:calc(var(--u)*14);opacity:0;transform:translateY(16px)}
.nrs .build.in .brief{opacity:1;transform:none;transition:opacity .9s var(--ease) .45s,transform .9s var(--ease) .45s}
.nrs .kick{font-family:var(--mono);font-size:calc(var(--u)*11);letter-spacing:.1em;text-transform:uppercase;color:var(--soft)}
.nrs .bs{font-family:var(--serif);font-size:calc(var(--u)*25.5);line-height:calc(var(--u)*41);color:var(--ink)}
.nrs .bs input{font:inherit;color:inherit;background:none;border:0;border-bottom:1.5px solid var(--muted);outline:0;padding:0 2px;text-align:left}
.nrs .bs input:focus{border-color:var(--accent)}
.nrs .bs input::placeholder{color:var(--muted)}
.nrs .bs .rg{display:inline}
.nrs .bs .rg button{position:relative;color:var(--muted);font:inherit;z-index:0}
.nrs .bs .rg button i{position:absolute;inset:.12em -.1em .04em;background:var(--btn);border-radius:.22em;transform:scaleX(0);transform-origin:left;transition:transform .5s var(--ease);z-index:-1}
.nrs .bs .rg button:hover i,.nrs .bs .rg button[aria-checked=true] i{transform:scaleX(1)}
.nrs .bs .rg button[aria-checked=true]{color:#fff}
.nrs .acts{display:flex;align-items:center;gap:calc(var(--u)*14)}
.nrs .gh{width:calc(var(--u)*44);height:calc(var(--u)*44);min-width:34px;min-height:34px;border-radius:50%;box-shadow:inset 0 0 0 1px var(--line);display:grid;place-items:center;color:var(--soft);transition:box-shadow .3s,color .3s}
.nrs .gh:hover{box-shadow:inset 0 0 0 1.5px var(--ink);color:var(--ink)}
.nrs .gh svg{width:calc(var(--u)*20);height:calc(var(--u)*20);min-width:16px;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round}
.nrs .send{height:calc(var(--u)*40);min-height:34px;padding:0 calc(var(--u)*22);border-radius:99px;background:var(--btn);color:#fff;font-family:var(--mono);font-size:calc(var(--u)*13);white-space:nowrap;transition:background .3s,transform .2s}
.nrs .send:hover{background:var(--btn2)}
.nrs .copied{font-family:var(--mono);font-size:calc(var(--u)*11);color:var(--accent)}
.nrs .worked{position:relative;padding:calc(var(--u)*24) calc(var(--u)*53) calc(var(--u)*26);opacity:0}
.nrs .build.in .worked{opacity:1;transition:opacity .9s .7s}
.nrs .worked .logos{display:flex;gap:calc(var(--u)*48);margin-top:calc(var(--u)*14);font-family:var(--serif);font-size:calc(var(--u)*27);color:var(--ink)}
.nrs .worked .logos span{display:flex;align-items:center;gap:calc(var(--u)*10)}
.nrs .worked svg{width:calc(var(--u)*42);height:calc(var(--u)*22);fill:none;stroke:var(--soft);stroke-width:1.6}
.nrs .vh{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
/* phone */
.nrs.sm .nav{height:64px;padding:0 16px}
.nrs.sm .view{padding-top:64px}
.nrs.sm .view.home{overflow-y:auto}
.nrs.sm .wm{font-size:24px}
.nrs.sm .links{font-size:11px;gap:7px}
.nrs.sm .top{grid-template-columns:1fr;row-gap:14px;padding:4px 16px 16px}
.nrs.sm .sentence{font-size:clamp(26px,7.4vw,32px);line-height:1.12;max-width:none}
.nrs.sm .sentence .ln{display:inline}
.nrs.sm .choice sup{display:none}
.nrs.sm .stats{border-left:0;padding-left:0}
.nrs.sm .stat{padding:0 16px 0 16px;border-left:1px solid var(--line)}
.nrs.sm .stat:first-child{padding-left:0;border-left:0}
.nrs.sm .stat b{font-size:26px}
.nrs.sm .stat span{font-size:10px;margin-top:6px}
.nrs.sm .frame{margin:0 10px 10px;border-radius:20px;clip-path:inset(0 round 20px)}
.nrs.sm .frame.open{clip-path:inset(var(--ft) var(--fr) var(--fb) var(--fl) round 0)}
.nrs.sm .build .panel{margin:0 10px;height:auto;min-height:calc(var(--H) - 170px);padding-bottom:22px;border-radius:20px;clip-path:inset(0 round 20px)}
.nrs.sm .build h2{font-size:46px;line-height:42px;margin-top:34px;padding:0 12px}
.nrs.sm .brief{width:calc(100% - 24px);padding:20px 18px;border-radius:14px;gap:12px;margin-top:30px}
.nrs.sm .kick{font-size:10px}
.nrs.sm .bs{font-size:22px;line-height:36px}
.nrs.sm .gh{width:40px;height:40px}
.nrs.sm .send{height:40px;font-size:12px;padding:0 18px}
.nrs.sm .worked{padding:18px 20px 24px}
.nrs.sm .worked .logos{font-size:22px;gap:28px}
.nrs.sm .worked svg{width:34px}
@media (prefers-reduced-motion:reduce){.nrs *{animation:none!important;transition:none!important}.nrs .loader{display:none}}
`;

export default function SeaRingPortfolio({
  name = "Noa Ellsworth",
  sentence = DEFAULT_SENTENCE,
  stats = DEFAULT_STATS,
  cards = DEFAULT_CARDS,
  seaImage = SEA_IMG,
  seaVideo = SEA_VID,
  mediaMode = "video",
  buildLine1 = "I take startups",
  buildLine2 = "from sketch to ship.",
  email = "me@noaellsworth.com",
  companies = DEFAULT_COMPANIES,
  showNav = true,
  intro = true,
  autoSpin = true,
  spinSpeed = 0.3,
  paper = "#0A0E11",
  ink = "#EEF4F6",
  accent = "#3AA8D0",
  buttonColor = "#1E86AC",
  interactive = true,
  style = {},
}) {
  const rootRef = useRef(null);
  const [view, setView] = useState("home");
  const [hover, setHover] = useState(null); // { world, n }
  const [what, setWhat] = useState("");
  const [who, setWho] = useState("");
  const [when, setWhen] = useState("in 6 weeks");
  const [note, setNote] = useState("");
  const [capLen, setCapLen] = useState(0);
  const [bump, setBump] = useState(0);
  // Bumped whenever the opening sequence has to start over from a clean state: it is toggled, or the
  // media mode changes (which reloads every poster). The loader and the engine are rebuilt on it.
  const [runKey, setRunKey] = useState(0);

  const sites = useMemo(() => parseCards(cards, mediaMode), [cards, mediaMode]);
  const lines = useMemo(() => parseSentence(sentence), [sentence]);
  const statList = useMemo(
    () => (Array.isArray(stats) ? stats : []).map((l) => String(l).split("|").map((x) => x.trim())).filter((p) => p[0]).slice(0, 4),
    [stats]
  );
  const first = String(name).trim().split(/\s+/)[0] || "Noa";
  const rest = String(name).trim().slice(first.length);
  const N = Math.max(1, sites.length);

  const propsRef = useRef({});
  propsRef.current = { sites, interactive, autoSpin, spinSpeed, intro, view, hover, mediaMode };
  const apiRef = useRef({});
  const viewRef = useRef(view);
  viewRef.current = view;

  const worldFirst = useMemo(() => {
    const o = {};
    sites.forEach((s) => {
      if (!o[s.world]) o[s.world] = s;
    });
    return o;
  }, [sites]);

  const go = useCallback((v) => {
    setHover(null);
    setView(v);
    setBump((b) => b + 1);
  }, []);

  const prevRun = useRef({ intro, mediaMode });
  useEffect(() => {
    const p = prevRun.current;
    if (p.intro !== intro || p.mediaMode !== mediaMode) {
      prevRun.current = { intro, mediaMode };
      setView("home");
      setHover(null);
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
    const measure = () => {
      const r = root.getBoundingClientRect();
      W = Math.max(1, r.width);
      H = Math.max(1, r.height);
      phone = W <= 820;
      u = phone ? W / 390 : Math.min(W, 1.6 * H) / 1440;
      root.classList.toggle("sm", phone);
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
      img: el.querySelector("img"),
      vid: el.querySelector("video"),
      title: el.querySelector(".bar b"),
      world: el.querySelector(".bar small"),
      num: el.querySelector(".chip span"),
      rx: spring(0, 180, 24), ry: spring(0, 180, 24), tz: spring(0, 180, 24),
      want: false,
      vidSrc: "",
    }));
    const applySite = (e, idx) => {
      const sites = propsRef.current.sites;
      const s = sites[idx];
      const c = cardApi[e];
      if (!s || !c) return;
      slotSite[e] = idx;
      const w = 160 * s.ratio;
      c.el.style.width = w + "px";
      c.el.style.left = -w / 2 + "px";
      c.el.dataset.world = s.world;
      c.el.style.setProperty("--wc", WORLDS[s.world].color);
      c.el.style.setProperty("--on", WORLDS[s.world].on);
      c.el.href = s.link || "#";
      if (s.link) { c.el.target = "_blank"; c.el.rel = "noopener"; } else { c.el.removeAttribute("target"); }
      c.img.src = s.poster || "";
      c.title.textContent = s.title;
      c.world.textContent = WORLDS[s.world].label;
      c.num.textContent = "No. " + String(s.num).padStart(2, "0");
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
      rot.t += 0.5 * clamp(d, -480, 480);
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
      const dd = Math.abs(dx) >= Math.abs(dy) ? dx : dy;
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

    // ── preview card follower ──
    const pvAnchor = q("pvAnchor");
    const pv = q("pv");
    const pvx = spring(0, 260, 28, 0.6);
    const pvy = spring(0, 260, 28, 0.6);
    let pvSide = { below: false, left: false };
    const placePreview = () => {
      if (!pv || !pvAnchor) return;
      const w = 260, h = pv.offsetHeight || 200;
      const gx = 18, gy = 22, m = 12, hyst = 24;
      const px = pointer.x, py = pointer.y;
      if (pvSide.below) { if (py - gy - h > m + hyst) pvSide.below = false; }
      else if (py - gy - h < m) pvSide.below = true;
      if (pvSide.left) { if (px + gx + w < W - m - hyst) pvSide.left = false; }
      else if (px + gx + w > W - m) pvSide.left = true;
      let x = pvSide.left ? -gx - w : gx;
      let y = pvSide.below ? gy : -gy - h;
      x = clamp(px + x, m, Math.max(m, W - m - w)) - px;
      y = clamp(py + y, m, Math.max(m, H - m - h)) - py;
      pv.style.left = x + "px";
      pv.style.top = y + "px";
      pv.style.transformOrigin = `${pvSide.left ? "100%" : "0"} ${pvSide.below ? "0" : "100%"}`;
    };

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
          formation = clamp((now - t0) / 2600);
          // odometer tween
          const t = clamp((now - odoT) / 650);
          odoCur = odoFrom + (odoTo - odoFrom) * (1 - Math.pow(1 - t, 3));
          setOdo(odoCur);
          const total = state.total || 1;
          if (formation >= 1 && posterLoaded >= total) startReveal(now);
        }
        if (revealed && useIntro) {
          exp = EXPAND(clamp((now - tReveal) / 1900));
          if (now - tReveal >= 1050) root.classList.add("entered");
          if (now - tReveal >= 1900) {
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
          if (introDone) rot.t += sp * ease * k;
          else rot.t += sp * (0.5 + 0.5 * exp) * clamp((78 - rot.t) / 20, 0, 1) * ease * k;
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
      // preview follower
      if (P.hover && pv) {
        pvx.t = pointer.x;
        pvy.t = pointer.y;
        stepSpring(pvx, dt);
        stepSpring(pvy, dt);
        pvAnchor.style.transform = `translate(${pvx.x}px,${pvy.x}px)`;
        placePreview();
      } else {
        pvx.x = pvx.t = pointer.x;
        pvy.x = pvy.t = pointer.y;
      }
    };

    const layoutRing = (now, dt) => {
      const sites = propsRef.current.sites;
      const N2 = Math.max(1, sites.length);
      const e = exp;
      // Phones get a tighter, deeper ring once it has opened: a smaller radius and closer camera so the
      // side cards curve away, the front of the ring pushed toward the viewer, and a slight tilt so it
      // reads as a rounded ring. Desktop keeps the original shape.
      const endR = phone ? 1100 : 1800;
      const endP = phone ? 520 : 760;
      const endTilt = phone ? -8 : 0;
      const endScale = phone ? 1.35 : 2.3;
      const push = phone ? 260 * e : 0;
      const tilt = -22 * (1 - e) + endTilt * e;
      const tr = tilt * DEG;
      const radius = 460 + (endR - 460) * e;
      const anchor = -radius * Math.sin(tr) + 460 * Math.sin(-22 * DEG) * (1 - e);
      const persp = 1000 + (endP - 1000) * e;
      const roll = -20 * (1 - e);
      const cardScale = 0.52 + (endScale - 0.52) * e * e;
      const wallScale = phone ? 0.8 : H <= 760 ? 0.9 : 1.1;
      const fit = Math.min(1.05, (W - 32) / 1240, (0.66 * H) / 800) / wallScale;
      const A = wallScale * (fit + (1 - fit) * e);
      const introOff = 0.44 * H - frameC;
      lens.style.perspective = persp * A + "px";
      lens.style.perspectiveOrigin = `50% calc(50% + ${introOff * (1 - e)}px)`;
      const off = introOff * (1 - e) + anchor * A;
      const ix = 160 * Math.sin(roll * DEG) * A;
      const s = wallScale * (fit + (1 - fit) * e);
      ring.style.transform = `translate3d(${ix}px,${off}px,${push}px) rotateZ(${roll}deg) rotateX(${tilt}deg) scale3d(${s},${s},${A})`;
      const rv = introDone ? rot.x : 0;
      for (let slot = 0; slot < SLOTS; slot++) {
        const c = cardApi[slot];
        const raw = (360 * slot) / SLOTS + rv + 180;
        const a0 = Math.floor(raw / 360);
        const r = mod(raw, 360) - 180;
        if (introDone) {
          const want = mod(slot - a0 * SLOTS + Math.min(3, N2 - 1), N2);
          if (slotSite[slot] !== want) applySite(slot, want);
        }
        const n = mod(r + 180, 360);
        const a = n / 360;
        const i = clamp((formation - 0.7 * a) / 0.3);
        const sm = 1 - Math.pow(1 - i, 3);
        const l = -180 + n * sm;
        const cr = radius - (1 - sm) * a * 24;
        const x = -Math.sin(l * DEG) * cr;
        const z = -Math.cos(l * DEG) * cr;
        const appear = Math.min(1, 2.5 * i);
        const hidden = (z + push) * Math.cos(tr) >= persp - 70 || (introDone && Math.abs(r) > 96);
        const el = c.el;
        if (hidden) {
          if (el.style.display !== "none") el.style.display = "none";
          c.want = false;
        } else {
          if (el.style.display === "none") el.style.display = "";
          el.style.transform = `translate3d(${x}px,0,${z}px) rotateY(${l}deg) scale(${cardScale})`;
          el.style.opacity = appear;
          c.face.style.transform = z > (radius * radius) / persp ? "rotateY(180deg)" : "";
          c.want = formation > 0.5 && Math.abs(r) <= 78 && !reduced && document.visibilityState === "visible";
        }
        // hover tilt springs
        if (!settled(c.rx) || !settled(c.ry) || !settled(c.tz)) {
          stepSpring(c.rx, dt);
          stepSpring(c.ry, dt);
          stepSpring(c.tz, dt);
          c.tilt.style.transform = `translateZ(${c.tz.x}px) rotateX(${c.rx.x}deg) rotateY(${c.ry.x}deg)`;
        }
        // preview videos: play only when on screen
        if (c.want && !c.vidSrc) {
          const st = sites[slotSite[slot]];
          if (st && st.video) {
            c.vidSrc = st.video;
            c.vid.src = st.video;
          }
        }
        if (c.vidSrc) {
          if (c.want && c.vid.paused) c.vid.play().catch(() => {});
          else if (!c.want && !c.vid.paused) c.vid.pause();
        }
      }
    };
    cardApi.forEach((c, e) => {
      c.vid.addEventListener("playing", () => c.vid.classList.add("on"));
      c.vid.addEventListener("error", () => c.vid.classList.remove("on"));
      c.img.addEventListener("error", () => {
        const st = sitesNowEarly()[slotSite[e]];
        if (st && c.img.getAttribute("src") !== st.ph) c.img.src = st.ph;
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
  }, [sites]);
  useEffect(() => {
    if (apiRef.current.syncSea) apiRef.current.syncSea();
  }, [mediaMode, view, seaVideo]);

  // entrance for the Build view
  const buildIn = view === "build";

  // brief helpers
  const composed = () =>
    `I'm creating ${what.trim() || "a booking app for gyms"} for ${who.trim() || "coaches in Porto"}, and I want it ${when}.`;
  const flash = (t) => {
    setNote(t);
    setTimeout(() => setNote(""), 1600);
  };
  const copyBrief = async () => {
    try {
      await navigator.clipboard.writeText(composed());
      flash("Brief copied");
    } catch (e) {
      flash("Copy not available");
    }
  };
  const shareBrief = async () => {
    try {
      if (navigator.share) await navigator.share({ text: composed() });
      else await copyBrief();
    } catch (e) { /* cancelled */ }
  };
  const submit = (e) => {
    e.preventDefault();
    const body = `Hi ${first}, ${composed()} Could we talk?`;
    window.location.href = `mailto:${email}?subject=${encodeURIComponent("A new brief")}&body=${encodeURIComponent(body)}`;
  };
  const magnet = (e) => {
    const b = e.currentTarget;
    const r = b.getBoundingClientRect();
    b.style.transform = `translate(${(e.clientX - (r.left + r.width / 2)) * 0.3}px,${(e.clientY - (r.top + r.height / 2)) * 0.4}px)`;
  };

  const dyn = useMemo(() => {
    let wid = 0;
    return lines.map((toks, li) => (
      <span key={li} className="ln">
        {toks.map((t, ti) =>
          t.type === "w" ? (
            <span key={ti}>
              <span className="wd"><span style={{ "--d": `${0.05 + 0.035 * t.i}s` }}>{t.text}</span></span>{" "}
            </span>
          ) : (
            <span key={ti}>
              <span
                className={"choice" + (hover && hover.n === t.n ? " active" : "")}
                style={{ "--wc": WORLDS[t.world].color, "--on": WORLDS[t.world].on, "--d": `${0.05 + 0.035 * t.i}s` }}
                onPointerEnter={() => propsRef.current.interactive && setHover({ world: t.world, n: t.n })}
                onPointerLeave={() => setHover(null)}
                onClick={() => (t.world === "build" ? go("build") : null)}
              >
                <i className="mk" />
                {t.words.map((w, wi) => (
                  <span key={wi}>
                    <span className="wd"><span style={{ "--d": `${0.05 + 0.035 * w.i}s` }}>{w.text}</span></span>
                    {wi < t.words.length - 1 ? " " : ""}
                  </span>
                ))}
                <i className="ul" />
                <sup>{String(t.n).padStart(2, "0")}</sup>
              </span>{" "}
            </span>
          )
        )}
      </span>
    ));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, hover]);

  const hv = hover ? WORLDS[hover.world] : null;
  const hvSite = hover && hover.world !== "ai" ? worldFirst[hover.world] : null;

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

  const scene = (v) => (
    <div className="scene" data-k="depth" data-depth="10">
      <img src={mediaMode === "placeholder" || !seaImage ? SEA_PH : seaImage} alt="" onError={(e) => { if (e.currentTarget.src !== SEA_PH) e.currentTarget.src = SEA_PH; }} />
      {mediaMode === "video" && seaVideo ? (
        <video data-k="seaV" data-view={v} data-src={seaVideo} muted loop playsInline preload="none" onPlaying={(e) => e.currentTarget.classList.add("on")} />
      ) : null}
      <div className="grain" />
    </div>
  );

  return (
    <div
      ref={rootRef}
      className="nrs"
      data-nav={showNav ? "1" : "0"}
      data-focus={hover && hover.world !== "ai" ? hover.world : undefined}
      style={{ ...style, "--paper": paper, "--ink": ink, "--accent": accent, "--btn": buttonColor }}
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
        <a className="wm" onClick={() => go("home")} aria-label={name}>
          <span className="wmFirst" data-k="wmFirst">{first}</span>
          <span className="wmRest">{" "}{rest.trim() ? rest.trim() : ""}{rest.trim() ? "" : "."}</span>
        </a>
        <div className="links">
          <a aria-current={view === "home" ? "page" : undefined} onClick={() => go("home")}>Home</a>
          <i>/</i>
          <a aria-current={view === "build" ? "page" : undefined} onClick={() => go("build")}>Build</a>
        </div>
      </nav>

      {/* HOME */}
      <section className={"view home" + (view === "home" ? " on" : "")}>
        <div className="stage">
          <div className="top">
            <p className={"sentence" + (hover ? " hovering" : "")}>{dyn}</p>
            <dl className="stats" style={{ margin: 0 }}>
              {statList.map(([v, l], i) => (
                <div key={i} className="stat">
                  <b>{v}</b>
                  <span>{l}</span>
                </div>
              ))}
            </dl>
          </div>
          <div className="frame" data-k="frame">
            {scene("home")}
            <div className="fx" data-k="depth" data-depth="22">{petals(PETALS_BACK, false)}</div>
            <div className="wall" data-k="wall">
              <div className="lens" data-k="lens">
                <div className="ring" data-k="ring">
                  {Array.from({ length: SLOTS }, (_, e) => {
                    const idx = ((e + Math.min(3, N - 1)) % N + N) % N;
                    const s = sites[idx];
                    const w = 160 * (s ? s.ratio : 16 / 9);
                    const wc = WORLDS[s ? s.world : "brand"];
                    return (
                      <a key={e} className="card" data-k="card" data-world={s ? s.world : "brand"} href={s && s.link ? s.link : "#"} target={s && s.link ? "_blank" : undefined} rel="noopener" style={{ width: w, left: -w / 2, "--wc": wc.color, "--on": wc.on }}>
                        <div className="tilt">
                          <div className="cframe" />
                          <div className="face">
                            <img src={s ? s.poster : ""} alt="" draggable="false" />
                            <video muted loop playsInline preload="none" />
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

      {/* BUILD */}
      <section className={"view build" + (view === "build" ? " on in" : "")} key={bump + (view === "build" ? "b" : "h")}>
        <div className="panel">
          {scene("build")}
          <div className="fx" data-k="depth" data-depth="22" style={{ opacity: 1 }}>{petals([...PETALS_BACK, ...PETALS_FRONT], false)}</div>
          <h2>
            <span className="vh">Build: software for startups</span>
            {[buildLine1, buildLine2].map((ln, li) => (
              <span key={li} className="ln" aria-hidden="true">
                {String(ln).split(" ").map((w, wi) => (
                  <span key={wi}><span className="wd"><span style={{ "--d": `${0.15 + 0.06 * (li * 4 + wi)}s` }}>{w}</span></span>{" "}</span>
                ))}
              </span>
            ))}
          </h2>
          <form className="brief" onSubmit={submit}>
            <div className="kick">SHARE WHAT YOU'RE CREATING</div>
            <div className="bs">
              I'm creating{" "}
              <input value={what} onChange={(e) => setWhat(e.target.value)} placeholder="a booking app for gyms" style={{ width: "23ch" }} aria-label="What you are creating" />
              <br />
              for{" "}
              <input value={who} onChange={(e) => setWho(e.target.value)} placeholder="coaches in Porto" style={{ width: "17ch" }} aria-label="Who it is for" />
              , and I want it
              <br />
              <span className="rg" role="radiogroup" aria-label="Timeline">
                {["in 6 weeks", "by next May", "when it's ready"].map((t, i) => (
                  <span key={t}>
                    {i > 0 ? (i === 1 ? " " : " / ") : ""}
                    <button type="button" role="radio" aria-checked={when === t} onClick={() => setWhen(t)}>
                      <i />
                      {t}
                    </button>
                  </span>
                ))}
              </span>
            </div>
            <div className="kick">GOES TO {String(email).toUpperCase()}. {first.toUpperCase()} REPLIES, ALWAYS.</div>
            <div className="acts">
              <button type="button" className="gh" onClick={copyBrief} aria-label="Copy this brief">
                <svg viewBox="0 0 24 24"><path d="M12 3v18M3 12h18M5.600 5.600l12.800 12.800M18.400 5.600 5.600 18.400" /></svg>
              </button>
              <button type="button" className="gh" onClick={shareBrief} aria-label="Share this brief">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="8.500" /></svg>
              </button>
              <button type="submit" className="send" onPointerMove={magnet} onPointerLeave={(e) => (e.currentTarget.style.transform = "")}>
                Send to {first} ↗
              </button>
              {note && <span className="copied">{note}</span>}
            </div>
          </form>
        </div>
        <div className="worked">
          <div className="kick">WORKED AT</div>
          <div className="logos">
            {(Array.isArray(companies) ? companies : []).slice(0, 4).map((c, i) => (
              <span key={i}>
                <svg viewBox="0 0 42 22">{i % 2 === 0 ? <path d="M1 11c5-8 9-8 10 0s6 8 10 0 6-8 10 0 6 8 10 0" /> : <path d="M1 20 14 3l8 11 6-7 13 13" />}</svg>
                {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* hover preview */}
      <div className="pvAnchor" data-k="pvAnchor">
        <div className={"pv" + (hover ? " on" : "") + (hover && hover.world === "ai" ? " ai" : "")} data-k="pv" style={{ "--wc": hv ? hv.color : "#fff" }}>
          <div className="med" style={hvSite ? { backgroundImage: `url("${hvSite.poster}")` } : undefined}>
            {hvSite && hvSite.video ? <video key={hover.world} src={hvSite.video} poster={hvSite.poster} autoPlay muted loop playsInline /> : null}
          </div>
          <div className="ask">Ask me anything</div>
          <div className="meta">
            <p><i />{hv ? (hover.world === "ai" ? hv.label : `${hv.label}${hvSite ? " · " + hvSite.title.toUpperCase() : ""}`) : ""}</p>
            {hv ? hv.blurb : ""}
          </div>
        </div>
      </div>
    </div>
  );
}

