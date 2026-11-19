export default function Bar({ content }) {
  const { bar } = content;
  return (
    <div className="ov-bar">
      <span>
        {bar.left[0]} <em>{bar.left[1]}</em>
      </span>
      <span className="ov-bar-mid">
        <span>{bar.middle}</span>
        <i aria-hidden="true">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2.5v11M3.5 9 8 13.5 12.5 9" />
          </svg>
        </i>
      </span>
      <span className="ov-bar-right">{bar.right}</span>
    </div>
  );
}
