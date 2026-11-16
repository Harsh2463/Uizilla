import DepthGallery from "./DepthGallery.jsx";
import source from "./DepthGallery.jsx?raw";

const IDS = [
  "1713456047285-52a8d18d1912", "1629747387925-6905ff5a558a",
  "1568044853110-277196781802", "1787656235601-d0c3b837ed33",
  "1613698808499-f772ccb4f527", "1626858707111-2fefbc9a848e",
  "1542305983-c4100e4b8cd2", "1720569103781-daf2ecb89e1b",
  "1611938766054-6b4f25b06f2e", "1643059514529-f6689eeba463",
];

export default {
  slug: "depth-gallery",
  name: "Depth Gallery",
  tag: "Scroll",
  file: "DepthGallery.jsx",
  source,
  Component: DepthGallery,
  description:
    "A corridor of pictures receding into the frame. Scroll flies the camera through them, each dissolving into the next while the room takes on the colour of the photo in focus.",
  // The demo on the component page leaves the page scrollable; the editor and
  // the component's own default capture the wheel.
  render: () => <DepthGallery scrollLock={false} />,
  usage: `import DepthGallery from "./DepthGallery";

// The gallery fills its parent, so give the parent a height.
<div style={{ height: 700 }}>
  <DepthGallery
    images={[{ src: "/images/1.jpg" }, { src: "/images/2.jpg", offsetY: -10 }]}
    depth={5}
    spread={5}
  />
</div>`,
  // Editor sidebar. `default` must match the default in DepthGallery.jsx.
  controls: [
    {
      key: "images", label: "Content", type: "images",
      default: IDS.map((id) => ({
        src: `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=80`,
      })),
    },
    { key: "imageProxy", label: "Image Proxy", type: "text", default: "https://images.weserv.nl/?url={url}" },
    { key: "depth", label: "Depth", type: "number", min: 0, max: 10, step: 0.1, default: 5 },
    { key: "spread", label: "Spread", type: "number", min: 0, max: 10, step: 0.1, default: 5 },
    { key: "cardWidth", label: "Card Width", unit: "px", type: "number", min: 100, max: 800, step: 1, default: 420 },
    { key: "cardHeight", label: "Card Height", unit: "px", type: "number", min: 100, max: 800, step: 1, default: 520 },
    { key: "radius", label: "Radius", unit: "px", type: "number", min: 0, max: 60, step: 1, default: 4 },
    { key: "moodStrength", label: "Mood Strength", type: "number", min: 0, max: 10, step: 0.1, default: 7 },
    { key: "moodBlobSize", label: "Blob Size", type: "number", min: 0, max: 10, step: 0.1, default: 5 },
    { key: "moodGrain", label: "Grain", type: "number", min: 0, max: 10, step: 0.1, default: 3 },
    { key: "parallaxPointer", label: "Pointer", type: "number", min: 0, max: 10, step: 0.1, default: 5 },
    { key: "parallaxBreath", label: "Breath", type: "number", min: 0, max: 10, step: 0.1, default: 5 },
    { key: "parallaxDrift", label: "Drift", type: "number", min: 0, max: 10, step: 0.1, default: 5 },
    { key: "sensitivity", label: "Scroll Sens.", type: "number", min: 0, max: 10, step: 0.1, default: 5 },
    { key: "smoothing", label: "Smoothing", type: "number", min: 0, max: 10, step: 0.1, default: 6 },
    { key: "scrollLock", label: "Scroll Lock", type: "toggle", default: true },
    { key: "background", label: "Background", type: "color", default: "#000000" },
  ],
  props: [
    ["images", "{ src: string, offsetY?: number }[]", "10 Unsplash photos", "Pictures flown past. offsetY nudges the framing up or down. The list loops. Empty or broken URLs fall back to a built-in image."],
    ["imageProxy", "string", '"https://images.weserv.nl/?url={url}"', "Used only when a picture's own host blocks it: the URL is retried through this proxy, with {url} replaced by the encoded address. Set to \"\" to switch it off."],
    ["background", "string", '"#000000"', "Base colour of the room; the picture's colour is mixed toward it."],
    ["depth", "number", "5", "How far apart the plates sit down the corridor, 0–10. Low stacks them close and shallow; high stretches the recession."],
    ["spread", "number", "5", "How far each plate sits off the centre line as it passes the camera, alternating left and right, 0–10."],
    ["cardWidth", "number", "420", "The width the focused picture lands at on screen, in px, at any depth. Shrinks on small frames."],
    ["cardHeight", "number", "520", "The height the focused picture lands at, in px."],
    ["radius", "number", "4", "Corner radius of every plate, in px."],
    ["moodStrength", "number", "7", "How far the room travels from the flat background toward the picture's own colour, 0–10."],
    ["moodBlobSize", "number", "5", "Size of the two drifting lights, 0–10."],
    ["moodGrain", "number", "3", "Amount of film grain over everything, 0–10."],
    ["parallaxPointer", "number", "5", "How much the plates push against the cursor, 0–10."],
    ["parallaxBreath", "number", "5", "How far they lean and swell when the scroll is thrown, 0–10."],
    ["parallaxDrift", "number", "5", "How much they drift vertically in the direction of travel, 0–10."],
    ["sensitivity", "number", "5", "How much corridor a wheel turn or drag covers. Low makes each picture a deliberate push."],
    ["smoothing", "number", "6", "How long the corridor takes to catch up. Low snaps to the input; high glides on."],
    ["scrollLock", "boolean", "true", "Consume the wheel over the component so the page does not scroll past it."],
    ["style", "CSSProperties", "undefined", "Extra styles for the outer wrapper."],
  ],
};
