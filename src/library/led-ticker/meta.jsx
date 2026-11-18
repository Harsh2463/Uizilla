import LEDTicker from "./LEDTicker.jsx";
import source from "./LEDTicker.jsx?raw";

export default {
  slug: "led-ticker",
  name: "Pixel LED Display",
  tag: "Marquee",
  file: "LEDTicker.jsx",
  source,
  Component: LEDTicker,
  description:
    "A scrolling dot-matrix LED board. Text runs across a grid of round or square dots with an optional glow and flicker, and the gap between phrases can be a pixel icon like a star, heart or bolt.",
  // Rendered on the home page card (it plays itself) and on the component page.
  render: () => <LEDTicker />,
  usage: `import LEDTicker from "./LEDTicker";

// Fills its parent, so give the parent a height.
<div style={{ height: 240 }}>
  <LEDTicker
    items={["NEW DROP :star: FRIDAY", "LIMITED RUN"]}
    separatorIcon="heart"
    onColor="#FFB000"
    glow
  />
</div>`,
  // Editor sidebar. `default` must match the default in LEDTicker.jsx.
  controls: [
    {
      key: "items", label: "Phrases (use :star: :heart: for icons)", type: "words", noun: "phrases",
      default: ["pixels", "interactions"],
    },
    {
      key: "separatorIcon", label: "Separator", type: "select", default: "text",
      options: [
        ["text", "Custom text"], ["dot", "Dot icon"], ["star", "Star icon"], ["heart", "Heart icon"],
        ["bolt", "Bolt icon"], ["diamond", "Diamond icon"], ["arrow", "Arrow icon"],
        ["smile", "Smile icon"], ["check", "Check icon"], ["plus", "Plus icon"], ["none", "None"],
      ],
    },
    { key: "separator", label: "Custom Separator Text", type: "text", default: ">" },
    { key: "speed", label: "Speed", type: "number", min: 0, max: 120, step: 1, default: 20 },
    {
      key: "direction", label: "Direction", type: "select", default: "right",
      options: [["left", "Scroll left"], ["right", "Scroll right"]],
    },
    { key: "textSize", label: "Text Size", unit: "px", type: "number", min: 10, max: 300, step: 1, default: 33 },
    { key: "dotSize", label: "Dot Size", unit: "px", type: "number", min: 1, max: 40, step: 0.5, default: 4 },
    { key: "dotQuantity", label: "Dot Rows (resolution)", type: "number", min: 1, max: 20, step: 1, default: 10 },
    { key: "spread", label: "Letter Spacing (dots)", type: "number", min: 0, max: 6, step: 1, default: 1 },
    {
      key: "dotShape", label: "Dot Shape", type: "select", default: "round",
      options: [["round", "Round"], ["square", "Square"]],
    },
    { key: "onColor", label: "Lit Dot Color", type: "color", default: "#00FF39" },
    { key: "offColor", label: "Unlit Dot Color", type: "color", default: "#00FF39" },
    { key: "offOpacity", label: "Unlit Dot Visibility", unit: "%", type: "number", min: 0, max: 100, step: 1, default: 0 },
    { key: "background", label: "Background", type: "color", default: "#050505" },
    { key: "glow", label: "Glow", type: "toggle", default: true },
    { key: "glowStrength", label: "Glow Strength", type: "number", min: 0, max: 100, step: 1, default: 100 },
    { key: "glowSize", label: "Glow Size", type: "number", min: 0, max: 100, step: 1, default: 30 },
    { key: "glowMatch", label: "Glow Matches Lit Color", type: "toggle", default: true },
    { key: "glowColor", label: "Glow Color", type: "color", default: "#00FF39" },
    { key: "flicker", label: "Flicker", type: "toggle", default: false },
    { key: "flickerStrength", label: "Flicker Strength", type: "number", min: 0, max: 100, step: 1, default: 100 },
    { key: "flickerSpeed", label: "Flicker Speed", type: "number", min: 0, max: 100, step: 1, default: 54 },
  ],
  props: [
    ["items", "string[]", '["pixels", "interactions"]', "The phrases that scroll, joined by the separator. Letters, digits and common punctuation are supported; icons can be written inline as :star: :heart: :bolt: :dot: :diamond: :arrow: :smile: :check: :plus:."],
    ["separatorIcon", "string", '"text"', "What sits between phrases: your own separator text, a pixel icon (dot, star, heart, bolt, diamond, arrow, smile, check, plus), or none."],
    ["separator", "string", '">"', "The text used when separatorIcon is \"text\"."],
    ["speed", "number", "20", "Dot columns scrolled per second (0 stops it)."],
    ["direction", '"left" | "right"', '"right"', "Which way the text travels."],
    ["textSize", "number", "33", "Height of the text in px. The dot grid is sized to match."],
    ["dotSize", "number", "4", "Diameter (or side) of each dot in px. Bigger than the grid spacing and the dots merge."],
    ["dotQuantity", "number", "10", "How many dot rows tall the board is (1–20). 10 is the classic 7-row display; lower is chunkier, higher is finer."],
    ["spread", "number", "1", "Blank dot columns between letters."],
    ["dotShape", '"round" | "square"', '"round"', "Shape of each dot."],
    ["onColor / offColor / offOpacity", "string / string / number", '"#00FF39" / "#00FF39" / 0', "Lit dot colour, the colour of unlit dots, and how visible those unlit dots are (0 hides them, so only the text shows)."],
    ["background", "string", '"#050505"', "Background colour of the board."],
    ["glow / glowStrength / glowSize", "boolean / number / number", "true / 100 / 30", "A soft halo around lit dots: whether it is on, how bright, and how far it spreads."],
    ["glowMatch / glowColor", "boolean / string", 'true / "#00FF39"', "Use the lit colour for the glow, or switch that off and pick a different glow colour."],
    ["flicker / flickerStrength / flickerSpeed", "boolean / number / number", "false / 100 / 54", "Brightness dips like a worn board: whether it is on, how deep, and how fast."],
    ["style", "CSSProperties", "{}", "Extra styles for the outer wrapper."],
  ],
};
