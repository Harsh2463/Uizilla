import { useEffect, useMemo, useRef, useState } from "react";

/**
 * ClothingRail — a shop rail of garments hanging from a bar. The rail moves
 * sideways in a flat plane (no perspective, no 3D): each garment hangs from its
 * own hook and sways like real cloth as the rail starts, stops and is thrown.
 *
 * Hovering a garment makes room for it: its neighbours part, the hanger turns
 * to face you and the side view cross-fades into the full front view. Clicking
 * lifts the front view into the middle of the frame with a product panel beside
 * it — title, price, description, sizes, specifications and a Buy button.
 *
 * Self-contained: copy this single file into any React (16.8+) project and
 * render <ClothingRail />. No other packages, CSS or files needed, and the
 * pictures are plain <img> elements, so any image address works (no CORS, no
 * WebGL). It fills 100% of its parent, so give the parent a height, e.g.
 *   <div style={{ height: 620 }}><ClothingRail images={products} /></div>
 *
 * Each entry of `images` is a product:
 *   { src, front?, title?, price?, description?, sizes?, specs?, buyUrl?, buyLabel? }
 * where `src` is the SIDE view shown on the rail, `front` is the full front
 * view shown on hover and when open, `sizes` is a list of size labels, and
 * `specs` is a list of [label, value] pairs. `onBuy(product, index, size)` is
 * called when Buy is pressed (and `buyUrl`, if set, opens in a new tab).
 *
 * Scroll with the wheel, drag, or swipe. Esc or the ✕ closes an open product.
 */

/* ---------------------------------------------------------------- constants */

/** Px of rail travel per px of wheel / drag at Scroll Sens. 5. */
const WHEEL_GAIN = 1.1;
const DRAG_GAIN = 1.9;
/** A single wheel event never moves more than this many px. */
const WHEEL_CLAMP = 260;
/** How many garments can be on the rail at once, however wide the frame is. */
const MAX_SLOTS = 40;
/** How far past each edge garments are kept, as a share of the frame width. */
const OVERSCAN = 0.75;
/** Sway: how far a garment swings per unit of rail speed, and how it settles. */
const SWAY_PER_SPEED = 0.055;
const SWAY_MAX_DEG = 16;
const SWAY_SPRING = 0.14;
const SWAY_DAMP = 0.86;
/** The idle breath of a hanging garment, in degrees and cycles per second. */
const IDLE_SWAY_DEG = 0.9;
const IDLE_SWAY_HZ = 0.21;
/** Seconds a garment takes to open into the middle of the frame, and to close. */
const OPEN_SECONDS = 0.52;
/** A pointer that travels further than this (px) was a drag, not a tap. */
const TAP_SLOP = 6;
/** Product panel: margin from the frame edge. */
const PANEL_MARGIN = 16;

const SIDE =
  "https://ik.imagekit.io/Harsh2463/jackets/Black%20Hoodie%20on%20Wooden%20Hanger.png";
const FRONT =
  "https://ik.imagekit.io/Harsh2463/jackets/Believe%20in%20Yourself%20Hoodie.png";

/** Sample products, so the rail is a working shop out of the box. Replace the
 * pictures and text with your own. */
export const DEFAULT_PRODUCTS = [
  {
    src: SIDE, front: FRONT,
    title: "Believe in Yourself Hoodie", price: "$79",
    description: "A heavyweight cotton-blend hoodie with a brushed inner face and a roomy kangaroo pocket.",
    sizes: ["S", "M", "L", "XL"],
    specs: [["Material", "80% cotton, 20% polyester"], ["Weight", "380 gsm"], ["Fit", "Relaxed"], ["Care", "Machine wash cold"]],
    buyUrl: "",
  },
  {
    src: SIDE, front: FRONT,
    title: "Midnight Zip Hoodie", price: "$89",
    description: "Full-zip hoodie in a deep black wash, cut a little longer in the body.",
    sizes: ["S", "M", "L", "XL", "XXL"],
    specs: [["Material", "Organic cotton"], ["Weight", "340 gsm"], ["Fit", "Regular"], ["Zip", "YKK"]],
  },
  {
    src: SIDE, front: FRONT,
    title: "Everyday Pullover", price: "$64",
    description: "A soft everyday pullover that keeps its shape through the week.",
    sizes: ["XS", "S", "M", "L"],
    specs: [["Material", "Cotton fleece"], ["Weight", "300 gsm"], ["Fit", "Classic"], ["Pocket", "Kangaroo"]],
  },
  {
    src: SIDE, front: FRONT,
    title: "Winter Sherpa Hoodie", price: "$109",
    description: "Sherpa-lined for cold mornings, with ribbed cuffs that seal the warmth in.",
    sizes: ["M", "L", "XL"],
    specs: [["Lining", "Sherpa fleece"], ["Weight", "480 gsm"], ["Fit", "Oversized"], ["Hood", "Double layer"]],
  },
  {
    src: SIDE, front: FRONT,
    title: "Studio Crew Hoodie", price: "$72",
    description: "A clean, logo-free hoodie made for layering under a jacket.",
    sizes: ["S", "M", "L"],
    specs: [["Material", "Combed cotton"], ["Weight", "320 gsm"], ["Fit", "Slim"], ["Seams", "Flatlock"]],
  },
  {
    src: SIDE, front: FRONT,
    title: "Trail Tech Hoodie", price: "$124",
    description: "A light, quick-drying hoodie with a wind-resistant face for the trail.",
    sizes: ["S", "M", "L", "XL"],
    specs: [["Material", "Recycled polyester"], ["Weight", "260 gsm"], ["Finish", "DWR"], ["Pockets", "Two zip"]],
  },
  {
    src: SIDE, front: FRONT,
    title: "Heritage Hoodie", price: "$95",
    description: "Loop-back cotton with a vintage wash that softens every time you wear it.",
    sizes: ["S", "M", "L", "XL"],
    specs: [["Material", "Loop-back cotton"], ["Weight", "400 gsm"], ["Fit", "Boxy"], ["Wash", "Garment dyed"]],
  },
  {
    src: SIDE, front: FRONT,
    title: "Weekend Hoodie", price: "$68",
    description: "The one that lives on the back of the chair, ready for a walk.",
    sizes: ["M", "L", "XL"],
    specs: [["Material", "Cotton blend"], ["Weight", "330 gsm"], ["Fit", "Regular"], ["Cuffs", "Ribbed"]],
  },
];

/* ------------------------------------------------------------------ helpers */

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mod = (n, m) => ((n % m) + m) % m;
/** Smooth 0→1 either side of the hovered garment. */
const smoothstep = (x) => {
  const t = clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
};
/** A lerp that behaves the same at 60 and 120 frames a second. */
const approach = (current, goal, perFrame, dt) =>
  current + (goal - current) * (1 - Math.pow(1 - perFrame, dt * 60));

/** A link from your own data: only web and mail links are allowed through. */
function safeUrl(url) {
  if (typeof url !== "string") return "";
  const u = url.trim();
  if (!u) return "";
  if (/^(https?:|mailto:|tel:|\/|#|\.)/i.test(u)) return u;
  return /^[a-z][a-z0-9+.-]*:/i.test(u) ? "" : u;
}

function normSpecs(specs) {
  if (!Array.isArray(specs)) return [];
  return specs
    .map((s) =>
      Array.isArray(s)
        ? [String(s[0] ?? ""), String(s[1] ?? "")]
        : s && typeof s === "object"
          ? [String(s.label ?? ""), String(s.value ?? "")]
          : ["", ""]
    )
    .filter((s) => s[0] || s[1]);
}

function normSizes(sizes) {
  if (Array.isArray(sizes)) return sizes.map((s) => String(s)).filter(Boolean);
  if (typeof sizes === "string") return sizes.split(/[,\s]+/).filter(Boolean);
  return [];
}

/** One entry of `images`, in any of its accepted shapes. */
function itemOf(entry, i) {
  const base = entry && typeof entry === "object" ? entry : {};
  const raw = typeof entry === "string" ? entry : (base.src ?? base.image ?? base.side ?? "");
  const side = (typeof raw === "string" ? raw : (raw?.src ?? "")) || SIDE;
  const front = String(base.front ?? base.frontSrc ?? "") || side;
  return {
    side,
    front,
    title: String(base.title ?? ""),
    price: String(base.price ?? ""),
    description: String(base.description ?? ""),
    sizes: normSizes(base.sizes),
    specs: normSpecs(base.specs),
    buyUrl: safeUrl(base.buyUrl),
    buyLabel: typeof base.buyLabel === "string" ? base.buyLabel : "",
    key: i,
  };
}

/** Where the product panel sits: beside the garment on wide frames, under it
 * on narrow ones. */
function panelGeometry(w, h, enabled) {
  if (!enabled || !w || !h) return { mode: "none", size: 0 };
  if (w >= 760 && w / h >= 1.1) {
    return { mode: "right", size: Math.min(400, Math.max(300, w * 0.34)) };
  }
  return { mode: "bottom", size: Math.round(h * 0.46) };
}

/** The hook each garment hangs from: a wire hanger drawn in SVG, so it needs
 * no asset and takes the rail's own colour. */
function Hanger({ width, color }) {
  return (
    <svg
      width={width}
      height={width * 0.42}
      viewBox="0 0 100 42"
      fill="none"
      aria-hidden="true"
      style={{ display: "block", overflow: "visible" }}
    >
      <path
        d="M50 3c-4.2 0-7.2 3-7.2 6.6 0 3 2 5.2 4.8 6.1l1.6.5v3.2"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M49.2 19.6 7 35.2c-2.6 1-1.9 4.8.9 4.8h83.8c2.8 0 3.5-3.8.9-4.8L50.8 19.6a2.2 2.2 0 0 0-1.6 0Z"
        stroke={color}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ----------------------------------------------------------------- component */

export default function ClothingRail({
  images = DEFAULT_PRODUCTS,
  background = "#0E0E10",
  railColor = "#C9CBD1",
  showRail = true,
  garmentHeight = 340,
  sideWidth = 120,
  frontWidth = 260,
  gap = 26,
  railDrop = 92,
  speed = 2,
  scrollSens = 5,
  smoothing = 5,
  sway = 5,
  hoverEffect = true,
  hoverLabel = true,
  tap = true,
  showDetails = true,
  zoom = 5,
  buyLabel = "Buy now",
  panelBackground = "#FFFFFF",
  panelColor = "#111111",
  accent = "#111111",
  onBuy,
  onOpen,
  onClose,
  scrollLock = false,
  style,
}) {
  const hostRef = useRef(null);
  const trackRef = useRef(null);
  const slotRefs = useRef([]);
  const closeRef = useRef(null);
  const tipRef = useRef(null);

  const items = useMemo(
    () => (Array.isArray(images) && images.length ? images : DEFAULT_PRODUCTS).map(itemOf),
    [images]
  );

  const [box, setBox] = useState({ w: 0, h: 0 });
  const [hoverIdx, setHoverIdx] = useState(-1);
  const [open, setOpen] = useState({ slot: -1, product: -1, shown: false });
  const [size, setSize] = useState("");

  // Everything the frame loop reads, refreshed every render so a slider change
  // lands on the next frame without the loop being rebuilt.
  const live = useRef(null);
  live.current = {
    items,
    garmentHeight,
    sideWidth: Math.max(40, sideWidth),
    frontWidth: Math.max(Math.max(40, sideWidth), frontWidth),
    gap: Math.max(0, gap),
    railDrop,
    speed,
    scrollSens: clamp(scrollSens, 0, 10),
    smoothing: clamp(smoothing, 0, 10),
    sway: clamp(sway, 0, 10) / 5,
    hoverEffect,
    tap,
    zoom: clamp(zoom, 0, 10),
    showDetails,
    scrollLock,
    onBuy,
    onOpen,
    onClose,
  };

  // How many garments the rail needs for this frame: enough to cover it, plus
  // the overscan either side, and never more than the cap.
  const pitch = Math.max(40, Math.max(40, sideWidth) + Math.max(0, gap));
  const slotCount = Math.min(
    MAX_SLOTS,
    Math.max(items.length, Math.ceil((box.w * (1 + OVERSCAN * 2)) / pitch) + 2)
  );
  const slots = useMemo(
    () => Array.from({ length: slotCount }, (_, i) => i),
    [slotCount]
  );

  /* ------------------------------------------------------------- the loop -- */

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    let last = performance.now();

    // Where the rail has been pushed, and the eased value it rides.
    const rail = { target: 0, current: 0, speed: 0 };
    const pointer = { x: 0, y: 0, over: false };
    const drag = { active: false, id: -1, lastX: 0, x0: 0, moved: false, hit: -1 };
    // One swing per garment slot: angle, angular velocity, and a phase so they
    // do not all breathe together.
    const swing = [];
    // How far each slot has opened up for the pointer, 0 to 1.
    const hover = [];
    let hoverSlot = -1;
    let openSlot = -1;
    let openAmt = 0;
    let openTarget = 0;
    const geom = { w: 0, h: 0 };

    const measure = () => {
      geom.w = Math.max(1, host.clientWidth);
      geom.h = Math.max(1, host.clientHeight);
      setBox({ w: geom.w, h: geom.h });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);

    /* ---- input ---- */
    const push = (px) => {
      rail.target += px;
    };

    const onWheel = (e) => {
      if (openSlot >= 0) return; // the rail holds still under an open product
      if (live.current.scrollLock && e.cancelable) e.preventDefault();
      let d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (e.deltaMode === 1) d *= 16;
      else if (e.deltaMode === 2) d *= geom.w;
      push(clamp(d, -WHEEL_CLAMP, WHEEL_CLAMP) * WHEEL_GAIN * (0.4 + live.current.scrollSens * 0.16));
    };

    const onPointerDown = (e) => {
      if (e.button !== 0) return;
      drag.x0 = e.clientX;
      drag.moved = false;
      drag.id = e.pointerId;
      // The garment under the pointer when it went down. Taken here because a
      // press stops the hover (the rail is about to be dragged), so by the time
      // the press is let go there is nothing left to read.
      drag.hit = hoverSlot;
      host.setPointerCapture?.(e.pointerId);
      if (openSlot >= 0) return;
      drag.active = true;
      drag.lastX = e.clientX;
    };
    const onPointerMove = (e) => {
      if (e.pointerType !== "touch") {
        const r = host.getBoundingClientRect();
        pointer.x = e.clientX - r.left;
        pointer.y = e.clientY - r.top;
        pointer.over = true;
      }
      if (!drag.active || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.lastX;
      drag.lastX = e.clientX;
      if (Math.abs(e.clientX - drag.x0) > TAP_SLOP) drag.moved = true;
      push(-dx * DRAG_GAIN * (0.4 + live.current.scrollSens * 0.16));
    };
    const onPointerUp = (e) => {
      if (e.pointerId !== drag.id) return;
      host.releasePointerCapture?.(e.pointerId);
      const wasDrag = drag.moved;
      drag.active = false;
      drag.id = -1;
      const hit = drag.hit;
      drag.hit = -1;
      if (wasDrag || !live.current.tap) return;
      // A tap: open whatever was under the pointer, or close what is open.
      if (openSlot >= 0) closeOpen();
      else if (hit >= 0) openAt(hit);
    };
    const onPointerLeave = () => {
      pointer.over = false;
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") closeOpen();
    };

    const openAt = (slot) => {
      openSlot = slot;
      openTarget = 1;
      const L = live.current;
      const product = mod(slot, Math.max(1, L.items.length));
      setOpen({ slot, product, shown: true });
      setSize(L.items[product]?.sizes?.[0] || "");
      L.onOpen?.(L.items[product], product);
    };
    const closeOpen = () => {
      if (openSlot < 0 || openTarget === 0) return;
      openTarget = 0;
      setOpen((o) => ({ ...o, shown: false }));
      live.current.onClose?.();
    };
    closeRef.current = closeOpen;

    host.addEventListener("wheel", onWheel, { passive: false });
    host.addEventListener("pointerdown", onPointerDown);
    host.addEventListener("pointermove", onPointerMove);
    host.addEventListener("pointerup", onPointerUp);
    host.addEventListener("pointercancel", onPointerUp);
    host.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("keydown", onKeyDown);

    /* ---- one frame ---- */
    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      let dt = (now - last) / 1000;
      last = now;
      if (!isFinite(dt) || dt < 0) dt = 0;
      if (dt > 0.05) dt = 0.05; // a background tab must not deposit a lurch

      const L = live.current;
      const n = Math.max(1, L.items.length);
      const count = slotRefs.current.length;
      if (!count || !geom.w) return;

      const sideW = L.sideWidth;
      const frontW = L.frontWidth;
      const step = sideW + L.gap;
      const total = count * step;
      const still = reduced.matches;

      // The rail: a drift, plus whatever the wheel and the drag pushed, eased.
      if (openSlot < 0 && !drag.active && !still) rail.target += L.speed * 26 * dt;
      const ease = 0.3 - L.smoothing * 0.027;
      const before = rail.current;
      rail.current = approach(rail.current, rail.target, ease, dt);
      rail.speed = (rail.current - before) / Math.max(dt, 1e-3);

      // Which garment is under the pointer. Found from the positions this frame,
      // so it is right even while the rail drifts under a still pointer.
      const centreY = L.railDrop + L.garmentHeight * 0.5;
      const inBand =
        pointer.over &&
        !drag.active &&
        openSlot < 0 &&
        L.hoverEffect &&
        L.tap &&
        Math.abs(pointer.y - centreY) < L.garmentHeight * 0.62;
      let bestSlot = -1;
      let bestDist = Infinity;

      // Two passes: the first finds the hovered garment, the second lays the
      // rail out around it, since its neighbours have to part for it.
      const xs = new Array(count);
      for (let i = 0; i < count; i++) {
        // Wrapped into one window centred on the frame, so the rail runs
        // forever in both directions with nothing to remember between frames.
        const raw = i * step - rail.current;
        const x = mod(raw + total / 2, total) - total / 2 + geom.w / 2 - sideW / 2;
        xs[i] = x;
        if (inBand) {
          const d = Math.abs(pointer.x - (x + sideW / 2));
          if (d < bestDist && d < sideW * 0.75 + L.gap * 0.45) {
            bestDist = d;
            bestSlot = i;
          }
        }
      }
      if (bestSlot !== hoverSlot) {
        hoverSlot = bestSlot;
        setHoverIdx(bestSlot);
      }

      // The opening garment walks to the middle of the free region, grows, and
      // the rest of the rail steps back.
      openAmt = approach(openAmt, openTarget, 1 - Math.pow(0.02, 1 / (OPEN_SECONDS * 60)), dt);
      if (openAmt < 0.002 && openTarget === 0 && openSlot >= 0) {
        openSlot = -1;
        openAmt = 0;
        setOpen({ slot: -1, product: -1, shown: false });
      }
      const panel = panelGeometry(geom.w, geom.h, L.showDetails && L.tap);
      const freeW = panel.mode === "right" ? geom.w - panel.size - PANEL_MARGIN * 1.5 : geom.w;
      const freeH = panel.mode === "bottom" ? geom.h - panel.size - PANEL_MARGIN : geom.h;
      const fill = 0.56 + L.zoom * 0.038;
      const openScale = Math.max(
        0.3,
        Math.min((freeH * fill) / L.garmentHeight, (freeW * fill) / frontW)
      );

      const hoverExtra = frontW - sideW;

      for (let i = 0; i < count; i++) {
        const el = slotRefs.current[i];
        if (!el) continue;
        const s = swing[i] || (swing[i] = { a: 0, v: 0, phase: (i * 2.399) % 6.283 });
        const isHover = i === hoverSlot;
        const isOpen = i === openSlot;

        // Hover: the garment itself opens out, and its neighbours part by half
        // the extra width each, so the room it needs is made rather than taken.
        // An open garment stays opened out: it is the front view being read.
        const goal = isOpen || (isHover && openSlot < 0) ? 1 : 0;
        hover[i] = approach(hover[i] || 0, goal, 0.22, dt);
        const h = hover[i];

        let x = xs[i];
        if (hoverSlot >= 0 && !isHover) {
          // How far this garment is from the hovered one, in slots, wrapped.
          const away = xs[i] - xs[hoverSlot];
          const near = smoothstep(1 - Math.abs(away) / (step * 4.2));
          x += Math.sign(away || 1) * (hoverExtra / 2) * (hover[hoverSlot] || 0) * near;
        }
        x -= (h * hoverExtra) / 2; // the garment grows about its own centre

        // Sway: a pendulum driven by how hard the rail is moving, plus a slow
        // idle breath. Each garment lags its neighbour a little.
        const drive = still ? 0 : clamp(-rail.speed * SWAY_PER_SPEED, -SWAY_MAX_DEG, SWAY_MAX_DEG);
        s.v += (drive - s.a) * SWAY_SPRING;
        s.v *= SWAY_DAMP;
        s.a += s.v;
        const idle = still ? 0 : Math.sin(now * 0.001 * IDLE_SWAY_HZ * 6.283 + s.phase) * IDLE_SWAY_DEG;
        const angle = (s.a + idle) * L.sway * (1 - openAmt * (isOpen ? 1 : 0));

        const w = sideW + h * hoverExtra;
        let y = 0;
        let scale = 1;
        let opacity = 1;
        if (isOpen) {
          // Into the middle of the free region, and up to its open size.
          scale = 1 + (openScale - 1) * openAmt;
          // The garment grows from its hook, so its drawn height is h * scale
          // and its middle sits that much lower: centre on the drawn box, not
          // on the box it had before it grew.
          const drawnH = L.garmentHeight * scale;
          const cx = (panel.mode === "right" ? freeW / 2 : geom.w / 2) - w / 2;
          const cy = (panel.mode === "bottom" ? freeH / 2 : geom.h / 2) - (L.railDrop + drawnH / 2);
          x += (cx - x) * openAmt;
          y = cy * openAmt;
        } else if (openSlot >= 0) {
          opacity = 1 - 0.86 * openAmt; // the rest of the rail steps back
        }

        el.style.width = `${w}px`;
        el.style.opacity = opacity.toFixed(3);
        el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
        el.style.zIndex = isOpen ? "6" : isHover ? "4" : "1";
        const swingEl = el.firstChild;
        if (swingEl) swingEl.style.transform = `rotate(${angle.toFixed(3)}deg) scale(${scale.toFixed(4)})`;
        const faces = el.querySelectorAll("[data-face]");
        faces.forEach((f) => {
          const front = f.getAttribute("data-face") === "front";
          const shown = Math.max(h, isOpen ? openAmt : 0);
          f.style.opacity = String(front ? shown : 1 - shown);
        });
      }

      // The hover label follows the pointer.
      const tip = tipRef.current;
      if (tip && hoverSlot >= 0) {
        const w = tip.offsetWidth;
        const hgt = tip.offsetHeight;
        let tx = pointer.x + 16;
        let ty = pointer.y + 18;
        if (tx + w > geom.w - 8) tx = pointer.x - w - 16;
        if (ty + hgt > geom.h - 8) ty = pointer.y - hgt - 14;
        tip.style.transform = `translate(${Math.max(8, tx)}px, ${Math.max(8, ty)}px)`;
      }

      host.style.cursor = drag.active
        ? "grabbing"
        : openSlot >= 0
          ? "zoom-out"
          : hoverSlot >= 0
            ? "pointer"
            : "grab";
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      host.removeEventListener("wheel", onWheel);
      host.removeEventListener("pointerdown", onPointerDown);
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerup", onPointerUp);
      host.removeEventListener("pointercancel", onPointerUp);
      host.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("keydown", onKeyDown);
      closeRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotCount]);

  /* ----------------------------------------------------------- the panel -- */

  const geo = panelGeometry(box.w, box.h, showDetails && tap);
  const product = open.product >= 0 && items.length ? items[open.product % items.length] : null;
  const hoverItem =
    hoverIdx >= 0 && items.length ? items[mod(hoverIdx, items.length)] : null;
  const label = product?.buyLabel || buyLabel;

  const press = () => {
    if (!product) return;
    live.current.onBuy?.(product, open.product % Math.max(1, items.length), size);
  };

  const panelStyle = {
    position: "absolute",
    boxSizing: "border-box",
    background: panelBackground,
    color: panelColor,
    borderRadius: 18,
    padding: "22px 22px 0",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    zIndex: 8,
    boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    opacity: open.shown ? 1 : 0,
    pointerEvents: open.shown ? "auto" : "none",
    transform: open.shown ? "none" : geo.mode === "right" ? "translateX(28px)" : "translateY(28px)",
    transition: `opacity 280ms ease ${open.shown ? "200ms" : "0ms"}, transform 280ms ease ${
      open.shown ? "200ms" : "0ms"
    }`,
    ...(geo.mode === "right"
      ? { top: PANEL_MARGIN, bottom: PANEL_MARGIN, right: PANEL_MARGIN, width: geo.size }
      : { left: 12, right: 12, bottom: 12, height: geo.size }),
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background,
        ...style,
      }}
    >
      <div
        ref={hostRef}
        role="region"
        aria-label="A rail of garments. Drag or scroll to move it, hover one to see its front, click to open it."
        style={{
          position: "absolute",
          inset: 0,
          cursor: "grab",
          // the rail is walked sideways, so vertical page scrolling still works
          touchAction: "pan-y",
          userSelect: "none",
          WebkitUserSelect: "none",
        }}
      >
        {/* the bar the garments hang from */}
        {showRail && (
          <>
            <div
              style={{
                position: "absolute",
                left: -20,
                right: -20,
                top: railDrop,
                height: 10,
                borderRadius: 999,
                background: `linear-gradient(180deg, ${railColor} 0%, rgba(0,0,0,0.35) 58%, ${railColor} 100%)`,
                opacity: 0.9,
                boxShadow: "0 10px 22px rgba(0,0,0,0.45)",
                pointerEvents: "none",
                zIndex: 5,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: -20,
                right: -20,
                top: railDrop + 10,
                height: 18,
                background: "linear-gradient(180deg, rgba(0,0,0,0.38), rgba(0,0,0,0))",
                pointerEvents: "none",
                zIndex: 2,
              }}
            />
          </>
        )}

        {/* the garments */}
        <div ref={trackRef} style={{ position: "absolute", inset: 0 }}>
          {slots.map((i) => {
            const it = items[mod(i, items.length)] || items[0];
            return (
              <div
                key={i}
                ref={(el) => {
                  slotRefs.current[i] = el;
                }}
                style={{
                  position: "absolute",
                  left: 0,
                  top: railDrop - 6,
                  width: sideWidth,
                  height: garmentHeight,
                  willChange: "transform, width, opacity",
                }}
              >
                {/* swings from the hook at the top */}
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    transformOrigin: "50% 6px",
                    willChange: "transform",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <Hanger width={Math.min(74, sideWidth * 0.62)} color={railColor} />
                  </div>
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      height: `calc(100% - ${Math.min(74, sideWidth * 0.62) * 0.42}px)`,
                      marginTop: -6,
                    }}
                  >
                    {/* side view, cross-fading into the front view */}
                    <img
                      data-face="side"
                      src={it.side}
                      alt=""
                      draggable={false}
                      style={faceStyle}
                    />
                    <img
                      data-face="front"
                      src={it.front}
                      alt=""
                      draggable={false}
                      style={{ ...faceStyle, opacity: 0 }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* the hover label */}
      {hoverLabel && hoverEffect && tap && hoverItem && open.product < 0 && (
        <div
          ref={tipRef}
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            pointerEvents: "none",
            zIndex: 7,
            padding: "8px 12px",
            borderRadius: 10,
            background: panelBackground,
            color: panelColor,
            boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
            fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
            fontSize: 13,
            lineHeight: 1.3,
            whiteSpace: "nowrap",
          }}
        >
          <div style={{ fontWeight: 600 }}>
            {hoverItem.title || `Item ${mod(hoverIdx, items.length) + 1}`}
            {hoverItem.price ? (
              <span style={{ fontWeight: 500, opacity: 0.6 }}> · {hoverItem.price}</span>
            ) : null}
          </div>
          <div style={{ fontSize: 11, opacity: 0.55, marginTop: 2 }}>Click to view</div>
        </div>
      )}

      {/* the product panel */}
      {geo.mode !== "none" && product && (
        <div role="dialog" aria-label={product.title || "Product"} style={panelStyle}>
          <button
            type="button"
            onClick={() => closeRef.current?.()}
            aria-label="Close"
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              width: 34,
              height: 34,
              borderRadius: 999,
              border: "none",
              background: "rgba(127,127,127,0.16)",
              color: "inherit",
              fontSize: 16,
              lineHeight: 1,
              cursor: "pointer",
            }}
          >
            ✕
          </button>

          <div style={{ paddingRight: 40 }}>
            <div style={{ fontSize: 22, fontWeight: 650, lineHeight: 1.2 }}>
              {product.title || "Product"}
            </div>
            {product.price ? (
              <div style={{ marginTop: 6, fontSize: 20, fontWeight: 600 }}>{product.price}</div>
            ) : null}
          </div>

          {product.description ? (
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, opacity: 0.75 }}>
              {product.description}
            </p>
          ) : null}

          {product.sizes.length ? (
            <div>
              <div style={sectionLabel}>Size</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSize(s)}
                    aria-pressed={size === s}
                    style={{
                      minWidth: 46,
                      padding: "9px 12px",
                      borderRadius: 10,
                      border: `1px solid ${size === s ? accent : "rgba(127,127,127,0.4)"}`,
                      background: size === s ? accent : "transparent",
                      color: size === s ? "#fff" : "inherit",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {product.specs.length ? (
            <div>
              <div style={sectionLabel}>Details</div>
              <dl style={{ margin: 0 }}>
                {product.specs.map(([k, v], i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 16,
                      padding: "8px 0",
                      borderTop: "1px solid rgba(127,127,127,0.25)",
                      fontSize: 14,
                    }}
                  >
                    <dt style={{ opacity: 0.65 }}>{k}</dt>
                    <dd style={{ margin: 0, fontWeight: 500, textAlign: "right" }}>{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}

          {/* pinned to the bottom, so Buy is always reachable */}
          <div
            style={{
              marginTop: "auto",
              position: "sticky",
              bottom: 0,
              background: panelBackground,
              padding: "10px 0 22px",
            }}
          >
            {product.buyUrl ? (
              <a
                href={product.buyUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={press}
                style={buyStyle(accent)}
              >
                {label}
                {size ? ` · ${size}` : ""}
              </a>
            ) : (
              <button type="button" onClick={press} style={buyStyle(accent)}>
                {label}
                {size ? ` · ${size}` : ""}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const faceStyle = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "contain",
  objectPosition: "50% 0%",
  pointerEvents: "none",
  userSelect: "none",
  filter: "drop-shadow(0 18px 26px rgba(0,0,0,0.45))",
};

const sectionLabel = {
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  opacity: 0.55,
  marginBottom: 8,
};

function buyStyle(accent) {
  return {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    padding: "14px 18px",
    border: "none",
    borderRadius: 12,
    background: accent,
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: 600,
    textAlign: "center",
    textDecoration: "none",
    cursor: "pointer",
  };
}
