import HeatStreakRing from "./HeatStreakRing.jsx";
import source from "./HeatStreakRing.jsx?raw";

export default {
  slug: "heat-streak-ring",
  name: "Heat Streak Text Ring",
  tag: "WebGL",
  file: "HeatStreakRing.jsx",
  source,
  Component: HeatStreakRing,
  description:
    "Heavy capitals lying flat round a ring, seen from just above, each letter smeared straight down into a curtain of hairlines run through a heat map: black at the type, red and gold under it, cooling to teal. The ring turns, heat pulses run down the curtain, and dragging spins it.",
  // Rendered on the home page card (it plays itself) and on the component page.
  render: ({ interactive = true } = {}) => <HeatStreakRing interactive={interactive} />,
  usage: `import HeatStreakRing from "./HeatStreakRing";

// Fills its parent, so give the parent a height.
<div style={{ height: 640 }}>
  <HeatStreakRing
    text="TEXT BLUR EFFECT"
    hot="#A42409"
    mid="#E0CB50"
    cool="#178899"
    spin={30}
  />
</div>`,
  // Editor sidebar. `default` must match the default in HeatStreakRing.jsx.
  controls: [
    { key: "text", label: "Text", type: "text", default: "TEXT BLUR EFFECT" },
    { key: "background", label: "Background", type: "color", default: "#161616" },
    { key: "fontFamily", label: "Font (Google Fonts name)", type: "text", default: "Anton" },
    {
      key: "fontWeight", label: "Font Weight", type: "select", default: "400",
      options: [["300", "Light"], ["400", "Regular"], ["500", "Medium"], ["700", "Bold"], ["900", "Black"]],
    },
    { key: "fontSize", label: "Letter Size", type: "number", min: 20, max: 140, step: 1, default: 60 },
    { key: "letterSpacing", label: "Letter Spacing", unit: "em", type: "number", min: -0.1, max: 0.6, step: 0.01, default: 0 },
    { key: "scale", label: "Overall Scale", unit: "%", type: "number", min: 60, max: 400, step: 1, default: 350 },
    { key: "streakLength", label: "Streak Length", unit: "%", type: "number", min: 0, max: 100, step: 1, default: 0 },
    { key: "hot", label: "Hot Color", type: "color", default: "#A42409" },
    { key: "mid", label: "Mid Color", type: "color", default: "#E0CB50" },
    { key: "cool", label: "Cool Color", type: "color", default: "#178899" },
    { key: "tipColor", label: "Tip Color (fade-out)", type: "color", default: "#054A53" },
    { key: "textColor", label: "Letter Fill", type: "color", default: "#0A0A0A" },
    { key: "rimColor", label: "Letter Rim Color", type: "color", default: "#D2CC8A" },
    { key: "speed", label: "Animation Speed", type: "number", min: 0, max: 100, step: 1, default: 50 },
    { key: "spin", label: "Ring Spin", unit: "°/s", type: "number", min: 1, max: 120, step: 1, default: 30 },
    { key: "hover", label: "Hover Response", type: "number", min: 0, max: 100, step: 1, default: 50 },
    { key: "drag", label: "Drag To Spin", type: "number", min: 0, max: 100, step: 1, default: 50 },
    { key: "repeats", label: "Phrase Repeats", type: "number", min: 1, max: 6, step: 1, default: 2 },
    { key: "streakCount", label: "Hairline Count", type: "number", min: 20, max: 600, step: 1, default: 111 },
    { key: "lineWidth", label: "Hairline Thickness", type: "number", min: 0, max: 100, step: 1, default: 60 },
    { key: "lengthJitter", label: "Length Variation", type: "number", min: 0, max: 100, step: 1, default: 30 },
    { key: "seed", label: "Random Seed", type: "number", min: 0, max: 99, step: 1, default: 7 },
    { key: "ringWidth", label: "Ring Width", type: "number", min: 10, max: 100, step: 1, default: 42 },
    { key: "ringTilt", label: "Ring Tilt", type: "number", min: 5, max: 100, step: 1, default: 33 },
    { key: "ringY", label: "Ring Height", type: "number", min: 10, max: 90, step: 1, default: 42 },
    { key: "bulge", label: "Perspective Bulge", type: "number", min: 0, max: 90, step: 1, default: 30 },
    { key: "backSize", label: "Back Letter Size", type: "number", min: 1, max: 100, step: 1, default: 28 },
    { key: "glyphTilt", label: "Letter Lean", type: "number", min: 10, max: 100, step: 1, default: 75 },
    { key: "heavy", label: "Letter Weight Boost", type: "number", min: 0, max: 100, step: 1, default: 0 },
    { key: "heatRun", label: "Heat Run", type: "number", min: 0, max: 200, step: 1, default: 85 },
    { key: "coolStart", label: "Cool-Off Start", type: "number", min: 0, max: 95, step: 1, default: 30 },
    { key: "edgeShift", label: "Side Cooling", type: "number", min: 0, max: 100, step: 1, default: 50 },
    { key: "backGain", label: "Back Brightness", type: "number", min: 0, max: 100, step: 1, default: 60 },
    { key: "backShift", label: "Back Cooling", type: "number", min: 0, max: 100, step: 1, default: 30 },
    { key: "glow", label: "Glow", type: "number", min: 0, max: 100, step: 1, default: 30 },
    { key: "rimPx", label: "Letter Edge Blur", type: "number", min: 0, max: 8, step: 0.5, default: 2 },
    { key: "grain", label: "Background Grain", type: "number", min: 0, max: 100, step: 1, default: 50 },
    { key: "vignette", label: "Vignette", type: "number", min: 0, max: 100, step: 1, default: 0 },
    { key: "shimmer", label: "Line-End Shimmer", type: "number", min: 0, max: 200, step: 1, default: 100 },
    { key: "flicker", label: "Brightness Flicker", type: "number", min: 0, max: 100, step: 1, default: 10 },
    { key: "pulses", label: "Heat Pulses", type: "number", min: 0, max: 6, step: 1, default: 2 },
    { key: "pulseMs", label: "Pulse Duration", unit: "ms", type: "number", min: 300, max: 6000, step: 50, default: 2000 },
    { key: "pulseAmp", label: "Pulse Strength", type: "number", min: 0, max: 100, step: 1, default: 35 },
    { key: "placeX", label: "Position X", unit: "%", type: "number", min: -50, max: 50, step: 1, default: 0 },
    { key: "placeY", label: "Position Y", unit: "%", type: "number", min: -50, max: 50, step: 1, default: 0 },
    { key: "placeAngle", label: "Rotate", unit: "°", type: "number", min: -180, max: 180, step: 1, default: 0 },
    { key: "placeTilt", label: "Lean Back / Forward", unit: "°", type: "number", min: -90, max: 90, step: 1, default: 0 },
  ],
  props: [
    ["text", "string", '"TEXT BLUR EFFECT"', "The words set round the ring. A short phrase is repeated until it fills the same length."],
    ["background", "string", '"#161616"', "Ground colour behind the curtain."],
    ["fontFamily / fontWeight", "string", '"Anton" / "400"', "Typeface and weight for the letters. A family that is not loaded on the page is requested once from Google Fonts; Impact stands in until it arrives, or if it is unknown."],
    ["fontSize / letterSpacing", "number", "60 / 0", "Size of the letters on the ring (60 closes the ring on the reference phrase) and extra spacing in em."],
    ["scale", "number", "350", "How big the ring and curtain draw. 225 is the reference poster framing."],
    ["streakLength", "number", "0", "How far the curtain runs down (0–100). Starts at 0, so only the ring of type shows; raise it to draw the heat curtain (70 is the reference poster). The box is always centred on the ring, not on the curtain."],
    ["hot / mid / cool / tipColor", "string", "#A42409 / #E0CB50 / #178899 / #054A53", "The four colours of the heat map: under the type, the gold band, the cooled lines, and the fade-out at the foot."],
    ["textColor / rimColor", "string", "#0A0A0A / #D2CC8A", "Fill of the letters and the pale rim around them."],
    ["speed / spin", "number", "50 / 30", "Overall animation rate (0 holds the still frame) and how fast the ring turns, in degrees per second."],
    ["hover / drag", "number", "50 / 50", "How much the cursor leans and warms the ring, and how far a drag turns it (0 turns either off)."],
    ["repeats / streakCount / seed", "number", "2 / 111 / 7", "How many times the phrase closes the ring, how many hairlines cross it, and the random seed for their lengths."],
    ["lineWidth / lengthJitter", "number", "60 / 30", "Thickness of each hairline and how much their lengths vary."],
    ["ringWidth / ringTilt / ringY / bulge", "number", "42 / 33 / 42 / 30", "The ring's width, how far you look down on it, where it sits vertically, and how strong the perspective is."],
    ["backSize / glyphTilt / heavy", "number", "28 / 75 / 0", "Size of the far letters against the near ones, how far the letters lean, and a boost to stroke weight."],
    ["heatRun / coolStart / edgeShift", "number", "85 / 30 / 50", "How far the hot head runs down the curtain, where the fade to teal begins, and how much the outer lines cool."],
    ["backGain / backShift", "number", "60 / 30", "Brightness and cooling of the far side of the ring."],
    ["glow / rimPx / grain / vignette", "number", "30 / 2 / 50 / 0", "Soft glow around hot lines, blur on the letter edges, background grain, and edge darkening."],
    ["shimmer / flicker", "number", "100 / 10", "Movement at the ends of the lines and brightness flicker from line to line."],
    ["pulses / pulseMs / pulseAmp", "number", "2 / 2000 / 35", "Heat pulses running down the curtain: how many at once, how long one takes, and how strong."],
    ["placeX / placeY / placeAngle / placeTilt", "number", "0 / 0 / 0 / 0", "Move, rotate and lean the whole piece inside its box."],
    ["interactive", "boolean", "true", "Turn off hover and drag (used for the home-page card)."],
    ["style", "CSSProperties", "{}", "Extra styles for the outer wrapper."],
  ],
};
