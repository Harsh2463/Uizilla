import RoundCarousel from "./RoundCarousel.jsx";
import source from "./RoundCarousel.jsx?raw";
import sourceTs from "./RoundCarousel.tsx.txt?raw";

export default {
  slug: "round-carousel",
  file: "RoundCarousel.jsx",
  fileTs: "RoundCarousel.tsx",
  source,
  sourceTs,
  Component: RoundCarousel,
  // Editor sidebar. `default` must match the default in RoundCarousel.jsx.
  controls: [
    {
      key: "images", label: "Content", type: "images",
      default: [
        "photo-1506744038136-46273834b3fb", "photo-1469474968028-56623f02e42e",
        "photo-1441974231531-c6227db76b6e", "photo-1470071459604-3b5ec3a7fe05",
        "photo-1501785888041-af3ef285b470", "photo-1472214103451-9374bd1c798e",
        "photo-1465146344425-f00d5f5c8f07", "photo-1447752875215-b2761acb3c5d",
      ].map((id) => ({
        src: `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&h=800&q=80`,
      })),
    },
    { key: "imageWidth", label: "Card Width", unit: "px", type: "number", min: 80, max: 600, step: 1, default: 300 },
    { key: "imageHeight", label: "Card Height", unit: "px", type: "number", min: 80, max: 600, step: 1, default: 300 },
    { key: "spacing", label: "Spacing", type: "number", min: 0, max: 15, step: 0.1, default: 3 },
    { key: "speed", label: "Speed", type: "number", min: 0, max: 30, step: 0.5, default: 7 },
    { key: "direction", label: "Direction", type: "select", options: [["right", "Right"], ["left", "Left"]], default: "right" },
    { key: "tilt", label: "Tilt", unit: "°", type: "number", min: -45, max: 45, step: 1, default: -7 },
    { key: "cornerRadius", label: "Radius", unit: "px", type: "number", min: 0, max: 100, step: 1, default: 22 },
    { key: "curve", label: "Curve", unit: "°", type: "number", min: 0, max: 120, step: 1, default: 30 },
    { key: "innerDim", label: "Inner Dim", type: "number", min: 0, max: 10, step: 0.1, default: 3.5 },
    { key: "perspective", label: "Perspective", unit: "px", type: "number", min: 500, max: 3000, step: 10, default: 3000 },
    { key: "drag", label: "Drag", type: "toggle", default: true },
    { key: "sensitivity", label: "Sensitivity", type: "number", min: 0.5, max: 5, step: 0.1, default: 5 },
    { key: "background", label: "Background", type: "color", default: "#000000" },
  ],
  name: "Round Carousel",
  tag: "3D",
  description:
    "A 3D ring of outward-curved image cards that spins on its own and can be dragged. Scales to fit any screen.",
  // Rendered on the home page card (non-interactive) and on the component page.
  render: ({ interactive = true } = {}) => (
    <RoundCarousel drag={interactive} />
  ),
  usage: `import RoundCarousel from "./library/round-carousel/RoundCarousel";

// The carousel fills its parent, so give the parent a size.
<div style={{ height: 480 }}>
  <RoundCarousel
    images={[{ src: "/images/1.jpg" }, { src: "/images/2.jpg" }]}
    speed={7}
    direction="right"
  />
</div>`,
  props: [
    ["images", "{ src: string }[]", "8 Unsplash photos", "Images placed around the ring."],
    ["imageWidth", "number", "300", "Card width in px at full size. Shrinks automatically on small screens."],
    ["imageHeight", "number", "300", "Card height in px at full size."],
    ["spacing", "number", "3", "Gap between cards. Higher means a wider ring."],
    ["speed", "number", "7", "Auto-rotation speed."],
    ["direction", '"right" | "left"', '"right"', "Auto-rotation direction."],
    ["drag", "boolean", "true", "Allow dragging to spin the ring."],
    ["sensitivity", "number", "5", "How strongly a drag turns the ring."],
    ["tilt", "number", "-7", "Camera tilt in degrees."],
    ["perspective", "number", "3000", "CSS perspective in px at full size."],
    ["cornerRadius", "number", "22", "Card corner radius in px at full size."],
    ["curve", "number", "30", "Bends each card outwards by this many degrees. 0 keeps cards flat."],
    ["innerDim", "number", "3.5", "Brightness (0–10) of the inside faces."],
    ["background", "string", '"#000000"', "Background colour behind the ring."],
    ["style", "CSSProperties", "{}", "Extra styles for the outer wrapper."],
  ],
};
