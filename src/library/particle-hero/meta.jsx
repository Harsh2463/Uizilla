import ParticleHero from "./ParticleHero.jsx";
import source from "./ParticleHero.jsx?raw";

const DEFAULT_IMAGE =
  "https://ik.imagekit.io/Harsh2463/jackets/Futuristic%20Orange-Black%20Cyborg%20Armor.png";

export default {
  slug: "particle-hero",
  name: "Particle Hero",
  tag: "WebGL",
  file: "ParticleHero.jsx",
  source,
  Component: ParticleHero,
  description:
    "A hero section built around a photo rebuilt out of GPU particles. The points rest in the shape of the picture and lift away from the cursor, then ease back. Scales to fit any container.",
  // Rendered on the home page card (non-interactive) and on the component page.
  render: ({ interactive = true } = {}) => <ParticleHero interactive={interactive} />,
  usage: `import ParticleHero from "./ParticleHero";

// Fills its parent, so give the parent a height.
<div style={{ height: 720 }}>
  <ParticleHero
    image="/images/cutout.png"
    brand="studio."
    heading={"Ship work that\\nsurvives review"}
    onCta={() => console.log("cta")}
  />
</div>`,
  // Editor sidebar. `default` must match the default in ParticleHero.jsx.
  controls: [
    { key: "image", label: "Image", type: "text", default: DEFAULT_IMAGE },
    { key: "brand", label: "Brand", type: "text", default: "studio." },
    {
      key: "links", label: "Nav Links", type: "words", noun: "links",
      default: ["HOW IT WORKS", "BENCHMARKS", "DOCS"],
    },
    { key: "ctaLabel", label: "Nav Button", type: "text", default: "Download" },
    { key: "ghostWord", label: "Ghost Word", type: "text", default: "studio" },
    { key: "ghostOpacity", label: "Ghost Opacity", type: "number", min: 0, max: 1, step: 0.01, default: 0.55 },
    { key: "heading", label: "Heading (\\n for a line break)", type: "text", default: "Ship work that\\nsurvives review" },
    {
      key: "intro", label: "Intro", type: "text",
      default: "Every change is read the moment it lands — catching the regression, naming what it touches, and writing the patch in your codebase's own idiom.",
    },
    {
      key: "stats", label: "Stat Cards", type: "words", noun: "cards",
      default: [
        "94% | of flagged issues are confirmed by the author, not dismissed.",
        "40+ | languages and frameworks indexed across your repos.",
      ],
    },
    { key: "panelLabel", label: "Panel Button", type: "text", default: "See how it works" },
    { key: "panelTitle", label: "Panel Title", type: "text", default: "Diff → analysis → patch." },
    {
      key: "panelBody", label: "Panel Body", type: "text",
      default: "The whole repository is indexed, not just the diff — so a changed function is traced to every caller, the tests that should have failed are flagged, and a suggested commit is opened for you to take or ignore.",
    },
    { key: "density", label: "Particle Density", type: "number", min: 0, max: 100, step: 1, default: 50 },
    { key: "dotSize", label: "Dot Size", type: "number", min: 0, max: 100, step: 1, default: 30 },
    { key: "reach", label: "Cursor Reach", type: "number", min: 0, max: 100, step: 1, default: 30 },
    { key: "lift", label: "Cursor Lift", type: "number", min: 0, max: 100, step: 1, default: 51 },
    { key: "damping", label: "Settle Damping", type: "number", min: 1, max: 100, step: 1, default: 58 },
    {
      key: "imageMode", label: "Image Layout", type: "select", default: "fullscreen",
      options: [["fullscreen", "Full screen"], ["band", "Centered band"]],
    },
    {
      key: "imageFit", label: "Image Fit (Full screen)", type: "select", default: "contain",
      options: [["contain", "Contain (whole image)"], ["cover", "Cover (fill, may crop)"]],
    },
    { key: "imageZoom", label: "Image Zoom (Full screen)", type: "number", min: 0.3, max: 2.5, step: 0.01, default: 0.88 },
    { key: "imageOffsetX", label: "Image Shift X (Full screen)", unit: "%", type: "number", min: -60, max: 60, step: 1, default: 25 },
    { key: "imageOffsetY", label: "Image Shift Y (Full screen)", unit: "%", type: "number", min: -60, max: 60, step: 1, default: 5 },
    { key: "imageFill", label: "Image Fill (Band)", type: "number", min: 0.2, max: 1, step: 0.01, default: 0.7 },
    { key: "edgeParticles", label: "Moving Edge Particles", type: "toggle", default: true },
    {
      key: "edgeSide", label: "Edge Side", type: "select", default: "right",
      options: [["right", "Right"], ["left", "Left"], ["both", "Both"]],
    },
    { key: "edgeWidth", label: "Edge Band Width", unit: "%", type: "number", min: 1, max: 60, step: 1, default: 14 },
    { key: "edgeMotion", label: "Edge Motion", type: "number", min: 0, max: 100, step: 1, default: 50 },
    { key: "paper", label: "Background", type: "color", default: "#1A0B05" },
    { key: "glow", label: "Glow / Gradient", type: "color", default: "#FF5B14" },
    { key: "ink", label: "Text Color", type: "color", default: "#F7EDE4" },
    { key: "accent", label: "Accent / Buttons", type: "color", default: "#D9480F" },
  ],
  props: [
    ["image", "string", "the cyborg armor render", "The picture turned into particles. Use a PNG/WebP with a transparent background so only the subject becomes points. It is read pixel by pixel on a canvas, so it must be same-origin or served with CORS headers."],
    ["brand", "string", '"studio."', "Wordmark at the top left."],
    ["links", "string[]", '3 labels', "Nav labels, shown on wide layouts only."],
    ["ctaLabel", "string", '"Download"', "Label on the outlined nav button."],
    ["ghostWord", "string", '"studio"', "The oversized word behind the art."],
    ["ghostOpacity", "number", "0.55", "How strongly that word shows through (0–1)."],
    ["heading", "string", '"Ship work that\\nsurvives review"', "Headline. A literal \\n starts a new line, so it can be edited from a single-line field."],
    ["intro", "string", "a short paragraph", "The paragraph beside the headline."],
    ["stats", "string[]", "2 cards", 'Stat cards written as "Value | Text" lines. Add as many as you like.'],
    ["panelLabel / panelTitle / panelBody", "string", "see defaults", "The dark button and the panel it opens. Esc or the close button shuts it."],
    ["density", "number", "50", "How many particles the picture is built from (0–100, mapped to 50k–2M). Scaled down automatically in small previews."],
    ["dotSize", "number", "30", "Diameter of each dot (0–100)."],
    ["reach", "number", "30", "How far from the cursor particles start to lift (0–100)."],
    ["lift", "number", "51", "How far they travel once lifted (0–100)."],
    ["damping", "number", "58", "How quickly they settle back (1–100). Lower is looser and floatier."],
    ["imageMode", '"fullscreen" | "band"', '"fullscreen"', "Full screen makes the whole hero the particle canvas, with the nav, headline and cards floating over the picture. Band keeps it as a centred figure above the copy."],
    ["imageFit", '"contain" | "cover"', '"contain"', "Full screen only. Contain shows the whole image; cover fills the hero and crops what doesn't fit."],
    ["imageZoom", "number", "0.88", "Full screen only. Scales the picture about its centre."],
    ["imageOffsetX / imageOffsetY", "number", "25 / 5", "Full screen only. Shifts the picture, as a percentage of the hero's width and height. The default pushes it right so the headline and intro on the left stay readable."],
    ["imageFill", "number", "0.7", "Band layout only. How much of the particle canvas the picture fills. The rest is headroom lifted particles fly into, so they are never clipped."],
    ["edgeParticles", "boolean", "true", "Keeps the particles along one edge of the figure in constant motion — shimmering and streaming outward — even with no cursor. The rest of the picture stays still."],
    ["edgeSide", '"right" | "left" | "both"', '"right"', "Which edge of the silhouette is alive."],
    ["edgeWidth", "number", "14", "How deep the moving band reaches into the figure, as a percentage of the image width (1–60). It fades out toward the inside."],
    ["edgeMotion", "number", "50", "How far the edge particles travel (0–100)."],
    ["paper / glow / ink / accent", "string", "deep brown / orange / warm white / burnt orange", "Base background, the orange gradient glow painted over it behind the figure, text colour, and the colour of the filled buttons. Use #rgb or #rrggbb so the glow can be tinted."],
    ["narrowAt", "number", "760", "Container width in px below which a portrait-shaped hero switches to its stacked layout. A small landscape box keeps the wide layout, scaled down."],
    ["interactive", "boolean", "true", "Turn off the cursor interaction (used for the static home-page card)."],
    ["onCta", "() => void", "undefined", "Called by the nav button and the small round buttons on the stat cards."],
    ["style", "CSSProperties", "{}", "Extra styles for the outer wrapper."],
  ],
};
