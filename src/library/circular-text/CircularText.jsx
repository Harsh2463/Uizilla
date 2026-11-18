import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

/**
 * CircularText — words set round a ring, turning slowly.
 *
 * The words and a separator glyph are repeated until they cover the ring, and
 * the gap between letters is then stretched (never squeezed below your minimum)
 * so the text closes exactly on itself with no seam. Each letter is placed and
 * turned to face outward. Hover can speed the ring up, stop it, or shrink it
 * with a spring.
 *
 * Self-contained: React only. Fills its parent, so give the parent a size.
 */

const MAX_WORDS = 10;
const DEFAULT_WORDS = ["RING", "TEXT"];
const DEFAULT_SEPARATOR = "⁕";
const MIN_LETTER_SPACING = 0;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const num = (v, fb) => (Number.isFinite(Number(v)) ? Number(v) : fb);

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Degrees per second for a full lap in `sec` seconds. */
const degPerSec = (sec) => (Number.isFinite(sec) && sec > 0 ? 360 / sec : 0);

const cleanWords = (words) => {
  const cleaned = (Array.isArray(words) ? words : [])
    .map((w) => String(w).trim())
    .filter(Boolean)
    .slice(0, MAX_WORDS);
  return cleaned.length > 0 ? cleaned : DEFAULT_WORDS;
};

/** One lap segment ending with a separator so repeats tile cleanly. */
const buildSegment = (words, separator) => {
  const glyph = (separator && separator.length > 0 ? separator : DEFAULT_SEPARATOR).trim() || DEFAULT_SEPARATOR;
  return `${words.join(` ${glyph} `)} ${glyph} `;
};

let measureCtx = null;
const measureGlyphWidths = (letters, fontSizePx, fontWeight, fontFamily) => {
  if (letters.length === 0) return [];
  const rough = () => letters.map((l) => (l === " " ? fontSizePx * 0.35 : fontSizePx * 0.55));
  if (typeof document === "undefined") return rough();
  if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d");
  if (!measureCtx) return rough();
  const fam = fontFamily.includes(",") ? fontFamily : `"${fontFamily}"`;
  measureCtx.font = `${fontWeight} ${fontSizePx}px ${fam}, sans-serif`;
  return letters.map((l) => measureCtx.measureText(l === " " ? " " : l).width);
};
const sum = (arr) => arr.reduce((a, b) => a + b, 0);

/**
 * Builds the letter list and the gap between letters so the text covers the
 * circumference. The letter spacing you set is a minimum: it is only exceeded to
 * close the ring, and short words are repeated first so the gaps stay modest.
 */
function buildFittedCircleText(words, separator, circumference, fontSizePx, fontWeight, fontFamily, preferred) {
  const pref = Math.max(MIN_LETTER_SPACING, preferred);
  const segment = buildSegment(words, separator);
  const segLetters = Array.from(segment);
  if (segLetters.length === 0 || circumference <= 0) return { letters: [], spacing: pref, content: "", angles: [] };

  const glyphsOf = (letters) => sum(measureGlyphWidths(letters, fontSizePx, fontWeight, fontFamily));
  const segAtPref = glyphsOf(segLetters) + pref * segLetters.length;

  let repeats = Math.min(48, Math.max(1, Math.ceil(circumference / Math.max(segAtPref, 1))));
  const solve = (glyphTotal, count) => (count <= 0 ? pref : (circumference - glyphTotal) / count);

  let content = segment.repeat(repeats);
  let letters = Array.from(content);
  let spacing = solve(glyphsOf(letters), letters.length);

  // Too tight to fit: drop a repeat.
  while (spacing < pref && repeats > 1) {
    repeats -= 1;
    content = segment.repeat(repeats);
    letters = Array.from(content);
    spacing = solve(glyphsOf(letters), letters.length);
  }
  if (spacing < pref) spacing = Math.max(MIN_LETTER_SPACING, spacing);

  // Too loose: add a repeat while the gap stays above the minimum.
  const stretchLimit = Math.max(pref * 2.5, fontSizePx * 0.75);
  while (spacing > stretchLimit && repeats < 48) {
    const nextContent = segment.repeat(repeats + 1);
    const nextLetters = Array.from(nextContent);
    const nextSpacing = solve(glyphsOf(nextLetters), nextLetters.length);
    if (nextSpacing < pref) break;
    repeats += 1;
    content = nextContent;
    letters = nextLetters;
    spacing = nextSpacing;
  }

  const widths = measureGlyphWidths(letters, fontSizePx, fontWeight, fontFamily);
  const totalArc = sum(widths) + spacing * letters.length;
  const angles = [];
  let cursor = 0;
  for (let i = 0; i < letters.length; i++) {
    const w = widths[i] ?? 0;
    angles.push(totalArc > 0 ? ((cursor + w / 2) / totalArc) * 360 : 0);
    cursor += w + spacing;
  }
  return { letters, spacing, content, angles };
}

export default function CircularText({
  words = DEFAULT_WORDS,
  separator = "⁕",
  diameter = 320,
  fontFamily = "Inter",
  fontWeight = "700",
  fontSize = 24,
  letterSpacing = 0.5,
  color = "#FFFFFF",
  background = "#0B0B0B",
  spinDuration = 20,
  spinDelay = 0,
  reverse = false,
  onHover = "speed",
  hoverSpeed = 8,
  hoverScale = 0.8,
  interactive = true,
  style = {},
}) {
  const frameRef = useRef(null);
  const spinnerRef = useRef(null);
  const [size, setSize] = useState({ w: diameter, h: diameter });
  const [fontTick, setFontTick] = useState(0);

  const safeDiameter = Math.max(100, num(diameter, 320));
  const fontSizePx = clamp(num(fontSize, 24), 6, 200);
  const family = String(fontFamily || "sans-serif").split(",")[0].trim().replace(/['"]/g, "") || "sans-serif";
  const weight = String(fontWeight);

  // Measure with getBoundingClientRect so padding never skews the size.
  useLayoutEffect(() => {
    const node = frameRef.current;
    if (!node) return;
    const read = () => {
      const r = node.getBoundingClientRect();
      const w = Math.floor(r.width);
      const h = Math.floor(r.height);
      if (w < 2 || h < 2) return;
      setSize((p) => (p.w === w && p.h === h ? p : { w, h }));
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  // Letters are measured on a canvas, so re-measure once web fonts have arrived.
  useEffect(() => {
    const f = typeof document !== "undefined" ? document.fonts : undefined;
    if (!f || !f.ready) return;
    let live = true;
    f.ready.then(() => live && setFontTick((n) => n + 1));
    return () => {
      live = false;
    };
  }, [family, weight]);

  const ringSize = Math.min(safeDiameter, Math.max(0, Math.min(size.w, size.h)) || safeDiameter);
  const radius = Math.max(8, ringSize / 2 - fontSizePx * 0.55);
  const circumference = 2 * Math.PI * radius;

  const wordList = useMemo(() => cleanWords(words), [words]);
  const preferredSpacing = num(letterSpacing, 0.5);

  const fitted = useMemo(
    () => buildFittedCircleText(wordList, separator, circumference, fontSizePx, weight, family, preferredSpacing),
    // fontTick re-runs the measurement when fonts finish loading
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wordList, separator, circumference, fontSizePx, weight, family, preferredSpacing, fontTick]
  );
  const { letters, spacing, content, angles } = fitted;

  // The motion: one rAF loop turning the ring and easing its scale with a
  // spring (the same stiffness and damping a typical UI spring uses).
  const st = useRef({ rot: 0, rate: 0, paused: false, delayUntil: 0, scale: 1, vel: 0, target: 1 });
  const dir = reverse ? -1 : 1;
  const lapSec = num(spinDuration, 20);
  const delaySec = Math.max(0, num(spinDelay, 0));

  useEffect(() => {
    const s = st.current;
    if (prefersReducedMotion() || !(lapSec > 0)) {
      s.rate = 0;
      s.paused = true;
      s.delayUntil = 0;
    } else {
      s.paused = false;
      s.rate = degPerSec(lapSec) * dir;
      s.delayUntil = delaySec > 0 ? performance.now() + delaySec * 1000 : 0;
    }
    s.target = 1;
  }, [lapSec, delaySec, dir, content, onHover]);

  useEffect(() => {
    let raf = 0;
    let last = null;
    const K = 300; // spring stiffness
    const C = 20; // spring damping
    const tick = (t) => {
      raf = requestAnimationFrame(tick);
      if (last == null) last = t;
      const dt = Math.min(t - last, 64) / 1000;
      last = t;
      const s = st.current;
      const el = spinnerRef.current;
      if (!el) return;
      if (!s.paused && s.rate !== 0 && !(s.delayUntil > 0 && t < s.delayUntil)) {
        s.delayUntil = 0;
        s.rot = (((s.rot + s.rate * dt) % 360) + 360) % 360;
      }
      // spring toward the target scale (sub-stepped so a long frame stays stable)
      let left = dt;
      while (left > 0) {
        const h = Math.min(left, 1 / 120);
        s.vel += (K * (s.target - s.scale) - C * s.vel) * h;
        s.scale += s.vel * h;
        left -= h;
      }
      el.style.transform = `rotate(${s.rot}deg) scale(${s.scale})`;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const hoverStart = () => {
    if (!interactive || prefersReducedMotion() || !onHover || !(lapSec > 0)) return;
    const s = st.current;
    const hoverLap = clamp(num(hoverSpeed, 5), 1, 8);
    if (onHover === "pause") {
      s.paused = true;
      s.target = 1;
    } else if (onHover === "scale") {
      s.paused = false;
      s.rate = degPerSec(hoverLap) * dir;
      s.target = clamp(num(hoverScale, 0.8), 0.2, 1.5);
    } else {
      s.paused = false;
      s.rate = degPerSec(hoverLap) * dir;
      s.target = 1;
    }
  };
  const hoverEnd = () => {
    if (!interactive || prefersReducedMotion() || !(lapSec > 0)) return;
    const s = st.current;
    s.paused = false;
    s.rate = degPerSec(lapSec) * dir;
    s.target = 1;
  };

  const fontCss = family.includes(",") ? family : `"${family}", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;

  return (
    <div
      ref={frameRef}
      style={{
        ...style,
        width: "100%",
        height: "100%",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background,
      }}
    >
      <div
        onPointerEnter={hoverStart}
        onPointerLeave={hoverEnd}
        style={{
          position: "relative",
          width: ringSize,
          height: ringSize,
          flexShrink: 0,
          borderRadius: "50%",
          cursor: interactive && onHover ? "pointer" : "default",
          touchAction: "manipulation",
          userSelect: "none",
        }}
      >
        <div
          ref={spinnerRef}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            fontFamily: fontCss,
            fontWeight: weight,
            fontSize: `${fontSizePx}px`,
            letterSpacing: `${spacing}px`,
            color,
            textAlign: "center",
            transformOrigin: "center center",
            willChange: "transform",
            pointerEvents: "none",
          }}
        >
          {letters.map((letter, i) => {
            const angle = angles[i] ?? 0;
            const rad = (angle * Math.PI) / 180;
            const x = radius * Math.cos(rad);
            const y = radius * Math.sin(rad);
            const transform = `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${angle + 90}deg)`;
            return (
              <span
                key={`${letter}-${i}`}
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  display: "inline-block",
                  lineHeight: 1,
                  transform,
                  WebkitTransform: transform,
                }}
              >
                {letter === " " ? " " : letter}
              </span>
            );
          })}
          {/* The text once, for screen readers. */}
          <span
            style={{
              position: "absolute",
              width: 1,
              height: 1,
              padding: 0,
              margin: -1,
              overflow: "hidden",
              clip: "rect(0, 0, 0, 0)",
              whiteSpace: "nowrap",
              borderWidth: 0,
            }}
          >
            {content}
          </span>
        </div>
      </div>
    </div>
  );
}
