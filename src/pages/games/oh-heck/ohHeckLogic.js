// Pure helper functions for Oh Heck! round/dealer/bid math — kept separate
// from the UI so the rules are easy to re-check without wading through JSX.

// Single up-down arc: start down to 1, then back up to start.
// e.g. buildRoundSequence(8) -> [8,7,6,5,4,3,2,1,2,3,4,5,6,7,8] (15 rounds)
export function buildRoundSequence(startingCards) {
  const down = [];
  for (let c = startingCards; c >= 1; c--) down.push(c);
  const up = [];
  for (let c = 2; c <= startingCards; c++) up.push(c);
  return [...down, ...up];
}

// Dealer rotates one seat per round, starting with players[0] on round 0.
export function getDealerIndex(roundIndex, numPlayers) {
  return roundIndex % numPlayers;
}

// Standard order: player to the dealer's left bids first, dealer bids last.
export function getBidOrder(players, dealerIndex) {
  const n = players.length;
  const order = [];
  for (let i = 1; i <= n; i++) {
    order.push(players[(dealerIndex + i) % n]);
  }
  return order;
}

export function getBidLabel(totalBids, cardsThisRound) {
  if (totalBids > cardsThisRound) return "OVER";
  if (totalBids < cardsThisRound) return "UNDER";
  return "EVEN";
}

// In "traditional" mode the last bidder (the dealer) can't bid the one
// number that would make the total exactly equal the cards dealt. Returns
// that forbidden number, or null if none applies (already over, or bid
// would need to be negative).
export function getForbiddenBid(cardsThisRound, bidsSoFarTotal) {
  const forbidden = cardsThisRound - bidsSoFarTotal;
  return forbidden >= 0 && forbidden <= cardsThisRound ? forbidden : null;
}
