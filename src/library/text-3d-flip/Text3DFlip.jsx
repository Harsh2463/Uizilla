import { memo, useCallback, useEffect, useMemo, useRef } from "react";

/**
 * Text3DFlip — every letter is a little 3D block that tips over to show a
 * second face, one after another.
 *
 * Each character has two faces set at right angles around a cube whose size is
 * one line height (the `lh` unit), so the block turns about its own centre. On
 * hover, on mount, or on a loop, all the letters flip with a stagger that can
 * start from the first, last or middle letter or at random; when a flip ends
 * the block snaps back to rest, which looks identical, so it can flip again
 * straight away. The back face can be a different colour.
 *
 * Self-contained: React and the browser's Web Animations API only. Fills its
 * parent, so give the parent a size.
 */

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const num = (v, fb) => (Number.isFinite(Number(v)) ? Number(v) : fb);

const HAS_SEGMENTER = typeof Intl !== "undefined" && "Segmenter" in Intl;

/** Splits into user-perceived characters, so emoji and accents stay whole. */
const splitIntoCharacters = (text) => {
  if (HAS_SEGMENTER) {
    const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
    return Array.from(segmenter.segment(text), ({ segment }) => segment);
  }
  return Array.from(text);
};

// Transforms for each flip direction (rest, flipped, and the two faces).
const SECOND_FACE = {
  top: "rotateX(-90deg) translateZ(0.5lh)",
  right: "rotateY(90deg) translateX(50%) rotateY(-90deg) translateX(-50%) rotateY(-90deg) translateX(50%)",
  bottom: "rotateX(90deg) translateZ(0.5lh)",
  left: "rotateY(90deg) translateX(50%) rotateY(-90deg) translateX(50%) rotateY(-90deg) translateX(50%)",
};
const FRONT_FACE = {
  top: "translateZ(0.5lh)",
  bottom: "translateZ(0.5lh)",
  left: "rotateY(90deg) translateX(50%) rotateY(-90deg)",
  right: "rotateY(-90deg) translateX(50%) rotateY(90deg)",
};
const REST = {
  top: "translateZ(-0.5lh) rotateX(0deg)",
  bottom: "translateZ(-0.5lh) rotateX(0deg)",
  left: "rotateY(90deg) translateX(50%) rotateY(-90deg) rotateY(0deg)",
  right: "rotateY(90deg) translateX(50%) rotateY(-90deg) rotateY(0deg)",
};
const FLIPPED = {
  top: "translateZ(-0.5lh) rotateX(90deg)",
  bottom: "translateZ(-0.5lh) rotateX(-90deg)",
  left: "rotateY(90deg) translateX(50%) rotateY(-90deg) rotateY(-90deg)",
  right: "rotateY(90deg) translateX(50%) rotateY(-90deg) rotateY(90deg)",
};

const EASINGS = {
  // a springy settle: overshoots a little, then returns
  spring: "cubic-bezier(0.34, 1.45, 0.5, 1)",
  easeOut: "cubic-bezier(0.16, 1, 0.3, 1)",
  easeInOut: "cubic-bezier(0.65, 0, 0.35, 1)",
  linear: "linear",
};

const CharBox = memo(function CharBox({ char, color, flipColor, dir }) {
  return (
    <span
      className="t3f-char"
      style={{
        display: "inline-block",
        transformStyle: "preserve-3d",
        transform: REST[dir],
        WebkitTransform: REST[dir],
      }}
    >
      <span
        style={{
          position: "relative",
          display: "block",
          height: "1lh",
          color,
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
          transform: FRONT_FACE[dir],
          WebkitTransform: FRONT_FACE[dir],
        }}
      >
        {char}
      </span>
      <span
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          display: "block",
          height: "1lh",
          color: flipColor,
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
          transform: SECOND_FACE[dir],
          WebkitTransform: SECOND_FACE[dir],
        }}
      >
        {char}
      </span>
    </span>
  );
});

export default function Text3DFlip({
  text = "STAGGER FLIP",
  fontFamily = "Inter",
  fontWeight = "600",
  fontSize = 120,
  letterSpacing = -0.02,
  lineHeight = 1,
  textAlign = "center",
  color = "#FFFFFF",
  flipColor = "#FF6A1F",
  background = "#0B0B0B",
  animation = "hover",
  rotateDirection = "top",
  staggerFrom = "first",
  staggerDuration = 0.05,
  duration = 0.7,
  ease = "spring",
  perspective = 800,
  loopPause = 1,
  interactive = true,
  style = {},
}) {
  const content = text || "Hover me";
  const dir = FLIPPED[rotateDirection] ? rotateDirection : "top";

  const rootRef = useRef(null);
  const textRef = useRef(null);
  const busy = useRef(false);
  const mounted = useRef(false);
  const canHover = useRef(true);
  const loopTimer = useRef(0);

  const words = useMemo(() => {
    const parts = content.split(" ");
    return parts.map((word, i) => ({ chars: splitIntoCharacters(word), space: i !== parts.length - 1 }));
  }, [content]);

  const offsets = useMemo(() => {
    const o = [0];
    for (const w of words) o.push(o[o.length - 1] + w.chars.length);
    return o;
  }, [words]);

  const total = offsets[offsets.length - 1];

  // Delay (in stagger steps) for letter `i` of `n`.
  const delayFor = useCallback(
    (i, n) => {
      const s = Math.max(0, num(staggerDuration, 0.05));
      if (staggerFrom === "last") return (n - 1 - i) * s;
      if (staggerFrom === "center") return Math.abs(Math.floor(n / 2) - i) * s;
      if (staggerFrom === "random") return Math.abs(Math.floor(Math.random() * n) - i) * s;
      return i * s;
    },
    [staggerDuration, staggerFrom]
  );

  const live = useRef({});
  live.current = { dir, duration: clamp(num(duration, 0.7), 0.1, 5), ease, delayFor, total, loopPause: clamp(num(loopPause, 1), 0, 20) };

  // Flip every letter once, then snap them back to rest (which looks identical).
  const play = useCallback(async () => {
    if (busy.current) return;
    const root = textRef.current;
    if (!root) return;
    const L = live.current;
    const chars = Array.from(root.querySelectorAll(".t3f-char"));
    if (chars.length === 0 || typeof chars[0].animate !== "function") return;
    busy.current = true;
    const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    try {
      const anims = chars.map((el, i) =>
        el.animate([{ transform: REST[L.dir] }, { transform: FLIPPED[L.dir] }], {
          duration: reduced ? 1 : L.duration * 1000,
          delay: reduced ? 0 : L.delayFor(i, chars.length) * 1000,
          easing: EASINGS[L.ease] || EASINGS.spring,
          fill: "forwards",
        })
      );
      await Promise.all(anims.map((a) => a.finished.catch(() => {})));
      anims.forEach((a) => a.cancel());
    } finally {
      busy.current = false;
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const trigger = interactive ? animation : animation === "hover" ? "off" : animation;

  // On mount (and whenever the text changes), or round and round.
  useEffect(() => {
    clearTimeout(loopTimer.current);
    if (trigger === "enter") {
      play();
    } else if (trigger === "loop") {
      let alive = true;
      const run = async () => {
        if (!alive || !mounted.current) return;
        await play();
        if (!alive) return;
        loopTimer.current = setTimeout(run, live.current.loopPause * 1000);
      };
      loopTimer.current = setTimeout(run, 400);
      return () => {
        alive = false;
        clearTimeout(loopTimer.current);
      };
    }
    return () => clearTimeout(loopTimer.current);
  }, [trigger, content, play]);

  const onEnter = () => {
    if (trigger !== "hover" || !canHover.current) return;
    canHover.current = false;
    play();
  };
  const onLeave = () => {
    canHover.current = true;
  };

  const justify = textAlign === "center" ? "center" : textAlign === "right" ? "flex-end" : "flex-start";
  const fam = String(fontFamily).includes(",") ? fontFamily : `"${fontFamily}", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;

  return (
    <div
      ref={rootRef}
      onPointerEnter={trigger === "hover" ? onEnter : undefined}
      onPointerLeave={trigger === "hover" ? onLeave : undefined}
      style={{
        ...style,
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background,
        boxSizing: "border-box",
        padding: "0 4%",
      }}
    >
      <p
        ref={textRef}
        aria-label={content}
        style={{
          fontFamily: fam,
          fontWeight,
          fontSize: `${num(fontSize, 120)}px`,
          letterSpacing: `${num(letterSpacing, 0)}em`,
          lineHeight: `${num(lineHeight, 1)}em`,
          position: "relative",
          margin: 0,
          width: "100%",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: justify,
          perspective: `${clamp(num(perspective, 800), 100, 3000)}px`,
          perspectiveOrigin: "center center",
          cursor: trigger === "hover" ? "pointer" : undefined,
          userSelect: "none",
          WebkitUserSelect: "none",
          color,
        }}
      >
        {words.map((w, wi) => (
          <span key={wi} aria-hidden="true" style={{ display: "inline-flex", transformStyle: "preserve-3d" }}>
            {w.chars.map((ch, ci) => (
              <CharBox key={offsets[wi] + ci} char={ch} color={color} flipColor={flipColor} dir={dir} />
            ))}
            {w.space ? <span style={{ whiteSpace: "pre" }}> </span> : null}
          </span>
        ))}
      </p>
    </div>
  );
}
