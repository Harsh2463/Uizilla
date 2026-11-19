import { createZip, downloadBlob } from "./zip.js";
import { loadLandingFiles } from "./registry.js";
import { editors, patchTheme, same, toContentSource } from "./editors.js";

// The files around a template that make the ZIP a complete, runnable project.

const clean = (v) => v.replace(/^\^?/, "");
const depsOf = (page) => Object.fromEntries(page.deps.map(([n, v]) => [n, v.startsWith("^") ? v : `^${clean(v)}.0.0`]));

const packageJson = (page) =>
  JSON.stringify(
    {
      name: `${page.slug}-project`,
      private: true,
      version: "1.0.0",
      type: "module",
      scripts: { dev: "vite", build: "vite build", preview: "vite preview" },
      dependencies: depsOf(page),
      devDependencies: { "@vitejs/plugin-react": "^4.3.4", vite: "^6.0.0" },
    },
    null,
    2
  ) + "\n";

const viteConfig = `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({ plugins: [react()] });
`;

const indexHtml = (name) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${name}</title>
    <style>
      html { scroll-behavior: smooth; }
      body { margin: 0; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`;

const mainJsx = `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
`;

const appJsx = (slug) => `import Landing from "./landing/${slug}/Landing.jsx";

export default function App() {
  return <Landing />;
}
`;

const installLine = (page) => {
  const extra = page.deps.map(([n]) => n).filter((n) => n !== "react" && n !== "react-dom");
  return extra.length ? `npm install react react-dom ${extra.join(" ")}` : "npm install react react-dom";
};

export const readme = (page) => `# ${page.name}

${page.description}

## Run it as its own project

\`\`\`bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
\`\`\`

## Use it inside an existing project

1. Install what it needs: \`${installLine(page)}\`
2. Copy the folder \`src/landing/${page.slug}/\` into your project (anywhere under \`src/\`).
3. Render it:

   \`\`\`jsx
   import Landing from "./landing/${page.slug}/Landing.jsx";

   export default function Home() {
     return <Landing />;
   }
   \`\`\`

   The component imports its own CSS, so nothing else is wired up. It needs React 18 and a bundler that
   handles \`import "./x.css"\` (Vite, Next.js, CRA, Remix, Parcel...).
4. Next.js (App Router): add \`"use client";\` as the first line of every .jsx file in the folder (they use hooks).
   Next.js (Pages Router) and CRA need no change.

All styles are scoped under one class, so they will not touch the rest of your site.

## Packages

${page.deps.map(([n, v, d]) => `- \`${n}\` ${v} — ${d}`).join("\n")}

${page.fonts}

## Change the content, images and colours

| What | Where |
| --- | --- |
${page.changes.map(([a, b]) => `| ${a} | ${b} |`).join("\n")}

You can also pass your own object: \`<Landing content={myContent} />\` (same shape as \`content.js\`).

## Folder map

\`\`\`
${page.tree(page.slug)}
\`\`\`

## How it is built

${page.how.map((h) => `- ${h}`).join("\n")}
`;

/** Builds the whole project as a ZIP and downloads it. `edits` ({ content, vars, defaultVars }) from the
 * editor are written into content.js and theme.css, so the ZIP holds exactly what the preview shows. */
export async function downloadProject(page, edits) {
  const files = await loadLandingFiles(page.slug);
  const editor = editors[page.slug];
  if (edits && editor) {
    const base = `src/landing/${page.slug}/`;
    const original = await editor.loadContent();
    if (edits.content && !same(edits.content, original)) files[base + "content.js"] = toContentSource(edits.content);
    const changed = Object.fromEntries(Object.entries(edits.vars || {}).filter(([k, v]) => edits.defaultVars?.[k] !== v));
    if (Object.keys(changed).length && files[base + "theme.css"]) files[base + "theme.css"] = patchTheme(files[base + "theme.css"], changed);
  }
  const root = `${page.slug}-project`;
  const all = {
    "package.json": packageJson(page),
    "vite.config.js": viteConfig,
    "index.html": indexHtml(page.name),
    "README.md": readme(page),
    ".gitignore": "node_modules\ndist\n",
    "src/main.jsx": mainJsx,
    "src/App.jsx": appJsx(page.slug),
    ...files,
  };
  const prefixed = Object.fromEntries(Object.entries(all).map(([k, v]) => [`${root}/${k}`, v]));
  downloadBlob(`${root}.zip`, createZip(prefixed));
  return Object.keys(prefixed);
}
