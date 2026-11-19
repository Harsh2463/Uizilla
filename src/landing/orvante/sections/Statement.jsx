import { useRef } from "react";
import { useWordFill } from "../hooks.js";

export default function Statement({ content }) {
  const ref = useRef(null);
  // the two colours come from theme.css (--ov-grey to --ov-fill)
  useWordFill(ref, "--ov-grey", "--ov-fill", 3);
  const { statement, statementSub } = content;
  return (
    <section className="ov-statement-sec" id="studio">
      <p className="ov-statement" ref={ref}>
        {statement.map((line, i) => (
          <span className="ov-sline" key={i}>
            {line.split(" ").map((w, j) => (
              <span key={j}>
                <span data-word>{w}</span>{" "}
              </span>
            ))}
          </span>
        ))}
      </p>
      <p className="ov-sub">
        {statementSub.text.map((t, i) => (
          <em key={i}>
            {t}
            {i === statementSub.text.length - 1 && (
              <>
                {" "}
                <span className="ov-sub-accent">{statementSub.accent}</span>
              </>
            )}
          </em>
        ))}
      </p>
    </section>
  );
}
