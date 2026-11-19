import { useParams } from "react-router-dom";
import { useComponent } from "../registry/index.js";

// A bare 640 x 480 stage, used only by `npm run posters` to photograph each
// component for its home-page card. Not linked anywhere.
export default function Poster() {
  const { slug } = useParams();
  const { c } = useComponent(slug);
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 640, height: 480, overflow: "hidden" }} id="poster-stage">
        {c ? <div style={{ position: "absolute", inset: 0 }}>{c.render({ interactive: false })}</div> : null}
      </div>
    </div>
  );
}
