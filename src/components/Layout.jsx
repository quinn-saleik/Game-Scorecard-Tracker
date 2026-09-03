import { Suspense, useState } from "react";
import { NavLink, Link, Outlet } from "react-router-dom";
import SettingsMenu from "./SettingsMenu";
import FirstRunTour from "./FirstRunTour";
import { hasSeenTour } from "../data/tourState";

export default function Layout() {
  // Lazy initializer (not an effect) so it auto-opens once per device on
  // whatever page someone first lands on (usually Home, but a shared deep
  // link could land anywhere) without an extra render. Layout wraps every
  // route, so this only needs to live here once.
  const [tourOpen, setTourOpen] = useState(() => !hasSeenTour());

  return (
    <>
      <div className="top-bar">
        <Link to="/" className="brand">
          <span className="suit red">♥</span>
          <span className="suit black">♠</span>
          Scorecard
        </Link>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            type="button"
            className="btn ghost small"
            style={{
              padding: "6px 9px",
              minHeight: "auto",
              border: "1px solid rgba(238, 241, 246, 0.3)",
              borderRadius: 10,
              fontSize: 15,
              lineHeight: 1,
            }}
            onClick={() => setTourOpen(true)}
            aria-label="Show the guided tour"
            title="Show the guided tour"
          >
            ❓
          </button>
          <SettingsMenu />
        </div>
      </div>
      {tourOpen && <FirstRunTour onClose={() => setTourOpen(false)} />}
      <main className="app-main">
        {/* Every route except Home is code-split (see App.jsx) — this
            fallback covers the brief gap while a game's chunk downloads.
            Top bar and nav stay put so it doesn't feel like a full reload. */}
        <Suspense fallback={<p className="empty-state">Loading…</p>}>
          <Outlet />
        </Suspense>
      </main>
      <nav className="nav-bar">
        <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
          <span className="nav-icon">🎲</span>
          Games
        </NavLink>
        <NavLink to="/players" className={({ isActive }) => (isActive ? "active" : "")}>
          <span className="nav-icon">👪</span>
          Players
        </NavLink>
        <NavLink to="/stats" className={({ isActive }) => (isActive ? "active" : "")}>
          <span className="nav-icon">📊</span>
          Stats
        </NavLink>
        <NavLink to="/hall-of-fame" className={({ isActive }) => (isActive ? "active" : "")}>
          <span className="nav-icon">🏆</span>
          Hall of Fame
        </NavLink>
      </nav>
    </>
  );
}
