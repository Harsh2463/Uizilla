import { Fragment, useEffect, useMemo, useRef, useState } from "react";

/**
 * TryTheLook2 — a round-carousel style row of looks, built on the same ring
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
 * The carousel fills the whole component, with the heading as a giant,
 * dimmed line behind the characters. Clicking any character turns the ring
 * the short way to bring it to front and swaps the floating cards at the
 * bottom-left to that look's pieces, bundle price and an "Add full look to
 * bag" button. An optional `autoplay` turns the ring on its own, pausing on
 * the first click. `spacing`, `cardScale`, `spinSeconds` and `autoplaySeconds` tune
 * how far apart the cards sit, how large they are, how smoothly a turn
 * settles, and how fast autoplay steps.
 *
 * Self-contained: copy this single file into any React (16.8+) project and
 * render <TryTheLook2 />. No other packages, CSS or files needed — plain DOM
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
/** Width ÷ height of the character photos (the sample set is 640×1138).
 * Each card's box uses the same proportion, so a photo fills its box's
 * full height instead of being letterboxed by width. */
const PHOTO_RATIO = 640 / 1138;
/** How many px shorter a card stands per ring out — its height drops by
 * exactly this much for every full ring of distance, so standing order
 * reads straight off position/priority: whichever is front and centre is
 * always the tallest. */
const HEIGHT_STEP_PX = 25;
/** Blur (px) once a card has eased all the way to the edge; 0 at centre.
 * Lighter than it used to be — against a textured, busier backdrop a
 * heavily blurred edge card read as a smear rather than a faded figure. */
const MAX_BLUR = 4;
/** Brightness (CSS `filter` units, 1 = unchanged) once a card has eased all
 * the way to the edge; 1 at centre. Every card stays fully opaque — depth
 * reads through blur and this dimming instead, so a far character is
 * unmistakably still a character, just darker and softer, never faded
 * toward invisible. */
const MIN_BRIGHTNESS = 0.4;
/** How much of its brightness the farthest ring loses on top of that, as a
 * card turns from the 2nd ring out to the last — 0.95 leaves it a
 * near-black silhouette behind the edge cards. */
const FAR_DARKEN = 0.95;
/** Brightness of the mirrored echoes — near-black, so they read as shadows
 * of a figure in the gaps rather than extra characters. */
const MIRROR_BRIGHTNESS = 0.05;
/** Opacity of those near-black silhouettes — the farthest ring and the
 * mirrored echoes — so they sit back as faint shadows. */
const FAR_OPACITY = 0.2;
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
/** How far the mirror is nudged off its resting spot while a turn is still
 * in flight, along the turn's own direction — eased back to 0 by the
 * turn's own progress, so both edges' mirrors always slide the one way
 * the ring is actually turning, and reverse together the moment it turns
 * back, rather than each one closing in toward centre on its own. */
const MIRROR_ENTRY_FRACTION = 0.25;
/** The turn's motion curves, picked by the `easing` prop. Each maps turn
 * progress 0→1 to how far round the ring has got; only the overall
 * duration changes with distance, never the shape of the curve. All start
 * at 0 and end exactly at 1, so every one still lands dead centre. */
const EASINGS = {
  // Fast start, gentle settle — the original feel.
  smooth: (t) => 1 - Math.pow(1 - t, 3),
  // Very quick start, long soft landing — snappy.
  snappy: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  // Slight overshoot past centre, then settles back.
  backOut: (t) => {
    const c1 = 1.4;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  // Springy wobble around centre before it settles.
  elastic: (t) => {
    if (t <= 0 || t >= 1) return t <= 0 ? 0 : 1;
    return Math.pow(2, -9 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3.2)) + 1;
  },
};

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
function applyFrame(rotY, live, cardEls, mirrorEls, viewEls, shadowEls, dir, turnP) {
  // However it happened, a non-finite angle must never be written into a
  // style — that's what a genuinely broken frame (every card's `transform`
  // literally the string "NaN") would look like. Leaving the last good
  // frame on screen instead means there's nothing to see even for the one
  // tick this guards against, and the very next turn — which computes its
  // target from the clicked index alone, never from this `rotY` — heals it.
  if (!live || !Number.isFinite(rotY)) return;
  const { box, narrow, spacing, cardScale, n, stepAngle } = live;
  // The carousel fills the whole component, so characters are sized off
  // its height rather than a fixed pixel size. The box matches the photos'
  // own proportion (PHOTO_RATIO) — a narrower box made `objectFit: contain`
  // fit them by width, so they only ever reached ~2/3 of their height and
  // left a dead band of empty backdrop above every head.
  const stageW = box.w || 600;
  const stageH = box.h || 600;
  const cardH = clamp(stageH * (narrow ? 0.66 : 0.88), 260, 1400) * clamp(cardScale, 0.5, 1.8);
  const cardW = cardH * PHOTO_RATIO;
  // The furthest a card ever eases out to, either side.
  const edgeX = Math.max(60, stageW * 0.44) * clamp(spacing, 0.4, 2.2);
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
    // Past the 2nd ring, a card dims on toward near-black — the farthest
    // ring, tucked behind the edge cards, reads as a dark silhouette rather
    // than a second, competing figure. Continuous in `at`, so a card fades
    // into and out of that silhouette smoothly as it turns.
    const farFade = clamp(at - (rings - 1), 0, 1);
    const bright = (MIN_BRIGHTNESS + (1 - MIN_BRIGHTNESS) * eased) * (1 - FAR_DARKEN * farFade);
    // Only the card nearest the far point of the turn ever shows a mirror at
    // the opposite edge — a step or two out shows just its own side. Tied
    // to `backness` alone now, not an opacity that no longer fades.
    const mirrorOpacity = Math.pow(backness, MIRROR_POWER);
    // The mirror's own resting spot — a little short of the edge, on
    // whichever side `x` isn't, not just `x` flipped, so it reads as its
    // own card tucked behind the 3rd one, not a copy riding on it. Nudged
    // off that spot by `dir` — the turn's own direction, shared by every
    // card this frame, not each card's own side — and eased back to 0 by
    // `turnP`, the turn's progress through the *same* motion curve the ring
    // itself uses (not this one card's backness, which some cards never
    // reach the threshold of). So it slides in exactly in step with the
    // characters under every motion style — fast with Snappy, gliding with
    // Silk, even swinging past and back with Elastic — and is exactly gone
    // the instant any turn settles. Both edges get the identical nudge, so
    // they always read as one consistent sweep matching the turn.
    const mirrorRestX = -Math.sign(x || 1) * MIRROR_X_FRACTION * edgeX;
    const mirrorX = mirrorRestX + dir * MIRROR_ENTRY_FRACTION * edgeX * (1 - turnP);
    const gray = clamp(backness * 0.55, 0, 0.55).toFixed(3);

    // A step down in height per ring out — the closer a card's priority to
    // front and centre, the taller it stands; continuous in `at`, same as
    // everything else, so a card eases through this exactly as smoothly as
    // it eases through its position, never snapping a fixed amount at once.
    // The photo is taller than it is wide, so with `objectFit: "contain"`
    // its *width* is what actually bounds its rendered size — shrinking
    // only the box's height left the picture exactly as big as before,
    // just with slack above it. Carrying the same ratio onto the width
    // keeps the character in proportion (never stretched) while actually
    // making it read as smaller, step by step, the further out it is.
    const cardHForRing = cardH - at * HEIGHT_STEP_PX;
    const cardWForRing = cardW * (cardHForRing / cardH);

    const el = cardEls[i];
    if (el) {
      el.style.width = `${cardWForRing.toFixed(1)}px`;
      el.style.height = `${cardHForRing.toFixed(1)}px`;
      el.style.transform = `translateX(calc(-50% + ${x.toFixed(1)}px)) translateY(-${lift.toFixed(1)}px) translateZ(${z.toFixed(1)}px) scale(${scale.toFixed(4)})`;
      el.style.filter = `blur(${blur.toFixed(2)}px) grayscale(${gray}) brightness(${bright.toFixed(3)})`;
      // Fully opaque everywhere except that farthest-ring silhouette, which
      // also eases down to FAR_OPACITY along with its darkening.
      el.style.opacity = (1 - (1 - FAR_OPACITY) * farFade).toFixed(3);
      el.style.zIndex = String(Math.round(eased * 1000) + 10);
    }
    // A flat ellipse of shadow sitting on the ground under each character's
    // own feet — not a silhouette-shaped drop-shadow riding on the photo
    // itself — so it reads as contact with the floor, not an outline. It
    // shares the card's `x`/`z` (the same spot on the ground) and fades in
    // with `eased` the same way everything else does, but never lifts —
    // the shadow stays put on the floor while the character rises off it.
    const sEl = shadowEls[i];
    if (sEl) {
      // Height comes from the *old*, narrower width — only the width itself
      // (and how dark it reads) grows, so a wider shadow still stays just
      // as flat rather than ballooning into an oval.
      const shadowH = cardW * 0.46 * scale * 0.22;
      const shadowW = cardW * 0.74 * scale;
      sEl.style.width = `${shadowW}px`;
      sEl.style.height = `${shadowH.toFixed(1)}px`;
      sEl.style.transform = `translateX(calc(-50% + ${x.toFixed(1)}px)) translateZ(${z.toFixed(1)}px)`;
      sEl.style.opacity = ((0.3 + 0.7 * eased) * 0.75).toFixed(3);
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
      // The mirror only ever shows once a card's nearly at the very back of
      // the turn — sized at full scale it read as *larger* than the actual
      // cards out at that ring, which had already stepped down. Sizing it
      // at the same, smallest, "furthest ring" size it's standing in for
      // keeps it no bigger than the real thing ever gets.
      const mirrorH = cardH - rings * HEIGHT_STEP_PX;
      const mirrorW = cardW * (mirrorH / cardH);
      mEl.style.width = `${mirrorW.toFixed(1)}px`;
      mEl.style.height = `${mirrorH.toFixed(1)}px`;
      mEl.style.transform = `translateX(calc(-50% + ${mirrorX.toFixed(1)}px)) translateY(-${lift.toFixed(1)}px) translateZ(${(-MAX_DEPTH).toFixed(1)}px) scale(${BACK_SCALE})`;
      mEl.style.filter = `blur(${MAX_BLUR}px) brightness(${MIRROR_BRIGHTNESS})`;
      mEl.style.opacity = (mirrorOpacity * FAR_OPACITY).toFixed(3);
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

/** The backdrop's vertical panel texture, one plate every `width` px: a
 * dark seam at each edge, a soft warm highlight across the face. Stops are
 * kept as fractions of the plate so any width keeps the same shading. */
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

export default function TryTheLook2({
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
  plateWidth = 17,
  easing = "smooth",
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
  const rootRef = useRef(null);

  const isControlled = controlledIndex != null;
  const startActive = clamp(defaultActiveIndex ?? Math.min(4, n - 1), 0, Math.max(0, n - 1));
  // `activeState` is a normal React value — read for the look's cards
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
  // Which way the ring is currently headed (+1/-1) — set once per click in
  // `spin`, read every frame by `applyFrame` for the edge mirrors' nudge.
  const dirRef = useRef(1);
  // Everything the frame loop needs that can change from outside a click —
  // read fresh every frame so a prop change lands on the very next frame.
  const liveRef = useRef(null);
  liveRef.current = { box, narrow: box.w > 0 && box.w < 760, spacing, cardScale, n, stepAngle, easing };
  // One DOM node per card, and its mirrored echo — the frame loop writes
  // straight to these every tick instead of going through React.
  const cardElsRef = useRef([]);
  const mirrorElsRef = useRef([]);
  const viewElsRef = useRef([]);
  const shadowElsRef = useRef([]);
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
  const shadowSettersRef = useRef([]);
  const cardSetter = (i) =>
    cardSettersRef.current[i] || (cardSettersRef.current[i] = (el) => (cardElsRef.current[i] = el));
  const mirrorSetter = (i) =>
    mirrorSettersRef.current[i] || (mirrorSettersRef.current[i] = (el) => (mirrorElsRef.current[i] = el));
  const viewSetter = (i) =>
    viewSettersRef.current[i] || (viewSettersRef.current[i] = (el) => (viewElsRef.current[i] = el));
  const shadowSetter = (i) =>
    shadowSettersRef.current[i] || (shadowSettersRef.current[i] = (el) => (shadowElsRef.current[i] = el));

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

  // Brings a possibly-stale/out-of-range activeRef back in range (say the
  // look count changed while one was mid-turn) rather than trusting it as
  // -is — the one place both `spin` and `pickIndex` read "the active index"
  // from, so a hypothetical bad value can't send one to a different target
  // than the other.
  const healedActive = () => mod(Math.trunc(activeRef.current) || 0, n);

  // Turns the ring by `steps` whole positions (can be negative) — the only
  // place a turn is ever kicked off, including the one that carries a look
  // past the back of the ring.
  const spin = (steps) => {
    if (!steps) return;
    const curActive = healedActive();
    // A non-finite angle (there's no code path that produces one, but
    // nothing downstream should be able to get stuck on one either) is
    // thrown out for the one centred angle the current look already
    // defines, rather than carried into the maths below — this turn starts
    // from a known-good place even if the last one somehow didn't end on
    // one.
    const nextActive = mod(curActive + steps, n);
    const liveRotY = Number.isFinite(rotYRef.current) ? rotYRef.current : -curActive * stepAngle;
    // Bled back toward 0 by whole laps before use — rotY is free to run up
    // over a long session (thousands of clicks, autoplay left running for
    // hours), and every formula below is exactly as periodic in 360° as the
    // ring itself, so this never changes a single card's position; it only
    // keeps the numbers small so nothing downstream ever has to deal with
    // an oversized angle that stops reading as "perfect" through sheer
    // floating-point distance from zero.
    const from = liveRotY - Math.round(liveRotY / 360) * 360;
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
    // Which way this turn is headed — both edge mirrors nudge along this
    // same screen-direction while a card is handing off round the back,
    // instead of each one simply easing toward its own centre regardless
    // of which way the ring is actually turning.
    dirRef.current = Math.sign(to - from) || dirRef.current;
    const changed = nextActive !== curActive;
    activeRef.current = nextActive;
    setActiveState(nextActive);
    if (changed) onChange?.(nextActive, items[nextActive]);
  };

  const pickIndex = (i) => spin(shortestSteps(healedActive(), mod(i, n), n));

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
      // How far through the *turn itself* we are — 1 once it's settled (or
      // if nothing's in flight) — not any one card's own backness, which
      // some cards never climb high enough to reach, leaving a nudge tied
      // to it stuck on forever instead of resolved the moment the turn is.
      // `turnP` is that progress run through the chosen motion curve — the
      // exact same value the ring's own angle moves by — so anything driven
      // by it (the mirrors' slide) keeps step with the characters under
      // every motion style instead of running on a clock of its own.
      let turnP = 1;
      if (anim) {
        const turnT = clamp((now - anim.start) / (anim.duration * 1000), 0, 1);
        const ease = EASINGS[liveRef.current.easing] || EASINGS.smooth;
        turnP = ease(turnT);
        rotYRef.current = anim.from + (anim.to - anim.from) * turnP;
        if (turnT >= 1) animRef.current = null;
      }
      applyFrame(rotYRef.current, liveRef.current, cardElsRef.current, mirrorElsRef.current, viewElsRef.current, shadowElsRef.current, dirRef.current, turnP);
      raf = requestAnimationFrame(frame);
    };
    applyFrame(rotYRef.current, liveRef.current, cardElsRef.current, mirrorElsRef.current, viewElsRef.current, shadowElsRef.current, dirRef.current, 1);
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

  const pad = narrow ? 18 : 40;
  // Sized so the one line spans most of the width, but never taller than a
  // third of the stage — big enough to read as a backdrop, not a headline.
  const headingSize = Math.max(40, Math.min((box.w || 800) * 0.112, (box.h || 600) * 0.3));
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

  return (
    <div
      ref={rootRef}
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
      }}
    >
      {/* The panel texture, laid over `background` and under everything
          else, so its plate width can be tuned on its own. Masked off
          toward the edges so the backdrop's dark vignette stays dark. */}
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
      {/* The carousel fills the whole component edge to edge; everything
          else (copy, the look's cards) floats over it. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          overflow: "hidden",
          perspective: `${Math.max(900, (box.w || 600) * 1.3)}px`,
          WebkitPerspective: `${Math.max(900, (box.w || 600) * 1.3)}px`,
        }}
      >
        {/* The heading as a giant, dimmed backdrop line running behind the
            characters — under every card (z 0 vs. their 10+), so they stand
            in front of it the way the reference's model does. */}
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
          {/* A warm, fixed spotlight pooled where the active card always
              ends up — lifts whatever it's wearing, however dark, clear of
              the backdrop behind it, the way the reference's own light
              falls right on its subject rather than spreading flat and
              even over everything. */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "50%",
              bottom: 0,
              transform: "translateX(-50%)",
              width: "46%",
              height: "88%",
              background:
                "radial-gradient(ellipse 60% 85% at 50% 100%, rgba(255,214,180,0.22) 0%, rgba(255,214,180,0) 70%)",
              pointerEvents: "none",
              zIndex: 0,
            }}
          />
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
                {/* a flat ellipse of ground contact shadow under this card's
                    own feet, sized/placed/faded by `applyFrame` the same way
                    the card itself is — not a shadow riding on the photo */}
                <div
                  ref={shadowSetter(i)}
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: "50%",
                    bottom: 2,
                    transformOrigin: "50% 50%",
                    borderRadius: "50%",
                    background:
                      "radial-gradient(ellipse at center, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.32) 55%, rgba(0,0,0,0) 80%)",
                    filter: "blur(4px)",
                    pointerEvents: "none",
                    zIndex: 0,
                  }}
                />

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

      {/* The active look's cards, bottom-left — free to overlap the row a
          little, the way the reference's cards sit over its subject. */}
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
            {/* Cropped to head-and-shoulders: cover-fit, then zoomed in from
                near the top. `maxWidth: none` so a host page's global
                `img { max-width: 100% }` can't squash it. */}
            <img
              src={srcOf(active)}
              alt=""
              draggable={false}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                maxWidth: "none",
                objectFit: "cover",
                objectPosition: "50% 0%",
                transform: "scale(1.9)",
                transformOrigin: "50% 6%",
                userSelect: "none",
                pointerEvents: "none",
              }}
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
              <Swatch color={piece.color} label={piece.brand} size={32} />
              <div style={{ flex: "1 1 auto", minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
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

        {/* On a phone there's no room for the full piece list over the
            row, so it's just the bundle total and button, in one slim bar. */}
        {narrow && bundleCard}
      </div>

      {/* The bundle total sits on its own at bottom-right on wide screens,
          like the reference's rating stat — keeping the middle clear for
          the character in front. */}
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
