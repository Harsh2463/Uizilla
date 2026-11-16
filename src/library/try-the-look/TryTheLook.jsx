import { Fragment, useEffect, useMemo, useRef, useState } from "react";

/**
 * TryTheLook — a round-carousel style row of looks, built on the same ring
 * idea RoundCarousel uses (every card sits at its own fixed angle, and only
 * the ring's own, ever-accumulating rotation changes), but projected so a
 * card's distance from centre only ever grows as it turns away — it eases
 * out to the side and fades there, it never swings back through the middle
 * on its way round. That also means nothing is ever stacked directly behind
 * the front card: anywhere a card is visible, it is to one side or the
 * other. The one card right at the back of the turn is, geometrically, as
 * far to the "left" as it is to the "right", so it is drawn once at each
 * edge — the two faint, fully-blurred figures the reference image shows
 * glimpsed at either side.
 *
 * Because the ring's rotation is one continuous value that only ever adds up
 * (it is never snapped back into a 0–360 range), a lap never "resets" — the
 * look that eases out on one side is the same look easing back in on the
 * other, not a copy jumping back to a start line.
 *
 * Clicking any character turns the ring the short way to bring it to front
 * and swaps the side panel to that look's pieces, bundle price and an
 * "Add full look to bag" button. An optional autoplay (▶) turns the ring on
 * its own. `spacing`, `cardScale`, `spinSeconds` and `autoplaySeconds` tune
 * how far apart the cards sit, how large they are, how smoothly a turn
 * settles, and how fast autoplay steps.
 *
 * Self-contained: copy this single file into any React (16.8+) project and
 * render <TryTheLook />. No other packages, CSS or files needed — plain DOM
 * and CSS (no WebGL), so any image address works. It fills 100% of its
 * parent, so give the parent a height, e.g.
 *   <div style={{ height: 640 }}><TryTheLook /></div>
 *
 * Each entry of `looks` is:
 *   { label, src?, pieces?: [{ brand, name, price, color? }], piecesText? }
 * `src` is that look's own photo; it falls back to `characterImage` for any
 * look that doesn't have one yet (or whose own URL turns out broken — each
 * is probed, like RoundCarousel's own images). `pieces` have no product
 * image of their own yet, so each is drawn as a plain swatch carrying its
 * `color` and its name/brand as text; `piecesText` is the same thing as
 * plain lines ("Brand | Name | Price"), the shape the editor's own Content
 * panel writes — either works, and a look with neither gets a placeholder
 * set of three to replace. `looks` can grow to any length — adding more
 * never changes how many read as "in view" at once (see `FALLOFF_RINGS`),
 * it only gives the carousel more to turn through.
 */

/* ---------------------------------------------------------------- constants */

const CHARACTER_IMAGE =
  "https://reel-ref-try-the-look.vercel.app/assets/model-3-640.webp";

/** Card scale at dead centre, and once it has eased all the way to the edge —
 * kept close together on purpose: characters stay almost the same size, the
 * turn is read from blur, fade and the small height shift below instead. */
const FRONT_SCALE = 1.04;
const BACK_SCALE = 0.94;
/** How many px a card rises as it eases out — a few pixels' difference by
 * how close it is to centre, not a size change. */
const MAX_LIFT = 22;
/** Blur (px) once a card has eased all the way to the edge; 0 at centre. */
const MAX_BLUR = 8;
/** Opacity once a card has eased all the way to the edge; 1 at centre. Kept
 * very low — at the far point of the turn a card should read as barely
 * there, almost lost into the white, not just "a bit faded". */
const MIN_OPACITY = 0.04;
/** <1 keeps the near card (one step out) reading almost clear and only lets
 * the next one out (two steps) pick up real, visible blur — so the row goes
 * "near and clear" → "further and blurred" → "a ghost", rather than an even
 * gradient from the first step onward. */
const FALLOFF_EASE = 0.72;
/** How many rings out a card fades to fully blurred and barely-there by —
 * fixed, in ring counts rather than degrees, so the composition looks
 * exactly the same (same few in clear view, same two fully blurred at the
 * edges) whether there are 6 looks or 60. Adding more looks only gives the
 * carousel more to cycle through, never a more crowded row. */
const FALLOFF_RINGS = 3;
/** How sharply the mirrored "far edge" echo (the card most turned away)
 * fades in — only the card nearest the back ever shows it, never one that is
 * still only a step or two out, so just 4 cards read as clearly in view. */
const MIRROR_POWER = 3.4;
/** How far back a card sits (px, CSS translateZ) once it has eased all the
 * way out — real depth, read through the stage's own `perspective`, the same
 * way RoundCarousel's ring recedes. Never rotateY on the card itself: that
 * would turn the flat photo side-on and skew it, which a turning photograph
 * of a person reads as "squeezed" rather than "further away". */
const MAX_DEPTH = 220;
/** Where the "2nd" card (one step out) sits, as a share of the furthest a
 * card ever travels — kept low on purpose, so it reads as clearly short of
 * the edge, with a gap before the cluster of far cards. */
const NEAR_FRACTION = 0.4;
/** Where the "3rd" card (two steps out) sits — right at the edge. */
const FAR_FRACTION = 0.97;
/** Where the mirrored "4th" echo (the one card furthest round the turn,
 * drawn once at each edge) sits — a little short of the 3rd card's own
 * position, so it reads as tucked in just behind it, not side by side. */
const MIRROR_X_FRACTION = 0.8;
/** Cubic ease-out — the turn starts at full speed and settles gently,
 * whether it is one ring or five; only the overall duration changes with
 * distance, never the shape of the curve. */
const EASE = (t) => 1 - Math.pow(1 - t, 3);

const SWATCH_COLORS = ["#D9CDBF", "#1A1A1C", "#9AA3AD", "#6B5B4D", "#3C4654", "#B8471F"];

const MODEL = (n) => `https://reel-ref-try-the-look.vercel.app/assets/model-${n}-640.webp`;

// Nine sample looks, each its own photo — proof that adding more only gives
// the carousel more to cycle through; the row itself never gets busier.
export const DEFAULT_LOOKS = [
  {
    label: "Street",
    src: MODEL(1),
    pieces: [
      { brand: "Nike", name: "Oversized Hoodie", price: 118, color: "#3F4A3A" },
      { brand: "Nikey", name: "Baggy Denim", price: 96, color: "#8CA0C4" },
      { brand: "Nike", name: "Low Top Sneaker", price: 139, color: "#E8E3DB" },
    ],
  },
  {
    label: "Off Duty",
    src: MODEL(2),
    pieces: [
      { brand: "Nike", name: "Boxy Tee", price: 59, color: "#16181B" },
      { brand: "Nikey", name: "Relaxed Jeans", price: 92, color: "#A9C2D9" },
      { brand: "Nike", name: "Court Sneaker", price: 129, color: "#EDEDED" },
    ],
  },
  {
    label: "Game Day",
    src: MODEL(3),
    pieces: [
      { brand: "Nike", name: "Varsity Jacket", price: 168, color: "#8A8F99" },
      { brand: "Nikey", name: "Track Pant", price: 84, color: "#1F2327" },
      { brand: "Nike", name: "Crew Sock", price: 18, color: "#C9372C" },
    ],
  },
  {
    label: "Weekend",
    src: MODEL(4),
    pieces: [
      { brand: "Nike", name: "Half Zip Pullover", price: 110, color: "#6F7A82" },
      { brand: "Nikey", name: "Wide Chino", price: 88, color: "#C8BBA0" },
      { brand: "Nike", name: "Slide Sandal", price: 46, color: "#2B2E33" },
    ],
  },
  {
    label: "Studio Day",
    src: MODEL(5),
    pieces: [
      { brand: "Nike", name: "Sweatshirt", price: 199, color: "#D9CDBF" },
      { brand: "Nikey", name: "Tatum 5 Orbit", price: 149, color: "#1A1A1C" },
      { brand: "Nike", name: "Reign Tshirt", price: 199, color: "#17181A" },
    ],
  },
  {
    label: "Night Out",
    src: MODEL(6),
    pieces: [
      { brand: "Nike", name: "Tech Fleece Jacket", price: 185, color: "#15171A" },
      { brand: "Nikey", name: "Slim Joggers", price: 95, color: "#2E323A" },
      { brand: "Nike", name: "High Top Sneaker", price: 155, color: "#B8471F" },
    ],
  },
  {
    label: "City Walk",
    src: MODEL(7),
    pieces: [
      { brand: "Nike", name: "Utility Vest", price: 128, color: "#5B6350" },
      { brand: "Nikey", name: "Cargo Pant", price: 98, color: "#8A7B63" },
      { brand: "Nike", name: "Trail Runner", price: 142, color: "#3E4A5C" },
    ],
  },
  {
    label: "Date Night",
    src: MODEL(8),
    pieces: [
      { brand: "Nike", name: "Knit Polo", price: 88, color: "#2B2420" },
      { brand: "Nikey", name: "Tailored Trouser", price: 112, color: "#3A3F46" },
      { brand: "Nike", name: "Leather Loafer", price: 165, color: "#4A2E22" },
    ],
  },
  {
    label: "Travel Day",
    src: MODEL(9),
    pieces: [
      { brand: "Nike", name: "Packable Jacket", price: 135, color: "#4C5A63" },
      { brand: "Nikey", name: "Tech Jogger", price: 90, color: "#2E2E2E" },
      { brand: "Nike", name: "Slip-On Sneaker", price: 120, color: "#D8D2C4" },
    ],
  },
];

/* ------------------------------------------------------------------ helpers */

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mod = (n, m) => ((n % m) + m) % m;
/** How many steps (signed, the short way round a ring of `n`) from `from` to
 * `to`. Used once per interaction, to decide which way the ring should turn —
 * never to re-derive a card's position each render, which is what would make
 * a lap "reset" instead of simply turning. */
const shortestSteps = (from, to, n) => {
  const half = Math.floor(n / 2);
  return mod(to - from + half, n) - half;
};

// How far out a card sits, as a share of the furthest it ever travels, for
// a ring distance `at` (0..`rings`, already clamped and unsigned) — one ring
// out stays well inward (a gap before the far cluster), two rings out lands
// almost at the very edge.
const shapeByRing = (at, rings) => {
  const t = at / rings;
  return t <= 1 / 3 ? (NEAR_FRACTION / (1 / 3)) * t
    : t <= 2 / 3 ? NEAR_FRACTION + (FAR_FRACTION - NEAR_FRACTION) * ((t - 1 / 3) / (1 / 3))
    : FAR_FRACTION + (1 - FAR_FRACTION) * ((t - 2 / 3) / (1 / 3));
};

/**
 * Writes every card's position, depth, blur and fade straight to the DOM for
 * one instant of `rotY` (degrees). Called every animation frame with the
 * ring's current, continuously-eased angle — never left for CSS to tween
 * between two computed snapshots — so a long turn follows exactly the same
 * curve a short one does, just for longer, with no seam to catch it out.
 *
 * Every shape here is driven by ring distance (how many looks away a card
 * is), not degrees — so it looks the same whether the ring holds 6 looks or
 * 60; only how far it has to turn to reach a distant one changes, not how
 * many read as "in view" at a time.
 */
function applyFrame(rotY, live, cardEls, mirrorEls, viewEls) {
  if (!live) return;
  const { box, narrow, spacing, cardScale, n, stepAngle } = live;
  const stageW = (box.w || 600) - (narrow ? 0 : 340);
  const cardW = (narrow ? 120 : 170) * clamp(cardScale, 0.5, 1.8);
  const cardH = (narrow ? 300 : 460) * clamp(cardScale, 0.5, 1.8);
  // The furthest a card ever eases out to, either side.
  const edgeX = Math.max(60, stageW * 0.4) * clamp(spacing, 0.4, 2.2);
  // Never more rings than the ring actually has room for either side — so
  // a short ring (fewer looks than twice this) still fully fades out right
  // at its own wrap point, same as always, instead of still being half-lit
  // the instant it has to flip to the other edge.
  const half = n / 2;
  const rings = Math.max(1, Math.min(FALLOFF_RINGS, half));

  for (let i = 0; i < n; i++) {
    const localDeg = i * stepAngle; // this card's own, fixed spot on the ring
    const totalDeg = localDeg + rotY; // where that spot currently faces
    // How many rings away from centre this card is right now, continuous
    // and signed, the short way round — the one place `n` enters the shape
    // of the fade at all, as where it wraps.
    const m = mod(totalDeg / stepAngle + half, n) - half;
    const at = Math.min(Math.abs(m), rings);
    const eased = Math.pow(clamp(1 - at / rings, 0, 1), FALLOFF_EASE);
    const backness = 1 - eased;
    const x = Math.sign(m || 1) * shapeByRing(at, rings) * edgeX;
    // Real depth, not a rotation — the card recedes straight back from the
    // camera (read through the stage's `perspective`), so the photo itself
    // always stays flat-on and is never skewed/"squeezed".
    const z = -backness * MAX_DEPTH;

    const scale = BACK_SCALE + (FRONT_SCALE - BACK_SCALE) * eased;
    const lift = (1 - eased) * MAX_LIFT;
    const blur = (1 - eased) * MAX_BLUR;
    const opacity = MIN_OPACITY + (1 - MIN_OPACITY) * eased;
    // Only the card nearest the far point of the turn ever shows a mirror at
    // the opposite edge — a step or two out shows just its own side.
    const mirrorOpacity = opacity * Math.pow(backness, MIRROR_POWER);
    // The mirror's own spot is fixed (a little short of the edge, on
    // whichever side `x` isn't), not just `x` flipped — so it reads as its
    // own card tucked behind the 3rd one, not a copy riding on it.
    const mirrorX = -Math.sign(x || 1) * MIRROR_X_FRACTION * edgeX;
    const gray = clamp(backness * 0.55, 0, 0.55).toFixed(3);
    // A ground shadow that fades in continuously with `eased`, not an
    // instant on/off switch tied to which look was *clicked* — a card
    // that's been chosen but hasn't visually arrived yet is still, for a
    // moment, the faint, blurred one it was a second ago, and a crisp
    // shadow stamped onto that reads as broken, not "this one's next".
    const shadowAlpha = (eased * 0.22).toFixed(3);

    const el = cardEls[i];
    if (el) {
      el.style.width = `${cardW}px`;
      el.style.height = `${cardH}px`;
      el.style.transform = `translateX(calc(-50% + ${x.toFixed(1)}px)) translateY(-${lift.toFixed(1)}px) translateZ(${z.toFixed(1)}px) scale(${scale.toFixed(4)})`;
      el.style.filter = `blur(${blur.toFixed(2)}px) grayscale(${gray}) drop-shadow(0 ${(18 * eased).toFixed(1)}px ${(26 * eased).toFixed(1)}px rgba(0,0,0,${shadowAlpha}))`;
      el.style.opacity = opacity.toFixed(3);
      el.style.zIndex = String(Math.round(eased * 1000) + 10);
    }
    // The "VIEW" pin only ever reads as attached to the one card that has
    // actually, visually arrived at centre — faded in over the last stretch
    // of its approach — never the one merely *chosen* a moment ago and
    // still travelling, which is what let it show up stamped on a still-far,
    // still-blurred card during a fast run of clicks.
    const vEl = viewEls[i];
    if (vEl) vEl.style.opacity = clamp((eased - 0.85) / 0.15, 0, 1).toFixed(3);
    const mEl = mirrorEls[i];
    if (mEl) {
      mEl.style.width = `${cardW}px`;
      mEl.style.height = `${cardH}px`;
      mEl.style.transform = `translateX(calc(-50% + ${mirrorX.toFixed(1)}px)) translateY(-${lift.toFixed(1)}px) translateZ(${(-MAX_DEPTH).toFixed(1)}px) scale(${BACK_SCALE})`;
      mEl.style.filter = `blur(${MAX_BLUR}px)`;
      mEl.style.opacity = mirrorOpacity.toFixed(3);
    }
  }
}

// A new look (added blank from the editor's Content panel) gets this to
// replace, rather than opening on an empty piece list.
const PLACEHOLDER_PIECES = [
  { brand: "Nike", name: "Essential Tee", price: 59 },
  { brand: "Nikey", name: "Relaxed Pant", price: 89 },
  { brand: "Nike", name: "Everyday Sneaker", price: 119 },
];

/** The editor's Content panel writes a piece list as plain lines, one piece
 * each — "Brand | Name | Price" — since it has no field type for a list of
 * structured records. Blank or malformed parts fall back sensibly rather
 * than breaking the row. */
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

const piecesToText = (pieces) =>
  (Array.isArray(pieces) ? pieces : [])
    .map((p) => `${p?.brand ?? "Nike"} | ${p?.name ?? ""} | ${p?.price ?? 0}`)
    .join("\n");

function normPieces(pieces) {
  if (!Array.isArray(pieces) || !pieces.length) return [];
  return pieces.map((p, i) => ({
    brand: String(p?.brand ?? "Nike"),
    name: String(p?.name ?? `Piece ${i + 1}`),
    price: Number.isFinite(p?.price) ? p.price : 0,
    color: p?.color || SWATCH_COLORS[i % SWATCH_COLORS.length],
  }));
}

function normLook(entry, i, fallbackImage) {
  const base = entry && typeof entry === "object" ? entry : {};
  // `pieces` (an array, for programmatic use) wins over `piecesText` (plain
  // lines, what the editor's Content panel writes); neither present gets a
  // placeholder set to replace, rather than an empty list.
  const pieces = Array.isArray(base.pieces) && base.pieces.length
    ? base.pieces
    : base.piecesText
      ? parsePiecesText(base.piecesText)
      : PLACEHOLDER_PIECES;
  return {
    label: String(base.label ?? `Look ${i + 1}`),
    image: base.src || base.image || fallbackImage,
    pieces: normPieces(pieces),
  };
}

const money = (n) => `$${n.toFixed(2)}`;

/* ----------------------------------------------------------------- pieces -- */

/** A placeholder swatch for a garment — a coloured card carrying its initial,
 * used until a real product photo is wired in. */
function Swatch({ color, label, size = 56 }) {
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
  characterImage = CHARACTER_IMAGE,
  defaultActiveIndex,
  activeIndex: controlledIndex,
  heading = "Try the Look.",
  subheading = "Nine looks, styled head to toe. Tap a pin to see the piece.",
  bundleLabel = "Complete the look",
  bundleDiscount = 0.1,
  addToBagLabel = "Add full look to bag",
  autoplay = false,
  autoplaySeconds = 3.2,
  spacing = 1,
  cardScale = 1,
  spinSeconds = 0.68,
  sidebarCollapsible = true,
  defaultSidebarOpen = true,
  background = "#FFFFFF",
  color = "#111111",
  accent = "#111111",
  onChange,
  onAddToBag,
  style,
}) {
  const items = useMemo(
    () =>
      (Array.isArray(looks) && looks.length ? looks : DEFAULT_LOOKS).map((l, i) =>
        normLook(l, i, characterImage)
      ),
    [looks, characterImage]
  );
  const n = items.length;
  const stepAngle = 360 / n;

  // If a look's own photo URL is broken, swap just that card for
  // `characterImage` instead of leaving a broken-image icon in the ring.
  const [failedImages, setFailedImages] = useState(() => new Set());
  const srcKey = items.map((it) => it.image).join("|");
  useEffect(() => {
    let cancelled = false;
    setFailedImages(new Set());
    items.forEach((it, i) => {
      if (!it.image) return;
      const probe = new Image();
      probe.onerror = () => {
        if (cancelled) return;
        setFailedImages((prev) => (prev.has(i) ? prev : new Set(prev).add(i)));
      };
      probe.src = it.image;
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [srcKey]);
  const srcOf = (i) => (failedImages.has(i) ? characterImage : items[i].image);

  const [box, setBox] = useState({ w: 0, h: 0 });
  const [playing, setPlaying] = useState(autoplay);
  const [sidebarOpen, setSidebarOpen] = useState(defaultSidebarOpen);
  const rootRef = useRef(null);

  const isControlled = controlledIndex != null;
  const startActive = clamp(defaultActiveIndex ?? Math.min(4, n - 1), 0, Math.max(0, n - 1));
  // The number shown under each look is relative to whichever one starts in
  // focus, not raw array order — that one reads "01", and the count carries
  // on to its right (wrapping back round through the left side last), fixed
  // from the start rather than shuffling every time the active one changes.
  const numberOf = (i) => (mod(i - startActive, n) + 1).toString().padStart(2, "0");
  // `activeState` is a normal React value — read for the sidebar, the nav
  // and which card is "active" — and only ever changes once per click, so it
  // re-renders cheaply. The ring's actual turn, in degrees, lives outside
  // React entirely, in `rotYRef`: it only ever accumulates (never snapped
  // back into 0–360), and every card's position, scale, blur and fade is
  // recomputed from it fresh on every animation frame — never left for CSS
  // to interpolate between two snapshots, which is what let a long turn
  // drift out of step with itself and flicker. A short turn and a long one
  // now run the exact same way, just for proportionally longer.
  const [activeState, setActiveState] = useState(startActive);
  const activeRef = useRef(startActive);
  const rotYRef = useRef(-startActive * stepAngle);
  // The turn in flight, if any: eases rotYRef from `from` to `to` over
  // `duration` seconds, started at `start` (performance.now()). Reading
  // rotYRef.current as `from` for a new click — rather than the old click's
  // target — is what keeps rapid successive clicks smooth: each one just
  // redirects the ring from wherever it actually, visually is right now.
  const animRef = useRef(null);
  // Everything the frame loop needs that can change from outside a click —
  // read fresh every frame so a prop change lands on the very next frame.
  const liveRef = useRef(null);
  liveRef.current = { box, narrow: box.w > 0 && box.w < 760, spacing, cardScale, n, stepAngle };
  // One DOM node per card, and its mirrored echo — the frame loop writes
  // straight to these every tick instead of going through React.
  const cardElsRef = useRef([]);
  const mirrorElsRef = useRef([]);
  const viewElsRef = useRef([]);
  // A stable setter function per index, cached rather than written inline —
  // an inline `(el) => ...` is a new function every render, so React would
  // treat the ref as "changed" on every single click (anything that updates
  // `activeState` re-renders this component) and detach-then-reattach every
  // card's DOM node right as it's mid-turn. That brief detach is where a
  // card's position could be read as stale by the very next animation frame
  // — rare enough to look like an occasional skipped beat rather than a
  // crash, but worse the faster someone clicks through. A setter that's the
  // same function across renders is never seen as "changed" at all.
  const cardSettersRef = useRef([]);
  const mirrorSettersRef = useRef([]);
  const viewSettersRef = useRef([]);
  const cardSetter = (i) =>
    cardSettersRef.current[i] || (cardSettersRef.current[i] = (el) => (cardElsRef.current[i] = el));
  const mirrorSetter = (i) =>
    mirrorSettersRef.current[i] || (mirrorSettersRef.current[i] = (el) => (mirrorElsRef.current[i] = el));
  const viewSetter = (i) =>
    viewSettersRef.current[i] || (viewSettersRef.current[i] = (el) => (viewElsRef.current[i] = el));

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

  // Turns the ring by `steps` whole positions (can be negative) — the only
  // place a turn is ever kicked off, including the one that carries a look
  // past the back of the ring.
  const spin = (steps) => {
    if (!steps) return;
    const nextActive = mod(activeRef.current + steps, n);
    // Bled back toward 0 by whole laps before use — rotY is free to run up
    // over a long session (thousands of clicks, autoplay left running for
    // hours), and every formula below is exactly as periodic in 360° as the
    // ring itself, so this never changes a single card's position; it only
    // keeps the numbers small so nothing downstream ever has to deal with
    // an oversized angle that stops reading as "perfect" through sheer
    // floating-point distance from zero.
    const from = rotYRef.current - Math.round(rotYRef.current / 360) * 360;
    // The one rotY that puts `nextActive` dead centre — fixed by its index
    // alone, never by how this turn started — nudged by whichever whole lap
    // keeps it closest to `from`, so the turn still takes the short way
    // round. Clicking again before a turn settles used to carry forward
    // however far that turn had *actually* gotten, which is no longer a
    // round multiple of a step away from centred — so the next turn, built
    // on top of it, would land short of centre by exactly that much. This
    // always targets the one true centred angle for the index, so however
    // many turns get interrupted in a row, the one that's finally allowed
    // to finish always lands dead on.
    const centered = -nextActive * stepAngle;
    const to = centered + Math.round((from - centered) / 360) * 360;
    // A card three rings out has three times as far to travel as one ring
    // out — given proportionally more time too, so every click reads as the
    // same steady speed of turn, not a rushed one the further the clicked
    // character started from centre.
    const duration = Math.max(0.15, spinSeconds) * clamp(1 + (Math.abs(steps) - 1) * 0.42, 1, 2.6);
    animRef.current = { from, to, start: performance.now(), duration };
    const changed = nextActive !== activeRef.current;
    activeRef.current = nextActive;
    setActiveState(nextActive);
    if (changed) onChange?.(nextActive, items[nextActive]);
  };

  const pickIndex = (i) => spin(shortestSteps(activeRef.current, mod(i, n), n));

  // The one frame loop, running for as long as the component is mounted:
  // eases rotYRef toward whatever turn is in flight, then writes every
  // card's transform/filter/opacity straight to the DOM from the current
  // angle — the same thing a static render does, just every ~16ms, so a
  // turn of any length is this one continuous motion rather than a CSS
  // tween between two computed snapshots.
  useEffect(() => {
    let raf;
    const frame = (now) => {
      const anim = animRef.current;
      if (anim) {
        const t = clamp((now - anim.start) / (anim.duration * 1000), 0, 1);
        rotYRef.current = anim.from + (anim.to - anim.from) * EASE(t);
        if (t >= 1) animRef.current = null;
      }
      applyFrame(rotYRef.current, liveRef.current, cardElsRef.current, mirrorElsRef.current, viewElsRef.current);
      raf = requestAnimationFrame(frame);
    };
    applyFrame(rotYRef.current, liveRef.current, cardElsRef.current, mirrorElsRef.current, viewElsRef.current);
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A controlled `activeIndex` is honoured the same way a click would be:
  // spun to the short way round, not snapped.
  useEffect(() => {
    if (!isControlled) return;
    pickIndex(controlledIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlledIndex, n]);

  // Autoplay: steps on its own, and pauses the moment someone interacts.
  useEffect(() => {
    if (!playing || n < 2) return;
    const id = setInterval(() => spin(1), Math.max(0.4, autoplaySeconds) * 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, n, autoplaySeconds]);

  const stopAutoplay = () => setPlaying(false);

  const narrow = box.w > 0 && box.w < 760;
  const active = activeState;
  const current = items[active] || items[0];
  const total = current.pieces.reduce((s, p) => s + p.price, 0);
  const discounted = total * (1 - clamp(bundleDiscount, 0, 1));

  const handlePick = (i) => {
    stopAutoplay();
    pickIndex(i);
  };

  return (
    <div
      ref={rootRef}
      style={{
        ...style,
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        background,
        color,
        fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        display: "flex",
        flexDirection: narrow ? "column" : "row",
        overflow: "hidden",
      }}
    >
      {/* ------------------------------------------------------- the stage */}
      <div
        style={{
          position: "relative",
          flex: "1 1 auto",
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          padding: narrow ? "28px 20px 16px" : "40px 24px 24px 48px",
        }}
      >
        <h2 style={{ margin: 0, fontSize: narrow ? 30 : 42, fontWeight: 500, letterSpacing: "-0.01em" }}>
          {heading}
        </h2>
        <p style={{ margin: "8px 0 0", fontSize: 14, opacity: 0.55, maxWidth: 420 }}>
          {subheading}
        </p>

        <div
          style={{
            position: "relative",
            flex: "1 1 auto",
            minHeight: narrow ? 320 : 0,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            overflow: "hidden",
            paddingTop: 28,
            perspective: `${Math.max(900, (box.w || 600) * 1.3)}px`,
            WebkitPerspective: `${Math.max(900, (box.w || 600) * 1.3)}px`,
          }}
        >
          {items.map((look, i) => {
            const isActive = i === active;
            // Base placement only — every frame, `applyFrame` overwrites
            // width/height/transform/filter/opacity/zIndex on these same
            // nodes directly, so nothing here needs to track the turn.
            const baseStyle = {
              position: "absolute",
              left: "50%",
              bottom: 0,
              transformOrigin: "50% 100%",
            };
            return (
              <Fragment key={i}>
                {/* the mirrored echo at the opposite edge — only visible at all
                    once this card is the one furthest round the turn */}
                <div
                  ref={mirrorSetter(i)}
                  aria-hidden="true"
                  style={{ ...baseStyle, pointerEvents: "none", zIndex: 1 }}
                >
                  <img
                    src={srcOf(i)}
                    alt=""
                    draggable={false}
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      objectPosition: "50% 100%",
                      userSelect: "none",
                      pointerEvents: "none",
                    }}
                  />
                </div>

                <button
                  ref={cardSetter(i)}
                  type="button"
                  onClick={() => handlePick(i)}
                  aria-label={`Show the ${look.label} look`}
                  aria-pressed={isActive}
                  style={{
                    ...baseStyle,
                    border: "none",
                    background: "none",
                    padding: 0,
                    cursor: isActive ? "default" : "pointer",
                  }}
                >
                  <img
                    src={srcOf(i)}
                    alt={look.label}
                    draggable={false}
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      objectPosition: "50% 100%",
                      userSelect: "none",
                      pointerEvents: "none",
                    }}
                  />
                  {/* Always mounted, never conditional on `isActive` — that flips
                      the instant a card is clicked, long before it's visually
                      arrived at centre. Its opacity is set continuously by
                      `applyFrame`, from the same "how close to front" value as
                      everything else, so it only ever reads as attached to
                      whichever card is actually, visually there. */}
                  <span
                    ref={viewSetter(i)}
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

        {/* -------------------------------------------------- bottom nav */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginTop: 18,
          }}
        >
          <button
            type="button"
            aria-label="Previous look"
            onClick={() => handlePick(active - 1)}
            style={navArrowStyle}
          >
            ←
          </button>

          <div style={{ flex: "1 1 auto", display: "flex", gap: 8, minWidth: 0 }}>
            {items.map((look, i) => {
              const isActive = i === active;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handlePick(i)}
                  aria-label={`${look.label} look`}
                  aria-current={isActive}
                  style={{
                    flex: isActive ? "2 1 0" : "1 1 0",
                    minWidth: 0,
                    border: "none",
                    background: "none",
                    padding: 0,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div
                    style={{
                      height: 2,
                      borderRadius: 1,
                      background: isActive ? accent : "rgba(0,0,0,0.15)",
                    }}
                  />
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 11,
                      letterSpacing: "0.04em",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      opacity: isActive ? 1 : 0.45,
                      fontWeight: isActive ? 600 : 400,
                    }}
                  >
                    {numberOf(i)}
                    {isActive ? `  ${look.label}` : ""}
                  </div>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            aria-label={playing ? "Pause" : "Play"}
            aria-pressed={playing}
            onClick={() => setPlaying((p) => !p)}
            style={navArrowStyle}
          >
            {playing ? "❚❚" : "▶"}
          </button>

          <button
            type="button"
            aria-label="Next look"
            onClick={() => handlePick(active + 1)}
            style={navArrowStyle}
          >
            →
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------- sidebar */}
      <div
        style={{
          flex: narrow ? "0 0 auto" : "0 0 340px",
          borderLeft: narrow ? "none" : "1px solid rgba(0,0,0,0.08)",
          borderTop: narrow ? "1px solid rgba(0,0,0,0.08)" : "none",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "24px 24px 12px",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 600 }}>In this look</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 12, letterSpacing: "0.06em", opacity: 0.5, whiteSpace: "nowrap" }}>
              {current.pieces.length} PIECE{current.pieces.length === 1 ? "" : "S"}
            </div>
            {sidebarCollapsible && (
              <button
                type="button"
                onClick={() => setSidebarOpen((o) => !o)}
                aria-label={sidebarOpen ? "Collapse the look panel" : "Expand the look panel"}
                aria-expanded={sidebarOpen}
                style={{
                  flex: "0 0 auto",
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  border: "1px solid rgba(0,0,0,0.15)",
                  background: "none",
                  color: "inherit",
                  fontSize: 11,
                  lineHeight: 1,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: sidebarOpen ? "none" : "rotate(180deg)",
                  transition: "transform 0.25s ease",
                }}
              >
                ▾
              </button>
            )}
          </div>
        </div>

        <div
          style={{
            flex: "1 1 auto",
            minHeight: 0,
            maxHeight: sidebarOpen ? 2000 : 0,
            opacity: sidebarOpen ? 1 : 0,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            transition: "max-height 0.32s ease, opacity 0.22s ease",
          }}
        >
          <div style={{ overflow: "hidden", minHeight: 0, flex: "1 1 auto", display: "flex", flexDirection: "column" }}>
        <div style={{ borderTop: "1px solid rgba(0,0,0,0.1)" }} />

        <div style={{ flex: "1 1 auto", overflowY: "auto", minHeight: 0 }}>
          {current.pieces.map((piece, i) => (
            <div
              key={`${active}-${i}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "16px 24px",
                borderBottom: "1px solid rgba(0,0,0,0.08)",
              }}
            >
              <div
                style={{
                  position: "relative",
                  flex: "0 0 auto",
                  width: 20,
                  fontSize: 11,
                  fontWeight: 600,
                  opacity: 0.45,
                }}
              >
                {i + 1}
              </div>
              <Swatch color={piece.color} label={piece.brand} />
              <div style={{ flex: "1 1 auto", minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    opacity: 0.5,
                    fontWeight: 600,
                  }}
                >
                  {piece.brand}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    marginTop: 2,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {piece.name}
                </div>
                <div style={{ fontSize: 13, marginTop: 2, opacity: 0.7 }}>
                  {money(piece.price)}
                </div>
              </div>
              <button
                type="button"
                aria-label={`Add ${piece.name} to bag`}
                onClick={() => onAddToBag?.(piece, i, current, active)}
                style={{
                  flex: "0 0 auto",
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  border: "1px solid rgba(0,0,0,0.15)",
                  background: "none",
                  fontSize: 16,
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

        <div style={{ padding: "16px 24px 24px", borderTop: "1px solid rgba(0,0,0,0.1)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{bundleLabel}</div>
              {bundleDiscount > 0 && (
                <div style={{ fontSize: 12, opacity: 0.5, marginTop: 2 }}>
                  Bundle all {current.pieces.length} and save{" "}
                  {Math.round(bundleDiscount * 100)}%
                </div>
              )}
            </div>
            <div style={{ textAlign: "right" }}>
              {bundleDiscount > 0 && (
                <div
                  style={{
                    fontSize: 13,
                    opacity: 0.45,
                    textDecoration: "line-through",
                  }}
                >
                  {money(total)}
                </div>
              )}
              <div style={{ fontSize: 17, fontWeight: 700 }}>{money(discounted)}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onAddToBag?.(current.pieces, null, current, active)}
            style={{
              marginTop: 14,
              width: "100%",
              boxSizing: "border-box",
              padding: "14px 18px",
              border: "none",
              borderRadius: 10,
              background: accent,
              color: "#FFFFFF",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            {addToBagLabel}
            <span aria-hidden="true">→</span>
          </button>
        </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const navArrowStyle = {
  flex: "0 0 auto",
  width: 32,
  height: 32,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "none",
  background: "none",
  fontSize: 15,
  cursor: "pointer",
  color: "inherit",
  opacity: 0.75,
};
