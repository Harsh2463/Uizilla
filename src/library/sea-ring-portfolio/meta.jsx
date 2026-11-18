import SeaRingPortfolio from "./SeaRingPortfolio.jsx";
import source from "./SeaRingPortfolio.jsx?raw";

const CF = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/";
const proxy = (u, w) => `https://images.higgs.ai/?default=1&output=webp&url=${encodeURIComponent(u)}&w=${w}&q=85`;

export default {
  slug: "sea-ring-portfolio",
  name: "Sea Ring Portfolio",
  tag: "3D",
  file: "SeaRingPortfolio.jsx",
  source,
  Component: SeaRingPortfolio,
  description:
    "An animated portfolio section: a serif sentence and three stats over a rounded panel of looping sunlit sea, with a 3D ring of 16 video cards that wraps around you and spins with the wheel, drag and touch. Opens on a fully black loading screen: the name rises, the posters load, the ring assembles, then expands around you, and the name flies into the nav. Use your own images and videos, images only, or built-in placeholder pictures. A second view shows a fill-in-the-blanks project brief.",
  // Rendered on the home page card (it settles on its own) and on the component page.
  render: ({ interactive = true } = {}) => <SeaRingPortfolio interactive={interactive} intro={interactive} />,
  usage: `import SeaRingPortfolio from "./SeaRingPortfolio";

// Fills its parent, so give the parent a height (e.g. a full-screen section).
<section style={{ height: "100vh" }}>
  <SeaRingPortfolio
    name="Noa Ellsworth"
    sentence={"I craft products for [startups|build],\\nshowreels for [labels|brand] and free toolkits\\nfor [learners|learn]. Or just [chat with Noa|ai]."}
    cards={[
      "My Site | https://example.com/clip.mp4 | https://example.com/poster.jpg | 1600x900 | brand | https://example.com",
    ]}
    showNav={false}   // hide the built-in nav if your site has its own
    intro={false}     // skip the opening sequence
  />
</section>

// Needs, at runtime: the Newsreader / Geist / Geist Mono fonts (Google Fonts) and your media URLs.`,
  // Editor sidebar. `default` must match the default in SeaRingPortfolio.jsx.
  controls: [
    { key: "name", label: "Name", type: "text", default: "Noa Ellsworth" },
    {
      key: "sentence", label: "Sentence ([word|world] makes a hover choice; \\n = new line)", type: "text",
      default: "I craft products for [startups|build],\\nshowreels for [labels|brand] and free toolkits\\nfor [learners|learn]. Or just [chat with Noa|ai].",
    },
    { key: "stats", label: "Stats (Value | Label)", type: "words", noun: "stats", default: ["11.4M+ | PLAYS", "38.2K | COMMUNITY", "24.9K | MEMBERS"] },
    {
      key: "cards", label: "Ring Cards (Title | video | poster | WxH | world | link)", type: "words", noun: "cards",
      default: [
      "Look Circle |  | https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1000&q=75 | 1600x900 | brand | look-circle",
      "Video Studio |  | https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1000&q=75 | 1440x810 | build | video-studio",
      "Balloon Drop |  | https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=75 | 1600x900 | brand | balloon-drop",
      "Fox Couture |  | https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1000&q=75 | 1440x900 | brand | fox-couture",
      "Laptop Portfolio |  | https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1000&q=75 | 1440x810 | build | laptop-portfolio",
      "Ink Portfolio |  | https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=1000&q=75 | 1440x810 | build | ink-portfolio",
      "Clothing Rail |  | https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=75 | 1500x1000 | brand | clothing-rail",
      "Spin Product |  | https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1000&q=75 | 1500x1000 | brand | spin-product",
      "Sphere Gallery |  | https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1000&q=75 | 1440x810 | learn | sphere-gallery",
      "Video Editor |  | https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=75 | 1440x810 | build | video-editor",
      "Card Story |  | https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=1000&q=75 | 1440x900 | learn | card-story",
      "Year Recap |  | https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1000&q=75 | 1440x900 | learn | year-recap",
      "Future Fashion |  | https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=1000&q=75 | 1440x900 | brand | future-fashion",
      "VHS Archive |  | https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=1000&q=75 | 1600x900 | learn | vhs-archive",
      "Moss Island |  | https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1000&q=75 | 1600x900 | build | moss-island",
      "Outfit Carousel |  | https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1000&q=75 | 1600x900 | brand | outfit-carousel",
      ],
    },
    {
      key: "mediaMode", label: "Media", type: "select", default: "images",
      options: [
        ["video", "All videos (every card plays its clip)"],
        ["images", "All images (smoothest, no card videos)"],
        ["placeholder", "Placeholder images (needs no media)"],
      ],
    },
    { key: "cardImages", label: "Card Images (one URL per card, in order)", type: "words", noun: "images", default: [] },
    { key: "cardVideos", label: "Card Videos (one URL per card, in order)", type: "words", noun: "videos", default: [] },
    { key: "cardHeight", label: "Card Height", type: "number", min: 80, max: 320, step: 2, default: 160 },
    { key: "cardWidthScale", label: "Card Width", type: "number", min: 0.5, max: 1.6, step: 0.05, default: 1 },
    { key: "cornerRadius", label: "Card Corner Radius", type: "number", min: 0, max: 40, step: 1, default: 16 },
    { key: "ringSpacing", label: "Ring Spacing (distance between cards)", type: "number", min: 0.5, max: 2, step: 0.05, default: 1 },
    { key: "depth", label: "Depth (perspective strength)", type: "number", min: 0.5, max: 2.5, step: 0.05, default: 1 },
    { key: "curve", label: "Card Curve, Desktop (degrees)", type: "number", min: 0, max: 90, step: 1, default: 0 },
    { key: "mobileCurve", label: "Card Curve, Phone (degrees)", type: "number", min: 0, max: 90, step: 1, default: 22 },
    { key: "curveDirection", label: "Curve Direction", type: "select", default: "hug", options: [["hug", "Edges toward you (hugs the ring)"], ["bulge", "Edges away (bulges out)"]] },
    { key: "curveShade", label: "Curve Inner Shadow", type: "number", min: 0, max: 1, step: 0.05, default: 0.55 },
    { key: "seaImage", label: "Sea Still Image URL", type: "text", default: proxy(CF + "hf_20261111_224417_17e8d78c-9384-4a50-93b4-92510f1957db.png", 2048) },
    { key: "seaVideo", label: "Sea Loop Video URL", type: "text", default: CF + "hf_20261111_232613_bf108dd9-dc98-4729-9163-748475f20b61.mp4" },
    { key: "buildLine1", label: "Build Headline, Line 1", type: "text", default: "I take startups" },
    { key: "buildLine2", label: "Build Headline, Line 2", type: "text", default: "from sketch to ship." },
    { key: "email", label: "Brief Goes To (email)", type: "text", default: "me@noaellsworth.com" },
    { key: "companies", label: "Worked At", type: "words", noun: "companies", default: ["Fernway", "Quill Labs"] },
    { key: "showNav", label: "Show Built-in Nav", type: "toggle", default: true },
    { key: "intro", label: "Play Opening Sequence", type: "toggle", default: true },
    { key: "autoSpin", label: "Ring Spins On Its Own", type: "toggle", default: true },
    { key: "spinSpeed", label: "Spin Speed (° per frame)", type: "number", min: 0, max: 1.2, step: 0.05, default: 0.3 },
    { key: "paper", label: "Background", type: "color", default: "#0A0E11" },
    { key: "ink", label: "Text Color", type: "color", default: "#EEF4F6" },
    { key: "accent", label: "Accent (underlines)", type: "color", default: "#3AA8D0" },
    { key: "buttonColor", label: "Button Color", type: "color", default: "#1E86AC" },
  ],
  props: [
    ["name", "string", '"Noa Ellsworth"', "Your name. The first word rises in the loader and becomes the nav wordmark."],
    ["sentence", "string", "see default", 'The big serif sentence. Wrap a phrase as [phrase|world] to make it a hover choice; world is build, brand, learn or ai. Punctuation right after a choice stays attached to it. Use \\n for a new line. Choosing a "build" phrase opens the Build view.'],
    ["stats", "string[]", "3 stats", 'Up to four "Value | Label" pairs shown at the top right.'],
    ["cards", "string[]", "16 sample sites", 'The ring cards, one per line: "Title | video | poster | WxH | world | link". Video and poster can be full URLs; link can be a full URL. world is build, brand or learn. The ring has 16 slots and repeats your list if you give fewer. The ratio sets each card\'s width.'],
    ["mediaMode", '"video" | "images" | "placeholder"', '"images"', "Cards use either all images or all videos, never a mix. images (default, smoothest): every card shows its picture and no card video plays; the default cards use Unsplash photos. video: every card plays its own clip (loaded before it turns to face you, so nothing loads mid-motion), using the default clips while the card list is still the default. placeholder: generated pictures, no media needed. A card with a missing or broken picture shows a placeholder in every mode."],
    ["seaImage / seaVideo", "string", "sunlit sea", "The still and the looping video behind both views. The video fades in over the still once it plays (video mode only)."],
    ["buildLine1 / buildLine2", "string", '"I take startups" / "from sketch to ship."', "The two-line headline of the Build view."],
    ["email", "string", '"me@noaellsworth.com"', "Where the Send button's email brief goes."],
    ["companies", "string[]", '["Fernway", "Quill Labs"]', "Names in the \"worked at\" row (up to four)."],
    ["showNav", "boolean", "true", "Show the built-in Home / Build nav. Turn it off to use the section inside your own page."],
    ["intro", "boolean", "true", "Play the opening sequence. Escape or the skip button jumps to the end; reduced-motion visitors never see it."],
    ["cardImages / cardVideos", "string[]", "[]", "Optional lists of image and video URLs, one per line, matched to the cards by position. They override the poster / video of the card in the same position, and extra lines add more cards. Leave empty to use the cards list."],
    ["cardHeight / cardWidthScale / cornerRadius", "number", "160 / 1 / 16", "Card height in px (before the ring scale), a width multiplier (every card shares the same 16:9 box; pictures and clips are cropped to fill it), and the corner radius."],
    ["ringSpacing / depth", "number", "1 / 1", "ringSpacing scales the ring's radius, so cards sit farther apart or closer. depth strengthens the perspective (and, on phones, pushes the front of the wheel toward you)."],
    ["curve / mobileCurve / curveDirection / curveShade", "number / number / string / number", "0 / 22 / hug / 0.55", "curveShade darkens the bent edges inward so the curve reads clearly (along the width on desktop, the height on phones). Bends each card into an arc, in degrees, using thin slices like the Round Carousel. mobileCurve applies at phone width. A curved card shows its poster only (its video is not played); set curve to 0 for playing videos."],
    ["autoSpin / spinSpeed", "boolean / number", "true / 0.3", "Whether the ring turns on its own, and how many degrees per frame (60 fps). Hovering a card slows it."],
    ["paper / ink / accent / buttonColor", "string", '"#0A0E11" / "#EEF4F6" / "#3AA8D0" / "#1E86AC"', "Page background, text, the underline accent, and the Send button."],
    ["interactive", "boolean", "true", "Turn off hover and drag (used for the home-page card)."],
    ["style", "CSSProperties", "{}", "Extra styles for the outer wrapper."],
    ["— Dependencies —", "runtime", "—", "React 18 (npm). Loaded at runtime: Newsreader, Geist and Geist Mono (Google Fonts), the sea still and video, and your card posters and videos. CSS 3D transforms only, no WebGL or other libraries."],
    ["— How it is used —", "—", "—", "Wheel over the ring, drag, or touch to spin it. Hover a card to slow the spin, tilt it and reveal its label; click to open its link. Hover a sentence choice to dim the rest, light its world's cards and show a preview that follows the pointer."],
  ],
};
