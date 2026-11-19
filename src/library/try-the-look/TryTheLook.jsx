import { Fragment, useEffect, useMemo, useRef, useState } from "react";

/**
 * TryTheLook — a row of styled looks that turn on a 3D "runway" ring.
 *
 * Motion (desktop): the looks stand on a ring seen from the front. One look is
 * dead centre at full size; the others curve away to either side, shrinking
 * with perspective, rising toward a horizon, blurring and fading as they turn
 * to the back. A single continuous position (`cur`, in looks) is chased by a
 * critically-damped spring, so every change — click, arrow key, swipe, wheel,
 * autoplay — glides and settles the same way. On first view the ring swings in
 * from just beside the active look.
 *
 * Motion (phone): the same position drives a diagonal line instead — the
 * active look at centre, the others stepping smaller up and out to the side.
 *
 * Input: click a look, drag / swipe sideways (momentum on release), arrow
 * keys, horizontal trackpad scroll, and an optional autoplay with a thin
 * progress bar. Reduced-motion visitors get no spring, sweep or autoplay.
 *
 * Images: the models and the outfit thumbnails are cropped out of two sprite
 * sheets (`modelSheet`: 3 x 3 models, `outfitSheet`: 9 columns x 3 rows of
 * top / bottom / shoes), so look k uses model k and outfit column k. A look
 * can still carry its own `src` photo instead.
 *
 * Self-contained: copy this single file into any React (16.8+) project and
 * render <TryTheLook />. It fills 100% of its parent, so give the parent a
 * height, e.g.  <div style={{ height: 640 }}><TryTheLook /></div>
 *
 * Each entry of `looks` is:
 *   { label, src?, pieces?: [{ brand, name, price, color? }], piecesText? }
 */

/* ---------------------------------------------------------------- constants */

const MODEL_SHEET =
  "https://ik.imagekit.io/Harsh2463/jackets/Nine%20Casual%20Male%20Fashion%20Cutouts.png?tr=f-webp,q-90";
const OUTFIT_SHEET =
  "https://ik.imagekit.io/Harsh2463/jackets/Three-Row%20Streetwear%20Collection.png?tr=f-webp,q-90";

// Model sheet: 941 x 1672, 3 columns x 3 rows of full-length cut-outs. Each
// model's horizontal centre (sheet px) and each row's top and height.
const M_W = 941;
const M_H = 1672;
const M_CW = 300; // crop width around a model
// Each row stands on its own scale, so each has its own top and height.
const ROW_TOP = [17, 599, 1140];
const ROW_H = [573, 536, 500];
const MODEL_CX = [166, 468.5, 771, 166, 469, 770.5, 153, 467, 778];

// Outfit sheet: 2172 x 724, 9 columns x 3 rows. Tight box [x, y, w, h] of each
// garment (row-major: tops, bottoms, shoes). The rows are not evenly spaced:
// tops sit at y 8-255, bottoms at 289-579 and shoes at 618-705.
const O_W = 2172;
const O_H = 724;
const OUTFIT_BOX = [
  [33, 20, 222, 235], [278, 10, 213, 245], [506, 12, 238, 241], [755, 20, 213, 225], [983, 18, 234, 235], [1226, 8, 232, 248], [1462, 11, 228, 241], [1696, 17, 229, 237], [1931, 13, 226, 241],
  [58, 290, 161, 288], [300, 290, 164, 288], [534, 290, 174, 289], [775, 289, 173, 291], [1017, 291, 170, 287], [1257, 290, 169, 289], [1493, 291, 162, 289], [1735, 291, 159, 289], [1972, 291, 157, 288],
  [42, 618, 188, 87], [288, 619, 186, 86], [530, 620, 184, 83], [768, 621, 184, 83], [1001, 619, 196, 87], [1246, 618, 185, 87], [1480, 618, 189, 86], [1717, 620, 188, 85], [1951, 619, 190, 86],
];

/** Card scale at dead centre. */
const FRONT_SCALE = 1.04;
/** Width ÷ height of a character's card box (what the characters were sized
 * by before the sprite sheets, kept so every character stays the same size). */
const PHOTO_RATIO = 640 / 1138;
/** Ring geometry (see the header): radius and camera distance as shares of the
 * stage width, horizon as a share of its height, degrees between neighbours. */
const RING_R = 0.62;
const RING_P = 1.65;
const HORIZON = 0.36;
const STEP_DEG = 30;
/** Critically damped spring. */
const SPRING_K = 95;
const ENTRANCE = 1.15;
/** Phone line: sideways step (share of width), rise per step (px), size ratio per step. */
const LINE_SX = 0.3;
const LINE_AY = 22;
const LINE_SR = 0.76;
const DRAG_THRESHOLD = 8;
const WHEEL_THRESHOLD = 45;
const WHEEL_LOCK_MS = 520;

const SWATCH_COLORS = ["#D9CDBF", "#1A1A1C", "#9AA3AD", "#6B5B4D", "#3C4654", "#B8471F"];

export const DEFAULT_LOOKS = [
  {
    label: "Street",
    pieces: [
      { brand: "Nike", name: "Rust Knit Sweater", price: 118 },
      { brand: "Nikey", name: "Washed Grey Jeans", price: 96 },
      { brand: "Nike", name: "Black Leather Shoe", price: 139 },
    ],
  },
  {
    label: "Off Duty",
    pieces: [
      { brand: "Nike", name: "Believe Hoodie", price: 79 },
      { brand: "Nikey", name: "Black Cargo Pant", price: 92 },
      { brand: "Nike", name: "Court Sneaker", price: 129 },
    ],
  },
  {
    label: "Game Day",
    pieces: [
      { brand: "Nike", name: "Navy Zip Jacket", price: 168 },
      { brand: "Nikey", name: "Cream Wide Pant", price: 84 },
      { brand: "Nike", name: "Court Sneaker", price: 129 },
    ],
  },
  {
    label: "Weekend",
    pieces: [
      { brand: "Nike", name: "Striped Knit", price: 110 },
      { brand: "Nikey", name: "Light Blue Denim", price: 88 },
      { brand: "Nike", name: "Court Sneaker", price: 129 },
    ],
  },
  {
    label: "Studio Day",
    pieces: [
      { brand: "Nike", name: "New York Sweatshirt", price: 99 },
      { brand: "Nikey", name: "Khaki Cargo Pant", price: 98 },
      { brand: "Nike", name: "Green Retro Low", price: 149 },
    ],
  },
  {
    label: "Night Out",
    pieces: [
      { brand: "Nike", name: "Black Hoodie", price: 85 },
      { brand: "Nikey", name: "Grey Cargo Pant", price: 95 },
      { brand: "Nike", name: "Court Sneaker", price: 129 },
    ],
  },
  {
    label: "City Walk",
    pieces: [
      { brand: "Nike", name: "Striped Oxford Shirt", price: 72 },
      { brand: "Nikey", name: "Black Baggy Pant", price: 98 },
      { brand: "Nike", name: "Court Sneaker", price: 129 },
    ],
  },
  {
    label: "Date Night",
    pieces: [
      { brand: "Nike", name: "Tan Trucker Jacket", price: 128 },
      { brand: "Nikey", name: "Brown Wide Pant", price: 112 },
      { brand: "Nike", name: "Tan Retro Low", price: 149 },
    ],
  },
  {
    label: "Travel Day",
    pieces: [
      { brand: "Nike", name: "Varsity Jacket", price: 175 },
      { brand: "Nikey", name: "Light Wash Denim", price: 90 },
      { brand: "Nike", name: "Panda Retro Low", price: 149 },
    ],
  },
];

/* ------------------------------------------------------------------ helpers */

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mod = (n, m) => ((n % m) + m) % m;
/** Signed distance from `to` to `from` the short way round a ring of `n`. */
const wrap = (d, n) => mod(d + n / 2, n) - n / 2;

/** How a figure (a model) is drawn: a box at the sprite's own pixel size, the
 * sheet as its background, and the point of that box that sits on the card's
 * centre line at its feet. Scaled up to the card by a transform. */
function figureOf(look, i, modelSheet) {
  if (look.image) {
    return {
      w: 226,
      h: 402,
      sr: 402,
      ox: 113,
      bg: { backgroundImage: `url("${look.image}")`, backgroundSize: "contain", backgroundPosition: "50% 100%", backgroundRepeat: "no-repeat" },
    };
  }
  const k = i % 9;
  const row = Math.floor(k / 3);
  return {
    w: M_CW,
    h: ROW_H[row],
    sr: ROW_H[row],
    ox: M_CW / 2,
    bg: {
      backgroundImage: `url("${modelSheet}")`,
      backgroundSize: `${M_W}px ${M_H}px`,
      backgroundPosition: `${M_CW / 2 - MODEL_CX[k]}px ${-ROW_TOP[row]}px`,
      backgroundRepeat: "no-repeat",
    },
  };
}

/** The same crop as a CSS mask, so the light sweep only ever lights the model. */
const maskOf = (bg) => ({
  WebkitMaskImage: bg.backgroundImage,
  maskImage: bg.backgroundImage,
  WebkitMaskSize: bg.backgroundSize,
  maskSize: bg.backgroundSize,
  WebkitMaskPosition: bg.backgroundPosition,
  maskPosition: bg.backgroundPosition,
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
});

// A new look (added blank from the editor's Content panel) gets this to
// replace, rather than opening on an empty piece list.
const PLACEHOLDER_PIECES = [
  { brand: "Nike", name: "Essential Tee", price: 59 },
  { brand: "Nikey", name: "Relaxed Pant", price: 89 },
  { brand: "Nike", name: "Everyday Sneaker", price: 119 },
];

/** The editor's Content panel writes a piece list as plain lines, one piece
 * each — "Brand | Name | Price". */
function parsePiecesText(text) {
  return String(text || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l, i) => {
      const [brand, name, price] = l.split("|").map((s) => s.trim());
      return {
        brand: brand || "Nike",
        name: name || `Piece ${i + 1}`,
        price: Number.parseFloat(String(price).replace(/[^0-9.]/g, "")) || 0,
      };
    });
}

function normPieces(pieces) {
  if (!Array.isArray(pieces) || !pieces.length) return [];
  return pieces.map((p, i) => ({
    brand: String(p?.brand ?? "Nike"),
    name: String(p?.name ?? `Piece ${i + 1}`),
    price: Number.isFinite(p?.price) ? p.price : 0,
    color: p?.color || SWATCH_COLORS[i % SWATCH_COLORS.length],
  }));
}

function normLook(entry, i) {
  const base = entry && typeof entry === "object" ? entry : {};
  const pieces = Array.isArray(base.pieces) && base.pieces.length
    ? base.pieces
    : base.piecesText
      ? parsePiecesText(base.piecesText)
      : PLACEHOLDER_PIECES;
  return {
    label: String(base.label ?? `Look ${i + 1}`),
    image: base.src || base.image || "",
    pieces: normPieces(pieces),
  };
}

const money = (n) => `$${n.toFixed(2)}`;

/** The backdrop's vertical panel texture, one plate every `width` px. */
const plateTexture = (width) => {
  const w = clamp(Number(width) || 0, 0, 200);
  if (!w) return "none";
  const at = (f) => `${(f * w).toFixed(2)}px`;
  return `repeating-linear-gradient(90deg,
    rgba(0,0,0,0.2) 0px,
    rgba(0,0,0,0.2) ${at(1 / 17)},
    rgba(0,0,0,0) ${at(3 / 17)},
    rgba(0,0,0,0) ${at(8 / 17)},
    rgba(255,140,110,0.1) ${at(10 / 17)},
    rgba(0,0,0,0) ${at(12 / 17)},
    rgba(0,0,0,0.08) ${at(16 / 17)},
    rgba(0,0,0,0.2) ${at(1)})`;
};

/* ----------------------------------------------------------------- pieces -- */

/** A garment thumbnail: the piece cropped out of the outfit sheet (column =
 * the look's number, row = top / bottom / shoes) on a soft light tile. */
function Swatch({ sheet, col, row, size = 56 }) {
  const [x, y, w, h] = OUTFIT_BOX[row * 9 + col];
  const s = Math.min((size * 0.9) / w, (size * 0.9) / h);
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        flex: "0 0 auto",
        borderRadius: 10,
        background: "#ECE7E0",
        border: "1px solid rgba(0,0,0,0.08)",
        backgroundImage: `url("${sheet}")`,
        backgroundRepeat: "no-repeat",
        backgroundSize: `${O_W * s}px ${O_H * s}px`,
        backgroundPosition: `${size / 2 - (x + w / 2) * s}px ${size / 2 - (y + h / 2) * s}px`,
      }}
    />
  );
}

/** A plain colour tile, for a look with its own photo (no outfit sheet crop). */
function ColorSwatch({ color, label, size = 56 }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        flex: "0 0 auto",
        borderRadius: 10,
        background: `linear-gradient(155deg, ${color} 0%, rgba(0,0,0,0.18) 100%)`,
        border: "1px solid rgba(0,0,0,0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "rgba(255,255,255,0.85)",
        fontSize: size * 0.32,
        fontWeight: 700,
        textTransform: "uppercase",
      }}
    >
      {label.slice(0, 1)}
    </div>
  );
}

/* ----------------------------------------------------------------- component */

export default function TryTheLook({
  looks = DEFAULT_LOOKS,
  modelSheet = MODEL_SHEET,
  outfitSheet = OUTFIT_SHEET,
  defaultActiveIndex,
  activeIndex: controlledIndex,
  heading = "Try the Look.",
  subheading = "Nine looks, styled head to toe. Tap a pin to see the piece.",
  bundleLabel = "Complete the look",
  bundleDiscount = 0.1,
  addToBagLabel = "Add full look to bag",
  autoplay = true,
  autoplaySeconds = 5,
  spacing = 1,
  cardScale = 1,
  spinSeconds = 0.68,
  plateWidth = 17,
  background = `
    radial-gradient(ellipse 80% 75% at 55% 50%, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 38%, rgba(25,0,0,0.42) 68%, rgba(8,0,0,0.88) 100%),
    radial-gradient(ellipse 45% 50% at 6% 4%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 70%),
    radial-gradient(ellipse 70% 65% at 55% 48%, #F43E22 0%, #DC2A1A 28%, #A8180F 56%, #5C0B07 82%, #2A0504 100%)
  `,
  color = "#F6E9DE",
  accent = "#FF5A32",
  onChange,
  onAddToBag,
  style,
}) {
  const items = useMemo(
    () => (Array.isArray(looks) && looks.length ? looks : DEFAULT_LOOKS).map((l, i) => normLook(l, i)),
    [looks]
  );
  const n = items.length;
  // Bodies on the ring: enough that the wrap point is always out of sight (at
  // least nine), and a whole multiple of the looks so the order stays unbroken.
  const N = n * Math.ceil(9 / n);

  const [box, setBox] = useState({ w: 0, h: 0 });
  const rootRef = useRef(null);
  const stageRef = useRef(null);

  const startActive = clamp(defaultActiveIndex ?? Math.min(4, n - 1), 0, Math.max(0, n - 1));
  const [activeState, setActiveState] = useState(startActive);
  const activeRef = useRef(startActive);

  // Everything the frame loop needs, read fresh every frame.
  const live = useRef(null);
  live.current = { box, n, N, spacing, cardScale, spinSeconds, autoplay, autoplaySeconds, narrow: box.w > 0 && box.w < 760, onChange, items };

  // Ring state: `cur` chases `target` (both in looks, unwrapped).
  const sim = useRef({ cur: startActive - ENTRANCE, vel: 0, target: startActive, prog: 0, dragging: false, still: false });
  const els = useRef({ card: [], shadow: [], view: [], sweep: [], bar: null });
  const setters = useRef({});
  const setter = (kind, i) => {
    const key = kind + i;
    return setters.current[key] || (setters.current[key] = (el) => (els.current[kind][i] = el));
  };
  const clickBlock = useRef(0);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setBox({ w: width, h: height });
    });
    ro.observe(el);
    setBox(el.getBoundingClientRect());
    return () => ro.disconnect();
  }, []);

  const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Makes look `i` the active one and aims the ring at its nearest body.
  const aimAt = (target) => {
    const L = live.current;
    const s = sim.current;
    s.target = target;
    s.prog = 0;
    const next = mod(Math.round(target), L.n);
    if (reduced()) {
      s.cur = target;
      s.vel = 0;
    }
    if (next !== activeRef.current) {
      activeRef.current = next;
      setActiveState(next);
      L.onChange?.(next, L.items[next]);
    }
  };
  const pickIndex = (i) => {
    const L = live.current;
    const s = sim.current;
    const idx = mod(Math.trunc(i) || 0, L.n);
    aimAt(idx + L.n * Math.round((s.cur - idx) / L.n));
  };
  const step = (dir) => aimAt(Math.round(sim.current.target) + dir);

  /* ---- the frame loop: spring, autoplay, and writing every body's style */
  useEffect(() => {
    let raf;
    let last = performance.now();
    const frame = (now) => {
      const L = live.current;
      const s = sim.current;
      const dt = Math.min(0.034, Math.max(0, (now - last) / 1000));
      last = now;

      if (!s.dragging) {
        const K = SPRING_K * Math.pow(0.68 / Math.max(0.15, L.spinSeconds), 2);
        const C = 2 * Math.sqrt(K);
        if (reduced()) {
          s.cur = s.target;
          s.vel = 0;
        } else {
          const h = dt / 3;
          for (let k = 0; k < 3; k++) {
            const acc = -K * (s.cur - s.target) - C * s.vel;
            s.vel += acc * h;
            s.cur += s.vel * h;
          }
          if (Math.abs(s.cur - s.target) < 0.0005 && Math.abs(s.vel) < 0.005) {
            s.cur = s.target;
            s.vel = 0;
          }
        }
      }
      const settled = s.cur === s.target && !s.dragging;
      if (settled && Math.abs(s.target) > 4 * L.N) {
        const shift = Math.round(s.target / L.N) * L.N;
        s.cur -= shift;
        s.target -= shift;
      }

      // Autoplay with a progress bar along the bottom edge.
      if (L.autoplay && L.n > 1 && !reduced()) {
        if (!s.dragging && !document.hidden) s.prog += dt / Math.max(0.5, L.autoplaySeconds);
        if (s.prog >= 1) {
          s.prog = 0;
          step(1);
        }
      } else s.prog = 0;
      const bar = els.current.bar;
      if (bar) bar.style.transform = `scaleX(${L.autoplay && !reduced() ? clamp(s.prog, 0, 1).toFixed(4) : 0})`;

      writeFrame(L, s.cur);
      raf = requestAnimationFrame(frame);
    };
    const writeFrame = (L, cur) => {
      const { box: b, narrow, N: bodies, spacing: sp, cardScale: cs } = L;
      const W = b.w || 600;
      const H = b.h || 600;
      const cardH = clamp(H * (narrow ? 0.66 : 0.88), 260, 1400) * clamp(cs, 0.5, 1.8);
      const cardW = cardH * PHOTO_RATIO;
      const stepDeg = STEP_DEG * clamp(sp, 0.5, 1.6);
      const R = RING_R * W;
      const P = RING_P * W;
      for (let i = 0; i < bodies; i++) {
        const d = wrap(i - cur, bodies);
        const sl = Math.abs(d);
        let x;
        let up;
        let scale;
        let op;
        if (narrow) {
          // Phone: one diagonal line, stepping smaller up and out to the side.
          x = d * LINE_SX * W * Math.pow(LINE_SR, Math.max(0, sl - 1) * 0.5);
          up = sl * LINE_AY;
          scale = Math.pow(LINE_SR, Math.min(sl, 3)) * (1 + (FRONT_SCALE - 1) * clamp(1 - sl, 0, 1));
          op = clamp(2.6 - sl, 0, 1);
        } else {
          const phi = (clamp(d * stepDeg, -180, 180) * Math.PI) / 180;
          const z = R * (1 - Math.cos(phi));
          const persp = P / (P + z);
          scale = persp * (1 + (FRONT_SCALE - 1) * clamp(1 - sl, 0, 1));
          x = R * Math.sin(phi) * persp;
          up = (1 - persp) * (1 - HORIZON) * H;
          op = clamp((Math.cos(phi) + 0.55) / 0.3, 0, 1);
        }
        const blur = sl <= 1 ? 1.8 * sl : Math.min(1.8 + (sl - 1) * 2, 6.5);
        const bright = 1 - 0.1 * Math.min(sl, 3);
        const card = els.current.card[i];
        if (card) {
          card.style.width = `${cardW.toFixed(1)}px`;
          card.style.height = `${cardH.toFixed(1)}px`;
          card.style.transform = `translateX(calc(-50% + ${x.toFixed(1)}px)) translateY(${(-up).toFixed(1)}px) scale(${scale.toFixed(4)})`;
          card.style.filter = `blur(${blur.toFixed(2)}px) brightness(${bright.toFixed(3)})`;
          card.style.opacity = op.toFixed(3);
          card.style.zIndex = String(Math.round(scale * 1000) + 10);
          card.style.visibility = op <= 0.001 ? "hidden" : "visible";
          card.style.pointerEvents = op < 0.2 ? "none" : "auto";
        }
        const sh = els.current.shadow[i];
        if (sh) {
          sh.style.width = `${(cardW * 0.74 * scale).toFixed(1)}px`;
          sh.style.height = `${(cardW * 0.46 * scale * 0.22).toFixed(1)}px`;
          sh.style.transform = `translateX(calc(-50% + ${x.toFixed(1)}px)) translateY(${(-up).toFixed(1)}px)`;
          sh.style.opacity = (Math.max(0, 1 - sl * 0.35) * 0.75 * op).toFixed(3);
          sh.style.zIndex = String(Math.round(scale * 1000));
        }
        const v = els.current.view[i];
        if (v) v.style.opacity = clamp(1 - sl * 4, 0, 1).toFixed(3);
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A controlled `activeIndex` is honoured the same way a click would be.
  const isControlled = controlledIndex != null;
  useEffect(() => {
    if (isControlled) pickIndex(controlledIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlledIndex, n]);

  // The light sweep: a soft band that crosses the active model once it lands.
  useEffect(() => {
    if (reduced()) return;
    const t = setTimeout(() => {
      const body = mod(Math.round(sim.current.target), live.current.N);
      const sw = els.current.sweep[body];
      if (sw && sw.animate) {
        sw.animate(
          [
            { backgroundPosition: "100% 0", opacity: 1 },
            { backgroundPosition: "0% 0", opacity: 1 },
          ],
          { duration: 1500, easing: "cubic-bezier(.4,0,.2,1)" }
        );
      }
    }, 420);
    return () => clearTimeout(t);
  }, [activeState]);

  /* ---- drag / swipe, trackpad wheel, keyboard */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let down = null;
    let wheelLock = 0;
    const perStep = () => 0.3 * (live.current.box.w || 600);
    const onDown = (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      down = { x: e.clientX, t: performance.now(), startCur: sim.current.cur, id: e.pointerId, moved: false, lastX: e.clientX, lastT: performance.now(), vel: 0 };
    };
    const onMove = (e) => {
      if (!down || e.pointerId !== down.id) return;
      const dx = e.clientX - down.x;
      if (!down.moved && Math.abs(dx) > DRAG_THRESHOLD) {
        down.moved = true;
        sim.current.dragging = true;
        sim.current.vel = 0;
        try { stage.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        stage.style.cursor = "grabbing";
      }
      if (down.moved) {
        const now = performance.now();
        const dtm = Math.max(1, now - down.lastT);
        down.vel = down.vel * 0.6 + (((e.clientX - down.lastX) / perStep()) / dtm) * 1000 * 0.4;
        down.lastX = e.clientX;
        down.lastT = now;
        sim.current.cur = down.startCur - dx / perStep();
        sim.current.target = sim.current.cur;
        sim.current.prog = 0;
      }
    };
    const onUp = (e) => {
      if (!down || e.pointerId !== down.id) return;
      if (down.moved) {
        clickBlock.current = performance.now() + 80;
        sim.current.dragging = false;
        stage.style.cursor = "";
        const fling = clamp(-down.vel * 0.18, -2.5, 2.5);
        aimAt(Math.round(sim.current.cur + fling));
      }
      down = null;
    };
    const onWheel = (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || Math.abs(e.deltaX) < WHEEL_THRESHOLD) return;
      e.preventDefault();
      const now = performance.now();
      if (now < wheelLock) return;
      wheelLock = now + WHEEL_LOCK_MS;
      step(e.deltaX > 0 ? 1 : -1);
    };
    stage.addEventListener("pointerdown", onDown);
    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerup", onUp);
    stage.addEventListener("pointercancel", onUp);
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      stage.removeEventListener("pointerdown", onDown);
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerup", onUp);
      stage.removeEventListener("pointercancel", onUp);
      stage.removeEventListener("wheel", onWheel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onKeyDown = (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
  };

  const narrow = box.w > 0 && box.w < 760;
  const active = activeState;
  const current = items[active] || items[0];
  const total = current.pieces.reduce((s, p) => s + p.price, 0);
  const discounted = total * (1 - clamp(bundleDiscount, 0, 1));

  const handlePick = (i) => {
    if (performance.now() < clickBlock.current) return;
    pickIndex(i);
  };

  const pad = narrow ? 18 : 40;
  const headingSize = Math.max(40, Math.min((box.w || 800) * 0.112, (box.h || 600) * 0.3));
  // The card box the characters are sized by (kept identical to before); each
  // figure is drawn at its sprite's own size and scaled up to it.
  const cardH = clamp((box.h || 600) * (narrow ? 0.66 : 0.88), 260, 1400) * clamp(cardScale, 0.5, 1.8);
  const bundleCard = (
    <BundleCard
      narrow={narrow}
      bundleLabel={bundleLabel}
      discounted={discounted}
      total={total}
      bundleDiscount={bundleDiscount}
      accent={accent}
      addToBagLabel={addToBagLabel}
      onAdd={() => onAddToBag?.(current.pieces, null, current, active)}
    />
  );
  const bodies = Array.from({ length: N }, (_, b) => b);
  const curFig = figureOf(current, active, modelSheet);
  const curK = active % 9;

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      style={{
        ...style,
        position: "relative",
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        background,
        color,
        fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        overflow: "hidden",
        outline: "none",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: plateTexture(plateWidth),
          WebkitMaskImage: "radial-gradient(ellipse 85% 80% at 55% 50%, #000 40%, rgba(0,0,0,0.35) 100%)",
          maskImage: "radial-gradient(ellipse 85% 80% at 55% 50%, #000 40%, rgba(0,0,0,0.35) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* ------------------------------------------------------- the stage */}
      <div
        ref={stageRef}
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          overflow: "hidden",
          touchAction: "pan-y",
        }}
      >
        <h2
          style={{
            position: "absolute",
            left: "50%",
            top: narrow ? "30%" : "21%",
            transform: "translate(-50%, -50%)",
            margin: 0,
            whiteSpace: "nowrap",
            fontSize: headingSize,
            fontWeight: 900,
            letterSpacing: "-0.035em",
            textTransform: "uppercase",
            lineHeight: 0.9,
            opacity: 0.34,
            pointerEvents: "none",
            userSelect: "none",
            zIndex: 0,
          }}
        >
          {heading}
        </h2>
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: "50%",
            bottom: 0,
            transform: "translateX(-50%)",
            width: "46%",
            height: "88%",
            background: "radial-gradient(ellipse 60% 85% at 50% 100%, rgba(255,214,180,0.22) 0%, rgba(255,214,180,0) 70%)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
        {bodies.map((b) => {
          const li = b % n;
          const look = items[li];
          const fig = figureOf(look, li, modelSheet);
          const isActive = li === active;
          return (
            <Fragment key={b}>
              <div
                ref={setter("shadow", b)}
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: "50%",
                  bottom: 2,
                  borderRadius: "50%",
                  background: "radial-gradient(ellipse at center, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.32) 55%, rgba(0,0,0,0) 80%)",
                  filter: "blur(4px)",
                  pointerEvents: "none",
                  opacity: 0,
                }}
              />
              <button
                ref={setter("card", b)}
                type="button"
                onClick={() => handlePick(li)}
                aria-label={`Show the ${look.label} look`}
                aria-pressed={isActive}
                style={{
                  position: "absolute",
                  left: "50%",
                  bottom: 0,
                  transformOrigin: "50% 100%",
                  border: "none",
                  background: "none",
                  padding: 0,
                  cursor: isActive ? "default" : "pointer",
                  opacity: 0,
                  willChange: "transform, filter, opacity",
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: "50%",
                    bottom: 0,
                    width: fig.w,
                    height: fig.h,
                    marginLeft: -fig.ox,
                    transformOrigin: `${fig.ox}px 100%`,
                    transform: `scale(${(cardH / fig.sr).toFixed(4)})`,
                    pointerEvents: "none",
                    userSelect: "none",
                    ...fig.bg,
                  }}
                >
                  <div
                    ref={setter("sweep", b)}
                    style={{
                      position: "absolute",
                      inset: 0,
                      opacity: 0,
                      mixBlendMode: "soft-light",
                      backgroundImage:
                        "linear-gradient(100deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.95) 50%, rgba(255,255,255,0) 70%)",
                      backgroundSize: "300% 100%",
                      backgroundPosition: "100% 0",
                      backgroundRepeat: "no-repeat",
                      ...maskOf(fig.bg),
                    }}
                  />
                </div>
                <span
                  ref={setter("view", b)}
                  style={{
                    position: "absolute",
                    left: "50%",
                    bottom: "42%",
                    transform: "translate(-50%, 50%)",
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.55)",
                    backdropFilter: "blur(2px)",
                    border: "1px solid rgba(0,0,0,0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    fontWeight: 600,
                    color: "#111",
                    pointerEvents: "none",
                    opacity: 0,
                  }}
                >
                  VIEW
                </span>
              </button>
            </Fragment>
          );
        })}
      </div>

      {/* autoplay progress */}
      <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 3, background: "rgba(255,255,255,0.08)", zIndex: 2100, pointerEvents: "none" }}>
        <div ref={(el) => (els.current.bar = el)} style={{ height: "100%", width: "100%", background: accent, transformOrigin: "0 50%", transform: "scaleX(0)" }} />
      </div>

      {/* ------------------------------------------------------ overlays */}
      <p
        style={{
          position: "absolute",
          top: pad,
          left: pad,
          margin: 0,
          maxWidth: narrow ? 240 : 320,
          fontSize: narrow ? 13 : 15,
          lineHeight: 1.5,
          opacity: 0.88,
          zIndex: 2000,
          pointerEvents: "none",
        }}
      >
        {subheading}
      </p>

      <div
        style={{
          position: "absolute",
          left: pad,
          bottom: pad,
          right: narrow ? pad : "auto",
          zIndex: 2000,
          display: "flex",
          alignItems: "stretch",
          gap: 12,
          flexWrap: narrow ? "wrap" : "nowrap",
        }}
      >
        {!narrow && (
          <div
            style={{
              position: "relative",
              flex: "0 0 auto",
              width: 150,
              borderRadius: 18,
              overflow: "hidden",
              background: `linear-gradient(160deg, ${accent} 0%, #a3140b 100%)`,
              boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
            }}
          >
            {/* head-and-shoulders crop of the active model */}
            <div
              aria-hidden="true"
              style={
                current.image
                  ? {
                      position: "absolute",
                      inset: 0,
                      backgroundImage: `url("${current.image}")`,
                      backgroundSize: "cover",
                      backgroundPosition: "50% 0%",
                      transform: "scale(1.9)",
                      transformOrigin: "50% 6%",
                    }
                  : {
                      position: "absolute",
                      inset: 0,
                      backgroundImage: `url("${modelSheet}")`,
                      backgroundRepeat: "no-repeat",
                      backgroundSize: `${M_W * 0.72}px ${M_H * 0.72}px`,
                      backgroundPosition: `${75 - MODEL_CX[curK] * 0.72}px ${-(ROW_TOP[Math.floor(curK / 3)] - 4) * 0.72}px`,
                    }
              }
            />
            <div
              style={{
                position: "absolute",
                left: 10,
                bottom: 10,
                padding: "4px 10px",
                borderRadius: 999,
                background: "rgba(0,0,0,0.45)",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.03em",
                whiteSpace: "nowrap",
              }}
            >
              {current.label}
            </div>
          </div>
        )}

        {!narrow && (
          <div style={{ ...glassCard, flex: "0 0 260px", padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>In this look</div>
              <div style={{ fontSize: 11, letterSpacing: "0.06em", opacity: 0.6 }}>
                {current.pieces.length} PIECE{current.pieces.length === 1 ? "" : "S"}
              </div>
            </div>
            {current.pieces.map((piece, i) => (
              <div
                key={`${active}-${i}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "7px 0",
                  borderTop: i ? "1px solid rgba(255,255,255,0.12)" : "none",
                }}
              >
                {!current.image && i < 3 ? (
                  <Swatch sheet={outfitSheet} col={curK} row={i} size={32} />
                ) : (
                  <ColorSwatch color={piece.color} label={piece.brand} size={32} />
                )}
                <div style={{ flex: "1 1 auto", minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {piece.name}
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>
                    {piece.brand} · {money(piece.price)}
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={`Add ${piece.name} to bag`}
                  onClick={() => onAddToBag?.(piece, i, current, active)}
                  style={{
                    flex: "0 0 auto",
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    border: "1px solid rgba(255,255,255,0.35)",
                    background: "none",
                    fontSize: 15,
                    lineHeight: 1,
                    cursor: "pointer",
                    color: "inherit",
                  }}
                >
                  +
                </button>
              </div>
            ))}
          </div>
        )}

        {narrow && bundleCard}
      </div>

      {!narrow && (
        <div style={{ position: "absolute", right: pad, bottom: pad, zIndex: 2000, display: "flex" }}>
          {bundleCard}
        </div>
      )}
    </div>
  );
}

/** The look's bundle total and its "add the whole look" button. */
function BundleCard({ narrow, bundleLabel, discounted, total, bundleDiscount, accent, addToBagLabel, onAdd }) {
  return (
    <div
      style={{
        ...glassCard,
        flex: narrow ? "1 1 auto" : "0 0 200px",
        padding: narrow ? "10px 12px 10px 16px" : "16px 18px",
        display: "flex",
        flexDirection: narrow ? "row" : "column",
        alignItems: narrow ? "center" : "stretch",
        justifyContent: "space-between",
        gap: narrow ? 10 : 0,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: narrow ? 12 : 14, fontWeight: 600, opacity: 0.9 }}>{bundleLabel}</div>
        <div style={{ fontSize: narrow ? 22 : 38, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1, marginTop: narrow ? 0 : 4 }}>
          {money(discounted)}
        </div>
        {bundleDiscount > 0 && (
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
            <span style={{ textDecoration: "line-through", opacity: 0.75 }}>{money(total)}</span>
            {" · "}save {Math.round(bundleDiscount * 100)}%
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onAdd}
        style={{
          flex: "0 0 auto",
          marginTop: narrow ? 0 : 12,
          padding: "10px 14px",
          border: "none",
          borderRadius: 999,
          background: accent,
          color: "#FFFFFF",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          whiteSpace: "nowrap",
        }}
      >
        {addToBagLabel}
        <span aria-hidden="true">→</span>
      </button>
    </div>
  );
}

const glassCard = {
  boxSizing: "border-box",
  borderRadius: 18,
  background: "rgba(255,255,255,0.1)",
  border: "1px solid rgba(255,255,255,0.18)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  boxShadow: "0 18px 40px rgba(0,0,0,0.3)",
};
