import TryTheLook, { DEFAULT_LOOKS } from "./TryTheLook.jsx";
import source from "./TryTheLook.jsx?raw";

// The editor's Content panel only knows a flat { src, ...fields } shape, so
// the default it starts from is each look's photo and name plus its pieces
// written out as plain lines — the same shape `piecesText` accepts.
const LOOKS_DEFAULT = DEFAULT_LOOKS.map((l) => ({
  src: l.src,
  label: l.label,
  piecesText: l.pieces.map((p) => `${p.brand} | ${p.name} | ${p.price}`).join("\n"),
}));

export default {
  slug: "try-the-look",
  name: "Try the Look",
  tag: "Shop",
  file: "TryTheLook.jsx",
  source,
  Component: TryTheLook,
  description:
    "A full-bleed, round-carousel style row of looks: one character is sharp and centred, the rest blur and dim with distance, in front of a giant faded heading. Click one to bring it into focus and swap the floating cards to that look's pieces and bundle price. Add as many looks as you like — the row always shows the same few at a time.",
  render: () => <TryTheLook />,
  usage: `import TryTheLook from "./TryTheLook";

const looks = [
  {
    label: "Studio Day",
    src: "/images/model-3.webp", // optional per-look photo; falls back to characterImage
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
      default: "Nine looks, styled head to toe. Tap a pin to see the piece.",
    },
    {
      key: "looks", label: "Looks", type: "images", noun: "Looks",
      default: LOOKS_DEFAULT,
      fields: [
        { key: "label", label: "Look name" },
        { key: "piecesText", label: "Pieces (one per line: Brand | Name | Price)", multiline: true },
      ],
    },
    {
      key: "characterImage", label: "Fallback Character Image", type: "text",
      default: "https://reel-ref-try-the-look.vercel.app/assets/model-3-640.webp",
    },
    { key: "bundleLabel", label: "Bundle Label", type: "text", default: "Complete the look" },
    { key: "bundleDiscount", label: "Bundle Discount", type: "number", min: 0, max: 0.9, step: 0.01, default: 0.1 },
    { key: "addToBagLabel", label: "Add to Bag Label", type: "text", default: "Add full look to bag" },
    { key: "spacing", label: "Spacing", type: "number", min: 0.4, max: 2.2, step: 0.05, default: 1 },
    { key: "cardScale", label: "Character Size", type: "number", min: 0.5, max: 1.8, step: 0.05, default: 1 },
    { key: "spinSeconds", label: "Transition Speed", unit: "s", type: "number", min: 0.15, max: 1.5, step: 0.01, default: 0.68 },
    {
      key: "easing", label: "Motion Style", type: "select", default: "smooth",
      options: [
        ["smooth", "Smooth (ease-out)"],
        ["snappy", "Snappy"],
        ["backOut", "Overshoot"],
        ["elastic", "Elastic"],
      ],
    },
    { key: "plateWidth", label: "Texture Plate Width", unit: "px", type: "number", min: 0, max: 80, step: 1, default: 17 },
    { key: "autoplay", label: "Autoplay", type: "toggle", default: false },
    { key: "autoplaySeconds", label: "Auto-Slide Speed", unit: "s", type: "number", min: 0.4, max: 8, step: 0.1, default: 3.2 },
    {
      key: "background", label: "Background", type: "color",
      default: `
    radial-gradient(ellipse 80% 75% at 55% 50%, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 38%, rgba(25,0,0,0.42) 68%, rgba(8,0,0,0.88) 100%),
    radial-gradient(ellipse 45% 50% at 6% 4%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 70%),
    radial-gradient(ellipse 70% 65% at 55% 48%, #F43E22 0%, #DC2A1A 28%, #A8180F 56%, #5C0B07 82%, #2A0504 100%)
  `,
    },
    { key: "color", label: "Text Color", type: "color", default: "#F6E9DE" },
    { key: "accent", label: "Accent / Button", type: "color", default: "#FF5A32" },
  ],
  props: [
    ["looks", "{ label, src?, pieces?: Piece[], piecesText? }[]", "9 sample looks, each its own photo", "Each piece: { brand, name, price, color? }. `piecesText` is the same thing as plain \"Brand | Name | Price\" lines (what the editor's Content panel writes); a look with neither gets a placeholder set. `src` falls back to `characterImage`, or to a built-in image if it's broken. Grows to any length without changing how many cards read as \"in view\" at once."],
    ["characterImage", "string", "model-3-640.webp demo photo", "Fallback photo for any look without its own `src`, or whose `src` fails to load."],
    ["defaultActiveIndex", "number", "min(4, looks.length - 1)", "Which look starts in focus, when `activeIndex` is not supplied."],
    ["activeIndex", "number", "undefined", "Controls the focused look from outside. Omit to let the component manage it."],
    ["heading / subheading", "string", '"Try the Look." / "Nine looks…"', "The heading runs as a giant, dimmed line behind the characters; the subheading sits top-left."],
    ["bundleLabel", "string", '"Complete the look"', "Label above the bundle price."],
    ["bundleDiscount", "number", "0.1", "Share knocked off the bundle total (0–1)."],
    ["addToBagLabel", "string", '"Add full look to bag"', "Text on the main button."],
    ["spacing", "number", "1", "How far a card eases out from centre before it's fully faded — lower packs the row tighter, higher spreads it wider."],
    ["cardScale", "number", "1", "Overall size of every character card."],
    ["spinSeconds", "number", "0.68", "How long a turn takes to settle — the carousel's transition smoothness."],
    ["easing", '"smooth" | "snappy" | "backOut" | "elastic"', '"smooth"', "The motion curve of each turn: fast-start ease-out, a snappy start, a slight overshoot past centre, or a springy wobble. Every curve still ends exactly centred."],
    ["plateWidth", "number", "17", "Width in px of each vertical plate in the backdrop's panel texture. Lower packs more plates in; 0 turns the texture off."],
    ["autoplay", "boolean", "false", "Step through the looks on their own; any click on a character pauses it."],
    ["autoplaySeconds", "number", "3.2", "Seconds between automatic steps while autoplay is on."],
    ["background / color / accent", "string", "scarlet glow + fine stripes / warm cream / burnt orange", "Backdrop (any CSS background), text colour, and the accent used for the look's photo card and buttons."],
    ["onChange", "(index, look) => void", "undefined", "Called when the focused look changes."],
    ["onAddToBag", "(piece | Piece[], index, look, lookIndex) => void", "undefined", "Called from a piece's + button (single piece, index set) or the main button (all pieces, index null)."],
    ["style", "CSSProperties", "undefined", "Extra styles for the outer wrapper."],
  ],
};
