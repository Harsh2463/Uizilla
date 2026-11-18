import VideoRibbon from "./VideoRibbon.jsx";
import source from "./VideoRibbon.jsx?raw";

const R2 = "https://pub-86dc5b5484314368ac5436a674b0d919.r2.dev/";

export default {
  slug: "video-ribbon",
  name: "Video Ribbon",
  tag: "Scroll",
  file: "VideoRibbon.jsx",
  source,
  Component: VideoRibbon,
  description:
    "A scroll-driven portfolio hero. A two-part headline slides across the screen in opposite directions while a ribbon of live video cards spirals around you in 3D, then the cards land one by one in a grid. Cards with no media show animated placeholders.",
  // Rendered on the home page card and on the component page.
  render: ({ interactive = true } = {}) => <VideoRibbon interactive={interactive} />,
  usage: `import VideoRibbon from "./VideoRibbon";

// It scrolls inside its own box, so give it a height.
<div style={{ height: "100vh" }}>
  <VideoRibbon
    line1="CRAFT IN"
    line2="MOTION"
    work={[
      "Project one | https://example.com/one.mp4",
      "Project two | https://example.com/cover.jpg",
      "Project three",            // no media: animated placeholder
    ]}
  />
</div>

// Needs, at runtime: three@0.170.0 (jsDelivr) and the Inter Tight / IBM Plex Mono
// fonts (Google Fonts). Videos and images must allow CORS to be used as textures.`,
  // Editor sidebar. `default` must match the default in VideoRibbon.jsx.
  controls: [
    { key: "line1", label: "Headline Line 1", type: "text", default: "CRAFT IN" },
    { key: "line2", label: "Headline Line 2", type: "text", default: "MOTION" },
    { key: "caption", label: "Caption", type: "text", default: "Exploring ideas through daily design practice." },
    {
      key: "work", label: "Work (Title | video or image URL)", type: "words", noun: "cards",
      default: [
        "Roadster 3D | " + R2 + "designs/roadster-3d-car-landing.mp4",
        "Living Portrait | " + R2 + "aaaf/living-portrait-hero.mp4",
        "Particle Self | " + R2 + "aaaf/oraciteslArea.mp4",
        "Robot Jellyfish | " + R2 + "aaaf/medusa-jellyfish-hero.mp4",
        "Ink Reveal | " + R2 + "designs/ink-reveal-hover.mp4",
        "Space Voyage | " + R2 + "designs/space-voyage-video.mp4",
        "Helion Dispatch | " + R2 + "designs/helion-dispatch-landing.mp4",
        "Honey Bee | " + R2 + "designs/honey-bee-melli-landing.mp4",
      ],
    },
    { key: "placeholders", label: "Placeholders For Missing Media", type: "toggle", default: true },
    {
      key: "footerText", label: "Footer Text", type: "text",
      default: "Concepts, explorations and interface experiments shared openly as part of our creative process.",
    },
    { key: "categories", label: "Footer Categories (separate with /)", type: "text", default: "VISUALS/FILM/MUSIC/EXPERIMENTS" },
    { key: "showreelLabel", label: "Showreel Label", type: "text", default: "VIEW SHOWREEL" },
    { key: "showFooter", label: "Show Footer", type: "toggle", default: true },
    { key: "background", label: "Background", type: "color", default: "#0a0a0b" },
    { key: "inkColor", label: "Text Color", type: "color", default: "#f4f1ea" },
    { key: "midColor", label: "Muted Color", type: "color", default: "#8d8b86" },
    { key: "headlineScale", label: "Headline Size", type: "number", min: 0.5, max: 1.6, step: 0.05, default: 1 },
    { key: "scrollLength", label: "Scroll Length", unit: "%", type: "number", min: 300, max: 1800, step: 50, default: 900 },
    { key: "smoothing", label: "Scroll Smoothing", type: "number", min: 0.02, max: 0.4, step: 0.01, default: 0.09 },
    { key: "mobileZoom", label: "Mobile Strip Size", type: "number", min: 0.8, max: 2.5, step: 0.05, default: 1.35 },
    { key: "cardRadius", label: "Card Corner Radius", type: "number", min: 0, max: 0.1, step: 0.002, default: 0.018 },
  ],
  props: [
    ["line1 / line2", "string", '"CRAFT IN" / "MOTION"', "The two headline lines. They slide across the screen in opposite directions."],
    ["caption", "string", "a short line", "Small uppercase caption between the headline lines. It fades out mid-scroll."],
    ["work", "string[]", "8 sample videos", 'The cards, one per line as "Title | URL". The URL can be a video (.mp4, .webm…) or an image (.jpg, .png, .webp…); leave it out for a placeholder. The first 6 land in the grid (4 on a narrow box show as 2 × 3). Up to 16 cards.'],
    ["placeholders", "boolean", "true", "Show an animated placeholder for any card with no URL or whose media fails to load. Turn it off to leave such cards as plain dark panels."],
    ["footerText / categories / showreelLabel", "string", "see defaults", "The bottom bar: the sentence on the left, the slash-separated list in the middle, and the label on the right."],
    ["showFooter", "boolean", "true", "Hide the bottom bar to show only the headline and cards."],
    ["background / inkColor / midColor", "string", '"#0a0a0b" / "#f4f1ea" / "#8d8b86"', "Page colour, main text and lines, and muted text."],
    ["headlineScale", "number", "1", "Scales the headline."],
    ["scrollLength", "number", "900", "How long the scroll is, as a percentage of the box height. Longer is slower."],
    ["smoothing", "number", "0.09", "How quickly the animation catches up with the scroll (higher is snappier)."],
    ["mobileZoom", "number", "1.35", "Phone-width boxes only (under 760 px). How much the camera zooms in on the ribbon so the strip reads larger; 1 is the old size. Higher crops the strip at the screen edges."],
    ["cardRadius", "number", "0.018", "Corner rounding of the cards."],
    ["interactive", "boolean", "true", "Turn off the hover name label (used for the home-page card)."],
    ["style", "CSSProperties", "{}", "Extra styles for the outer wrapper."],
    ["— Dependencies —", "runtime", "—", "React 18 (npm). Loaded at runtime: three@0.170.0 from cdn.jsdelivr.net, Inter Tight and IBM Plex Mono from Google Fonts, and your media URLs (they must send CORS headers to be used as textures)."],
  ],
};
