import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * MagneticCarousel — a row of thin image bars that magnify (width and
 * height) as the cursor nears, macOS-dock style: the bar under the cursor
 * grows most and its neighbours taper off with distance. Click a bar to open
 * it as a large square while the others blur and dim; click it again, click
 * the backdrop, or press Esc to collapse.
 *
 * The hover magnify is a continuous easing loop (no CSS transition), so it
 * tracks the cursor smoothly; opening and closing use `duration` and
 * `easing`. The whole row scales down to fit its container when it would
 * otherwise overflow.
 *
 * Self-contained: copy this single file into any React (16.8+) project. No
 * other packages, CSS or files needed. It fills 100% of its parent, so give
 * the parent a height, e.g.
 *   <div style={{ height: 480 }}><MagneticCarousel /></div>
 */

const u = (id) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&h=1100&q=80`;

// Built-in images. Used when no `images` prop is passed, when the list is
// empty, when an item has no `src`, or when an image URL fails to load.
const FALLBACK_IMAGES = [
  "photo-1506744038136-46273834b3fb",
  "photo-1469474968028-56623f02e42e",
  "photo-1441974231531-c6227db76b6e",
  "photo-1470071459604-3b5ec3a7fe05",
  "photo-1501785888041-af3ef285b470",
  "photo-1472214103451-9374bd1c798e",
  "photo-1465146344425-f00d5f5c8f07",
].map((id) => ({ src: u(id) }));

const EASINGS = {
  smooth: "cubic-bezier(0.22, 1, 0.36, 1)",
  easeInOut: "ease-in-out",
  easeOut: "ease-out",
  easeIn: "ease-in",
  linear: "linear",
  // Slight overshoot as it opens, then settles.
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const srcOf = (item) => (typeof item === "string" ? item : item?.src || "");

export default function MagneticCarousel({
  images = FALLBACK_IMAGES,
  collapsedWidth = 100,
  hoverWidth = 200,
  collapsedHeight = 340,
  hoverHeight = 400,
  openSize = 500,
  gap = 16,
  influence = 200,
  blur = 2,
  duration = 0.3,
  easing = "easeInOut",
  followSpeed = 0.2,
  cornerRadius = 0,
  dimOpacity = 0.6,
  clickToOpen = true,
  fitToContainer = true,
  interactive = true,
  background = "#000000",
  style = {},
}) {
  const items = Array.isArray(images) && images.length > 0 ? images : FALLBACK_IMAGES;
  const count = items.length;

  const rootRef = useRef(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [factors, setFactors] = useState(() => items.map(() => 0));
  const [open, setOpen] = useState(null);
  const [closing, setClosing] = useState(false);
  const [failed, setFailed] = useState(() => new Set());

  // If an image URL is broken, swap just that bar for a built-in fallback.
  const srcKey = items.map(srcOf).join("|");
  useEffect(() => {
    let cancelled = false;
    setFailed(new Set());
    items.forEach((it, i) => {
      const src = srcOf(it);
      if (!src) return;
      const probe = new Image();
      probe.onerror = () => {
        if (cancelled) return;
        setFailed((prev) => (prev.has(i) ? prev : new Set(prev).add(i)));
      };
      probe.src = src;
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [srcKey]);

  const pickSrc = (i) => {
    const src = srcOf(items[i]);
    return !src || failed.has(i) ? FALLBACK_IMAGES[i % FALLBACK_IMAGES.length].src : src;
  };

  // Measure the container before first paint, then keep it in sync.
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setBox({ w: r.width, h: r.height });
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setBox({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // One scale for every dimension, so the open square and the magnified row
  // never spill out of a small container.
  const widest = Math.max(
    openSize + (count - 1) * (collapsedWidth + gap),
    count * collapsedWidth + (count - 1) * gap + (hoverWidth - collapsedWidth) * 1.5
  );
  const tallest = Math.max(openSize, hoverHeight, collapsedHeight);
  const s =
    fitToContainer && box.w > 0 && box.h > 0
      ? clamp(Math.min(1, (box.w * 0.98) / widest, (box.h * 0.98) / tallest), 0.15, 1)
      : 1;
  const cw = collapsedWidth * s;
  const hw = hoverWidth * s;
  const ch = collapsedHeight * s;
  const hh = hoverHeight * s;
  const os = openSize * s;
  const g = gap * s;
  const infl = Math.max(1, influence * s);
  const radius = cornerRadius * s;

  // Continuous easing loop: `cur` eases toward `target` every frame.
  const targetRef = useRef(items.map(() => 0));
  const curRef = useRef(items.map(() => 0));
  const loopRef = useRef(0);
  const closeTimer = useRef(0);
  const followRef = useRef(followSpeed);
  followRef.current = followSpeed;

  useEffect(() => {
    targetRef.current = items.map(() => 0);
    curRef.current = items.map(() => 0);
    setFactors(items.map(() => 0));
    setOpen(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  useEffect(
    () => () => {
      cancelAnimationFrame(loopRef.current);
      clearTimeout(closeTimer.current);
    },
    []
  );

  const startLoop = () => {
    if (loopRef.current) return;
    const step = () => {
      const tgt = targetRef.current;
      const cur = curRef.current;
      const k = clamp(followRef.current, 0.02, 1);
      let moving = false;
      for (let i = 0; i < cur.length; i++) {
        const d = (tgt[i] ?? 0) - cur[i];
        if (Math.abs(d) > 0.001) {
          cur[i] += d * k;
          moving = true;
        } else {
          cur[i] = tgt[i] ?? 0;
        }
      }
      setFactors([...cur]);
      loopRef.current = moving ? requestAnimationFrame(step) : 0;
    };
    loopRef.current = requestAnimationFrame(step);
  };

  const setTargetFromCursor = (clientX) => {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = clientX - rect.left;
    // Slot centres of the *collapsed* layout, so the magnify peak tracks the
    // cursor without feedback jitter.
    const totalBase = count * cw + (count - 1) * g;
    const startX = (rect.width - totalBase) / 2;
    targetRef.current = items.map((_, i) => {
      const center = startX + i * (cw + g) + cw / 2;
      const f = Math.max(0, 1 - Math.abs(cx - center) / infl);
      return f * f * (3 - 2 * f); // smoothstep falloff
    });
    startLoop();
  };

  const onMove = (e) => {
    if (!interactive || open !== null) return;
    setTargetFromCursor(e.clientX);
  };

  const onLeave = () => {
    if (open !== null) return;
    targetRef.current = items.map(() => 0);
    startLoop();
  };

  const dur = Math.max(0.05, duration);
  const ease = EASINGS[easing] || EASINGS.easeInOut;

  const close = () => {
    targetRef.current = items.map(() => 0);
    curRef.current = items.map(() => 0);
    setFactors(items.map(() => 0));
    setClosing(true);
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setClosing(false), dur * 1000);
    setOpen(null);
  };

  // Esc collapses an open bar.
  useEffect(() => {
    if (open === null) return;
    const onKey = (e) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggle = (i) => {
    if (!interactive || !clickToOpen) return;
    if (open === i) close();
    else setOpen(i);
  };

  const sizeFor = (i) => {
    if (open !== null) {
      return i === open ? { width: os, height: os } : { width: cw, height: ch };
    }
    const f = factors[i] ?? 0;
    return { width: cw + (hw - cw) * f, height: ch + (hh - ch) * f };
  };

  // Open/close eases via `duration`/`easing` (and animates the blur too).
  // Hover has no CSS transition — the loop above drives it.
  const openEase = `width ${dur}s ${ease}, height ${dur}s ${ease}, filter ${dur}s ${ease}, opacity ${dur}s ${ease}`;
  const barTransition = open !== null || closing ? openEase : "none";

  return (
    <div
      ref={rootRef}
      style={{
        ...style,
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        background,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: g,
        position: "relative",
        overflow: "hidden",
      }}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      {/* Transparent backdrop — click to close when a bar is open. */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          pointerEvents: open !== null ? "auto" : "none",
        }}
        onClick={close}
      />
      {items.map((_, i) => {
        const { width, height } = sizeFor(i);
        const dimmed = open !== null && i !== open;
        const clickable = interactive && clickToOpen;
        return (
          <div
            key={i}
            role={clickable ? "button" : undefined}
            tabIndex={clickable ? 0 : undefined}
            aria-label={`Image ${i + 1}`}
            aria-expanded={clickable ? open === i : undefined}
            onClick={(e) => {
              e.stopPropagation();
              toggle(i);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggle(i);
              }
            }}
            style={{
              flex: "none",
              width,
              height,
              overflow: "hidden",
              borderRadius: radius,
              cursor: clickable ? "pointer" : "default",
              transition: barTransition,
              willChange: "width, height",
              position: "relative",
              zIndex: open === i ? 3 : 2,
              filter: dimmed ? `blur(${blur}px)` : "none",
              opacity: dimmed ? dimOpacity : 1,
              backgroundColor: "#222",
              backgroundImage: `url("${pickSrc(i)}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          />
        );
      })}
    </div>
  );
}
