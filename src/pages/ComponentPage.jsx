import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useComponent } from "../registry/index.js";
import { PageSkeleton } from "../components/Skeleton.jsx";
import NotFound from "./NotFound.jsx";

function downloadFile(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function CopyButton({ text, label = "Copy" }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <button
      onClick={copy}
      className="rounded-md border border-[var(--line)] px-3 py-1.5 text-xs text-[var(--muted)] transition-colors hover:text-white"
    >
      {done ? "Copied" : label}
    </button>
  );
}

export default function ComponentPage() {
  const { slug } = useParams();
  const { c, status } = useComponent(slug, { withSource: true });
  if (status === "loading") return <PageSkeleton />;
  if (!c) return <NotFound />;

  return (
    <div className="mx-auto w-full max-w-[1800px] px-4 py-8 sm:px-8 2xl:px-12 sm:py-12">
      <Link
        to="/"
        className="text-sm text-[var(--muted)] transition-colors hover:text-white"
      >
        Back to components
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {c.name}
        </h1>
        {c.controls && (
          <Link
            to={`/components/${c.slug}/edit`}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90"
          >
            Edit and customize
          </Link>
        )}
      </div>
      <p className="mt-3 max-w-xl text-base leading-relaxed text-[var(--muted)]">
        {c.description}
      </p>

      <div
        className="mt-8 overflow-hidden rounded-2xl border border-[var(--line)] bg-black"
        style={{ height: "clamp(340px, 68dvh, 680px)" }}
      >
        {c.render({ interactive: true })}
      </div>
      <p className="mt-3 text-sm text-[var(--muted)]">
        Try it: drag, scroll or swipe.
      </p>

      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-medium">Component file</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              One self-contained file. Paste it into any React project and
              render it — nothing else to install.
            </p>
          </div>
          <div className="flex gap-2">
            <CopyButton text={c.source} label="Copy code" />
            <button
              onClick={() => downloadFile(c.file, c.source)}
              className="rounded-md border border-[var(--line)] px-3 py-1.5 text-xs text-[var(--muted)] transition-colors hover:text-white"
            >
              Download {c.file}
            </button>
          </div>
        </div>
        <details className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--surface)]">
          <summary className="cursor-pointer select-none p-4 text-sm text-[var(--muted)]">
            View source
          </summary>
          <pre className="max-h-[480px] overflow-auto border-t border-[var(--line)] p-4 text-[13px] leading-relaxed">
            <code>{c.source}</code>
          </pre>
        </details>
      </section>

      <section className="mt-14">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-medium">Usage</h2>
          <CopyButton text={c.usage} />
        </div>
        <pre className="mt-4 overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 text-[13px] leading-relaxed">
          <code>{c.usage}</code>
        </pre>
      </section>

      <section className="mt-14">
        <h2 className="text-xl font-medium">Props</h2>
        <dl className="mt-4 divide-y divide-[var(--line)] rounded-xl border border-[var(--line)] bg-[var(--surface)]">
          {c.props.map(([name, type, def, desc]) => (
            <div
              key={name}
              className="grid gap-1 p-4 sm:grid-cols-[160px_1fr] sm:gap-6"
            >
              <dt className="font-mono text-sm">{name}</dt>
              <dd className="text-sm leading-relaxed text-[var(--muted)]">
                <span className="font-mono text-[13px] text-[var(--text)]">
                  {type}
                </span>
                <span className="mx-2">default</span>
                <span className="font-mono text-[13px] text-[var(--text)]">
                  {def}
                </span>
                <span className="mt-1 block">{desc}</span>
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
