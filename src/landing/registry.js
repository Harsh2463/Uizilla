import { lazy } from "react";

// Templates shown in the "Templates" tab. To add one: put its folder in
// src/landing/<slug>/ (a Landing.jsx plus its sections, content.js and
// theme.css) and add an entry here. Each entry also drives the info page and
// the downloadable project, so list every runtime package in `deps`.

const sources = import.meta.glob("./*/**/*.{js,jsx,css}", { query: "?raw", import: "default" });

const REACT = [
  ["react", "^18.3.1", "runtime dependency"],
  ["react-dom", "^18.3.1", "runtime dependency"],
];

export const landingPages = [
  {
    slug: "motion-laptop",
    name: "Motion-laptop",
    tag: "Product showcase",
    kind: "Project",
    description:
      "A soft, glassy product showcase for laptops: a 3D carousel of six machines on a turning ring, a bento of cards that follow the active laptop (price, performance, every spec), a header component, and a background that shifts colour with each laptop.",
    Component: lazy(() => import("./motion-laptop/Landing.jsx")),
    folder: "motion-laptop",
    deps: [
      ...REACT,
      ["framer-motion", "^11", "card entrances and the staggered content animation (loaded in its slim LazyMotion form)"],
      ["react-icons", "^5", "all icons (Feather and Bootstrap sets, imported one icon at a time)"],
    ],
    sections: [
      ["Header", "components/Header.jsx", "The header component: logo, search (jumps the carousel to a laptop), bag and favourites counters, user chip."],
      ["Showcase", "sections/Showcase.jsx", "The whole layout as one section: the carousel card, the right-hand cards and the specification bento."],
      ["Runway", "components/Runway.jsx", "The carousel engine: a spring-driven 3D ring on desktop, a diagonal line on phones, drag / swipe / wheel / keys, autoplay with a progress bar."],
      ["Cards", "components/cards.jsx", "Pick, Performance and Summary cards plus the seven spec cards (CPU, GPU, display, memory, storage, battery, weight & ports)."],
    ],
    tree: (slug) => `${slug}-project/
  package.json         react, react-dom, framer-motion, react-icons, vite
  vite.config.js
  index.html
  README.md            the same instructions as on this page
  src/
    main.jsx           mounts <App />
    App.jsx            renders <Landing />
    landing/${slug}/
      Landing.jsx      state + layout: header, then the showcase section
      content.js       every word, laptop, spec, price and tint colour
      theme.css        text, card, CTA colours and the font
      styles.css       layout, cards, motion and the phone bento
      hooks.js         count-up and on-screen helpers
      components/
        Header.jsx  Runway.jsx  cards.jsx  motion.jsx
      sections/
        Showcase.jsx`,
    changes: [
      ["Laptops, specs, prices, ratings, tint colours", "laptops in content.js (one object each)"],
      ["The laptop images", "sheet / sheetSize in content.js, and each laptop's box: [x, y, w, h] crop on that sheet"],
      ["Size of each laptop, of the ring, of the right-hand cards", "layout in content.js (productSize, ringSize, rightSize); desktop ring"],
      ["Labels, autoplay on/off and seconds", "the other fields of content.js"],
      ["Card, text and button colours, the font", "theme.css"],
      ["Background for each laptop", "tint: [from, to] of that laptop in content.js — the page background fades between them"],
      ["Layout of the cards on desktop, tablet and phone", "the three blocks at the end of styles.css"],
    ],
    how: [
      "The carousel keeps twelve bodies (the six laptops and a clone of each) on a ring. One continuous position is chased by a critically damped spring, so clicks, drags, arrow keys, trackpad swipes and autoplay all settle the same way. Phones get a diagonal line instead of the ring.",
      "Every laptop is a crop of one WebP sprite sheet, so the whole carousel is a single image request. Replace the sheet and the crop boxes to use your own products.",
      "Cards enter as they scroll into view, and each card's content re-runs a staggered entrance (numbers count up, bars and rings fill) whenever a different laptop becomes active. framer-motion runs in its slim LazyMotion form.",
      "The page background is a gradient between two tint colours of the active laptop, so it changes colour with the carousel. Reduced-motion visitors get the finished page with no animation.",
      "The specs are sample data — replace them with real ones.",
    ],
    fonts: "Plus Jakarta Sans loads from Google Fonts through one @import at the top of styles.css.",
  },
  {
    slug: "orvante",
    name: "Orvante",
    tag: "Landing page",
    kind: "Landing page",
    description:
      "A monochrome editorial landing page for a branding agency: a light hero with a black-and-white portrait, a black manifesto whose words fill from grey to white as you scroll, and a bordered 'Trusted by' panel with counting stat cards.",
    Component: lazy(() => import("./orvante/Landing.jsx")),
    folder: "orvante",
    deps: REACT,
    sections: [
      ["Hero", "sections/Hero.jsx", "Nav pill, title, about copy, stats frame, Out Now card, brand plate and logo row over the photo."],
      ["Bar", "sections/Bar.jsx", "The black strip: EST 2019 · SCROLL DOWN · LIVE IN DETAILS."],
      ["Statement", "sections/Statement.jsx", "The five-line manifesto whose words fill grey to white while you scroll, and the sub-line."],
      ["TrustPanel", "sections/TrustPanel.jsx", "The bordered Trusted-by panel: heading, glass tiles, avatar / awards / portrait cards with counters."],
    ],
    tree: (slug) => `${slug}-project/
  package.json         react, react-dom, vite
  vite.config.js
  index.html
  README.md            the same instructions as on this page
  src/
    main.jsx           mounts <App />
    App.jsx            renders <Landing />
    landing/${slug}/
      Landing.jsx      the page: renders the sections in order
      content.js       every word, link and image URL
      theme.css        every colour and both fonts
      landing.css      layout, sizes, hover and phone rules
      hooks.js         load animation, parallax, count-up, scroll fill
      sections/
        Hero.jsx  Bar.jsx  Statement.jsx  TrustPanel.jsx`,
    changes: [
      ["Text, links, dates, stats, partner names", "content.js"],
      ["Images (hero, cards, 8 avatars)", "images in content.js — a URL, or a file in /public like \"/images/hero.webp\""],
      ["All colours and both fonts", "theme.css"],
      ["Overall scale", "--u at the top of landing.css"],
      ["Layout or motion of one section", "that section's file in sections/ and its block in landing.css"],
    ],
    how: [
      "Every size is written on a 1440px-wide artboard and scales with the window up to 1920px (the unit --u). At 760px and under the phone layout takes over, and at 325px it still fits without sideways scrolling.",
      "Motion: the title lines rise, the photo un-blurs, the hero fades in in sequence and the stats count up; the photo drifts as you scroll, the statement words fill from grey to white, and the Trusted-by counters and avatars start when the panel comes into view. Everything is shown finished for visitors who prefer reduced motion.",
      "Hover: the nav pill slides, buttons and cards lift, and the Out Now image zooms while its arrow turns.",
      "All names and logos in the page are made up.",
    ],
    fonts: "Inter Tight and Archivo load from Google Fonts through one @import at the top of landing.css.",
  },
];

export const getLandingPage = (slug) => landingPages.find((p) => p.slug === slug);

/** The template's own source files as { "src/landing/<slug>/…": text }, loaded only when the ZIP is built. */
export async function loadLandingFiles(slug) {
  const out = {};
  const prefix = `./${slug}/`;
  await Promise.all(
    Object.entries(sources)
      .filter(([p]) => p.startsWith(prefix))
      .map(async ([p, load]) => {
        out[`src/landing/${slug}/${p.slice(prefix.length)}`] = await load();
      })
  );
  return out;
}
