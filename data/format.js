export function formatLastPlayed(date) {
  if (!date) return "—";
  const daysAgo = daysBetween(date, new Date());
  if (daysAgo <= 0) return "Today";
  if (daysAgo === 1) return "Yesterday";
  if (daysAgo < 14) return `${daysAgo}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// "en-CA" formats numeric dates as YYYY-MM-DD directly — diffing two of
// those as parsed dates gives an exact whole-calendar-day count, in
// whichever timezone the VIEWING DEVICE is set to (no `timeZone` option
// here means "local" — each phone shows its own today/yesterday, same as
// before this fix).
//
// This replaces a naive `(now - date) / 86400000` bucket, which measures
// raw elapsed time rather than calendar days: a game played at 11:50pm
// and looked at again at 12:10am — 20 minutes later, but already the next
// calendar day — used to still read "Today" (and, depending on exactly
// when you looked, could just as easily undercount into the wrong day the
// other way). Comparing calendar-day keys instead of elapsed milliseconds
// fixes that regardless of which timezone the device is in.
const DAY_KEY_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function localDayKey(date) {
  return DAY_KEY_FORMATTER.format(date);
}

function daysBetween(earlier, later) {
  const earlierKey = localDayKey(earlier);
  const laterKey = localDayKey(later);
  return Math.round((Date.parse(laterKey) - Date.parse(earlierKey)) / 86400000);
}
