import React, { useState, useEffect, useRef, useCallback } from 'react';
import { database } from '../firebase';
import { ref, query, orderByChild, limitToLast, get, endBefore } from 'firebase/database';
import BackButton from '../components/BackButton';

const TournamentHistory = () => {
    const [tournaments, setTournaments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [lastTimestamp, setLastTimestamp] = useState(null);
    const observer = useRef();

    const PAGE_SIZE = 5;

    const fetchTournaments = useCallback(async () => {
        if (loading || !hasMore) return;

        setLoading(true);
        try {
            let tournamentsQuery;
            if (lastTimestamp) {
                tournamentsQuery = query(ref(database, 'tournaments'), orderByChild('createdAt'), endBefore(lastTimestamp), limitToLast(PAGE_SIZE));
            } else {
                tournamentsQuery = query(ref(database, 'tournaments'), orderByChild('createdAt'), limitToLast(PAGE_SIZE));
            }

            const snapshot = await get(tournamentsQuery);

            if (snapshot.exists()) {
                const data = snapshot.val();
                const fetchedTournaments = Object.entries(data).map(([id, tournament]) => ({
                    ...tournament,
                    id: id, // Assign the unique Firebase key to an 'id' property
                })).sort((a, b) => b.createdAt - a.createdAt);

                setTournaments(prev => [...prev, ...fetchedTournaments]);
                
                if (fetchedTournaments.length < PAGE_SIZE) {
                    setHasMore(false);
                } else {
                    setLastTimestamp(fetchedTournaments[fetchedTournaments.length - 1].createdAt);
                }
            } else {
                setHasMore(false);
            }
        } catch (error) {
            console.error("Error fetching tournaments:", error);
        } finally {
            setLoading(false);
        }
    }, [loading, hasMore, lastTimestamp]);

    useEffect(() => {
        fetchTournaments();
    }, []); // Initial fetch

    const lastTournamentElementRef = useCallback(node => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                fetchTournaments();
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, hasMore, fetchTournaments]);

    const formatDate = (timestamp) => {
        return new Date(timestamp).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    };

    return (
        <div className="w-full">
            <BackButton to="/smash" text="Back to Game Modes" />
            <h1 className="text-3xl font-bold mb-6 text-white text-center">Tournament History</h1>
            <div className="space-y-8">
                {tournaments.map((tournament, index) => (
                    <div 
                        ref={index === tournaments.length - 1 ? lastTournamentElementRef : null}
                        key={tournament.id} 
                        className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700"
                    >
                        <div className="flex justify-between items-baseline mb-4">
                            <h2 className="text-2xl font-bold text-blue-300">{tournament.name}</h2>
                            <p className="text-sm text-gray-400">{formatDate(tournament.createdAt)}</p>
                        </div>
                        <ol className="list-decimal list-inside space-y-2">
                            {tournament.results.map((player, idx) => (
                                <li key={player.playerId} className="text-gray-300">
                                    <span className={`font-semibold ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-yellow-600' : ''}`}>
                                        {player.name}
                                    </span>
                                </li>
                            ))}
                        </ol>
                    </div>
                ))}
                {loading && <p className="text-center text-gray-400">Loading more tournaments...</p>}
                {!loading && !hasMore && tournaments.length > 0 && (
                    <p className="text-center text-gray-500">You've reached the end.</p>
                )}
                 {!loading && tournaments.length === 0 && (
                    <p className="text-center text-gray-500">No tournaments have been played yet.</p>
                )}
            </div>
        </div>
    );
};

export default TournamentHistory;