import { memo, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ORDER, cardOf, loadComponent, useComponent } from "../registry/index.js";
import { CardSkeleton } from "../components/Skeleton.jsx";

// Cards are added a batch at a time as the page is scrolled.
const BATCH = 9;

// Pointing at a card starts its live preview; on touch screens (no hover) the
// still poster is all the grid shows and the component's own page is a tap away.
const canHover = () => typeof matchMedia === "function" && matchMedia("(hover: hover)").matches;

/** The running component, mounted only while a card is hovered or focused. */
function Live({ slug }) {
  const { c } = useComponent(slug);
  const [hidden, setHidden] = useState(() => document.hidden);
  useEffect(() => {
    const on = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);
  if (!c || hidden) return null;
  return <div className="absolute inset-0 bg-black">{c.render({ interactive: false })}</div>;
}

const Card = memo(function Card({ slug }) {
  const c = cardOf(slug);
  const [live, setLive] = useState(false);
  const [posterOk, setPosterOk] = useState(true);
  const timer = useRef(0);
  if (!c) return null;

  const start = () => {
    if (!canHover()) return;
    clearTimeout(timer.current);
    // a short pause, so sweeping the pointer across the grid doesn't spin up every card it crosses
    timer.current = setTimeout(() => {
      loadComponent(slug).catch(() => {});
      setLive(true);
    }, 120);
  };
  const stop = () => {
    clearTimeout(timer.current);
    setLive(false);
  };

  return (
    <Link
      to={`/components/${c.slug}`}
      onPointerEnter={start}
      onPointerLeave={stop}
      onFocus={start}
      onBlur={stop}
      className="group block overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] transition-colors hover:border-[#3a3a3a]"
    >
      <div className="pointer-events-none relative aspect-[4/3] w-full overflow-hidden bg-black">
        <div className="absolute inset-0 animate-pulse bg-white/[0.05]" />
        {posterOk && (
          <img
            src={`/posters/${slug}.webp`}
            alt=""
            width={640}
            height={480}
            loading="lazy"
            decoding="async"
            draggable={false}
            onError={() => setPosterOk(false)}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        {live && <Live slug={slug} />}
      </div>
      {/* a fixed-height footer keeps every card the same size */}
      <div className="flex h-[108px] items-start justify-between gap-4 p-4 sm:p-5">
        <div className="min-w-0">
          <h2 className="truncate text-base font-medium">{c.name}</h2>
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-[var(--muted)]">
            {c.description}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-[var(--line)] px-2.5 py-0.5 text-xs text-[var(--muted)]">
          {c.tag}
        </span>
      </div>
    </Link>
  );
});

export default function Home() {
  const [count, setCount] = useState(BATCH);
  const sentinel = useRef(null);
  const more = count < ORDER.length;

  // Reveal the next batch when the end of the list nears the viewport.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !more) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setCount((n) => Math.min(ORDER.length, n + BATCH));
      },
      { rootMargin: "600px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [more, count]);

  return (
    <div className="mx-auto w-full max-w-[1800px] px-4 py-10 sm:px-8 sm:py-16 2xl:px-12">
      <h1 className="max-w-3xl text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
        Animated React components you can copy and own.
      </h1>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--muted)] sm:text-lg">
        Pick a component to see it running full size, read its props, and copy
        the usage.
      </p>

      <ul className="mt-10 grid grid-cols-1 gap-4 sm:mt-14 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {ORDER.slice(0, count).map((slug) => (
          <li key={slug}>
            <Card slug={slug} />
          </li>
        ))}
      </ul>

      {more && (
        <div
          ref={sentinel}
          className="mt-4 grid grid-cols-1 gap-4 sm:mt-5 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
          aria-hidden="true"
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className={i > 2 ? "hidden xl:block" : i > 1 ? "hidden lg:block" : i > 0 ? "hidden sm:block" : ""}>
              <CardSkeleton />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
