import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { subscribeToPlayers } from "../data/players";
import { subscribeToCompletedSessions } from "../data/gameSessions";
import { useWhoamiId } from "../data/whoami";
import { computeWrapped } from "../data/wrapped";
import { wrappedYear } from "../data/wrappedGate";
import { shortName } from "../data/playerNames";

// Scorecard Wrapped — full-screen, tap-through story slides: your year, then
// the family's. Reachable only from Dec 25 (see data/wrappedGate.js), except
// the unlinked /wrapped/preview route for testing early. Colors are
// hardcoded on purpose, like TV mode: it's always-dark, whatever the theme.

function Avatar({ p }) {
  if (!p) return null;
  if (p.photo) return <img className="wr-avatar" src={p.photo} alt="" style={{ borderColor: p.color || "#fff" }} />;
  if (p.avatar || p.color) return <span className="wr-avatar" style={{ background: p.color || "#445" }}>{p.avatar}</span>;
  return null;
}

const names = (list) => list.map((p) => shortName(p)).join(" & ");
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function buildSlides(w) {
  const { family: f, me } = w;
  const slides = [];
  const add = (s) => slides.push({ bg: slides.length % 6, ...s });

  if (me) {
    add({
      kicker: `Scorecard Wrapped · ${w.year}`,
      big: `${shortName(me.player)}, here's your year.`,
      avatar: me.player,
      small: "Tap to continue →",
    });
    add({
      kicker: "You showed up",
      big: me.games,
      label: me.games === 1 ? "game played" : "games played",
      small: `across ${plural(me.differentGames, "different game", "different games")}`,
    });
    if (me.favoriteGame) {
      add({
        kicker: "Your favorite game",
        big: me.favoriteGame.label,
        bigText: true,
        small: `You played it ${plural(me.favoriteGame.count, "time", "times")}.`,
      });
    }
    add({
      kicker: "Your wins",
      big: me.wins,
      label: me.wins === 1 ? "win" : "wins",
      small:
        `${me.winPct}% win rate` +
        (me.bestGame && me.bestGame.wins >= 2 ? ` · best at ${me.bestGame.label} (${me.bestGame.wins} wins)` : ""),
    });
    if (me.rankOf > 1) {
      add({
        kicker: "Family standings",
        big: `#${me.winRank}`,
        label: `in wins out of ${me.rankOf} players`,
        small: me.winRank === 1 ? "👑 Family champion" : undefined,
      });
    }
    if (me.winIndex != null) {
      const beat = me.winIndex >= 1;
      add({
        kicker: "Versus par",
        big: `${me.winIndex.toFixed(1)}×`,
        label: beat ? "better than luck" : "of what luck predicts",
        small: beat
          ? `Luck alone says ${me.parPct}%. You won ${me.winPct}%.`
          : `Luck alone says ${me.parPct}%. You won ${me.winPct}%. Revenge in ${w.year + 1}.`,
      });
    }
    if (me.streak >= 2) {
      add({ kicker: "Hot hand", big: `${me.streak} 🔥`, label: "wins in a row", small: "Your longest streak this year." });
    }
    if (me.companion) {
      const c = me.companion;
      add({
        kicker: "Your table buddy",
        big: shortName(c.player),
        bigText: true,
        avatar: c.player,
        small:
          `${plural(c.games, "game", "games")} together · you ${c.myWins}, ${shortName(c.player)} ${c.theirWins}` +
          (c.both ? ` · won together ${c.both}` : ""),
      });
    }
    if (me.busiestMonth) {
      add({
        kicker: "Your busiest month",
        big: me.busiestMonth.name,
        bigText: true,
        small: `${plural(me.busiestMonth.count, "game", "games")}.`,
      });
    }
    if (me.newBadges.length) {
      add({
        kicker: "Unlocked this year",
        big: "🏅",
        list: me.newBadges.map((b) => `${b.emoji} ${b.label}`),
        small: "New achievements.",
      });
    }
  }

  add({
    kicker: me ? "Now, the whole family" : `Scorecard Wrapped · ${w.year}`,
    big: f.games,
    label: f.games === 1 ? "game played together" : "games played together",
    small: `${plural(f.players, "player", "players")} · ${plural(f.differentGames, "different game", "different games")}`,
  });
  if (f.topGames.length) {
    add({
      kicker: "Most played",
      big: f.topGames[0].label,
      bigText: true,
      list: f.topGames.slice(1).map((g, i) => `${i + 2}. ${g.label} · ${g.count}`),
      small: `${plural(f.topGames[0].count, "game", "games")}.`,
    });
  }
  if (f.champions) {
    add({
      kicker: f.champions.players.length > 1 ? "Family champions" : "Family champion",
      big: names(f.champions.players),
      bigText: true,
      avatar: f.champions.players.length === 1 ? f.champions.players[0] : null,
      small: `${plural(f.champions.value, "win", "wins")} 👑`,
    });
  }
  if (f.mostGames) {
    add({
      kicker: "Never missed a night",
      big: names(f.mostGames.players),
      bigText: true,
      small: `${plural(f.mostGames.value, "game", "games")} played.`,
    });
  }
  if (f.streak && f.streak.value >= 2) {
    add({ kicker: "Longest win streak", big: names(f.streak.players), bigText: true, small: `${f.streak.value} in a row 🔥` });
  }
  if (f.topPair) {
    const p = f.topPair;
    add({
      kicker: "Table twins",
      big: `${shortName(p.a)} & ${shortName(p.b)}`,
      bigText: true,
      small: `${plural(p.games, "game", "games")} together · ${shortName(p.a)} ${p.aWins}, ${shortName(p.b)} ${p.bWins}`,
    });
  }
  if (f.busiestDay && f.busiestDay.count >= 2) {
    add({
      kicker: "Biggest game night",
      big: f.busiestDay.date.toLocaleDateString(undefined, { month: "long", day: "numeric" }),
      bigText: true,
      small: `${plural(f.busiestDay.count, "game", "games")} in one day.`,
    });
  }
  slides.push({ bg: slides.length % 6, finale: true, kicker: "That's a wrap", big: `See you in ${w.year + 1} 🎲`, bigText: true });
  return slides;
}

function shareText(w) {
  const { me, family: f } = w;
  if (me) {
    return `My ${w.year} Scorecard Wrapped: ${me.games} games, ${me.wins} wins${me.favoriteGame ? `, favorite game ${me.favoriteGame.label}` : ""}. 🎲`;
  }
  return `Our ${w.year} Scorecard Wrapped: ${f.games} games together${f.topGames[0] ? `, most played ${f.topGames[0].label}` : ""}. 🎲`;
}

export default function Wrapped({ preview = false }) {
  const navigate = useNavigate();
  const whoamiId = useWhoamiId();
  const [players, setPlayers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [ready, setReady] = useState({ p: false, s: false });
  const [i, setI] = useState(0);
  const [note, setNote] = useState("");
  const touchX = useRef(null);

  useEffect(() => {
    const u1 = subscribeToPlayers((l) => {
      setPlayers(l);
      setReady((r) => ({ ...r, p: true }));
    });
    const u2 = subscribeToCompletedSessions((l) => {
      setSessions(l);
      setReady((r) => ({ ...r, s: true }));
    });
    return () => {
      u1();
      u2();
    };
  }, []);

  const year = preview ? new Date().getFullYear() : wrappedYear(new Date());
  const wrapped = useMemo(
    () => (year && ready.p && ready.s ? computeWrapped(year, players, sessions, whoamiId) : null),
    [year, ready, players, sessions, whoamiId]
  );
  const slides = useMemo(() => (wrapped && wrapped.hasData ? buildSlides(wrapped) : []), [wrapped]);

  const last = slides.length - 1;
  const go = (d) => setI((n) => Math.max(0, Math.min(last, n + d)));

  useEffect(() => {
    document.body.style.overflow = "hidden";
    function onKey(e) {
      if (e.key === "ArrowRight" || e.key === " ") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "Escape") navigate("/");
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [last]); // eslint-disable-line react-hooks/exhaustive-deps

  // Not time yet (and not the preview route): nothing to see here.
  if (!year) return <Navigate to="/" replace />;

  const shell = (children) => (
    <div className="wr-overlay">
      <button type="button" className="wr-close" onClick={() => navigate("/")} aria-label="Close">✕</button>
      {children}
    </div>
  );

  if (!wrapped) return shell(<p className="wr-center">Loading…</p>);
  if (!wrapped.hasData) {
    return shell(
      <div className="wr-center">
        <p>No finished games in {year} yet — nothing to wrap.</p>
      </div>
    );
  }

  const s = slides[i];

  async function share() {
    const text = shareText(wrapped);
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setNote("Copied — paste it anywhere.");
    } catch {
      /* cancelled share is fine */
    }
  }

  return shell(
    <div
      className={`wr-slide wr-bg-${s.bg}`}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
      }}
    >
      <div className="wr-progress" aria-hidden="true">
        {slides.map((_, k) => (
          <span key={k} className={k <= i ? "on" : ""} />
        ))}
      </div>
      {preview && <div className="wr-preview-tag">PREVIEW</div>}

      {!s.finale && (
        <>
          <button type="button" className="wr-tap wr-tap-back" onClick={() => go(-1)} aria-label="Previous" />
          <button type="button" className="wr-tap wr-tap-next" onClick={() => go(1)} aria-label="Next" />
        </>
      )}

      <div className="wr-content" key={i}>
        <div className="wr-kicker">{s.kicker}</div>
        {s.avatar && <Avatar p={s.avatar} />}
        <div className={`wr-big ${s.bigText ? "text" : ""}`}>{s.big}</div>
        {s.label && <div className="wr-label">{s.label}</div>}
        {s.list && (
          <ul className="wr-list">
            {s.list.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        )}
        {s.small && <div className="wr-small">{s.small}</div>}
        {s.finale && (
          <div className="wr-finale">
            <button type="button" className="wr-btn" onClick={share}>📤 Share my year</button>
            <button type="button" className="wr-btn ghost" onClick={() => setI(0)}>↺ Replay</button>
            <button type="button" className="wr-btn ghost" onClick={() => navigate("/")}>Done</button>
            {note && <div className="wr-small">{note}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
