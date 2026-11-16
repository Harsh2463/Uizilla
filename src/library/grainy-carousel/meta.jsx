import GrainyCarousel from "./GrainyCarousel.jsx";
import source from "./GrainyCarousel.jsx?raw";

const IDS = [
  "1506744038136-46273834b3fb", "1469474968028-56623f02e42e",
  "1441974231531-c6227db76b6e", "1470071459604-3b5ec3a7fe05",
  "1501785888041-af3ef285b470", "1472214103451-9374bd1c798e",
  "1465146344425-f00d5f5c8f07", "1447752875215-b2761acb3c5d",
];

export default {
  slug: "grainy-carousel",
  name: "Grainy Carousel",
  tag: "WebGL",
  file: "GrainyCarousel.jsx",
  source,
  Component: GrainyCarousel,
  description:
    "An endless strip of pictures that dissolves into grain at the edges. Drag, flick, click a side to step, or let it run.",
  render: () => <GrainyCarousel />,
  usage: `import GrainyCarousel from "./GrainyCarousel";

// The carousel fills its parent, so give the parent a height.
<div style={{ height: 500 }}>
  <GrainyCarousel
    images={[{ src: "/images/1.jpg" }, { src: "/images/2.jpg" }]}
    mode="snap"
    speed={155}
  />
</div>`,
  // Editor sidebar. `default` must match the default in GrainyCarousel.jsx.
  controls: [
    {
      key: "images", label: "Content", type: "images",
      default: IDS.map((id) => ({
        src: `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&h=800&q=80`,
      })),
    },
    { key: "imageProxy", label: "Image Proxy", type: "text", default: "https://images.weserv.nl/?url={url}" },
    { key: "cardWidth", label: "Card Width", unit: "px", type: "number", min: 40, max: 800, step: 1, default: 711 },
    { key: "cardHeight", label: "Card Height", unit: "px", type: "number", min: 40, max: 800, step: 1, default: 400 },
    { key: "gap", label: "Gap", unit: "px", type: "number", min: 0, max: 200, step: 1, default: 20 },
    { key: "rounded", label: "Rounded", type: "number", min: 0, max: 100, step: 1, default: 8 },
    { key: "mode", label: "Mode", type: "select", options: [["snap", "Snap"], ["smooth", "Smooth"]], default: "snap" },
    { key: "speed", label: "Speed", type: "number", min: 0, max: 500, step: 1, default: 155 },
    { key: "duration", label: "Snap Time", unit: "s", type: "number", min: 0, max: 2, step: 0.1, default: 0.5 },
    { key: "drag", label: "Drag", type: "number", min: 0, max: 100, step: 1, default: 25 },
    { key: "damping", label: "Damping", type: "number", min: 1, max: 100, step: 1, default: 60 },
    { key: "zoom", label: "Zoom", type: "number", min: 0, max: 30, step: 1, default: 5 },
    { key: "grainWidth", label: "Grain Width", type: "number", min: 0, max: 150, step: 1, default: 40 },
    { key: "grainHeight", label: "Grain Height", type: "number", min: 0, max: 100, step: 1, default: 50 },
    { key: "grainAmount", label: "Grain Amount", type: "number", min: 0, max: 100, step: 1, default: 10 },
    { key: "grainScale", label: "Grain Scale", type: "number", min: 10, max: 400, step: 1, default: 250 },
    { key: "grainSpeed", label: "Grain Speed", type: "number", min: 0, max: 100, step: 1, default: 50 },
    { key: "background", label: "Background", type: "color", default: "#0B0A10" },
  ],
  props: [
    ["images", "{ src: string }[]", "8 Unsplash photos", "Pictures in the strip. Empty or broken URLs fall back to a built-in image."],
    ["imageProxy", "string", '"https://images.weserv.nl/?url={url}"', "Used only when a picture's own host blocks it: the URL is retried through this proxy, with {url} replaced by the encoded address. Set to \"\" to switch it off."],
    ["cardWidth", "number", "711", "Card width in px at full size. Cards shrink automatically on small frames."],
    ["cardHeight", "number", "400", "Card height in px at full size."],
    ["gap", "number", "20", "Space between cards in px."],
    ["rounded", "number", "8", "Corner rounding as a percent of the maximum radius. 100 is a circle."],
    ["mode", '"snap" | "smooth"', '"snap"', "Snap steps card by card; smooth drifts continuously."],
    ["speed", "number", "155", "Auto-advance rate. 0 stops it."],
    ["duration", "number", "0.5", "Seconds a snap step takes. 0 jumps instantly."],
    ["drag", "number", "25", "How far the strip moves per pixel of drag. 25 is 1:1."],
    ["damping", "number", "60", "How quickly the strip settles after a drag. Higher settles faster."],
    ["zoom", "number", "5", "Snap mode: how much the strip shrinks between steps, in percent."],
    ["grainWidth", "number", "40", "Width of the grain band on each edge, as a percent of one card. It also narrows on smaller frames, down to 30% of this on a tiny one, growing to full size at 1920px wide."],
    ["grainHeight", "number", "50", "How far the grain spreads above and below the cards, in percent. The curved flare keeps its shape; lower is flatter, 100 is the original spread."],
    ["grainAmount", "number", "10", "How strongly the edges warp, in percent."],
    ["grainScale", "number", "250", "Size of the grain pattern. Higher is finer."],
    ["grainSpeed", "number", "50", "How fast the grain moves. 0 freezes it."],
    ["background", "string", '"#0B0A10"', "Background colour behind the strip."],
    ["style", "CSSProperties", "undefined", "Extra styles for the outer wrapper."],
  ],
};
