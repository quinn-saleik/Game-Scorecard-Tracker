import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CHANGELOG, EARLIER, markChangelogSeen } from "../data/changelog";

// "2026-10-15" -> "October 15, 2026"; "2026-09" -> "September 2026".
// Parsed as plain calendar parts (noon for full dates) so no timezone can
// shift the day.
function prettyDate(iso) {
  if (!iso) return "";
  if (iso.length === 7) {
    return new Date(`${iso}-15T12:00:00`).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }
  return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function Entry({ entry, open, onToggle, latest }) {
  return (
    <div className="card-surface whatsnew-entry">
      <button
        type="button"
        className="whatsnew-head"
        aria-expanded={open}
        aria-controls={`wn-${entry.id}`}
        onClick={onToggle}
      >
        <span className="whatsnew-title">
          <strong>{entry.title}</strong>
          <span className="whatsnew-sum">{entry.summary}</span>
        </span>
        <span className="whatsnew-meta">
          {latest && <span className="whatsnew-latest">LATEST</span>}
          {entry.date && <span>{prettyDate(entry.date)}</span>}
        </span>
        <span className={`whatsnew-chev ${open ? "open" : ""}`} aria-hidden="true">▾</span>
      </button>
      {open && (
        <div id={`wn-${entry.id}`} className="whatsnew-body">
          <ul>
            {entry.items.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          {entry.examples && (
            <div className="whatsnew-examples">
              <h3>{entry.examplesTitle || "Examples"}</h3>
              {entry.examples.map((ex) => (
                <p key={ex.label}>
                  <strong>{ex.label}:</strong> {ex.text}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function WhatsNew() {
  useEffect(() => markChangelogSeen(), []);
  const all = [...CHANGELOG, ...EARLIER];
  // The newest update starts open; everything else is one tap away.
  const [openIds, setOpenIds] = useState(() => new Set([CHANGELOG[0].id]));
  const allOpen = openIds.size === all.length;

  function toggle(id) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div>
      <h1 className="page-title">
        <span className="suit red">✨</span> What's new
      </h1>
      <div className="btn-row" style={{ marginBottom: 12 }}>
        <button
          type="button"
          className="btn ghost small"
          onClick={() => setOpenIds(allOpen ? new Set() : new Set(all.map((e) => e.id)))}
        >
          {allOpen ? "Collapse all" : "Expand all"}
        </button>
      </div>

      {CHANGELOG.map((entry, i) => (
        <Entry key={entry.id} entry={entry} latest={i === 0} open={openIds.has(entry.id)} onToggle={() => toggle(entry.id)} />
      ))}

      <h2 className="whatsnew-section">Earlier highlights</h2>
      {EARLIER.map((entry) => (
        <Entry key={entry.id} entry={entry} open={openIds.has(entry.id)} onToggle={() => toggle(entry.id)} />
      ))}

      <div className="btn-row">
        <Link className="btn ghost" to="/">← Back to games</Link>
      </div>
    </div>
  );
}
