import HoverImageReveal from "./HoverImageReveal.jsx";
import source from "./HoverImageReveal.jsx?raw";

const u = (id) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&h=1000&q=80`;

const SYSTEM_FONT =
  "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

export default {
  slug: "hover-image-reveal",
  name: "Hover Image Reveal",
  tag: "Interactive",
  file: "HoverImageReveal.jsx",
  source,
  Component: HoverImageReveal,
  description:
    "Big lines of text that roll and dim as you hover them, while an image card follows your cursor and slides in that line's picture. Lay the lines out as stacked rows, or as side-by-side columns with the text running down them, turned 90° or -90°.",
  // Rendered on the home page card (it plays itself) and on the component page.
  render: ({ interactive = true } = {}) => <HoverImageReveal interactive={interactive} />,
  usage: `import HoverImageReveal from "./HoverImageReveal";

const items = [
  { text: "MOUNTAIN LIGHT", src: "/images/1.jpg", link: "/work/1" },
  { text: "ALPINE LAKES", src: "/images/2.jpg" },
];

// Fills its parent, so give the parent a height.
<div style={{ height: 520 }}>
  <HoverImageReveal items={items} layout="columns" textAngle={-90} />
</div>`,
  // Editor sidebar. `default` must match the default in HoverImageReveal.jsx.
  controls: [
    {
      key: "items", label: "Content", type: "images", noun: "Items",
      default: [
        { text: "MOUNTAIN LIGHT", id: "photo-1506744038136-46273834b3fb" },
        { text: "ALPINE LAKES", id: "photo-1469474968028-56623f02e42e" },
        { text: "FOREST TRAILS", id: "photo-1441974231531-c6227db76b6e" },
        { text: "OPEN SKIES", id: "photo-1470071459604-3b5ec3a7fe05" },
        { text: "GOLDEN HOUR", id: "photo-1501785888041-af3ef285b470" },
      ].map((it) => ({ src: u(it.id), text: it.text, link: "" })),
      fields: [
        { key: "text", label: "Text" },
        { key: "link", label: "Link (optional)" },
      ],
    },
    {
      key: "layout", label: "Layout", type: "select", default: "rows",
      options: [["rows", "Rows (stacked)"], ["columns", "Columns (side by side)"]],
    },
    {
      key: "textAngle", label: "Text Direction (Columns)", type: "select", default: "90",
      options: [
        ["90", "Rotated 90° (top to bottom)"],
        ["-90", "Rotated -90° (bottom to top)"],
      ],
    },
    {
      key: "align", label: "Align", type: "select", default: "center",
      options: [["left", "Left"], ["center", "Center"], ["right", "Right"]],
    },
    { key: "fontFamily", label: "Font Family", type: "text", default: SYSTEM_FONT },
    { key: "fontSize", label: "Font Size", unit: "px", type: "number", min: 12, max: 220, step: 1, default: 61 },
    { key: "fontWeight", label: "Font Weight", type: "number", min: 100, max: 900, step: 100, default: 400 },
    { key: "letterSpacing", label: "Letter Spacing", unit: "em", type: "number", min: -0.15, max: 0.3, step: 0.005, default: -0.05 },
    { key: "lineHeight", label: "Line Height", type: "number", min: 0.7, max: 2, step: 0.05, default: 0.9 },
    { key: "gap", label: "Gap", unit: "px", type: "number", min: 0, max: 160, step: 1, default: 30 },
    { key: "imageWidth", label: "Image Width", unit: "px", type: "number", min: 80, max: 700, step: 1, default: 300 },
    { key: "imageHeight", label: "Image Height", unit: "px", type: "number", min: 80, max: 800, step: 1, default: 400 },
    { key: "rounded", label: "Image Radius", unit: "px", type: "number", min: 0, max: 200, step: 1, default: 16 },
    { key: "offsetX", label: "Image Offset X", unit: "px", type: "number", min: -600, max: 600, step: 1, default: 200 },
    { key: "offsetY", label: "Image Offset Y", unit: "px", type: "number", min: -600, max: 600, step: 1, default: 0 },
    { key: "followStrength", label: "Follow Strength", type: "number", min: 0, max: 60, step: 1, default: 0 },
    { key: "rollText", label: "Roll Text on Hover", type: "toggle", default: true },
    { key: "duration", label: "Motion Speed", unit: "s", type: "number", min: 0.05, max: 1.5, step: 0.01, default: 0.5 },
    {
      key: "easing", label: "Motion Curve", type: "select", default: "smooth",
      options: [
        ["smooth", "Smooth"],
        ["easeOut", "Ease Out"],
        ["easeInOut", "Ease In-Out"],
        ["linear", "Linear"],
        ["spring", "Spring"],
      ],
    },
    { key: "fitToContainer", label: "Fit to Container", type: "toggle", default: true },
    { key: "newTab", label: "Links in New Tab", type: "toggle", default: false },
    { key: "textColor", label: "Text Color", type: "color", default: "#FFFFFF" },
    { key: "dimColor", label: "Dim Color", type: "color", default: "#51565A" },
    { key: "backgroundColor", label: "Background", type: "color", default: "#000000" },
  ],
  props: [
    ["items", "{ text: string, src: string, link?: string }[]", "5 sample lines with Unsplash photos", "One entry per line: its text, its picture and an optional link. Add as many as you like."],
    ["layout", '"rows" | "columns"', '"rows"', "Rows stack the lines top to bottom. Columns set them side by side, each written vertically (see `textAngle`)."],
    ["textAngle", "90 | -90", "90", "Direction of the text in the columns layout: 90 turns every letter 90° and reads top to bottom, -90 turns them the other way and reads bottom to top. Ignored in rows."],
    ["align", '"left" | "center" | "right"', '"center"', "Alignment of the text block."],
    ["fontFamily", "string", "system sans-serif", "CSS font-family for the text. Any font already loaded on your page works."],
    ["fontSize", "number", "61", "Text size in px at full size. Shrinks automatically to fit when `fitToContainer` is on."],
    ["fontWeight", "number", "400", "Text weight (100–900)."],
    ["letterSpacing", "number", "-0.05", "Letter spacing in em."],
    ["lineHeight", "number", "0.9", "Line height as a multiple of the font size."],
    ["gap", "number", "30", "Space between lines (rows) or columns, in px."],
    ["imageWidth", "number", "300", "Image card width in px."],
    ["imageHeight", "number", "400", "Image card height in px."],
    ["rounded", "number", "16", "Image card corner radius in px."],
    ["offsetX", "number", "200", "How far right of the cursor the card sits, in px (negative for left)."],
    ["offsetY", "number", "0", "How far below the cursor the card sits, in px (negative for above)."],
    ["followStrength", "number", "0", "How tightly the card chases the cursor. 0 is soft and floaty; higher is snappier."],
    ["rollText", "boolean", "true", "Roll the hovered text up to a copy of itself."],
    ["duration", "number", "0.5", "Seconds the text roll and the picture slide take."],
    ["easing", '"smooth" | "easeOut" | "easeInOut" | "linear" | "spring"', '"smooth"', "Motion curve for the roll and slide. Spring overshoots slightly."],
    ["fitToContainer", "boolean", "true", "Scale the text, gap and card down so everything fits a small container."],
    ["newTab", "boolean", "false", "Open item links in a new tab."],
    ["textColor", "string", '"#FFFFFF"', "Colour of the hovered line (and of all lines when none is hovered)."],
    ["dimColor", "string", '"#51565A"', "Colour of the other lines while one is hovered."],
    ["backgroundColor", "string", '"#000000"', "Background colour."],
    ["interactive", "boolean", "true", "Turn off hover and let the component play itself (used for the home-page card)."],
    ["style", "CSSProperties", "{}", "Extra styles for the outer wrapper."],
  ],
};
