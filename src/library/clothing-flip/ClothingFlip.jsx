import { useEffect, useLayoutEffect, useRef } from "react";

/**
 * ClothingFlip — "Offcut", a dark streetwear clothing-rail hero.
 *
 * A gothic blackletter logo, a polished chrome rail across the page and twelve garments hanging on it in
 * profile (side view). Point at one and it swings round to face you (front view) while its neighbours part to
 * make room, with its name and price under it. Click a garment and it lifts off the rail into a large, centred
 * detail view with a counter, an italic serif name, a price, previous / next arrows and a Close button, while the
 * rest of the page washes out. A red marquee band runs along the bottom.
 *
 * The garments come from two transparent sprite sheets (4 columns x 3 rows): a side-view sheet for the rail and a
 * front-view sheet for the faced and detail views. Both are served as WebP.
 *
 * Self-contained: React only (Google Fonts for the type). The composition is one fixed 1500 x 1000 artboard that
 * scales to fit its parent, so give the parent a height, e.g. <div style={{ height: 640 }}><ClothingFlip /></div>.
 */

// WebP via ImageKit's format transform; the sheets keep their transparency.
const FRONT_SHEET = "https://ik.imagekit.io/Harsh2463/jackets/Hoodie%20Color%20Grid%20Collection.png?tr=f-webp,q-90";
const SIDE_SHEET = "https://ik.imagekit.io/Harsh2463/jackets/Hoodie%20Sprite%20Sheet%20Collection%20side%20view.png?tr=f-webp,q-90";
const FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Instrument+Serif:ital@1&family=UnifrakturMaguntia&display=swap";

// "Name | Price" (prices in rupees), in sheet order: left to right, top to bottom
const DEFAULT_PRODUCTS = [
  "Believe in Yourself Hoodie — Black | ₹2,499",
  "Believe in Yourself Hoodie — Bone | ₹2,499",
  "Believe in Yourself Hoodie — Heather Grey | ₹2,499",
  "Believe in Yourself Hoodie — Navy | ₹2,499",
  "Believe in Yourself Hoodie — Maroon | ₹2,599",
  "Believe in Yourself Hoodie — Forest Green | ₹2,599",
  "Believe in Yourself Hoodie — Royal Blue | ₹2,599",
  "Believe in Yourself Hoodie — Purple | ₹2,599",
  "Believe in Yourself Hoodie — Mustard | ₹2,699",
  "Believe in Yourself Hoodie — Rust | ₹2,699",
  "Believe in Yourself Hoodie — Pink | ₹2,699",
  "Believe in Yourself Hoodie — Sky Blue | ₹2,699",
];
const DEFAULT_MARQUEE = ["OFFCUT", "•", "LIMITED RUN", "•", "NO RESTOCKS", "•"];

/* ----- sprite sheet geometry (both sheets: 4 columns x 3 rows of hoodies hanging from a hook) ----- */
const SHEETS = {
  front: { w: 1449, h: 1085, hx: [207, 550, 897, 1245], hy: [14, 368, 722] },
  side: { w: 1450, h: 1085, hx: [211, 553, 902, 1248], hy: [14, 368, 723] },
};
const BW = 340; // crop box, in sheet px: centred on the hook, 14px above it
const BH = 361;
const HOOK_UP = 14;
const COLS = 4;
const N = 12;

/* ----- artboard layouts, in artboard px: a wide one (1500 x 1000) and a tall one for phones and portrait tablets ----- */
const LAYOUTS = {
  land: { W: 1500, H: 1000, SLOT: 96, OPEN: 86, CX: 750, GW: 283, GH: 300, BIGH: 470, RT: 254, AV: 790 },
  port: { W: 720, H: 1340, SLOT: 50, OPEN: 90, CX: 360, GW: 301, GH: 320, BIGH: 560, RT: 360, AV: 800 },
};
const bigW = (L) => Math.round((L.BIGH * BW) / BH);

const CSS = `
.of{--bg:#0b0b0c;--ink:#f1efec;--mute:#8d8a86;--red:#b3121b;position:relative;width:100%;height:100%;min-height:360px;overflow:hidden;background:var(--bg);color:var(--ink);font-family:"Inter","Helvetica Neue",Arial,sans-serif;-webkit-font-smoothing:antialiased;-webkit-user-select:none;user-select:none;box-sizing:border-box}
.of *{box-sizing:border-box;margin:0;padding:0}
.of button{font:inherit;color:inherit;background:none;border:0;cursor:pointer}
.of .art{position:absolute;width:1500px;height:1000px;overflow:hidden;transform-origin:0 0;background:radial-gradient(ellipse 70% 55% at 50% 40%,#18181a,var(--bg))}
.of .ui{font-size:12px;font-weight:500;letter-spacing:.12em;text-transform:uppercase}
.of .pill{height:34px;padding:0 20px;border:1px solid rgba(241,239,236,.6);border-radius:40px;display:inline-grid;place-items:center;transition:background .25s,color .25s}
.of .pill:hover{background:var(--ink);color:var(--bg)}
.of .dim{transition:opacity .7s cubic-bezier(.2,.8,.2,1),filter .7s}
.of.open .dim{opacity:.12;filter:blur(2px)}
.of.open .dimmer{opacity:0;pointer-events:none}
.of .about{position:absolute;left:46px;top:46px}
.of .logo{position:absolute;left:50%;top:26px;transform:translateX(-50%);font-family:"UnifrakturMaguntia",serif;font-weight:400;font-size:64px;line-height:1;letter-spacing:.01em;white-space:nowrap}
.of .contact{position:absolute;right:46px;top:46px}
.of .rail{position:absolute;left:-80px;right:-80px;top:254px;height:12px;border-radius:6px;background:linear-gradient(#fafafa 0%,#b9bcc1 28%,#5d6066 55%,#a9adb3 78%,#e6e7e9 100%);box-shadow:0 10px 18px rgba(0,0,0,.45)}
.of .rack{position:absolute;left:0;top:0;width:1500px;height:1000px;touch-action:pan-y}
.of.drag .rack,.of.drag .g{cursor:grabbing}
/* the tall composition (phones, portrait tablets): bigger type, a shorter rail, the garments and the detail view stacked vertically */
.of.pt .ui{font-size:24px}
.of.pt .pill{height:56px;padding:0 34px}
.of.pt .about{left:36px;top:44px}
.of.pt .contact,.of.pt .close{right:36px;top:44px}
.of.pt .logo{top:20px;font-size:96px}
.of.pt .rail{top:360px;height:14px}
.of.pt .g{top:341px;width:301px;height:320px;margin-left:-150.5px}
.of.pt .cap{top:675px;font-size:20px}
.of.pt .cap b{margin-bottom:6px}
.of.pt .avail{top:800px}
.of.pt .band{height:76px}
.of.pt .track{font-size:22px}
.of.pt .track span{padding-right:36px}
.of.pt .big,.of.pt .big2{top:400px;width:527px;height:560px;margin-left:-263.5px}
.of.pt .arr{top:640px;width:70px;height:70px}
.of.pt .arr svg{width:26px;height:26px}
.of.pt .prev{left:18px}
.of.pt .next{left:auto;right:18px}
.of.pt .info{top:975px;width:660px;white-space:normal}
.of.pt .num{font-size:20px}
.of.pt .name{font-size:46px;margin:10px 0 8px}
.of.pt .price{font-size:24px;margin-bottom:20px}
.of .g{position:absolute;top:236px;width:283px;height:300px;margin-left:-141.5px;perspective:900px;cursor:pointer;transition:left .75s cubic-bezier(.2,.8,.2,1)}
.of .g i{position:absolute;inset:0;background-repeat:no-repeat;transform-origin:50% 4%;transition:transform .75s cubic-bezier(.2,.8,.2,1),opacity .75s cubic-bezier(.2,.8,.2,1),filter .75s}
.of .g i.s{filter:brightness(.82) drop-shadow(0 18px 18px rgba(0,0,0,.5))}
.of .g i.f{transform:rotateY(-74deg);opacity:0;filter:brightness(.82) drop-shadow(0 18px 18px rgba(0,0,0,.5))}
.of .g.face i.s{transform:rotateY(74deg);opacity:0}
.of .g.face i.f{transform:rotateY(0deg);opacity:1;filter:brightness(1) drop-shadow(0 22px 26px rgba(0,0,0,.55))}
.of .cap{position:absolute;top:552px;transform:translateX(-50%);text-align:center;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--mute);white-space:nowrap;pointer-events:none;opacity:0;transition:left .75s cubic-bezier(.2,.8,.2,1),opacity .35s}
.of .cap.on{opacity:1}
.of.open .cap.on{opacity:0}
.of .cap b{display:block;color:var(--ink);font-weight:500;margin-bottom:4px}
.of .avail{position:absolute;left:50%;top:790px;transform:translateX(-50%)}
.of .band{position:absolute;left:0;right:0;bottom:0;height:46px;background:var(--red);overflow:hidden;display:flex;align-items:center}
.of .track{display:flex;white-space:nowrap;font-size:13px;font-weight:600;letter-spacing:.14em;animation:ofMq 22s linear infinite}
.of .track span{padding-right:22px}
@keyframes ofMq{to{transform:translateX(-50%)}}
.of .det{position:absolute;inset:0;pointer-events:none}
.of.open .det{pointer-events:auto}
.of .hit{position:absolute;inset:0}
.of .big,.of .big2{position:absolute;left:50%;top:257px;width:443px;height:470px;margin-left:-221.5px;background-repeat:no-repeat;opacity:0;pointer-events:none}
.of .big{transform-origin:50% 4%;filter:drop-shadow(0 30px 40px rgba(0,0,0,.6))}
.of .arr{position:absolute;top:452px;width:46px;height:46px;border-radius:50%;border:1px solid rgba(241,239,236,.5);display:grid;place-items:center;opacity:0;transition:opacity .4s ease .25s,background .2s,color .2s}
.of .arr:hover{background:var(--ink);color:var(--bg)}
.of .arr svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8}
.of .prev{left:calc(50% - 285.5px)}
.of .next{left:calc(50% + 239.5px)}
.of .info{position:absolute;left:50%;top:770px;transform:translateX(-50%);text-align:center;opacity:0;transition:opacity .5s ease .25s;white-space:nowrap}
.of .num{font-size:11px;letter-spacing:.16em;color:var(--mute)}
.of .name{font-family:"Instrument Serif",serif;font-style:italic;font-weight:400;font-size:40px;line-height:1.15;margin:8px 0 6px}
.of .price{font-size:13px;letter-spacing:.08em;color:var(--mute);margin-bottom:18px}
.of .close{position:absolute;right:46px;top:46px;opacity:0;transition:opacity .4s ease .25s}
.of.open .info,.of.open .arr,.of.open .close{opacity:1}
.of.open .arr,.of.open .close,.of.open .info button{pointer-events:auto}
`;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const num2 = (n) => String(n).padStart(2, "0");
const num = (v, fb) => (typeof v === "number" && isFinite(v) ? v : fb);

function buildHtml(P) {
  return `
<div class="art" data-k="art">
  <div class="about ui dim" data-k="about"></div>
  <div class="logo dim" data-k="logo"></div>
  <div class="contact ui dim dimmer" data-k="contact"></div>
  <div class="rail dim"></div>
  <div class="rack dim" data-k="rack"></div>
  <div class="cap dimmer" data-k="cap"><b data-k="capn"></b><span data-k="capp"></span></div>
  <button class="avail pill ui dim dimmer" data-k="avail"></button>
  <div class="band dimmer" data-k="band"><div class="track" data-k="track"></div></div>
  <div class="det" data-k="det">
    <div class="hit" data-k="hit"></div>
    <div class="big2" data-k="big2"></div>
    <div class="big" data-k="big"></div>
    <button class="arr prev" data-k="prev" aria-label="Previous"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>
    <button class="arr next" data-k="next" aria-label="Next"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button>
    <div class="info" data-k="info"><div class="num" data-k="num"></div><div class="name" data-k="name"></div><div class="price" data-k="price"></div><button class="pill ui" data-k="avail2"></button></div>
    <button class="close ui" data-k="close"></button>
  </div>
</div>`;
}

export default function ClothingFlip({
  brand = "Offcut",
  aboutLabel = "About",
  contactLabel = "Contact",
  products = DEFAULT_PRODUCTS,
  marquee = DEFAULT_MARQUEE,
  availabilityLabel = "See availability",
  closeLabel = "Close",
  driftSpeed = 48,
  spacing = 150,
  garmentSize = 100,
  frontSheet = FRONT_SHEET,
  sideSheet = SIDE_SHEET,
  background = "#0b0b0c",
  textColor = "#f1efec",
  mutedColor = "#8d8a86",
  bandColor = "#b3121b",
  style = {},
}) {
  const rootRef = useRef(null);
  const propsRef = useRef({});
  propsRef.current = { garmentSize, spacing, driftSpeed, brand, aboutLabel, contactLabel, products, marquee, availabilityLabel, closeLabel, frontSheet, sideSheet };
  const apiRef = useRef({});

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    if (!document.querySelector("link[data-of-fonts]")) {
      const l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = FONTS_URL;
      l.setAttribute("data-of-fonts", "");
      document.head.appendChild(l);
    }
    const P = () => propsRef.current;
    root.innerHTML = buildHtml(P());
    const q = (k) => root.querySelector(`[data-k="${k}"]`);
    const art = q("art"), rack = q("rack"), cap = q("cap"), big = q("big"), big2 = q("big2");
    const timers = [];
    const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };

    let hov = -1; // the faced garment (an element index)
    let open = -1; // the opened garment (an element index)
    let openK = -1; // ... and which hoodie it shows
    let pointerIn = false;
    let L = { ...LAYOUTS.land };
    let G = [];
    let T = 0; // how many hangers ride the rail
    let vx = []; // each hanger's current centre
    let drift = 0; // how far the rail has travelled, in artboard px
    let speed = 0; // current speed, easing toward the target
    let builtKey = "";
    let gTop = 0;
    let artK = 1; // artboard scale, to turn screen px into artboard px
    let dragging = false;
    let dragId = -1;
    let dragX = 0;
    let dragMoved = 0;
    let dragSamples = [];
    let momentum = 0; // px/s left over from a drag, fading out
    let justDragged = false;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // garment size (a factor); the spacing and the parting gap follow it, so the gaps keep their proportion
    const sz = () => Math.max(0.5, Math.min(1.6, num(P().garmentSize, 100) / 100));
    const spacing = () => Math.max(60, Math.min(500, num(P().spacing, 150))) * sz();

    const prod = (k) => {
      const p = String((P().products || [])[k] || "").split("|").map((x) => x.trim());
      return { name: p[0] || `Hoodie ${k + 1}`, price: p[1] || "" };
    };

    // paint hoodie k from a sprite sheet into an element, so the garment's crop box exactly fills it
    const paint = (el, k, front) => {
      const sh = front ? SHEETS.front : SHEETS.side;
      const url = front ? P().frontSheet : P().sideSheet;
      const ew = el.offsetWidth || L.GW;
      const eh = el.offsetHeight || L.GH;
      const sx = ew / BW;
      const sy = eh / BH;
      const x = sh.hx[k % COLS] - BW / 2;
      const y = sh.hy[Math.floor(k / COLS)] - HOOK_UP;
      el.style.backgroundImage = `url("${url}")`;
      el.style.backgroundSize = `${sh.w * sx}px ${sh.h * sy}px`;
      el.style.backgroundPosition = `${-x * sx}px ${-y * sy}px`;
    };
    const paintRail = () => G.forEach((g, j) => { paint(g.querySelector("i.s"), j % N, false); paint(g.querySelector("i.f"), j % N, true); });

    const writeStatic = () => {
      const p = P();
      q("logo").textContent = p.brand;
      q("about").textContent = p.aboutLabel;
      q("contact").textContent = p.contactLabel;
      q("avail").textContent = p.availabilityLabel;
      q("avail2").textContent = p.availabilityLabel;
      q("close").textContent = p.closeLabel;
      const items = Array.isArray(p.marquee) && p.marquee.length ? p.marquee : DEFAULT_MARQUEE;
      const frag = [];
      for (let r0 = 0; r0 < 16; r0++) items.forEach((t) => frag.push(`<span>${esc(t)}</span>`));
      q("track").innerHTML = frag.join("");
      paintRail();
      if (open >= 0) { paint(big, openK, true); fill(openK); }
    };

    const base = (j) => L.CX + (j - (T - 1) / 2) * spacing();
    // every hanger rides the rail in a loop and wraps beyond the artboard edge, so it is never seen popping in
    const applyDrift = () => {
      const sp = spacing();
      const len = T * sp;
      const x0 = L.CX - len / 2;
      G.forEach((g, j) => {
        const b0 = base(j);
        const p = x0 + ((((b0 - x0 - drift) % len) + len) % len);
        vx[j] = p;
        g.style.translate = `${p - b0}px 0`;
      });
      if (hov >= 0 && G[hov]) cap.style.left = `${vx[hov]}px`;
    };
    const layout = () => {
      const sp = spacing();
      void sp;
      G.forEach((g, j) => {
        let gap = 0;
        if (hov >= 0 && j !== hov) gap = Math.sign(vx[j] - vx[hov]) * L.OPEN * sz();
        g.style.left = `${base(j) + gap}px`;
        g.classList.toggle("face", j === hov);
      });
      if (hov >= 0 && G[hov]) {
        const d = prod(hov % N);
        cap.style.left = `${vx[hov]}px`;
        q("capn").textContent = d.name;
        q("capp").textContent = d.price;
        cap.classList.add("on");
      } else cap.classList.remove("on");
    };
    // the element that shows hoodie k, nearest the middle of the rail
    const elFor = (k) => {
      let best = -1;
      let bd = Infinity;
      G.forEach((g, j) => {
        if (j % N !== k) return;
        const dd = Math.abs(vx[j] - L.CX);
        if (dd < bd) { bd = dd; best = j; }
      });
      return best;
    };
    const buildRack = () => {
      builtKey = `${spacing()}|${sz()}|${L.W}`;
      const gw = L.GW * sz();
      const gh = L.GH * sz();
      T = Math.max(N, Math.ceil((L.W + gw * 1.3) / spacing()));
      rack.innerHTML = Array.from({ length: T }, (_, j) => `<div class="g" data-i="${j}"><i class="s"></i><i class="f"></i></div>`).join("");
      G = Array.from(rack.querySelectorAll(".g"));
      // the garments hang from the rail whatever their size: the hook sits on the rail
      gTop = L.RT - 6 - (HOOK_UP * gh) / BH;
      G.forEach((g) => {
        g.style.width = `${gw}px`;
        g.style.height = `${gh}px`;
        g.style.marginLeft = `${-gw / 2}px`;
        g.style.top = `${gTop}px`;
      });
      cap.style.top = `${gTop + gh + 16}px`;
      q("avail").style.top = `${Math.max(L.AV, gTop + gh + 86)}px`;
      vx = G.map(() => 0);
      hov = -1;
      paintRail();
      applyDrift();
      if (open >= 0) {
        open = elFor(openK);
        if (open >= 0) G[open].style.visibility = "hidden";
        hov = open;
      }
      layout();
    };
    const fill = (k) => {
      const d = prod(k);
      q("num").textContent = `${num2(k + 1)} / ${num2(N)}`;
      q("name").textContent = d.name;
      q("price").textContent = d.price;
    };
    const E = "cubic-bezier(.2,.8,.2,1)";
    const lift = (j) => `translate(${vx[j] - L.CX}px, -8px) scale(${(L.GW * sz()) / bigW(L)})`;

    const openG = (j) => {
      if (open >= 0) return;
      open = j;
      openK = j % N;
      hov = j;
      layout();
      big.getAnimations().forEach((a0) => a0.cancel());
      paint(big, openK, true);
      fill(openK);
      root.classList.add("open");
      big.animate([{ transform: lift(j), opacity: 1 }, { transform: "none", opacity: 1 }], { duration: 750, easing: E, fill: "forwards" });
      G[j].style.visibility = "hidden";
    };
    const step = (d) => {
      if (open < 0) return;
      const fromK = openK;
      G[open].style.visibility = "";
      openK = (openK + d + N) % N;
      open = elFor(openK);
      fill(openK);
      G[open].style.visibility = "hidden";
      hov = open;
      layout();
      paint(big2, fromK, true);
      big2.animate(
        [{ transform: "none", opacity: 1, filter: "blur(0)" }, { transform: `translateX(${-d * 120}px) scale(.94)`, opacity: 0, filter: "blur(6px)" }],
        { duration: 600, easing: E }
      );
      big.getAnimations().forEach((a0) => a0.cancel());
      paint(big, openK, true);
      big.animate(
        [{ transform: `translateX(${d * 120}px) scale(.94)`, opacity: 0, filter: "blur(6px)" }, { transform: "none", opacity: 1, filter: "blur(0)" }],
        { duration: 600, easing: E, fill: "forwards" }
      );
    };
    const closeG = () => {
      if (open < 0) return;
      const j = open;
      big.animate([{ transform: "none", opacity: 1 }, { transform: lift(j), opacity: 1 }], { duration: 650, easing: E, fill: "forwards" });
      root.classList.remove("open");
      later(() => {
        if (G[j]) G[j].style.visibility = "";
        big.getAnimations().forEach((a0) => a0.cancel());
        big.style.opacity = "0";
        open = -1;
        openK = -1;
        hov = -1;
        layout();
      }, 650);
    };

    // ── fit the artboard into the container: wide containers get a wider rail, narrow or tall ones the tall layout ──
    let mode = "";
    const fit = () => {
      const cw = root.clientWidth || 1500;
      const ch = root.clientHeight || 1000;
      const m = cw / ch < 1.05 ? "port" : "land";
      const bl = LAYOUTS[m];
      const W = Math.min(Math.round(bl.W * 1.6), Math.max(bl.W, Math.round((bl.H * cw) / ch)));
      if (m !== mode || W !== L.W) {
        mode = m;
        L = { ...bl, W, CX: W / 2 };
        root.classList.toggle("pt", m === "port");
        art.style.width = `${L.W}px`;
        art.style.height = `${L.H}px`;
        buildRack();
      }
      const k = Math.min(cw / L.W, ch / L.H);
      artK = k;
      art.style.transform = `scale(${k})`;
      art.style.left = `${(cw - L.W * k) / 2}px`;
      art.style.top = `${(ch - L.H * k) / 2}px`;
    };

    // ── input (delegated, because the hangers are rebuilt when the spacing or the width changes) ──
    const listen = (t, ev, fn) => { t.addEventListener(ev, fn); return () => t.removeEventListener(ev, fn); };
    const offs = [];
    offs.push(
      listen(rack, "pointerover", (e) => {
        if (open >= 0 || dragging) return;
        const g = e.target.closest && e.target.closest(".g");
        if (!g) {
          if (hov >= 0) { hov = -1; layout(); }
          return;
        }
        const j = Number(g.dataset.i);
        if (j !== hov) { hov = j; layout(); }
      })
    );
    offs.push(listen(rack, "click", (e) => {
      if (justDragged) return;
      const g = e.target.closest && e.target.closest(".g");
      if (g) openG(Number(g.dataset.i));
    }));
    // the trail area: the band the hoodies hang in (the rail and the garments beneath it)
    const inTrail = (e) => {
      const rc = art.getBoundingClientRect();
      const y = (e.clientY - rc.top) / artK;
      return y >= gTop - 12 && y <= gTop + L.GH * sz() + 12;
    };
    offs.push(
      listen(rack, "pointermove", (e) => {
        if (dragging || open >= 0) return;
        rack.style.cursor = inTrail(e) ? "grab" : "";
      })
    );
    // drag the trail sideways to slide it; let go and it carries on a little, then goes back to its own loop
    offs.push(
      listen(rack, "pointerdown", (e) => {
        if (open >= 0 || (e.pointerType === "mouse" && e.button !== 0)) return;
        if (!inTrail(e)) return;
        dragging = true;
        dragId = e.pointerId;
        dragX = e.clientX;
        dragMoved = 0;
        dragSamples = [];
        momentum = 0;
        justDragged = false;
      })
    );
    offs.push(
      listen(window, "pointermove", (e) => {
        if (!dragging || e.pointerId !== dragId) return;
        const dx = e.clientX - dragX;
        dragX = e.clientX;
        dragMoved += Math.abs(dx);
        if (dragMoved > 6) {
          if (!root.classList.contains("drag")) {
            root.classList.add("drag");
            if (hov >= 0) { hov = -1; layout(); } // no parting while the trail is being dragged
          }
          drift -= dx / artK;
          applyDrift();
          const now = performance.now();
          dragSamples.push([now, dx / artK]);
          while (dragSamples.length && now - dragSamples[0][0] > 90) dragSamples.shift();
        }
      })
    );
    const endDrag = (e) => {
      if (!dragging || (e && e.pointerId !== dragId)) return;
      dragging = false;
      if (dragMoved > 6) {
        justDragged = true;
        later(() => { justDragged = false; }, 60);
        const now = performance.now();
        const recent = dragSamples.filter((x) => now - x[0] < 90);
        if (recent.length > 1) {
          const dist = recent.reduce((a0, x) => a0 + x[1], 0);
          const dt0 = Math.max(16, now - recent[0][0]) / 1000;
          momentum = Math.max(-1800, Math.min(1800, -dist / dt0));
        }
      }
      root.classList.remove("drag");
    };
    offs.push(listen(window, "pointerup", endDrag));
    offs.push(listen(window, "pointercancel", endDrag));
    offs.push(listen(rack, "pointerleave", () => { if (open < 0) { hov = -1; layout(); } }));
    offs.push(listen(root, "pointerenter", () => { pointerIn = true; }));
    offs.push(listen(root, "pointerleave", () => { pointerIn = false; }));
    offs.push(listen(q("prev"), "click", () => step(-1)));
    offs.push(listen(q("next"), "click", () => step(1)));
    offs.push(listen(q("close"), "click", closeG));
    offs.push(listen(q("hit"), "click", closeG));
    // touch: swipe in the detail view to browse
    let tx = 0;
    offs.push(listen(root, "touchstart", (e) => { tx = e.touches[0].clientX; }));
    offs.push(
      listen(root, "touchend", (e) => {
        if (open < 0) return;
        const dx = (e.changedTouches[0] ? e.changedTouches[0].clientX : tx) - tx;
        if (dx < -50) step(1);
        else if (dx > 50) step(-1);
      })
    );
    offs.push(
      listen(window, "keydown", (e) => {
        if (!pointerIn && open < 0) return;
        if (open >= 0) {
          if (e.key === "ArrowRight") step(1);
          else if (e.key === "ArrowLeft") step(-1);
          else if (e.key === "Escape") closeG();
        } else if (e.key === "ArrowRight") { hov = Math.min(T - 1, hov + 1); layout(); }
        else if (e.key === "ArrowLeft") { hov = hov < 0 ? T - 1 : Math.max(0, hov - 1); layout(); }
        else if (e.key === "Enter" && hov >= 0) openG(hov);
      })
    );
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(fit) : null;
    if (ro) ro.observe(root);
    offs.push(listen(window, "resize", fit));

    // ── the rail's loop: it runs on its own, slows while a garment is faced and stands still while one is open ──
    let raf = 0;
    let last = performance.now();
    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      // full speed on its own, a slow crawl (20%) while a garment is faced, and still while one is open
      const full = num(P().driftSpeed, 48);
      const target = reduced || open >= 0 || dragging ? 0 : hov >= 0 ? full * 0.2 : full;
      speed += (target - speed) * (1 - Math.exp(-dt * 6));
      momentum *= Math.exp(-dt * 2.4);
      if (Math.abs(momentum) < 1) momentum = 0;
      if (!dragging && (Math.abs(speed) > 0.01 || momentum !== 0)) {
        drift += (speed + momentum) * dt;
        applyDrift();
      }
    };

    writeStatic();
    fit();
    raf = requestAnimationFrame(frame);
    apiRef.current.sync = () => {
      if (builtKey !== `${spacing()}|${sz()}|${L.W}`) buildRack();
      writeStatic();
    };

    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      offs.forEach((f) => f());
      if (ro) ro.disconnect();
      root.innerHTML = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep texts and sprite sheets in step with edited props (the engine owns the DOM)
  useEffect(() => {
    if (apiRef.current.sync) apiRef.current.sync();
  }, [garmentSize, spacing, brand, aboutLabel, contactLabel, products, marquee, availabilityLabel, closeLabel, frontSheet, sideSheet]);

  return (
    <>
      <style>{CSS}</style>
      <div ref={rootRef} className="of" style={{ "--bg": background, "--ink": textColor, "--mute": mutedColor, "--red": bandColor, ...style }} />
    </>
  );
}
