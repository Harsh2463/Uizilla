import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";

/**
 * TextPath — an endless marquee whose text rides along a curve.
 *
 * The path (a sine wave or a zigzag) runs past both edges of the box, so the
 * ends are never seen. The text is the same "text + separator" unit repeated
 * along it, and each cycle slides it by exactly one unit, so the loop is
 * seamless. On top of that: letter spacing, font, gradient or outline fill, a
 * visible guide line, several rows, soft edge fade, and a 3D tilt with
 * perspective.
 *
 * Self-contained: React only. Fills its parent, so give the parent a height.
 */

const FONT_STACKS = {
  sans: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  serif: "Georgia, 'Times New Roman', Times, serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace",
  display: "Impact, 'Arial Black', 'Helvetica Neue', Arial, sans-serif",
  rounded: "ui-rounded, 'Nunito', 'Varela Round', 'Trebuchet MS', system-ui, sans-serif",
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const num = (v, fallback) => (Number.isFinite(Number(v)) ? Number(v) : fallback);

/** Builds one long path across [-overflow, w + overflow]. `freq` full cycles
 * fit in the visible width. Returns the path string and how many half-cycles
 * it holds (used to size the repeat count). */
function buildPath({ shape, w, cy, amp, freq, squareness }) {
  const halfCycles = Math.max(1, Math.round(freq * 2));
  const hw = w / halfCycles;
  const overflow = Math.max(100, w * 0.3);
  const left = Math.ceil(overflow / hw);
  const total = halfCycles + left * 2;
  const x0 = -left * hw;
  // Keep the visible part identical whatever the overflow, by flipping the
  // first bump when an odd number of half-cycles sits off to the left.
  const sign = left % 2 === 0 ? -1 : 1;

  let d = `M ${x0},${cy}`;
  if (shape === "zigzag") {
    for (let i = 0; i < total; i++) {
      const xm = x0 + (i + 0.5) * hw;
      const xb = x0 + (i + 1) * hw;
      d += ` L ${xm},${cy + (i % 2 === 0 ? sign : -sign) * amp} L ${xb},${cy}`;
    }
  } else {
    // A symmetric cubic with both handles at offset A only reaches 0.75·A, so
    // the handles are scaled by 4/3 to make the crest hit the amplitude. The
    // handle's x distance sets how square the bump is: 1/3 is a sine, smaller
    // flattens the crest and steepens the sides.
    const ctrl = amp * (4 / 3);
    const k = 1 / 3 - (clamp(squareness, 0, 100) / 100) * 0.28;
    for (let i = 0; i < total; i++) {
      const xa = x0 + i * hw;
      const xb = x0 + (i + 1) * hw;
      const py = cy + (i % 2 === 0 ? sign : -sign) * ctrl;
      d += ` C ${xa + hw * k},${py} ${xb - hw * k},${py} ${xb},${cy}`;
    }
  }
  return { d, halfCycles: total, hw };
}

export default function TextPath({
  text = "TEXT ON A PATH",
  separator = "   •   ",
  gap = 0,
  speed = 30,
  reversed = true,
  alternate = false,
  pauseOnHover = true,
  lines = 1,
  lineGap = 70,
  pathShape = "wave",
  waveFrequency = 3,
  waveHeight = 100,
  squareness = 0,
  fontSize = 40,
  fontWeight = "700",
  fontFamily = "sans",
  letterSpacing = 0,
  textColor = "#F7EDE4",
  gradient = true,
  textColor2 = "#FF7A2F",
  outline = false,
  outlineWidth = 1.5,
  showPath = false,
  pathColor = "#FF7A2F",
  pathWidth = 1.5,
  pathOpacity = 0.6,
  background = "#0B0B0D",
  perspective = 900,
  rotateX = 18,
  rotateY = 0,
  rotateZ = 0,
  fadeEdges = 12,
  interactive = true,
  style = {},
}) {
  const rootRef = useRef(null);
  const defRef = useRef(null);
  const m2Ref = useRef(null);
  const m4Ref = useRef(null);
  const pathRefs = useRef([]);

  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const gradId = `tp-g-${uid}`;
  const pathId = `tp-p-${uid}`;

  const [size, setSize] = useState({ w: 800, h: 300 });
  const [unitPx, setUnitPx] = useState(0);
  const [pathLen, setPathLen] = useState(0);

  // Measure with getBoundingClientRect (contentRect would drop any padding),
  // whole pixels only, so a sub-pixel wobble never re-renders mid-animation.
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const read = () => {
      const r = el.getBoundingClientRect();
      const w = Math.round(r.width);
      const h = Math.round(r.height);
      if (w <= 0 || h <= 0) return;
      setSize((p) => (Math.abs(p.w - w) <= 1 && Math.abs(p.h - h) <= 1 ? p : { w, h }));
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const w = size.w;
  const h = size.h;
  const fs = clamp(num(fontSize, 40), 6, 400);
  const ls = num(letterSpacing, 0);
  const family = FONT_STACKS[fontFamily] || FONT_STACKS.sans;
  const rowCount = Math.round(clamp(num(lines, 1), 1, 6));
  const rowGap = clamp(num(lineGap, 70), 0, 600);

  // Text unit: text + padding + separator + padding. Non-breaking spaces,
  // because SVG text collapses ordinary runs of whitespace.
  const pad = " ".repeat(Math.round(clamp(num(gap, 0), 0, 20)));
  const unitText = (text && text.length ? text : " ") + pad + (separator ?? "") + pad;
  const estUnit = Math.max(1, unitText.length * fs * 0.6);
  const unit = unitPx > 0 ? unitPx : estUnit;

  // Crests are kept inside the box: glyphs hang about a font-size off the
  // path, and the rows above and below take their own share of the height.
  const span = ((rowCount - 1) * rowGap) / 2;
  const amp = Math.max(0, Math.min(num(waveHeight, 100) / 2, h / 2 - fs - span));
  const cy = h / 2;

  const geo = useMemo(
    () =>
      buildPath({
        shape: pathShape,
        w,
        cy,
        amp,
        freq: clamp(num(waveFrequency, 3), 0.5, 12),
        squareness: num(squareness, 0),
      }),
    [pathShape, w, cy, amp, waveFrequency, squareness]
  );

  useLayoutEffect(() => {
    const el = defRef.current;
    if (!el) return;
    let len = 0;
    try {
      len = el.getTotalLength();
    } catch {
      len = 0;
    }
    if (Number.isFinite(len) && len > 0) setPathLen((p) => (p === len ? p : len));
  }, [geo]);

  // The true period is (length of 4 units - length of 2 units) / 2. The
  // difference cancels the whitespace trimming at the ends of a measured run,
  // so the loop's wrap distance matches the on-path advance exactly.
  useLayoutEffect(() => {
    const a = m2Ref.current;
    const b = m4Ref.current;
    if (!a || !b) return;
    let la = 0;
    let lb = 0;
    try {
      la = a.getComputedTextLength();
      lb = b.getComputedTextLength();
    } catch {
      return;
    }
    const period = (lb - la) / 2;
    if (Number.isFinite(period) && period > 0) setUnitPx((p) => (p === period ? p : period));
  }, [unitText, fs, ls, family, fontWeight]);

  // Enough repeats that the text always outruns the path. Steep bumps are
  // several times longer than their chord, so estimate the arc, and never
  // trust a measured length that is lower than that estimate.
  const seg = 2 * Math.hypot(geo.hw / 2, amp * 1.34) * 1.15;
  const estLen = geo.halfCycles * Math.max(geo.hw, seg);
  const repeats = Math.min(256, Math.max(2, Math.ceil(Math.max(pathLen, estLen) / unit) + 3));
  const repeated = unitText.repeat(repeats);

  // The motion: one rAF loop reading refs, so re-renders never restart it.
  // Each row's textPath startOffset is slid by up to one unit and wraps, which
  // is pixel-identical to not having moved. Offsets stay in [-unit, 0) so the
  // path's start is always covered by text, however long the unit is.
  const live = useRef({});
  live.current = {
    pps: Math.max(0, num(speed, 0)) * 5,
    dir: reversed ? 1 : -1,
    alternate,
    unit: unitPx > 0 ? unitPx : 0,
    rows: rowCount,
    pause: pauseOnHover && interactive,
  };
  const offsets = useRef([]);
  const hover = useRef(false);
  const slow = useRef(1);

  useEffect(() => {
    let raf = 0;
    let last = null;
    const loop = (t) => {
      raf = requestAnimationFrame(loop);
      if (last == null) last = t;
      const dt = Math.min((t - last) / 1000, 1 / 30);
      last = t;
      const L = live.current;
      const target = L.pause && hover.current ? 0 : 1;
      slow.current += (target - slow.current) * Math.min(1, dt * 6);
      if (!(L.unit > 0)) return;
      for (let i = 0; i < L.rows; i++) {
        const el = pathRefs.current[i];
        if (!el) continue;
        if (offsets.current[i] == null) offsets.current[i] = -((i * 0.37) % 1) * L.unit;
        const dir = L.alternate && i % 2 ? -L.dir : L.dir;
        let off = offsets.current[i] + dir * L.pps * slow.current * dt;
        off = (((off % L.unit) + L.unit) % L.unit) - L.unit;
        offsets.current[i] = off;
        el.setAttribute("startOffset", `${off}px`);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const fade = clamp(num(fadeEdges, 0), 0, 45);
  const mask =
    fade > 0
      ? `linear-gradient(to right, transparent 0%, #000 ${fade}%, #000 ${100 - fade}%, transparent 100%)`
      : undefined;

  const fill = outline ? "none" : gradient ? `url(#${gradId})` : textColor;
  const stroke = outline ? (gradient ? `url(#${gradId})` : textColor) : "none";

  const textStyle = {
    fontSize: `${fs}px`,
    letterSpacing: `${ls}px`,
    fontFamily: family,
    fontWeight,
  };
  const hidden = { ...textStyle, visibility: "hidden", pointerEvents: "none" };

  const rows = Array.from({ length: rowCount }, (_, i) => (i - (rowCount - 1) / 2) * rowGap);

  return (
    <div
      ref={rootRef}
      onPointerEnter={() => {
        hover.current = true;
      }}
      onPointerLeave={() => {
        hover.current = false;
      }}
      style={{
        ...style,
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background,
        perspective: `${clamp(num(perspective, 900), 100, 5000)}px`,
        perspectiveOrigin: "50% 50%",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `rotateX(${num(rotateX, 0)}deg) rotateY(${num(rotateY, 0)}deg) rotateZ(${num(rotateZ, 0)}deg)`,
          transformStyle: "preserve-3d",
          WebkitMaskImage: mask,
          maskImage: mask,
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox={`0 0 ${w} ${h}`}
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid meet"
          style={{ display: "block", width: "100%", height: "100%" }}
          aria-hidden="true"
        >
          <defs>
            <path ref={defRef} id={pathId} d={geo.d} fill="none" />
            <linearGradient id={gradId} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={w} y2="0">
              <stop offset="0%" stopColor={textColor} />
              <stop offset="100%" stopColor={textColor2} />
            </linearGradient>
          </defs>

          <text ref={m2Ref} x={0} y={-9999} style={hidden}>
            {unitText.repeat(2)}
          </text>
          <text ref={m4Ref} x={0} y={-9999} style={hidden}>
            {unitText.repeat(4)}
          </text>

          {rows.map((dy, i) => (
            <g key={i} transform={`translate(0 ${dy})`}>
              {showPath && (
                <path
                  d={geo.d}
                  fill="none"
                  stroke={pathColor}
                  strokeWidth={clamp(num(pathWidth, 1.5), 0, 20)}
                  strokeOpacity={clamp(num(pathOpacity, 0.6), 0, 1)}
                  strokeLinejoin="round"
                />
              )}
              <text
                fill={fill}
                stroke={stroke}
                strokeWidth={outline ? clamp(num(outlineWidth, 1.5), 0.2, 12) : 0}
                strokeLinejoin="round"
                style={textStyle}
              >
                <textPath
                  ref={(el) => {
                    pathRefs.current[i] = el;
                  }}
                  href={`#${pathId}`}
                  xlinkHref={`#${pathId}`}
                >
                  {repeated}
                </textPath>
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
