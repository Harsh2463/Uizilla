import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * HoverImageReveal — a list of big text lines. Hover one and its text rolls
 * up to a copy of itself, the other lines dim, and an image card follows the
 * cursor, sliding the hovered line's picture into view (pictures above it
 * wait off the top, pictures below it off the bottom, so moving between
 * lines scrolls through them).
 *
 * `layout` picks how the lines are arranged: "rows" stacks them top to
 * bottom; "columns" sets them side by side, each one running down its
 * column. `textAngle` then picks the direction: 90 turns each letter 90° and
 * reads top to bottom, -90 turns them the other way and reads bottom to top.
 *
 * The card's cursor-follow is a small spring running in plain JS; everything
 * else is CSS. Self-contained: copy this single file into any React (16.8+)
 * project. No other packages, CSS or files needed. It fills 100% of its
 * parent, so give the parent a height, e.g.
 *   <div style={{ height: 520 }}><HoverImageReveal /></div>
 */

const u = (id) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&h=1000&q=80`;

// Built-in lines. Used when no `items` prop is passed or the list is empty.
const DEFAULT_ITEMS = [
  { text: "MOUNTAIN LIGHT", src: u("photo-1506744038136-46273834b3fb") },
  { text: "ALPINE LAKES", src: u("photo-1469474968028-56623f02e42e") },
  { text: "FOREST TRAILS", src: u("photo-1441974231531-c6227db76b6e") },
  { text: "OPEN SKIES", src: u("photo-1470071459604-3b5ec3a7fe05") },
  { text: "GOLDEN HOUR", src: u("photo-1501785888041-af3ef285b470") },
];

const EASINGS = {
  smooth: "cubic-bezier(0.22, 1, 0.36, 1)",
  easeOut: "ease-out",
  easeInOut: "ease-in-out",
  linear: "linear",
  // Slight overshoot as it lands.
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
};

const FLEX = { left: "flex-start", center: "center", right: "flex-end" };
const SYSTEM_FONT =
  "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export default function HoverImageReveal({
  items = DEFAULT_ITEMS,
  layout = "rows",
  textAngle = 90,
  align = "center",
  fontFamily = SYSTEM_FONT,
  fontSize = 61,
  fontWeight = 400,
  letterSpacing = -0.05,
  lineHeight = 0.9,
  gap = 30,
  textColor = "#FFFFFF",
  dimColor = "#51565A",
  backgroundColor = "#000000",
  imageWidth = 300,
  imageHeight = 400,
  rounded = 16,
  offsetX = 200,
  offsetY = 0,
  followStrength = 0,
  rollText = true,
  duration = 0.5,
  easing = "smooth",
  fitToContainer = true,
  newTab = false,
  interactive = true,
  style = {},
}) {
  const list = (Array.isArray(items) && items.length ? items : DEFAULT_ITEMS).map(
    (it, i) => ({
      text: it?.text ?? it?.label ?? `Item ${i + 1}`,
      src: it?.src || "",
      link: it?.link || "",
    })
  );
  const count = list.length;
  const isColumns = layout === "columns";
  // Only the column layout writes text vertically; rows stay horizontal.
  // `textAngle` (90 or -90, as a number or the editor's string) then picks
  // which way the turned letters read; anything else counts as 90.
  const angle = Number(textAngle) === -90 ? -90 : 90;
  const vertical = isColumns;

  const rootRef = useRef(null);
  const contentRef = useRef(null);
  const cardRef = useRef(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [hovered, setHovered] = useState(null);
  const [scale, setScale] = useState(1);
  const [failed, setFailed] = useState(() => new Set());

  // Measure the container before first paint, then keep it in sync.
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    // Always the full outer size. (ResizeObserver's `contentRect` leaves out
    // the padding, which the fit below subtracts itself — using it would
    // take the padding off twice and shrink the text more than needed.)
    const read = () => {
      const r = el.getBoundingClientRect();
      setBox({ w: r.width, h: r.height });
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Fit: if the text block is wider or taller than the container, shrink it
  // (and the gap) in proportion. Everything scales linearly with `scale`, so
  // the natural size is just what's measured now divided by the scale now.
  const scaleRef = useRef(1);
  scaleRef.current = scale;
  const textKey = list.map((l) => l.text).join("|");
  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!fitToContainer || !el || !box.w || !box.h) {
      if (scaleRef.current !== 1) setScale(1);
      return;
    }
    const natW = el.offsetWidth / scaleRef.current;
    const natH = el.offsetHeight / scaleRef.current;
    const pad = 24;
    const next = clamp(
      Math.min(1, (box.w - pad * 2) / (natW || 1), (box.h - pad * 2) / (natH || 1)),
      0.1,
      1
    );
    if (Math.abs(next - scaleRef.current) > 0.004) setScale(next);
  }, [box.w, box.h, fitToContainer, layout, angle, fontSize, fontWeight, letterSpacing, lineHeight, gap, fontFamily, textKey]);

  // Card size and offsets follow the container so the card stays in
  // proportion with a small preview.
  const cardScale = fitToContainer
    ? clamp(Math.min(box.w / 1000, box.h / 700, 1), 0.3, 1)
    : 1;
  const cw = imageWidth * cardScale;
  const ch = imageHeight * cardScale;
  const ox = offsetX * cardScale;
  const oy = offsetY * cardScale;

  // Cursor-follow spring, written straight to the card's transform.
  const posRef = useRef({ x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, seen: false });
  const rafRef = useRef(0);
  const strengthRef = useRef(followStrength);
  strengthRef.current = followStrength;

  const paint = () => {
    const el = cardRef.current;
    const p = posRef.current;
    if (el) el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -50%)`;
  };

  const startSpring = () => {
    if (rafRef.current) return;
    let last = performance.now();
    const step = (now) => {
      const p = posRef.current;
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      const k = 60 + strengthRef.current * 5; // stiffness
      const c = 28; // damping
      const m = 0.5; // mass
      p.vx += ((-k * (p.x - p.tx) - c * p.vx) / m) * dt;
      p.vy += ((-k * (p.y - p.ty) - c * p.vy) / m) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      paint();
      const still =
        Math.abs(p.x - p.tx) < 0.05 && Math.abs(p.y - p.ty) < 0.05 &&
        Math.abs(p.vx) < 0.05 && Math.abs(p.vy) < 0.05;
      if (still) {
        p.x = p.tx;
        p.y = p.ty;
        paint();
        rafRef.current = 0;
      } else {
        rafRef.current = requestAnimationFrame(step);
      }
    };
    rafRef.current = requestAnimationFrame(step);
  };

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const moveTo = (x, y, snap) => {
    const p = posRef.current;
    p.tx = x;
    p.ty = y;
    if (snap || !p.seen) {
      // First arrival: appear at the cursor instead of flying in from a corner.
      p.x = x;
      p.y = y;
      p.vx = 0;
      p.vy = 0;
      p.seen = true;
      paint();
    } else {
      startSpring();
    }
  };

  const onMove = (e) => {
    if (!interactive) return;
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    moveTo(e.clientX - rect.left + ox, e.clientY - rect.top + oy, false);
  };

  const enter = (i) => {
    if (!interactive) return;
    setHovered(i);
  };
  const leave = () => {
    if (!interactive) return;
    setHovered(null);
  };

  // Static previews (the home-page card) cycle through the lines on their own.
  useEffect(() => {
    if (interactive || !box.w) return;
    let i = 0;
    const show = () => {
      setHovered(i % count);
      moveTo(box.w * 0.66 + ox * 0.3, box.h * 0.5 + oy, true);
      i += 1;
    };
    show();
    const id = setInterval(show, 1800);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactive, count, box.w, box.h]);

  const dur = Math.max(0.05, duration);
  const ease = EASINGS[easing] || EASINGS.smooth;
  const move = `${dur}s ${ease}`;
  const anyActive = hovered != null;

  const fs = fontSize * scale;
  const gp = gap * scale;

  // In a column the text runs down it, each letter turned on its side.
  const copyStyle = (color) => ({
    display: "block",
    color,
    transition: "color 0.2s ease",
    whiteSpace: "pre",
    textAlign: vertical ? "start" : align,
    ...(vertical ? { writingMode: "vertical-rl" } : null),
  });

  // The roll moves along the line-stacking axis: up/down for horizontal
  // text, sideways for vertical text (the next "line" of a vertical-rl block
  // sits to its left, so the copy waits there and the roll slides right).
  const rollOff = vertical ? "translateX(100%)" : "translateY(-100%)";
  const copyPos = vertical
    ? { position: "absolute", top: 0, left: "-100%", height: "100%" }
    : { position: "absolute", top: "100%", left: 0, width: "100%" };

  return (
    <div
      ref={rootRef}
      onPointerMove={onMove}
      onPointerLeave={leave}
      style={{
        ...style,
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        backgroundColor,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: FLEX[align],
        padding: 24,
        boxSizing: "border-box",
        fontFamily,
        fontSize: fs,
        fontWeight,
        letterSpacing: `${letterSpacing}em`,
        lineHeight,
      }}
    >
      {/* The image card — follows the cursor; pictures slide inside it. */}
      <div
        ref={cardRef}
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: cw,
          height: ch,
          borderRadius: rounded * cardScale,
          overflow: "hidden",
          pointerEvents: "none",
          zIndex: 2,
          opacity: anyActive ? 1 : 0,
          transition: `opacity ${move}`,
          willChange: "transform",
        }}
      >
        {list.map((item, i) => {
          const y = hovered == null ? "100%" : i < hovered ? "-100%" : i > hovered ? "100%" : "0%";
          const broken = !item.src || failed.has(i);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                inset: 0,
                overflow: "hidden",
                transform: `translateY(${y})`,
                transition: `transform ${move}`,
              }}
            >
              {broken ? (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    background: "linear-gradient(135deg,#333,#111)",
                  }}
                />
              ) : (
                <img
                  src={item.src}
                  alt={item.text}
                  draggable={false}
                  onError={() =>
                    setFailed((prev) => (prev.has(i) ? prev : new Set(prev).add(i)))
                  }
                  style={{
                    width: "100%",
                    height: "100%",
                    maxWidth: "none",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* The lines of text. */}
      <div
        ref={contentRef}
        style={{
          display: "inline-flex",
          flexDirection: isColumns ? "row" : "column",
          // Columns of different lengths line up on the edge the text starts
          // from: the top for 90°, the bottom for -90°.
          alignItems: isColumns ? (angle === -90 ? "flex-end" : "flex-start") : FLEX[align],
          justifyContent: isColumns ? FLEX[align] : "flex-start",
          gap: gp,
          position: "relative",
          zIndex: 1,
        }}
      >
        {list.map((item, i) => {
          const isHovered = hovered === i;
          const color = anyActive ? (isHovered ? textColor : dimColor) : textColor;
          const text = item.text;
          const inner = (
            <div
              style={{
                position: "relative",
                transform: rollText && isHovered ? rollOff : "translate(0%, 0%)",
                transition: `transform ${move}`,
              }}
            >
              <span style={copyStyle(color)}>{text}</span>
              <span
                aria-hidden="true"
                style={{
                  ...copyStyle(color),
                  ...copyPos,
                }}
              >
                {text}
              </span>
            </div>
          );
          return (
            <div
              key={i}
              onPointerEnter={() => enter(i)}
              style={{
                overflow: "hidden",
                cursor: item.link ? "pointer" : "default",
                // -90° is the 90° block turned upside down: it reads bottom
                // to top, and its roll runs the opposite way too.
                transform: vertical && angle === -90 ? "rotate(180deg)" : undefined,
              }}
            >
              {item.link ? (
                <a
                  href={item.link}
                  target={newTab ? "_blank" : undefined}
                  rel={newTab ? "noreferrer noopener" : undefined}
                  onFocus={() => enter(i)}
                  onBlur={leave}
                  style={{ textDecoration: "none", color: "inherit", display: "block" }}
                >
                  {inner}
                </a>
              ) : (
                inner
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
