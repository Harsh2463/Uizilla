import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * SpotlightRail — a shop rail where one garment is lit and the rest hang back.
 *
 * The garments hang from a bar on their own hangers. The one in front is sharp,
 * large and spotlit; its neighbours fall away into the dark, blurred and small,
 * so the eye has exactly one place to go. Stepping to the next one slides the
 * whole rail along: the lit garment settles back into the line as the next
 * rises out of it, and every garment sways from its hook as the rail moves.
 * Underneath sit the counter, the name, the price and a buy button.
 *
 * Self-contained: copy this single file into any React (16.8+) project and
 * render <SpotlightRail />. No other packages, CSS or files needed — plain DOM
 * and CSS, so any image address works (no CORS, no WebGL). It fills 100% of its
 * parent, so give the parent a height, e.g.
 *   <div style={{ height: 700 }}><SpotlightRail images={products} /></div>
 *
 * Each entry of `images` is a product:
 *   { src, front?, title?, price?, description?, buyUrl?, buyLabel? }
 * `src` is the garment on the rail; `front` is an optional sharper or different
 * picture used when it is the lit one. `onBuy(product, index)` is called when
 * the button is pressed (and `buyUrl`, if set, opens in a new tab); `onChange`
 * is called whenever the lit garment changes.
 *
 * Arrows, drag, swipe, wheel and the left/right keys all step the rail.
 */

/* ---------------------------------------------------------------- constants */

/** How quickly the rail settles on the next garment (per 60th of a second). */
const EASE = 0.12;
/** Below this the rail is treated as parked, so the sway can rest. */
const PARKED = 0.0006;
/** Drag: how many garments one frame-width of travel steps through. */
const DRAG_SPAN = 2.4;
/** A pointer that travels less than this (px) is a click, not a drag. */
const TAP_SLOP = 6;
/** Wheel events closer together than this keep one gesture, so a trackpad
 * flick steps once rather than ten times. */
const WHEEL_GAP_MS = 260;
/** Sway: how far a garment swings per unit of rail speed, and how it settles. */
const SWAY_PER_SPEED = 26;
const SWAY_MAX_DEG = 14;
const SWAY_SPRING = 0.16;
const SWAY_DAMP = 0.85;
/** The idle breath of a hanging garment, in degrees and cycles per second. */
const IDLE_DEG = 0.55;
const IDLE_HZ = 0.19;
/** Garments further than this many places from the front are not drawn. */
const VISIBLE_SPAN = 5;

const DEMO_FRONT =
  "https://ik.imagekit.io/Harsh2463/jackets/Believe%20in%20Yourself%20Hoodie.png";
const DEMO_SIDE =
  "https://ik.imagekit.io/Harsh2463/jackets/Black%20Hoodie%20on%20Wooden%20Hanger.png";

/** Sample products, so the rail is a working shop out of the box. */
export const DEFAULT_PRODUCTS = [
  { src: DEMO_FRONT, title: "Believe in Yourself Hoodie", price: "€98", buyUrl: "" },
  { src: DEMO_SIDE, title: "Black Zip Hoodie", price: "€98" },
  { src: DEMO_FRONT, title: "Winged Skull Tee", price: "€48" },
  { src: DEMO_SIDE, title: "Barbed Heart Tee", price: "€48" },
  { src: DEMO_FRONT, title: "Midnight Pullover", price: "€89" },
  { src: DEMO_SIDE, title: "Washed Black Hoodie", price: "€92" },
  { src: DEMO_FRONT, title: "Studio Crew Tee", price: "€42" },
  { src: DEMO_SIDE, title: "Heritage Zip Hoodie", price: "€110" },
];

/* ------------------------------------------------------------------ helpers */

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
/** Shortest signed distance from a to b on a ring of n, so the rail loops. */
const wrapDelta = (d, n) => {
  const h = n / 2;
  return ((((d + h) % n) + n) % n) - h;
};
const smoothstep = (x) => {
  const t = clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
};
/** A lerp that behaves the same at 60 and 120 frames a second. */
const approach = (cur, goal, perFrame, dt) =>
  cur + (goal - cur) * (1 - Math.pow(1 - perFrame, dt * 60));

/** A link from your own data: only web and mail links are allowed through. */
function safeUrl(url) {
  if (typeof url !== "string") return "";
  const u = url.trim();
  if (!u) return "";
  if (/^(https?:|mailto:|tel:|\/|#|\.)/i.test(u)) return u;
  return /^[a-z][a-z0-9+.-]*:/i.test(u) ? "" : u;
}

/** One entry of `images`, in any of its accepted shapes. */
function itemOf(entry) {
  const base = entry && typeof entry === "object" ? entry : {};
  const raw = typeof entry === "string" ? entry : (base.src ?? base.image ?? "");
  const src = (typeof raw === "string" ? raw : (raw?.src ?? "")) || DEMO_FRONT;
  return {
    src,
    front: String(base.front ?? "") || src,
    title: String(base.title ?? ""),
    price: String(base.price ?? ""),
    description: String(base.description ?? ""),
    buyUrl: safeUrl(base.buyUrl),
    buyLabel: typeof base.buyLabel === "string" ? base.buyLabel : "",
  };
}

/** The hanger each garment hangs from: wire for the ones in the dark, wooden
 * for the lit one, drawn in SVG so it needs no asset. */
function Hanger({ width, wood, color }) {
  return (
    <svg
      width={width}
      height={width * 0.44}
      viewBox="0 0 100 44"
      fill="none"
      aria-hidden="true"
      style={{ display: "block", overflow: "visible" }}
    >
      <path
        d="M50 4c-4 0-7 2.9-7 6.4 0 2.9 1.9 5 4.6 5.9l1.5.5v3"
        stroke={wood ? "#6B4A2B" : color}
        strokeWidth={wood ? 3 : 2.3}
        strokeLinecap="round"
      />
      {wood ? (
        <path
          d="M49.4 20 9 36c-3 1.2-2.1 5.6 1.1 5.6h79.8c3.2 0 4.1-4.4 1.1-5.6L50.6 20a1.6 1.6 0 0 0-1.2 0Z"
          fill="#B07D4A"
          stroke="#6B4A2B"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M49.4 20 9 36c-2.5 1-1.8 4.6.9 4.6h80.2c2.7 0 3.4-3.6.9-4.6L50.6 20a1.6 1.6 0 0 0-1.2 0Z"
          stroke={color}
          strokeWidth="2.3"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

function Arrow({ dir, onClick, color, size, label }) {
  const [hot, setHot] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerEnter={() => setHot(true)}
      onPointerLeave={() => setHot(false)}
      aria-label={label}
      style={{
        position: "absolute",
        top: "50%",
        [dir === "prev" ? "left" : "right"]: "6%",
        width: size,
        height: size,
        marginTop: -size / 2,
        display: "grid",
        placeItems: "center",
        borderRadius: 999,
        border: `1px solid ${hot ? "transparent" : "rgba(255,255,255,0.35)"}`,
        background: hot ? color : "rgba(255,255,255,0.06)",
        color: hot ? "#111" : color,
        cursor: "pointer",
        zIndex: 6,
        transition: "background 200ms ease, color 200ms ease, border-color 200ms ease",
        backdropFilter: "blur(6px)",
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d={dir === "prev" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
      </svg>
    </button>
  );
}

/* ----------------------------------------------------------------- component */

export default function SpotlightRail({
  images = DEFAULT_PRODUCTS,
  background = "#0B0A0A",
  railColor = "#8E9095",
  showRail = true,
  heroHeight = 330,
  backHeight = 200,
  spacing = 150,
  backBlur = 0,
  backDim = 0,
  drift = 0.5,
  spotlight = 6,
  sway = 5,
  vignette = 6,
  autoplay = 0,
  showArrows = true,
  showCounter = true,
  showCaption = true,
  buyLabel = "Add to cart",
  textColor = "#F2EFEA",
  accent = "#F2EFEA",
  onBuy,
  onChange,
  style,
}) {
  const hostRef = useRef(null);
  const slotRefs = useRef([]);
  const items = useMemo(
    () => (Array.isArray(images) && images.length ? images : DEFAULT_PRODUCTS).map(itemOf),
    [images]
  );
  const n = items.length;

  const [index, setIndex] = useState(0);
  const [box, setBox] = useState({ w: 0, h: 0 });
  // The caption swaps once the garment has nearly arrived, so the words change
  // with the picture rather than ahead of it.
  const [shown, setShown] = useState(0);

  const live = useRef(null);
  live.current = {
    n,
    heroHeight,
    backHeight,
    spacing: Math.max(40, spacing),
    backBlur: Math.max(0, backBlur),
    backDim: clamp(backDim, 0, 10),
    drift,
    sway: clamp(sway, 0, 10) / 5,
    showCaption,
    index,
  };

  const target = useRef(0);
  const hovering = useRef(false);
  const step = useCallback(
    (by) => {
      target.current += by;
      const next = ((Math.round(target.current) % n) + n) % n;
      setIndex(next);
    },
    [n]
  );

  // Keep the target on the shortest way round when the index is set elsewhere.
  useEffect(() => {
    const cur = target.current;
    target.current = cur + wrapDelta(index - cur, n);
  }, [index, n]);

  useEffect(() => {
    onChange?.(items[index], index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  /* -------------------------------------------------------------- the loop */

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    let raf = 0;
    let last = performance.now();
    let pos = target.current;
    let vel = 0;
    const swing = [];
    const drag = { active: false, id: -1, x0: 0, from: 0, moved: false };
    let wheelAt = 0;
    const geom = { w: 1, h: 1 };

    const measure = () => {
      geom.w = Math.max(1, host.clientWidth);
      geom.h = Math.max(1, host.clientHeight);
      setBox({ w: geom.w, h: geom.h });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);

    /* ---- input ---- */
    const onWheel = (e) => {
      const now = performance.now();
      if (now - wheelAt < WHEEL_GAP_MS) return; // one gesture, one step
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(d) < 2) return;
      wheelAt = now;
      stepRef.current(d > 0 ? 1 : -1);
    };
    const onDown = (e) => {
      if (e.button !== 0) return;
      drag.active = true;
      drag.id = e.pointerId;
      drag.x0 = e.clientX;
      drag.from = target.current;
      drag.moved = false;
      host.setPointerCapture?.(e.pointerId);
      host.style.cursor = "grabbing";
    };
    const onMove = (e) => {
      if (!drag.active || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x0;
      if (Math.abs(dx) > TAP_SLOP) drag.moved = true;
      // Dragging left pulls the next garment in, as a finger on a rail would.
      target.current = drag.from - (dx / geom.w) * DRAG_SPAN;
    };
    const onUp = (e) => {
      if (!drag.active || e.pointerId !== drag.id) return;
      drag.active = false;
      host.releasePointerCapture?.(e.pointerId);
      host.style.cursor = "grab";
      if (!drag.moved) return;
      // Settle on whichever garment the drag left in front.
      target.current = Math.round(target.current);
      const nn = Math.max(1, live.current.n);
      setIndex(((Math.round(target.current) % nn) + nn) % nn);
    };
    const onKey = (e) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        stepRef.current(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        stepRef.current(-1);
      }
    };

    const onEnter = () => (hovering.current = true);
    const onLeave = () => (hovering.current = false);
    host.addEventListener("pointerenter", onEnter);
    host.addEventListener("pointerleave", onLeave);
    host.addEventListener("wheel", onWheel, { passive: true });
    host.addEventListener("pointerdown", onDown);
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerup", onUp);
    host.addEventListener("pointercancel", onUp);
    host.addEventListener("keydown", onKey);

    /* ---- one frame ---- */
    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      let dt = (now - last) / 1000;
      last = now;
      if (!isFinite(dt) || dt < 0) dt = 0;
      if (dt > 0.05) dt = 0.05; // a background tab must not deposit a lurch

      const L = live.current;
      const count = L.n;
      // Constant-speed drift to the left, forever: target and position move
      // together so the rail runs at one steady pace and wraps seamlessly.
      if (L.drift && !drag.active && !hovering.current && !reduced.matches) {
        const dd = L.drift * dt;
        target.current += dd;
        pos += dd;
      }
      const before = pos;
      pos = drag.active ? target.current : approach(pos, target.current, EASE, dt);
      vel = (pos - before) / Math.max(dt, 1e-3);
      const parked = Math.abs(pos - target.current) < PARKED && !drag.active;
      if (parked) pos = target.current;

      // The caption changes once the garment is most of the way home.
      const settled = ((Math.round(pos) % count) + count) % count;
      if (Math.abs(wrapDelta(pos - Math.round(pos), count)) < 0.3) {
        setShown((s) => (s === settled ? s : settled));
      }

      const still = reduced.matches;
      // Everything is scaled to fit the frame it was given: the rail sits below
      // the bar and above the caption, so a short frame shrinks the garments
      // rather than letting them run into the words.
      const railTopPx = clamp(geom.h * 0.12, 48, 130);
      const reserved = L.showCaption ? 168 : 28;
      const room = Math.max(90, geom.h - railTopPx - reserved);
      const fit = Math.min(1, room / Math.max(1, L.heroHeight));
      const heroH = L.heroHeight * fit;
      const backH = L.backHeight * fit;
      const pitch = L.spacing * (0.55 + 0.45 * fit);
      for (let i = 0; i < count; i++) {
        const el = slotRefs.current[i];
        if (!el) continue;
        const d = wrapDelta(i - pos, count);
        const far = Math.abs(d);
        if (far > VISIBLE_SPAN) {
          el.style.visibility = "hidden";
          continue;
        }
        el.style.visibility = "visible";

        // 1 on the lit garment, falling away over the first place either side.
        const act = smoothstep(1 - clamp(far, 0, 1));
        // Behind the front one the rail bunches up a little, so the row reads
        // as depth rather than as an evenly spaced strip.
        const spread = pitch * (Math.sign(d) * (Math.abs(d) ** 0.82));
        const x = spread;
        const h = backH + (heroH - backH) * act;
        const dim = (1 - act) * (L.backDim / 10);
        const blur = (1 - act) * L.backBlur;

        const s = swing[i] || (swing[i] = { a: 0, v: 0, phase: (i * 2.399) % 6.283 });
        const drive = still || parked ? 0 : clamp(-vel * SWAY_PER_SPEED, -SWAY_MAX_DEG, SWAY_MAX_DEG);
        s.v += (drive - s.a) * SWAY_SPRING;
        s.v *= SWAY_DAMP;
        s.a += s.v;
        const idle = still ? 0 : Math.sin(now * 0.001 * IDLE_HZ * 6.283 + s.phase) * IDLE_DEG;
        const angle = (s.a + idle) * L.sway * (0.45 + 0.55 * (1 - act));

        el.style.zIndex = String(50 - Math.round(far * 10));
        el.style.height = `${h}px`;
        el.style.transform = `translate3d(calc(-50% + ${x.toFixed(1)}px), 0, 0)`;
        el.style.opacity = (1 - dim * 0.92).toFixed(3);
        el.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "none";
        const inner = el.firstChild;
        if (inner) inner.style.transform = `rotate(${angle.toFixed(3)}deg)`;
        const pic = el.querySelector("[data-pic]");
        if (pic) pic.style.filter = `brightness(${(1 - dim * 0.82).toFixed(3)})`;
        const glow = el.querySelector("[data-glow]");
        if (glow) glow.style.opacity = act.toFixed(3);
        const wood = el.querySelector("[data-wood]");
        const wire = el.querySelector("[data-wire]");
        if (wood) wood.style.opacity = act.toFixed(3);
        if (wire) wire.style.opacity = (1 - act).toFixed(3);
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      host.removeEventListener("pointerenter", onEnter);
      host.removeEventListener("pointerleave", onLeave);
      host.removeEventListener("wheel", onWheel);
      host.removeEventListener("pointerdown", onDown);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerup", onUp);
      host.removeEventListener("pointercancel", onUp);
      host.removeEventListener("keydown", onKey);
    };
  }, [n]);

  // The loop calls whichever `step` is current without being rebuilt.
  const stepRef = useRef(step);
  stepRef.current = step;

  /* ---- autoplay: steps on its own until the pointer is over the rail ---- */
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (!autoplay || autoplay <= 0 || paused) return;
    const id = setInterval(() => stepRef.current(1), Math.max(1200, autoplay * 1000));
    return () => clearInterval(id);
  }, [autoplay, paused]);

  const item = items[shown] || items[0];
  const label = item?.buyLabel || buyLabel;
  const press = () => onBuy?.(item, shown);

  const small = box.w > 0 && box.w < 560;
  const arrowSize = small ? 38 : 44;
  const railTop = Math.round(clamp(box.h * 0.12, 48, 130));

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background,
        color: textColor,
        fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        ...style,
      }}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
    >
      {/* the pool of light the lit garment stands in */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "50%",
          top: railTop,
          width: "min(1100px, 150%)",
          height: "120%",
          transform: "translateX(-50%)",
          background: `radial-gradient(60% 50% at 50% 28%, rgba(255,255,255,${(
            clamp(spotlight, 0, 10) * 0.012
          ).toFixed(3)}) 0%, rgba(255,255,255,0) 70%)`,
          pointerEvents: "none",
        }}
      />

      <div
        ref={hostRef}
        tabIndex={0}
        role="region"
        aria-label="Garment rail. Use the arrows, drag, or the left and right keys."
        aria-roledescription="carousel"
        style={{
          position: "absolute",
          inset: 0,
          cursor: "grab",
          outline: "none",
          // the rail steps sideways, so vertical page scrolling still works
          touchAction: "pan-y",
          userSelect: "none",
          WebkitUserSelect: "none",
        }}
      >
        {/* the bar */}
        {showRail && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "4%",
              right: "4%",
              top: railTop,
              height: 9,
              borderRadius: 999,
              background: `linear-gradient(180deg, ${railColor} 0%, rgba(0,0,0,0.5) 55%, ${railColor} 100%)`,
              opacity: 0.55,
              zIndex: 60,
              pointerEvents: "none",
            }}
          >
            {["left", "right"].map((side) => (
              <span
                key={side}
                style={{
                  position: "absolute",
                  [side]: -10,
                  top: -7,
                  width: 10,
                  height: 23,
                  borderRadius: 4,
                  background: railColor,
                  opacity: 0.75,
                }}
              />
            ))}
          </div>
        )}

        {/* the garments */}
        {items.map((it, i) => (
          <div
            key={i}
            ref={(el) => {
              slotRefs.current[i] = el;
            }}
            style={{
              position: "absolute",
              left: "50%",
              top: railTop - 4,
              height: backHeight,
              willChange: "transform, height, opacity, filter",
            }}
          >
            <div style={{ height: "100%", transformOrigin: "50% 6px", willChange: "transform" }}>
              <div style={{ display: "flex", justifyContent: "center", position: "relative" }}>
                <span data-wire style={{ position: "absolute", top: 0 }}>
                  <Hanger width={62} color={railColor} />
                </span>
                <span data-wood style={{ opacity: 0 }}>
                  <Hanger width={62} wood />
                </span>
              </div>
              <div style={{ position: "relative", height: "calc(100% - 20px)", marginTop: -6 }}>
                {/* the light behind the lit garment, so it lifts off the dark */}
                <div
                  data-glow
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    inset: "-14% -36%",
                    opacity: 0,
                    background:
                      "radial-gradient(50% 50% at 50% 45%, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 72%)",
                    pointerEvents: "none",
                  }}
                />
                <img
                  data-pic
                  src={it.front}
                  alt={it.title || ""}
                  draggable={false}
                  style={{
                    display: "block",
                    height: "100%",
                    width: "auto",
                    objectFit: "contain",
                    pointerEvents: "none",
                    userSelect: "none",
                    filter: "brightness(0.2)",
                    willChange: "filter",
                  }}
                />
              </div>
            </div>
          </div>
        ))}

        {/* the edges of the room */}
        {vignette > 0 && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              zIndex: 55,
              background: `radial-gradient(75% 70% at 50% 45%, rgba(0,0,0,0) 40%, ${background} 100%)`,
              opacity: clamp(vignette, 0, 10) / 10,
            }}
          />
        )}
      </div>

      {showArrows && n > 1 && (
        <>
          <Arrow dir="prev" size={arrowSize} color={accent} label="Previous garment" onClick={() => step(-1)} />
          <Arrow dir="next" size={arrowSize} color={accent} label="Next garment" onClick={() => step(1)} />
        </>
      )}

      {/* counter, name, price, button */}
      {showCaption && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: `max(18px, env(safe-area-inset-bottom, 0px))`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            zIndex: 7,
            pointerEvents: "none",
            textAlign: "center",
            padding: "0 16px",
          }}
        >
          {showCounter && n > 1 && (
            <div style={{ fontSize: 12, letterSpacing: "0.18em", opacity: 0.55 }}>
              {String(shown + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
            </div>
          )}
          {/* keyed on the product, so each name fades in as it arrives */}
          <div
            key={`t-${shown}`}
            style={{
              fontFamily: "Georgia, 'Times New Roman', 'Didot', serif",
              fontStyle: "italic",
              fontSize: small ? 24 : 32,
              lineHeight: 1.15,
              animation: "sr-rise 420ms ease both",
            }}
          >
            {item?.title || `Item ${shown + 1}`}
          </div>
          {item?.price ? (
            <div key={`p-${shown}`} style={{ fontSize: 14, opacity: 0.6, animation: "sr-rise 420ms ease 60ms both" }}>
              {item.price}
            </div>
          ) : null}
          {item?.description ? (
            <p style={{ margin: "2px 0 0", maxWidth: 420, fontSize: 13, lineHeight: 1.5, opacity: 0.5 }}>
              {item.description}
            </p>
          ) : null}
          {label ? (
            <div style={{ pointerEvents: "auto", marginTop: 10 }}>
              {item?.buyUrl ? (
                <a href={item.buyUrl} target="_blank" rel="noopener noreferrer" onClick={press} style={buyStyle(accent)}>
                  {label}
                </a>
              ) : (
                <button type="button" onClick={press} style={buyStyle(accent)}>
                  {label}
                </button>
              )}
            </div>
          ) : null}
        </div>
      )}

      <style>{`@keyframes sr-rise{from{opacity:0;transform:translateY(9px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}

function buyStyle(accent) {
  return {
    display: "inline-block",
    padding: "11px 30px",
    borderRadius: 999,
    border: `1px solid ${accent}`,
    background: "transparent",
    color: accent,
    fontSize: 13,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    textDecoration: "none",
    cursor: "pointer",
  };
}
