import { useEffect, useRef, useState } from "react";

export const prefersReducedMotion = () =>
  typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

/** Plays the load sequence once: title lines rise out of their masks, the photo
 * rises and un-blurs, the nav drops in, everything else rises and fades in. */
export function useLoadIn(rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion()) return;
    const run = (el, from, to, opts) => el.animate([from, to], { fill: "backwards", easing: "cubic-bezier(.2,.7,.2,1)", ...opts });
    root.querySelectorAll("[data-title-line]").forEach((el, i) =>
      run(el, { transform: "translateY(108%)" }, { transform: "translateY(0)" }, { duration: 1000, delay: 120 + i * 110 })
    );
    const photo = root.querySelector("[data-photo]");
    if (photo)
      run(photo, { opacity: 0, transform: "translateY(40px)", filter: "blur(14px)" }, { opacity: 1, transform: "translateY(0)", filter: "blur(0)" }, { duration: 1300, delay: 150 });
    const nav = root.querySelector("[data-nav]");
    if (nav) run(nav, { opacity: 0, transform: "translateY(-18px)" }, { opacity: 1, transform: "translateY(0)" }, { duration: 800, delay: 100 });
    root.querySelectorAll("[data-rise]").forEach((el, i) =>
      run(el, { opacity: 0, transform: "translateY(14px)" }, { opacity: 1, transform: "translateY(0)" }, { duration: 800, delay: 420 + i * 55 })
    );
    root.querySelectorAll("[data-draw]").forEach((el) =>
      run(el, { transform: "scaleX(0)" }, { transform: "scaleX(1)" }, { duration: 1400, delay: 900 })
    );
  }, [rootRef]);
}

/** Drifts an element at `speed` x the scroll (the hero photo). */
export function useParallax(ref, speed = 0.12) {
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    let raf = 0;
    const tick = () => {
      raf = 0;
      el.style.transform = `translate3d(0, ${(window.scrollY * speed).toFixed(1)}px, 0)`;
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    window.addEventListener("scroll", on, { passive: true });
    tick();
    return () => {
      window.removeEventListener("scroll", on);
      cancelAnimationFrame(raf);
    };
  }, [ref, speed]);
}

/** A number that counts up to `to` over `duration` ms once `start` is true. */
export function useCountUp(to, start, duration = 1400) {
  const [v, setV] = useState(prefersReducedMotion() ? to : 0);
  useEffect(() => {
    if (!start) return;
    if (prefersReducedMotion()) return setV(to);
    let raf;
    const t0 = performance.now();
    const step = (now) => {
      const t = clamp((now - t0) / duration, 0, 1);
      setV(Math.round(to * easeOut(t)));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, start, duration]);
  return v;
}

/** True once the element has scrolled into view (and stays true). */
export function useInView(ref, margin = "-12% 0px") {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") return setSeen(true);
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: margin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin]);
  return seen;
}

const hex = (c) => {
  const s = c.trim();
  const rgb = s.match(/^rgba?\((\d+)[ ,]+(\d+)[ ,]+(\d+)/);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  const h6 = s.replace("#", "");
  const f = h6.length === 3 ? h6.split("").map((x) => x + x).join("") : h6;
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16) || 0);
};

/** Fills the words inside `ref` from the colour of CSS variable `fromVar` to `toVar` in reading
 * order as the section scrolls through the viewport, with a soft edge of `edge` words. The variables
 * (theme.css) are read on every paint, so a theme change shows up at once. */
export function useWordFill(ref, fromVar, toVar, edge = 3) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const words = [...root.querySelectorAll("[data-word]")];
    const colour = (name) => hex(getComputedStyle(root).getPropertyValue(name) || "#888888");
    const paint = (p) => {
      const a = colour(fromVar);
      const b = colour(toVar);
      const n = words.length;
      words.forEach((w, i) => {
        const t = clamp(p * (n + edge) - i, 0, edge) / edge;
        w.style.color = `rgb(${a.map((x, k) => Math.round(x + (b[k] - x) * t)).join(",")})`;
      });
    };
    if (prefersReducedMotion()) return paint(1);
    let raf = 0;
    const tick = () => {
      raf = 0;
      const r = root.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 when the block's top reaches 85% of the viewport, 1 when its bottom reaches 45%
      paint(clamp((vh * 0.85 - r.top) / (r.height + vh * 0.4), 0, 1));
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    tick();
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      cancelAnimationFrame(raf);
    };
  }, [ref, fromVar, toVar, edge]);
}

/** The colours the word fill uses, read from theme.css so they stay in one place. */
export function useThemeVar(ref, name, fallback) {
  const [v, setV] = useState(fallback);
  const done = useRef(false);
  useEffect(() => {
    if (done.current || !ref.current) return;
    const got = getComputedStyle(ref.current).getPropertyValue(name).trim();
    if (got) setV(got);
    done.current = true;
  }, [ref, name]);
  return v;
}
