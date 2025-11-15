import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Swingers from './pages/Smash/Swingers.jsx';
import Layout from './Layout.jsx';
import SmashHome from './pages/Smash/SmashHome.jsx';
import PlayerStats from './pages/Smash/PlayerStats.jsx';
import TournamentHistory from './pages/Smash/TournamentHistory.jsx';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="smash" element={<SmashHome />}>
            <Route index element={<></>} />
            <Route path="swingers-smash-tournament" element={<Swingers />} />
            <Route path="player-stats" element={<PlayerStats />} />
            <Route path="tournament-history" element={<TournamentHistory />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
