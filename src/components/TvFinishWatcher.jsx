import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { subscribeToSession, subscribeToCompletedSessions } from "../data/gameSessions";
import { subscribeToPlayers } from "../data/players";
import { computeNewBadges, groupBadgesByPlayer } from "../data/newBadges";
import { getTvWatch, setTvWatch, TV_WATCH_EVENT } from "../data/tvWatch";
import { shortName } from "../data/playerNames";

// Lives in Layout (so it survives the play screen unmounting). While this
// device's TV mode is showing a game, it watches that game; the moment it
// flips to completed it takes over the TV with "Game over", the winner(s)
// and any achievements the game unlocked. Tap Done to dismiss.
export default function TvFinishWatcher() {
  const { pathname } = useLocation();
  const [watchId, setWatchId] = useState(getTvWatch);
  const [session, setSession] = useState(null);
  const [players, setPlayers] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [open, setOpen] = useState(false);
  const sawActive = useRef(false);

  useEffect(() => {
    const sync = () => setWatchId(getTvWatch());
    window.addEventListener(TV_WATCH_EVENT, sync);
    return () => window.removeEventListener(TV_WATCH_EVENT, sync);
  }, []);

  // Wandered off that game's screen (not just finished it)? Stop watching.
  useEffect(() => {
    if (watchId && !pathname.includes(`/${watchId}`)) setTvWatch(null);
  }, [pathname, watchId]);

  useEffect(() => {
    sawActive.current = false;
    setSession(null);
    if (!watchId) return undefined;
    return subscribeToSession(watchId, setSession);
  }, [watchId]);

  useEffect(() => {
    if (!watchId) return undefined;
    const u1 = subscribeToPlayers(setPlayers);
    const u2 = subscribeToCompletedSessions(setCompleted);
    return () => {
      u1();
      u2();
    };
  }, [watchId]);

  useEffect(() => {
    if (!session) return;
    if (session.status !== "completed") sawActive.current = true;
    else if (sawActive.current) setOpen(true);
  }, [session]);

  if (!open || !session) return null;

  function close() {
    setOpen(false);
    setTvWatch(null);
  }

  const winners = (session.players || []).filter((p) => (session.winnerIds || []).includes(p.id));
  const newBadges = computeNewBadges(session, players, completed) || [];
  const groups = groupBadgesByPlayer(newBadges);
  const gameName = session.config?.customName || session.gameLabel;

  return createPortal(
    <div className="tv-mode-overlay tv-finish" role="dialog" aria-label="Game over">
      <div className="tv-finish-kicker">🏁 {gameName} — Game over</div>
      <div className="tv-finish-winner">
        🏆 {winners.length ? winners.map((p) => shortName(p)).join(" & ") : "Finished"}
        {winners.length > 1 ? " win!" : winners.length === 1 ? " wins!" : ""}
      </div>
      {groups.length > 0 && (
        <div className="tv-finish-badges">
          <div className="tv-finish-badges-title">🏅 New achievements</div>
          {groups.map(({ player, badges }) => (
            <div key={player.id} className="tv-finish-badge-row">
              <span className="tv-finish-badge-name">{shortName(player)}</span>
              <span className="tv-finish-badge-list">
                {badges.map((b) => (
                  <span key={b.id} className="tv-finish-badge">
                    {b.emoji} {b.label}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </div>
      )}
      <button type="button" className="tv-finish-btn" onClick={close}>
        Done
      </button>
    </div>,
    document.body
  );
}
