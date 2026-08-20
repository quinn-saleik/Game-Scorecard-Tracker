// Turns a spoken transcript into a number. Prefers literal digits (most
// browsers' speech recognition already normalizes "fifteen" to "15"), and
// falls back to a small word-number parser for phrases that come through
// as words (covers 0-99, "X hundred Y", and "minus"/"negative" prefixes —
// plenty for the scores this app actually deals with).
const ONES = {
  zero: 0, oh: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19,
};
const TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };

export function parseSpokenNumber(text) {
  if (!text) return null;
  const cleaned = text.toLowerCase().trim();

  const digitMatch = cleaned.match(/-?\d+/);
  if (digitMatch) return parseInt(digitMatch[0], 10);

  const negative = /\b(minus|negative)\b/.test(cleaned);
  const words = cleaned
    .replace(/\b(minus|negative|points?|and|a)\b/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return null;

  let current = 0;
  let matchedAny = false;

  for (const word of words) {
    if (word === "hundred") {
      current = (current || 1) * 100;
      matchedAny = true;
    } else if (word in TENS) {
      current += TENS[word];
      matchedAny = true;
    } else if (word in ONES) {
      current += ONES[word];
      matchedAny = true;
    }
    // Unrecognized filler word (e.g. "that's", "uh") — ignore it.
  }

  if (!matchedAny) return null;
  return negative ? -current : current;
}
