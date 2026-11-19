import { useRef } from "react";
import "./theme.css";
import "./landing.css";
import { content as defaultContent } from "./content.js";
import Hero from "./sections/Hero.jsx";
import Bar from "./sections/Bar.jsx";
import Statement from "./sections/Statement.jsx";
import TrustPanel from "./sections/TrustPanel.jsx";

/**
 * The whole Orvante page: Hero, Bar, Statement, TrustPanel.
 * Pass your own `content` (same shape as content.js) to change the copy and
 * images from the outside; colours come from theme.css.
 */
export default function Landing({ content = defaultContent }) {
  const root = useRef(null);
  return (
    <main className="ov" ref={root}>
      <Hero content={content} />
      <Bar content={content} />
      <Statement content={content} />
      <TrustPanel content={content} />
    </main>
  );
}
