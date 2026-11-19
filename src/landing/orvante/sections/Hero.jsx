import { useLayoutEffect, useRef, useState } from "react";
import { useCountUp, useLoadIn, useParallax } from "../hooks.js";

const Arrow = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="1em" height="1em" aria-hidden="true">
    <path d="M4.5 11.5 11.5 4.5M5.5 4.5h6v6" />
  </svg>
);

// Six small stand-in partner glyphs (all fictional).
const GLYPHS = [
  <circle key="a" cx="8" cy="8" r="6" />,
  <path key="b" d="M8 2 14 13H2z" />,
  <rect key="c" x="2.5" y="2.5" width="11" height="11" rx="2" />,
  <path key="d" d="M8 1.5 14.5 8 8 14.5 1.5 8z" />,
  <path key="e" d="M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2Zm0 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" fillRule="evenodd" />,
  <path key="f" d="M2 3h12v2.2H2zM2 6.9h12v2.2H2zM2 10.8h12V13H2z" />,
];

function Nav({ items }) {
  const [on, setOn] = useState(0);
  const [hover, setHover] = useState(null);
  const pill = useRef(null);
  const links = useRef([]);
  const target = hover ?? on;
  useLayoutEffect(() => {
    const a = links.current[target];
    if (a && pill.current) {
      pill.current.style.width = `${a.offsetWidth}px`;
      pill.current.style.transform = `translateX(${a.offsetLeft}px)`;
    }
  }, [target, items]);
  return (
    <nav className="ov-nav" data-nav onMouseLeave={() => setHover(null)}>
      <i className="ov-nav-pill" ref={pill} />
      {items.map((n, i) => (
        <a
          key={n.label}
          href={n.href}
          ref={(el) => (links.current[i] = el)}
          className={i === target ? "is-on" : ""}
          onMouseEnter={() => setHover(i)}
          onClick={() => setOn(i)}
        >
          {n.label}
        </a>
      ))}
    </nav>
  );
}

export default function Hero({ content }) {
  const c = content;
  const root = useRef(null);
  const par = useRef(null);
  useLoadIn(root);
  useParallax(par, 0.12);
  const [go, setGo] = useState(false);
  useLayoutEffect(() => {
    const t = setTimeout(() => setGo(true), 500);
    return () => clearTimeout(t);
  }, []);
  const partners = useCountUp(c.stats.partners.value, go);
  const projects = useCountUp(c.stats.projects.value, go);

  return (
    <section className="ov-hero" id="top" ref={root}>
      <div className="ov-stage">
        <div className="ov-photoWrap">
          <div className="ov-par" ref={par}>
            <div className="ov-photo" data-photo>
              <img src={c.images.hero} alt="" fetchpriority="high" />
            </div>
          </div>

          <div className="ov-plate" data-rise>
            <div className="ov-plate-brand">
              <svg viewBox="0 0 32 32" fill="#fff" aria-hidden="true">
                <path d="M2 28 14 4v24z" />
                <path d="M18 28 30 4v24z" opacity="0.55" />
              </svg>
              {c.brand}
            </div>
            <div className="ov-menu" aria-hidden="true">
              <i />
              <i />
            </div>
          </div>

          <div className="ov-logos" data-rise>
            {c.logos.map((l) => (
              <span key={l}>{l}</span>
            ))}
          </div>
        </div>

        <div className="ov-top">
          <Nav items={c.nav} />
          <div className="ov-date" data-rise>
            <b>{c.date.day}</b>
            {c.date.range}
          </div>
          <a className="ov-btn ov-contact" href={c.contact.href} data-rise aria-label={c.contact.label}>
            <span className="ov-contact-label">{c.contact.label}</span>
            <Arrow />
          </a>
        </div>

        <h1 className="ov-title" aria-label={c.title.lines.join(" ")}>
          {c.title.lines.map((l) => (
            <span className="ov-line" key={l}>
              <span data-title-line>{l}</span>
            </span>
          ))}
          <span className="ov-year" data-rise>
            {c.title.year}
          </span>
        </h1>

        <div className="ov-about">
          <div className="ov-eyebrow" data-rise>
            {c.about.label}
          </div>
          <p data-rise>
            {c.about.text.map((t, i) => (
              <span key={i}>
                {t}
                {i < c.about.text.length - 1 ? " " : ""}
              </span>
            ))}
          </p>
          <a className="ov-btn" href={c.about.button.href} data-rise>
            {c.about.button.label} <Arrow />
          </a>
        </div>

        <div className="ov-grow" data-rise>
          <i>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3.5 8.5 3 3 6-7" />
            </svg>
          </i>
          {c.growth}
        </div>

        <div className="ov-avail" data-rise>
          {c.available.line1}
          <br />
          <span>{c.available.line2}</span>
        </div>

        <div className="ov-stats" data-rise>
          <div className="ov-dark">
            <strong>
              {partners}
              {c.stats.partners.suffix}
            </strong>
            <small>{c.stats.partners.label}</small>
            <ul className="ov-marks">
              {c.stats.marks.slice(0, 6).map((m, i) => (
                <li key={m}>
                  <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    {GLYPHS[i % GLYPHS.length]}
                  </svg>
                  {m}
                </li>
              ))}
            </ul>
            <a className="ov-book" href={c.contact.href}>
              {c.stats.partners.button} <Arrow />
            </a>
          </div>
          <div className="ov-feed">
            <img src={c.images.studioFeed} alt="" loading="lazy" />
            <div className="ov-feed-top">
              <span>{c.stats.feed.tag}</span>
              <span>{c.stats.feed.date}</span>
            </div>
            <div className="ov-feed-num">
              <strong>
                {projects}
                {c.stats.projects.suffix}
              </strong>
              <small>{c.stats.projects.label}</small>
            </div>
          </div>
        </div>

        <div className="ov-out" data-rise>
          <div className="ov-out-head">
            <div>
              <small>{c.outNow.eyebrow}</small>
              <b>{c.outNow.title}</b>
            </div>
            <span>{c.outNow.year}</span>
          </div>
          <a className="ov-out-card" href={c.outNow.href}>
            <img src={c.images.outNow} alt={c.outNow.title} loading="lazy" />
            <span className="ov-out-arrow">
              <Arrow />
            </span>
            <span className="ov-progress">
              <i data-draw />
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}
