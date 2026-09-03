import { lazy } from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";

// Code-split everything except Home: a given visit only ever plays one game,
// so there's no reason to ship every game's Setup/Play bundle up front.
// Layout's <Suspense> around <Outlet/> covers the load gap.
const Players = lazy(() => import("./pages/Players"));
const PlayerDetail = lazy(() => import("./pages/PlayerDetail"));
const Stats = lazy(() => import("./pages/Stats"));
const HallOfFame = lazy(() => import("./pages/HallOfFame"));
const Recap = lazy(() => import("./pages/Recap"));
const Flip7Setup = lazy(() => import("./pages/games/flip7/Flip7Setup"));
const Flip7Play = lazy(() => import("./pages/games/flip7/Flip7Play"));
const OhHeckSetup = lazy(() => import("./pages/games/oh-heck/OhHeckSetup"));
const OhHeckPlay = lazy(() => import("./pages/games/oh-heck/OhHeckPlay"));
const EuchreVariationSelect = lazy(() => import("./pages/games/euchre/EuchreVariationSelect"));
const TwoPlayerSetup = lazy(() => import("./pages/games/euchre/TwoPlayerSetup"));
const TwoPlayerPlay = lazy(() => import("./pages/games/euchre/TwoPlayerPlay"));
const ThreePlayerSetup = lazy(() => import("./pages/games/euchre/ThreePlayerSetup"));
const ThreePlayerPlay = lazy(() => import("./pages/games/euchre/ThreePlayerPlay"));
const TraditionalSetup = lazy(() => import("./pages/games/euchre/TraditionalSetup"));
const TraditionalPlay = lazy(() => import("./pages/games/euchre/TraditionalPlay"));
const Euchre15Setup = lazy(() => import("./pages/games/euchre/Euchre15Setup"));
const Euchre15Play = lazy(() => import("./pages/games/euchre/Euchre15Play"));
const PartnerSetup = lazy(() => import("./pages/games/euchre/PartnerSetup"));
const PartnerPlay = lazy(() => import("./pages/games/euchre/PartnerPlay"));
const OtherSetup = lazy(() => import("./pages/games/other/OtherSetup"));
const OtherPlay = lazy(() => import("./pages/games/other/OtherPlay"));
const CatchphraseSetup = lazy(() => import("./pages/games/catchphrase/CatchphraseSetup"));
const CatchphrasePlay = lazy(() => import("./pages/games/catchphrase/CatchphrasePlay"));
const ThirtyOneSetup = lazy(() => import("./pages/games/thirty-one/ThirtyOneSetup"));
const ThirtyOnePlay = lazy(() => import("./pages/games/thirty-one/ThirtyOnePlay"));
const RoyalRumSetup = lazy(() => import("./pages/games/royal-rum/RoyalRumSetup"));
const RoyalRumPlay = lazy(() => import("./pages/games/royal-rum/RoyalRumPlay"));
const HeartsSetup = lazy(() => import("./pages/games/hearts/HeartsSetup"));
const HeartsPlay = lazy(() => import("./pages/games/hearts/HeartsPlay"));
const SpadesSetup = lazy(() => import("./pages/games/spades/SpadesSetup"));
const SpadesPlay = lazy(() => import("./pages/games/spades/SpadesPlay"));
const GolfSetup = lazy(() => import("./pages/games/golf/GolfSetup"));
const GolfPlay = lazy(() => import("./pages/games/golf/GolfPlay"));

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/players" element={<Players />} />
        <Route path="/players/:playerId" element={<PlayerDetail />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/hall-of-fame" element={<HallOfFame />} />
        <Route path="/recap/:sessionId" element={<Recap />} />
        <Route path="/flip7/setup" element={<Flip7Setup />} />
        <Route path="/flip7/play/:sessionId" element={<Flip7Play />} />
        <Route path="/oh-heck/setup" element={<OhHeckSetup />} />
        <Route path="/oh-heck/play/:sessionId" element={<OhHeckPlay />} />
        <Route path="/euchre" element={<EuchreVariationSelect />} />
        <Route path="/euchre/2p/setup" element={<TwoPlayerSetup />} />
        <Route path="/euchre/2p/play/:sessionId" element={<TwoPlayerPlay />} />
        <Route path="/euchre/3p/setup" element={<ThreePlayerSetup />} />
        <Route path="/euchre/3p/play/:sessionId" element={<ThreePlayerPlay />} />
        <Route path="/euchre/traditional/setup" element={<TraditionalSetup />} />
        <Route path="/euchre/traditional/play/:sessionId" element={<TraditionalPlay />} />
        <Route path="/euchre/15card/setup" element={<Euchre15Setup />} />
        <Route path="/euchre/15card/play/:sessionId" element={<Euchre15Play />} />
        <Route path="/euchre/partner/setup" element={<PartnerSetup />} />
        <Route path="/euchre/partner/play/:sessionId" element={<PartnerPlay />} />
        <Route path="/other/setup" element={<OtherSetup />} />
        <Route path="/other/setup/:gameId" element={<OtherSetup />} />
        <Route path="/other/play/:sessionId" element={<OtherPlay />} />
        <Route path="/catchphrase/setup" element={<CatchphraseSetup />} />
        <Route path="/catchphrase/play/:sessionId" element={<CatchphrasePlay />} />
        <Route path="/thirty-one/setup" element={<ThirtyOneSetup />} />
        <Route path="/thirty-one/play/:sessionId" element={<ThirtyOnePlay />} />
        <Route path="/royal-rum/setup" element={<RoyalRumSetup />} />
        <Route path="/royal-rum/play/:sessionId" element={<RoyalRumPlay />} />
        <Route path="/hearts/setup" element={<HeartsSetup />} />
        <Route path="/hearts/play/:sessionId" element={<HeartsPlay />} />
        <Route path="/spades/setup" element={<SpadesSetup />} />
        <Route path="/spades/play/:sessionId" element={<SpadesPlay />} />
        <Route path="/golf/setup" element={<GolfSetup />} />
        <Route path="/golf/play/:sessionId" element={<GolfPlay />} />
      </Route>
    </Routes>
  );
}

export default App;
