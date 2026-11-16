import SpotlightRail, { DEFAULT_PRODUCTS } from "./SpotlightRail.jsx";
import source from "./SpotlightRail.jsx?raw";

export default {
  slug: "spotlight-rail",
  name: "Spotlight Rail",
  tag: "Shop",
  file: "SpotlightRail.jsx",
  source,
  Component: SpotlightRail,
  description:
    "A rail of garments drifting left at a steady pace, looping forever. The one at the front is lit; the rest stay sharp and fully visible behind it. Hover to pause; arrows, drag or keys step through them, with the name, price and a buy button below.",
  render: () => <SpotlightRail />,
  usage: `import SpotlightRail from "./SpotlightRail";

const products = [
  { src: "/images/tee-skull.png", title: "Winged Skull Tee", price: "€48", buyUrl: "https://shop/tee" },
  { src: "/images/hoodie-zip.png", title: "Black Zip Hoodie", price: "€98" },
  // ...
];

// The rail fills its parent, so give the parent a height.
<div style={{ height: 700 }}>
  <SpotlightRail images={products} onBuy={(p, i) => addToCart(p)} />
</div>`,
  // Editor sidebar. `default` must match the default in SpotlightRail.jsx.
  controls: [
    {
      key: "images", label: "Products", type: "images", noun: "Products",
      default: DEFAULT_PRODUCTS,
      fields: [
        { key: "front", label: "Lit image URL (optional — defaults to the rail image)" },
        { key: "title", label: "Title" },
        { key: "price", label: "Price" },
        { key: "description", label: "Description", multiline: true },
        { key: "buyUrl", label: "Buy link (opens in a new tab)" },
      ],
    },
    { key: "heroHeight", label: "Lit Height", unit: "px", type: "number", min: 140, max: 600, step: 1, default: 330 },
    { key: "backHeight", label: "Back Height", unit: "px", type: "number", min: 80, max: 500, step: 1, default: 200 },
    { key: "spacing", label: "Spacing", unit: "px", type: "number", min: 60, max: 400, step: 1, default: 150 },
    { key: "backBlur", label: "Back Blur", unit: "px", type: "number", min: 0, max: 20, step: 0.1, default: 0 },
    { key: "drift", label: "Drift Speed", type: "number", min: -3, max: 3, step: 0.1, default: 0.5 },
    { key: "backDim", label: "Back Dim", type: "number", min: 0, max: 10, step: 0.1, default: 0 },
    { key: "spotlight", label: "Spotlight", type: "number", min: 0, max: 10, step: 0.1, default: 6 },
    { key: "vignette", label: "Vignette", type: "number", min: 0, max: 10, step: 0.1, default: 6 },
    { key: "sway", label: "Sway", type: "number", min: 0, max: 10, step: 0.1, default: 5 },
    { key: "autoplay", label: "Autoplay", unit: "s", type: "number", min: 0, max: 15, step: 0.5, default: 0 },
    { key: "showRail", label: "Show Rail", type: "toggle", default: true },
    { key: "showArrows", label: "Arrows", type: "toggle", default: true },
    { key: "showCounter", label: "Counter", type: "toggle", default: true },
    { key: "showCaption", label: "Caption", type: "toggle", default: true },
    { key: "buyLabel", label: "Button Label", type: "text", default: "Add to cart" },
    { key: "railColor", label: "Rail Color", type: "color", default: "#8E9095" },
    { key: "textColor", label: "Text Color", type: "color", default: "#F2EFEA" },
    { key: "accent", label: "Accent", type: "color", default: "#F2EFEA" },
    { key: "background", label: "Background", type: "color", default: "#0B0A0A" },
  ],
  props: [
    ["images", "Product[]", "8 sample garments", "Each product: { src, front?, title?, price?, description?, buyUrl?, buyLabel? }. `front` is an optional different picture for the lit garment."],
    ["heroHeight", "number", "330", "Height of the lit garment in px."],
    ["backHeight", "number", "200", "Height of the garments hanging back in the dark."],
    ["spacing", "number", "150", "Distance between garments along the rail."],
    ["backBlur", "number", "0", "How far out of focus the garments behind go. 0 keeps them sharp."],
    ["drift", "number", "0.5", "Garments per second the rail travels left at a constant speed, looping forever. Negative goes right; 0 stops it. Pauses while the pointer is over the rail."],
    ["backDim", "number", "0", "How far into the dark they fall, 0–10."],
    ["spotlight", "number", "6", "Strength of the pool of light the lit garment stands in."],
    ["vignette", "number", "6", "How much the edges of the frame fall away."],
    ["sway", "number", "5", "How much the garments swing from their hangers as the rail moves."],
    ["autoplay", "number", "0", "Seconds between steps on its own. 0 is off; it pauses while the pointer is over the rail."],
    ["showRail / showArrows / showCounter / showCaption", "boolean", "true", "Turn the bar, the arrows, the 01 / 10 counter, or the whole caption off."],
    ["buyLabel", "string", '"Add to cart"', "Text of the button. A product's own buyLabel wins; empty hides it."],
    ["railColor / textColor / accent", "string", "greys and off-white", "The bar and wire hangers, the caption text, and the arrows and button."],
    ["onBuy", "(product, index) => void", "undefined", "Called when the button is pressed."],
    ["onChange", "(product, index) => void", "undefined", "Called whenever the lit garment changes."],
    ["background", "string", '"#0B0A0A"', "Background of the room, also used by the vignette."],
    ["style", "CSSProperties", "undefined", "Extra styles for the outer wrapper."],
  ],
};
