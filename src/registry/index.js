// To add a component:
//  1. Create src/library/<your-slug>/YourComponent.jsx and meta.jsx
//  2. Import its meta here and add it to the array.
import roundCarousel from "../library/round-carousel/meta.jsx";
import rotundaCarousel from "../library/rotunda-carousel/meta.jsx";
import grainyCarousel from "../library/grainy-carousel/meta.jsx";
import galleryTunnel from "../library/gallery-tunnel/meta.jsx";
import rotatingGallery from "../library/rotating-gallery/meta.jsx";
import depthGallery from "../library/depth-gallery/meta.jsx";
import magazineFlip from "../library/magazine-flip/meta.jsx";
import colorTunnel from "../library/color-tunnel/meta.jsx";
import zoomGallery from "../library/zoom-gallery/meta.jsx";
import spiralImages from "../library/spiral-images/meta.jsx";
import spotlightFrames from "../library/spotlight-frames/meta.jsx";
import clothingFlip from "../library/clothing-flip/meta.jsx";
import tryTheLook from "../library/try-the-look/meta.jsx";
import magneticCarousel from "../library/magnetic-carousel/meta.jsx";
import hoverImageReveal from "../library/hover-image-reveal/meta.jsx";
import particleHero from "../library/particle-hero/meta.jsx";
import textPath from "../library/text-path/meta.jsx";
import heatStreakRing from "../library/heat-streak-ring/meta.jsx";
import smokyText from "../library/smoky-text/meta.jsx";
import circularText from "../library/circular-text/meta.jsx";
import ledTicker from "../library/led-ticker/meta.jsx";
import text3DFlip from "../library/text-3d-flip/meta.jsx";
import scrollHighlight from "../library/scroll-highlight/meta.jsx";
import strideBarSite from "../library/stride-bar-site/meta.jsx";

export const components = [
  roundCarousel,
  rotundaCarousel,
  grainyCarousel,
  galleryTunnel,
  rotatingGallery,
  depthGallery,
  magazineFlip,
  clothingFlip,
  colorTunnel,
  zoomGallery,
  spiralImages,
  spotlightFrames,
  tryTheLook,
  magneticCarousel,
  hoverImageReveal,
  particleHero,
  textPath,
  heatStreakRing,
  smokyText,
  circularText,
  ledTicker,
  text3DFlip,
  scrollHighlight,
  strideBarSite,
];

export const getComponent = (slug) => components.find((c) => c.slug === slug);
