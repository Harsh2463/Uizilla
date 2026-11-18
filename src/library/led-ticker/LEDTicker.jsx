import { useEffect, useMemo, useRef } from "react";

/**
 * LEDTicker — a scrolling pixel-LED display.
 *
 * Text is drawn from a built-in 5 × 7 dot-matrix font and scrolls endlessly
 * across a grid of round or square dots. Dots can be lit with a glow, flicker
 * like a worn board, and the gap between phrases can be a pixel icon (dot,
 * star, heart, bolt…). Icons can also be dropped into the text itself with
 * :name: tokens, e.g. "SALE :star: 50% OFF :heart:".
 *
 * Self-contained: React and a 2D canvas only. Fills its parent, so give the
 * parent a height.
 */

const ROWS = 7;
const GLYPH_COLS = 5;

const QUANTITY_MID = 10;
const QUANTITY_MIN_ROWS = 3;
const QUANTITY_MAX_ROWS = 21;

/** Rows of dots for a Dot Quantity of 1–20. Even either side of the midpoint. */
function rowsForQuantity(quantity) {
  const q = Math.min(20, Math.max(1, Math.round(quantity)));
  const rows =
    q <= QUANTITY_MID
      ? QUANTITY_MIN_ROWS + ((q - 1) * (ROWS - QUANTITY_MIN_ROWS)) / (QUANTITY_MID - 1)
      : ROWS + ((q - QUANTITY_MID) * (QUANTITY_MAX_ROWS - ROWS)) / QUANTITY_MID;
  return Math.max(1, Math.round(rows));
}

const WORD_GAP_EXTRA = 3;
const SEPARATOR_PAD_EXTRA = 5;

// 5 columns per character; bit 0 of each byte is the top dot.
const FONT = [
  [0x00, 0x00, 0x00, 0x00, 0x00], // space
  [0x00, 0x00, 0x5f, 0x00, 0x00], // !
  [0x00, 0x07, 0x00, 0x07, 0x00], // "
  [0x14, 0x7f, 0x14, 0x7f, 0x14], // #
  [0x24, 0x2a, 0x7f, 0x2a, 0x12], // $
  [0x23, 0x13, 0x08, 0x64, 0x62], // %
  [0x36, 0x49, 0x55, 0x22, 0x50], // &
  [0x00, 0x05, 0x03, 0x00, 0x00], // '
  [0x00, 0x1c, 0x22, 0x41, 0x00], // (
  [0x00, 0x41, 0x22, 0x1c, 0x00], // )
  [0x14, 0x08, 0x3e, 0x08, 0x14], // *
  [0x08, 0x08, 0x3e, 0x08, 0x08], // +
  [0x00, 0x50, 0x30, 0x00, 0x00], // ,
  [0x08, 0x08, 0x08, 0x08, 0x08], // -
  [0x00, 0x60, 0x60, 0x00, 0x00], // .
  [0x20, 0x10, 0x08, 0x04, 0x02], // /
  [0x3e, 0x51, 0x49, 0x45, 0x3e], // 0
  [0x00, 0x42, 0x7f, 0x40, 0x00], // 1
  [0x42, 0x61, 0x51, 0x49, 0x46], // 2
  [0x21, 0x41, 0x45, 0x4b, 0x31], // 3
  [0x18, 0x14, 0x12, 0x7f, 0x10], // 4
  [0x27, 0x45, 0x45, 0x45, 0x39], // 5
  [0x3c, 0x4a, 0x49, 0x49, 0x30], // 6
  [0x01, 0x71, 0x09, 0x05, 0x03], // 7
  [0x36, 0x49, 0x49, 0x49, 0x36], // 8
  [0x06, 0x49, 0x49, 0x29, 0x1e], // 9
  [0x00, 0x36, 0x36, 0x00, 0x00], // :
  [0x00, 0x56, 0x36, 0x00, 0x00], // ;
  [0x00, 0x08, 0x14, 0x22, 0x41], // <
  [0x14, 0x14, 0x14, 0x14, 0x14], // =
  [0x41, 0x22, 0x14, 0x08, 0x00], // >
  [0x02, 0x01, 0x51, 0x09, 0x06], // ?
  [0x32, 0x49, 0x79, 0x41, 0x3e], // @
  [0x7e, 0x11, 0x11, 0x11, 0x7e], // A
  [0x7f, 0x49, 0x49, 0x49, 0x36], // B
  [0x3e, 0x41, 0x41, 0x41, 0x22], // C
  [0x7f, 0x41, 0x41, 0x22, 0x1c], // D
  [0x7f, 0x49, 0x49, 0x49, 0x41], // E
  [0x7f, 0x09, 0x09, 0x01, 0x01], // F
  [0x3e, 0x41, 0x41, 0x51, 0x32], // G
  [0x7f, 0x08, 0x08, 0x08, 0x7f], // H
  [0x00, 0x41, 0x7f, 0x41, 0x00], // I
  [0x20, 0x40, 0x41, 0x3f, 0x01], // J
  [0x7f, 0x08, 0x14, 0x22, 0x41], // K
  [0x7f, 0x40, 0x40, 0x40, 0x40], // L
  [0x7f, 0x02, 0x04, 0x02, 0x7f], // M
  [0x7f, 0x04, 0x08, 0x10, 0x7f], // N
  [0x3e, 0x41, 0x41, 0x41, 0x3e], // O
  [0x7f, 0x09, 0x09, 0x09, 0x06], // P
  [0x3e, 0x41, 0x51, 0x21, 0x5e], // Q
  [0x7f, 0x09, 0x19, 0x29, 0x46], // R
  [0x46, 0x49, 0x49, 0x49, 0x31], // S
  [0x01, 0x01, 0x7f, 0x01, 0x01], // T
  [0x3f, 0x40, 0x40, 0x40, 0x3f], // U
  [0x1f, 0x20, 0x40, 0x20, 0x1f], // V
  [0x7f, 0x20, 0x18, 0x20, 0x7f], // W
  [0x63, 0x14, 0x08, 0x14, 0x63], // X
  [0x03, 0x04, 0x78, 0x04, 0x03], // Y
  [0x61, 0x51, 0x49, 0x45, 0x43], // Z
  [0x00, 0x00, 0x7f, 0x41, 0x41], // [
  [0x02, 0x04, 0x08, 0x10, 0x20], // \
  [0x41, 0x41, 0x7f, 0x00, 0x00], // ]
  [0x04, 0x02, 0x01, 0x02, 0x04], // ^
  [0x40, 0x40, 0x40, 0x40, 0x40], // _
];

/** Draws a 5 × 7 icon from seven rows of "0"/"1", left to right, top to bottom. */
function iconFromRows(rows) {
  const cols = [];
  for (let c = 0; c < GLYPH_COLS; c++) {
    let bits = 0;
    for (let r = 0; r < ROWS; r++) if (rows[r][c] === "1") bits |= 1 << r;
    cols.push(bits);
  }
  return cols;
}

/** Pixel icons, usable as the separator or inside the text as :name:. */
const ICONS = {
  dot: iconFromRows(["00000", "00000", "01110", "01110", "01110", "00000", "00000"]),
  star: iconFromRows(["00100", "00100", "11111", "01110", "01110", "11011", "00000"]),
  heart: iconFromRows(["00000", "01010", "11111", "11111", "01110", "00100", "00000"]),
  bolt: iconFromRows(["00110", "01100", "11000", "11110", "00110", "01100", "01000"]),
  diamond: iconFromRows(["00000", "00100", "01110", "11111", "01110", "00100", "00000"]),
  arrow: iconFromRows(["00000", "00100", "00010", "11111", "00010", "00100", "00000"]),
  smile: iconFromRows(["00000", "01010", "01010", "00000", "10001", "01110", "00000"]),
  check: iconFromRows(["00000", "00001", "00010", "10100", "01000", "00000", "00000"]),
  plus: iconFromRows(["00000", "00100", "00100", "11111", "00100", "00100", "00000"]),
};

const EXTRA = {
  "●": ICONS.dot,
  "•": [0x00, 0x1c, 0x1c, 0x1c, 0x00],
  "·": [0x00, 0x00, 0x18, 0x00, 0x00],
  "°": [0x00, 0x03, 0x03, 0x00, 0x00],
  "★": ICONS.star,
  "♥": ICONS.heart,
  "→": [0x08, 0x08, 0x2a, 0x1c, 0x08],
  "←": [0x08, 0x1c, 0x2a, 0x08, 0x08],
};
const FOLD = {
  "–": "-",
  "—": "-",
  "‘": "'",
  "’": "'",
  "“": '"',
  "”": '"',
};

function glyphFor(char) {
  const extra = EXTRA[char];
  if (extra) return extra;
  const folded = FOLD[char] ?? char;
  const code = folded.toUpperCase().charCodeAt(0);
  return FONT[code - 32] ?? FONT[0];
}

/**
 * Value noise in 0..1, biased low so the board sits bright and dips hard now
 * and then rather than pulsing evenly. Deterministic.
 */
function flickerNoise(t) {
  const i = Math.floor(t);
  const f = t - i;
  const hash = (n) => {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  const smooth = f * f * (3 - 2 * f);
  const value = hash(i) * (1 - smooth) + hash(i + 1) * smooth;
  return value * value;
}

/**
 * Flatten the items and separators into one endless strip of dot columns
 * (bit-packed rows). Word gaps and the pad around a separator are counted in
 * dot columns rather than spelled with blank glyphs, so they stay tight as the
 * spread grows. At spread 1 a word gap is 4 columns and a separator sits in 6
 * on each side.
 */
function buildColumns(items, separator, separatorIcon, spread) {
  const parts = (items ?? []).map((item) => String(item).trim()).filter(Boolean);
  const columns = [];
  const blanks = (count) => {
    for (let i = 0; i < count; i++) columns.push(0);
  };
  const pushGlyph = (glyph) => {
    for (let i = 0; i < GLYPH_COLS; i++) columns.push(glyph[i]);
  };

  // Text is split into characters and :icon: tokens.
  const tokenize = (text) => {
    const out = [];
    const re = /:([a-z]+):/gi;
    let last = 0;
    let m;
    while ((m = re.exec(text))) {
      const name = m[1].toLowerCase();
      if (!ICONS[name]) continue;
      for (const ch of [...text.slice(last, m.index)]) out.push({ ch });
      out.push({ icon: name });
      last = m.index + m[0].length;
    }
    for (const ch of [...text.slice(last)]) out.push({ ch });
    return out;
  };

  const writeText = (text) => {
    const toks = tokenize(text);
    toks.forEach((tok, index) => {
      if (tok.icon) {
        pushGlyph(ICONS[tok.icon]);
      } else if (tok.ch === " ") {
        blanks(spread + WORD_GAP_EXTRA);
        return;
      } else {
        pushGlyph(glyphFor(tok.ch));
      }
      const next = toks[index + 1];
      if (next !== undefined && next.ch !== " ") blanks(spread);
    });
  };

  const joiner = separatorIcon === "none" ? null : separatorIcon !== "text" && ICONS[separatorIcon] ? { icon: separatorIcon } : { text: (separator ?? "").trim() };

  if (parts.length === 0) {
    blanks(GLYPH_COLS + spread);
    return columns;
  }
  for (const part of parts) {
    writeText(part);
    blanks(spread + SEPARATOR_PAD_EXTRA);
    if (joiner && joiner.icon) {
      pushGlyph(ICONS[joiner.icon]);
      blanks(spread + SEPARATOR_PAD_EXTRA);
    } else if (joiner && joiner.text) {
      writeText(joiner.text);
      blanks(spread + SEPARATOR_PAD_EXTRA);
    }
  }
  return columns;
}

/** "#rgb" / "#rrggbb" + alpha 0–100 → "rgba()". Other colour strings are used as they are. */
function withOpacity(color, percent) {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(color).trim());
  if (!m) return color;
  let h = m[1];
  if (h.length === 3) h = h.replace(/./g, (c) => c + c);
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(100, percent)) / 100})`;
}

const DEFAULT_ITEMS = ["pixels", "interactions"];

export default function LEDTicker({
  items = DEFAULT_ITEMS,
  separator = ">",
  separatorIcon = "text",
  speed = 20,
  direction = "right",
  textSize = 33,
  dotSize = 4,
  dotQuantity = 10,
  spread = 1,
  dotShape = "round",
  onColor = "#00FF39",
  offColor = "#00FF39",
  offOpacity = 0,
  background = "#050505",
  glow = true,
  glowStrength = 100,
  glowSize = 30,
  glowMatch = true,
  glowColor = "#00FF39",
  flicker = false,
  flickerStrength = 100,
  flickerSpeed = 54,
  style = {},
}) {
  const canvasRef = useRef(null);

  const glowS = glow ? Math.max(0, glowStrength) / 100 : 0;
  const glowZ = glow ? Math.max(0, glowSize) / 10 : 0;
  const flickS = flicker ? Math.max(0, flickerStrength) / 100 : 0;
  const flickV = flicker ? Math.max(0, flickerSpeed) / 10 : 0;
  const glowCol = glowMatch ? onColor : glowColor;
  const offFill = withOpacity(offColor, offOpacity);

  const itemsKey = JSON.stringify(Array.isArray(items) ? items : []);
  const columns = useMemo(
    () => buildColumns(JSON.parse(itemsKey), separator, separatorIcon, Math.max(0, Math.round(spread))),
    [itemsKey, separator, separatorIcon, spread]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const total = columns.length;
    let alive = true;
    let raf = 0;
    let last = 0;
    let offset = 0;

    let dpr = 1;
    let cell = 1;
    let radius = 1;
    let visibleCols = 0;
    let boardRows = ROWS;
    let yPad = 0;
    let scale = 1;
    let rowSource = [];

    function measure() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth || 600;
      const h = canvas.clientHeight || 600;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      boardRows = rowsForQuantity(dotQuantity);
      scale = boardRows / ROWS;
      cell = Math.max(1, (textSize / boardRows) * dpr);
      radius = (dotSize * dpr) / 2;
      visibleCols = Math.ceil(canvas.width / cell) + 1;
      yPad = (canvas.height - boardRows * cell) / 2;
      rowSource = [];
      for (let row = 0; row < boardRows; row++) rowSource.push(Math.min(ROWS - 1, Math.floor(row / scale)));
    }

    function dotPath(x, y) {
      if (dotShape === "square") {
        const s = radius * 2;
        ctx.rect(x - radius, y - radius, s, s);
      } else {
        ctx.moveTo(x + radius, y);
        ctx.arc(x, y, radius, 0, Math.PI * 2);
      }
    }

    function draw(time) {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const boardOffset = offset * scale;
      const whole = Math.floor(boardOffset);
      const shift = (boardOffset - whole) * cell;
      const sign = direction === "right" ? -1 : 1;
      const xBase = -sign * shift;

      // unlit dots
      if (offOpacity > 0) {
        ctx.beginPath();
        for (let cx = 0; cx < visibleCols; cx++) {
          const px = xBase + cx * cell + cell / 2;
          for (let row = 0; row < boardRows; row++) dotPath(px, yPad + row * cell + cell / 2);
        }
        ctx.fillStyle = offFill;
        ctx.fill();
      }

      // lit dots
      ctx.beginPath();
      for (let cx = 0; cx < visibleCols; cx++) {
        const source = Math.floor((cx + sign * whole) / scale);
        const index = ((source % total) + total) % total;
        const bits = columns[index];
        if (!bits) continue;
        const px = xBase + cx * cell + cell / 2;
        for (let row = 0; row < boardRows; row++) {
          if (!((bits >> rowSource[row]) & 1)) continue;
          dotPath(px, yPad + row * cell + cell / 2);
        }
      }

      const wobble = flickS > 0 ? 1 - flickS * flickerNoise((time / 1000) * flickV) : 1;
      ctx.globalAlpha = wobble;
      ctx.fillStyle = onColor;

      if (glowS > 0) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.shadowColor = glowCol;
        ctx.shadowBlur = radius * 2 * glowZ;
        ctx.globalAlpha = wobble * glowS;
        ctx.fillStyle = glowCol;
        ctx.fill();
        ctx.restore();
        ctx.globalAlpha = wobble;
        ctx.fillStyle = onColor;
      }
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    function frame(time) {
      if (!alive) return;
      const dt = last ? Math.min((time - last) / 1000, 0.05) : 0;
      last = time;
      offset = (offset + speed * dt) % total;
      draw(time);
      raf = requestAnimationFrame(frame);
    }

    measure();
    draw(0);

    let ro = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        measure();
        draw(last);
      });
      ro.observe(canvas);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
    };
  }, [columns, speed, direction, textSize, dotSize, dotQuantity, dotShape, onColor, offFill, offOpacity, glowS, glowZ, glowCol, flickS, flickV]);

  return (
    <div style={{ ...style, width: "100%", height: "100%", background, overflow: "hidden" }}>
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
    </div>
  );
}
