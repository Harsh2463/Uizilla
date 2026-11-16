import ClothingFlip, { DEFAULT_PRODUCTS } from "./ClothingFlip.jsx";
import source from "./ClothingFlip.jsx?raw";

export default {
  slug: "clothing-flip",
  name: "Clothing Flip",
  tag: "Shop",
  file: "ClothingFlip.jsx",
  source,
  Component: ClothingFlip,
  description:
    "Magazine Flip for clothes: garments hang edge-on from a bar and drift left on a loop. Point at one and it turns to face you; click it for a full view with arrows, price and a button.",
  // The demo on the component page leaves the page scrollable; the editor and
  // the component's own default capture the wheel.
  render: () => <ClothingFlip scrollLock={false} />,
  usage: `import ClothingFlip from "./ClothingFlip";

const products = [
  {
    src: "/images/hoodie.png",   // ONE picture of the garment on its hanger (a transparent cut-out works best)
    title: "Believe in Yourself Hoodie",
    price: "$98",
    buyUrl: "https://your-shop.com/hoodie",
  },
  // ...
];

// The rail fills its parent, so give the parent a height.
<div style={{ height: 640 }}>
  <ClothingFlip
    images={products}
    onBuy={(product, index) => addToCart(product)}
  />
</div>`,
  // Editor sidebar. `default` must match the default in ClothingFlip.jsx.
  controls: [
    {
      key: "images", label: "Products", type: "images", noun: "Products",
      default: DEFAULT_PRODUCTS,
      fields: [
        { key: "title", label: "Title" },
        { key: "price", label: "Price" },
        { key: "buyUrl", label: "Button link (opens in a new tab)" },
      ],
    },
    { key: "pages", label: "Hangers (min.)", type: "number", min: 4, max: 60, step: 1, default: 10 },
    { key: "spacing", label: "Spacing", type: "number", min: 0, max: 10, step: 0.1, default: 5 },
    { key: "garmentWidth", label: "Garment Width", unit: "px", type: "number", min: 100, max: 800, step: 1, default: 300 },
    { key: "garmentHeight", label: "Garment Height", unit: "px", type: "number", min: 100, max: 800, step: 1, default: 360 },
    { key: "sideTurn", label: "Side Turn", type: "number", min: 0, max: 10, step: 0.1, default: 8 },
    { key: "showRail", label: "Show Rail", type: "toggle", default: true },
    { key: "railColor", label: "Rail Color", type: "color", default: "#C9CBD1" },
    { key: "tap", label: "Click to Open", type: "toggle", default: true },
    { key: "showDetails", label: "Caption and Arrows", type: "toggle", default: true },
    { key: "imageProxy", label: "Image Proxy", type: "text", default: "https://images.weserv.nl/?url={url}" },
    { key: "hoverEffect", label: "Hover Front View", type: "toggle", default: true },
    { key: "hoverLabel", label: "Hover Label", type: "toggle", default: true },
    { key: "zoom", label: "Zoom", type: "number", min: 0, max: 10, step: 0.1, default: 5 },
    { key: "openSpeed", label: "Open Speed", type: "number", min: 0, max: 10, step: 0.1, default: 5 },
    { key: "drift", label: "Drift", type: "number", min: -10, max: 10, step: 0.1, default: 1.5 },
    { key: "smoothing", label: "Smoothing", type: "number", min: 0, max: 10, step: 0.1, default: 5 },
    { key: "sway", label: "Sway", type: "number", min: 0, max: 10, step: 0.1, default: 5 },
    { key: "scrollSens", label: "Scroll Sens.", type: "number", min: 0, max: 10, step: 0.1, default: 5 },
    { key: "scrollLock", label: "Scroll Lock", type: "toggle", default: true },
    { key: "buyLabel", label: "Button Label", type: "text", default: "See availability" },
    { key: "captionColor", label: "Caption Color", type: "color", default: "#F4F4F5" },
    { key: "background", label: "Background", type: "color", default: "#0E0E10" },
  ],
  props: [
    ["images", "Product[]", "10 sample products", "Each product: { src, title?, price?, buyUrl?, buyLabel? }. A bare URL string also works. One picture per product: the edge-on view is that picture turned on its edge. A transparent cut-out with the hook at the top works best; an entry whose picture fails to load shows a numbered stand-in."],
    ["pages", "number", "10", "The least number of hangers on the rail, 4–60. A wide frame gets more automatically so the seam never shows, and fewer products than hangers simply repeat."],
    ["spacing", "number", "5", "Gap between hangers along the bar, 0–10."],
    ["garmentWidth", "number", "300", "Width in px of a garment facing you, at full size. Garments shrink on small frames."],
    ["garmentHeight", "number", "360", "Height in px of every garment, the same edge-on and facing you."],
    ["sideTurn", "number", "8", "How far garments are turned away on the rail. 10 is nearly edge-on, 0 leaves them facing you."],
    ["showRail", "boolean", "true", "Draw the bar the hangers hang from."],
    ["railColor", "string", '"#C9CBD1"', "Colour of the bar."],
    ["tap", "boolean", "true", "Clicking a garment lifts it to the middle. Esc, ✕, or a click anywhere puts it back."],
    ["showDetails", "boolean", "true", "Show the counter, title, price, button and browse arrows under a held-up garment."],
    ["imageProxy", "string", '"https://images.weserv.nl/?url={url}"', "Used only when a picture's own host blocks it: the URL is retried through this proxy, with {url} replaced by the encoded address. Set to \"\" to switch it off."],
    ["hoverEffect", "boolean", "true", "The garment under the pointer turns to face you and its neighbours part to make room."],
    ["hoverLabel", "boolean", "true", "Show a small label (title, price, \"Click to view\") next to the pointer over a garment."],
    ["zoom", "number", "5", "How much of the frame a held-up garment fills."],
    ["openSpeed", "number", "5", "How fast a garment travels to the middle and back."],
    ["drift", "number", "1.5", "How fast the rail travels left on its own. Negative goes right; 0 stops it. It holds still while the pointer is on a garment."],
    ["smoothing", "number", "5", "How much weight the rail carries after the input stops."],
    ["sway", "number", "5", "How much the garments swing on their hangers as the rail moves."],
    ["scrollSens", "number", "5", "How far one notch of wheel moves the rail."],
    ["scrollLock", "boolean", "true", "Consume the wheel over the component so the page does not scroll past it."],
    ["buyLabel", "string", '"See availability"', "Text of the button. A product's own buyLabel wins."],
    ["captionColor", "string", '"#F4F4F5"', "Colour of the caption text, arrows and button outline."],
    ["onBuy", "(product, index) => void", "undefined", "Called when the button is pressed, e.g. to add to a cart. buyUrl, if set, also opens."],
    ["onOpen / onClose", "(product, index) => void / () => void", "undefined", "Called as a product opens (and as you browse to the next) and as it closes."],
    ["background", "string", '"#0E0E10"', "Background colour behind the rail."],
    ["style", "CSSProperties", "undefined", "Extra styles for the outer wrapper."],
  ],
};
