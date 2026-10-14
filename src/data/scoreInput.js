// Helpers for a score field that needs to accept NEGATIVE numbers on a
// phone. <input type="number"> keypads often have no minus key, and a
// number input can't hold a lone "-" while you type, so the sign lives in
// a separate flag next to the digits (driven by a ± button) instead of in
// the text itself. Typing a literal "-5" still works wherever the keypad
// allows it — the helpers treat either route the same way.

function startsNegative(raw) {
  return String(raw ?? "").trim().startsWith("-");
}

export function isNegative(raw, neg) {
  return Boolean(neg) || startsNegative(raw);
}

// The number the field represents (empty/garbage counts as 0).
export function signedValue(raw, neg) {
  const n = Number(raw);
  if (raw === "" || raw == null || Number.isNaN(n)) return 0;
  return neg ? -Math.abs(n) : n;
}

// What tapping ± does: negative -> positive, positive/empty -> negative.
export function toggleSign(raw, neg) {
  if (isNegative(raw, neg)) {
    return { raw: String(raw ?? "").trim().replace(/^-/, ""), neg: false };
  }
  return { raw: raw ?? "", neg: true };
}
