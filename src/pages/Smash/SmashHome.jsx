import { Link, Route, Routes, useLocation } from 'react-router-dom';
import Swingers from './Swingers';
import PlayerStats from './PlayerStats';
import TournamentHistory from './TournamentHistory';
import CharacterRandomizer from './CharacterRandomizer';


const SmashHome = () => {
  const games = [
    {
      name: 'Swingers Smash',
      description: 'A chaotic 2v2 tournament where your partner and opponents change every round.',
      path: '/smash/swingers-smash-tournament',
    },
    {
      name: 'Player Stats',
      description: 'View detailed career statistics for all players across all tournaments.',
      path: '/smash/player-stats',
    },
    {
      name: 'Tournament History',
      description: 'Browse through the results of all previously played tournaments.',
      path: '/smash/tournament-history',
    },
    {
      name: 'Character Randomizer',
      description: 'Get a random character, with the ability to weight your favorites.',
      path: '/smash/character-randomizer',
    },
    // Add more games here in the future
  ];

  const location = useLocation();
  const isSmashHome = location.pathname === '/smash' || location.pathname === '/smash/';

  return (
    <main className="flex-grow py-6 px-[15%] bg-gray-900 text-white w-full">
      {isSmashHome ? (
        <div>
          <h1 className="text-3xl font-bold mb-6 text-white cursor-default">Select a Smash Tool</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {games.map((game) => (
              <Link to={game.path} key={game.name} className="block bg-gray-800 rounded-lg shadow-lg p-6 hover:bg-gray-700 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <h2 className="text-xl font-bold text-blue-300 mb-2">{game.name}</h2>
                <p className="text-gray-400">{game.description}</p>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <Routes>
          <Route path="swingers-smash-tournament" element={<Swingers />} />
          <Route path="player-stats" element={<PlayerStats />} />
          <Route path="tournament-history" element={<TournamentHistory />} />
          <Route path="character-randomizer" element={<CharacterRandomizer />} />
        </Routes>
      )}
    </main>
  );
};

export default SmashHome;