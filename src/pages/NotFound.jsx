import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-3 text-[var(--muted)]">
        That component doesn’t exist.{" "}
        <Link to="/" className="text-white underline underline-offset-4">
          See all components
        </Link>
        .
      </p>
    </div>
  );
}
