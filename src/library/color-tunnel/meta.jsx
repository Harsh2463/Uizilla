import ColorTunnel, { DEFAULT_COLORS, DEFAULT_TEXTS, VARIANTS } from "./ColorTunnel.jsx";
import source from "./ColorTunnel.jsx?raw";


const baseControls = [
    { key: "texts", label: "Words", type: "words", noun: "Words", default: DEFAULT_TEXTS },
    { key: "colors", label: "Palette", type: "colors", noun: "Colors", default: DEFAULT_COLORS },
    { key: "showText", label: "Show Words", type: "toggle", default: true },
    { key: "textSize", label: "Word Size", unit: "%", type: "number", min: 5, max: 100, step: 1, default: 40 },
    { key: "fontFamily", label: "Font", type: "text", default: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
    { key: "fontWeight", label: "Weight", type: "number", min: 100, max: 900, step: 100, default: 800 },
    { key: "uppercase", label: "Uppercase", type: "toggle", default: true },
    { key: "autoContrast", label: "Auto Contrast", type: "toggle", default: true },
    { key: "textColor", label: "Word Color", type: "color", default: "#FFFFFF" },
    { key: "gradient", label: "Blend", type: "number", min: 0, max: 100, step: 1, default: 35 },
    { key: "speed", label: "Speed", type: "number", min: 0, max: 200, step: 1, default: 50 },
    { key: "scale", label: "Scale", type: "number", min: 10, max: 200, step: 1, default: 50 },
    { key: "cardsPerRing", label: "Cards per Ring", type: "number", min: 3, max: 24, step: 1, default: 4 },
    { key: "gap", label: "Gap", type: "number", min: 0, max: 90, step: 1, default: 10 },
    { key: "rowGap", label: "Row Gap", type: "number", min: 0, max: 95, step: 1, default: 20 },
    { key: "rounded", label: "Rounded", type: "number", min: 0, max: 100, step: 1, default: 12 },
    { key: "depthFade", label: "Depth Fade", type: "number", min: 0, max: 100, step: 1, default: 95 },
    { key: "depthSpread", label: "Depth Spread", type: "number", min: 0, max: 100, step: 1, default: 90 },
    { key: "background", label: "Background", type: "color", default: "#0A0A12" },
    { key: "periodMs", label: "Flow Period", unit: "ms", type: "number", min: 500, max: 20000, step: 100, default: 6000 },
    { key: "spinDeg", label: "Spin", unit: "°/s", type: "number", min: -90, max: 90, step: 1, default: 6 },
    { key: "twist", label: "Twist", type: "number", min: 0, max: 200, step: 1, default: 50 },
    { key: "ringCount", label: "Rings", type: "number", min: 2, max: 12, step: 1, default: 7 },
    { key: "ringRatio", label: "Ring Ratio", type: "number", min: 105, max: 300, step: 1, default: 170 },
    { key: "nearRing", label: "Near Ring", type: "number", min: 10, max: 400, step: 1, default: 188 },
    { key: "fov", label: "Field of View", unit: "°", type: "number", min: 20, max: 120, step: 1, default: 70 },
    { key: "vanishY", label: "Vanish Y", type: "number", min: -50, max: 50, step: 1, default: 0 },
    { key: "fadeIn", label: "Fade In", type: "number", min: 1, max: 100, step: 1, default: 25 },
    { key: "edgeShade", label: "Edge Shade", type: "number", min: 0, max: 100, step: 1, default: 25 },
    { key: "rimOpacity", label: "Rim Opacity", type: "number", min: 0, max: 100, step: 1, default: 15 },
    { key: "rimWidth", label: "Rim Width", unit: "px", type: "number", min: 0.5, max: 8, step: 0.5, default: 1 },
    { key: "saturation", label: "Saturation", type: "number", min: 0, max: 200, step: 1, default: 100 },
    { key: "hover", label: "Hover", type: "number", min: 0, max: 200, step: 1, default: 100 },
    { key: "hoverTilt", label: "Hover Tilt", unit: "°", type: "number", min: 0, max: 30, step: 1, default: 6 },
    { key: "hoverSlow", label: "Hover Slow", type: "number", min: 0, max: 100, step: 1, default: 60 },
    { key: "pressBoost", label: "Press Boost", type: "number", min: 0, max: 600, step: 1, default: 295 },
    { key: "followMs", label: "Follow", unit: "ms", type: "number", min: 10, max: 1500, step: 10, default: 350 },
    { key: "segments", label: "Curve Detail", type: "number", min: 4, max: 64, step: 1, default: 24 },
    { key: "grain", label: "Grain", type: "number", min: 0, max: 100, step: 1, default: 0 },
    { key: "vignette", label: "Vignette", type: "number", min: 0, max: 100, step: 1, default: 0 },
  ];

// Picking a variant sets every control it names in one go. "night" restores the
// defaults of exactly the controls "studio" changes.
const studioKeys = Object.keys(VARIANTS.studio);
const controls = [
  {
    key: "variant",
    label: "Variant",
    type: "select",
    options: [
      ["night", "Night"],
      ["studio", "Studio"],
    ],
    default: "night",
    presets: {
      night: Object.fromEntries(studioKeys.map((k) => [k, baseControls.find((c) => c.key === k).default])),
      studio: VARIANTS.studio,
    },
  },
  ...baseControls,
];

export default {
  slug: "color-tunnel",
  name: "Color Tunnel",
  tag: "Carousel",
  file: "ColorTunnel.jsx",
  source,
  Component: ColorTunnel,
  description:
    "Rings of curved colour cards flowing out of a tunnel, each carrying a word that bends round the tunnel with the card. Hover to tilt and slow it, press to speed it up.",
  render: () => <ColorTunnel />,
  usage: `import ColorTunnel from "./ColorTunnel";

// variant is "night" (the default) or "studio"; anything else you pass overrides it.
// The tunnel fills its parent, so give the parent a height.
<div style={{ height: 640 }}>
  <ColorTunnel
    variant="studio"
    colors={["#FF5A5F", "#FFB400", "#12B886", "#7B61FF"]}
    texts={["Create", "Play", "Dream", "Build"]}
    speed={60}
  />
</div>`,
  // Editor sidebar. `default` must match the default in ColorTunnel.jsx.
  controls,
  props: [
    ["variant", '"night" | "studio"', '"night"', "A ready-made look. \"night\" is the dark default; \"studio\" is a pale grey room with six cards a ring, angular facets, boosted colour, grain and a vignette. Anything else you pass overrides the variant."],
    ["texts", "string[]", "12 words", "The words on the cards. They wrap round, and move on one place each time the palette comes round."],
    ["colors", "string[]", "12 colours", "The palette the cards take turns in. Each card also blends a little into the next colour."],
    ["showText", "boolean", "true", "Show the words."],
    ["textSize", "number", "40", "Word size as a % of the card's height. Long words and phrases shrink to fit and wrap."],
    ["fontFamily", "string", '"\'Helvetica Neue\', Helvetica, Arial, sans-serif"', "CSS font stack for the words. It must already be available on the page."],
    ["fontWeight", "number", "800", "Weight of the words, 100–900."],
    ["uppercase", "boolean", "true", "Set the words in capitals."],
    ["autoContrast", "boolean", "true", "Pick dark or light words per card so they stay readable on any colour."],
    ["textColor", "string", '"#FFFFFF"', "Word colour when Auto Contrast is off."],
    ["gradient", "number", "35", "How far each card blends into the next palette colour, 0–100. 0 is flat colour."],
    ["speed", "number", "50", "How fast the tunnel flows. 0 stops it."],
    ["scale", "number", "50", "Overall size of the tunnel."],
    ["cardsPerRing", "number", "4", "Cards in each ring, 3–24."],
    ["gap", "number", "10", "Space between cards round a ring, 0–90."],
    ["rowGap", "number", "20", "Space between rings, 0–95."],
    ["rounded", "number", "12", "Corner rounding, 0–100."],
    ["depthFade", "number", "95", "How dark the far rings go, 0–100. Higher makes the tunnel read as deeper."],
    ["depthSpread", "number", "90", "How far the fade reaches towards you, 0–100. Low keeps the near rings bright and darkens only the far end; high grades the dark across every ring."],
    ["background", "string", '"#0A0A12"', "Background colour."],
    ["periodMs", "number", "6000", "Milliseconds for one ring to flow to the place of the next, at speed 50."],
    ["spinDeg", "number", "6", "Rotation of the whole tunnel in degrees per second."],
    ["twist", "number", "50", "How far each ring is turned against the one before it."],
    ["ringCount", "number", "7", "Rings in view, 2–12. More rings make a longer tunnel."],
    ["ringRatio", "number", "170", "Size ratio from one ring to the next, as a %."],
    ["nearRing", "number", "188", "Size of the nearest ring."],
    ["fov", "number", "70", "Field of view in degrees."],
    ["vanishY", "number", "0", "Moves the vanishing point up or down."],
    ["fadeIn", "number", "25", "How gently new rings appear at the far end."],
    ["edgeShade", "number", "25", "Darkening along each card's far edge."],
    ["rimOpacity", "number", "15", "Opacity of the thin light rim round each card."],
    ["rimWidth", "number", "1", "Width of that rim in px."],
    ["saturation", "number", "100", "Colour saturation as a %."],
    ["hover", "number", "100", "Strength of the pointer response (tilt, slow-down, press boost). 0 switches it off."],
    ["hoverTilt", "number", "6", "How far the tunnel tilts towards the pointer, in degrees."],
    ["hoverSlow", "number", "60", "How much the spin slows while the pointer is over it."],
    ["pressBoost", "number", "295", "How much faster it flows while pressed."],
    ["followMs", "number", "350", "How long the tilt takes to catch up with the pointer."],
    ["segments", "number", "24", "Strips per card; more makes the curve smoother."],
    ["grain", "number", "0", "Film grain over the top, 0–100."],
    ["vignette", "number", "0", "Dark edges, 0–100."],
    ["style", "CSSProperties", "undefined", "Extra styles for the outer wrapper."],
  ],
};
