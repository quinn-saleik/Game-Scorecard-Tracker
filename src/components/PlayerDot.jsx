// A small identity marker shown beside a player's name — never a color
// standing in for the name itself, always alongside the text.
export default function PlayerDot({ color }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: 10,
        height: 10,
        borderRadius: "50%",
        marginRight: 6,
        verticalAlign: "middle",
        background: color || "transparent",
        border: color ? "1px solid rgba(0,0,0,0.15)" : "1px dashed #a89f8a",
      }}
    />
  );
}
