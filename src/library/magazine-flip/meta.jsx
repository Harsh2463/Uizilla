import MagazineFlip, { DEFAULT_PRODUCTS } from "./MagazineFlip.jsx";
import source from "./MagazineFlip.jsx?raw";

export default {
  slug: "magazine-flip",
  name: "Magazine Flip",
  tag: "Shop",
  file: "MagazineFlip.jsx",
  source,
  Component: MagazineFlip,
  description:
    "A corridor of sheets you walk through. Tap a product and it lifts out and fills the frame, with a panel for its price, specifications and a Buy button. Built for showing shop products.",
  // The demo on the component page leaves the page scrollable; the editor and
  // the component's own default capture the wheel.
  render: () => <MagazineFlip scrollLock={false} />,
  usage: `import MagazineFlip from "./MagazineFlip";

const products = [
  {
    src: "/images/aero-run.jpg",
    title: "Aero Run Sneakers",
    price: "$129",
    description: "Lightweight everyday runner.",
    specs: [["Material", "Recycled mesh"], ["Weight", "240 g"]],
    buyUrl: "https://your-shop.com/aero-run",
  },
  // ...
];

// The gallery fills its parent, so give the parent a height.
<div style={{ height: 640 }}>
  <MagazineFlip
    images={products}
    onBuy={(product, index) => addToCart(product)}
  />
</div>`,
  // Editor sidebar. `default` must match the default in MagazineFlip.jsx.
  controls: [
    {
      key: "images", label: "Products", type: "images", noun: "Products",
      default: DEFAULT_PRODUCTS,
      // The deck has `pages` sheets and the products repeat across them, so a
      // product past the end of the deck is never drawn.
      note: (v) =>
        v.images.length > v.pages
          ? `The deck has ${v.pages} sheets, so only the first ${v.pages} of your ${v.images.length} products appear. Raise Pages to at least ${v.images.length}.`
          : null,
      fields: [
        { key: "title", label: "Title" },
        { key: "price", label: "Price" },
        { key: "description", label: "Description", multiline: true },
        { key: "specs", label: "Specifications (one per line, Label: value)", type: "specs" },
        { key: "buyUrl", label: "Buy link (opens in a new tab)" },
      ],
    },
    { key: "pages", label: "Pages", type: "number", min: 4, max: 60, step: 1, default: 20 },
    { key: "spacing", label: "Spacing", type: "number", min: 0, max: 10, step: 0.1, default: 5 },
    { key: "pageWidth", label: "Page Width", unit: "px", type: "number", min: 100, max: 1200, step: 1, default: 600 },
    { key: "pageHeight", label: "Page Height", unit: "px", type: "number", min: 100, max: 1000, step: 1, default: 500 },
    { key: "tilt", label: "Tilt", unit: "°", type: "number", min: -45, max: 45, step: 1, default: 0 },
    { key: "turn", label: "Turn", unit: "°", type: "number", min: -60, max: 60, step: 1, default: 0 },
    { key: "tap", label: "Tap to Open", type: "toggle", default: true },
    { key: "showDetails", label: "Product Panel", type: "toggle", default: true },
    { key: "imageProxy", label: "Image Proxy", type: "text", default: "https://images.weserv.nl/?url={url}" },
    { key: "hoverEffect", label: "Hover Highlight", type: "toggle", default: true },
    { key: "hoverLabel", label: "Hover Label", type: "toggle", default: true },
    { key: "hoverColor", label: "Highlight", type: "color", default: "#FFFFFF" },
    { key: "zoom", label: "Zoom", type: "number", min: 0, max: 10, step: 0.1, default: 5 },
    { key: "openSpeed", label: "Open Speed", type: "number", min: 0, max: 10, step: 0.1, default: 5 },
    { key: "drift", label: "Drift", type: "number", min: -10, max: 10, step: 0.1, default: 2 },
    { key: "smoothing", label: "Smoothing", type: "number", min: 0, max: 10, step: 0.1, default: 5 },
    { key: "wave", label: "Wave", type: "number", min: 0, max: 10, step: 0.1, default: 5 },
    { key: "scrollSens", label: "Scroll Sens.", type: "number", min: 0, max: 10, step: 0.1, default: 5 },
    { key: "scrollLock", label: "Scroll Lock", type: "toggle", default: true },
    { key: "buyLabel", label: "Buy Label", type: "text", default: "Buy now" },
    { key: "panelBackground", label: "Panel Color", type: "color", default: "#FFFFFF" },
    { key: "panelColor", label: "Panel Text", type: "color", default: "#111111" },
    { key: "accent", label: "Buy Button", type: "color", default: "#111111" },
    { key: "background", label: "Background", type: "color", default: "#000000" },
  ],
  props: [
    ["images", "Product[]", "8 sample products", "Each product: { src, offsetY?, title?, price?, description?, specs?: [label, value][], buyUrl?, buyLabel? }. A bare URL string also works. Empty or broken pictures fall back to a built-in image."],
    ["pages", "number", "20", "Sheets in the deck, 4–60. Fewer products than pages simply repeat."],
    ["spacing", "number", "5", "Gap between sheets, 0–10."],
    ["pageWidth", "number", "600", "Sheet width in px at full size. Sheets shrink on small frames."],
    ["pageHeight", "number", "500", "Sheet height in px at full size."],
    ["tilt", "number", "0", "Resting pitch of the whole corridor, in degrees."],
    ["turn", "number", "0", "How far the sheets turn to face you, in degrees. 0 is the grazing view."],
    ["tap", "boolean", "true", "Tapping a sheet lifts it out of the line. Esc, a tap anywhere, or Close puts it back."],
    ["showDetails", "boolean", "true", "Open the product panel (title, price, description, specifications, Buy) beside the lifted sheet."],
    ["imageProxy", "string", '"https://images.weserv.nl/?url={url}"', "Used only when a picture's own host blocks it: the URL is retried through this proxy, with {url} replaced by the encoded address. Set to \"\" to switch it off."],
    ["hoverEffect", "boolean", "true", "The card under the pointer swells, brightens and gets an outline while the others step back, so you can see which one will open."],
    ["hoverLabel", "boolean", "true", "Show a small label (title, price, \"Click to view\") next to the pointer over a card."],
    ["hoverColor", "string", '"#FFFFFF"', "Outline colour of the hovered card."],
    ["zoom", "number", "5", "How much of the frame the lifted sheet fills."],
    ["openSpeed", "number", "5", "How fast a sheet travels out of the line and back."],
    ["drift", "number", "2", "How fast the corridor walks on its own. Negative walks the other way; 0 stops it."],
    ["smoothing", "number", "5", "How much weight the corridor carries after the input stops."],
    ["wave", "number", "5", "How hard a fast pass bows each sheet. 0 keeps them flat."],
    ["scrollSens", "number", "5", "How far one notch of wheel walks the corridor."],
    ["scrollLock", "boolean", "true", "Consume the wheel over the component so the page does not scroll past it."],
    ["buyLabel", "string", '"Buy now"', "Text of the Buy button. A product's own buyLabel wins."],
    ["panelBackground", "string", '"#FFFFFF"', "Product panel background."],
    ["panelColor", "string", '"#111111"', "Product panel text colour."],
    ["accent", "string", '"#111111"', "Buy button colour."],
    ["onBuy", "(product, index) => void", "undefined", "Called when Buy is pressed, e.g. to add to a cart. buyUrl, if set, also opens."],
    ["onOpen / onClose", "(product, index) => void / () => void", "undefined", "Called as a product opens and closes."],
    ["background", "string", '"#000000"', "Background colour behind the corridor."],
    ["style", "CSSProperties", "undefined", "Extra styles for the outer wrapper."],
  ],
};
