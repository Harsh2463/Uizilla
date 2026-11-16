import { useEffect, useState } from "react";

const rowBase =
  "grid items-center gap-2.5 px-4 py-1.5 min-h-[52px] grid-cols-[104px_1fr]";

function Label({ label, unit }) {
  return (
    <span className="text-[14px] leading-tight text-[var(--text)]">
      {label}
      {unit && <span className="ml-1 text-[var(--muted)]">({unit})</span>}
    </span>
  );
}

function NumberBox({ value, min, max, onChange }) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);

  const commit = (t) => {
    const n = parseFloat(t);
    if (Number.isNaN(n)) return setText(String(value));
    const c = Math.min(max, Math.max(min, n));
    onChange(c);
    setText(String(c));
  };

  return (
    <input
      inputMode="decimal"
      aria-label="value"
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const n = parseFloat(e.target.value);
        if (!Number.isNaN(n) && n >= min && n <= max) onChange(n);
      }}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      className="h-10 w-full rounded-lg bg-[#262626] px-2 text-center text-[14px] font-medium text-white outline-none focus:ring-2 focus:ring-white/60"
    />
  );
}

export function SliderRow({ ctl, value, onChange }) {
  const { label, unit, min, max, step } = ctl;
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  return (
    <div className={rowBase}>
      <Label label={label} unit={unit} />
      <div className="grid grid-cols-[1fr_60px] items-center gap-2.5">
        <input
          type="range"
          className="ok-range"
          aria-label={label}
          min={min}
          max={max}
          step={step}
          value={value}
          style={{ "--p": `calc(${pct}% + ${(6 - 0.12 * pct).toFixed(2)}px)` }}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <NumberBox value={value} min={min} max={max} onChange={onChange} />
      </div>
    </div>
  );
}

export function SelectRow({ ctl, value, onChange }) {
  return (
    <div className={rowBase}>
      <Label label={ctl.label} />
      <div className="relative">
        <select
          value={value}
          aria-label={ctl.label}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full appearance-none rounded-lg border border-[#333] bg-[#1d1d1d] px-3 text-[14px] text-white outline-none focus:ring-2 focus:ring-white/60"
        >
          {ctl.options.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    </div>
  );
}

export function ToggleRow({ ctl, value, onChange }) {
  const btn = (on, text) => (
    <button
      type="button"
      onClick={() => onChange(on)}
      aria-pressed={value === on}
      className={`h-9 flex-1 rounded-lg text-[14px] font-medium transition-colors ${
        value === on ? "bg-[#4a4a4a] text-white" : "text-[var(--muted)]"
      }`}
    >
      {text}
    </button>
  );
  return (
    <div className={rowBase}>
      <Label label={ctl.label} />
      <div className="flex rounded-xl bg-black p-1">
        {btn(true, "On")}
        {btn(false, "Off")}
      </div>
    </div>
  );
}

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function ColorRow({ ctl, value, onChange }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const full = value.length === 4
    ? `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`
    : value;
  return (
    <div className={rowBase}>
      <Label label={ctl.label} />
      <div className="flex h-11 items-center gap-2 rounded-lg bg-[#222] px-2">
        <label className="relative h-7 w-7 shrink-0 cursor-pointer overflow-hidden rounded-md border border-[#444]">
          <span className="absolute inset-0" style={{ background: value }} />
          <input
            type="color"
            aria-label="Pick colour"
            value={full}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>
        <input
          value={text}
          aria-label="Hex colour"
          spellCheck={false}
          onChange={(e) => {
            setText(e.target.value);
            if (HEX.test(e.target.value)) onChange(e.target.value);
          }}
          onBlur={() => setText(value)}
          className="w-full bg-transparent text-[14px] text-white outline-none"
        />
      </div>
    </div>
  );
}

export function ContentRow({ ctl, value, onOpen }) {
  return (
    <div className={rowBase}>
      <Label label={ctl.label} />
      <button
        type="button"
        onClick={onOpen}
        className="flex h-11 items-center gap-3 rounded-lg bg-[#222] px-2 text-left transition-colors hover:bg-[#2a2a2a]"
      >
        <span className="grid h-7 w-7 place-items-center rounded-md bg-[#1a73e8]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round">
            <path d="M4 8h10M18 8h2M4 16h2M10 16h10" />
            <circle cx="16" cy="8" r="2" />
            <circle cx="8" cy="16" r="2" />
          </svg>
        </span>
        <span className="text-[14px] text-[var(--muted)]">
          {value.length} {ctl.noun || "Items"}
        </span>
      </button>
    </div>
  );
}

/** Probes one URL and says whether it loads at all, and whether its host allows
 * it to be drawn into a canvas (which the WebGL components need). */
function useImageStatus(src, cors = true) {
  const [status, setStatus] = useState("idle");
  useEffect(() => {
    const url = (src || "").trim();
    if (!url) {
      setStatus("empty");
      return;
    }
    let alive = true;
    setStatus("loading");
    const plain = new Image();
    plain.onload = () => {
      if (!alive) return;
      if (!cors) return setStatus("ok");
      const probe = new Image();
      probe.crossOrigin = "anonymous";
      probe.onload = () => alive && setStatus("ok");
      probe.onerror = () => alive && setStatus("nocors");
      probe.src = url;
    };
    plain.onerror = () => alive && setStatus("bad");
    plain.src = url;
    return () => {
      alive = false;
    };
  }, [src, cors]);
  return status;
}

function ImageStatus({ src, cors = true }) {
  const status = useImageStatus(src, cors);
  if (status === "idle" || status === "empty" || status === "ok") return null;
  const text =
    status === "loading"
      ? "Checking…"
      : status === "bad"
        ? "This URL didn't load — check it points straight at an image file. A built-in image is shown instead."
        : "Its host blocks other sites from reading it, so the picture is routed through the Image Proxy automatically. If it still doesn't appear, host it yourself or set your own proxy.";
  return (
    <p
      className={`mt-1 text-[11px] leading-snug ${
        status === "loading" ? "text-[var(--muted)]" : "text-amber-400"
      }`}
    >
      {text}
    </p>
  );
}

const specsToText = (specs) =>
  (Array.isArray(specs) ? specs : [])
    .map((p) =>
      Array.isArray(p) ? `${p[0]}: ${p[1] ?? ""}` : `${p?.label ?? ""}: ${p?.value ?? ""}`
    )
    .join("\n");
const textToSpecs = (text) =>
  text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const i = l.indexOf(":");
      return i < 0 ? [l, ""] : [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    });

export function ImagesPanel({ ctl, value, onChange, onBack, note }) {
  const MIN = 3;
  const MAX = 24;
  const [openRow, setOpenRow] = useState(-1);
  // Keep every other field of the entry (title, price, ...) when one changes.
  const patch = (i, obj) =>
    onChange(value.map((it, idx) => (idx === i ? { ...it, ...obj } : it)));
  const fields = ctl.fields || [];
  const inputCls =
    "w-full rounded-md bg-[#262626] px-2 text-[13px] text-white outline-none placeholder:text-[#666] focus:ring-2 focus:ring-white/60";

  return (
    <div className="pb-6">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-[var(--line)] bg-[#161616] px-3 py-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md px-2 py-1 text-[14px] text-[var(--muted)] hover:text-white"
        >
          Back
        </button>
        <span className="text-[14px] font-medium">Content · {value.length} items</span>
      </div>

      {note ? (
        <p className="mx-4 mt-4 rounded-lg bg-amber-400/10 px-3 py-2 text-[12px] leading-snug text-amber-400">
          {note}
        </p>
      ) : null}

      <ul className="space-y-2 px-4 pt-4">
        {value.map((it, i) => (
          <li key={i} className="rounded-lg bg-[#1d1d1d] p-2">
            <div className="flex items-center gap-2">
              <span
                className="h-10 w-10 shrink-0 rounded-md bg-[#2a2a2a] bg-cover bg-center"
                style={it.src ? { backgroundImage: `url("${it.src}")` } : undefined}
              />
              <input
                key={`${i}-${it.src}`}
                defaultValue={it.src}
                placeholder="Image URL (empty uses a built-in image)"
                aria-label={`Image ${i + 1} URL`}
                spellCheck={false}
                onBlur={(e) => e.target.value !== it.src && patch(i, { src: e.target.value.trim() })}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                className={`h-10 min-w-0 flex-1 ${inputCls}`}
              />
              {fields.length > 0 && (
                <button
                  type="button"
                  onClick={() => setOpenRow(openRow === i ? -1 : i)}
                  aria-expanded={openRow === i}
                  className="h-10 shrink-0 rounded-md px-2 text-[12px] text-[var(--muted)] hover:bg-[#2a2a2a] hover:text-white"
                >
                  {openRow === i ? "Hide" : "Details"}
                </button>
              )}
              <button
                type="button"
                disabled={value.length <= MIN}
                onClick={() => {
                  setOpenRow(-1);
                  onChange(value.filter((_, idx) => idx !== i));
                }}
                aria-label={`Remove image ${i + 1}`}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-[var(--muted)] hover:bg-[#2a2a2a] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
              >
                ✕
              </button>
            </div>

            <ImageStatus src={it.src} cors={ctl.cors !== false} />

            {openRow === i && fields.length > 0 && (
              <div className="mt-2 space-y-2 border-t border-[#2a2a2a] pt-2">
                {fields.map((f) => {
                  const current = it[f.key];
                  const text = f.type === "specs" ? specsToText(current) : (current ?? "");
                  const commit = (raw) => {
                    const next = f.type === "specs" ? textToSpecs(raw) : raw.trim();
                    if (JSON.stringify(next) !== JSON.stringify(current ?? (f.type === "specs" ? [] : "")))
                      patch(i, { [f.key]: next });
                  };
                  return (
                    <label key={f.key} className="block">
                      <span className="mb-1 block text-[12px] text-[var(--muted)]">{f.label}</span>
                      {f.multiline || f.type === "specs" ? (
                        <textarea
                          key={`${i}-${f.key}-${text}`}
                          defaultValue={text}
                          rows={f.type === "specs" ? 4 : 3}
                          spellCheck={false}
                          onBlur={(e) => commit(e.target.value)}
                          className={`${inputCls} py-2`}
                        />
                      ) : (
                        <input
                          key={`${i}-${f.key}-${text}`}
                          defaultValue={text}
                          spellCheck={false}
                          onBlur={(e) => commit(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                          className={`h-9 ${inputCls}`}
                        />
                      )}
                    </label>
                  );
                })}
              </div>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-4 flex gap-2 px-4">
        <button
          type="button"
          disabled={value.length >= MAX}
          onClick={() => onChange([...value, { src: "" }])}
          className="h-10 flex-1 rounded-lg bg-[#262626] text-[14px] hover:bg-[#2f2f2f] disabled:opacity-40"
        >
          Add image
        </button>
        <button
          type="button"
          onClick={() => {
            setOpenRow(-1);
            onChange(ctl.default);
          }}
          className="h-10 rounded-lg border border-[#333] px-4 text-[14px] text-[var(--muted)] hover:text-white"
        >
          Restore defaults
        </button>
      </div>
      <p className="mt-3 px-4 text-xs leading-relaxed text-[var(--muted)]">
        Minimum {MIN} images. Broken or empty URLs fall back to a built-in image.
      </p>
    </div>
  );
}

export function TextRow({ ctl, value, onChange }) {
  return (
    <div className={rowBase}>
      <Label label={ctl.label} />
      <input
        value={value}
        aria-label={ctl.label}
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-lg bg-[#222] px-3 text-[14px] text-white outline-none focus:ring-2 focus:ring-white/60"
      />
    </div>
  );
}

const HEX_OK = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const toSix = (v) =>
  v.length === 4 ? `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}` : v;

function ColorItem({ value, onChange, onRemove, canRemove, index }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <li className="flex items-center gap-2 rounded-lg bg-[#1d1d1d] p-2">
      <label className="relative h-10 w-10 shrink-0 cursor-pointer overflow-hidden rounded-md border border-[#444]">
        <span className="absolute inset-0" style={{ background: value }} />
        <input
          type="color"
          aria-label={`Colour ${index + 1}`}
          value={toSix(value)}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
      <input
        value={text}
        aria-label={`Colour ${index + 1} hex`}
        spellCheck={false}
        onChange={(e) => {
          setText(e.target.value);
          if (HEX_OK.test(e.target.value)) onChange(e.target.value);
        }}
        onBlur={() => setText(value)}
        className="h-10 min-w-0 flex-1 rounded-md bg-[#262626] px-2 text-[13px] text-white outline-none focus:ring-2 focus:ring-white/60"
      />
      <button
        type="button"
        disabled={!canRemove}
        onClick={onRemove}
        aria-label={`Remove colour ${index + 1}`}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-[var(--muted)] hover:bg-[#2a2a2a] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
      >
        ✕
      </button>
    </li>
  );
}

export function ColorsPanel({ ctl, value, onChange, onBack }) {
  const MIN = 1;
  const MAX = 12;
  return (
    <div className="pb-6">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-[var(--line)] bg-[#161616] px-3 py-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md px-2 py-1 text-[14px] text-[var(--muted)] hover:text-white"
        >
          Back
        </button>
        <span className="text-[14px] font-medium">
          {ctl.label} · {value.length} colours
        </span>
      </div>
      <ul className="space-y-2 px-4 pt-4">
        {value.map((c, i) => (
          <ColorItem
            key={i}
            index={i}
            value={c}
            canRemove={value.length > MIN}
            onChange={(v) => onChange(value.map((x, idx) => (idx === i ? v : x)))}
            onRemove={() => onChange(value.filter((_, idx) => idx !== i))}
          />
        ))}
      </ul>
      <div className="mt-4 flex gap-2 px-4">
        <button
          type="button"
          disabled={value.length >= MAX}
          onClick={() => onChange([...value, "#888888"])}
          className="h-10 flex-1 rounded-lg bg-[#262626] text-[14px] hover:bg-[#2f2f2f] disabled:opacity-40"
        >
          Add colour
        </button>
        <button
          type="button"
          onClick={() => onChange(ctl.default)}
          className="h-10 rounded-lg border border-[#333] px-4 text-[14px] text-[var(--muted)] hover:text-white"
        >
          Restore defaults
        </button>
      </div>
    </div>
  );
}

/** A list of short strings (words, labels), one input each. */
export function WordsPanel({ ctl, value, onChange, onBack }) {
  const MIN = 1;
  const MAX = 24;
  return (
    <div className="pb-6">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-[var(--line)] bg-[#161616] px-3 py-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md px-2 py-1 text-[14px] text-[var(--muted)] hover:text-white"
        >
          Back
        </button>
        <span className="text-[14px] font-medium">
          {ctl.label} · {value.length} {ctl.noun || "words"}
        </span>
      </div>
      <ul className="space-y-2 px-4 pt-4">
        {value.map((w, i) => (
          <li key={i} className="flex items-center gap-2 rounded-lg bg-[#1d1d1d] p-2">
            <input
              value={w}
              aria-label={`${ctl.label} ${i + 1}`}
              spellCheck={false}
              onChange={(e) => onChange(value.map((x, idx) => (idx === i ? e.target.value : x)))}
              className="h-10 min-w-0 flex-1 rounded-md bg-[#262626] px-3 text-[14px] text-white outline-none focus:ring-2 focus:ring-white/60"
            />
            <button
              type="button"
              disabled={value.length <= MIN}
              onClick={() => onChange(value.filter((_, idx) => idx !== i))}
              aria-label={`Remove ${i + 1}`}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-[var(--muted)] hover:bg-[#2a2a2a] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex gap-2 px-4">
        <button
          type="button"
          disabled={value.length >= MAX}
          onClick={() => onChange([...value, "New"])}
          className="h-10 flex-1 rounded-lg bg-[#262626] text-[14px] hover:bg-[#2f2f2f] disabled:opacity-40"
        >
          Add word
        </button>
        <button
          type="button"
          onClick={() => onChange(ctl.default)}
          className="h-10 rounded-lg border border-[#333] px-4 text-[14px] text-[var(--muted)] hover:text-white"
        >
          Restore defaults
        </button>
      </div>
    </div>
  );
}
