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
 *   { label, image?, pieces: [{ brand, name, price, color? }] }
 * `image` falls back to `characterImage` (every look can share one photo —
 * handy before you have a shot per look). `pieces` have no product image of
 * their own yet, so each is drawn as a plain swatch carrying its `color` and
 * its name/brand as text.
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

const SWATCH_COLORS = ["#D9CDBF", "#1A1A1C", "#9AA3AD", "#6B5B4D", "#3C4654", "#B8471F"];

export const DEFAULT_LOOKS = [
  {
    label: "Street",
    pieces: [
      { brand: "Nike", name: "Oversized Hoodie", price: 118, color: "#3F4A3A" },
      { brand: "Nikey", name: "Baggy Denim", price: 96, color: "#8CA0C4" },
      { brand: "Nike", name: "Low Top Sneaker", price: 139, color: "#E8E3DB" },
    ],
  },
  {
    label: "Off Duty",
    pieces: [
      { brand: "Nike", name: "Boxy Tee", price: 59, color: "#16181B" },
      { brand: "Nikey", name: "Relaxed Jeans", price: 92, color: "#A9C2D9" },
      { brand: "Nike", name: "Court Sneaker", price: 129, color: "#EDEDED" },
    ],
  },
  {
    label: "Game Day",
    pieces: [
      { brand: "Nike", name: "Varsity Jacket", price: 168, color: "#8A8F99" },
      { brand: "Nikey", name: "Track Pant", price: 84, color: "#1F2327" },
      { brand: "Nike", name: "Crew Sock", price: 18, color: "#C9372C" },
    ],
  },
  {
    label: "Weekend",
    pieces: [
      { brand: "Nike", name: "Half Zip Pullover", price: 110, color: "#6F7A82" },
      { brand: "Nikey", name: "Wide Chino", price: 88, color: "#C8BBA0" },
      { brand: "Nike", name: "Slide Sandal", price: 46, color: "#2B2E33" },
    ],
  },
  {
    label: "Studio Day",
    pieces: [
      { brand: "Nike", name: "Sweatshirt", price: 199, color: "#D9CDBF" },
      { brand: "Nikey", name: "Tatum 5 Orbit", price: 149, color: "#1A1A1C" },
      { brand: "Nike", name: "Reign Tshirt", price: 199, color: "#17181A" },
    ],
  },
  {
    label: "Night Out",
    pieces: [
      { brand: "Nike", name: "Tech Fleece Jacket", price: 185, color: "#15171A" },
      { brand: "Nikey", name: "Slim Joggers", price: 95, color: "#2E323A" },
      { brand: "Nike", name: "High Top Sneaker", price: 155, color: "#B8471F" },
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

function normPieces(pieces) {
  if (!Array.isArray(pieces)) return [];
  return pieces.map((p, i) => ({
    brand: String(p?.brand ?? "Nike"),
    name: String(p?.name ?? `Piece ${i + 1}`),
    price: Number.isFinite(p?.price) ? p.price : 0,
    color: p?.color || SWATCH_COLORS[i % SWATCH_COLORS.length],
  }));
}

function normLook(entry, i, fallbackImage) {
  const base = entry && typeof entry === "object" ? entry : {};
  return {
    label: String(base.label ?? `Look ${i + 1}`),
    image: base.image || fallbackImage,
    pieces: normPieces(base.pieces),
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
  subheading = "Six looks, styled head to toe. Tap a pin to see the piece.",
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

  const [box, setBox] = useState({ w: 0, h: 0 });
  const [playing, setPlaying] = useState(autoplay);
  const [sidebarOpen, setSidebarOpen] = useState(defaultSidebarOpen);
  const rootRef = useRef(null);

  const isControlled = controlledIndex != null;
  const startActive = clamp(defaultActiveIndex ?? Math.min(4, n - 1), 0, Math.max(0, n - 1));
  // `active` is which look the panel shows; `rotY` is the ring's own total
  // turn so far, in degrees. rotY only ever accumulates — turning the ring
  // one step adds or subtracts exactly `stepAngle`, it never wraps back into
  // 0–360 — so a card's position is a continuous function of time and never
  // has to "teleport" to stay in range.
  const [turn, setTurn] = useState({ active: startActive, rotY: -startActive * stepAngle, steps: 1 });
  const live = useRef(turn);
  live.current = turn;
  // The rotation this component last finished a transition *from* — read
  // during render to tell a normal, small move apart from the one card
  // whose on-screen side has to flip this step, so only that one card's
  // position (never its fade) skips the transition.
  const prevRotYRef = useRef(turn.rotY);
  useEffect(() => {
    prevRotYRef.current = turn.rotY;
  }, [turn.rotY]);

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

  // Turns the ring by `steps` whole positions (can be negative), the only
  // place rotY ever changes, so every step is this same small, continuous
  // nudge — including the one that carries a look past the back of the ring.
  const spin = (steps) => {
    if (!steps) return;
    const cur = live.current;
    const nextActive = mod(cur.active + steps, n);
    // How many rings this particular turn has to cover, remembered so the
    // transition can take proportionally longer — a card three rings out
    // travels three times as far, so it gets roughly three times as long to
    // get there, instead of being rushed through at the same pace a single
    // step uses and reading as less smooth.
    setTurn({ active: nextActive, rotY: cur.rotY - steps * stepAngle, steps: Math.abs(steps) });
    if (nextActive !== cur.active) onChange?.(nextActive, items[nextActive]);
  };

  const pickIndex = (i) => spin(shortestSteps(live.current.active, mod(i, n), n));

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
  const active = turn.active;
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
          {(() => {
            const stageW = (box.w || 600) - (narrow ? 0 : 340);
            const cardW = (narrow ? 120 : 170) * clamp(cardScale, 0.5, 1.8);
            const cardH = (narrow ? 300 : 460) * clamp(cardScale, 0.5, 1.8);
            // The furthest a card ever eases out to, either side.
            const edgeX = Math.max(60, stageW * 0.4) * clamp(spacing, 0.4, 2.2);
            // A card three rings out has three times as far to travel as one
            // ring out — given proportionally more time too, so every click
            // reads as the same steady speed of turn, not a rushed one the
            // further the clicked character started from centre.
            const baseDuration = Math.max(0.15, spinSeconds);
            const duration = baseDuration * clamp(1 + (turn.steps - 1) * 0.42, 1, 2.6);
            const prevRotY = prevRotYRef.current;

            // The card's screen offset — monotonic in the angle wrapped into
            // (-180,180], so it only ever grows as the card turns away, never
            // swinging back through the middle on its way round. Shaped, not
            // a plain sine: one step out (the "2nd" card) stays well inward,
            // two steps out (the "3rd") lands almost at the very edge, so the
            // row reads as centre → a clear gap → a cluster at each edge,
            // the way the reference marks it up.
            const shapeT = (t) => {
              const at = Math.abs(t);
              const near = at <= 1 / 3 ? (NEAR_FRACTION / (1 / 3)) * at
                : at <= 2 / 3 ? NEAR_FRACTION + (FAR_FRACTION - NEAR_FRACTION) * ((at - 1 / 3) / (1 / 3))
                : FAR_FRACTION + (1 - FAR_FRACTION) * ((at - 2 / 3) / (1 / 3));
              return Math.sign(t) * near;
            };
            const xOf = (totalDeg) => {
              const wrapped = mod(totalDeg + 180, 360) - 180;
              return shapeT(wrapped / 180) * edgeX;
            };

            return items.map((look, i) => {
              const localDeg = i * stepAngle; // this card's own, fixed spot on the ring
              const totalDeg = localDeg + turn.rotY; // where that spot currently faces,
              // a value that only ever accumulates — never reset into 0–360 — so it
              // changes by exactly one step at a time and nothing has to teleport.
              const rad = (totalDeg * Math.PI) / 180;
              // 1 at dead centre, 0 at the furthest point of the turn — smooth and
              // periodic, so it is never re-derived or re-wrapped by hand.
              const depth = (Math.cos(rad) + 1) / 2;
              const backness = 1 - depth;
              const isActive = i === active;
              const x = xOf(totalDeg);
              // Real depth, not a rotation — the card recedes straight back
              // from the camera (read through the stage's `perspective`, the
              // same depth cue RoundCarousel's ring uses), so the photo
              // itself always stays flat-on and is never skewed/"squeezed".
              const z = -backness * MAX_DEPTH;

              const eased = Math.pow(depth, FALLOFF_EASE);
              const scale = BACK_SCALE + (FRONT_SCALE - BACK_SCALE) * eased;
              // A few px of rise, not a size change — reads as "closer or
              // further", the way RoundCarousel's own cards sit on a ring.
              const lift = (1 - eased) * MAX_LIFT;
              const blur = (1 - eased) * MAX_BLUR;
              const opacity = MIN_OPACITY + (1 - MIN_OPACITY) * eased;
              // Only the card nearest the far point of the turn ever shows a mirror
              // at the opposite edge — a step or two out shows just its own side.
              const mirrorOpacity = opacity * Math.pow(backness, MIRROR_POWER);
              // The mirror's own spot is fixed (a little short of the edge, on
              // whichever side `x` isn't), not just `x` flipped — so it reads as
              // its own card tucked behind the 3rd one, not a copy riding on it.
              const mirrorX = -Math.sign(x || 1) * MIRROR_X_FRACTION * edgeX;

              // Once a lap, this card's `x` is the one that has to flip from one
              // edge straight to the other. Detected by whether this turn
              // actually carried it across that seam (not by how far it moved
              // — a legitimate multi-ring click moves plenty far on its own
              // and must still animate normally) — so only that one card's
              // position snaps there with no transition, instead of visibly
              // sliding back across the row.
              const wrapCountOf = (deg) => Math.floor((deg + 180) / 360);
              const snapped = wrapCountOf(totalDeg) !== wrapCountOf(localDeg + prevRotY);
              // A literal "0s", not the "none" keyword — "none" can only ever
              // be a transition's one and only value, so it would cancel the
              // filter/opacity transitions listed right beside it too.
              const moveTransition = snapped ? "transform 0s" : `transform ${duration}s cubic-bezier(.22,.9,.3,1)`;
              const fadeTransition = `filter ${duration}s ease, opacity ${duration}s ease`;

              const cardStyle = (mirror) => ({
                position: "absolute",
                left: "50%",
                bottom: 0,
                width: cardW,
                height: cardH,
                transform: `translateX(calc(-50% + ${(mirror ? mirrorX : x).toFixed(1)}px)) translateY(-${lift.toFixed(1)}px) translateZ(${(mirror ? -MAX_DEPTH : z).toFixed(1)}px) scale(${mirror ? BACK_SCALE : scale})`,
                transformOrigin: "50% 100%",
                transition: `${moveTransition}, ${fadeTransition}`,
                filter: `blur(${(mirror ? MAX_BLUR : blur).toFixed(2)}px) grayscale(${clamp(backness * 0.55, 0, 0.55)})`,
                opacity: (mirror ? mirrorOpacity : opacity).toFixed(3),
                zIndex: mirror ? 1 : Math.round(depth * 1000) + 10,
              });

              return (
                <Fragment key={i}>
                  {/* the mirrored echo at the opposite edge — only visible at all
                      once this card is the one furthest round the turn */}
                  <div
                    aria-hidden="true"
                    style={{ ...cardStyle(true), pointerEvents: "none" }}
                  >
                    <img
                      src={look.image}
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
                    type="button"
                    onClick={() => handlePick(i)}
                    aria-label={`Show the ${look.label} look`}
                    aria-pressed={isActive}
                    style={{
                      ...cardStyle(false),
                      border: "none",
                      background: "none",
                      padding: 0,
                      cursor: isActive ? "default" : "pointer",
                    }}
                  >
                    <img
                      src={look.image}
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
                        filter: isActive
                          ? "drop-shadow(0 18px 26px rgba(0,0,0,0.22))"
                          : "none",
                      }}
                    />
                    {isActive && (
                      <span
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
                        }}
                      >
                        VIEW
                      </span>
                    )}
                  </button>
                </Fragment>
              );
            });
          })()}
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
                    {String(i + 1).padStart(2, "0")}
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
