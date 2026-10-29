import { useState } from "react";
import PlayerDot from "./PlayerDot";
import { computeRivalry } from "../data/rivalry";
import { shortName } from "../data/playerNames";
import { formatLastPlayed } from "../data/format";

// Pick any two players and see their record against each other. Deliberately
// NOT limited by the Favorites/Everyone switch — comparing two specific
// people shouldn't depend on whose circle you're in.
export default function RivalryCard({ players, sessions, defaultA }) {
  const roster = players.filter((p) => p.active !== false);
  const [aId, setAId] = useState(defaultA && roster.some((p) => p.id === defaultA) ? defaultA : "");
  const [bId, setBId] = useState("");
  const a = roster.find((p) => p.id === aId) || null;
  const b = roster.find((p) => p.id === bId) || null;
  const r = a && b ? computeRivalry(a.id, b.id, sessions) : null;

  const nameA = a ? shortName(a) : "";
  const nameB = b ? shortName(b) : "";
  const resultText = (res) =>
    res === "a" ? `${nameA} won` : res === "b" ? `${nameB} won` : res === "both" ? "Won together" : "Someone else won";

  return (
    <div className="card-surface">
      <h2>⚔️ Rivalry</h2>
      <p style={{ color: "var(--muted)", fontSize: 13, marginTop: -6 }}>
        Pick any two players to compare the games they've both played.
      </p>
      <div className="rivalry-pickers">
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="rivalry-a">Player 1</label>
          <select id="rivalry-a" value={aId} onChange={(e) => setAId(e.target.value)}>
            <option value="">Choose…</option>
            {roster.filter((p) => p.id !== bId).map((p) => (
              <option key={p.id} value={p.id}>{shortName(p)}</option>
            ))}
          </select>
        </div>
        <span className="rivalry-vs" aria-hidden="true">vs</span>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="rivalry-b">Player 2</label>
          <select id="rivalry-b" value={bId} onChange={(e) => setBId(e.target.value)}>
            <option value="">Choose…</option>
            {roster.filter((p) => p.id !== aId).map((p) => (
              <option key={p.id} value={p.id}>{shortName(p)}</option>
            ))}
          </select>
        </div>
      </div>

      {r && r.games === 0 && (
        <p className="empty-state" style={{ marginBottom: 0 }}>
          {nameA} and {nameB} haven't finished a game together yet.
        </p>
      )}

      {r && r.games > 0 && (
        <>
          <div className="rivalry-score">
            <div className={`rivalry-side ${r.lead === "a" ? "lead" : ""}`}>
              <PlayerDot color={a.color} avatar={a.avatar} photo={a.photo} />
              <span className="rivalry-name">{nameA}</span>
              <span className="rivalry-num">{r.a}</span>
              <span className="rivalry-cap">wins</span>
            </div>
            <div className="rivalry-mid">
              <span className="rivalry-num small">{r.both}</span>
              <span className="rivalry-cap">won together</span>
            </div>
            <div className={`rivalry-side ${r.lead === "b" ? "lead" : ""}`}>
              <PlayerDot color={b.color} avatar={b.avatar} photo={b.photo} />
              <span className="rivalry-name">{nameB}</span>
              <span className="rivalry-num">{r.b}</span>
              <span className="rivalry-cap">wins</span>
            </div>
          </div>
          <p className="rivalry-summary">
            {r.lead === "tie" ? "All square" : `${r.lead === "a" ? nameA : nameB} leads`} · {r.games} game
            {r.games === 1 ? "" : "s"} together
            {r.firstDate ? ` since ${formatLastPlayed(r.firstDate)}` : ""}
            {r.neither > 0 ? ` · someone else won ${r.neither}` : ""}
          </p>

          <table className="score-table tight">
            <thead>
              <tr>
                <th>Game</th>
                <th>Played</th>
                <th>{nameA}</th>
                <th>{nameB}</th>
                <th>Both</th>
              </tr>
            </thead>
            <tbody>
              {r.byGame.map((g) => (
                <tr key={g.label}>
                  <td>{g.label}</td>
                  <td>{g.games}</td>
                  <td className={g.a > g.b ? "leader" : ""}>{g.a}</td>
                  <td className={g.b > g.a ? "leader" : ""}>{g.b}</td>
                  <td>{g.both}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="rivalry-recent-title">Recent games together</h3>
          <ul className="rivalry-recent">
            {r.recent.map((g) => (
              <li key={g.sessionId}>
                <span>{g.label}</span>
                <span className="rivalry-recent-res">{resultText(g.result)}</span>
                <span className="rivalry-recent-date">{formatLastPlayed(g.date)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
