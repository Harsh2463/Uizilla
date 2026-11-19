import ClothingFlip from "./ClothingFlip.jsx";
import source from "./ClothingFlip.jsx?raw";

const FRONT = "https://ik.imagekit.io/Harsh2463/jackets/Hoodie%20Color%20Grid%20Collection.png?tr=f-webp,q-90";
const SIDE = "https://ik.imagekit.io/Harsh2463/jackets/Hoodie%20Sprite%20Sheet%20Collection%20side%20view.png?tr=f-webp,q-90";

export default {
  slug: "clothing-flip",
  name: "Clothing Flip",
  tag: "Shop",
  file: "ClothingFlip.jsx",
  source,
  Component: ClothingFlip,
  description:
    "Offcut, a dark streetwear clothing-rail hero: a blackletter logo, a polished chrome rail and twelve hoodies hanging on it in profile. Point at one and it swings round to face you while its neighbours part, with its name and price in rupees underneath. Click it and it lifts off the rail into a large centred view with a counter, an italic serif name, the price, previous / next arrows and a Close button, while the rest of the page washes out. A red marquee runs along the bottom. The rail keeps drifting in a loop, and phones and tablets in portrait get their own taller layout.",
  // Rendered on the home page card and on the component page.
  render: () => <ClothingFlip />,
  usage: `import ClothingFlip from "./ClothingFlip";

// One fixed 1500 x 1000 composition that scales to fit its parent, so give the parent a height.
<div style={{ height: 720 }}>
  <ClothingFlip
    brand="Offcut"
    products={["Black Hoodie | ₹2,499", "Bone Hoodie | ₹2,499" /* ...12 in sheet order */]}
  />
</div>

// Needs, at runtime: Inter, Instrument Serif and UnifrakturMaguntia (Google Fonts) and your two sprite sheets (URLs).`,
  // Editor sidebar. `default` must match the default in ClothingFlip.jsx.
  controls: [
    { key: "brand", label: "Logo Text", type: "text", default: "Offcut" },
    {
      key: "products", label: "Products (Name | Price), in sheet order", type: "words", noun: "products",
      default: [
        "Believe in Yourself Hoodie — Black | ₹2,499",
        "Believe in Yourself Hoodie — Bone | ₹2,499",
        "Believe in Yourself Hoodie — Heather Grey | ₹2,499",
        "Believe in Yourself Hoodie — Navy | ₹2,499",
        "Believe in Yourself Hoodie — Maroon | ₹2,599",
        "Believe in Yourself Hoodie — Forest Green | ₹2,599",
        "Believe in Yourself Hoodie — Royal Blue | ₹2,599",
        "Believe in Yourself Hoodie — Purple | ₹2,599",
        "Believe in Yourself Hoodie — Mustard | ₹2,699",
        "Believe in Yourself Hoodie — Rust | ₹2,699",
        "Believe in Yourself Hoodie — Pink | ₹2,699",
        "Believe in Yourself Hoodie — Sky Blue | ₹2,699",
      ],
    },
    { key: "marquee", label: "Marquee Band Text (repeats)", type: "words", noun: "items", default: ["OFFCUT", "•", "LIMITED RUN", "•", "NO RESTOCKS", "•"] },
    { key: "railWidth", label: "Rail Bar Width (end caps show below 100%)", unit: "%", type: "number", min: 30, max: 100, step: 1, default: 100 },
    { key: "garmentSize", label: "Hoodie Size (spacing adjusts with it)", unit: "%", type: "number", min: 50, max: 160, step: 1, default: 100 },
    { key: "spacing", label: "Spacing Between Hoodies", type: "number", min: 60, max: 500, step: 1, default: 150 },
    { key: "driftSpeed", label: "Rail Speed (loops on its own)", type: "number", min: -200, max: 200, step: 1, default: 48 },
    { key: "aboutLabel", label: "Top-Left Label", type: "text", default: "About" },
    { key: "contactLabel", label: "Top-Right Label", type: "text", default: "Contact" },
    { key: "availabilityLabel", label: "Pill Button Text", type: "text", default: "See availability" },
    { key: "closeLabel", label: "Close Button Text", type: "text", default: "Close" },
    { key: "background", label: "Background", type: "color", default: "#0b0b0c" },
    { key: "textColor", label: "Text Colour", type: "color", default: "#f1efec" },
    { key: "mutedColor", label: "Secondary Text Colour", type: "color", default: "#8d8a86" },
    { key: "bandColor", label: "Marquee Band Colour", type: "color", default: "#b3121b" },
    { key: "frontSheet", label: "Front-View Sprite Sheet URL (WebP)", type: "text", default: FRONT },
    { key: "sideSheet", label: "Side-View Sprite Sheet URL (WebP)", type: "text", default: SIDE },
  ],
  props: [
    ["brand", "string", '"Offcut"', "The blackletter logo at the top centre."],
    ["products", "string[]", "12 hoodies", 'One line per garment in sprite-sheet order (left to right, top to bottom): "Name | Price". Prices are plain text, so "₹2,499" shows as typed. The sheets hold twelve garments.'],
    ["marquee", "string[]", '["OFFCUT", "•", "LIMITED RUN", "•", "NO RESTOCKS", "•"]', "The items of the red band along the bottom, repeated 16 times and scrolling left."],
    ["drag", "—", "built in", "Drag the trail sideways (mouse or finger) to slide it. Only the band the hoodies hang in is draggable, not the rest of the section and see the other hoodies; let go and it keeps gliding for a moment, then returns to its own loop. A drag never opens a hoodie by accident; a plain click or tap still does."],
    ["railWidth", "number", "100", "Width of the rail bar as a percent of the section (30–100). At 100 it runs off both edges. Below that the bar is centred, its two end caps show, and the hoodies ride only along the bar (they slide off and on 10px inside each end); dragging works only on the bar."],
    ["garmentSize", "number", "100", "Size of the hoodies on the rail, in percent (50–160). The spacing and the gap that opens around a faced hoodie scale with it, so the proportions stay the same; the rail, caption and pill make room for bigger hoodies."],
    ["spacing", "number", "150", "Distance between neighbouring hoodies on the rail, in artboard px (60–500). The rail loops, so not every hoodie has to be on screen at once: a larger gap shows fewer at a time, a smaller one more (the hoodies repeat to fill a wide rail). Hoodies enter and leave beyond the edge of the section, so they never pop in or out."],
    ["driftSpeed", "number", "48", "How fast the garments travel along the rail, in artboard px per second. They loop forever (leaving at one end and returning at the other). The rail slows to a crawl (20% of this speed) while a garment is faced and stands still while one is open. Negative runs the other way; 0 stops it. Reduced-motion visitors get a still rail."],
    ["aboutLabel / contactLabel", "string", '"About" / "Contact"', "The two labels in the top corners (decorative; Contact is replaced by Close while a garment is open)."],
    ["availabilityLabel / closeLabel", "string", '"See availability" / "Close"', "The pill button text (under the faced garment and in the detail view) and the close button text."],
    ["background / textColor / mutedColor / bandColor", "string", '"#0b0b0c" / "#f1efec" / "#8d8a86" / "#b3121b"', "The page, main text, secondary text (prices, counter) and the marquee band."],
    ["frontSheet / sideSheet", "string", "the two hoodie sheets", "Two transparent sprite sheets of twelve garments hanging from hooks, 4 columns x 3 rows: a front-view sheet (shown when a garment faces you and in the detail view) and a side-view sheet (shown on the rail). They are served as WebP through ImageKit (?tr=f-webp). A replacement sheet should be laid out the same way and be about 1450 x 1085 px."],
    ["style", "CSSProperties", "{}", "Extra styles for the outer wrapper."],
    ["— Dependencies —", "runtime", "—", "React 18 (npm). Loaded at runtime: Inter, Instrument Serif (italic) and UnifrakturMaguntia from Google Fonts, and the two sprite sheets. No other libraries."],
    ["— How it is used —", "—", "—", "Drag the rail sideways to slide it. Point at a garment on the rail to swing it to face you; the ones to its left and right slide apart. Arrow keys move the faced garment and Enter opens it (while the pointer is over the section). On phones and portrait tablets the composition switches to a tall layout with bigger type; tap a garment to face it, tap it again to open it, and swipe left or right in the detail view to browse. Click a garment to lift it into the detail view; use the arrows or the left and right keys to browse, and Close, Escape or a click on the empty space to put it back."],
  ],
};
