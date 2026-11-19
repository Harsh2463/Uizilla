import { useEffect, useState } from "react";

export const reducedMotion = () =>
  typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

const easeOut = (t) => 1 - Math.pow(1 - t, 3);

/** A number that counts up from 0 to `to` every time `to` (or `replay`) changes. */
export function useCountUp(to, { duration = 1100, decimals = 0, replay } = {}) {
  const [v, setV] = useState(reducedMotion() ? to : 0);
  useEffect(() => {
    if (reducedMotion()) return setV(to);
    let raf;
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / duration);
      setV(to * easeOut(t));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    setV(0);
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, duration, replay]);
  const f = 10 ** decimals;
  return Math.round(v * f) / f;
}

/** True while the element is on screen. */
export function useOnScreen(ref, margin = "0px") {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin]);
  return on;
}

export const money = (n) => "$" + Math.round(n).toLocaleString("en-US");
