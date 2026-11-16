import { useEffect, useRef } from "react";

/**
 * SpiralImages — pictures flowing along a spiral, in a continuous whirl. Cards
 * ride an even-spaced spiral from the outer edge to the centre (or back out),
 * turn to follow it, shrink with distance and fade at the ends of the path.
 *
 * Self-contained: copy this single file into any React (16.8+) project and
 * render <SpiralImages />. No other packages, CSS or files needed (one 2D
 * canvas, no WebGL, no workers). It fills 100% of its parent and sizes the
 * spiral to it, so give the parent a height, e.g.
 *   <div style={{ height: 700 }}><SpiralImages /></div>
 * A picture that is still loading, or fails to load, is drawn as a soft colour
 * card, so the whirl never has gaps. Any image URL works: the canvas only
 * draws the pictures, it never reads them back, so no CORS headers are needed.
 *
 * The cards sit at equal steps ALONG the curve (not equal steps of the angle,
 * which would bunch them up in the middle), and the whole line slides along it.
 */

/* -------------------------------------------------------------- constants */

const UNSPLASH = (id) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&q=80`;

// Default pictures.
const DEFAULT_IMAGES = [
  "1713456047285-52a8d18d1912",
  "1629747387925-6905ff5a558a",
  "1568044853110-277196781802",
  "1787656235601-d0c3b837ed33",
  "1613698808499-f772ccb4f527",
  "1626858707111-2fefbc9a848e",
  "1542305983-c4100e4b8cd2",
  "1720569103781-daf2ecb89e1b",
  "1611938766054-6b4f25b06f2e",
  "1643059514529-f6689eeba463",
].map((id) => ({ src: UNSPLASH(id) }));

const TWO_PI = Math.PI * 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const urlOf = (it) =>
  typeof it === "string" ? it.trim() : it && typeof it.src === "string" ? it.src.trim() : "";

/* -------------------------------------------------------------- component */

export default function SpiralImages({
  images = DEFAULT_IMAGES,
  background = "#000000",
  direction = "in",
  spin = "anticlockwise",
  speed = 2,
  turns = 3.5,
  spacing = 5,
  spread = 6,
  imageSize = 200,
  sizeAttenuation = 2,
  fadeIn = 20,
  fadeOut = 0,
  cornerRadius = 5,
  imageFit = "contain",
  followPath = true,
  tilt = 0,
  borderWidth = 0,
  borderColor = "#FFFFFF",
  hoverSlow = 0,
  style,
}) {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const imgs = useRef([]);
  const hovering = useRef(false);

  // The draw loop reads the latest props from here, so edits show at once and
  // the loop never restarts.
  const cfg = useRef({});
  cfg.current = {
    direction, spin, speed, turns, spacing, spread, imageSize, sizeAttenuation,
    fadeIn, fadeOut, cornerRadius, imageFit, followPath, tilt, borderWidth,
    borderColor, hoverSlow,
  };

  // Load the pictures whenever the list changes.
  const list = (Array.isArray(images) ? images : []).map(urlOf).filter(Boolean);
  const srcs = list.length ? list : DEFAULT_IMAGES.map(urlOf);
  const srcKey = srcs.join("|");
  useEffect(() => {
    imgs.current = srcs.map((src) => {
      const el = new Image();
      el.decoding = "async";
      el.referrerPolicy = "no-referrer";
      el.src = src;
      return el;
    });
  }, [srcKey]);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let w = 0;
    let h = 0;
    const resize = () => {
      w = root.clientWidth || 600;
      h = root.clientHeight || 600;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(root);

    // Archimedean spiral (linear radius): every turn is equally spaced.
    // n runs 0..1 from the outer edge to the centre.
    let flip = -1;
    const spiral = (n, R, t) => {
      const a = n * t * TWO_PI;
      const r = R * (1 - n);
      return [r * Math.cos(a), flip * r * Math.sin(a)];
    };

    // Arc-length table so equal steps along the curve are equal on screen.
    // Rebuilt only when the number of turns changes.
    const M = 2000;
    const K = 1024;
    const nForArc = new Float32Array(K + 1);
    let tableTurns = -1;
    let tableFlip = 0;
    const build = (t) => {
      const cum = new Float32Array(M + 1);
      let prev = spiral(0, 1, t);
      for (let k = 1; k <= M; k++) {
        const pt = spiral(k / M, 1, t);
        cum[k] = cum[k - 1] + Math.hypot(pt[0] - prev[0], pt[1] - prev[1]);
        prev = pt;
      }
      const total = cum[M] || 1;
      let j = 0;
      for (let a = 0; a <= K; a++) {
        const target = (a / K) * total;
        while (j < M && cum[j + 1] < target) j++;
        const seg = cum[j + 1] - cum[j];
        nForArc[a] = (j + (seg > 0 ? (target - cum[j]) / seg : 0)) / M;
      }
      tableTurns = t;
    };
    const arcToN = (s) => {
      const x = clamp(s * K, 0, K);
      const i = Math.floor(x);
      const a = nForArc[i];
      const b = nForArc[Math.min(i + 1, K)];
      return a + (b - a) * (x - i);
    };

    const rrect = (x, y, rw, rh, r) => {
      const rr = Math.min(r, rw / 2, rh / 2);
      ctx.beginPath();
      ctx.moveTo(x + rr, y);
      ctx.arcTo(x + rw, y, x + rw, y + rh, rr);
      ctx.arcTo(x + rw, y + rh, x, y + rh, rr);
      ctx.arcTo(x, y + rh, x, y, rr);
      ctx.arcTo(x, y, x + rw, y, rr);
      ctx.closePath();
    };

    let progress = 0; // 0..100 along the path
    let last = 0;
    let raf = 0;

    const draw = (now) => {
      raf = requestAnimationFrame(draw);
      const c = cfg.current;
      const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
      last = now;

      const turnsNow = clamp(c.turns, 0.5, 12);
      flip = c.spin === "clockwise" ? 1 : -1;
      if (tableTurns !== turnsNow || tableFlip !== flip) {
        build(turnsNow);
        tableFlip = flip;
      }

      const slow = hovering.current ? 1 - clamp(c.hoverSlow, 0, 100) / 100 : 1;
      const sign = c.direction === "out" ? -1 : 1;
      progress = (((progress + sign * c.speed * dt * slow) % 100) + 100) % 100;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;
      // Spread widens the turns evenly; the outer arms run off the frame.
      const R = 0.48 * Math.min(w, h) * (1 + (c.spread - 1) * 0.18);
      const els = imgs.current;
      const nImgs = els.length || 1;

      // One card every `step` of the path's length, round the whole curve.
      const step = Math.max(0.005, (c.spacing * 0.5) / 100);
      const slots = Math.min(400, Math.ceil(1 / step) + 2);
      const base = progress / 100;
      const cards = [];
      for (let i = 0; i < slots; i++) {
        const s = (((base + i * step) % 1) + 1) % 1;
        cards.push({ tt: s * 100, n: arcToN(s), img: i % nImgs });
      }
      cards.sort((a, b) => a.n - b.n); // outer first, so the centre draws on top

      for (const { tt, n, img } of cards) {
        const [px, py] = spiral(n, R, turnsNow);
        const dist = Math.hypot(px, py);

        // Fades sit at the end where cards are born: the outer edge going in,
        // the centre going out.
        const born = c.direction === "out" ? 100 - tt : tt;
        let o = 1;
        if (c.fadeIn > 0 && born < c.fadeIn) o = born / c.fadeIn;
        else if (c.fadeOut > 0 && born > 100 - c.fadeOut) o = (100 - born) / c.fadeOut;
        if (o < 0.01) continue;

        const scale = c.sizeAttenuation > 0 ? Math.pow(Math.min(dist / R, 1), c.sizeAttenuation * 0.5) : 1;
        const [qx, qy] = spiral(Math.min(n + 0.001, 1), R, turnsNow);
        const rot = (c.followPath ? Math.atan2(qy - py, qx - px) : 0) + (c.tilt * Math.PI) / 180;

        const el = els[img];
        const ready = el && el.complete && el.naturalWidth > 0;
        const aspect = ready ? el.naturalWidth / el.naturalHeight : 1;
        const box = c.imageSize * scale;
        let cw = box;
        let ch = box;
        if (c.imageFit !== "cover") {
          if (aspect >= 1) ch = box / aspect;
          else cw = box * aspect;
        }
        const rad = (c.cornerRadius / 20) * (Math.min(cw, ch) / 2);

        ctx.save();
        ctx.translate(cx + px, cy + py);
        ctx.rotate(rot);
        ctx.globalAlpha = o;
        rrect(-cw / 2, -ch / 2, cw, ch, rad);
        ctx.clip();
        if (ready) {
          if (c.imageFit === "cover") {
            // Fill the square, trimming the picture's longer side.
            const side = Math.min(el.naturalWidth, el.naturalHeight);
            ctx.drawImage(el, (el.naturalWidth - side) / 2, (el.naturalHeight - side) / 2, side, side, -cw / 2, -ch / 2, cw, ch);
          } else {
            ctx.drawImage(el, -cw / 2, -ch / 2, cw, ch);
          }
        } else {
          ctx.fillStyle = `hsl(${(img * 360) / nImgs}, 65%, 55%)`;
          ctx.fillRect(-cw / 2, -ch / 2, cw, ch);
        }
        ctx.restore();

        if (c.borderWidth > 0) {
          ctx.save();
          ctx.translate(cx + px, cy + py);
          ctx.rotate(rot);
          ctx.globalAlpha = o;
          rrect(-cw / 2, -ch / 2, cw, ch, rad);
          ctx.lineWidth = c.borderWidth;
          ctx.strokeStyle = c.borderColor;
          ctx.stroke();
          ctx.restore();
        }
      }
    };

    raf = requestAnimationFrame(draw);
    const enter = () => (hovering.current = true);
    const leave = () => (hovering.current = false);
    root.addEventListener("pointerenter", enter);
    root.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      root.removeEventListener("pointerenter", enter);
      root.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: 160,
        overflow: "hidden",
        background,
        ...style,
      }}
    >
      <canvas ref={canvasRef} style={{ display: "block" }} />
    </div>
  );
}
