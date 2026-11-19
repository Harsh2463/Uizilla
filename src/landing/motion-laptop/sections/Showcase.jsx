import Runway from "../components/Runway.jsx";
import { PickCard, ScoreCard, SpecCards, SummaryCard } from "../components/cards.jsx";
import { Reveal } from "../components/motion.jsx";

/**
 * The whole showcase as one section: the carousel card on the left, three
 * cards on the right (pick, performance, the active laptop) and the active
 * laptop's specifications as a bento grid underneath. Every card follows the
 * laptop in front and replays its entrance when it changes.
 */
export default function Showcase({ content, layout, active, setActive, liked, inBag, onLike, onAdd }) {
  return (
    <section
      className="ml-grid"
      id="top"
      aria-label="Laptop showcase"
      // the right-hand column is 3, 4 or 5 of the 12 columns wide, from the rightSize setting
      style={{ "--rc": Math.max(3, Math.min(5, Math.round(4 * layout.rightSize))), "--lc": 12 - Math.max(3, Math.min(5, Math.round(4 * layout.rightSize))) }}
    >
      <Reveal className="ml-card ml-hero">
        <Runway
          laptops={content.laptops}
          sheet={content.sheet}
          sheetSize={content.sheetSize}
          index={active}
          onIndexChange={setActive}
          autoplay={content.autoplay}
          seconds={content.autoplaySeconds}
          title={`${content.brand.name} ${content.brand.accent}`}
          productSize={layout.productSize}
          ringSize={layout.ringSize}
        />
      </Reveal>

      <PickCard content={content} active={active} onPick={setActive} />
      <ScoreCard content={content} active={active} />
      <SummaryCard content={content} active={active} liked={liked} inBag={inBag} onLike={onLike} onAdd={onAdd} />

      <SpecCards content={content} active={active} />
    </section>
  );
}
