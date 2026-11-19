import GarmentRail from "./GarmentRail.jsx";
import source from "./GarmentRail.jsx?raw";

const proxy = (u, w) => `https://images.higgs.ai/?default=1&output=webp&url=${encodeURIComponent(u)}&w=${w}&q=85`;
const CF = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/";

export default {
  slug: "garment-rail",
  name: "Garment Rail",
  tag: "Product",
  file: "GarmentRail.jsx",
  source,
  Component: GarmentRail,
  description:
    "HINA, a children's clothing hero: one quiet studio wall with a steep diagonal rail. Twelve garments hang on it, the first large at the front, the rest receding behind it. Browse with the wheel, arrow keys, arrow buttons or a swipe, hover a piece to see it lifted like a hanger, click one to bring it to the front, and click the front piece to close the rail into a soft blurred stack while a three-tab photo panel slides in. Pastel, thin, wide-tracked type and slow eased motion throughout.",
  // Rendered on the home page card and on the component page.
  render: ({ interactive = true } = {}) => <GarmentRail intro={interactive} />,
  usage: `import GarmentRail from "./GarmentRail";

// Fills its parent, so give the parent a height (e.g. a full-screen section).
<section style={{ height: "100vh" }}>
  <GarmentRail
    brand="HINA"
    collection="LITTLE WARDROBE"
    wheelBrowse={true}
  />
</section>

// Needs, at runtime: Noto Sans (loaded from Google's font host) and the four image sheets (URLs).`,
  // Editor sidebar. `default` must match the default in GarmentRail.jsx.
  controls: [
    { key: "brand", label: "Brand Name", type: "text", default: "HINA" },
    { key: "collection", label: "Collection Name (footer)", type: "text", default: "LITTLE WARDROBE" },
    { key: "navLinks", label: "Nav Links (up to 4)", type: "words", noun: "links", default: ["CLOTHING", "ACCESSORY", "JOURNAL", "ABOUT"] },
    {
      key: "products", label: "Pieces (Title 1 | Title 2 | Desc 1 | Desc 2 | Material | Colour | Size)", type: "words", noun: "pieces",
      default: [
        "SMOCK | DRESS | Soft brushed cotton with hand | smocking. Made for play and naps. | ORGANIC COTTON | PERIWINKLE / BLUSH / CLOUD | 2Y / 4Y / 6Y",
        "MUSLIN | DRESS | Airy double gauze with little | flutter sleeves for warm days. | COTTON MUSLIN | CLOUD WHITE | 2Y / 4Y / 6Y",
        "POINTELLE | CARDIGAN | Fine pointelle knit with wooden | buttons. Light and easy to layer. | COTTON KNIT | BLUSH | 1Y / 2Y / 4Y",
        "DENIM | DUNGAREE | Washed soft denim with a full | skirt and adjustable straps. | COTTON DENIM | PERIWINKLE WASH | 2Y / 4Y / 6Y",
        "RUFFLE | BLOUSE | Crinkled cotton with a wide | ruffle collar and puff sleeves. | COTTON CRINKLE | LILAC GREY | 2Y / 4Y / 6Y",
        "BRODERIE | SMOCK | Broderie anglaise with frilled | shoulders and a roomy cut. | COTTON BRODERIE | CLOUD WHITE | 2Y / 4Y / 6Y",
        "LINEN | PINAFORE | Washed linen with button straps | and two deep patch pockets. | LINEN 100% | BLUSH | 2Y / 4Y / 6Y",
        "SOFT KNIT | JUMPER | Open-stitch cotton knit with a | gentle, easy round neck. | COTTON KNIT | PERIWINKLE | 1Y / 2Y / 4Y",
        "FRILL | DRESS | Pintucked cotton with frilled | shoulders and elastic cuffs. | ORGANIC COTTON | CLOUD WHITE | 2Y / 4Y / 6Y",
        "POCKET | PINAFORE | Soft twill with frilled straps | and pockets for small treasures. | COTTON TWILL | LILAC GREY | 2Y / 4Y / 6Y",
        "GINGHAM | DRESS | Smocked gingham with short | puff sleeves for sunny days. | COTTON GINGHAM | BLUSH / CREAM | 2Y / 4Y / 6Y",
        "QUILTED | VEST | Lightly quilted with wooden | buttons. Warm, never bulky. | COTTON QUILT | PALE PERIWINKLE | 1Y / 2Y / 4Y",
      ],
    },
    { key: "wall", label: "Wall Colour", type: "color", default: "#ECE6EB" },
    { key: "ink", label: "Text & Line Colour", type: "color", default: "#32333F" },
    { key: "muted", label: "Secondary Text Colour", type: "color", default: "#6A6B80" },
    { key: "value", label: "Spec Value Colour", type: "color", default: "#7173A6" },
    { key: "intro", label: "Entrance Animation", type: "toggle", default: true },
    { key: "wheelBrowse", label: "Browse With Mouse Wheel", type: "toggle", default: true },
    { key: "garmentSheet", label: "Garment Sprite Sheet URL", type: "text", default: proxy(CF + "hf_20261113_121624_09fa35c4-680e-46a5-b6a9-8acd429bce67.png", 3312) },
    { key: "smockSheet", label: "Smock-Dress Detail Sheet URL", type: "text", default: proxy(CF + "hf_20261113_121448_68442996-20c3-4f65-8f3d-56d2b6df8152.png", 2048) },
    { key: "fabricSheet", label: "Fabric Close-up Sheet URL", type: "text", default: proxy(CF + "hf_20261113_132947_dc18692c-66e4-447b-a11e-167b3bcadefb.png", 3312) },
    { key: "detailSheet", label: "Detail Close-up Sheet URL", type: "text", default: proxy(CF + "hf_20261113_132948_27322be0-e8d1-436a-a229-09ef6371cb98.png", 3312) },
  ],
  props: [
    ["brand / collection", "string", '"HINA" / "LITTLE WARDROBE"', "The wordmark in the top-left and the footer line."],
    ["navLinks", "string[]", '["CLOTHING", "ACCESSORY", "JOURNAL", "ABOUT"]', "Up to four centre nav labels; the first is shown as active."],
    ["products", "string[]", "12 pieces", 'One line per garment, in sprite order: "Title 1 | Title 2 | Description 1 | Description 2 | Material | Colour | Size". Twelve lines are used; the garments themselves come from the sprite sheet.'],
    ["wall / ink / muted / value", "string", '"#ECE6EB" / "#32333F" / "#6A6B80" / "#7173A6"', "The studio wall, main text and lines, secondary text, and the spec values."],
    ["intro", "boolean", "true", "Play the entrance: the rail draws in, the garments drop in and the text lines reveal. Reduced-motion visitors never see it."],
    ["wheelBrowse", "boolean", "true", "Let the mouse wheel step through the pieces (it captures the wheel while the pointer is over the section; desktop only)."],
    ["garmentSheet", "string", "the garment sprite sheet", "A 3312 × 2480 transparent sheet with twelve garments on hangers in a 4 × 3 grid. The positions of the twelve pieces on it are fixed, so replace it only with a sheet laid out the same way."],
    ["smockSheet / fabricSheet / detailSheet", "string", "the three detail sheets", "The photos behind the detail panel: a 2 × 2 sheet for piece 1 and two 4 × 3 close-up sheets (fabric, detail) for the others, cropped by fixed cells. Same layout rule as the garment sheet."],
    ["style", "CSSProperties", "{}", "Extra styles for the outer wrapper."],
    ["— Dependencies —", "runtime", "—", "React 18 (npm). Loaded at runtime: Noto Sans (WOFF2 from fonts.gstatic.com) and the four image sheets. No other libraries. Under 820 px wide it becomes a normal scrolling block with the info and panel below the rail."],
    ["— How it is used —", "—", "—", "Wheel, arrow keys, the arrow buttons or a swipe browse the rail. Hover a rail piece to lift it, click it to bring it to the front. Click the front piece or VIEW DETAILS for the detail panel (three photo tabs); click it again, Back or Escape to close."],
  ],
};
