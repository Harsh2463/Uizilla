import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getLandingPage, loadLandingFiles } from "../landing/registry.js";
import { downloadProject, readme } from "../landing/project.js";
import { editors, same } from "../landing/editors.js";
import EditorPanel from "../landing/EditorPanel.jsx";
import NotFound from "./NotFound.jsx";

const MIN = 325;
const MAX = 1920;
const PRESETS = [
  ["Phone", 390],
  ["Tablet", 768],
  ["Laptop", 1280],
  ["Desktop", 1440],
  ["Wide", 1920],
];
const ZOOMS = [50, 75, 100, 125, 150, 200];
const clamp = (v) => Math.max(MIN, Math.min(MAX, Math.round(v) || MIN));

function Code({ children }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 text-[13px] leading-relaxed">
      <code>{children}</code>
    </pre>
  );
}

function H({ children }) {
  return <h2 className="mt-14 text-xl font-medium">{children}</h2>;
}

const selectCls = "rounded-md border border-[var(--line)] bg-black px-2 py-1 text-sm text-white";

/** Width presets (a dropdown), slider, number, refresh and zoom — plus whatever buttons the caller adds. */
function Toolbar({ width, setWidth, zoom, setZoom, scale, onRefresh, spin, children, className = "" }) {
  const preset = PRESETS.find(([, w]) => w === width);
  return (
    <div className={"flex flex-wrap items-center gap-3 " + className}>
      <label className="flex items-center gap-1.5 text-sm text-[var(--muted)]">
        Device
        <select
          value={preset ? preset[1] : "custom"}
          onChange={(e) => e.target.value !== "custom" && setWidth(Number(e.target.value))}
          className={selectCls}
          aria-label="Device width preset"
        >
          {PRESETS.map(([name, w]) => (
            <option key={name} value={w}>
              {name} — {w}px
            </option>
          ))}
          {!preset && <option value="custom">Custom — {width}px</option>}
        </select>
      </label>
      <input
        type="range"
        min={MIN}
        max={MAX}
        step={1}
        value={width}
        onChange={(e) => setWidth(clamp(e.target.value))}
        className="ed-range min-w-[140px] flex-1"
        aria-label="Preview width"
      />
      <label className="flex items-center gap-1.5 text-sm text-[var(--muted)]">
        <input
          type="number"
          min={MIN}
          max={MAX}
          value={width}
          onChange={(e) => setWidth(clamp(e.target.value))}
          className="w-[72px] rounded-md border border-[var(--line)] bg-black px-2 py-1 text-right text-sm text-white"
          aria-label="Preview width in pixels"
        />
        px
      </label>
      <label className="flex items-center gap-1.5 text-sm text-[var(--muted)]">
        Zoom
        <select
          value={zoom}
          onChange={(e) => setZoom(e.target.value === "fit" ? "fit" : Number(e.target.value))}
          className={selectCls}
          aria-label="Preview zoom"
        >
          <option value="fit">Fit to window{zoom === "fit" ? ` (${Math.round(scale * 100)}%)` : ""}</option>
          {ZOOMS.map((z) => (
            <option key={z} value={z}>
              {z}%
            </option>
          ))}
        </select>
      </label>
      <button
        onClick={onRefresh}
        className="flex items-center gap-1.5 rounded-md border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--muted)] transition-colors hover:text-white"
        title="Reload the page at this width, from the top, with its entrance animation"
      >
        <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "transform .6s", transform: spin ? "rotate(360deg)" : "none" }} aria-hidden="true">
          <path d="M13.5 8A5.5 5.5 0 1 1 11.9 4.1M13.5 2.5v3h-3" />
        </svg>
        Refresh
      </button>
      {children}
    </div>
  );
}

/** The page in an iframe at `width` px, scaled to `scale`, with draggable edges. Measures the room it has. */
function Stage({ page, width, setWidth, zoom, onMeasure, scale, reloads, height, className = "" }) {
  const box = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [room, setRoom] = useState({ w: 1200, h: height || 700 });

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => {
      const cs = getComputedStyle(el);
      const w = Math.max(200, el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 32);
      const h = Math.max(200, el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom));
      setRoom({ w, h });
      onMeasure?.(w);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const H = height || room.h;
  const startDrag = (side) => (e) => {
    e.preventDefault();
    const x0 = e.clientX;
    const w0 = width;
    setDragging(true);
    const move = (ev) => setWidth(clamp(w0 + ((side === "r" ? 1 : -1) * (ev.clientX - x0) * 2) / scale));
    const up = () => {
      setDragging(false);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const handle = (side) => (
    <div
      onPointerDown={startDrag(side)}
      className="absolute top-0 z-10 flex h-full w-4 cursor-ew-resize touch-none items-center justify-center"
      style={{ [side === "r" ? "right" : "left"]: -16 }}
      role="separator"
      aria-label="Drag to resize the preview"
    >
      <span className="h-12 w-1 rounded-full bg-white/30 transition-colors hover:bg-white/70" />
    </div>
  );

  return (
    <div ref={box} className={"overflow-x-auto overflow-y-hidden " + className} style={height ? undefined : { minHeight: 0 }}>
      <div className="relative mx-auto" style={{ width: width * scale, height: H, maxWidth: "none" }}>
        {handle("l")}
        {handle("r")}
        <iframe
          key={reloads}
          data-template-frame=""
          title={`${page.name} preview`}
          src={`/landing-frame/${page.slug}`}
          className="absolute left-0 top-0 block overflow-hidden rounded-lg border border-[var(--line)] bg-black"
          style={{ width, height: H / scale, transform: `scale(${scale})`, transformOrigin: "0 0", maxWidth: "none", pointerEvents: dragging ? "none" : "auto" }}
        />
      </div>
    </div>
  );
}

const iconBtn =
  "grid h-8 w-8 place-items-center rounded-md border border-[var(--line)] text-[var(--muted)] transition-colors hover:text-white";

export default function LandingPreview() {
  const { slug } = useParams();
  const page = getLandingPage(slug);
  const schema = editors[slug];
  const [width, setWidth] = useState(1280);
  const [busy, setBusy] = useState(false);
  const [files, setFiles] = useState(null);
  const [zoom, setZoom] = useState("fit"); // "fit" or a percentage
  const [avail, setAvail] = useState(1200);
  const [reloads, setReloads] = useState(0); // bumping this reloads the preview from the top
  const [spin, setSpin] = useState(false);
  const [full, setFull] = useState(false);
  const [side, setSide] = useState(false); // the editing sidebar, inside the full preview
  const started = useRef(false);

  // ---- the editor's state: the page's content and its CSS variables
  const [original, setOriginal] = useState(null); // what the template ships with
  const [content, setContent] = useState(null);
  const [defaultVars, setDefaultVars] = useState({});
  const [vars, setVars] = useState({});
  const loading = useRef(false);

  const ensureEditor = useCallback(async () => {
    if (!schema || loading.current || original) return;
    loading.current = true;
    const [c, files2] = await Promise.all([schema.loadContent(), loadLandingFiles(slug)]);
    const css = files2[`src/landing/${slug}/theme.css`] || "";
    const dv = {};
    schema.groups.forEach((g) =>
      g.fields.forEach((fl) => {
        if (!fl.css) return;
        const m = css.match(new RegExp(fl.css + "\\s*:\\s*([^;]+);"));
        if (m) dv[fl.css] = m[1].trim();
      })
    );
    setOriginal(c);
    setContent(JSON.parse(JSON.stringify(c)));
    setDefaultVars(dv);
    setVars(dv);
  }, [schema, slug, original]);

  const changedVars = Object.fromEntries(Object.entries(vars).filter(([k, v]) => defaultVars[k] !== v));
  const changed = !!original && (!same(content, original) || Object.keys(changedVars).length > 0);
  const live = useRef(null);
  live.current = original ? { __tpl: "edits", slug, content, vars: changedVars } : null;

  // send the edits to every preview frame, and answer a frame that has just loaded
  useEffect(() => {
    if (!live.current) return;
    document.querySelectorAll("iframe[data-template-frame]").forEach((fr) => fr.contentWindow?.postMessage(live.current, location.origin));
  }, [content, vars, original]);
  useEffect(() => {
    const on = (e) => {
      if (e.origin === location.origin && e.data?.__tpl === "ready" && live.current) e.source?.postMessage(live.current, location.origin);
    };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, []);

  const onMeasure = (w) => {
    setAvail(w);
    if (!started.current) {
      started.current = true;
      setWidth(clamp(Math.min(1440, w)));
    }
  };

  const open = (withEditor) => {
    setSide(withEditor);
    setFull(true);
    ensureEditor();
  };

  // the full-screen preview: Escape closes it, and the page behind does not scroll
  useEffect(() => {
    if (!full) return;
    const key = (e) => e.key === "Escape" && setFull(false);
    window.addEventListener("keydown", key);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", key);
      document.body.style.overflow = prev;
    };
  }, [full]);

  if (!page) return <NotFound />;

  // Fit to window shrinks a wide design to the room available (it never enlarges one)
  const scale = zoom === "fit" ? Math.min(1, avail / width) : zoom / 100;
  const refresh = () => {
    setReloads((n) => n + 1);
    setSpin(true);
    setTimeout(() => setSpin(false), 600);
  };
  const download = async () => {
    setBusy(true);
    try {
      setFiles(await downloadProject(page, original ? { content, vars, defaultVars } : undefined));
    } finally {
      setBusy(false);
    }
  };
  const reset = () => {
    setContent(JSON.parse(JSON.stringify(original)));
    setVars(defaultVars);
  };
  const toolbarProps = { width, setWidth, zoom, setZoom, scale, onRefresh: refresh, spin };

  return (
    <div className="mx-auto w-full max-w-[1800px] px-4 py-8 sm:px-8 sm:py-10 2xl:px-12">
      <Link to="/templates" className="text-sm text-[var(--muted)] transition-colors hover:text-white">
        Back to templates
      </Link>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{page.name}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">{page.description}</p>
        </div>
        <button
          onClick={download}
          disabled={busy}
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "Preparing…" : changed ? "Download edited project (.zip)" : "Download project (.zip)"}
        </button>
      </div>

      <Toolbar {...toolbarProps} className="mt-6 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3">
        {schema && (
          <button
            onClick={() => open(true)}
            className="flex items-center gap-1.5 rounded-md border border-white/40 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/10"
          >
            <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2.5 13.5l1-3.5 7.8-7.8a1.4 1.4 0 0 1 2 2L5.5 12.5l-3 1z" />
            </svg>
            Edit
          </button>
        )}
        <button
          onClick={() => open(false)}
          className="flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-black transition-opacity hover:opacity-90"
        >
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10" />
          </svg>
          Full preview
        </button>
      </Toolbar>

      {!full && (
        <Stage
          page={page}
          width={width}
          setWidth={setWidth}
          zoom={zoom}
          scale={scale}
          reloads={reloads}
          height={760}
          onMeasure={onMeasure}
          className="mt-4 rounded-2xl border border-[var(--line)] bg-[#050505] p-4 sm:p-6"
        />
      )}
      <p className="mt-3 text-sm text-[var(--muted)]">
        {width}px wide, shown at {Math.round(scale * 100)}%. Drag either edge, use the slider, or pick a device; the page switches to its phone layout at 760px and under.
      </p>
      {files && (
        <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
          Downloaded {files.length} files into <span className="font-mono text-[13px] text-white">{files[0].split("/")[0]}/</span>
          {changed && " — with your edits."}
        </div>
      )}

      {full && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-[#050505]" role="dialog" aria-label={`${page.name} full preview`}>
          <div className="flex flex-wrap items-center gap-3 border-b border-[var(--line)] bg-[var(--surface)] px-4 py-3">
            {schema && (
              <button
                onClick={() => setSide((v) => !v)}
                aria-pressed={side}
                aria-label={side ? "Hide the editor" : "Show the editor"}
                className={"flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors " + (side ? "border-white bg-white text-black" : "border-white/40 text-white hover:bg-white/10")}
              >
                <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M2.5 13.5l1-3.5 7.8-7.8a1.4 1.4 0 0 1 2 2L5.5 12.5l-3 1z" />
                </svg>
                Edit
              </button>
            )}
            <span className="text-sm font-medium">{page.name}</span>
            <Toolbar {...toolbarProps} className="min-w-0 flex-1">
              <div className="group relative">
                <button onClick={download} disabled={busy} aria-label="Download ZIP" className={iconBtn + " disabled:opacity-50"}>
                  <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M8 2v8.5M4.5 7.5L8 11l3.5-3.5M2.5 13.5h11" />
                  </svg>
                </button>
                <span className="pointer-events-none absolute right-0 top-full z-10 mt-2 whitespace-nowrap rounded-md bg-white px-2 py-1 text-xs font-medium text-black opacity-0 shadow transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                  Download ZIP{changed ? " (with your edits)" : ""}
                </span>
              </div>
              <button
                onClick={() => setFull(false)}
                className="flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-black transition-opacity hover:opacity-90"
              >
                <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
                Close preview
              </button>
            </Toolbar>
          </div>
          <div className="flex min-h-0 flex-1">
            {schema && (
              <aside
                className="shrink-0 overflow-hidden border-[var(--line)] bg-[var(--surface)] transition-[width] duration-300 ease-out"
                style={{ width: side ? 340 : 0, borderRightWidth: side ? 1 : 0 }}
                aria-hidden={!side}
              >
                <div className="h-full w-[340px]">
                  <EditorPanel
                    schema={schema}
                    content={content}
                    setContent={setContent}
                    vars={vars}
                    setVar={(k, v) => setVars((p) => ({ ...p, [k]: v }))}
                    onReset={reset}
                    changed={changed}
                    onCollapse={() => setSide(false)}
                  />
                </div>
              </aside>
            )}
            <Stage
              page={page}
              width={width}
              setWidth={setWidth}
              zoom={zoom}
              scale={scale}
              reloads={reloads}
              onMeasure={setAvail}
              className="min-h-0 min-w-0 flex-1 p-3 sm:p-4"
            />
          </div>
        </div>
      )}

      {/* ---- info */}
      <section className="max-w-4xl">
        <H>What you get</H>
        <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
          A complete, runnable Vite + React project. The layout is split into components, the copy and data live in one file and the
          colours in another, so you can retheme it without opening a component.
        </p>
        <ul className="mt-4 divide-y divide-[var(--line)] rounded-xl border border-[var(--line)] bg-[var(--surface)]">
          {page.sections.map(([name, file, desc]) => (
            <li key={name} className="grid gap-1 p-4 sm:grid-cols-[180px_1fr] sm:gap-6">
              <span className="font-mono text-sm">{name}</span>
              <span className="text-sm leading-relaxed text-[var(--muted)]">
                <span className="font-mono text-[13px] text-[var(--text)]">{file}</span>
                <span className="mt-1 block">{desc}</span>
              </span>
            </li>
          ))}
        </ul>

        <H>Folder structure</H>
        <div className="mt-4">
          <Code>{page.tree(page.slug)}</Code>
        </div>

        <H>Packages required</H>
        <div className="mt-4 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)]">
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-[var(--line)]">
              {[
                ...page.deps,
                ["vite", "^6", "dev only — only if you run it as its own project"],
                ["@vitejs/plugin-react", "^4", "dev only — same"],
              ].map(([n, v, d]) => (
                <tr key={n}>
                  <td className="p-3 font-mono text-[13px]">{n}</td>
                  <td className="p-3 font-mono text-[13px] text-[var(--muted)]">{v}</td>
                  <td className="p-3 text-[var(--muted)]">{d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">{page.fonts}</p>

        <H>Start a new project</H>
        <div className="mt-4">
          <Code>{`unzip ${page.slug}-project.zip
cd ${page.slug}-project
npm install
npm run dev        # opens on http://localhost:5173
npm run build      # production files in dist/`}</Code>
        </div>

        <H>Add it to an existing project</H>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-[var(--muted)]">
          <li>
            Install what it needs:
            <span className="ml-1 font-mono text-[13px] text-[var(--text)]">
              npm install react react-dom {page.deps.map(([n]) => n).filter((n) => n !== "react" && n !== "react-dom").join(" ")}
            </span>
          </li>
          <li>
            Copy the folder <span className="font-mono text-[13px] text-[var(--text)]">src/landing/{page.slug}/</span> into your project.
          </li>
          <li>Make sure the project uses a bundler that handles <span className="font-mono text-[13px] text-[var(--text)]">import "./x.css"</span> (Vite, Next.js, CRA, Remix and Parcel all do).</li>
          <li>Render it anywhere, for example as a route or the home page:</li>
        </ol>
        <div className="mt-3">
          <Code>{`import Landing from "./landing/${page.slug}/Landing.jsx";

export default function Home() {
  return <Landing />;
}`}</Code>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
          The component imports its own CSS, so there is nothing else to wire up. In the Next.js App Router, put
          <span className="font-mono text-[13px] text-[var(--text)]"> "use client"; </span>
          as the first line of every .jsx file in the folder. All styles are scoped under one class, so they will not touch the rest of your site.
        </p>

        <H>Change the text, images and colours</H>
        <div className="mt-4 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)]">
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-[var(--line)]">
              {page.changes.map(([a, b]) => (
                <tr key={a}>
                  <td className="p-3 align-top">{a}</td>
                  <td className="p-3 align-top font-mono text-[13px] text-[var(--muted)]">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
          You can also pass your own object without editing the file:
          <span className="font-mono text-[13px] text-[var(--text)]"> {"<Landing content={myContent} />"}</span> (same shape as content.js).
        </p>

        <H>How it is built</H>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[var(--muted)]">
          {page.how.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>

        <H>README (included in the ZIP)</H>
        <div className="mt-4">
          <pre className="max-h-[420px] overflow-auto rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 text-[13px] leading-relaxed">
            <code>{readme(page)}</code>
          </pre>
        </div>
      </section>
    </div>
  );
}
