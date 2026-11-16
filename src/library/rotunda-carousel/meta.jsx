import RotundaCarousel from "./RotundaCarousel.jsx";
import source from "./RotundaCarousel.jsx?raw";

const IDS = [
  "1506905925346-21bda4d32df4", "1470071459604-3b5ec3a7fe05",
  "1441974231531-c6227db76b6e", "1501785888041-af3ef285b470",
  "1418065460487-3e41a6c84dc5", "1519681393784-d120267933ba",
  "1497436072909-60f360e1d4b1", "1433086966358-54859d0ed716",
];

export default {
  slug: "rotunda-carousel",
  name: "Rotunda Carousel",
  tag: "WebGL",
  file: "RotundaCarousel.jsx",
  source,
  Component: RotundaCarousel,
  description:
    "A ring of pictures seen from inside, hung on the wall around you. Drag to turn it, or let it drift. Fills any container.",
  render: () => <RotundaCarousel />,
  usage: `import RotundaCarousel from "./RotundaCarousel";

// The carousel fills its parent, so give the parent a height.
<div style={{ height: 600 }}>
  <RotundaCarousel
    images={[{ src: "/images/1.jpg" }, { src: "/images/2.jpg" }]}
    speed={100}
    distance={90}
  />
</div>`,
  // Editor sidebar. `default` must match the default in RotundaCarousel.jsx.
  controls: [
    {
      key: "images", label: "Content", type: "images",
      default: IDS.map((id) => ({
        src: `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=80`,
      })),
    },
    { key: "imageProxy", label: "Image Proxy", type: "text", default: "https://images.weserv.nl/?url={url}" },
    { key: "panelWidth", label: "Panel Width", unit: "px", type: "number", min: 200, max: 4000, step: 10, default: 2000 },
    { key: "panelHeight", label: "Panel Height", unit: "px", type: "number", min: 200, max: 4000, step: 10, default: 1340 },
    { key: "gap", label: "Gap", unit: "px", type: "number", min: 0, max: 2000, step: 10, default: 0 },
    { key: "rounded", label: "Rounded", type: "number", min: 0, max: 100, step: 1, default: 3 },
    { key: "distance", label: "Distance", type: "number", min: 0, max: 90, step: 1, default: 90 },
    { key: "tilt", label: "Tilt", unit: "°", type: "number", min: -60, max: 60, step: 1, default: 0 },
    { key: "speed", label: "Speed", type: "number", min: 0, max: 200, step: 1, default: 100 },
    { key: "damping", label: "Damping", type: "number", min: 0, max: 100, step: 1, default: 100 },
    { key: "hover", label: "Hover Slow", type: "number", min: 0, max: 200, step: 1, default: 200 },
    { key: "background", label: "Background", type: "color", default: "#0B0A10" },
  ],
  props: [
    ["images", "{ src: string }[]", "8 Unsplash photos", "Pictures hung around the ring. Empty or broken URLs fall back to a built-in image."],
    ["imageProxy", "string", '"https://images.weserv.nl/?url={url}"', "Used only when a picture's own host blocks it: the URL is retried through this proxy, with {url} replaced by the encoded address. Set to \"\" to switch it off."],
    ["panelWidth", "number", "2000", "Panel width. Only the ratio to panelHeight and gap matters."],
    ["panelHeight", "number", "1340", "Panel height. Width : Height is the picture shape."],
    ["gap", "number", "0", "Space between panels, in the same units as panelWidth."],
    ["rounded", "number", "3", "Corner rounding, 0–100."],
    ["distance", "number", "90", "How far the camera stands from the centre, 0–90 (% of the radius)."],
    ["tilt", "number", "0", "Camera pitch in degrees. Positive looks down."],
    ["speed", "number", "100", "Auto-drift speed. 0 stops it."],
    ["damping", "number", "100", "How quickly a flick settles. Higher settles faster."],
    ["hover", "number", "200", "How much resting the pointer slows the drift. 100 stops it, above that it backs up."],
    ["background", "string", '"#0B0A10"', "Background colour behind the panels."],
    ["style", "CSSProperties", "undefined", "Extra styles for the outer wrapper."],
  ],
};
