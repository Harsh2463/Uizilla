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
    { key: "ghostTravel", label: "Background Word Scroll Travel", unit: "%", type: "number", min: -150, max: 150, step: 5, default: 80 },
    { key: "categories", label: "Footer Categories (separate with /)", type: "text", default: "VISUALS/FILM/MUSIC/EXPERIMENTS" },
    { key: "showFooter", label: "Show Footer", type: "toggle", default: true },
    { key: "background", label: "Background", type: "color", default: "#0b0213" },
    { key: "accentColor", label: "Theme Glow Color", type: "color", default: "#8a2be2" },
    { key: "bgImage", label: "Background Image URL (transparent PNG/WebP)", type: "text", default: "https://ik.imagekit.io/Harsh2463/jackets/Fallen%20Purple%20King%20and%20Bronze%20Knight.png?tr=w-1920,f-webp,q-85" },
    { key: "bgImageOpacity", label: "Background Image Opacity", unit: "%", type: "number", min: 0, max: 100, step: 1, default: 55 },
    {
      key: "bgImageFit", label: "Background Image Fit", type: "select", default: "cover",
      options: [["cover", "Fill the area (may crop)"], ["contain", "Show the whole image"]],
    },
    { key: "bgImageTop", label: "Empty Gradient Above Image (side layouts)", unit: "%", type: "number", min: 0, max: 60, step: 1, default: 20 },
    {
      key: "bgImageSide", label: "Image Layout", type: "select", default: "full",
      options: [["full", "Full screen"], ["right", "Right side + blurred haze"], ["left", "Left side + blurred haze"], ["center", "Centre + blurred haze"]],
    },
    { key: "bgImageHeadroom", label: "Keep Space Above Subject (Full screen)", unit: "%", type: "number", min: 0, max: 40, step: 1, default: 11 },
    { key: "bgImageMaxWidth", label: "Image Max Width (Full screen)", unit: "%", type: "number", min: 100, max: 250, step: 5, default: 155 },
    { key: "bgImageScale", label: "Image Size", type: "number", min: 0.6, max: 2, step: 0.05, default: 1.2 },
    { key: "bgImageBlur", label: "Blurred Haze Amount", unit: "px", type: "number", min: 0, max: 80, step: 1, default: 34 },
    { key: "showGhost", label: "Show Background Word", type: "toggle", default: true },
    { key: "ghostText", label: "Background Word", type: "text", default: "MOTION" },
    { key: "ghostColor", label: "Background Word Color (light end)", type: "color", default: "#c54ff0" },
    { key: "ghostColor2", label: "Background Word Color (deep end)", type: "color", default: "#5a35f0" },
    { key: "ghostOpacity", label: "Background Word Opacity", unit: "%", type: "number", min: 0, max: 100, step: 1, default: 70 },
    { key: "ghostSize", label: "Background Word Size", type: "number", min: 0.3, max: 2, step: 0.05, default: 1 },
    {
      key: "ghostDirection", label: "Background Word Direction", type: "select", default: "horizontal",
      options: [["horizontal", "Horizontal"], ["up", "Vertical, bottom to top"], ["down", "Vertical, top to bottom"]],
    },
    { key: "headlineColor", label: "Headline Color", type: "color", default: "#d25cf2" },
    { key: "inkColor", label: "Other Text Color", type: "color", default: "#f6edff" },
    { key: "midColor", label: "Muted Color", type: "color", default: "#b394dc" },
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
    ["categories", "string", '"VISUALS/FILM/MUSIC/EXPERIMENTS"', "The slash-separated list at the bottom centre."],
    ["ghostTravel", "number", "80", "How far the background word drifts up while you scroll through the whole section, as a percentage of the box height. It drifts back down when you scroll back, with all the letters moving together. Negative values drift it down instead. The letters also drop in one by one from the top when the section loads."],
    ["showFooter", "boolean", "true", "Hide the bottom bar to show only the headline and cards."],
    ["background / accentColor", "string", '"#0b0213" / "#8a2be2"', "The deep base colour, and the purple the glows are tinted with (corner light, the top wash and the placeholder cards)."],
    ["showGhost / ghostText", "boolean / string", 'true / "MOTION"', "A large word behind the background picture (it shows through where the picture is transparent). It is filled with a blue-violet to orchid gradient and a grainy, mottled texture, in a tall condensed heavy face."],
    ["ghostColor / ghostColor2", "string", '"#c54ff0" / "#5a35f0"', "The two ends of the word's gradient: the light orchid end (right) and the deep blue-violet end (left)."],
    ["ghostOpacity / ghostSize / ghostDirection", "number / number / string", '70 / 1 / "horizontal"', "How visible it is (0–100), a size multiplier (horizontal, it is sized to fit the box width and about half its height), and its direction: \"horizontal\", or vertical (\"up\" reads bottom to top, \"down\" top to bottom)."],
    ["headlineColor", "string", '"#d25cf2"', "Colour of the two big headline lines (the orchid pink of the reference heading)."],
    ["inkColor / midColor", "string", '"#f6edff" / "#b394dc"', "Colour of the other text and lines, and of muted text."],
    ["bgImage / bgImageOpacity / bgImageFit", "string / number / string", 'chess pieces / 55 / "cover"', "A picture behind the headline and cards (best as a transparent PNG or WebP so it blends into the gradient), how visible it is (0–100). It is dimmed by darkening the picture itself, not by making it see-through, so nothing behind it (the background word, the gradient) shows through the pieces and the word stays at full brightness; lower it to let the gradient and text stand out, and whether it is shown whole or fills its area. Leave the URL empty for no picture."],
    ["bgImageMaxWidth", "number", "155", "Full-screen layout only. The picture fills the box like \"cover\", but never grows wider than this percentage of the box width. On wide screens it has no effect; on narrow or tall screens it stops the picture from being cropped at the sides so the whole subject stays in view, with gradient above it."],
    ["bgImageHeadroom", "number", "11", "Full-screen layout only. The picture keeps its fill size but is shifted down so the subject is never cropped at the top, on any width; this is how much of the picture's own empty top (as % of its height) may be cut off. Raise it to show more of the floor, lower it to show more headroom."],
    ["bgImageTop", "number", "20", "Percentage of the top of the section left as plain gradient. The picture sits in the space below and its top edge fades softly into the gradient."],
    ["bgImageSide / bgImageScale", "string / number", '"full" / 1.2', "Layout of the picture. \"full\" fills the whole section. \"right\", \"left\" or \"centre\" put a larger sharp copy on one side with a blurred copy carrying the haze across the rest; the scale applies to those layouts and grows the picture upward and inward from its bottom corner."],
    ["bgImageBlur", "number", "34", "A heavily blurred copy of the same picture fills the whole section behind it, carrying the floor and glow across the empty side. This is its blur in px."],
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
