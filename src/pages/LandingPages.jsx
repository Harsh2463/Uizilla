import { Link } from "react-router-dom";
import { landingPages } from "../landing/registry.js";

export default function LandingPages() {
  return (
    <div className="mx-auto w-full max-w-[1800px] px-4 py-10 sm:px-8 sm:py-16 2xl:px-12">
      <h1 className="max-w-3xl text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
        Complete templates, ready to download.
      </h1>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--muted)] sm:text-lg">
        Preview each project at any width from a phone to a wide desktop, then
        download the whole thing: components split by section, with the text,
        images and colours in two small files.
      </p>
      <ul className="mt-10 grid grid-cols-1 gap-4 sm:mt-14 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {landingPages.map((p) => (
          <li key={p.slug}>
            <Link
              to={`/templates/${p.slug}`}
              className="group block overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] transition-colors hover:border-[#3a3a3a]"
            >
              <div className="pointer-events-none relative aspect-[4/3] w-full overflow-hidden bg-black">
                {/* a small live view of the page: the real page at 1440px, scaled down */}
                <iframe
                  title={p.name}
                  src={`/landing-frame/${p.slug}`}
                  loading="lazy"
                  tabIndex={-1}
                  className="absolute left-0 top-0 origin-top-left border-0"
                  style={{ width: 1440, height: 1080, transform: "scale(var(--s, 0.25))" }}
                  ref={(el) => {
                    if (el?.parentElement) el.style.setProperty("--s", String(el.parentElement.clientWidth / 1440));
                  }}
                />
              </div>
              <div className="flex h-[108px] items-start justify-between gap-4 p-4 sm:p-5">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-medium">{p.name}</h2>
                  <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-[var(--muted)]">{p.description}</p>
                </div>
                <span className="shrink-0 rounded-full border border-[var(--line)] px-2.5 py-0.5 text-xs text-[var(--muted)]">
                  {p.tag}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
