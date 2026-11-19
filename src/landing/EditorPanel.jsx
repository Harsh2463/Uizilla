import { useState } from "react";
import { getIn, setIn } from "./editors.js";

const input = "w-full rounded-md border border-[var(--line)] bg-black px-2 py-1.5 text-[13px] text-white outline-none focus:border-white/50";

function Field({ f, value, onChange }) {
  const id = f.label;
  let control;
  switch (f.type) {
    case "lines":
      control = <textarea rows={Math.max(2, (value || []).length)} className={input + " resize-y"} value={(value || []).join("\n")} onChange={(e) => onChange(e.target.value.split("\n"))} />;
      break;
    case "list":
      control = <input className={input} value={(value || []).join(", ")} onChange={(e) => onChange(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} />;
      break;
    case "number":
      control = <input type="number" step={f.step || 1} className={input} value={value ?? 0} onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))} />;
      break;
    case "range":
      control = (
        <div className="flex items-center gap-2">
          <input type="range" min={f.min} max={f.max} step={f.step} value={value ?? 0} onChange={(e) => onChange(Number(e.target.value))} className="ed-range flex-1" />
          <span className="w-10 text-right font-mono text-xs text-[var(--muted)]">{Number(value ?? 0).toFixed(f.step < 1 ? 2 : 0)}</span>
        </div>
      );
      break;
    case "px":
      control = (
        <div className="flex items-center gap-2">
          <input type="range" min="0" max="60" step="1" value={parseFloat(value) || 0} onChange={(e) => onChange(`${e.target.value}px`)} className="ed-range flex-1" />
          <span className="w-10 text-right font-mono text-xs text-[var(--muted)]">{parseFloat(value) || 0}px</span>
        </div>
      );
      break;
    case "color": {
      const hex = /^#[0-9a-f]{6}$/i.test(value || "") ? value : "#000000";
      control = (
        <div className="flex items-center gap-2">
          <input type="color" value={hex} onChange={(e) => onChange(e.target.value)} className="h-8 w-10 cursor-pointer rounded border border-[var(--line)] bg-black p-0.5" />
          <input className={input + " font-mono"} value={value || ""} onChange={(e) => onChange(e.target.value)} />
        </div>
      );
      break;
    }
    case "toggle":
      control = (
        <button type="button" role="switch" aria-checked={!!value} onClick={() => onChange(!value)} className={"h-6 w-11 rounded-full border border-[var(--line)] p-0.5 transition-colors " + (value ? "bg-white" : "bg-black")}>
          <span className={"block h-4.5 w-4.5 rounded-full transition-transform " + (value ? "translate-x-5 bg-black" : "bg-white/60")} style={{ width: 18, height: 18 }} />
        </button>
      );
      break;
    default:
      control = <input className={input} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
  }
  return (
    <label className="grid gap-1.5" htmlFor={undefined} data-field={id}>
      <span className="text-[12px] text-[var(--muted)]">{f.label}</span>
      {control}
    </label>
  );
}

function Group({ g, content, setContent, vars, setVar }) {
  const [open, setOpen] = useState(!!g.open);
  const [idx, setIdx] = useState(0);
  const items = g.each ? getIn(content, g.each.path) || [] : null;
  const prefix = g.each ? `${g.each.path}.${idx}.` : "";
  return (
    <section className="border-b border-[var(--line)]">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium hover:bg-white/[0.03]">
        {g.title}
        <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .3s" }} aria-hidden="true">
          <path d="M3.5 6l4.5 4.5L12.5 6" />
        </svg>
      </button>
      {open && (
        <div className="grid gap-3 px-4 pb-4">
          {g.each && (
            <select value={idx} onChange={(e) => setIdx(Number(e.target.value))} className={input} aria-label={`Choose which ${g.title.toLowerCase()} to edit`}>
              {items.map((it, i) => (
                <option key={i} value={i}>
                  {i + 1}. {g.each.label(it)}
                </option>
              ))}
            </select>
          )}
          {g.fields.map((f) =>
            f.css ? (
              <Field key={f.css} f={f} value={vars[f.css]} onChange={(v) => setVar(f.css, v)} />
            ) : (
              <Field key={prefix + f.path} f={f} value={getIn(content, prefix + f.path)} onChange={(v) => setContent((c) => setIn(c, prefix + f.path, v))} />
            )
          )}
        </div>
      )}
    </section>
  );
}

/** The editing sidebar: every change updates the live preview and ends up in the downloaded ZIP. */
export default function EditorPanel({ schema, content, setContent, vars, setVar, onReset, changed, onCollapse }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
        <div className="group relative">
          <button
            type="button"
            onClick={onCollapse}
            aria-label="Collapse the editor"
            className="grid place-items-center text-[var(--muted)] transition-colors hover:text-white"
          >
            <svg viewBox="0 0 16 16" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="2" y="2.5" width="12" height="11" rx="2" />
              <path d="M6 2.5v11M10.5 6.5L9 8l1.5 1.5" />
            </svg>
          </button>
          <span className="pointer-events-none absolute left-0 top-full z-10 mt-2 whitespace-nowrap rounded-md bg-white px-2 py-1 text-xs font-medium text-black opacity-0 shadow transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            Collapse
          </span>
        </div>
        <button type="button" onClick={onReset} disabled={!changed} className="rounded-md border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--muted)] transition-colors hover:text-white disabled:opacity-40">
          Reset
        </button>
      </div>
      <p className="px-4 pt-3 text-xs leading-relaxed text-[var(--muted)]">Changes show in the preview straight away, and the ZIP you download contains them.</p>
      <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
        {content ? (
          schema.groups.map((g) => <Group key={g.title} g={g} content={content} setContent={setContent} vars={vars} setVar={setVar} />)
        ) : (
          <p className="p-4 text-sm text-[var(--muted)]">Loading…</p>
        )}
      </div>
    </div>
  );
}
