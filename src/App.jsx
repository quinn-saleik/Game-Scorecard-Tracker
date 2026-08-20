import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Players from "./pages/Players";
import PlayerDetail from "./pages/PlayerDetail";
import Stats from "./pages/Stats";
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

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/players" element={<Players />} />
        <Route path="/players/:playerId" element={<PlayerDetail />} />
        <Route path="/stats" element={<Stats />} />
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
      </Route>
    </Routes>
  );
}

export default App;
