import RotatingGallery from "./RotatingGallery.jsx";
import source from "./RotatingGallery.jsx?raw";

const IDS = [
  "1506744038136-46273834b3fb", "1469474968028-56623f02e42e",
  "1441974231531-c6227db76b6e", "1470071459604-3b5ec3a7fe05",
  "1501785888041-af3ef285b470", "1472214103451-9374bd1c798e",
  "1465146344425-f00d5f5c8f07", "1447752875215-b2761acb3c5d",
];

export default {
  slug: "rotating-gallery",
  name: "Rotating Gallery",
  tag: "WebGL",
  file: "RotatingGallery.jsx",
  source,
  Component: RotatingGallery,
  description:
    "A vertical column of pictures that scrolls forever and twists as each card passes. Scroll, drag or swipe; tap a picture to bring it forward.",
  render: ({ interactive = true } = {}) => <RotatingGallery drag={interactive} />,
  usage: `import RotatingGallery from "./RotatingGallery";

// The gallery fills its parent, so give the parent a height.
<div style={{ height: 700 }}>
  <RotatingGallery
    images={[{ src: "/images/1.jpg" }, { src: "/images/2.jpg" }]}
    spin={5}
    twist={3}
  />
</div>`,
  // Editor sidebar. `default` must match the default in RotatingGallery.jsx.
  controls: [
    {
      key: "images", label: "Content", type: "images",
      default: IDS.map((id) => ({
        src: `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=80`,
      })),
    },
    { key: "imageProxy", label: "Image Proxy", type: "text", default: "https://images.weserv.nl/?url={url}" },
    { key: "cardWidth", label: "Card Width", unit: "px", type: "number", min: 100, max: 800, step: 1, default: 400 },
    { key: "cardHeight", label: "Card Height", unit: "px", type: "number", min: 100, max: 800, step: 1, default: 300 },
    { key: "spacing", label: "Spacing", unit: "px", type: "number", min: 0, max: 200, step: 1, default: 16 },
    { key: "radius", label: "Radius", unit: "px", type: "number", min: 0, max: 100, step: 1, default: 16 },
    { key: "spin", label: "Spin", type: "number", min: 0, max: 10, step: 0.1, default: 5 },
    { key: "twist", label: "Twist", type: "number", min: 0, max: 10, step: 0.1, default: 3 },
    { key: "axis", label: "Axis", type: "select", options: [["y", "Vertical (Y)"], ["x", "Horizontal (X)"]], default: "y" },
    { key: "tap", label: "Tap to Open", type: "toggle", default: true },
    { key: "scrollLock", label: "Scroll Lock", type: "toggle", default: false },
    { key: "hold", label: "Hold", type: "number", min: 0, max: 10, step: 1, default: 10 },
    { key: "scrollSensitivity", label: "Scroll Sens.", type: "number", min: 0, max: 20, step: 1, default: 10 },
    { key: "smoothing", label: "Smoothing", type: "number", min: 0, max: 10, step: 1, default: 0 },
    { key: "drag", label: "Drag", type: "toggle", default: true },
    { key: "dragSensitivity", label: "Drag Sens.", type: "number", min: 0, max: 20, step: 1, default: 10 },
    { key: "background", label: "Background", type: "color", default: "#000000" },
  ],
  props: [
    ["images", "{ src: string, offsetY?: number }[]", "8 Unsplash photos", "Pictures in the column. offsetY slides a picture inside its card. Empty or broken URLs fall back to a built-in image."],
    ["imageProxy", "string", '"https://images.weserv.nl/?url={url}"', "Used only when a picture's own host blocks it: the URL is retried through this proxy, with {url} replaced by the encoded address. Set to \"\" to switch it off."],
    ["cardWidth", "number", "400", "Card width in px at full size. Cards shrink on narrow frames."],
    ["cardHeight", "number", "300", "Card height in px at full size."],
    ["spacing", "number", "16", "Gap between cards in px."],
    ["radius", "number", "16", "Corner radius in px."],
    ["spin", "number", "5", "Turns per screen of travel. 0 leaves cards flat."],
    ["twist", "number", "3", "How much of the turn is spread across the card, like a ribbon twist."],
    ["axis", '"y" | "x"', '"y"', "The axis the card turns about."],
    ["tap", "boolean", "true", "Tap a picture to bring it forward; tap again to send it back."],
    ["scrollLock", "boolean", "false", "When on, the wheel turns the column instead of scrolling the page."],
    ["hold", "number", "10", "Screens of scrolling the lock keeps before handing the wheel back. 10 never does."],
    ["scrollSensitivity", "number", "10", "How far the wheel moves the column. 5 is 1:1."],
    ["smoothing", "number", "0", "How much the column coasts after a gesture."],
    ["drag", "boolean", "true", "Drag the column with the pointer."],
    ["dragSensitivity", "number", "10", "How far a drag moves the column. 5 is 1:1."],
    ["background", "string", '"#000000"', "Background colour behind the cards."],
    ["style", "CSSProperties", "undefined", "Extra styles for the outer wrapper."],
  ],
};
