import TryTheLook, { DEFAULT_LOOKS } from "./TryTheLook.jsx";
import source from "./TryTheLook.jsx?raw";

// The editor's Content panel only knows a flat { src, ...fields } shape, so
// the default it starts from is each look's photo and name plus its pieces
// written out as plain lines — the same shape `piecesText` accepts.
const LOOKS_DEFAULT = DEFAULT_LOOKS.map((l) => ({
  src: "",
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
    "Looks on a 3D runway ring: the active model stands front and centre, the others curve away, shrink, blur and fade, all driven by one spring so clicks, drags, swipes, arrow keys and autoplay glide the same way. A soft light sweep crosses the model as it lands; on phones the ring becomes a diagonal line. Models and outfit thumbnails come from two sprite sheets.",
  render: () => <TryTheLook />,
  usage: `import TryTheLook from "./TryTheLook";

const looks = [
  {
    label: "Studio Day",
    src: "/images/model-3.webp", // optional; omit to use the sprite-sheet model for this look
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
    { key: "modelSheet", label: "Models Sprite Sheet URL (3 x 3)", type: "text", default: "https://ik.imagekit.io/Harsh2463/jackets/Nine%20Casual%20Male%20Fashion%20Cutouts.png?tr=f-webp,q-90" },
    { key: "outfitSheet", label: "Outfit Sprite Sheet URL (9 x 3)", type: "text", default: "https://ik.imagekit.io/Harsh2463/jackets/Three-Row%20Streetwear%20Collection.png?tr=f-webp,q-90" },
    { key: "bundleLabel", label: "Bundle Label", type: "text", default: "Complete the look" },
    { key: "bundleDiscount", label: "Bundle Discount", type: "number", min: 0, max: 0.9, step: 0.01, default: 0.1 },
    { key: "addToBagLabel", label: "Add to Bag Label", type: "text", default: "Add full look to bag" },
    { key: "spacing", label: "Spacing", type: "number", min: 0.4, max: 2.2, step: 0.05, default: 1 },
    { key: "cardScale", label: "Character Size", type: "number", min: 0.5, max: 1.8, step: 0.05, default: 1 },
    { key: "spinSeconds", label: "Transition Speed", unit: "s", type: "number", min: 0.15, max: 1.5, step: 0.01, default: 0.68 },
    { key: "plateWidth", label: "Texture Plate Width", unit: "px", type: "number", min: 0, max: 80, step: 1, default: 17 },
    { key: "autoplay", label: "Autoplay", type: "toggle", default: true },
    { key: "autoplaySeconds", label: "Auto-Slide Speed", unit: "s", type: "number", min: 0.4, max: 12, step: 0.1, default: 5 },
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
    ["looks", "{ label, src?, pieces?: Piece[], piecesText? }[]", "9 sample looks, one per sprite-sheet model", "Each piece: { brand, name, price, color? }. `piecesText` is the same thing as plain \"Brand | Name | Price\" lines (what the editor's Content panel writes); a look with neither gets a placeholder set. `src` is optional: without it the look uses its sprite-sheet model and outfit column. Grows to any length without changing how many cards read as \"in view\" at once."],
    ["modelSheet / outfitSheet", "string", "the two ImageKit sprite sheets (WebP)", "Models: a 3 x 3 sheet (look k uses model k). Outfits: 9 columns x 3 rows (top, bottom, shoes) — look k uses column k, shown as the thumbnails in \"In this look\". A look with its own `src` uses that photo instead."],
    ["defaultActiveIndex", "number", "min(4, looks.length - 1)", "Which look starts in focus, when `activeIndex` is not supplied."],
    ["activeIndex", "number", "undefined", "Controls the focused look from outside. Omit to let the component manage it."],
    ["heading / subheading", "string", '"Try the Look." / "Nine looks…"', "The heading runs as a giant, dimmed line behind the characters; the subheading sits top-left."],
    ["bundleLabel", "string", '"Complete the look"', "Label above the bundle price."],
    ["bundleDiscount", "number", "0.1", "Share knocked off the bundle total (0–1)."],
    ["addToBagLabel", "string", '"Add full look to bag"', "Text on the main button."],
    ["spacing", "number", "1", "How far a card eases out from centre before it's fully faded — the angle between neighbouring looks on the ring — lower packs them closer, higher spreads them wider."],
    ["cardScale", "number", "1", "Overall size of every character card."],
    ["spinSeconds", "number", "0.68", "How long a turn takes to settle — the carousel's transition smoothness."],
    ["plateWidth", "number", "17", "Width in px of each vertical plate in the backdrop's panel texture. Lower packs more plates in; 0 turns the texture off."],
    ["autoplay", "boolean", "true", "Steps to the next look every few seconds with a thin progress bar along the bottom; any click, drag or key restarts the timer. Off for reduced-motion visitors."],
    ["autoplaySeconds", "number", "5", "Seconds between automatic steps while autoplay is on."],
    ["background / color / accent", "string", "scarlet glow + fine stripes / warm cream / burnt orange", "Backdrop (any CSS background), text colour, and the accent used for the look's photo card and buttons."],
    ["onChange", "(index, look) => void", "undefined", "Called when the focused look changes."],
    ["onAddToBag", "(piece | Piece[], index, look, lookIndex) => void", "undefined", "Called from a piece's + button (single piece, index set) or the main button (all pieces, index null)."],
    ["style", "CSSProperties", "undefined", "Extra styles for the outer wrapper."],
  ],
};
