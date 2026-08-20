import { Suspense } from "react";
import { NavLink, Link, Outlet } from "react-router-dom";
import SettingsMenu from "./SettingsMenu";

export default function Layout() {
  return (
    <>
      <div className="top-bar">
        <Link to="/" className="brand">
          <span className="suit red">♥</span>
          <span className="suit black">♠</span>
          Scorecard
        </Link>
        <SettingsMenu />
      </div>
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
