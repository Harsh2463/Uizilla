import { useEffect, useMemo, useRef, useState } from "react";

/**
 * ScrollHighlight — a paragraph that lights up word by word (or letter by
 * letter) as you scroll through it.
 *
 * Every word starts in a dim colour and is brought up to the highlight colour
 * in sequence. The sequence is tied to the scroll position (scrub), so
 * scrolling back dims it again, or it can simply play once when the start line
 * is reached. Where it starts and ends is set with two lines, each written as
 * "<point on the text> <point on the screen>", e.g. "top center" starts when
 * the top of the text reaches the middle of the screen.
 *
 * Self-contained: React only, no animation library. It can scroll inside its
 * own box (handy for a preview) or follow the page.
 */

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const num = (v, fb) => (Number.isFinite(Number(v)) ? Number(v) : fb);

const CHAR_STAGGER = 0.03;
const WORD_STAGGER = 0.1;
/** Seconds-equivalent length of one word's own fade, as a share of the timeline. */
const ITEM_DUR = 0.5;

const POINT = { top: 0, center: 0.5, bottom: 1 };

/** "top center" → [0, 0.5]: [point on the text, point on the screen] as fractions. */
function parsePosition(str, fallback) {
  const parts = String(str || fallback).trim().split(/\s+/);
  const a = POINT[parts[0]] ?? POINT[fallback.split(" ")[0]];
  const b = POINT[parts[1]] ?? POINT[fallback.split(" ")[1]];
  return [a, b];
}

function hexToRgb(hex, fb) {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return fb;
  let h = m[1];
  if (h.length === 3) h = h.replace(/./g, (c) => c + c);
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export default function ScrollHighlight({
  text = "Every detail matters. Small interactions shape perception, build trust, and transform ordinary experiences into memorable ones.",
  fontFamily = "Inter",
  fontWeight = "600",
  fontSize = 60,
  letterSpacing = -0.025,
  lineHeight = 1.1,
  textAlign = "left",
  dimColor = "#FFFFFF",
  dimOpacity = 15,
  highlightColor = "#FFFFFF",
  background = "#0B0B0B",
  splitBy = "words",
  scrollStart = "top center",
  scrollEnd = "bottom center",
  scrub = true,
  smoothing = 0.2,
  duration = 1.2,
  scrollMode = "container",
  spacing = 100,
  interactive = true,
  style = {},
}) {
  const rootRef = useRef(null);
  const textRef = useRef(null);
  const [boxH, setBoxH] = useState(0);

  const words = useMemo(() => String(text).trim().split(/\s+/).filter(Boolean), [text]);
  const chars = useMemo(() => Array.from(String(text)), [text]);
  const byChar = splitBy === "characters";
  const stagger = byChar ? CHAR_STAGGER : WORD_STAGGER;
  const count = byChar ? chars.length : words.length;

  // The box's own height sets how much blank scroll room sits above and below.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const read = () => setBoxH(el.getBoundingClientRect().height);
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const live = useRef({});
  live.current = {
    dim: hexToRgb(dimColor, [255, 255, 255]),
    dimA: clamp(num(dimOpacity, 15), 0, 100) / 100,
    hi: hexToRgb(highlightColor, [255, 255, 255]),
    start: parsePosition(scrollStart, "top center"),
    end: parsePosition(scrollEnd, "bottom center"),
    scrub,
    smoothing: clamp(num(smoothing, 0.2), 0, 3),
    duration: clamp(num(duration, 1.2), 0.1, 10),
    stagger,
    count,
    scrollMode,
    interactive,
  };

  // One loop: work out how far through the start→end span the text is, ease the
  // playhead toward it, and paint each word's colour from that.
  useEffect(() => {
    const root = rootRef.current;
    const para = textRef.current;
    if (!root || !para) return;
    const targets = Array.from(para.querySelectorAll("[data-t]"));
    if (targets.length === 0) return;

    let raf = 0;
    let last = null;
    let head = 0; // the playhead, 0–1
    let triggered = false;
    let painted = -1;
    let dirty = true;

    const progress = () => {
      const L = live.current;
      const r = para.getBoundingClientRect();
      let vt = 0;
      let vh = window.innerHeight || document.documentElement.clientHeight;
      if (L.scrollMode === "container") {
        const cr = root.getBoundingClientRect();
        vt = cr.top;
        vh = cr.height;
      }
      const at = (frac) => r.top + r.height * frac;
      const dsStart = at(L.start[0]) - (vt + vh * L.start[1]); // scroll still needed to reach the start line
      const dsEnd = at(L.end[0]) - (vt + vh * L.end[1]);
      // The end line is always further along than the start line, so this is negative.
      const span = dsStart - dsEnd;
      return span < -1e-6 ? clamp(dsStart / span, 0, 1) : dsStart <= 0 ? 1 : 0;
    };

    const paint = (p) => {
      const L = live.current;
      const n = L.count;
      const total = ITEM_DUR + L.stagger * Math.max(0, n - 1);
      for (let i = 0; i < targets.length; i++) {
        const t = clamp((p * total - i * L.stagger) / ITEM_DUR, 0, 1);
        const r = Math.round(L.dim[0] + (L.hi[0] - L.dim[0]) * t);
        const g = Math.round(L.dim[1] + (L.hi[1] - L.dim[1]) * t);
        const b = Math.round(L.dim[2] + (L.hi[2] - L.dim[2]) * t);
        const a = L.dimA + (1 - L.dimA) * t;
        targets[i].style.color = `rgba(${r}, ${g}, ${b}, ${a})`;
      }
    };

    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const L = live.current;
      const dt = last == null ? 0 : Math.min((now - last) / 1000, 0.1);
      last = now;
      const P = progress();
      let next = head;
      if (L.scrub) {
        // follow the scroll directly, or ease toward it
        next = L.smoothing > 0 ? head + (P - head) * (1 - Math.exp(-dt / L.smoothing)) : P;
        if (Math.abs(next - P) < 0.0005) next = P;
      } else {
        // play once when the start line is reached; wind back if scrolled above it
        if (P > 0) triggered = true;
        else triggered = false;
        const goal = triggered ? 1 : 0;
        const step = dt / L.duration;
        next = head < goal ? Math.min(goal, head + step) : Math.max(goal, head - step);
      }
      if (next !== painted || dirty) {
        head = next;
        painted = next;
        dirty = false;
        paint(next);
      } else {
        head = next;
      }
    };
    raf = requestAnimationFrame(tick);

    // A changed colour or text needs one repaint even if the playhead is still.
    dirty = true;
    return () => cancelAnimationFrame(raf);
  }, [text, splitBy, dimColor, dimOpacity, highlightColor, scrollStart, scrollEnd, scrub, scrollMode, count]);

  const padPx = (clamp(num(spacing, 100), 0, 300) / 100) * (scrollMode === "container" ? boxH : typeof window !== "undefined" ? window.innerHeight : 800);
  const fam = String(fontFamily).includes(",") ? fontFamily : `"${fontFamily}", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;

  const dimCss = `rgba(${hexToRgb(dimColor, [255, 255, 255]).join(", ")}, ${clamp(num(dimOpacity, 15), 0, 100) / 100})`;

  return (
    <div
      ref={rootRef}
      style={{
        ...style,
        position: "relative",
        width: "100%",
        height: scrollMode === "container" ? "100%" : "auto",
        minHeight: scrollMode === "container" ? undefined : 0,
        overflowY: scrollMode === "container" ? "auto" : "visible",
        overflowX: "hidden",
        background,
        boxSizing: "border-box",
      }}
    >
      <div style={{ padding: `${padPx}px 6%`, boxSizing: "border-box", display: "flex", justifyContent: textAlign === "center" ? "center" : textAlign === "right" ? "flex-end" : "flex-start" }}>
        <p
          ref={textRef}
          style={{
            margin: 0,
            display: "inline-block",
            whiteSpace: "pre-wrap",
            maxWidth: "100%",
            fontFamily: fam,
            fontWeight,
            fontSize: `${num(fontSize, 60)}px`,
            letterSpacing: `${num(letterSpacing, 0)}em`,
            lineHeight: `${num(lineHeight, 1.1)}em`,
            textAlign,
            color: dimCss,
          }}
        >
          {byChar
            ? chars.map((ch, i) => (
                <span key={`${ch}-${i}`} data-t style={{ display: "inline-block", color: dimCss }}>
                  {ch === " " ? " " : ch}
                </span>
              ))
            : words.map((w, i) => (
                <span key={`${w}-${i}`}>
                  <span data-t style={{ display: "inline-block", color: dimCss }}>
                    {w}
                  </span>
                  {i < words.length - 1 ? " " : null}
                </span>
              ))}
        </p>
      </div>
    </div>
  );
}
