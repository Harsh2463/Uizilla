import { useRef } from "react";
import { useCountUp, useInView } from "../hooks.js";

function Laurel() {
  const leaf = (side, i) => {
    const a = (i / 8) * 70 - 35; // fan the leaves up the side of the badge
    return (
      <ellipse
        key={side + i}
        cx={side * 34}
        cy={-26 + i * 8}
        rx="3.2"
        ry="8"
        transform={`rotate(${side * (a + 20)} ${side * 34} ${-26 + i * 8})`}
        fill="currentColor"
        opacity={0.55 + i * 0.05}
      />
    );
  };
  return (
    <g transform="translate(60 56)">
      {[...Array(8)].map((_, i) => leaf(-1, i))}
      {[...Array(8)].map((_, i) => leaf(1, i))}
    </g>
  );
}

export default function TrustPanel({ content }) {
  const { trust, images } = content;
  const ref = useRef(null);
  const seen = useInView(ref);
  const collab = useCountUp(trust.collaborations.value, seen);
  const awards = useCountUp(trust.awards.value, seen);
  return (
    <section className="ov-trust-sec" id="works">
      <div className={"ov-trust" + (seen ? " is-in" : "")} ref={ref}>
        <div className="ov-trust-copy">
          <h2>
            {trust.heading.map((l, i) => (
              <span key={i}>{l}</span>
            ))}
          </h2>
          <p>
            {trust.text.map((l, i) => (
              <span key={i}>
                {l}
                {i < trust.text.length - 1 ? " " : ""}
              </span>
            ))}
          </p>
        </div>

        <div className="ov-tile ov-tile-a" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9" />
          </svg>
        </div>
        <div className="ov-tile ov-tile-b" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <circle cx="7" cy="7" r="2.6" />
            <circle cx="17" cy="7" r="2.6" />
            <circle cx="7" cy="17" r="2.6" />
            <circle cx="17" cy="17" r="2.6" />
          </svg>
        </div>

        <div className="ov-cards">
          <div className="ov-card ov-card-av">
            <div className="ov-avs">
              {images.avatars.slice(0, 8).map((src, i) => (
                <div className="ov-av" style={{ "--i": i }} key={i}>
                  <img src={src} alt="" loading="lazy" />
                </div>
              ))}
            </div>
            <div className="ov-big">
              {collab}
              {trust.collaborations.suffix}
            </div>
            <div className="ov-big-label">{trust.collaborations.label}</div>
          </div>

          <div className="ov-card ov-card-aw">
            <div className="ov-big">
              {awards}
              {trust.awards.suffix}
            </div>
            <div className="ov-big-label">{trust.awards.label}</div>
            <svg className="ov-badge" viewBox="0 0 120 112" role="img" aria-label={trust.awards.badge.join(" ")}>
              <Laurel />
              {trust.awards.badge.map((t, i) => (
                <text key={i} x="60" y={44 + i * 13} textAnchor="middle" fill="#fff" fontSize={i === 1 ? 9 : 7.2} fontWeight="700" letterSpacing="0.6">
                  {t}
                </text>
              ))}
            </svg>
            <p className="ov-note">
              {trust.awards.note.map((l, i) => (
                <span key={i}>
                  {l}
                  <br />
                </span>
              ))}
            </p>
          </div>

          <div className="ov-card ov-card-pt">
            <img src={images.portrait} alt="" loading="lazy" />
          </div>
        </div>
      </div>
    </section>
  );
}
