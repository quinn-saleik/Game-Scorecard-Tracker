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
        <Outlet />
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
