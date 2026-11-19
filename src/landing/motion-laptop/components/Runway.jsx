import { Fragment, useEffect, useRef, useState } from "react";
import { FiChevronLeft, FiChevronRight, FiPlay, FiPause } from "react-icons/fi";
import { reducedMotion, useOnScreen } from "../hooks.js";

/**
 * The laptop carousel. Twelve bodies (the six laptops and a clone of each)
 * stand on a turning 3D ring seen from the front: the active one is full size
 * in the middle and the others curve away, shrink toward a horizon, blur and
 * fade. One continuous position is chased by a critically damped spring, so a
 * click, a drag, an arrow key, a trackpad swipe or autoplay all glide and
 * settle the same way. On phones the ring becomes a diagonal line.
 *
 * Each laptop is cropped out of one sprite sheet: its box is [x, y, w, h] in
 * the sheet's own pixels (content.js).
 */

const FRONT = 1.08; // the active laptop stands 8% taller
const SPRING_K = 95;
const ENTRANCE = 1.15;
const STEP = (2 * Math.PI) / 12;
const RATIO = 1.38; // a laptop's width / height

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mod = (n, m) => ((n % m) + m) % m;
const wrap = (d, n) => mod(d + n / 2, n) - n / 2;

// One laptop's height. On desktop the laptops are small enough for the whole ring to show; `size` scales them.
const heightFor = (W, H, narrow, size = 1) => {
  const w = narrow ? clamp(Math.min(H * 0.7 * RATIO, W * 0.84), 120, 700) : clamp(Math.min(W * 0.34, H * 0.5 * RATIO), 120, 560);
  return (w * (narrow ? 1 : clamp(size, 0.4, 2))) / RATIO; // the size setting is for the desktop ring
};

export default function Runway({ laptops, sheet, sheetSize, index, onIndexChange, autoplay = true, seconds = 5, productSize = 1, ringSize = 1, title = "" }) {
  const n = laptops.length;
  const N = n * Math.ceil(8 / n); // twelve bodies for six laptops
  const root = useRef(null);
  const stageRef = useRef(null);
  const els = useRef({ body: [] });
  const active = useRef(index);
  const sim = useRef({ cur: index - (reducedMotion() ? 0 : ENTRANCE), vel: 0, target: index, dragging: false });
  const live = useRef({});
  const wakeRef = useRef(null); // set by the frame loop; kept apart because `live` is rebuilt every render
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [playing, setPlaying] = useState(autoplay && !reducedMotion());
  const [sweep, setSweep] = useState(0);
  const [hidden, setHidden] = useState(false);
  const onScreen = useOnScreen(root);

  const narrow = box.w > 0 && box.w < 640;
  live.current = { box, narrow, N, n, onIndexChange, productSize, ringSize };

  // measure the stage
  useEffect(() => {
    const el = stageRef.current;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const on = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);

  /* ---- moving the ring */
  const moveTo = (T) => {
    const s = sim.current;
    s.target = T;
    if (reducedMotion()) {
      s.cur = T;
      s.vel = 0;
    }
    const i = mod(Math.round(T), live.current.n);
    if (i !== active.current) {
      active.current = i;
      setSweep((k) => k + 1);
      live.current.onIndexChange?.(i);
    }
    wakeRef.current?.();
  };
  const next = () => moveTo(Math.round(sim.current.target) + 1);
  const prev = () => moveTo(Math.round(sim.current.target) - 1);
  const go = (i) => {
    const nn = live.current.n;
    let d = mod(i - active.current, nn);
    if (d > nn / 2) d -= nn;
    moveTo(Math.round(sim.current.target) + d);
  };

  // a different laptop picked from outside (search, the colour dots)
  useEffect(() => {
    if (index !== active.current) go(index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  /* ---- the frame loop: runs only while the carousel is on screen */
  useEffect(() => {
    if (!onScreen || hidden) return;
    let raf;
    let last = performance.now();
    const g = new Array(N).fill(0); // phone: each body follows its place in line a little late

    const draw = (cur, dt) => {
      const { box: b, narrow: nar, N: bodies } = live.current;
      const W = b.w || 600;
      const H = b.h || 400;
      const figH = heightFor(W, H, nar, live.current.productSize);
      const rs = clamp(live.current.ringSize, 0.4, 2);
      const figW = figH * RATIO;
      // the same ring as the outfit carousel: radius 0.62 of the width, camera 1.65 away
      const R = 0.62 * W * rs;
      const P = 1.65 * W * rs;
      // the front laptop stands near the bottom; the back of the ring rises toward the horizon
      const floor = H - 14; // the front laptop stands just above the controls, leaving the room above for the back of the ring
      const horizon = 0.14 * H;
      for (let a = 0; a < bodies; a++) {
        const body = els.current.body[a];
        if (!body) continue;
        const d = wrap(a - cur, bodies);
        let x, bottom, scale, op, blur, z;
        if (nar) {
          // phone: one diagonal line, stepping up and out to the right
          const tau = 0.03 + 0.04 * clamp(d, 0, 4);
          if (Math.abs(d - g[a]) > bodies / 2) g[a] = d;
          g[a] += (d - g[a]) * (1 - Math.exp(-dt / tau));
          const k = g[a];
          if (k < 0) {
            const e = Math.min(-k, 1.4);
            x = W * (0.5 - 0.55 * e);
            bottom = 24 - 22 * e;
            scale = 1 + 0.14 * e;
            op = Math.max(0, 1 - 1.05 * e);
            blur = 4 * Math.min(e, 1);
            z = 1100;
          } else {
            x = W * (0.5 + 0.4 * k);
            bottom = 24 + 26 * k;
            scale = Math.pow(0.76, k);
            op = k <= 1.6 ? 1 - 0.13 * k : Math.max(0, 0.61 * (2.6 - k));
            blur = Math.min(0.9 * k, 3.2);
            z = 1000 - Math.round(10 * k);
          }
        } else {
          const phi = clamp(d * STEP, -Math.PI, Math.PI);
          const zz = R * (1 - Math.cos(phi));
          const persp = P / (P + zz);
          const sl = Math.abs(phi) / STEP;
          scale = persp * (1 + (FRONT - 1) * clamp(1 - sl, 0, 1));
          x = W / 2 + R * Math.sin(phi) * persp;
          bottom = H - (horizon + (floor - horizon) * persp);
          blur = sl <= 1 ? 1.8 * sl : Math.min(1.8 + (sl - 1) * 2, 6.5);
          op = clamp((Math.cos(phi) + 0.55) / 0.3, 0, 1);
          z = Math.round(scale * 1000);
        }
        if (x + (figW * scale) / 2 < -4 || x - (figW * scale) / 2 > W + 4) op = 0;
        body.style.transform = `translate3d(${x.toFixed(1)}px, ${(-bottom).toFixed(1)}px, 0) translateX(-50%) scale(${scale.toFixed(4)})`;
        body.style.opacity = op.toFixed(3);
        body.style.zIndex = z;
        body.style.visibility = op < 0.01 ? "hidden" : "visible";
        body.style.pointerEvents = op < 0.5 ? "none" : "auto";
        body.style.filter = blur > 0.05 ? `blur(${blur.toFixed(1)}px)` : "none";
      }
    };

    const frame = (now) => {
      const dt = Math.min(0.034, Math.max(0, (now - last) / 1000));
      last = now;
      const s = sim.current;
      let moving = s.dragging;
      if (!s.dragging) {
        if (reducedMotion()) {
          s.cur = s.target;
          s.vel = 0;
        } else {
          const C = 2 * Math.sqrt(SPRING_K);
          const h = dt / 3;
          for (let k = 0; k < 3; k++) {
            s.vel += (-SPRING_K * (s.cur - s.target) - C * s.vel) * h;
            s.cur += s.vel * h;
          }
          if (Math.abs(s.cur - s.target) < 0.0005 && Math.abs(s.vel) < 0.0005) {
            s.cur = s.target;
            s.vel = 0;
          } else moving = true;
        }
      }
      draw(s.cur, dt);
      // keep drawing while anything moves (and for a beat after a resize); sleep once settled
      if (moving || frame.until > now) raf = requestAnimationFrame(frame);
      else raf = 0;
    };
    frame.until = performance.now() + 400;
    const wake = () => {
      frame.until = performance.now() + 400;
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    wakeRef.current = wake;
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      wakeRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onScreen, hidden, N]);

  // wake the loop on any change of target, size or drag
  useEffect(() => {
    wakeRef.current?.();
  });

  /* ---- drag / swipe, trackpad, keys */
  useEffect(() => {
    const stage = stageRef.current;
    let down = null;
    let acc = 0;
    let lock = 0;
    const unit = () => Math.max(120, 0.3 * (live.current.box.w || 600));
    const onDown = (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      down = { x: e.clientX, y: e.clientY, t: sim.current.target, id: e.pointerId, drag: false, pts: [{ x: e.clientX, time: performance.now() }] };
    };
    const onMove = (e) => {
      if (!down || e.pointerId !== down.id) return;
      const dx = e.clientX - down.x;
      const dy = e.clientY - down.y;
      if (!down.drag) {
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
          down = null;
          return;
        }
        if (Math.abs(dx) > 8 && Math.abs(dx) > 1.2 * Math.abs(dy)) {
          down.drag = true;
          sim.current.dragging = true;
          try {
            stage.setPointerCapture(e.pointerId);
          } catch (err) {
            /* ignore */
          }
          stage.classList.add("is-dragging");
        }
      }
      if (down.drag) {
        down.pts.push({ x: e.clientX, time: performance.now() });
        if (down.pts.length > 6) down.pts.shift();
        sim.current.cur = down.t - dx / unit();
        sim.current.target = sim.current.cur;
        wakeRef.current?.();
      }
    };
    const onUp = (e) => {
      if (!down || e.pointerId !== down.id) return;
      if (down.drag) {
        const dx = e.clientX - down.x;
        const a = down.pts[0];
        const b = down.pts[down.pts.length - 1];
        const vx = (b.x - a.x) / Math.max(1, b.time - a.time);
        sim.current.dragging = false;
        stage.classList.remove("is-dragging");
        stage.dataset.noClick = "1";
        setTimeout(() => delete stage.dataset.noClick, 60);
        const from = Math.round(down.t);
        if (live.current.narrow) {
          moveTo(Math.abs(dx) > 30 || Math.abs(vx) > 0.3 ? from + (dx > 0 ? -1 : 1) : from);
        } else {
          let i = Math.round(sim.current.target - (vx * 160) / unit());
          if (i === from && Math.abs(vx) > 0.3) i = from + (vx > 0 ? -1 : 1);
          moveTo(clamp(i, from - 2, from + 2));
        }
        wakeRef.current?.();
      }
      down = null;
    };
    const onWheel = (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      acc += e.deltaX;
      const now = performance.now();
      if (Math.abs(acc) > 45 && now > lock) {
        if (acc > 0) next();
        else prev();
        acc = 0;
        lock = now + 520;
      }
    };
    const onKey = (e) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      }
    };
    stage.addEventListener("pointerdown", onDown);
    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerup", onUp);
    stage.addEventListener("pointercancel", onUp);
    stage.addEventListener("wheel", onWheel, { passive: false });
    stage.addEventListener("keydown", onKey);
    return () => {
      stage.removeEventListener("pointerdown", onDown);
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerup", onUp);
      stage.removeEventListener("pointercancel", onUp);
      stage.removeEventListener("wheel", onWheel);
      stage.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- markup */
  const figH = heightFor(box.w || 600, box.h || 400, narrow, productSize);
  const bodies = Array.from({ length: N }, (_, a) => a);
  const running = playing && onScreen && !hidden;

  return (
    <div className="ml-runway" ref={root}>
      <div
        className="ml-stage"
        ref={stageRef}
        tabIndex={0}
        role="region"
        aria-roledescription="carousel"
        aria-label="Laptops — use the arrow keys or swipe to change"
      >
        {title && (
          <div className="ml-backdrop" aria-hidden="true">
            {title.split(" ").map((w, i) => (
              <span key={i}>{w}</span>
            ))}
          </div>
        )}
        {bodies.map((a) => {
          const L = laptops[a % n];
          const [bx, by, bw, bh] = L.box;
          const k = figH / bh;
          return (
            <Fragment key={a}>
              <div
                className="ml-body"
                ref={(el) => (els.current.body[a] = el)}
                style={{ width: bw * k, height: figH }}
                data-clone={a >= n ? "" : undefined}
              >
                <span className="ml-shadow" aria-hidden="true" />
                <button
                  type="button"
                  className="ml-hit"
                  aria-label={`${L.brand} ${L.name}`}
                  tabIndex={a < n ? 0 : -1}
                  onClick={() => {
                    if (stageRef.current.dataset.noClick) return;
                    go(a % n);
                  }}
                >
                  <span
                    className="ml-fig"
                    style={{
                      width: bw,
                      height: bh,
                      transform: `scale(${k})`,
                      backgroundImage: `url("${sheet}")`,
                      backgroundSize: `${sheetSize[0]}px ${sheetSize[1]}px`,
                      backgroundPosition: `${-bx}px ${-by}px`,
                    }}
                  />
                </button>
              </div>
            </Fragment>
          );
        })}
        <span key={sweep} className={"ml-sweep" + (sweep ? " is-on" : "")} aria-hidden="true" />
      </div>

      <div className="ml-controls">
        <button className="ml-ctl" onClick={prev} aria-label="Previous laptop">
          <FiChevronLeft />
        </button>
        <div className="ml-ticks" role="tablist" aria-label="Laptops">
          {laptops.map((L, i) => {
            const cur = i === index;
            return (
              <button
                key={i}
                className={"ml-tick" + (cur ? " is-current" : "") + (i < index ? " is-past" : "")}
                role="tab"
                aria-selected={cur}
                aria-label={`${i + 1}: ${L.brand} ${L.name}`}
                onClick={() => go(i)}
              >
                <span className="ml-tick-bar">
                  <span
                    key={cur ? `run-${index}-${playing}` : i}
                    className={cur && playing ? "is-run" : ""}
                    style={cur && playing ? { animationDuration: `${seconds}s`, animationPlayState: running ? "running" : "paused" } : undefined}
                    onAnimationEnd={cur && playing ? next : undefined}
                  />
                </span>
                <span className="ml-tick-label">
                  {String(i + 1).padStart(2, "0")}
                  <span className="ml-tick-name">
                    &nbsp;&nbsp;{L.brand} {L.name}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <button className="ml-ctl" onClick={() => setPlaying((p) => !p)} aria-pressed={playing} aria-label={playing ? "Pause autoplay" : "Play autoplay"}>
          {playing ? <FiPause /> : <FiPlay />}
        </button>
        <button className="ml-ctl" onClick={next} aria-label="Next laptop">
          <FiChevronRight />
        </button>
      </div>
    </div>
  );
}
