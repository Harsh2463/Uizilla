import SpiralImages from "./SpiralImages.jsx";
import source from "./SpiralImages.jsx?raw";

const IDS = [
  "1713456047285-52a8d18d1912", "1629747387925-6905ff5a558a",
  "1568044853110-277196781802", "1787656235601-d0c3b837ed33",
  "1613698808499-f772ccb4f527", "1626858707111-2fefbc9a848e",
  "1542305983-c4100e4b8cd2", "1720569103781-daf2ecb89e1b",
  "1611938766054-6b4f25b06f2e", "1643059514529-f6689eeba463",
];

export default {
  slug: "spiral-images",
  name: "Spiral Images",
  tag: "Gallery",
  file: "SpiralImages.jsx",
  source,
  Component: SpiralImages,
  description:
    "Pictures ride an evenly spaced spiral from the edge into the centre (or back out), turning to follow the curve, shrinking with distance and fading at the ends. Plain canvas, no libraries.",
  render: () => <SpiralImages />,
  usage: `import SpiralImages from "./SpiralImages";

// It fills its parent, so give the parent a height.
<div style={{ height: 700 }}>
  <SpiralImages
    images={[{ src: "/images/1.jpg" }, { src: "/images/2.jpg" }]}
    turns={4}
    direction="out"
    imageFit="cover"
  />
</div>`,
  // Editor sidebar. `default` must match the default in SpiralImages.jsx.
  controls: [
    {
      key: "images", label: "Content", type: "images", cors: false,
      default: IDS.map((id) => ({
        src: `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&q=80`,
      })),
    },
    { key: "direction", label: "Flow", type: "select", options: [["in","Inward"],["out","Outward"]], default: "in" },
    { key: "spin", label: "Spin", type: "select", options: [["anticlockwise","Anticlockwise"],["clockwise","Clockwise"]], default: "anticlockwise" },
    { key: "speed", label: "Speed", type: "number", min: 0, max: 20, step: 0.1, default: 2 },
    { key: "turns", label: "Turns", type: "number", min: 0.5, max: 12, step: 0.1, default: 3.5 },
    { key: "spacing", label: "Spacing", type: "number", min: 1, max: 20, step: 0.5, default: 5 },
    { key: "spread", label: "Spread", type: "number", min: 1, max: 12, step: 0.1, default: 6 },
    { key: "imageSize", label: "Card Size", unit: "px", type: "number", min: 40, max: 600, step: 1, default: 200 },
    { key: "sizeAttenuation", label: "Shrink", type: "number", min: 0, max: 6, step: 0.1, default: 2 },
    { key: "fadeIn", label: "Fade In", unit: "%", type: "number", min: 0, max: 50, step: 1, default: 20 },
    { key: "fadeOut", label: "Fade Out", unit: "%", type: "number", min: 0, max: 50, step: 1, default: 0 },
    { key: "cornerRadius", label: "Corner Radius", type: "number", min: 0, max: 20, step: 0.5, default: 5 },
    { key: "imageFit", label: "Image Fit", type: "select", options: [["contain","Contain"],["cover","Cover"]], default: "contain" },
    { key: "followPath", label: "Follow Path", type: "toggle", default: true },
    { key: "tilt", label: "Tilt", unit: "°", type: "number", min: -180, max: 180, step: 1, default: 0 },
    { key: "borderWidth", label: "Border", unit: "px", type: "number", min: 0, max: 12, step: 1, default: 0 },
    { key: "borderColor", label: "Border Color", type: "color", default: "#FFFFFF" },
    { key: "hoverSlow", label: "Hover Slow", unit: "%", type: "number", min: 0, max: 100, step: 1, default: 0 },
    { key: "background", label: "Background", type: "color", default: "#000000" },
  ],
  props: [
    ["images", "{ src: string }[]", "10 photos", "The pictures that flow along the spiral, in order, repeating. Any image URL works; no CORS headers needed."],
    ["direction", "string", "\"in\"", "Which way the cards travel: from the edge into the centre, or from the centre out."],
    ["spin", "string", "\"anticlockwise\"", "Which way the spiral winds."],
    ["speed", "number", "2", "How fast the cards flow along the spiral. 0 stops them."],
    ["turns", "number", "3.5", "How many times the spiral winds round."],
    ["spacing", "number", "5", "Gap between cards along the path."],
    ["spread", "number", "6", "How wide the spiral opens; large values run off the frame."],
    ["imageSize", "number", "200", "Size of the nearest, largest card."],
    ["sizeAttenuation", "number", "2", "How much cards shrink towards the centre. 0 keeps them all one size."],
    ["fadeIn", "number", "20", "How much of the path the fade-in takes, as a %."],
    ["fadeOut", "number", "0", "How much of the path the fade-out takes at the other end."],
    ["cornerRadius", "number", "5", "Rounds the corners, 0 to 20 (20 is a full pill or circle)."],
    ["imageFit", "string", "\"contain\"", "Contain keeps each picture in its own shape. Cover fills a square card."],
    ["followPath", "boolean", "true", "Turn each card to follow the curve."],
    ["tilt", "number", "0", "Extra rotation added to every card."],
    ["borderWidth", "number", "0", "Outline width. 0 is none."],
    ["borderColor", "string", "\"#FFFFFF\"", "Outline colour."],
    ["hoverSlow", "number", "0", "How far the flow slows while the pointer is over it. 0 is off."],
    ["background", "string", "\"#000000\"", "Background colour."],
    ["style", "CSSProperties", "undefined", "Extra styles for the outer wrapper."],
  ],
};
