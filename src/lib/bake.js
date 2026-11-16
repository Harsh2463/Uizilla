// Writes edited values into the component source as its default prop values.
// The original files are never touched: this only builds a new string.

const serialize = (v) => {
  if (Array.isArray(v) && v.every((x) => typeof x === "string")) {
    return `[\n${v.map((x) => `    ${JSON.stringify(x)},`).join("\n")}\n  ]`;
  }
  if (Array.isArray(v)) {
    // Image / product entries: every field is kept, written as plain JS objects.
    return `[\n${v
      .map((x) =>
        JSON.stringify(x, null, 2)
          .split("\n")
          .map((l) => `    ${l}`)
          .join("\n")
      )
      .join(",\n")},\n  ]`;
  }
  if (typeof v === "string") return JSON.stringify(v);
  return String(v);
};

export function bakeDefaults(source, controls, values) {
  let out = source;
  for (const ctl of controls) {
    const next = values[ctl.key];
    if (JSON.stringify(next) === JSON.stringify(ctl.default)) continue;
    const re = new RegExp(`^(\\s{2}${ctl.key}\\s*=\\s*)(.+?)(,\\s*)$`, "m");
    if (!re.test(out)) throw new Error(`Could not set "${ctl.key}" in source`);
    out = out.replace(re, (_, a, __, c) => `${a}${serialize(next)}${c}`);
  }
  return out;
}

export function downloadFile(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
