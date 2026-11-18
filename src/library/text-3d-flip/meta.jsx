import Text3DFlip from "./Text3DFlip.jsx";
import source from "./Text3DFlip.jsx?raw";

export default {
  slug: "text-3d-flip",
  name: "3D Stagger Flip",
  tag: "Text",
  file: "Text3DFlip.jsx",
  source,
  Component: Text3DFlip,
  description:
    "Every letter is a small 3D block that tips over to show a second face, one after another. Flip it on hover, on load or on a loop, from any edge, starting at the first, last or middle letter or at random, with a different colour on the back.",
  // Rendered on the home page card (it loops itself) and on the component page.
  render: ({ interactive = true } = {}) => <Text3DFlip animation={interactive ? undefined : "loop"} interactive={interactive} />,
  usage: `import Text3DFlip from "./Text3DFlip";

// Fills its parent, so give the parent a size.
<div style={{ height: 320 }}>
  <Text3DFlip
    text="STAGGER FLIP"
    animation="hover"
    rotateDirection="left"
    staggerFrom="center"
    flipColor="#FF6A1F"
  />
</div>`,
  // Editor sidebar. `default` must match the default in Text3DFlip.jsx.
  controls: [
    { key: "text", label: "Text", type: "text", default: "STAGGER FLIP" },
    { key: "fontFamily", label: "Font (installed on the page)", type: "text", default: "Inter" },
    {
      key: "fontWeight", label: "Font Weight", type: "select", default: "600",
      options: [["300", "Light"], ["400", "Regular"], ["500", "Medium"], ["600", "Semibold"], ["700", "Bold"], ["900", "Black"]],
    },
    { key: "fontSize", label: "Font Size", unit: "px", type: "number", min: 16, max: 320, step: 1, default: 120 },
    { key: "letterSpacing", label: "Letter Spacing", unit: "em", type: "number", min: -0.2, max: 0.6, step: 0.01, default: -0.02 },
    { key: "lineHeight", label: "Line Height", unit: "em", type: "number", min: 0.7, max: 2, step: 0.05, default: 1 },
    {
      key: "textAlign", label: "Alignment", type: "select", default: "center",
      options: [["left", "Left"], ["center", "Center"], ["right", "Right"]],
    },
    { key: "color", label: "Text Color", type: "color", default: "#FFFFFF" },
    { key: "flipColor", label: "Back Face Color", type: "color", default: "#FF6A1F" },
    { key: "background", label: "Background", type: "color", default: "#0B0B0B" },
    {
      key: "animation", label: "Flip When", type: "select", default: "hover",
      options: [["hover", "On hover"], ["enter", "Once on load"], ["loop", "Loop"]],
    },
    {
      key: "rotateDirection", label: "Flip From", type: "select", default: "top",
      options: [["top", "Top"], ["bottom", "Bottom"], ["left", "Left"], ["right", "Right"]],
    },
    {
      key: "staggerFrom", label: "Stagger Starts At", type: "select", default: "first",
      options: [["first", "First letter"], ["last", "Last letter"], ["center", "Middle"], ["random", "Random"]],
    },
    { key: "staggerDuration", label: "Stagger Gap", unit: "s", type: "number", min: 0, max: 0.4, step: 0.01, default: 0.05 },
    { key: "duration", label: "Flip Duration", unit: "s", type: "number", min: 0.2, max: 3, step: 0.05, default: 0.7 },
    {
      key: "ease", label: "Easing", type: "select", default: "spring",
      options: [["spring", "Springy"], ["easeOut", "Ease out"], ["easeInOut", "Ease in-out"], ["linear", "Linear"]],
    },
    { key: "perspective", label: "Perspective", unit: "px", type: "number", min: 200, max: 2000, step: 10, default: 800 },
    { key: "loopPause", label: "Pause Between Loops", unit: "s", type: "number", min: 0, max: 6, step: 0.1, default: 1 },
  ],
  props: [
    ["text", "string", '"STAGGER FLIP"', "The words. Spaces start a new word that can wrap."],
    ["fontFamily / fontWeight / fontSize", "string / string / number", '"Inter" / "600" / 120', "Type settings. The font must already be available on the page."],
    ["letterSpacing / lineHeight", "number", "-0.02 / 1", "Both in em. The block each letter turns on is one line height tall, so line height changes how deep the flip looks."],
    ["textAlign", '"left" | "center" | "right"', '"center"', "Where the text sits."],
    ["color / flipColor", "string", '"#FFFFFF" / "#FF6A1F"', "Colour of the front face and of the face that turns into view."],
    ["background", "string", '"#0B0B0B"', "Background colour of the box."],
    ["animation", '"hover" | "enter" | "loop"', '"hover"', "Flip when the cursor enters, once when it loads (and whenever the text changes), or again and again."],
    ["rotateDirection", '"top" | "bottom" | "left" | "right"', '"top"', "The edge the letters tip over from."],
    ["staggerFrom / staggerDuration", "string / number", '"first" / 0.05', "Which letter goes first (first, last, center, random) and the delay in seconds between neighbours."],
    ["duration / ease", "number / string", '0.7 / "spring"', "How long each letter takes to turn, and its easing (spring, easeOut, easeInOut, linear)."],
    ["perspective", "number", "800", "Camera distance in px. Lower makes the flip more dramatic."],
    ["loopPause", "number", "1", "Seconds between flips when animation is loop."],
    ["interactive", "boolean", "true", "When false, a hover trigger is ignored (used for the home-page card)."],
    ["style", "CSSProperties", "{}", "Extra styles for the outer wrapper."],
  ],
};
