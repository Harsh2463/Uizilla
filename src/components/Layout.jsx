import { useEffect } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function Layout() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[2200px] flex-col">
      <ScrollToTop />
      <header
        className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--bg)]/85 backdrop-blur"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto flex h-14 w-full max-w-[1800px] items-center justify-between px-4 sm:px-8 2xl:px-12">
          <Link to="/" className="text-[15px] font-semibold tracking-tight">
            Motion Library
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            <NavLink to="/" end className={({ isActive }) => "transition-colors hover:text-white " + (isActive ? "text-white" : "text-[var(--muted)]")}>
              Components
            </NavLink>
            <NavLink to="/templates" className={({ isActive }) => "transition-colors hover:text-white " + (isActive ? "text-white" : "text-[var(--muted)]")}>
              Templates
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer
        className="border-t border-[var(--line)] py-8 text-sm text-[var(--muted)]"
        style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto w-full max-w-[1800px] px-4 sm:px-8 2xl:px-12">
          Motion Library — a growing set of animated React components.
        </div>
      </footer>
    </div>
  );
}
