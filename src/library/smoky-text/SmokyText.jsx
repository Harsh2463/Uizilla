import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

/**
 * SmokyText — letters that condense out of smoke.
 *
 * Every character starts invisible, drifts in from off to one side (or swells
 * in place) while a text-shadow of its own colour burns off from a wide blur
 * down to nothing, and lands crisp. Odd and even letters take slightly
 * different paths so the cloud looks uneven. It can play on mount, on first
 * hover, or when scrolled into view, once or on a loop.
 *
 * Self-contained: React only. Fills its parent, so give the parent a size.
 * The keyframes are written into a <style> inside the component and named per
 * instance, so several of them with different colours never clash.
 */

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const num = (v, fb) => (Number.isFinite(Number(v)) ? Number(v) : fb);

const EASES = {
  linear: "linear",
  easeIn: "cubic-bezier(0.42,0,1,1)",
  easeOut: "cubic-bezier(0,0,0.58,1)",
  easeInOut: "cubic-bezier(0.42,0,0.58,1)",
  spring: "cubic-bezier(0.175,0.885,0.32,1.275)",
};

/** Splits the text into words, spaces and line breaks, numbering every visible
 * character both overall and within its line. */
function buildGroups(text) {
  const lines = text.split("\n");
  const groups = [];
  let globalIdx = 0;
  let gi = 0;
  lines.forEach((line, lineIdx) => {
    let posInLine = 0;
    (line.match(/\S+|\s+/g) ?? []).forEach((seg) => {
      groups.push({
        type: /^\s/.test(seg) ? "space" : "word",
        chars: seg.split("").map((c) => ({ char: c, globalIdx: globalIdx++, posInLine: posInLine++, lineIdx })),
        lineIdx,
        gi: gi++,
      });
    });
    if (lineIdx < lines.length - 1) groups.push({ type: "newline", chars: [], lineIdx, gi: gi++ });
  });
  return { groups, totalVisible: globalIdx };
}

/** Raw stagger for a character, in steps of 0.1: one after another, line by
 * line (each visual line restarts at its left edge), or all at once. */
function rawDelay(c, mode, vli) {
  const S = 0.1;
  if (mode === "inPlace") return 0;
  if (mode === "multiLine" && vli) return (vli.charVLPos.get(c.globalIdx) ?? 0) * S;
  return c.globalIdx * S;
}

/** The staggers are squeezed so the last letter starts at half the duration and
 * every letter takes the other half, whatever the length of the text. */
function scaledTiming(rawD, maxRaw, duration) {
  if (maxRaw <= 0) return { delay: 0, charDur: duration };
  return { charDur: duration * 0.5, delay: (rawD * (duration * 0.5)) / maxRaw };
}

function animName(prefix, c, position, mode) {
  const even = c.globalIdx % 2 === 0;
  if (mode === "inPlace") return `${prefix}-c-${even ? "a" : "b"}`;
  return `${prefix}-${position === "topLeft" ? "tl" : "bl"}-${even ? "a" : "b"}`;
}

/** Intensity 1 = a crisp, quick puff; 20 = heavy diffuse smoke. Higher values
 * stack more shadow layers (real mass), blur wider and fly further. */
function buildKeyframes(prefix, color, intensity) {
  const n = (clamp(intensity, 1, 20) - 1) / 19;
  const r = (v) => +v.toFixed(2);

  const peakB = Math.round(6 + n * 200); // blur at the thickest point: 6px → 206px
  const initB = Math.round(2 + n * 70); // blur at the start: 2px → 72px
  const layers = 1 + Math.round(n * 3);
  const stack = (blur) =>
    Array.from({ length: layers }, (_, i) => `0 0 ${Math.round((blur * (i + 1)) / layers)}px ${color}`).join(",");
  const peak = stack(peakB);
  const init = stack(initB);

  const d = 0.7 + n * 0.8; // how far they travel: 0.7× → 1.5×
  // In place: start as a big diffuse cloud and contract inward into the letter.
  const ic = r(1.3 + n * 0.5);
  const ic2 = r(1.15 + n * 0.35);

  const end = `to{opacity:1;text-shadow:0 0 0 ${color};transform:none}`;
  const mid = `40%{text-shadow:${peak}}`;
  const from = (t) => `from{opacity:0;text-shadow:${init};transform:${t}}`;

  return `
@keyframes ${prefix}-c-a{${from(`scale(${ic})`)}${mid}${end}}
@keyframes ${prefix}-c-b{${from(`scale(${ic2})`)}${mid}${end}}
@keyframes ${prefix}-bl-a{${from(`translate3d(${r(-15 * d)}rem,${r(8 * d)}rem,0) rotate(40deg) skewX(-70deg) scale(0.7)`)}${mid}${end}}
@keyframes ${prefix}-bl-b{${from(`translate3d(${r(-18 * d)}rem,${r(8 * d)}rem,0) rotate(40deg) skewX(70deg) scale(0.5)`)}${mid}${end}}
@keyframes ${prefix}-tl-a{${from(`translate3d(${r(-15 * d)}rem,${r(-8 * d)}rem,0) rotate(-40deg) skewX(70deg) scale(0.7)`)}${mid}${end}}
@keyframes ${prefix}-tl-b{${from(`translate3d(${r(-18 * d)}rem,${r(-8 * d)}rem,0) rotate(-40deg) skewX(-70deg) scale(0.5)`)}${mid}${end}}
`;
}

export default function SmokyText({
  text = "SMOKY\\nTEXT",
  fontFamily = "Inter",
  fontWeight = "700",
  fontSize = 120,
  letterSpacing = 0,
  lineHeight = 1.1,
  textAlign = "center",
  color = "#F5F5F5",
  background = "#0B0B0B",
  intensity = 10,
  position = "bottomLeft",
  animationMode = "singleLine",
  duration = 2,
  delay = 0,
  ease = "easeOut",
  trigger = "default",
  scrollPosition = "bottom",
  scrollDistance = 20,
  loop = false,
  loopPause = 1.5,
  interactive = true,
  style = {},
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const prefix = `smt${uid}`;

  // A typed "\n" counts as a line break, so it can be written in a one-line field.
  const content = String(text).replace(/\\n/g, "\n");
  const { groups, totalVisible } = useMemo(() => buildGroups(content), [content]);

  const dur = clamp(num(duration, 2), 0.2, 12);
  const wait = clamp(num(delay, 0), 0, 10);
  const timing = EASES[ease] || EASES.easeOut;
  const mode = animationMode;

  const containerRef = useRef(null);
  const wordRefs = useRef(new Map());
  const [vli, setVli] = useState(null);

  // Multi-line mode needs to know where the browser wrapped each word, so a
  // visual line can stagger from its own left edge.
  const measureVL = useCallback(() => {
    if (mode !== "multiLine") {
      setVli(null);
      return;
    }
    const items = [];
    groups.forEach((g) => {
      if (g.type === "newline" || !g.chars.length) return;
      const el = wordRefs.current.get(g.gi);
      if (el) items.push({ top: el.offsetTop, gi: g.gi, chars: g.chars });
    });
    items.sort((a, b) => a.gi - b.gi);
    const tops = [...new Set(items.map((i) => i.top))].sort((a, b) => a - b);
    const topToVL = new Map(tops.map((t, i) => [t, i]));
    const charVLPos = new Map();
    const vlPos = new Map();
    items.forEach(({ top, chars }) => {
      const vl = topToVL.get(top) ?? 0;
      chars.forEach((c) => {
        const p = vlPos.get(vl) ?? 0;
        charVLPos.set(c.globalIdx, p);
        vlPos.set(vl, p + 1);
      });
    });
    setVli({ charVLPos });
  }, [groups, mode]);

  useEffect(() => {
    measureVL();
    if (!containerRef.current) return;
    const ro = new ResizeObserver(measureVL);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [measureVL, fontSize, fontFamily, fontWeight, letterSpacing]);

  const maxRaw = useMemo(() => {
    let m = 0;
    groups.forEach((g) =>
      g.chars.forEach((c) => {
        const d = rawDelay(c, mode, vli);
        if (d > m) m = d;
      })
    );
    return m;
  }, [groups, mode, vli]);

  // hidden → appearing → visible
  const [phase, setPhase] = useState("hidden");
  const timers = useRef([]);
  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));

  const live = useRef({});
  live.current = { dur, wait, loop, loopPause: clamp(num(loopPause, 1.5), 0, 20) };
  const hoverFired = useRef(false);

  // Run the smoke-in once, then hold on visible (or go round again when looping).
  const runAppear = useCallback(() => {
    clear();
    const L = live.current;
    setPhase("hidden");
    later(
      () => {
        setPhase("appearing");
        later(() => {
          setPhase("visible");
          if (live.current.loop) later(runAppear, live.current.loopPause * 1000);
        }, L.dur * 1000 + 200);
      },
      Math.max(L.wait * 1000, 80)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dist = clamp(num(scrollDistance, 20), 0, 100);
  const trig = interactive ? trigger : "default";

  useEffect(() => {
    clear();
    if (trig === "default") {
      runAppear();
      return clear;
    }
    hoverFired.current = false;
    setPhase("hidden");
    if (trig === "scroll") {
      const el = containerRef.current;
      if (!el) return clear;
      // top: fire when the top edge reaches `distance`% down from the top of the
      // window; bottom: when the bottom edge reaches `distance`% up from the bottom.
      const check = () => {
        const vh = window.innerHeight || document.documentElement.clientHeight;
        const rect = el.getBoundingClientRect();
        return scrollPosition === "top" ? rect.top <= vh * (dist / 100) : rect.bottom <= vh * (1 - dist / 100);
      };
      if (check()) {
        runAppear();
        return clear;
      }
      const onScroll = () => {
        if (check()) {
          runAppear();
          window.removeEventListener("scroll", onScroll, true);
          window.removeEventListener("resize", onScroll);
        }
      };
      window.addEventListener("scroll", onScroll, true);
      window.addEventListener("resize", onScroll);
      return () => {
        window.removeEventListener("scroll", onScroll, true);
        window.removeEventListener("resize", onScroll);
        clear();
      };
    }
    // hover: the container's mouseenter drives runAppear
    return clear;
  }, [content, color, intensity, position, mode, trig, scrollPosition, dist, dur, wait, loop, runAppear]);

  const justify = textAlign === "right" ? "flex-end" : textAlign === "center" ? "center" : "flex-start";
  const keyframes = useMemo(() => buildKeyframes(prefix, color, num(intensity, 10)), [prefix, color, intensity]);

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => {
        if (trig === "hover" && !hoverFired.current) {
          hoverFired.current = true;
          runAppear();
        }
      }}
      style={{
        ...style,
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: justify,
        overflow: "hidden",
        background,
        boxSizing: "border-box",
        padding: "0 4%",
      }}
    >
      <style>{keyframes}</style>
      <div
        style={{
          fontFamily: `"${fontFamily}", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`,
          fontWeight,
          fontSize: `${num(fontSize, 120)}px`,
          letterSpacing: `${num(letterSpacing, 0)}px`,
          lineHeight: num(lineHeight, 1.1),
          color: "transparent",
          backfaceVisibility: "hidden",
          userSelect: "none",
          textAlign,
          wordBreak: "keep-all",
          overflowWrap: "normal",
        }}
      >
        {groups.map((group) => {
          if (group.type === "newline") return <br key={group.gi} />;
          if (group.type === "space")
            return (
              <span
                key={group.gi}
                ref={(el) => {
                  if (el) wordRefs.current.set(group.gi, el);
                }}
                style={{ display: "inline", whiteSpace: "pre" }}
              >
                {" "}
              </span>
            );
          return (
            <span
              key={group.gi}
              ref={(el) => {
                if (el) wordRefs.current.set(group.gi, el);
              }}
              style={{ display: "inline-block", whiteSpace: "nowrap" }}
            >
              {group.chars.map((c) => {
                const base = { display: "inline-block", textShadow: `0 0 0 ${color}` };
                if (phase === "hidden")
                  return (
                    <span key={c.globalIdx} style={{ ...base, opacity: 0 }}>
                      {c.char}
                    </span>
                  );
                if (phase === "visible")
                  return (
                    <span key={c.globalIdx} style={{ ...base, opacity: 1 }}>
                      {c.char}
                    </span>
                  );
                const t = scaledTiming(rawDelay(c, mode, vli), maxRaw, dur);
                return (
                  <span
                    key={c.globalIdx}
                    style={{
                      ...base,
                      animation: `${animName(prefix, c, position, mode)} ${t.charDur}s ${t.delay}s ${timing} both`,
                    }}
                  >
                    {c.char}
                  </span>
                );
              })}
            </span>
          );
        })}
      </div>
    </div>
  );
}
