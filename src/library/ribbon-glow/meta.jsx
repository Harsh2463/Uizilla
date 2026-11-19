import RibbonGlow from "./RibbonGlow.jsx";
import source from "./RibbonGlow.jsx?raw";

export default {
  slug: "ribbon-glow",
  name: "Ribbon Glow",
  tag: "WebGL",
  file: "RibbonGlow.jsx",
  source,
  Component: RibbonGlow,
  description:
    "Flowing, glowing ribbons of light drawn by a WebGL2 shader. The ribbons slowly breathe and twist, and the pointer swirls and drags them as it moves over the section. Two colours blend along every ribbon over a background colour of your choice, and you can set the speed, scale, angle and how strongly the pointer pulls them.",
  // Rendered on the home page card (it plays itself) and on the component page.
  render: () => <RibbonGlow />,
  usage: `import RibbonGlow from "./RibbonGlow";

// Fills its parent, so give the parent a height.
<div style={{ height: 480 }}>
  <RibbonGlow
    background="#0B0A10"
    color1="#2FD3F2"
    color2="#7B61FF"
    speed={50}
    hover={100}
  />
</div>`,
  // Editor sidebar. `default` must match the default in RibbonGlow.jsx.
  controls: [
    { key: "background", label: "Background", type: "color", default: "#0B0A10" },
    { key: "color1", label: "Ribbon Colour 1", type: "color", default: "#2FD3F2" },
    { key: "color2", label: "Ribbon Colour 2", type: "color", default: "#7B61FF" },
    { key: "speed", label: "Speed", type: "number", min: 0, max: 100, step: 1, default: 50 },
    { key: "size", label: "Scale", unit: "%", type: "number", min: 50, max: 200, step: 1, default: 100 },
    { key: "angle", label: "Rotation", unit: "°", type: "number", min: -180, max: 180, step: 1, default: -180 },
    { key: "hover", label: "Pointer Pull", unit: "%", type: "number", min: 0, max: 200, step: 1, default: 100 },
    { key: "reach", label: "Pointer Reach", unit: "px", type: "number", min: 10, max: 800, step: 10, default: 240 },
  ],
  props: [
    ["background", "string", '"#0B0A10"', "Background colour. Dark colours let the ribbons glow as light; a light colour (roughly #A0A0A0 and above) switches them to a pigment look."],
    ["color1 / color2", "string", '"#2FD3F2" / "#7B61FF"', "The two colours blended along each ribbon. Hex, rgb() and hsl() all work."],
    ["speed", "number", "50", "How fast the ribbons flow, 0 to 100. 0 is a still frame."],
    ["size", "number", "100", "Scale of the ribbon pattern in percent, 50 to 200."],
    ["angle", "number", "-180", "Rotation of the pattern in degrees, -180 to 180 (positive turns clockwise)."],
    ["hover", "number", "100", "How strongly the pointer swirls and drags the ribbons, 0 to 200. 0 turns the effect off."],
    ["reach", "number", "240", "How far around the pointer the swirl reaches, in px."],
    ["style", "CSSProperties", "{}", "Extra styles for the outer wrapper."],
    ["— Dependencies —", "runtime", "—", "React 18 (npm) and the browser's WebGL2. Nothing else is loaded. Without WebGL2 it shows just the background colour. It pauses while off screen or in a hidden tab."],
  ],
};
