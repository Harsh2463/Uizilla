import { LazyMotion, domAnimation, m, useReducedMotion } from "framer-motion";

// framer-motion in its slim form: LazyMotion + the `m` components load the
// animation engine on demand instead of bundling all of it up front.
export function MotionRoot({ children }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
}

const EASE = [0.16, 1, 0.3, 1];

/** A card that rises into place the first time it scrolls into view — once. The card
 * itself never replays; only its contents do, when the active laptop changes (Stagger). */
export function Reveal({ children, delay = 0, className = "", as = "div", ...rest }) {
  const still = useReducedMotion();
  const Tag = m[as] || m.div;
  return (
    <Tag
      className={className}
      initial={still ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.08, margin: "0px 0px -6% 0px" }}
      transition={{ duration: 0.8, ease: EASE, delay }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

/** Wrap a card's contents in <Stagger key={activeIndex}> and mark the pieces
 * with <Item>: they re-run their staggered entrance whenever the key changes.
 * It plays on mount, not on scroll, so scrolling a card in and out of view never replays it. */
export function Stagger({ children, className = "", ...rest }) {
  const still = useReducedMotion();
  return (
    <m.div
      className={className}
      variants={container}
      initial={still ? "show" : "hidden"}
      animate="show"
      {...rest}
    >
      {children}
    </m.div>
  );
}

export function Item({ children, className = "", as = "div", ...rest }) {
  const Tag = m[as] || m.div;
  return (
    <Tag className={className} variants={item} {...rest}>
      {children}
    </Tag>
  );
}

export { m };
