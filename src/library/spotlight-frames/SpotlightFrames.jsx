import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * SpotlightFrames — a row of thin vertical slats, each showing the centre strip
 * of a picture. One slat at a time opens out to full width and reveals its
 * picture; every other slat slides along to make room, so the strip reads as a
 * horizontal accordion rather than a set of separate cards.
 *
 * The open slat is marked by a selector: a hairline box drawn over it plus two
 * vertical lines running out of the box's top and bottom edges. The box and the
 * lines travel with the selection on the same easing as the slats, so the
 * movement reads as one gesture instead of three.
 *
 * Self-contained: copy this single file into any React (16.8+) project and
 * render <SpotlightFrames />. No other packages, CSS or files needed (plain DOM
 * and CSS transitions). It fills 100% of its parent and scales the whole strip
 * down to fit narrow frames, so give the parent a height, e.g.
 *   <div style={{ height: 700 }}><SpotlightFrames /></div>
 * A picture that fails to load simply leaves its slat as a dark placeholder.
 *
 * Every picture is drawn at the open slat's width and centred, so a closed slat
 * shows the middle strip of it and the picture holds still while the slat opens
 * around it. Per-picture `offsetY` slides it up or down inside its slat.
 */

/* -------------------------------------------------------------- constants */

const UNSPLASH = (id) => `https://images.unsplash.com/photo-${id}?w=900&auto=format&fit=crop&q=60`;

// Default pictures.
const DEFAULT_IMAGES = [
  "1654944989879-b3ef6a3f69a3",
  "1777146464379-c527ae8c92f0",
  "1600711151461-05abd927b281",
  "1485178575877-1a13bf489dfe",
  "1665699954779-5d391413aaff",
  "1662311516094-fdb7c2c1aa34",
  "1512061649570-b858b7f60d32",
  "1748485559590-06fa4035b322",
  "1637028357803-78764289ffe5",
  "1638305607135-3e555310c69c",
  "1463085154687-27abe97620ab",
  "1609840422197-0f9a4e97e3a3",
].map((id) => ({ src: UNSPLASH(id), offsetY: 0 }));

// How the slats slide. "snap" is a long circular ease-out and is the whole
// character of the original movement.
const EASES = {
  snap: "cubic-bezier(0.075, 0.82, 0.165, 1)",
  smooth: "cubic-bezier(0.65, 0, 0.35, 1)",
  soft: "cubic-bezier(0.16, 1, 0.3, 1)",
  linear: "linear",
};

// The entrance lifts the slats into place.
const ENTRANCE_EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
const DIM_FLOOR = 0.18; // how dark dim 10 gets

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const srcOf = (it) =>
  typeof it === "string"
    ? it.trim()
    : it && typeof (it.src || it.image) === "string"
      ? (it.src || it.image).trim()
      : "";
const offsetOf = (it) => (it && typeof it === "object" ? Number(it.offsetY) || 0 : 0);
const placeholder = (i) => {
  const hue = (i * 43 + 196) % 360;
  return `linear-gradient(160deg, hsl(${hue} 42% 34%), hsl(${(hue + 38) % 360} 58% 9%))`;
};

/* -------------------------------------------------------------- component */

export default function SpotlightFrames({
  images = DEFAULT_IMAGES,
  background = "#0f0f0f",
  startIndex = 6,
  trigger = "auto",
  collapsedWidth = 80,
  expandedWidth = 400,
  gap = 2,
  panelHeight = 400,
  radius = 0,
  dim = 0,
  showBox = true,
  showLines = true,
  lineLength = 600,
  thickness = 3,
  selectorColor = "#FFFFFF",
  slideDuration = 1,
  slideEase = "snap",
  entrance = true,
  entranceDuration = 0.9,
  stagger = 0.04,
  autoPlay = false,
  autoPlayMs = 2500,
  panels = 16,
  style,
}) {
  const frameRef = useRef(null);
  const nodes = useRef([]);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [canHover, setCanHover] = useState(true);
  const [entered, setEntered] = useState(false);
  const [paused, setPaused] = useState(false);

  // The pictures supplied, or placeholder slats when there are none.
  const frames = useMemo(() => {
    const supplied = (Array.isArray(images) ? images : [])
      .map((it) => ({ src: srcOf(it), offsetY: offsetOf(it) }))
      .filter((f) => f.src);
    if (supplied.length) return supplied;
    return Array.from({ length: Math.max(1, Math.round(panels)) }, () => ({ src: "", offsetY: 0 }));
  }, [images, panels]);
  const count = frames.length;

  const [focused, setFocused] = useState(() => clamp(Math.round(startIndex), 0, count - 1));
  useEffect(() => {
    setFocused(clamp(Math.round(startIndex), 0, count - 1));
  }, [startIndex, count]);

  // Measure the frame.
  useEffect(() => {
    const node = frameRef.current;
    if (!node) return;
    const read = (r) => setSize({ w: r.width, h: r.height });
    read(node.getBoundingClientRect());
    const ro = new ResizeObserver(([e]) => read(e.contentRect));
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  // A pointer that can hover opens on hover; a touch screen opens on tap.
  useEffect(() => {
    if (trigger !== "auto" || !window.matchMedia) return;
    const q = window.matchMedia("(hover: hover) and (pointer: fine)");
    const read = () => setCanHover(q.matches);
    read();
    q.addEventListener("change", read);
    return () => q.removeEventListener("change", read);
  }, [trigger]);
  const opensOnHover = trigger === "hover" || (trigger === "auto" && canHover);

  // Nothing is laid out until the frame is measured; the entrance starts one
  // frame after that, so the slats never fly in from a stack at the origin.
  const measured = size.w > 0;
  useEffect(() => {
    if (!measured) return;
    if (!entrance) return setEntered(true);
    let a = requestAnimationFrame(() => (a = requestAnimationFrame(() => setEntered(true))));
    return () => cancelAnimationFrame(a);
  }, [measured, entrance]);

  // Optional automatic cycling; it rests while the reader is on the strip.
  useEffect(() => {
    if (!autoPlay || paused || count < 2) return;
    const id = setInterval(() => setFocused((f) => (f + 1) % count), Math.max(600, autoPlayMs));
    return () => clearInterval(id);
  }, [autoPlay, autoPlayMs, paused, count]);

  const onKey = useCallback(
    (e, i) => {
      const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (!step) return;
      e.preventDefault();
      const next = clamp(i + step, 0, count - 1);
      setFocused(next);
      nodes.current[next]?.focus();
    },
    [count]
  );

  /* The slats are laid out at their authored sizes, then the whole strip is
     scaled down by one factor if it would overrun the frame, so the
     arrangement is identical at every width. */
  const natural = (count - 1) * (collapsedWidth + gap) + expandedWidth;
  const scale = size.w > 0 && natural > size.w ? size.w / natural : 1;
  const cw = collapsedWidth * scale;
  const ew = expandedWidth * scale;
  const g = gap * scale;
  const ph = size.h > 0 ? Math.min(panelHeight, size.h) : panelHeight;

  const slots = useMemo(() => {
    let left = (size.w - natural * scale) / 2;
    return Array.from({ length: count }, (_, i) => {
      const width = i === focused ? ew : cw;
      const slot = { left, width };
      left += width + g;
      return slot;
    });
  }, [count, focused, cw, ew, g, natural, scale, size.w]);

  const marker = slots[clamp(focused, 0, count - 1)];
  const showSelector = (showBox || showLines) && marker;
  const dimAmount = clamp(dim, 0, 10) / 10;
  const dimmed = dimAmount > 0 ? `brightness(${(1 - dimAmount * (1 - DIM_FLOOR)).toFixed(3)})` : "none";
  const slide = `${Math.max(0, slideDuration)}s ${EASES[slideEase] || EASES.snap}`;
  const slideCss = `left ${slide}, width ${slide}`;

  return (
    <div
      ref={frameRef}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      style={{ position: "relative", width: "100%", height: "100%", minHeight: 160, overflow: "hidden", background, ...style }}
    >
      <div style={{ position: "absolute", top: "50%", left: 0, width: "100%", height: ph, transform: "translateY(-50%)" }}>
        {measured &&
          frames.map(({ src, offsetY }, i) => {
            const slot = slots[i];
            const open = i === focused;
            return (
              <div
                key={i}
                ref={(n) => (nodes.current[i] = n)}
                role="button"
                tabIndex={0}
                aria-label={`Frame ${i + 1} of ${count}`}
                aria-pressed={open}
                onFocus={() => setFocused(i)}
                onKeyDown={(e) => onKey(e, i)}
                onPointerEnter={opensOnHover ? () => setFocused(i) : undefined}
                onClick={() => setFocused(i)}
                style={{
                  position: "absolute",
                  top: 0,
                  height: "100%",
                  left: slot.left,
                  width: slot.width,
                  overflow: "hidden",
                  cursor: "pointer",
                  borderRadius: radius,
                  outlineOffset: 2,
                  transition: slideCss,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    filter: open ? "none" : dimmed,
                    opacity: entered || !entrance ? 1 : 0,
                    transform: entered || !entrance ? "none" : "translateY(28px)",
                    transition: entrance
                      ? `opacity ${entranceDuration}s ${ENTRANCE_EASE} ${i * stagger}s, transform ${entranceDuration}s ${ENTRANCE_EASE} ${i * stagger}s, filter 600ms ${EASES.snap}`
                      : `filter 600ms ${EASES.snap}`,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: 0,
                      transform: "translateX(-50%)",
                      width: ew,
                      height: "100%",
                      background: placeholder(i),
                    }}
                  >
                    {src && (
                      <img
                        src={src}
                        alt=""
                        draggable={false}
                        referrerPolicy="no-referrer"
                        onError={(e) => (e.currentTarget.style.display = "none")}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          // Picks which part of the overflow shows; scaled with
                          // the strip so the framing holds on a narrow frame.
                          objectPosition: `50% calc(50% + ${offsetY * scale}px)`,
                          display: "block",
                          pointerEvents: "none",
                          userSelect: "none",
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}

        {measured && showSelector && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: 0,
              height: "100%",
              left: marker.left,
              width: marker.width,
              border: showBox ? `${thickness}px solid ${selectorColor}` : "none",
              borderRadius: radius,
              pointerEvents: "none",
              zIndex: 100,
              transition: slideCss,
            }}
          >
            {showLines && (
              <>
                <div style={{ position: "absolute", left: "50%", bottom: "100%", transform: "translateX(-50%)", width: thickness, height: lineLength, background: selectorColor }} />
                <div style={{ position: "absolute", left: "50%", top: "100%", transform: "translateX(-50%)", width: thickness, height: lineLength, background: selectorColor }} />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
