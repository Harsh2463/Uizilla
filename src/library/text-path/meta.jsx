import TextPath from "./TextPath.jsx";
import source from "./TextPath.jsx?raw";

export default {
  slug: "text-path",
  name: "Text Path",
  tag: "Marquee",
  file: "TextPath.jsx",
  source,
  Component: TextPath,
  description:
    "An endless marquee whose text rides along a wave or zigzag. Tilt it in 3D with perspective, stack several rows, and restyle the letters, spacing, colours and the guide line.",
  // Rendered on the home page card (it plays itself) and on the component page.
  render: ({ interactive = true } = {}) => <TextPath interactive={interactive} />,
  usage: `import TextPath from "./TextPath";

// Fills its parent, so give the parent a height.
<div style={{ height: 360 }}>
  <TextPath
    text="FLOW WITH THE WAVE"
    pathShape="wave"
    rotateX={20}
    perspective={900}
    letterSpacing={4}
  />
</div>`,
  // Editor sidebar. `default` must match the default in TextPath.jsx.
  controls: [
    { key: "text", label: "Text", type: "text", default: "TEXT ON A PATH" },
    { key: "separator", label: "Separator", type: "text", default: "   •   " },
    { key: "gap", label: "Gap Around Separator", type: "number", min: 0, max: 20, step: 1, default: 0 },
    { key: "speed", label: "Speed", type: "number", min: 0, max: 100, step: 1, default: 30 },
    { key: "reversed", label: "Reverse Direction", type: "toggle", default: true },
    { key: "alternate", label: "Alternate Rows", type: "toggle", default: false },
    { key: "pauseOnHover", label: "Slow On Hover", type: "toggle", default: true },
    { key: "lines", label: "Rows", type: "number", min: 1, max: 6, step: 1, default: 1 },
    { key: "lineGap", label: "Row Spacing", unit: "px", type: "number", min: 0, max: 300, step: 1, default: 70 },
    {
      key: "pathShape", label: "Path Shape", type: "select", default: "wave",
      options: [["wave", "Wave"], ["zigzag", "Zigzag"]],
    },
    { key: "waveFrequency", label: "Path Frequency", type: "number", min: 0.5, max: 12, step: 0.5, default: 3 },
    { key: "waveHeight", label: "Path Height", unit: "px", type: "number", min: 0, max: 400, step: 1, default: 100 },
    { key: "squareness", label: "Path Squareness", type: "number", min: 0, max: 100, step: 1, default: 0 },
    { key: "fontSize", label: "Font Size", unit: "px", type: "number", min: 8, max: 160, step: 1, default: 40 },
    {
      key: "fontWeight", label: "Font Weight", type: "select", default: "700",
      options: [["300", "Light"], ["400", "Regular"], ["500", "Medium"], ["700", "Bold"], ["900", "Black"]],
    },
    {
      key: "fontFamily", label: "Font", type: "select", default: "sans",
      options: [
        ["sans", "Sans"], ["serif", "Serif"], ["mono", "Mono"],
        ["display", "Display"], ["rounded", "Rounded"],
      ],
    },
    { key: "letterSpacing", label: "Letter Spacing", unit: "px", type: "number", min: -10, max: 40, step: 0.5, default: 0 },
    { key: "textColor", label: "Text Color", type: "color", default: "#F7EDE4" },
    { key: "gradient", label: "Gradient Text", type: "toggle", default: true },
    { key: "textColor2", label: "Gradient End Color", type: "color", default: "#FF7A2F" },
    { key: "outline", label: "Outline Only", type: "toggle", default: false },
    { key: "outlineWidth", label: "Outline Width", unit: "px", type: "number", min: 0.5, max: 8, step: 0.5, default: 1.5 },
    { key: "showPath", label: "Show Path Line", type: "toggle", default: false },
    { key: "pathColor", label: "Path Color", type: "color", default: "#FF7A2F" },
    { key: "pathWidth", label: "Path Width", unit: "px", type: "number", min: 0.5, max: 12, step: 0.5, default: 1.5 },
    { key: "pathOpacity", label: "Path Opacity", type: "number", min: 0, max: 1, step: 0.05, default: 0.6 },
    { key: "background", label: "Background", type: "color", default: "#0B0B0D" },
    { key: "perspective", label: "Perspective", unit: "px", type: "number", min: 200, max: 3000, step: 10, default: 900 },
    { key: "rotateX", label: "Tilt X (Forward / Back)", unit: "°", type: "number", min: -80, max: 80, step: 1, default: 18 },
    { key: "rotateY", label: "Tilt Y (Left / Right)", unit: "°", type: "number", min: -80, max: 80, step: 1, default: 0 },
    { key: "rotateZ", label: "Rotate (Roll)", unit: "°", type: "number", min: -45, max: 45, step: 1, default: 0 },
    { key: "fadeEdges", label: "Edge Fade", unit: "%", type: "number", min: 0, max: 45, step: 1, default: 12 },
  ],
  props: [
    ["text", "string", '"TEXT ON A PATH"', "The line that repeats along the path."],
    ["separator", "string", '"   •   "', "What sits between each repeat of the text."],
    ["gap", "number", "0", "Extra space on both sides of the separator (0–20 characters)."],
    ["speed", "number", "30", "How fast the text flows (0 stops it). About 5 px per second per point."],
    ["reversed", "boolean", "true", "Flip the direction of travel."],
    ["alternate", "boolean", "false", "With several rows, send every other row the opposite way."],
    ["pauseOnHover", "boolean", "true", "Ease the motion to a stop while the cursor is over it."],
    ["lines / lineGap", "number", "1 / 70", "How many rows of text, and the vertical distance between them (px). The wave height shrinks to keep every row inside the box."],
    ["pathShape", '"wave" | "zigzag"', '"wave"', "The curve the text follows."],
    ["waveFrequency", "number", "3", "Full cycles across the visible width."],
    ["waveHeight", "number", "100", "Crest-to-trough height in px. Capped so the glyphs stay inside the box."],
    ["squareness", "number", "0", "Wave only. 0 is a sine; higher flattens the crests and steepens the sides toward a rounded square wave."],
    ["fontSize / fontWeight / fontFamily", "number / string / string", '40 / "700" / "sans"', "Type settings. fontFamily is one of sans, serif, mono, display, rounded."],
    ["letterSpacing", "number", "0", "Extra space between letters in px. Negative tightens."],
    ["textColor / gradient / textColor2", "string / boolean / string", "#F7EDE4 / true / #FF7A2F", "Fill colour; with gradient on, it blends across the width into the second colour."],
    ["outline / outlineWidth", "boolean / number", "false / 1.5", "Draw the letters as an outline only."],
    ["showPath / pathColor / pathWidth / pathOpacity", "boolean / string / number / number", "false / #FF7A2F / 1.5 / 0.6", "Draw the guide curve itself under the text."],
    ["background", "string", '"#0B0B0D"', "Background colour of the box."],
    ["perspective", "number", "900", "Camera distance in px for the 3D tilt. Lower is more dramatic."],
    ["rotateX / rotateY / rotateZ", "number", "18 / 0 / 0", "Tilt the whole piece in degrees: forward-back, left-right, and roll."],
    ["fadeEdges", "number", "12", "Fade the text out toward the left and right edges (% of the width)."],
    ["interactive", "boolean", "true", "Turn off hover behaviour (used for the static home-page card)."],
    ["style", "CSSProperties", "{}", "Extra styles for the outer wrapper."],
  ],
};
