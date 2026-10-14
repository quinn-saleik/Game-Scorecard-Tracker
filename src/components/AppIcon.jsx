// The app icon (spade + heart on midnight blue with a yellow ring), inline
// so it needs no network request and can be any size. Same artwork as the
// Home Screen icon in public/. `size` is in px.
const HEART = "M50 88 C20 62 6 46 6 30 C6 16 17 8 29 8 C38 8 46 13 50 21 C54 13 62 8 71 8 C83 8 94 16 94 30 C94 46 80 62 50 88 Z";
const SPADE = "M50 8 C80 34 94 50 94 66 C94 80 83 88 71 88 C62 88 54 83 50 75 C51 85 54 94 64 104 L36 104 C46 94 49 85 50 75 C46 83 38 88 29 88 C17 88 6 80 6 66 C6 50 20 34 50 8 Z";

function Glyph({ d, x, y, s, fill }) {
  return (
    <>
      <g transform={`translate(${x + 9} ${y + 9}) scale(${s})`}>
        <path d={d} fill="#050b1f" stroke="#050b1f" strokeWidth="9" strokeLinejoin="round" />
      </g>
      <g transform={`translate(${x} ${y}) scale(${s})`}>
        <path d={d} fill={fill} stroke="#050b1f" strokeWidth="6" strokeLinejoin="round" />
      </g>
    </>
  );
}

export default function AppIcon({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden="true" style={{ display: "block", flex: "none" }}>
      <defs>
        <linearGradient id="appicon-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1c2f66" />
          <stop offset="1" stopColor="#0a1330" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill="url(#appicon-bg)" />
      <rect x="14" y="14" width="484" height="484" rx="100" fill="none" stroke="#ffd23f" strokeWidth="22" />
      <Glyph d={SPADE} x={72} y={162} s={2.45} fill="#fffdf4" />
      <Glyph d={HEART} x={160} y={92} s={2.7} fill="#ff4d6d" />
    </svg>
  );
}
