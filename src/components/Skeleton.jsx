// Pulsing placeholder blocks, shown while a chunk or a card is still loading.
export function Bar({ className = "" }) {
  return <div className={`animate-pulse rounded-md bg-white/[0.07] ${className}`} />;
}

/** Same footprint as a loaded home-page card, so nothing jumps when it fills in. */
export function CardSkeleton() {
  return (
    <div className="block overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)]" aria-hidden="true">
      <div className="aspect-[4/3] w-full animate-pulse bg-white/[0.05]" />
      <div className="h-[108px] p-4 sm:p-5">
        <Bar className="h-4 w-1/2" />
        <Bar className="mt-3 h-3 w-full" />
        <Bar className="mt-2 h-3 w-3/4" />
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12" role="status" aria-label="Loading">
      <Bar className="h-4 w-32" />
      <Bar className="mt-6 h-9 w-64" />
      <Bar className="mt-4 h-4 w-full max-w-xl" />
      <Bar className="mt-2 h-4 w-2/3 max-w-md" />
      <div className="mt-8 w-full animate-pulse rounded-2xl border border-[var(--line)] bg-white/[0.04]" style={{ height: "clamp(340px, 68dvh, 680px)" }} />
    </div>
  );
}
