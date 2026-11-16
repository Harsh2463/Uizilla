import ClothingRail, { DEFAULT_PRODUCTS } from "./ClothingRail.jsx";
import source from "./ClothingRail.jsx?raw";

export default {
  slug: "clothing-rail",
  name: "Clothing Rail",
  tag: "Shop",
  file: "ClothingRail.jsx",
  source,
  Component: ClothingRail,
  description:
    "Garments hanging from a rail, swaying as it moves. Hover one and its neighbours part to show the full front view; click to open it with sizes, details and a Buy button.",
  render: () => <ClothingRail />,
  usage: `import ClothingRail from "./ClothingRail";

const products = [
  {
    src: "/images/hoodie-side.png",   // the side view on the rail
    front: "/images/hoodie-front.png", // shown on hover and when open
    title: "Believe in Yourself Hoodie",
    price: "$79",
    description: "Heavyweight cotton-blend hoodie.",
    sizes: ["S", "M", "L", "XL"],
    specs: [["Material", "80% cotton"], ["Fit", "Relaxed"]],
    buyUrl: "https://your-shop.com/hoodie",
  },
  // ...
];

// The rail fills its parent, so give the parent a height.
<div style={{ height: 620 }}>
  <ClothingRail
    images={products}
    onBuy={(product, index, size) => addToCart(product, size)}
  />
</div>`,
  // Editor sidebar. `default` must match the default in ClothingRail.jsx.
  controls: [
    {
      key: "images", label: "Products", type: "images", noun: "Products",
      default: DEFAULT_PRODUCTS,
      fields: [
        { key: "front", label: "Front view image URL (shown on hover and when open)" },
        { key: "title", label: "Title" },
        { key: "price", label: "Price" },
        { key: "description", label: "Description", multiline: true },
        { key: "sizes", label: "Sizes (comma separated)" },
        { key: "specs", label: "Details (one per line, Label: value)", type: "specs" },
        { key: "buyUrl", label: "Buy link (opens in a new tab)" },
      ],
    },
    { key: "garmentHeight", label: "Garment Height", unit: "px", type: "number", min: 120, max: 700, step: 1, default: 340 },
    { key: "sideWidth", label: "Side Width", unit: "px", type: "number", min: 50, max: 400, step: 1, default: 120 },
    { key: "frontWidth", label: "Front Width", unit: "px", type: "number", min: 80, max: 600, step: 1, default: 260 },
    { key: "gap", label: "Gap", unit: "px", type: "number", min: 0, max: 160, step: 1, default: 26 },
    { key: "railDrop", label: "Rail Height", unit: "px", type: "number", min: 0, max: 300, step: 1, default: 92 },
    { key: "showRail", label: "Show Rail", type: "toggle", default: true },
    { key: "speed", label: "Speed", type: "number", min: -10, max: 10, step: 0.1, default: 2 },
    { key: "sway", label: "Sway", type: "number", min: 0, max: 10, step: 0.1, default: 5 },
    { key: "scrollSens", label: "Scroll Sens.", type: "number", min: 0, max: 10, step: 0.1, default: 5 },
    { key: "smoothing", label: "Smoothing", type: "number", min: 0, max: 10, step: 0.1, default: 5 },
    { key: "hoverEffect", label: "Hover Opens Out", type: "toggle", default: true },
    { key: "hoverLabel", label: "Hover Label", type: "toggle", default: true },
    { key: "tap", label: "Tap to Open", type: "toggle", default: true },
    { key: "showDetails", label: "Product Panel", type: "toggle", default: true },
    { key: "zoom", label: "Zoom", type: "number", min: 0, max: 10, step: 0.1, default: 5 },
    { key: "scrollLock", label: "Scroll Lock", type: "toggle", default: false },
    { key: "buyLabel", label: "Buy Label", type: "text", default: "Buy now" },
    { key: "railColor", label: "Rail Color", type: "color", default: "#C9CBD1" },
    { key: "panelBackground", label: "Panel Color", type: "color", default: "#FFFFFF" },
    { key: "panelColor", label: "Panel Text", type: "color", default: "#111111" },
    { key: "accent", label: "Buy Button", type: "color", default: "#111111" },
    { key: "background", label: "Background", type: "color", default: "#0E0E10" },
  ],
  props: [
    ["images", "Product[]", "8 sample garments", "Each product: { src (side view), front (front view), title?, price?, description?, sizes?, specs?: [label, value][], buyUrl?, buyLabel? }."],
    ["garmentHeight", "number", "340", "Height of a garment in px."],
    ["sideWidth", "number", "120", "Width of a garment hanging side-on."],
    ["frontWidth", "number", "260", "Width it opens out to on hover, showing the front view."],
    ["gap", "number", "26", "Space between garments on the rail."],
    ["railDrop", "number", "92", "How far down the frame the rail bar sits."],
    ["showRail", "boolean", "true", "Draw the rail bar the garments hang from."],
    ["speed", "number", "2", "How fast the rail drifts on its own. Negative goes the other way; 0 stops it."],
    ["sway", "number", "5", "How much the garments swing as the rail moves. 0 holds them still."],
    ["scrollSens", "number", "5", "How far one notch of wheel or a drag moves the rail."],
    ["smoothing", "number", "5", "How much weight the rail carries after the input stops."],
    ["hoverEffect", "boolean", "true", "Hovering a garment parts its neighbours and shows its front view."],
    ["hoverLabel", "boolean", "true", "Show a small label with the title and price next to the pointer."],
    ["tap", "boolean", "true", "Clicking a garment opens it. Esc, ✕, or another click closes it."],
    ["showDetails", "boolean", "true", "Open the product panel (title, price, description, sizes, details, Buy)."],
    ["zoom", "number", "5", "How much of the frame an open garment fills."],
    ["scrollLock", "boolean", "false", "Consume the wheel over the component so the page does not scroll past it."],
    ["buyLabel", "string", '"Buy now"', "Text of the Buy button. A product's own buyLabel wins."],
    ["railColor", "string", '"#C9CBD1"', "Colour of the rail bar and the hangers."],
    ["panelBackground / panelColor / accent", "string", "white / near-black / near-black", "Product panel background, its text, and the Buy button."],
    ["onBuy", "(product, index, size) => void", "undefined", "Called when Buy is pressed, with the chosen size."],
    ["onOpen / onClose", "(product, index) => void / () => void", "undefined", "Called as a product opens and closes."],
    ["background", "string", '"#0E0E10"', "Background behind the rail."],
    ["style", "CSSProperties", "undefined", "Extra styles for the outer wrapper."],
  ],
};
