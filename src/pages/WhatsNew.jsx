import { useEffect } from "react";
import { Link } from "react-router-dom";
import { CHANGELOG, markChangelogSeen } from "../data/changelog";

function prettyDate(iso) {
  // Parsed as a plain calendar date (noon avoids any timezone day-shift).
  return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function WhatsNew() {
  useEffect(() => markChangelogSeen(), []);

  return (
    <div>
      <h1 className="page-title">
        <span className="suit red">✨</span> What's new
      </h1>
      {CHANGELOG.map((entry, i) => (
        <div className="card-surface" key={entry.id}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <h2 style={{ margin: 0 }}>{entry.title}</h2>
            <span style={{ color: "var(--muted)", fontSize: 13 }}>
              {i === 0 && <strong style={{ color: "var(--red-suit)", marginRight: 8 }}>LATEST</strong>}
              {prettyDate(entry.date)}
            </span>
          </div>
          <ul style={{ margin: "10px 0 0", paddingLeft: 20, lineHeight: 1.5 }}>
            {entry.items.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      ))}
      <div className="btn-row">
        <Link className="btn ghost" style={{ color: "var(--cream)" }} to="/">← Back to games</Link>
      </div>
    </div>
  );
}
