import GalleryTunnel from "./GalleryTunnel.jsx";
import source from "./GalleryTunnel.jsx?raw";

const IDS = [
  "1506744038136-46273834b3fb", "1469474968028-56623f02e42e",
  "1441974231531-c6227db76b6e", "1470071459604-3b5ec3a7fe05",
  "1501785888041-af3ef285b470", "1472214103451-9374bd1c798e",
  "1465146344425-f00d5f5c8f07", "1447752875215-b2761acb3c5d",
];

export default {
  slug: "gallery-tunnel",
  name: "Gallery Tunnel",
  tag: "WebGL",
  file: "GalleryTunnel.jsx",
  source,
  Component: GalleryTunnel,
  description:
    "An endless gridded tunnel you fly down, with coloured panels and pictures on its walls. Press and hold to speed up.",
  render: () => <GalleryTunnel />,
  usage: `import GalleryTunnel from "./GalleryTunnel";

// The tunnel fills its parent, so give the parent a height.
<div style={{ height: 600 }}>
  <GalleryTunnel
    images={[{ src: "/images/1.jpg" }, { src: "/images/2.jpg" }]}
    colors={["#FF6A00", "#0072E3"]}
    speed={100}
    grid={4}
  />
</div>`,
  // Editor sidebar. `default` must match the default in GalleryTunnel.jsx.
  controls: [
    {
      key: "images", label: "Content", type: "images",
      default: IDS.map((id) => ({
        src: `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&q=80`,
      })),
    },
    {
      key: "colors", label: "Palette", type: "colors", noun: "Colors",
      default: ["#FF6A00", "#AB54F7", "#EA3737", "#0072E3", "#00AA3C", "#FFB200"],
    },
    { key: "imageProxy", label: "Image Proxy", type: "text", default: "https://images.weserv.nl/?url={url}" },
    { key: "grid", label: "Grid", type: "number", min: 1, max: 10, step: 1, default: 4 },
    { key: "speed", label: "Speed", type: "number", min: 0, max: 300, step: 1, default: 100 },
    { key: "boost", label: "Boost", type: "number", min: 0, max: 300, step: 1, default: 100 },
    { key: "fade", label: "Fade", type: "number", min: 0, max: 100, step: 1, default: 100 },
    { key: "lineOpacity", label: "Line Opacity", type: "number", min: 0, max: 100, step: 1, default: 50 },
    { key: "lineColor", label: "Line Color", type: "color", default: "#B0B0B0" },
    { key: "background", label: "Background", type: "color", default: "#000000" },
    { key: "label", label: "Label", type: "toggle", default: true },
    { key: "labelText", label: "Label Text", type: "text", default: "Press to Start" },
    { key: "labelFill", label: "Label Fill", type: "color", default: "#FFFFFF" },
    { key: "labelColor", label: "Label Text Color", type: "color", default: "#000000" },
  ],
  props: [
    ["images", "{ src: string }[]", "8 Unsplash photos", "Pictures scattered on the walls. Empty or broken URLs fall back to a built-in image."],
    ["colors", "string[]", "6 colours", "Palette for the coloured panels."],
    ["imageProxy", "string", '"https://images.weserv.nl/?url={url}"', "Used only when a picture's own host blocks it: the URL is retried through this proxy, with {url} replaced by the encoded address. Set to \"\" to switch it off."],
    ["grid", "number", "4", "Cells per wall, 1–12. Higher makes a finer grid."],
    ["speed", "number", "100", "Flying speed. 0 stops it."],
    ["boost", "number", "100", "Speed while the pointer is held down."],
    ["fade", "number", "100", "How far into the distance the walls fade to the background, 0–100."],
    ["lineOpacity", "number", "50", "Opacity of the grid lines, 0–100."],
    ["lineColor", "string", '"#B0B0B0"', "Grid line colour."],
    ["background", "string", '"#000000"', "Background and fog colour."],
    ["label", "boolean", "true", "Show the cursor label."],
    ["labelText", "string", '"Press to Start"', "Text inside the cursor label."],
    ["labelFill", "string", '"#FFFFFF"', "Label background colour."],
    ["labelColor", "string", '"#000000"', "Label text colour."],
    ["style", "CSSProperties", "undefined", "Extra styles for the outer wrapper."],
  ],
};
