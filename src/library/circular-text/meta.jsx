import CircularText from "./CircularText.jsx";
import source from "./CircularText.jsx?raw";

export default {
  slug: "circular-text",
  name: "Circular Text",
  tag: "Text",
  file: "CircularText.jsx",
  source,
  Component: CircularText,
  description:
    "Words set round a ring that turns slowly. The text repeats and the gaps stretch so it closes on itself with no seam. On hover it can speed up, stop, or shrink with a spring.",
  // Rendered on the home page card (it plays itself) and on the component page.
  render: ({ interactive = true } = {}) => <CircularText interactive={interactive} />,
  usage: `import CircularText from "./CircularText";

// Fills its parent, so give the parent a size.
<div style={{ height: 420 }}>
  <CircularText
    words={["DESIGN", "BUILD", "SHIP"]}
    separator="✦"
    diameter={360}
    onHover="pause"
  />
</div>`,
  // Editor sidebar. `default` must match the default in CircularText.jsx.
  controls: [
    { key: "words", label: "Words", type: "words", noun: "words", default: ["RING", "TEXT"] },
    { key: "separator", label: "Separator Symbol", type: "text", default: "⁕" },
    { key: "diameter", label: "Ring Diameter", unit: "px", type: "number", min: 100, max: 800, step: 1, default: 320 },
    { key: "fontFamily", label: "Font (installed on the page)", type: "text", default: "Inter" },
    {
      key: "fontWeight", label: "Font Weight", type: "select", default: "700",
      options: [["300", "Light"], ["400", "Regular"], ["500", "Medium"], ["700", "Bold"], ["900", "Black"]],
    },
    { key: "fontSize", label: "Font Size", unit: "px", type: "number", min: 8, max: 80, step: 1, default: 24 },
    { key: "letterSpacing", label: "Min Letter Spacing", unit: "px", type: "number", min: 0, max: 30, step: 0.5, default: 0.5 },
    { key: "color", label: "Text Color", type: "color", default: "#FFFFFF" },
    { key: "background", label: "Background", type: "color", default: "#0B0B0B" },
    { key: "spinDuration", label: "Seconds Per Turn", unit: "s", type: "number", min: 0, max: 60, step: 0.5, default: 20 },
    { key: "spinDelay", label: "Start Delay", unit: "s", type: "number", min: 0, max: 10, step: 0.1, default: 0 },
    { key: "reverse", label: "Reverse Direction", type: "toggle", default: false },
    {
      key: "onHover", label: "On Hover", type: "select", default: "speed",
      options: [["speed", "Speed up"], ["pause", "Pause"], ["scale", "Speed up and shrink"]],
    },
    { key: "hoverSpeed", label: "Hover Seconds Per Turn", unit: "s", type: "number", min: 1, max: 8, step: 0.5, default: 8 },
    { key: "hoverScale", label: "Hover Scale", type: "number", min: 0.3, max: 1.3, step: 0.05, default: 0.8 },
  ],
  props: [
    ["words", "string[]", '["RING", "TEXT"]', "The words set round the ring (up to 10). They are repeated, with the separator between them, until the ring is covered."],
    ["separator", "string", '"⁕"', "The symbol placed between words."],
    ["diameter", "number", "320", "Ring size in px. It shrinks to fit if its box is smaller."],
    ["fontFamily / fontWeight / fontSize", "string / string / number", '"Inter" / "700" / 24', "Type settings. The font must already be available on the page."],
    ["letterSpacing", "number", "0.5", "Minimum gap between letters in px. It is only exceeded to close the ring exactly, never squeezed below."],
    ["color / background", "string", '"#FFFFFF" / "#0B0B0B"', "Text colour and the colour of the box."],
    ["spinDuration / spinDelay", "number", "20 / 0", "Seconds for one full turn (0 stops it) and how long to wait before it starts."],
    ["reverse", "boolean", "false", "Turn the other way."],
    ["onHover", '"speed" | "pause" | "scale"', '"speed"', "What the cursor does: spin faster, stop the ring, or spin faster while it shrinks."],
    ["hoverSpeed / hoverScale", "number", "8 / 0.8", "Seconds per turn while hovered (1–8), and the size it springs to for the scale effect."],
    ["interactive", "boolean", "true", "Turn off the hover behaviour (used for the home-page card)."],
    ["style", "CSSProperties", "{}", "Extra styles for the outer wrapper."],
  ],
};
