import MagneticCarousel from "./MagneticCarousel.jsx";
import source from "./MagneticCarousel.jsx?raw";

const u = (id) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&h=1100&q=80`;

export default {
  slug: "magnetic-carousel",
  name: "Magnetic Carousel",
  tag: "Interactive",
  file: "MagneticCarousel.jsx",
  source,
  Component: MagneticCarousel,
  description:
    "A row of thin image bars that magnify toward your cursor like a dock. Click one to open it as a large square while the rest blur and dim. Scales to fit any container.",
  // Rendered on the home page card (non-interactive) and on the component page.
  render: ({ interactive = true } = {}) => <MagneticCarousel interactive={interactive} />,
  usage: `import MagneticCarousel from "./MagneticCarousel";

// The carousel fills its parent, so give the parent a size.
<div style={{ height: 480 }}>
  <MagneticCarousel
    images={[{ src: "/images/1.jpg" }, { src: "/images/2.jpg" }]}
    hoverWidth={200}
    openSize={500}
    easing="smooth"
  />
</div>`,
  // Editor sidebar. `default` must match the default in MagneticCarousel.jsx.
  controls: [
    {
      key: "images", label: "Content", type: "images",
      default: [
        "photo-1506744038136-46273834b3fb", "photo-1469474968028-56623f02e42e",
        "photo-1441974231531-c6227db76b6e", "photo-1470071459604-3b5ec3a7fe05",
        "photo-1501785888041-af3ef285b470", "photo-1472214103451-9374bd1c798e",
        "photo-1465146344425-f00d5f5c8f07",
      ].map((id) => ({ src: u(id) })),
    },
    { key: "collapsedWidth", label: "Bar Width", unit: "px", type: "number", min: 20, max: 300, step: 1, default: 100 },
    { key: "collapsedHeight", label: "Bar Height", unit: "px", type: "number", min: 80, max: 800, step: 1, default: 340 },
    { key: "hoverWidth", label: "Hover Width", unit: "px", type: "number", min: 20, max: 500, step: 1, default: 200 },
    { key: "hoverHeight", label: "Hover Height", unit: "px", type: "number", min: 80, max: 900, step: 1, default: 400 },
    { key: "openSize", label: "Open Size", unit: "px", type: "number", min: 200, max: 900, step: 1, default: 500 },
    { key: "gap", label: "Gap", unit: "px", type: "number", min: 0, max: 80, step: 1, default: 16 },
    { key: "influence", label: "Magnet Reach", unit: "px", type: "number", min: 40, max: 600, step: 1, default: 200 },
    { key: "followSpeed", label: "Follow Speed", type: "number", min: 0.05, max: 1, step: 0.01, default: 0.2 },
    { key: "cornerRadius", label: "Corner Radius", unit: "px", type: "number", min: 0, max: 120, step: 1, default: 0 },
    { key: "blur", label: "Blur (Others)", unit: "px", type: "number", min: 0, max: 20, step: 0.5, default: 2 },
    { key: "dimOpacity", label: "Dim (Others)", type: "number", min: 0, max: 1, step: 0.05, default: 0.6 },
    { key: "duration", label: "Open Speed", unit: "s", type: "number", min: 0.05, max: 1.5, step: 0.01, default: 0.3 },
    {
      key: "easing", label: "Open Motion", type: "select", default: "easeInOut",
      options: [
        ["easeInOut", "Ease In-Out"],
        ["smooth", "Smooth"],
        ["easeOut", "Ease Out"],
        ["easeIn", "Ease In"],
        ["linear", "Linear"],
        ["spring", "Spring"],
      ],
    },
    { key: "clickToOpen", label: "Click to Open", type: "toggle", default: true },
    { key: "fitToContainer", label: "Fit to Container", type: "toggle", default: true },
    { key: "background", label: "Background", type: "color", default: "#000000" },
  ],
  props: [
    ["images", "{ src: string }[]", "7 Unsplash photos", "Images shown as bars. A broken URL falls back to a built-in photo."],
    ["collapsedWidth", "number", "100", "Resting bar width in px."],
    ["collapsedHeight", "number", "340", "Resting bar height in px."],
    ["hoverWidth", "number", "200", "Width in px of the bar right under the cursor."],
    ["hoverHeight", "number", "400", "Height in px of the bar right under the cursor."],
    ["openSize", "number", "500", "Side of the square a clicked bar opens to, in px."],
    ["gap", "number", "16", "Space between bars in px."],
    ["influence", "number", "200", "How far from a bar, in px, the cursor still magnifies it. Neighbours taper off smoothly."],
    ["followSpeed", "number", "0.2", "How quickly bars chase the cursor (0.05 slow and floaty – 1 instant)."],
    ["cornerRadius", "number", "0", "Bar corner radius in px."],
    ["blur", "number", "2", "Blur in px applied to the other bars while one is open."],
    ["dimOpacity", "number", "0.6", "Opacity (0–1) of the other bars while one is open."],
    ["duration", "number", "0.3", "Seconds the open/close animation takes."],
    ["easing", '"easeInOut" | "smooth" | "easeOut" | "easeIn" | "linear" | "spring"', '"easeInOut"', "Motion curve of the open/close animation. Spring overshoots slightly."],
    ["clickToOpen", "boolean", "true", "Let a click open a bar. Esc, the backdrop or a second click closes it."],
    ["fitToContainer", "boolean", "true", "Scale everything down uniformly so the row and the open square never overflow a small container."],
    ["interactive", "boolean", "true", "Turn off hover and click entirely (used for the static home-page card)."],
    ["background", "string", '"#000000"', "Background colour behind the bars."],
    ["style", "CSSProperties", "{}", "Extra styles for the outer wrapper."],
  ],
};
