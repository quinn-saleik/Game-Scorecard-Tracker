// Small tap-to-fill buttons shown under a numeric score input, so common
// values (euchre's 1/2/4 points, a "0" bust) don't have to be typed by hand
// on a phone every single round. Still just fills the field — nothing stops
// typing a different number afterward.
export default function ScorePresets({ values, onPick }) {
  return (
    <div className="chip-row" style={{ marginTop: 4 }}>
      {values.map((v) => (
        <button
          key={v}
          type="button"
          className="btn small"
          onClick={() => onPick(v)}
        >
          {v > 0 ? `+${v}` : v}
        </button>
      ))}
    </div>
  );
}
