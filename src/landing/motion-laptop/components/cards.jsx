import { FiArrowUpRight, FiBatteryCharging, FiCpu, FiHardDrive, FiHeart, FiMonitor, FiStar, FiZap, FiBox } from "react-icons/fi";
import { BsMemory } from "react-icons/bs";
import { Item, Reveal, Stagger } from "./motion.jsx";
import { money, useCountUp } from "../hooks.js";

/** A laptop cut out of the sprite sheet, sized by its container's width. */
export function Thumb({ laptop, sheet, sheetSize, className = "" }) {
  const [bx, by, bw, bh] = laptop.box;
  const [sw, sh] = sheetSize;
  return (
    <span
      className={"ml-thumb " + className}
      role="img"
      aria-label={`${laptop.brand} ${laptop.name}`}
      style={{
        aspectRatio: `${bw} / ${bh}`,
        backgroundImage: `url("${sheet}")`,
        backgroundSize: `${(sw / bw) * 100}% auto`,
        backgroundPosition: `${(bx / (sw - bw)) * 100}% ${(by / (sh - bh)) * 100}%`,
      }}
    />
  );
}

const Bar = ({ value = 100, tone }) => (
  <span className="ml-bar" style={{ "--v": Math.max(0, Math.min(1, value / 100)), ...(tone ? { "--tone": tone } : null) }}>
    <i />
  </span>
);

const Num = ({ to, decimals = 0, replay, suffix = "", className = "ml-num" }) => {
  const v = useCountUp(to, { decimals, replay });
  return (
    <span className={className}>
      {decimals ? v.toFixed(decimals) : Math.round(v).toLocaleString("en-US")}
      {suffix && <small>{suffix}</small>}
    </span>
  );
};

/* ------------------------------------------------------------ right column */

/** "Pick a machine": one dot per laptop in its own colour — tap to jump. */
export function PickCard({ content, active, onPick }) {
  const { laptops, pick } = content;
  return (
    <Reveal className="ml-card ml-pick" delay={0.05}>
      <p className="ml-card-title">{pick.title}</p>
      <div className="ml-dots" role="radiogroup" aria-label={pick.title}>
        {laptops.map((L, i) => (
          <button
            key={i}
            role="radio"
            aria-checked={i === active}
            aria-label={`${L.brand} ${L.name}`}
            className={"ml-dot" + (i === active ? " is-on" : "")}
            style={{ "--c": L.accent, "--i": i }}
            onClick={() => onPick(i)}
          />
        ))}
      </div>
      <p className="ml-hint">{pick.hint}</p>
    </Reveal>
  );
}

/** A ring and a count for the laptop's overall performance. */
export function ScoreCard({ content, active }) {
  const L = content.laptops[active];
  const score = useCountUp(L.performance, { duration: 1300, replay: active });
  const C = 2 * Math.PI * 34;
  return (
    <Reveal className="ml-card ml-score" delay={0.12}>
      <Stagger key={active} className="ml-score-in">
        <Item className="ml-score-copy">
          <p className="ml-card-title">{content.score.title}</p>
          <span className="ml-chip">
            <FiZap /> {L.kind}
          </span>
        </Item>
        <Item className="ml-ring">
          <svg viewBox="0 0 80 80" aria-hidden="true">
            <circle cx="40" cy="40" r="34" className="ml-ring-track" />
            <circle
              cx="40"
              cy="40"
              r="34"
              className="ml-ring-fill"
              style={{ strokeDasharray: C, "--off": C * (1 - L.performance / 100) }}
            />
          </svg>
          <b>{Math.round(score)}</b>
        </Item>
      </Stagger>
    </Reveal>
  );
}

/** The tall card: the active laptop, its price and the call to action. */
export function SummaryCard({ content, active, liked, inBag, onLike, onAdd }) {
  const L = content.laptops[active];
  const price = useCountUp(L.price, { duration: 1000, replay: active });
  return (
    <Reveal className="ml-card ml-summary" delay={0.18}>
      <Stagger key={active} className="ml-summary-in">
        <Item className="ml-summary-img">
          <Thumb laptop={L} sheet={content.sheet} sheetSize={content.sheetSize} />
          <span className="ml-badge-pill">{L.brand}</span>
          <button className={"ml-heart" + (liked ? " is-on" : "")} onClick={onLike} aria-pressed={liked} aria-label="Save to favourites">
            <FiHeart />
          </button>
        </Item>
        <Item className="ml-summary-text">
          <h3>
            {L.brand} {L.name}
          </h3>
          <p>{L.tagline}</p>
        </Item>
        <Item className="ml-summary-row">
          <span className="ml-price">
            ${Math.round(price).toLocaleString("en-US")}
            {L.was > 0 && <s>{money(L.was)}</s>}
          </span>
          <span className="ml-rate">
            <FiStar /> {L.rating} <small>({L.reviews})</small>
          </span>
        </Item>
        <Item>
          <button className={"ml-cta" + (inBag ? " is-added" : "")} onClick={onAdd}>
            <span>{inBag ? content.summary.added : content.summary.cta}</span>
            <i>
              <FiArrowUpRight />
            </i>
          </button>
        </Item>
      </Stagger>
    </Reveal>
  );
}

/* ----------------------------------------------------------- spec cards -- */

function Spec({ name, icon, label, active, className = "", delay = 0, children }) {
  return (
    <Reveal className={`ml-card ml-spec ml-spec--${name} ${className}`} delay={delay}>
      <p className="ml-spec-label">
        <i>{icon}</i>
        {label}
      </p>
      <Stagger key={active} className="ml-spec-body">
        {children}
      </Stagger>
    </Reveal>
  );
}

export function SpecCards({ content, active }) {
  const L = content.laptops[active];
  const s = L.specs;
  const t = content.specLabels;
  return (
    <>
      <Spec name="cpu" icon={<FiCpu />} label={t.cpu} active={active} delay={0.05}>
        <Item as="h4">{s.cpu.name}</Item>
        <Item className="ml-stats">
          <span>
            <Num to={s.cpu.cores} replay={active} />
            <em>cores</em>
          </span>
          <span>
            <Num to={s.cpu.boost} decimals={1} replay={active} />
            <em>GHz boost</em>
          </span>
        </Item>
        <Item>
          <Bar value={Math.min(100, s.cpu.cores * 2.2 + s.cpu.boost * 9)} />
        </Item>
      </Spec>

      <Spec name="gpu" icon={<FiBox />} label={t.gpu} active={active} delay={0.1}>
        <Item as="h4">{s.gpu.name}</Item>
        <Item className="ml-stats">
          <span>
            {s.gpu.vram ? <Num to={s.gpu.vram} replay={active} suffix=" GB" /> : <span className="ml-num">Shared</span>}
            <em>{s.gpu.vram ? "video memory" : "memory"}</em>
          </span>
          <span>
            <Num to={s.gpu.watts} replay={active} suffix=" W" />
            <em>graphics power</em>
          </span>
        </Item>
        <Item>
          <Bar value={Math.min(100, s.gpu.watts * 0.7)} />
        </Item>
      </Spec>

      <Spec name="display" icon={<FiMonitor />} label={t.display} active={active} delay={0.15}>
        <Item as="h4">
          <Num to={s.display.size} decimals={s.display.size % 1 ? 1 : 0} replay={active} suffix="″" className="ml-inline" /> {s.display.res}
        </Item>
        <Item className="ml-stats">
          <span>
            <Num to={s.display.hz} replay={active} suffix=" Hz" />
            <em>refresh rate</em>
          </span>
          <span className="ml-chip ml-chip--soft">{s.display.panel}</span>
        </Item>
      </Spec>

      <Spec name="memory" icon={<BsMemory />} label={t.memory} active={active} delay={0.05}>
        <Item as="h4">
          <Num to={s.memory.size} replay={active} suffix=" GB" className="ml-inline" />
        </Item>
        <Item>
          <span className="ml-chip ml-chip--soft">{s.memory.type}</span>
        </Item>
        <Item>
          <Bar value={Math.min(100, s.memory.size * 2.6)} />
        </Item>
      </Spec>

      <Spec name="storage" icon={<FiHardDrive />} label={t.storage} active={active} delay={0.1}>
        <Item as="h4">
          {s.storage.size >= 1024 ? (
            <Num to={s.storage.size / 1024} replay={active} suffix=" TB" className="ml-inline" />
          ) : (
            <Num to={s.storage.size} replay={active} suffix=" GB" className="ml-inline" />
          )}
        </Item>
        <Item>
          <span className="ml-chip ml-chip--soft">{s.storage.type}</span>
        </Item>
        <Item>
          <Bar value={s.storage.used} />
          <em className="ml-foot">{s.storage.used}% used on a typical setup</em>
        </Item>
      </Spec>

      <Spec name="battery" icon={<FiBatteryCharging />} label={t.battery} active={active} delay={0.15}>
        <Item as="h4">
          <Num to={s.battery.hours} replay={active} suffix=" h" className="ml-inline" />
        </Item>
        <Item>
          <span className="ml-chip ml-chip--soft">{s.battery.wh} Wh</span>
        </Item>
        <Item>
          <Bar value={Math.min(100, s.battery.hours * 4)} />
        </Item>
      </Spec>

      <Spec name="build" icon={<FiBox />} label={t.build} active={active} delay={0.2}>
        <Item as="h4">
          <Num to={s.build.kg} decimals={2} replay={active} suffix=" kg" className="ml-inline" />
        </Item>
        <Item className="ml-ports">
          {s.build.ports.map((p) => (
            <span key={p} className="ml-chip ml-chip--soft">
              {p}
            </span>
          ))}
        </Item>
      </Spec>
    </>
  );
}
