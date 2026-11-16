import TryTheLook, { DEFAULT_LOOKS } from "./TryTheLook.jsx";
import source from "./TryTheLook.jsx?raw";

export default {
  slug: "try-the-look",
  name: "Try the Look",
  tag: "Shop",
  file: "TryTheLook.jsx",
  source,
  Component: TryTheLook,
  description:
    "A round-carousel style row of looks: one character is sharp and centred, the rest blur and fade with distance. Click one to bring it into focus and swap the side panel to that look's pieces and bundle price.",
  render: () => <TryTheLook />,
  usage: `import TryTheLook from "./TryTheLook";

const looks = [
  {
    label: "Studio Day",
    image: "/images/model-3.webp", // optional per-look photo; falls back to characterImage
    pieces: [
      { brand: "Nike", name: "Sweatshirt", price: 199, color: "#D9CDBF" },
      { brand: "Nikey", name: "Tatum 5 Orbit", price: 149, color: "#1A1A1C" },
      { brand: "Nike", name: "Reign Tshirt", price: 199, color: "#17181A" },
    ],
  },
  // ...
];

// Fills its parent, so give the parent a height.
<div style={{ height: 640 }}>
  <TryTheLook
    looks={looks}
    onChange={(index, look) => console.log("now showing", look.label)}
    onAddToBag={(piece, index, look) => addToCart(piece)}
  />
</div>`,
  // Editor sidebar. `default` must match the default in TryTheLook.jsx.
  controls: [
    { key: "heading", label: "Heading", type: "text", default: "Try the Look." },
    {
      key: "subheading", label: "Subheading", type: "text",
      default: "Six looks, styled head to toe. Tap a pin to see the piece.",
    },
    {
      key: "characterImage", label: "Character Image", type: "text",
      default: "https://reel-ref-try-the-look.vercel.app/assets/model-3-640.webp",
    },
    { key: "bundleLabel", label: "Bundle Label", type: "text", default: "Complete the look" },
    { key: "bundleDiscount", label: "Bundle Discount", type: "number", min: 0, max: 0.9, step: 0.01, default: 0.1 },
    { key: "addToBagLabel", label: "Add to Bag Label", type: "text", default: "Add full look to bag" },
    { key: "spacing", label: "Spacing", type: "number", min: 0.4, max: 2.2, step: 0.05, default: 1 },
    { key: "cardScale", label: "Character Size", type: "number", min: 0.5, max: 1.8, step: 0.05, default: 1 },
    { key: "spinSeconds", label: "Transition Speed", unit: "s", type: "number", min: 0.15, max: 1.5, step: 0.01, default: 0.68 },
    { key: "autoplay", label: "Autoplay", type: "toggle", default: false },
    { key: "autoplaySeconds", label: "Auto-Slide Speed", unit: "s", type: "number", min: 0.4, max: 8, step: 0.1, default: 3.2 },
    { key: "sidebarCollapsible", label: "Sidebar Collapsible", type: "toggle", default: true },
    { key: "defaultSidebarOpen", label: "Sidebar Open by Default", type: "toggle", default: true },
    { key: "background", label: "Background", type: "color", default: "#FFFFFF" },
    { key: "color", label: "Text Color", type: "color", default: "#111111" },
    { key: "accent", label: "Accent / Button", type: "color", default: "#111111" },
  ],
  props: [
    ["looks", "{ label, image?, pieces: Piece[] }[]", "6 sample looks", "Each piece: { brand, name, price, color? }. `image` falls back to `characterImage`."],
    ["characterImage", "string", "model-3-640.webp demo photo", "Shared photo used for any look without its own `image`."],
    ["defaultActiveIndex", "number", "min(4, looks.length - 1)", "Which look starts in focus, when `activeIndex` is not supplied."],
    ["activeIndex", "number", "undefined", "Controls the focused look from outside. Omit to let the component manage it."],
    ["heading / subheading", "string", '"Try the Look." / "Six looks…"', "Title copy above the carousel."],
    ["bundleLabel", "string", '"Complete the look"', "Label above the bundle price."],
    ["bundleDiscount", "number", "0.1", "Share knocked off the bundle total (0–1)."],
    ["addToBagLabel", "string", '"Add full look to bag"', "Text on the main button."],
    ["spacing", "number", "1", "How far a card eases out from centre before it's fully faded — lower packs the row tighter, higher spreads it wider."],
    ["cardScale", "number", "1", "Overall size of every character card."],
    ["spinSeconds", "number", "0.68", "How long a turn takes to settle — the carousel's transition smoothness."],
    ["autoplay", "boolean", "false", "Step through the looks on their own; the ▶ button toggles it, and any click pauses it."],
    ["autoplaySeconds", "number", "3.2", "Seconds between automatic steps while autoplay is on."],
    ["sidebarCollapsible", "boolean", "true", "Shows a toggle on the panel header so the piece list and bundle price can be folded away."],
    ["defaultSidebarOpen", "boolean", "true", "Whether the panel starts open."],
    ["background / color / accent", "string", "white / near-black / near-black", "Panel background, text colour, and the accent used for the active nav bar and buttons."],
    ["onChange", "(index, look) => void", "undefined", "Called when the focused look changes."],
    ["onAddToBag", "(piece | Piece[], index, look, lookIndex) => void", "undefined", "Called from a piece's + button (single piece, index set) or the main button (all pieces, index null)."],
    ["style", "CSSProperties", "undefined", "Extra styles for the outer wrapper."],
  ],
};
