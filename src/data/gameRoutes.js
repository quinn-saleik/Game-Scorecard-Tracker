// Shared gameType -> Play screen route lookup, used by both OngoingGames
// (resuming an in-progress game) and Recap's rematch button (jumping into
// a freshly-created one) so the mapping only lives in one place.
export const PLAY_ROUTE = {
  flip7: (id) => `/flip7/play/${id}`,
  "oh-heck": (id) => `/oh-heck/play/${id}`,
  "euchre-2p": (id) => `/euchre/2p/play/${id}`,
  "euchre-3p": (id) => `/euchre/3p/play/${id}`,
  "euchre-traditional": (id) => `/euchre/traditional/play/${id}`,
  "euchre-15card": (id) => `/euchre/15card/play/${id}`,
  "euchre-partner": (id) => `/euchre/partner/play/${id}`,
  catchphrase: (id) => `/catchphrase/play/${id}`,
  "thirty-one": (id) => `/thirty-one/play/${id}`,
  "royal-rum": (id) => `/royal-rum/play/${id}`,
  other: (id) => `/other/play/${id}`,
  hearts: (id) => `/hearts/play/${id}`,
  golf: (id) => `/golf/play/${id}`,
  spades: (id) => `/spades/play/${id}`,
  "secret-hitler": (id) => `/secret-hitler/play/${id}`,
  "dutch-blitz": (id) => `/dutch-blitz/play/${id}`,
  nertz: (id) => `/nertz/play/${id}`,
  codenames: (id) => `/codenames/play/${id}`,
  "egyptian-ratscrew": (id) => `/egyptian-ratscrew/play/${id}`,
  "skip-bo": (id) => `/skip-bo/play/${id}`,
  "phase-10": (id) => `/phase-10/play/${id}`,
};
