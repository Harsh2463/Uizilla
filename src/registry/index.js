// To add a component:
//  1. Create src/library/<your-slug>/YourComponent.jsx and meta.jsx
//     (the folder name must equal the slug in meta.jsx).
//  2. Add the slug to ORDER below (its place in the list = its place on the home page).
//
// Nothing here imports a component up front. A home-page card needs only its
// name, tag and description (`cardOf`, read from the meta files at build time);
// the full meta — component, props, controls — is its own chunk, fetched when
// a card is pointed at or its own page opens; and the component's source text
// is fetched separately again, only for the page that shows or exports it.
import { useEffect, useState } from "react";
import cardInfo from "virtual:cards";

const loaders = import.meta.glob("../library/*/meta.jsx");

export const ORDER = [
  "round-carousel",
  "rotunda-carousel",
  "grainy-carousel",
  "gallery-tunnel",
  "rotating-gallery",
  "depth-gallery",
  "magazine-flip",
  "clothing-flip",
  "color-tunnel",
  "zoom-gallery",
  "spiral-images",
  "spotlight-frames",
  "try-the-look",
  "try-the-look-2",
  "magnetic-carousel",
  "hover-image-reveal",
  "particle-hero",
  "text-path",
  "heat-streak-ring",
  "smoky-text",
  "circular-text",
  "led-ticker",
  "text-3d-flip",
  "scroll-highlight",
  "stride-bar-site",
  "video-ribbon",
  "sea-ring-portfolio",
  "ribbon-glow",
  "garment-rail",
];

const loaderFor = (slug) => loaders[`../library/${slug}/meta.jsx`];
const loaded = new Map(); // slug -> meta
const pending = new Map(); // slug -> promise
const sourceLoaders = new Map(); // slug -> { source: () => Promise<string>, ... }
const sourceFilled = new Set(); // slugs whose source text has been put on the meta
const sourcePending = new Map();

export const hasComponent = (slug) => !!loaderFor(slug);
/** Name, tag and description for a card — available at once, nothing to fetch. */
export const cardOf = (slug) => cardInfo[slug];

export function loadComponent(slug) {
  if (loaded.has(slug)) return Promise.resolve(loaded.get(slug));
  if (pending.has(slug)) return pending.get(slug);
  const load = loaderFor(slug);
  if (!load) return Promise.resolve(undefined);
  const p = load().then(
    (m) => {
      loaded.set(slug, m.default);
      sourceLoaders.set(slug, m.__sources || {});
      pending.delete(slug);
      return m.default;
    },
    (err) => {
      pending.delete(slug);
      throw err;
    }
  );
  pending.set(slug, p);
  return p;
}

/** The meta with its source text (`source`, and `sourceTs` where there is one) filled in. */
export function loadSource(slug) {
  if (sourcePending.has(slug)) return sourcePending.get(slug);
  const p = loadComponent(slug).then(async (c) => {
    if (!c) return c;
    const src = sourceLoaders.get(slug) || {};
    await Promise.all(
      Object.keys(src).map(async (k) => {
        c[k] = await src[k]();
      })
    );
    sourceFilled.add(slug);
    return c;
  });
  sourcePending.set(slug, p);
  p.catch(() => sourcePending.delete(slug));
  return p;
}

/** { c, status } — status is "loading" | "ready" | "missing" | "error". */
export function useComponent(slug, { withSource = false } = {}) {
  const [, force] = useState(0);
  const [error, setError] = useState(false);
  const c = loaded.get(slug);
  const ready = !!c && (!withSource || sourceFilled.has(slug));
  useEffect(() => {
    if (ready || !hasComponent(slug)) return;
    let live = true;
    setError(false);
    (withSource ? loadSource(slug) : loadComponent(slug)).then(
      () => live && force((n) => n + 1),
      () => live && setError(true)
    );
    return () => {
      live = false;
    };
  }, [slug, withSource, ready]);
  if (!hasComponent(slug)) return { c: undefined, status: "missing" };
  if (ready) return { c, status: "ready" };
  return { c: undefined, status: error ? "error" : "loading" };
}
