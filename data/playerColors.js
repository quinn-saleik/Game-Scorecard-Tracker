// Curated player-identity palette — not a free color-wheel picker.
// The first 8 are the dataviz skill's validated reference categorical
// theme; slots 9-20 extend it (more hues + light/dark variants of a few)
// to cover up to 20 players without repeats.
//
// Validated with the skill's validator against this app's card surface
// (#fffdf7): all 20 pass the lightness band, chroma floor, adjacent-pair
// CVD separation, and adjacent-pair normal-vision floor — in THIS order
// (the ordering is part of what makes it pass; don't reshuffle it without
// re-running the validator). What it does NOT claim: all-pairs safety —
// with 20 slots, some non-adjacent pairs (e.g. two greens far apart in
// the list) can still be close for colorblind viewers if you were staring
// at 20 swatches in a chart legend. That's not how color is used here,
// though — the dot always sits next to the player's name (never color
// standing in for identity alone), which is the documented mitigation for
// exactly this situation.
//
// Command used: node scripts/validate_palette.js "<hexes>" --mode light
// --surface "#fffdf7" (from the dataviz skill's base directory).
export const PLAYER_COLORS = [
  { name: "Blue", hex: "#2a78d6" },
  { name: "Orange", hex: "#eb6834" },
  { name: "Aqua", hex: "#1baf7a" },
  { name: "Gold", hex: "#eda100" },
  { name: "Magenta", hex: "#e87ba4" },
  { name: "Green", hex: "#008300" },
  { name: "Violet", hex: "#4a3aa7" },
  { name: "Red", hex: "#e34948" },
  { name: "Navy", hex: "#184f95" },
  { name: "Sky", hex: "#6da7ec" },
  { name: "Teal", hex: "#0e7d5c" },
  { name: "Lime", hex: "#7cb305" },
  { name: "Indigo", hex: "#4338ca" },
  { name: "Terracotta", hex: "#cf7a3a" },
  { name: "Plum", hex: "#8e4585" },
  { name: "Olive", hex: "#9c7220" },
  { name: "Maroon", hex: "#a83246" },
  { name: "Cyan", hex: "#17a2b8" },
  { name: "Orchid", hex: "#9c4fc4" },
  { name: "Mint", hex: "#4fbf8f" },
];
