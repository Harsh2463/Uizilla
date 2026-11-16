import ZoomGallery, { VARIANTS } from "./ZoomGallery.jsx";
import source from "./ZoomGallery.jsx?raw";

const IDS = [
  "1713456047285-52a8d18d1912", "1629747387925-6905ff5a558a",
  "1568044853110-277196781802", "1787656235601-d0c3b837ed33",
  "1613698808499-f772ccb4f527", "1626858707111-2fefbc9a848e",
  "1542305983-c4100e4b8cd2", "1720569103781-daf2ecb89e1b",
  "1611938766054-6b4f25b06f2e", "1643059514529-f6689eeba463",
];

const baseControls = [
    {
      key: "images", label: "Content", type: "images", cors: false,
      default: IDS.map((id) => ({
        src: `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=80`,
      })),
    },
    { key: "mode", label: "Mode", type: "select", options: [["straight","Straight"],["spiral","Spiral"]], default: "straight" },
    { key: "direction", label: "Spiral Direction", type: "select", options: [["clockwise","Clockwise"],["anticlockwise","Anticlockwise"],["both","Both"]], default: "clockwise" },
    { key: "appearDuration", label: "Appear Time", unit: "s", type: "number", min: 0.2, max: 8, step: 0.1, default: 2 },
    { key: "holdTime", label: "Hold Time", unit: "s", type: "number", min: 0, max: 10, step: 0.1, default: 2 },
    { key: "disappearDuration", label: "Leave Time", unit: "s", type: "number", min: 0.2, max: 8, step: 0.1, default: 1 },
    { key: "imageScale", label: "Image Size", type: "number", min: 1, max: 20, step: 1, default: 3 },
    { key: "blankArea", label: "Blank Area", unit: "%", type: "number", min: 0, max: 100, step: 1, default: 45 },
    { key: "crowdDensity", label: "Crowd", type: "number", min: 1, max: 40, step: 1, default: 10 },
    { key: "shape", label: "Shapes", type: "select", options: [["mixed","Mixed"],["square","Square"],["landscape","Landscape"],["portrait","Portrait"]], default: "square" },
    { key: "imageFit", label: "Image Fit", type: "select", options: [["contain","Contain"],["cover","Cover"]], default: "cover" },
    { key: "cornerRadius", label: "Corner Radius", unit: "px", type: "number", min: 0, max: 200, step: 1, default: 15 },
    { key: "speed", label: "Speed", unit: "%", type: "number", min: 10, max: 300, step: 1, default: 196 },
    { key: "background", label: "Background", type: "color", default: "#000000" },
  
];
const variantControl = {
  key: "variant", label: "Variant", type: "select",
  options: [["square", "Square"], ["classic", "Classic"]],
  default: "square",
  // Picking a variant sets every control it names; "square" puts them back.
  presets: {
    square: Object.fromEntries(
      Object.keys(VARIANTS.classic).map((k) => [k, baseControls.find((c) => c.key === k).default])
    ),
    classic: VARIANTS.classic,
  },
};
const controls = [variantControl, ...baseControls];

export default {
  slug: "zoom-gallery",
  name: "Zoom Gallery",
  tag: "Gallery",
  file: "ZoomGallery.jsx",
  source,
  Component: ZoomGallery,
  description:
    "Pictures burst out of the middle of the frame one after another, hang for a beat, then zoom away, in straight lines or on curling spiral paths. Size, spacing, shape, speed and colour are adjustable.",
  render: () => <ZoomGallery />,
  usage: `import ZoomGallery from "./ZoomGallery";

// The gallery fills its parent, so give the parent a height.
<div style={{ height: 700 }}>
  <ZoomGallery
    images={[{ src: "/images/1.jpg" }, { src: "/images/2.jpg" }]}
    mode="spiral"
    direction="both"
    crowdDensity={12}
    cornerRadius={12}
  />
</div>`,
  // Editor sidebar. `default` must match the default in ZoomGallery.jsx.
  controls,
  props: [
    ["variant", "\"square\" | \"classic\"", "\"square\"", "A ready-made look. \"square\" (default) is rounded square tiles filled edge to edge, flowing fast. \"classic\" is mixed shapes, whole pictures, radius 0, speed 100. Anything else you pass overrides it."],
    ["images", "{ src: string }[]", "10 photos", "The pictures that flow past. Any image URL works. A broken link is swapped for a coloured placeholder."],
    ["mode", "string", '"straight"', "Straight sends each picture out along its own ray. Spiral curls it through the centre along one of twenty paths."],
    ["direction", "string", '"clockwise"', "Spin of the spiral paths. Both lets each path pick its own."],
    ["appearDuration", "number", "2", "Seconds the picture takes to settle in."],
    ["holdTime", "number", "2", "Seconds it hangs, drifting slowly, before leaving."],
    ["disappearDuration", "number", "1", "Seconds the exit takes."],
    ["imageScale", "number", "2", "Picture size from 1 (an eighth) to 20 (five times). Always kept inside the frame."],
    ["blankArea", "number", "45", "Straight: how far from the centre pictures start. Spiral: how far out they hover."],
    ["crowdDensity", "number", "10", "About how many pictures are alive at once."],
    ["shape", "string", '"mixed"', "Which proportions the pictures take."],
    ["imageFit", "string", '"contain"', "Contain shows the whole picture. Cover fills the frame of the tile."],
    ["cornerRadius", "number", "0", "Rounds the corners of every picture."],
    ["speed", "number", "100", "Speed of the whole scene."],
    ["background", "string", '"#000000"', "Background colour."],
    ["style", "CSSProperties", "undefined", "Extra styles for the outer wrapper."],
  ],
};
