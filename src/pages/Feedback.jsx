import { useEffect, useState } from "react";
import { subscribeToFeedback, deleteFeedback } from "../data/feedback";
import { formatLastPlayed } from "../data/format";

// Not linked from the nav bar anywhere — this is the "backdoor" for reading
// what people typed into the feedback box on Home. Reachable at /feedback
// for anyone who knows to look, same open-by-default security model as the
// rest of the app (no separate admin login exists here).
export default function Feedback() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  useEffect(
    () =>
      subscribeToFeedback((list) => {
        setItems(list);
        setLoading(false);
      }),
    []
  );

  async function handleDismiss(id) {
    setBusyId(id);
    try {
      await deleteFeedback(id);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h1 className="page-title">
        <span className="suit red">💬</span> Feedback
      </h1>

      <div className="card-surface">
        {loading ? (
          <p className="empty-state">Loading…</p>
        ) : items.length === 0 ? (
          <p className="empty-state">Nothing submitted yet.</p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
                padding: "12px 0",
                borderBottom: "1px solid var(--divider)",
              }}
            >
              <div>
                <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{item.text}</p>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted)" }}>
                  {formatLastPlayed(item.createdAt?.toDate?.() || null)}
                  {item.path ? ` · ${item.path}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDismiss(item.id)}
                disabled={busyId === item.id}
                title="Dismiss"
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "var(--muted)", flexShrink: 0 }}
              >
                🗑
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
