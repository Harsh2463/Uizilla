import SmokyText from "./SmokyText.jsx";
import source from "./SmokyText.jsx?raw";

export default {
  slug: "smoky-text",
  name: "Smoky Text",
  tag: "Text",
  file: "SmokyText.jsx",
  source,
  Component: SmokyText,
  description:
    "Letters that condense out of smoke: each one drifts in from the side while a wide glow burns off to a crisp edge. Play it on load, on first hover or when scrolled into view, once or on a loop, with the smoke as light or as heavy as you like.",
  // Rendered on the home page card (it plays itself) and on the component page.
  render: ({ interactive = true } = {}) => <SmokyText interactive={interactive} />,
  usage: `import SmokyText from "./SmokyText";

// Fills its parent, so give the parent a size.
<div style={{ height: 420 }}>
  <SmokyText
    text={"SMOKY\\nTEXT"}
    intensity={12}
    trigger="scroll"
    animationMode="multiLine"
  />
</div>`,
  // Editor sidebar. `default` must match the default in SmokyText.jsx.
  controls: [
    { key: "text", label: "Text (\\n for a line break)", type: "text", default: "SMOKY\\nTEXT" },
    { key: "fontFamily", label: "Font (installed on the page)", type: "text", default: "Inter" },
    {
      key: "fontWeight", label: "Font Weight", type: "select", default: "700",
      options: [["300", "Light"], ["400", "Regular"], ["500", "Medium"], ["700", "Bold"], ["900", "Black"]],
    },
    { key: "fontSize", label: "Font Size", unit: "px", type: "number", min: 16, max: 320, step: 1, default: 120 },
    { key: "letterSpacing", label: "Letter Spacing", unit: "px", type: "number", min: -20, max: 60, step: 1, default: 0 },
    { key: "lineHeight", label: "Line Height", type: "number", min: 0.6, max: 2, step: 0.05, default: 1.1 },
    {
      key: "textAlign", label: "Alignment", type: "select", default: "center",
      options: [["left", "Left"], ["center", "Center"], ["right", "Right"]],
    },
    { key: "color", label: "Text / Smoke Color", type: "color", default: "#F5F5F5" },
    { key: "background", label: "Background", type: "color", default: "#0B0B0B" },
    { key: "intensity", label: "Smoke Intensity", type: "number", min: 1, max: 20, step: 1, default: 10 },
    {
      key: "position", label: "Smoke Comes From", type: "select", default: "bottomLeft",
      options: [["bottomLeft", "Bottom left"], ["topLeft", "Top left"]],
    },
    {
      key: "animationMode", label: "Animation Mode", type: "select", default: "singleLine",
      options: [
        ["singleLine", "One by one"],
        ["multiLine", "Line by line"],
        ["inPlace", "All at once, in place"],
      ],
    },
    { key: "duration", label: "Duration", unit: "s", type: "number", min: 0.5, max: 8, step: 0.1, default: 2 },
    { key: "delay", label: "Start Delay", unit: "s", type: "number", min: 0, max: 5, step: 0.1, default: 0 },
    {
      key: "ease", label: "Easing", type: "select", default: "easeOut",
      options: [["easeOut", "Ease out"], ["easeIn", "Ease in"], ["easeInOut", "Ease in-out"], ["linear", "Linear"], ["spring", "Springy"]],
    },
    {
      key: "trigger", label: "Play When", type: "select", default: "default",
      options: [["default", "On load"], ["hover", "On first hover"], ["scroll", "Scrolled into view"]],
    },
    {
      key: "scrollPosition", label: "Scroll Line From", type: "select", default: "bottom",
      options: [["bottom", "Bottom of window"], ["top", "Top of window"]],
    },
    { key: "scrollDistance", label: "Scroll Line Distance", unit: "%", type: "number", min: 0, max: 100, step: 1, default: 20 },
    { key: "loop", label: "Loop", type: "toggle", default: false },
    { key: "loopPause", label: "Pause Between Loops", unit: "s", type: "number", min: 0, max: 10, step: 0.1, default: 1.5 },
  ],
  props: [
    ["text", "string", '"SMOKY\\nTEXT"', "The words. A literal \\n starts a new line, so it can be typed in a single-line field."],
    ["fontFamily / fontWeight", "string", '"Inter" / "700"', "Typeface and weight. The font must already be available on the page."],
    ["fontSize / letterSpacing / lineHeight", "number", "120 / 0 / 1.1", "Type size and spacing in px, and the line height multiplier."],
    ["textAlign", '"left" | "center" | "right"', '"center"', "Where the text sits in the box."],
    ["color", "string", '"#F5F5F5"', "The colour of the letters and of the smoke around them."],
    ["background", "string", '"#0B0B0B"', "Background colour of the box."],
    ["intensity", "number", "10", "1 is a crisp quick puff; 20 is heavy diffuse smoke that blurs wider, stacks more layers and travels further."],
    ["position", '"bottomLeft" | "topLeft"', '"bottomLeft"', "The side the smoke drifts in from."],
    ["animationMode", '"singleLine" | "multiLine" | "inPlace"', '"singleLine"', "One letter after another; each wrapped line from its own left edge; or all letters together, swelling in place."],
    ["duration / delay", "number", "2 / 0", "How long the whole reveal takes, and how long to wait before it starts (seconds)."],
    ["ease", "string", '"easeOut"', "One of easeOut, easeIn, easeInOut, linear, spring."],
    ["trigger", '"default" | "hover" | "scroll"', '"default"', "Play on load, on the first hover, or when the box is scrolled into view."],
    ["scrollPosition / scrollDistance", '"top" | "bottom" / number', '"bottom" / 20', "For the scroll trigger: the window line it must reach, measured in % from the top or bottom edge."],
    ["loop / loopPause", "boolean / number", "false / 1.5", "Replay the reveal again and again, pausing between plays (seconds)."],
    ["interactive", "boolean", "true", "When false, the trigger is ignored and it plays on load (used for the home-page card)."],
    ["style", "CSSProperties", "{}", "Extra styles for the outer wrapper."],
  ],
};
