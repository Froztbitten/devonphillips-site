import React, { useState, useEffect } from 'react';
import { database } from '../../firebase.js';
import { ref, get } from 'firebase/database';
import BackButton from '../../components/BackButton.jsx';
import { calculatePlayerRating } from '../../utils/PlayerRatings.js';

const PlayerStats = () => {
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const getOrdinal = (n) => {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    const Medal = ({ rank, tournamentName }) => {
        let medalColor = 'bg-gray-500';
        let textColor = 'text-white';
        if (rank === 1) {
            medalColor = 'bg-yellow-400';
            textColor = 'text-yellow-800';
        } else if (rank === 2) {
            medalColor = 'bg-gray-300';
            textColor = 'text-gray-700';
        } else if (rank === 3) {
            medalColor = 'bg-yellow-600';
            textColor = 'text-yellow-100';
        }

        return (
            <div className="flex items-center gap-2 mb-1">
                <span className={`flex-shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-xs ${medalColor} ${textColor}`}>
                    {getOrdinal(rank)}
                </span>
                <span className="text-gray-300 truncate" title={tournamentName}>{tournamentName}</span>
            </div>
        );
    };

    useEffect(() => {
        const fetchAndCalculateStats = async () => {
            try {
                setLoading(true);
                const usersRef = ref(database, 'users');
                const usersSnapshot = await get(usersRef);
                
                let statsArray = [];
                
                if (usersSnapshot.exists()) {
                    const usersData = usersSnapshot.val();
                    const filteredUsers = Object.entries(usersData).filter(([, p]) => p.tournamentsPlayed > 0);

                    statsArray = await Promise.all(
                        filteredUsers.map(async ([id, p]) => {
                            const ratingData = await calculatePlayerRating(id);
                            return {
                                ...p,
                                rating: ratingData.finalRating.toFixed(2),
                                ratingTooltip: `(Base Rating) ${ratingData.baseRating.toFixed(2)} * (Win/Loss Multiplier) ${ratingData.winLossMultiplier.toFixed(2)} * (Participation Multiplier) ${ratingData.participationMultiplier.toFixed(2)}`,
                                placements: p.placements || [],
                                matchWins: p.matchWins || 0,
                                matchesPlayed: p.matchesPlayed || 0,
                                gamesWon: p.gamesWon || 0,
                                totalGamesPlayed: p.totalGamesPlayed || 0,
                                matchWinrate: p.matchesPlayed > 0 ? ((p.matchWins / p.matchesPlayed) * 100).toFixed(0) : 0,
                                gameWinrate: p.totalGamesPlayed > 0 ? ((p.gamesWon / p.totalGamesPlayed) * 100).toFixed(0) : 0,
                            };
                        })
                    );
                }

                statsArray.sort((a, b) => {
                    // Sort by rating in descending order.
                    return b.rating - a.rating;
                });

                setStats(statsArray);
            } catch (err) {
                console.error("Error fetching player stats:", err);
                setError('Failed to load player statistics.');
            } finally {
                setLoading(false);
            }
        };

        fetchAndCalculateStats();
    }, []);

    if (loading) {
        return <div className="text-center text-white">Loading Player Stats...</div>;
    }

    if (error) {
        return <div className="text-center text-red-400">{error}</div>;
    }

    return (
        <div className="w-full">
            <BackButton to="/smash" text="Back to Smash Tools" />
            <h1 className="text-3xl font-bold mb-6 text-white text-center">Player Leaderboard</h1>
            <div className="overflow-x-auto shadow-md rounded-lg bg-gray-800 border border-gray-700">
                <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-700">
                        <tr className="divide-x divide-gray-600">
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Player</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">Rating</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">Tournaments</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Placements</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">Match Wins</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">Match Win %</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">Game Wins</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">Game Win %</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700 text-gray-300">
                        {stats.map(player => (
                            <tr key={player.name} className="divide-x divide-gray-700 hover:bg-gray-700/50">
                                <td className="px-4 py-4 whitespace-nowrap font-bold">{player.name}</td>
                                <td className="px-4 py-4 text-center font-mono font-bold" title={player.ratingTooltip}>{player.rating}</td>
                                <td className="px-4 py-4 text-center">{player.tournamentsPlayed}</td>
                                <td className="px-4 py-4 text-sm">
                                    {player.placements.slice().reverse().map((p, i) => (
                                        <Medal key={i} rank={p.rank} tournamentName={p.name} />
                                    ))}
                                </td>
                                <td className="px-4 py-4 text-center">{player.matchWins} / {player.matchesPlayed}</td>
                                <td className="px-4 py-4 text-center">{player.matchWinrate}%</td>
                                <td className="px-4 py-4 text-center">{player.gamesWon} / {player.totalGamesPlayed}</td>
                                <td className="px-4 py-4 text-center">{player.gameWinrate}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PlayerStats;