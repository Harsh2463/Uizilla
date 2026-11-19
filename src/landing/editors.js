// What can be edited live for each template. `groups` drive the sidebar: every
// field points at a value in the template's content.js (`path`) or at a CSS
// variable in its theme.css (`css`). The edited values are sent to the preview
// and written into the downloaded ZIP.
//
// Field types: text, lines (one per line), list (comma separated), number,
// range (min/max/step), color, toggle, px (a CSS length in px).

const t = (label, path) => ({ label, path, type: "text" });
const lines = (label, path) => ({ label, path, type: "lines" });
const n = (label, path, step = 1) => ({ label, path, type: "number", step });
const range = (label, path, min, max, step = 0.05) => ({ label, path, type: "range", min, max, step });
const color = (label, css) => ({ label, css, type: "color" });

const SPECS = [
  t("Processor", "specs.cpu.name"), n("CPU cores", "specs.cpu.cores"), n("CPU boost (GHz)", "specs.cpu.boost", 0.1),
  t("Graphics", "specs.gpu.name"), n("Video memory (GB, 0 = shared)", "specs.gpu.vram"), n("Graphics power (W)", "specs.gpu.watts"),
  n("Screen size (in)", "specs.display.size", 0.1), t("Resolution", "specs.display.res"), n("Refresh rate (Hz)", "specs.display.hz"), t("Panel", "specs.display.panel"),
  n("Memory (GB)", "specs.memory.size"), t("Memory type", "specs.memory.type"),
  n("Storage (GB)", "specs.storage.size"), t("Storage type", "specs.storage.type"), range("Storage used (%)", "specs.storage.used", 0, 100, 1),
  n("Battery (Wh)", "specs.battery.wh"), n("Battery life (h)", "specs.battery.hours"),
  n("Weight (kg)", "specs.build.kg", 0.05), { label: "Ports (comma separated)", path: "specs.build.ports", type: "list" },
];

export const editors = {
  "motion-laptop": {
    selector: ".ml",
    loadContent: () => import("./motion-laptop/content.js").then((m) => m.content),
    groups: [
      {
        title: "Brand & header",
        fields: [t("Brand name", "brand.name"), t("Brand accent word", "brand.accent"), t("Search placeholder", "header.searchPlaceholder"), t("User name", "header.user")],
      },
      {
        title: "Layout & motion",
        open: true,
        fields: [
          range("Laptop size (desktop)", "layout.productSize", 0.4, 1.6),
          range("Ring size (desktop)", "layout.ringSize", 0.4, 1.6),
          range("Right cards width", "layout.rightSize", 0.75, 1.25),
          { label: "Autoplay", path: "autoplay", type: "toggle" },
          range("Seconds per laptop", "autoplaySeconds", 2, 12, 0.5),
        ],
      },
      {
        title: "Laptops",
        each: { path: "laptops", label: (L) => `${L.brand} ${L.name}` },
        fields: [
          t("Brand", "brand"), t("Name", "name"), t("Kind", "kind"), t("Tagline", "tagline"),
          n("Price ($)", "price"), n("Old price ($, 0 = none)", "was"), n("Rating", "rating", 0.1), t("Reviews", "reviews"),
          range("Performance score", "performance", 0, 100, 1),
          { label: "Accent colour", path: "accent", type: "color" },
          { label: "Background tint 1", path: "tint.0", type: "color" },
          { label: "Background tint 2", path: "tint.1", type: "color" },
          ...SPECS,
        ],
      },
      {
        title: "Card labels",
        fields: [
          t("Add-to-bag button", "summary.cta"), t("After adding", "summary.added"), t("Pick card title", "pick.title"), t("Pick card hint", "pick.hint"), t("Performance title", "score.title"),
          t("Processor label", "specLabels.cpu"), t("Graphics label", "specLabels.gpu"), t("Display label", "specLabels.display"), t("Memory label", "specLabels.memory"),
          t("Storage label", "specLabels.storage"), t("Battery label", "specLabels.battery"), t("Weight & ports label", "specLabels.build"),
        ],
      },
      { title: "Images", fields: [t("Laptop sprite sheet URL", "sheet")] },
      {
        title: "Colours",
        fields: [color("Text", "--ml-ink"), color("Muted text", "--ml-muted"), color("Call-to-action", "--ml-lime"), color("Call-to-action text", "--ml-lime-ink"), { label: "Card corner radius", css: "--ml-radius", type: "px" }],
      },
    ],
  },

  orvante: {
    selector: ".ov",
    loadContent: () => import("./orvante/content.js").then((m) => m.content),
    groups: [
      {
        title: "Hero",
        open: true,
        fields: [
          t("Brand", "brand"), t("Date — day", "date.day"), t("Date — range", "date.range"), t("Contact button", "contact.label"),
          lines("Title lines", "title.lines"), t("Title year tag", "title.year"),
          t("About label", "about.label"), lines("About text", "about.text"), t("About button", "about.button.label"),
          t("Growth pill", "growth"), t("Available — line 1", "available.line1"), t("Available — line 2", "available.line2"),
          n("Partners count", "stats.partners.value"), t("Partners label", "stats.partners.label"), t("Partners button", "stats.partners.button"),
          n("Projects count", "stats.projects.value"), t("Projects label", "stats.projects.label"),
          t("Out Now — eyebrow", "outNow.eyebrow"), t("Out Now — title", "outNow.title"), t("Out Now — year", "outNow.year"),
          { label: "Logos (comma separated)", path: "logos", type: "list" },
        ],
      },
      { title: "Bar", fields: [t("Middle text", "bar.middle"), t("Right text", "bar.right")] },
      {
        title: "Statement",
        fields: [lines("Manifesto (one line each)", "statement"), lines("Sub-line", "statementSub.text"), t("Sub-line accent", "statementSub.accent")],
      },
      {
        title: "Trusted-by panel",
        fields: [
          lines("Heading", "trust.heading"), lines("Paragraph", "trust.text"),
          n("Collaborations", "trust.collaborations.value"), t("Collaborations label", "trust.collaborations.label"),
          n("Awards", "trust.awards.value"), t("Awards label", "trust.awards.label"),
        ],
      },
      {
        title: "Images",
        fields: [t("Hero photo URL", "images.hero"), t("Studio feed card URL", "images.studioFeed"), t("Out Now card URL", "images.outNow"), t("Portrait card URL", "images.portrait")],
      },
      {
        title: "Colours",
        fields: [
          color("Hero background", "--ov-paper"), color("Hero text & buttons", "--ov-ink"), color("Lower sections", "--ov-black"), color("Text on black", "--ov-text"),
          color("Statement start colour", "--ov-grey"), color("Statement end colour", "--ov-fill"), color("Stats frame", "--ov-frame"),
          color("Avatar card", "--ov-card-light"), color("Awards card", "--ov-card-dark"),
        ],
      },
    ],
  },
};

/* ------------------------------------------------------------ path helpers */

export const getIn = (obj, path) => path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);

export function setIn(obj, path, value) {
  const keys = path.split(".");
  const next = Array.isArray(obj) ? obj.slice() : { ...obj };
  let cur = next;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    const child = cur[k];
    cur[k] = Array.isArray(child) ? child.slice() : { ...child };
    cur = cur[k];
  }
  cur[keys[keys.length - 1]] = value;
  return next;
}

export const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** The text of an edited content.js. */
export const toContentSource = (content) =>
  `// Generated by the Templates editor: every word, number and image URL of the page.\n// Edit freely — the sections read everything from here.\n\nexport const content = ${JSON.stringify(content, null, 2)};\n\nexport default content;\n`;

/** theme.css with the edited variables written in (everything else, comments included, stays). */
export function patchTheme(css, vars) {
  let out = css;
  for (const [name, value] of Object.entries(vars)) {
    out = out.replace(new RegExp(`(${name}\\s*:\\s*)([^;]+)(;)`), (_, a, _old, c) => `${a}${value}${c}`);
  }
  return out;
}
