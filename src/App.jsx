import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Players from "./pages/Players";
import PlayerDetail from "./pages/PlayerDetail";
import Stats from "./pages/Stats";
import HallOfFame from "./pages/HallOfFame";
import Recap from "./pages/Recap";
import Flip7Setup from "./pages/games/flip7/Flip7Setup";
import Flip7Play from "./pages/games/flip7/Flip7Play";
import OhHeckSetup from "./pages/games/oh-heck/OhHeckSetup";
import OhHeckPlay from "./pages/games/oh-heck/OhHeckPlay";
import EuchreVariationSelect from "./pages/games/euchre/EuchreVariationSelect";
import TwoPlayerSetup from "./pages/games/euchre/TwoPlayerSetup";
import TwoPlayerPlay from "./pages/games/euchre/TwoPlayerPlay";
import ThreePlayerSetup from "./pages/games/euchre/ThreePlayerSetup";
import ThreePlayerPlay from "./pages/games/euchre/ThreePlayerPlay";
import TraditionalSetup from "./pages/games/euchre/TraditionalSetup";
import TraditionalPlay from "./pages/games/euchre/TraditionalPlay";
import Euchre15Setup from "./pages/games/euchre/Euchre15Setup";
import Euchre15Play from "./pages/games/euchre/Euchre15Play";
import PartnerSetup from "./pages/games/euchre/PartnerSetup";
import PartnerPlay from "./pages/games/euchre/PartnerPlay";
import OtherSetup from "./pages/games/other/OtherSetup";
import OtherPlay from "./pages/games/other/OtherPlay";
import CatchphraseSetup from "./pages/games/catchphrase/CatchphraseSetup";
import CatchphrasePlay from "./pages/games/catchphrase/CatchphrasePlay";
import ThirtyOneSetup from "./pages/games/thirty-one/ThirtyOneSetup";
import ThirtyOnePlay from "./pages/games/thirty-one/ThirtyOnePlay";
import RoyalRumSetup from "./pages/games/royal-rum/RoyalRumSetup";
import RoyalRumPlay from "./pages/games/royal-rum/RoyalRumPlay";

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
        <Route path="/other/play/:sessionId" element={<OtherPlay />} />
        <Route path="/catchphrase/setup" element={<CatchphraseSetup />} />
        <Route path="/catchphrase/play/:sessionId" element={<CatchphrasePlay />} />
        <Route path="/thirty-one/setup" element={<ThirtyOneSetup />} />
        <Route path="/thirty-one/play/:sessionId" element={<ThirtyOnePlay />} />
        <Route path="/royal-rum/setup" element={<RoyalRumSetup />} />
        <Route path="/royal-rum/play/:sessionId" element={<RoyalRumPlay />} />
      </Route>
    </Routes>
  );
}

export default App;
