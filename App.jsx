import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Players from "./pages/Players";
import Stats from "./pages/Stats";
import Flip7Setup from "./pages/games/flip7/Flip7Setup";
import Flip7Play from "./pages/games/flip7/Flip7Play";

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/players" element={<Players />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/flip7/setup" element={<Flip7Setup />} />
        <Route path="/flip7/play/:sessionId" element={<Flip7Play />} />
      </Route>
    </Routes>
  );
}

export default App;
