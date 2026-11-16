import SpotlightFrames from "./SpotlightFrames.jsx";
import source from "./SpotlightFrames.jsx?raw";

const IDS = [
  "1654944989879-b3ef6a3f69a3", "1777146464379-c527ae8c92f0",
  "1600711151461-05abd927b281", "1485178575877-1a13bf489dfe",
  "1665699954779-5d391413aaff", "1662311516094-fdb7c2c1aa34",
  "1512061649570-b858b7f60d32", "1748485559590-06fa4035b322",
  "1637028357803-78764289ffe5", "1638305607135-3e555310c69c",
  "1463085154687-27abe97620ab", "1609840422197-0f9a4e97e3a3",
];

export default {
  slug: "spotlight-frames",
  name: "Spotlight Frames",
  tag: "Gallery",
  file: "SpotlightFrames.jsx",
  source,
  Component: SpotlightFrames,
  description:
    "A row of thin slats, each showing the centre strip of a picture. One opens out to full width while the rest slide aside, marked by a selector box and guide lines that travel with it.",
  render: () => <SpotlightFrames />,
  usage: `import SpotlightFrames from "./SpotlightFrames";

// It fills its parent, so give the parent a height.
<div style={{ height: 600 }}>
  <SpotlightFrames
    images={[{ src: "/images/1.jpg" }, { src: "/images/2.jpg", offsetY: -20 }]}
    startIndex={0}
    expandedWidth={420}
    dim={4}
  />
</div>`,
  // Editor sidebar. `default` must match the default in SpotlightFrames.jsx.
  controls: [
    {
      key: "images", label: "Content", type: "images", cors: false,
      default: IDS.map((id) => ({
        src: `https://images.unsplash.com/photo-${id}?w=900&auto=format&fit=crop&q=60`,
        offsetY: 0,
      })),
      fields: [{ key: "offsetY", label: "Vertical offset (px, slides the picture up or down in its slat)" }],
    },
    { key: "startIndex", label: "Start Slat", type: "number", min: 0, max: 20, step: 1, default: 6 },
    { key: "trigger", label: "Open On", type: "select", options: [["auto","Auto"],["hover","Hover"],["click","Click"]], default: "auto" },
    { key: "collapsedWidth", label: "Closed Width", unit: "px", type: "number", min: 20, max: 200, step: 1, default: 80 },
    { key: "expandedWidth", label: "Open Width", unit: "px", type: "number", min: 120, max: 900, step: 1, default: 400 },
    { key: "gap", label: "Gap", unit: "px", type: "number", min: 0, max: 40, step: 1, default: 2 },
    { key: "panelHeight", label: "Height", unit: "px", type: "number", min: 120, max: 900, step: 1, default: 400 },
    { key: "radius", label: "Corner Radius", unit: "px", type: "number", min: 0, max: 60, step: 1, default: 0 },
    { key: "dim", label: "Dim Closed", type: "number", min: 0, max: 10, step: 1, default: 0 },
    { key: "showBox", label: "Selector Box", type: "toggle", default: true },
    { key: "showLines", label: "Guide Lines", type: "toggle", default: true },
    { key: "lineLength", label: "Line Length", unit: "px", type: "number", min: 0, max: 1200, step: 10, default: 600 },
    { key: "thickness", label: "Line Thickness", unit: "px", type: "number", min: 1, max: 12, step: 1, default: 3 },
    { key: "selectorColor", label: "Selector Color", type: "color", default: "#FFFFFF" },
    { key: "slideDuration", label: "Slide Time", unit: "s", type: "number", min: 0.1, max: 3, step: 0.05, default: 1 },
    { key: "slideEase", label: "Slide Ease", type: "select", options: [["snap","Snap"],["smooth","Smooth"],["soft","Soft"],["linear","Linear"]], default: "snap" },
    { key: "entrance", label: "Entrance", type: "toggle", default: true },
    { key: "autoPlay", label: "Auto Play", type: "toggle", default: false },
    { key: "autoPlayMs", label: "Auto Play Time", unit: "ms", type: "number", min: 600, max: 8000, step: 100, default: 2500 },
    { key: "background", label: "Background", type: "color", default: "#0f0f0f" },
  ],
  props: [
    ["images", "{ src: string, offsetY?: number }[]", "12 photos", "The pictures, one per slat. offsetY slides a picture up or down inside its slat. With none, placeholder slats are drawn."],
    ["startIndex", "number", "6", "Which slat is open first (0 is the first)."],
    ["trigger", "string", "\"auto\"", "Auto opens on hover where the device can hover and on tap where it cannot."],
    ["collapsedWidth", "number", "80", "Width of a closed slat."],
    ["expandedWidth", "number", "400", "Width of the open slat, and of every picture."],
    ["gap", "number", "2", "Space between slats."],
    ["panelHeight", "number", "400", "Height of the strip. It never exceeds its frame."],
    ["radius", "number", "0", "Rounds each slat and the selector box."],
    ["dim", "number", "0", "How far the closed slats are pushed back behind the open one."],
    ["showBox", "boolean", "true", "Draw the outline round the open slat."],
    ["showLines", "boolean", "true", "Draw the two lines running out of the box, top and bottom."],
    ["lineLength", "number", "600", "How far each guide line reaches past the box."],
    ["thickness", "number", "3", "Stroke weight of the box and lines."],
    ["selectorColor", "string", "\"#FFFFFF\"", "Colour of the box and lines."],
    ["slideDuration", "number", "1", "Seconds the slats take to slide."],
    ["slideEase", "string", "\"snap\"", "Easing of the slide. Snap is the original long ease-out."],
    ["entrance", "boolean", "true", "Lift the slats into place when it first appears."],
    ["autoPlay", "boolean", "false", "Open the slats one after another. It rests while the pointer is over the strip."],
    ["autoPlayMs", "number", "2500", "Milliseconds each slat stays open in Auto Play."],
    ["background", "string", "\"#0f0f0f\"", "Background colour."],
    ["panels", "number", "16", "How many placeholder slats to draw when no images are given."],
    ["style", "CSSProperties", "undefined", "Extra styles for the outer wrapper."],
  ],
};
