import { Link } from "react-router-dom";
import { components } from "../registry/index.js";
import InView from "../components/InView.jsx";

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
      <h1 className="max-w-2xl text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
        Animated React components you can copy and own.
      </h1>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--muted)] sm:text-lg">
        Pick a component to see it running full size, read its props, and copy
        the usage.
      </p>

      <ul className="mt-10 grid grid-cols-1 gap-4 sm:mt-14 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
        {components.map((c) => (
          <li key={c.slug}>
            <Link
              to={`/components/${c.slug}`}
              className="group block overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] transition-colors hover:border-[#3a3a3a]"
            >
              <InView
                className="pointer-events-none aspect-[4/3] w-full bg-black"
              >
                {c.render({ interactive: false })}
              </InView>
              <div className="flex items-start justify-between gap-4 p-4 sm:p-5">
                <div>
                  <h2 className="text-base font-medium">{c.name}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
                    {c.description}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-[var(--line)] px-2.5 py-0.5 text-xs text-[var(--muted)]">
                  {c.tag}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
