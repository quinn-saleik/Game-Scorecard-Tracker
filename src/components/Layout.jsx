import { Suspense, useState } from "react";
import { NavLink, Link, Outlet } from "react-router-dom";
import SettingsMenu from "./SettingsMenu";
import WhoAmI from "./WhoAmI";
import AppIcon from "./AppIcon";
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
          <AppIcon size={34} />
          <span>Scorecard</span>
        </Link>
        <div className="top-actions">
          <WhoAmI />
          <button
            type="button"
            className="icon-btn"
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
        <NavLink
          to="/me"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <span className="nav-icon">👤</span>
          Me
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
