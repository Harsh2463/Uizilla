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
        "Look Circle | aaaf/look-circle-hero.mp4 | hf_20261111_034848_928e6733-ce60-48f4-9a65-14dc76a1d74b | 1600x900 | brand | look-circle",
        "Video Studio | aaaf/kolibrie-landing.mp4 | hf_20261110_232427_5e9a291a-5c3e-4f0e-9506-06fedc0020f4 | 1440x810 | build | video-studio",
        "Balloon Drop | aaaf/balloon-drop-hero-edge.mp4 | hf_20261109_030427_0961b20a-ba6b-4094-8ea2-de5916dfa0b3 | 1600x900 | brand | balloon-drop",
        "Fox Couture | aaaf/fox-couture-hero.mp4 | hf_20261107_154307_13b28214-7ca8-4b2a-b8aa-a2f84e7cfcec | 1440x900 | brand | fox-couture",
        "Laptop Portfolio | aaaf/laptop-portfolio.mp4 | hf_20261111_030305_aa366bc0-85e3-4f61-82c1-cbf8ae8217a3 | 1440x810 | build | laptop-portfolio",
        "Ink Portfolio | aaaf/ink-portfolio.mp4 | hf_20261111_001348_8bc89068-e31a-4ccf-a6cb-893ff11c134f | 1440x810 | build | ink-portfolio",
        "Clothing Rail | aaaf/clothing-rail-hero.mp4 | hf_20261108_064619_5aab2bf3-3e14-41b3-9421-250f3c9eac47 | 1500x1000 | brand | clothing-rail",
        "Spin Product | aaaf/spin-product-hero.mp4 | hf_20261107_113531_66f5b631-47f4-45da-8094-29dc04544d61 | 1500x1000 | brand | spin-product",
        "Sphere Gallery | aaaf/sphere-gallery.mp4 | hf_20261111_011719_6594eb98-1eff-4903-9888-f4617764070d | 1440x810 | learn | sphere-gallery",
        "Video Editor | aaaf/glaze-motion.mp4 | hf_20261110_223913_74dc89fd-5948-4da9-8749-3bcd3f40fd8d | 1440x810 | build | video-editor",
        "Card Story | aaaf/kinestra-card-story-v2.mp4 | hf_20261108_020030_b8d50a01-c927-44a4-ad51-ab48c283c9d5 | 1440x900 | learn | card-story",
        "Year Recap | aaaf/halftone-recap.mp4 | hf_20261107_001441_a517a376-cfaa-415e-95d8-ea8b61c1727c | 1440x900 | learn | year-recap",
        "Future Fashion | aaaf/orbe-future-mode.mp4 | hf_20261106_084953_1d74b316-6fa3-4558-a532-462e7ae8d559 | 1440x900 | brand | future-fashion",
        "VHS Archive | aaaf/vhs-arc-hero.mp4 | hf_20261105_045553_51e4ba42-a8a4-4702-ad5f-18c0e2a5ba85 | 1600x900 | learn | vhs-archive",
        "Moss Island | aaaf/mossline-hero.mp4 | hf_20261106_032528_99eb9a00-a553-40b6-8b97-017e918971c6 | 1600x900 | build | moss-island",
        "Outfit Carousel | aaaf/try-the-look-hero.mp4 | hf_20261105_051536_4f458170-47a1-440e-a08c-8ed434394ce8 | 1600x900 | brand | outfit-carousel",
      ],
    },
    {
      key: "mediaMode", label: "Media", type: "select", default: "video",
      options: [
        ["video", "Images + videos (cards and sea play their clips)"],
        ["images", "Images only (no videos play)"],
        ["placeholder", "Placeholder images (needs no media)"],
      ],
    },
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
    ["mediaMode", '"video" | "images" | "placeholder"', '"video"', "Which media the section uses. video: each card shows its poster and plays its clip when it faces you, and the sea plays its loop. images: the same posters and sea still, but no video is loaded or played. placeholder: generated placeholder pictures replace every poster and the sea (no URLs needed), and no video plays. Any card with a missing or broken poster shows a placeholder in every mode. Replace your own images and videos in the cards list and the sea fields, then switch modes whenever you like."],
    ["seaImage / seaVideo", "string", "sunlit sea", "The still and the looping video behind both views. The video fades in over the still once it plays (video mode only)."],
    ["buildLine1 / buildLine2", "string", '"I take startups" / "from sketch to ship."', "The two-line headline of the Build view."],
    ["email", "string", '"me@noaellsworth.com"', "Where the Send button's email brief goes."],
    ["companies", "string[]", '["Fernway", "Quill Labs"]', "Names in the \"worked at\" row (up to four)."],
    ["showNav", "boolean", "true", "Show the built-in Home / Build nav. Turn it off to use the section inside your own page."],
    ["intro", "boolean", "true", "Play the opening sequence. Escape or the skip button jumps to the end; reduced-motion visitors never see it."],
    ["autoSpin / spinSpeed", "boolean / number", "true / 0.3", "Whether the ring turns on its own, and how many degrees per frame (60 fps). Hovering a card slows it."],
    ["paper / ink / accent / buttonColor", "string", '"#0A0E11" / "#EEF4F6" / "#3AA8D0" / "#1E86AC"', "Page background, text, the underline accent, and the Send button."],
    ["interactive", "boolean", "true", "Turn off hover and drag (used for the home-page card)."],
    ["style", "CSSProperties", "{}", "Extra styles for the outer wrapper."],
    ["— Dependencies —", "runtime", "—", "React 18 (npm). Loaded at runtime: Newsreader, Geist and Geist Mono (Google Fonts), the sea still and video, and your card posters and videos. CSS 3D transforms only, no WebGL or other libraries."],
    ["— How it is used —", "—", "—", "Wheel over the ring, drag, or touch to spin it. Hover a card to slow the spin, tilt it and reveal its label; click to open its link. Hover a sentence choice to dim the rest, light its world's cards and show a preview that follows the pointer."],
  ],
};
