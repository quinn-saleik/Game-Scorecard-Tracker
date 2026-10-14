import { useEffect, useState } from "react";
import { submitFeedback } from "../data/feedback";

// Popup text box for "tell me what you think". Writes through the same
// submitFeedback() as before, so notes land in scorecard_notes untouched.
// Backdrop tap closes it unless a send is in flight; typed text survives a
// failed send so nothing is lost.
export default function FeedbackPopup({ onClose }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape" && !sending) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sending, onClose]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await submitFeedback(text);
      setText("");
      setSent(true);
    } catch (err) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Send feedback"
      onClick={() => !sending && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        background: "rgba(16, 22, 31, 0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        className="card-surface"
        style={{ maxWidth: 420, width: "100%", margin: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {sent ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 44, lineHeight: 1 }}>🙏</div>
            <h2 style={{ marginTop: 12 }}>Thanks — got it!</h2>
            <div className="btn-row" style={{ justifyContent: "center" }}>
              <button type="button" className="btn ghost" onClick={() => setSent(false)}>
                Send another
              </button>
              <button type="button" className="btn primary" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 style={{ marginTop: 0 }}>Tell me what you think!</h2>
            <div className="field">
              <label htmlFor="feedback-text" style={{ fontSize: 13, color: "var(--muted)" }}>
                Ideas, bugs, anything — it goes straight to me.
              </label>
              <textarea
                id="feedback-text"
                className="input"
                rows={5}
                autoFocus
                style={{ resize: "vertical", fontFamily: "inherit", fontSize: 15 }}
                placeholder="What's on your mind…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={sending}
              />
            </div>
            <div className="btn-row">
              <button type="button" className="btn ghost" onClick={onClose} disabled={sending}>
                Cancel
              </button>
              <button type="submit" className="btn primary" disabled={sending || !text.trim()}>
                {sending ? "Sending…" : "Send"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
