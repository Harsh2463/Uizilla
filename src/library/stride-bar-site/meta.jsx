import StrideBarSite from "./StrideBarSite.jsx";
import source from "./StrideBarSite.jsx?raw";

const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20261116_131908_b6239896-c077-450c-ad91-575153973fcf.mp4";

export default {
  slug: "stride-bar-site",
  name: "Stride 3D Bar Site",
  tag: "WebGL",
  file: "StrideBarSite.jsx",
  source,
  Component: StrideBarSite,
  description:
    "A four-section landing page for a plant-protein bar brand, built around one travelling 3D wrapper. Pick a flavour on a 3D arc, watch the same bar fly into a pinned 'what's inside' section and flip, spin through a storm of its ingredients, land on its card in the shop, and fly into the basket from a build-your-pack section.",
  // The home card shows the hero at rest; the component page runs the whole page.
  render: ({ interactive = true } = {}) => <StrideBarSite interactive={interactive} introEnabled={interactive} />,
  usage: `import StrideBarSite from "./StrideBarSite";

// It scrolls inside its own box, so give it a height (e.g. the viewport).
<div style={{ height: "100vh" }}>
  <StrideBarSite
    brand="STRIDE"
    startFlavor={1}
    autoplay
    introEnabled={false}
  />
</div>

// Needs, at runtime: three@0.160.0 (loaded from jsDelivr), Google Fonts
// (Archivo Black, Inter, DM Mono) and the sprite sheet from images.higgs.ai.`,
  // Editor sidebar. `default` must match the default in StrideBarSite.jsx.
  controls: [
    { key: "brand", label: "Brand Name", type: "text", default: "STRIDE" },
    {
      key: "startFlavor", label: "Starting Flavour", type: "select", default: "1",
      options: [["0", "Peanut Cocoa"], ["1", "Berry Oat"], ["2", "Salted Caramel"], ["3", "Mint Chip"], ["4", "Strawberry"]],
    },
    { key: "introEnabled", label: "Play Intro Video", type: "toggle", default: true },
    { key: "introVideo", label: "Intro Video URL", type: "text", default: VIDEO_URL },
    { key: "autoplay", label: "Autoplay Flavours", type: "toggle", default: true },
    { key: "autoplayMs", label: "Autoplay Delay", unit: "ms", type: "number", min: 1000, max: 10000, step: 100, default: 3200 },
    { key: "smoothScroll", label: "Smooth Wheel Scrolling", type: "toggle", default: true },
    { key: "discountLabel", label: "Nav Offer Chip", type: "text", default: "% OFF" },
    { key: "ctaLabel", label: "Nav Button", type: "text", default: "First dibs" },
    { key: "packPrice", label: "3-Pack Price", type: "text", default: "$7.48" },
    { key: "inkColor", label: "Ink (Text) Color", type: "color", default: "#1c1a1f" },
    { key: "creamColor", label: "Cream (Page) Color", type: "color", default: "#f0e8e0" },
    { key: "darkColor", label: "Builder Background", type: "color", default: "#191a1e" },
  ],
  props: [
    ["brand", "string", '"STRIDE"', "The wordmark in the nav and on the intro's logo stamp."],
    ["startFlavour (startFlavor)", "0–4", "1", "Which bar is selected first: 0 Peanut Cocoa, 1 Berry Oat, 2 Salted Caramel, 3 Mint Chip, 4 Strawberry."],
    ["introEnabled / introVideo", "boolean / string", 'true / (clip URL)', "Play the full-box intro video (4.6 s, then a logo stamp) before the hero enters. Skip is always offered; reduced-motion visitors never see it."],
    ["autoplay / autoplayMs", "boolean / number", "true / 3200", "Advance the flavour on its own after this many ms without interaction, while the hero is mostly in view. The Autoplay button in the hero toggles it."],
    ["smoothScroll", "boolean", "true", "Glide wheel scrolling (desktop mouse and trackpad only)."],
    ["discountLabel / ctaLabel", "string", '"% OFF" / "First dibs"', "Text of the offer chip and the dark button on the right of the nav."],
    ["packPrice", "string", '"$7.48"', "Price shown on the Add to cart button of the 3-pack builder."],
    ["inkColor / creamColor / darkColor", "string", '"#1c1a1f" / "#f0e8e0" / "#191a1e"', "Text colour, the cream page and shop background, and the dark builder background. The hero and 'inside' sections take the active flavour's colour."],
    ["interactive", "boolean", "true", "When false, the intro, autoplay, wheel capture and drag are off (used for the home-page card)."],
    ["style", "CSSProperties", "{}", "Extra styles for the outer wrapper."],
    ["— Dependencies —", "runtime", "—", "React 18 (npm). Loaded at runtime: three@0.160.0 from cdn.jsdelivr.net, Google Fonts (Archivo Black, Inter, DM Mono), the sprite sheet from images.higgs.ai and the intro clip from d8j0ntlcm91z4.cloudfront.net. Browser APIs: WebGL, Canvas 2D, Web Animations, IntersectionObserver, ResizeObserver, Pointer Events."],
  ],
};
