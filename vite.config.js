import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * Two small build helpers for the component library:
 *
 *  1. Every library/<slug>/meta.jsx imports its component's source as raw text
 *     (`import source from "./X.jsx?raw"`). That text is only needed on the
 *     component's own page, so it is swapped for an empty string and exposed
 *     as lazy loaders (`__sources`) the page fetches on demand — the preview
 *     chunk stays small.
 *  2. `virtual:cards` is the light info the home page needs for every card
 *     (slug, name, tag, description), read straight from each meta.jsx, so
 *     the cards never have to download a component just to be listed.
 */
function library() {
  const RAW = /^import (\w+) from "(\.\/[^"]+\?raw)";?[ \t]*$/gm;
  const VIRTUAL = "virtual:cards";
  const RESOLVED = "\0" + VIRTUAL;
  const str = (src, key) => {
    const m = src.match(new RegExp(`\\b${key}:\\s*("(?:[^"\\\\]|\\\\.)*"|\`[^\`]*\`)`));
    if (!m) return "";
    try {
      return m[1][0] === "`" ? m[1].slice(1, -1) : JSON.parse(m[1]);
    } catch {
      return "";
    }
  };
  return {
    name: "motion-library",
    enforce: "pre",
    resolveId(id) {
      return id === VIRTUAL ? RESOLVED : null;
    },
    load(id) {
      if (id !== RESOLVED) return null;
      const dir = path.resolve("src/library");
      const cards = {};
      for (const slug of fs.readdirSync(dir)) {
        const f = path.join(dir, slug, "meta.jsx");
        if (!fs.existsSync(f)) continue;
        this.addWatchFile(f);
        const src = fs.readFileSync(f, "utf8");
        cards[slug] = { slug, name: str(src, "name"), tag: str(src, "tag"), description: str(src, "description") };
      }
      return `export default ${JSON.stringify(cards)};`;
    },
    transform(code, id) {
      if (!/[\\/]library[\\/][^\\/]+[\\/]meta\.jsx$/.test(id)) return null;
      const names = [];
      const out = code.replace(RAW, (_, name, spec) => {
        names.push([name, spec]);
        return `const ${name} = "";`;
      });
      if (!names.length) return null;
      const loaders = names.map(([n, s]) => `${JSON.stringify(n)}: () => import(${JSON.stringify(s)}).then((m) => m.default)`).join(", ");
      return { code: `${out}\nexport const __sources = { ${loaders} };\n`, map: null };
    },
  };
}

export default defineConfig({
  plugins: [library(), react(), tailwindcss()],
});
