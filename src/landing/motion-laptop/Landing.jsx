import { useCallback, useState } from "react";
import "./theme.css";
import "./styles.css";
import { content as defaultContent } from "./content.js";
import Header from "./components/Header.jsx";
import { MotionRoot } from "./components/motion.jsx";
import Showcase from "./sections/Showcase.jsx";

/**
 * Header + the laptop showcase. State lives here: which laptop is active
 * (shared by the carousel and every card), the bag and the favourites.
 * Pass your own `content` (same shape as content.js) to change the copy,
 * laptops and specs from the outside; colours come from theme.css.
 */
export default function Landing({ content = defaultContent }) {
  const [active, setActive] = useState(Math.min(1, content.laptops.length - 1));
  const [bag, setBag] = useState(() => new Set());
  const [likes, setLikes] = useState(() => new Set());
  const layout = { productSize: 0.9, ringSize: 0.9, rightSize: 0.75, ...content.layout };

  const toggle = (set, setter, i) =>
    setter((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  const search = useCallback(
    (q) => {
      const t = q.trim().toLowerCase();
      if (!t) return;
      const i = content.laptops.findIndex((L) => `${L.brand} ${L.name} ${L.kind}`.toLowerCase().includes(t));
      if (i >= 0) setActive(i);
    },
    [content.laptops]
  );

  const L = content.laptops[active];
  return (
    <MotionRoot>
      <div
        className="ml"
        style={{
          "--t1": L.tint[0],
          "--t2": L.tint[1],
          "--accent": L.accent,
        }}
      >
        <div className="ml-shell">
          <Header content={content} bag={bag.size} liked={likes.size} onSearch={search} />
          <main>
            <Showcase
              content={content}
              layout={layout}
              active={active}
              setActive={setActive}
              liked={likes.has(active)}
              inBag={bag.has(active)}
              onLike={() => toggle(likes, setLikes, active)}
              onAdd={() => toggle(bag, setBag, active)}
            />
          </main>
        </div>
      </div>
    </MotionRoot>
  );
}
