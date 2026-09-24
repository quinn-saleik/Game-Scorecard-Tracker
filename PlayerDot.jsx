// A small identity marker shown beside a player's name — never a color or
// emoji/photo standing in for the name itself, always alongside the text.
export default function PlayerDot({ color, avatar, photo }) {
  if (photo) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", marginRight: 6, verticalAlign: "middle" }}>
        <img
          src={photo}
          alt=""
          aria-hidden="true"
          style={{
            display: "inline-block",
            width: 18,
            height: 18,
            borderRadius: "50%",
            objectFit: "cover",
            border: color ? `2px solid ${color}` : "1px solid rgba(0,0,0,0.15)",
          }}
        />
      </span>
    );
  }

  if (avatar && color) {
    // Emoji + color together get their own badge — a filled circle in the
    // player's color with the emoji centered on top, the same 18px size
    // and treatment as a photo (just a color fill standing in for the
    // image). This is what makes color+avatar feel like a deliberate
    // combo instead of two separate, disconnected markers.
    return (
      <span style={{ display: "inline-flex", alignItems: "center", marginRight: 6, verticalAlign: "middle" }}>
        <span
          aria-hidden="true"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: color,
            border: "1px solid rgba(0,0,0,0.15)",
            fontSize: 11,
            lineHeight: 1,
          }}
        >
          {avatar}
        </span>
      </span>
    );
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, marginRight: 6, verticalAlign: "middle" }}>
      <span
        aria-hidden="true"
        style={{
          display: "inline-block",
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: color || "transparent",
          border: color ? "1px solid rgba(0,0,0,0.15)" : "1px dashed var(--border-soft)",
        }}
      />
      {avatar && (
        <span aria-hidden="true" style={{ fontSize: 14, lineHeight: 1 }}>
          {avatar}
        </span>
      )}
    </span>
  );
}
