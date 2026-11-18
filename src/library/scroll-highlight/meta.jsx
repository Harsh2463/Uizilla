import ScrollHighlight from "./ScrollHighlight.jsx";
import source from "./ScrollHighlight.jsx?raw";

const POSITIONS = [
  ["top top", "Text top → screen top"],
  ["top center", "Text top → screen middle"],
  ["top bottom", "Text top → screen bottom"],
  ["center top", "Text middle → screen top"],
  ["center center", "Text middle → screen middle"],
  ["center bottom", "Text middle → screen bottom"],
  ["bottom top", "Text bottom → screen top"],
  ["bottom center", "Text bottom → screen middle"],
  ["bottom bottom", "Text bottom → screen bottom"],
];

export default {
  slug: "scroll-highlight",
  name: "Scroll Text Highlight",
  tag: "Scroll",
  file: "ScrollHighlight.jsx",
  source,
  Component: ScrollHighlight,
  description:
    "A paragraph that lights up word by word, or letter by letter, as you scroll through it. Tied to the scroll so it dims again on the way back, or played once when it comes into view. It scrolls inside its own box or follows the page.",
  // Rendered on the home page card and on the component page.
  render: ({ interactive = true } = {}) => <ScrollHighlight interactive={interactive} />,
  usage: `import ScrollHighlight from "./ScrollHighlight";

// "container" mode scrolls inside its own box, so give it a height.
<div style={{ height: 520 }}>
  <ScrollHighlight
    text="Every detail matters."
    splitBy="words"
    scrollStart="top center"
    scrollEnd="bottom center"
  />
</div>

// "page" mode follows the page's own scroll:
<ScrollHighlight scrollMode="page" text="Light up as the page scrolls." />`,
  // Editor sidebar. `default` must match the default in ScrollHighlight.jsx.
  controls: [
    {
      key: "text", label: "Text", type: "text",
      default: "Every detail matters. Small interactions shape perception, build trust, and transform ordinary experiences into memorable ones.",
    },
    { key: "fontFamily", label: "Font (installed on the page)", type: "text", default: "Inter" },
    {
      key: "fontWeight", label: "Font Weight", type: "select", default: "600",
      options: [["300", "Light"], ["400", "Regular"], ["500", "Medium"], ["600", "Semibold"], ["700", "Bold"], ["900", "Black"]],
    },
    { key: "fontSize", label: "Font Size", unit: "px", type: "number", min: 16, max: 160, step: 1, default: 60 },
    { key: "letterSpacing", label: "Letter Spacing", unit: "em", type: "number", min: -0.1, max: 0.4, step: 0.005, default: -0.025 },
    { key: "lineHeight", label: "Line Height", unit: "em", type: "number", min: 0.8, max: 2.2, step: 0.05, default: 1.1 },
    {
      key: "textAlign", label: "Alignment", type: "select", default: "left",
      options: [["left", "Left"], ["center", "Center"], ["right", "Right"]],
    },
    { key: "dimColor", label: "Unlit Color", type: "color", default: "#FFFFFF" },
    { key: "dimOpacity", label: "Unlit Visibility", unit: "%", type: "number", min: 0, max: 100, step: 1, default: 15 },
    { key: "highlightColor", label: "Lit Color", type: "color", default: "#FFFFFF" },
    { key: "background", label: "Background", type: "color", default: "#0B0B0B" },
    {
      key: "splitBy", label: "Light Up", type: "select", default: "words",
      options: [["words", "Word by word"], ["characters", "Letter by letter"]],
    },
    { key: "scrollStart", label: "Start When", type: "select", default: "top center", options: POSITIONS },
    { key: "scrollEnd", label: "Finish When", type: "select", default: "bottom center", options: POSITIONS },
    { key: "scrub", label: "Tied To Scroll", type: "toggle", default: true },
    { key: "smoothing", label: "Scroll Smoothing", unit: "s", type: "number", min: 0, max: 1.5, step: 0.05, default: 0.2 },
    { key: "duration", label: "Play Time (if not tied)", unit: "s", type: "number", min: 0.2, max: 6, step: 0.1, default: 1.2 },
    {
      key: "scrollMode", label: "Scrolls", type: "select", default: "container",
      options: [["container", "Inside its own box"], ["page", "With the page"]],
    },
    { key: "spacing", label: "Blank Scroll Room", unit: "%", type: "number", min: 0, max: 300, step: 5, default: 100 },
  ],
  props: [
    ["text", "string", "a short paragraph", "The paragraph that lights up."],
    ["fontFamily / fontWeight / fontSize", "string / string / number", '"Inter" / "600" / 60', "Type settings. The font must already be available on the page."],
    ["letterSpacing / lineHeight / textAlign", "number / number / string", '-0.025 / 1.1 / "left"', "Letter spacing and line height in em, and where the text sits."],
    ["dimColor / dimOpacity", "string / number", '"#FFFFFF" / 15', "The colour of unlit text and how visible it is (0–100)."],
    ["highlightColor", "string", '"#FFFFFF"', "The colour words reach when lit. Words blend smoothly from the unlit colour to this one."],
    ["background", "string", '"#0B0B0B"', "Background colour of the box."],
    ["splitBy", '"words" | "characters"', '"words"', "Light up whole words in sequence, or every letter."],
    ["scrollStart / scrollEnd", "string", '"top center" / "bottom center"', 'Two lines, each "<point on the text> <point on the screen>", where a point is top, center or bottom. It starts when the first line is reached and finishes at the second: "top center" is the top of the text reaching the middle of the screen.'],
    ["scrub / smoothing", "boolean / number", "true / 0.2", "When on, the highlight follows the scroll exactly (smoothing is the seconds it takes to catch up) and dims again going back. When off, it plays once on reaching the start line and winds back if you scroll above it."],
    ["duration", "number", "1.2", "How long the highlight takes to play when it is not tied to scroll (seconds)."],
    ["scrollMode", '"container" | "page"', '"container"', "container: the component scrolls inside its own box (give it a height). page: it grows to its content and follows the page's scroll."],
    ["spacing", "number", "100", "Blank scroll room above and below the text, as a percentage of the box (or window) height, so the text can scroll fully through the trigger lines."],
    ["interactive", "boolean", "true", "Accepted for consistency with the other components."],
    ["style", "CSSProperties", "{}", "Extra styles for the outer wrapper."],
  ],
};
