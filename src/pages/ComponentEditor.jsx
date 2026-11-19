import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useComponent } from "../registry/index.js";
import { bakeDefaults, downloadFile } from "../lib/bake.js";
import NotFound from "./NotFound.jsx";
import {
  SliderRow,
  SelectRow,
  ToggleRow,
  ColorRow,
  ContentRow,
  ImagesPanel,
  ColorsPanel,
  WordsPanel,
  TextRow,
} from "../components/editor/Controls.jsx";

const DEVICES = [
  ["full", "Full"],
  [768, "Tablet"],
  [390, "Phone"],
];

export default function ComponentEditor() {
  const { slug } = useParams();
  const { c, status } = useComponent(slug, { withSource: true });
  if (status === "loading")
    return (
      <div className="grid h-dvh place-items-center text-sm text-[var(--muted)]" role="status">
        Loading editor…
      </div>
    );
  if (!c || !c.controls) return <NotFound />;
  return <Editor key={slug} c={c} />;
}

function Editor({ c }) {
  // All edits live only in this component's state: leaving the page discards them.
  const defaults = useMemo(
    () => Object.fromEntries(c.controls.map((k) => [k.key, k.default])),
    [c]
  );
  const [values, setValues] = useState(defaults);
  const [panel, setPanel] = useState(null);
  const [device, setDevice] = useState("full");
  const [menu, setMenu] = useState(false);
  const [note, setNote] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // Bumping this remounts the live preview: it starts over (intro, animation state) with the current values.
  const [renderKey, setRenderKey] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const refresh = () => {
    setRenderKey((k) => k + 1);
    setSpinning(true);
    setTimeout(() => setSpinning(false), 600);
  };
  const menuRef = useRef(null);

  // A control with `presets` (a variant, say) also sets the controls it names.
  const set = (key, v) =>
    setValues((p) => {
      const preset = c.controls.find((k) => k.key === key)?.presets?.[v];
      return preset ? { ...p, ...preset, [key]: v } : { ...p, [key]: v };
    });
  const changed = JSON.stringify(values) !== JSON.stringify(defaults);

  useEffect(() => {
    if (!menu) return;
    const close = (e) => !menuRef.current?.contains(e.target) && setMenu(false);
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [menu]);

  const flash = (t) => {
    setNote(t);
    setTimeout(() => setNote(""), 1800);
  };

  const sourceFor = (kind) =>
    bakeDefaults(kind === "ts" ? c.sourceTs : c.source, c.controls, values);

  const download = (kind) => {
    downloadFile(kind === "ts" ? c.fileTs : c.file, sourceFor(kind));
    setMenu(false);
    flash("Downloaded");
  };
  const copy = async (kind) => {
    try {
      await navigator.clipboard.writeText(sourceFor(kind));
      flash("Copied");
    } catch {
      flash("Copy not available");
    }
    setMenu(false);
  };

  const panelCtl = panel ? c.controls.find((k) => k.key === panel) : null;
  const Preview = c.Component;

  const item =
    "block w-full px-4 py-2.5 text-left text-[14px] hover:bg-[#262626]";

  return (
    <div className="mx-auto flex h-dvh w-full max-w-[1920px] flex-col bg-[var(--bg)] 2xl:border-x 2xl:border-[var(--line)]">
      {/* top bar */}
      <header
        className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--line)] px-3 sm:px-5"
        style={{ paddingTop: "env(safe-area-inset-top)", minHeight: 52 }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to={`/components/${c.slug}`}
            className="rounded-md px-2 py-1.5 text-[14px] text-[var(--muted)] transition-colors hover:text-white"
          >
            Back
          </Link>
          <div className="min-w-0 truncate text-[14px] font-medium">
            {c.name}
            <span className="ml-2 hidden font-normal text-[var(--muted)] sm:inline">
              Edits are temporary
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {note && (
            <span role="status" className="text-xs text-[var(--muted)]">
              {note}
            </span>
          )}
          <button
            type="button"
            disabled={!changed}
            onClick={() => {
              setValues(defaults);
              setPanel(null);
            }}
            className="h-9 rounded-lg border border-[var(--line)] px-3 text-[13px] text-[var(--muted)] transition-colors hover:text-white disabled:opacity-40 disabled:hover:text-[var(--muted)]"
          >
            Reset
          </button>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenu((m) => !m)}
              aria-expanded={menu}
              className="h-9 rounded-lg bg-white px-3.5 text-[13px] font-medium text-black"
            >
              Export code
            </button>
            {menu && (
              <div className="absolute right-0 top-11 z-30 w-56 overflow-hidden rounded-xl border border-[var(--line)] bg-[#1a1a1a] py-1 shadow-2xl">
                <button className={item} onClick={() => download("js")}>
                  Download {c.file}
                </button>
                {c.sourceTs && (
                  <button className={item} onClick={() => download("ts")}>
                    Download {c.fileTs}
                  </button>
                )}
                <div className="my-1 border-t border-[var(--line)]" />
                <button className={item} onClick={() => copy("js")}>
                  Copy code
                </button>
                {c.sourceTs && (
                  <button className={item} onClick={() => copy("ts")}>
                    Copy TSX code
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col-reverse md:flex-row">
        {/* sidebar */}
        <aside
          className={`flex min-h-0 flex-col border-t border-[var(--line)] bg-[#161616] md:border-r md:border-t-0 ${
            sidebarCollapsed
              ? "hidden md:block md:w-0 md:flex-none md:overflow-hidden md:border-r-0"
              : "flex-1 md:w-[340px] md:flex-none"
          }`}
        >
          <div
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-2"
            style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
          >
            {panelCtl ? (
              panelCtl.type === "colors" ? (
                <ColorsPanel
                  ctl={panelCtl}
                  value={values[panelCtl.key]}
                  onChange={(v) => set(panelCtl.key, v)}
                  onBack={() => setPanel(null)}
                />
              ) : panelCtl.type === "words" ? (
                <WordsPanel
                  ctl={panelCtl}
                  value={values[panelCtl.key]}
                  onChange={(v) => set(panelCtl.key, v)}
                  onBack={() => setPanel(null)}
                />
              ) : (
                <ImagesPanel
                  ctl={panelCtl}
                  value={values[panelCtl.key]}
                  onChange={(v) => set(panelCtl.key, v)}
                  onBack={() => setPanel(null)}
                  note={panelCtl.note ? panelCtl.note(values) : null}
                />
              )
            ) : (
              c.controls.map((ctl) => {
                const p = {
                  ctl,
                  value: values[ctl.key],
                  onChange: (v) => set(ctl.key, v),
                };
                if (ctl.type === "images" || ctl.type === "colors" || ctl.type === "words")
                  return <ContentRow key={ctl.key} {...p} onOpen={() => setPanel(ctl.key)} />;
                if (ctl.type === "text") return <TextRow key={ctl.key} {...p} />;
                if (ctl.type === "number") return <SliderRow key={ctl.key} {...p} />;
                if (ctl.type === "select") return <SelectRow key={ctl.key} {...p} />;
                if (ctl.type === "toggle") return <ToggleRow key={ctl.key} {...p} />;
                if (ctl.type === "color") return <ColorRow key={ctl.key} {...p} />;
                return null;
              })
            )}
          </div>
        </aside>

        {/* live preview */}
        <section className="flex h-[42dvh] min-h-0 shrink-0 flex-col bg-[#050505] md:h-auto md:flex-1">
          <div className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-[var(--line)] px-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSidebarCollapsed((v) => !v)}
                aria-pressed={sidebarCollapsed}
                aria-label={sidebarCollapsed ? "Show controls" : "Hide controls for a full-screen preview"}
                title={sidebarCollapsed ? "Show controls" : "Hide controls (full-screen preview)"}
                className="h-8 rounded-md border border-[var(--line)] px-2.5 text-[13px] text-[var(--muted)] transition-colors hover:text-white"
              >
                {sidebarCollapsed ? "⟩⟩ Controls" : "⟨⟨ Hide"}
              </button>
              <button
                type="button"
                onClick={refresh}
                aria-label="Re-render the preview"
                title="Re-render the preview (keeps your edits, no page reload)"
                className="flex h-8 items-center gap-1.5 rounded-md border border-[var(--line)] px-2.5 text-[13px] text-[var(--muted)] transition-colors hover:text-white"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={spinning ? { animation: "edRefreshSpin .6s ease-in-out" } : undefined}
                >
                  <path d="M20 12a8 8 0 1 1-2.6-5.9" />
                  <path d="M20 4v5h-5" />
                </svg>
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <div className="flex rounded-lg bg-black p-0.5" role="group" aria-label="Preview width">
                {DEVICES.map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setDevice(id)}
                    aria-pressed={device === id}
                    className={`h-8 rounded-md px-3 text-[13px] transition-colors ${
                      device === id ? "bg-[#333] text-white" : "text-[var(--muted)] hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <span className="hidden text-xs text-[var(--muted)] sm:block">
              Live preview · drag or scroll to try it
            </span>
          </div>

          <div className="flex min-h-0 flex-1 justify-center md:p-4">
            <div
              className="h-full overflow-hidden bg-black transition-[width] duration-300 md:rounded-xl md:border md:border-[var(--line)]"
              style={{
                width: device === "full" ? "100%" : `${device}px`,
                maxWidth: "100%",
              }}
            >
              <Preview key={renderKey} {...values} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
