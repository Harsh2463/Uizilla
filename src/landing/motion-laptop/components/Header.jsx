import { useRef, useState } from "react";
import { FiSearch, FiShoppingBag, FiHeart } from "react-icons/fi";
import { m } from "./motion.jsx";

/** The site header: logo, search, bag, favourites and the user chip.
 * Typing a laptop's name and pressing Enter jumps the carousel to it. */
export default function Header({ content, bag = 0, liked = 0, onSearch }) {
  const { brand, header } = content;
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false); // narrow phones: the search is just an icon until tapped
  const input = useRef(null);
  const submit = (e) => {
    e.preventDefault();
    onSearch?.(q);
    setOpen(false);
  };
  return (
    <m.header
      className="ml-header"
      initial={{ opacity: 0, y: -18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <a className="ml-logo" href="#top" aria-label={`${brand.name} ${brand.accent}`}>
        <span className="ml-logo-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 3h5l8 11V3h5v18h-5L8 10v11H3z" />
          </svg>
        </span>
        <span className="ml-logo-text">
          {brand.name}
          <b>{brand.accent}</b>
        </span>
      </a>

      <form className={"ml-search" + (open ? " is-open" : "")} role="search" onSubmit={submit}>
        <input
          ref={input}
          type="search"
          onBlur={() => !q && setOpen(false)}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={header.searchPlaceholder}
          aria-label="Search laptops"
        />
        <button
          type="submit"
          aria-label="Search"
          onClick={(e) => {
            // on the narrowest phones the first tap opens the field instead of submitting
            if (!open && matchMedia("(max-width: 420px)").matches) {
              e.preventDefault();
              setOpen(true);
              setTimeout(() => input.current?.focus(), 0);
            }
          }}
        >
          <FiSearch />
        </button>
      </form>

      <div className="ml-actions">
        <button className="ml-icon-btn" aria-label={`Bag, ${bag} items`}>
          <FiShoppingBag />
          {bag > 0 && <span className="ml-badge">{bag}</span>}
        </button>
        <button className="ml-icon-btn ml-icon-btn--heart" aria-label={`Favourites, ${liked}`}>
          <FiHeart />
          {liked > 0 && <span className="ml-badge">{liked}</span>}
        </button>
        <div className="ml-user">
          <span className="ml-user-name">{header.user}</span>
          <span className="ml-avatar" aria-hidden="true">
            {header.user
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)}
          </span>
        </div>
      </div>
    </m.header>
  );
}
