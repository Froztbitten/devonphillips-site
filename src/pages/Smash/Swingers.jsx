import React, { useEffect, useState, useRef } from 'react';
import { database } from '../../firebase';
import { ref, get, set, push, serverTimestamp, runTransaction } from "firebase/database";
import BackButton from '../../components/BackButton';
/* eslint-disable react/prop-types */
const Swingers = () => {
    const [players, setPlayers] = useState([]); // This will now be an array of player names
    const [rounds, setRounds] = useState([]);
    const [results, setResults] = useState(null);
    const [screen, setScreen] = useState('setup'); // setup, tournament, results
    const [errorMessage, setErrorMessage] = useState('');
    const [tournamentErrorMessage, setTournamentErrorMessage] = useState('');
    const [numRounds, setNumRounds] = useState(0);
    const [tournamentName, setTournamentName] = useState('');
    const [playerColors, setPlayerColors] = useState({});
    const [playerDbIds, setPlayerDbIds] = useState({});

    // --- State for Chip Input ---
    const [inputValue, setInputValue] = useState('');
    const [allUsernames, setAllUsernames] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const inputRef = useRef(null);

    // --- Fetch all usernames on mount for autocomplete ---
    useEffect(() => {
        const fetchAllUsers = async () => {
            const usersRef = ref(database, 'users');
            const snapshot = await get(usersRef);
            if (snapshot.exists()) {
                const usersData = snapshot.val();
                const allNames = Object.values(usersData).map(user => user.name.trim());
                const normalizedNames = allNames.map(name => name.toLowerCase());
                const uniqueNormalizedNames = new Set(normalizedNames);
                
                setAllUsernames(allNames.filter(name => uniqueNormalizedNames.delete(name.toLowerCase())));
            }
        };
        fetchAllUsers();
    }, []);

    // --- Helper Functions ---
    const shuffle = (array) => {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    };

    const getPartnerKey = (p1, p2) => {
        return [p1, p2].sort().join('-');
    };

    // --- Round Generation Logic ---
    const generateAllRounds = (numRounds, currentPlayers) => {
        let tempRounds = [];
        let tempPartnerships = {};
        let tempPlayerSitOuts = {};
        currentPlayers.forEach(p => { tempPlayerSitOuts[p] = 0; });

        for (let i = 0; i < numRounds; i++) {
            const { round, newPartnerships, newSitOuts } = generateSingleRound(currentPlayers, tempPartnerships, tempPlayerSitOuts);
            if (round.length > 0) {
                tempRounds.push(round);
                tempPartnerships = newPartnerships;
                tempPlayerSitOuts = newSitOuts;
            } else {
                console.warn(`Could not generate round ${i + 1}. Pairings exhausted.`);
            }
        }
        setRounds(tempRounds);
    };

    const generateSingleRound = (currentPlayers, currentPartnerships, currentSitOuts) => {
        const roundMatches = [];
        let availablePlayers = [...currentPlayers];
        const roundPartnerships = new Set();
        
        availablePlayers.sort((a, b) => currentSitOuts[b] - currentSitOuts[a]);

        const pairedPlayers = new Set();
        const pairs = [];

        for (let i = 0; i < availablePlayers.length; i++) {
            const p1 = availablePlayers[i];
            if (pairedPlayers.has(p1)) continue;

            let bestPartner = null;
            let minPartnershipCount = Infinity;

            for (let j = i + 1; j < availablePlayers.length; j++) {
                const p2 = availablePlayers[j];
                if (pairedPlayers.has(p2)) continue;

                const key = getPartnerKey(p1, p2);
                const count = currentPartnerships[key] || 0;

                if (count < minPartnershipCount) {
                    minPartnershipCount = count;
                    bestPartner = p2;
                }
            }

            if (bestPartner) {
                const key = getPartnerKey(p1, bestPartner);
                pairs.push([p1, bestPartner]);
                roundPartnerships.add(key);
                pairedPlayers.add(p1);
                pairedPlayers.add(bestPartner);
            }
        }

        const availablePairs = shuffle(pairs);
        while (availablePairs.length >= 2) {
            const team1 = availablePairs.pop();
            const team2 = availablePairs.pop();
            roundMatches.push({
                team1: { p1: team1[0], p2: team1[1], score: null },
                team2: { p1: team2[0], p2: team2[1], score: null }
            });
        }

        const playersInRound = new Set(pairedPlayers);
        const newSitOuts = { ...currentSitOuts };
        currentPlayers.forEach(p => {
            if (!playersInRound.has(p)) {
                newSitOuts[p] = (newSitOuts[p] || 0) + 1;
            }
        });

        const newPartnerships = { ...currentPartnerships };
        roundPartnerships.forEach(key => {
            newPartnerships[key] = (newPartnerships[key] || 0) + 1;
        });

        return { round: roundMatches, newPartnerships, newSitOuts };
    };


    // --- Event Handlers ---
    const handleGenerateTournament = async () => {
        if (players.length < 4) {
            setErrorMessage('Please enter at least 4 players.');
            return;
        }

        if (!numRounds) {
            setErrorMessage('Please select a number of rounds.');
            return;
        }

        const n = players.length;
        const maxRounds = (n % 2 === 0) ? (n - 1) : n;

        if (numRounds > maxRounds) {
            setErrorMessage(`With ${n} players, the maximum number of unique partner rounds is ${maxRounds}.`);
            return;
        }

        setErrorMessage('');

        // Player creation is now delayed until the tournament is finished.

        const colors = [
            '#F87171', '#60A5FA', '#4ADE80', '#FBBF24', '#A78BFA',
            '#F472B6', '#818CF8', '#2DD4BF', '#FB923C', '#93C5FD',
            '#A5B4FC', '#D8B4FE', '#7DD3FC', '#99F6E4', '#FEF08A'
        ];
        const newPlayerColors = {};
        players.forEach((name, index) => {
            newPlayerColors[name] = colors[index % colors.length];
        });
        setPlayerColors(newPlayerColors);

        generateAllRounds(numRounds, players);
        setScreen('tournament');
    };

    const getOrCreatePlayers = async (usernames) => {
        const usersRef = ref(database, 'users');
        const snapshot = await get(usersRef);
        const existingUsers = snapshot.val() || {};
        const nameToIdMap = {};
        Object.entries(existingUsers).forEach(([id, user]) => {
            nameToIdMap[user.name] = id;
        });

        const finalPlayerDbIds = {};

        for (const name of usernames) {
            if (nameToIdMap[name]) {
                // Player exists
                finalPlayerDbIds[name] = nameToIdMap[name];
            } else {
                // New player, create them
                const newUserRef = push(usersRef);
                await set(newUserRef, { name });
                finalPlayerDbIds[name] = newUserRef.key;
            }
        }
        // Set state for the results screen, and return for immediate use in saving.
        setPlayerDbIds(finalPlayerDbIds);
        return finalPlayerDbIds;
    };

    const handleScoreChange = (roundIdx, matchIdx, teamKey, score) => {
        const newRounds = [...rounds];
        const match = newRounds[roundIdx][matchIdx];
        match[teamKey].score = score;

        const otherTeamKey = teamKey === 'team1' ? 'team2' : 'team1';
        if (score < 3) {
            match[otherTeamKey].score = 3;
        }
        setRounds(newRounds);
    };

    const handleFinishTournament = async () => {
        let incomplete = false;
        for (const round of rounds) {
            for (const match of round) {
                if (match.team1.score === null || match.team2.score === null || match.team1.score === match.team2.score) {
                    incomplete = true;
                    break;
                }
            }
            if (incomplete) break;
        }

        if (incomplete) {
            setTournamentErrorMessage('Please enter all match results before finishing.');
            return;
        }

        setTournamentErrorMessage('');
        const finalPlayerDbIds = await getOrCreatePlayers(players);
        const finalResults = calculateAndRenderLeaderboard();
        // Pass finalPlayerDbIds to saveTournamentResults
        await saveTournamentResults(finalResults, finalPlayerDbIds); 
        await updatePlayerStats(finalResults, finalPlayerDbIds);
        setScreen('results');
    };

    const updatePlayerStats = async (finalResults, finalPlayerDbIds) => {
        if (!finalResults || !finalPlayerDbIds) return;

        for (const playerName of finalResults.leaderboard) {
            const playerId = finalPlayerDbIds[playerName];
            if (!playerId) continue;

            const playerResult = finalResults.data[playerName];
            const playerRank = finalResults.leaderboard.indexOf(playerName) + 1;
            const userStatsRef = ref(database, `users/${playerId}`);

            await runTransaction(userStatsRef, (currentStats) => {
                if (currentStats) {
                    currentStats.tournamentsPlayed = (currentStats.tournamentsPlayed || 0) + 1;
                    currentStats.matchWins = (currentStats.matchWins || 0) + playerResult.matchWins;
                    currentStats.matchesPlayed = (currentStats.matchesPlayed || 0) + playerResult.matchesPlayed;
                    currentStats.gamesWon = (currentStats.gamesWon || 0) + playerResult.gamesWon;
                    currentStats.totalGamesPlayed = (currentStats.totalGamesPlayed || 0) + playerResult.totalGamesPlayed;
                    
                    const newPlacement = { rank: playerRank, name: tournamentName.trim() || 'Swingers Tournament' };
                    currentStats.placements = [...(currentStats.placements || []), newPlacement];
                }
                return currentStats;
            });
        }
    };

    const handleStartNew = () => {
        setRounds([]);
        setResults(null);
        setNumRounds(0);
        setPlayers([]); // Clear players for the new tournament
        setTournamentName(''); // Clear tournament name
        setScreen('setup');
    };

    const calculateAndRenderLeaderboard = () => {
        const tempResults = {};
        players.forEach(p => {
            tempResults[p] = {
                matchWins: 0,
                matchesPlayed: 0,
                gamesWon: 0,
                totalGamesPlayed: 0,
                gamesLost: 0,
                opponents: {},
            };
        });

        rounds.forEach(round => {
            round.forEach(match => {
                const { team1, team2 } = match;
                const score1 = team1.score;
                const score2 = team2.score;

                if (score1 === null || score2 === null || score1 === score2) return;

                const team1Players = [team1.p1, team1.p2];
                const team2Players = [team2.p1, team2.p2];
                const allPlayers = [...team1Players, ...team2Players];
                const team1Won = score1 > score2;

                allPlayers.forEach(p => {
                    const res = tempResults[p];
                    res.matchesPlayed += 1;
                    res.totalGamesPlayed += score1 + score2;

                    if (team1Players.includes(p)) {
                        res.gamesWon += score1;
                        res.gamesLost += score2;
                        if (team1Won) res.matchWins += 1;
                        const diff = score1 - score2;
                        res.opponents[team2.p1] = (res.opponents[team2.p1] || 0) + diff;
                        res.opponents[team2.p2] = (res.opponents[team2.p2] || 0) + diff;
                    } else {
                        res.gamesWon += score2;
                        res.gamesLost += score1;
                        if (!team1Won) res.matchWins += 1;
                        const diff = score2 - score1;
                        res.opponents[team1.p1] = (res.opponents[team1.p1] || 0) + diff;
                        res.opponents[team1.p2] = (res.opponents[team1.p2] || 0) + diff;
                    }
                });
            });
        });

        const leaderboard = Object.keys(tempResults);
        leaderboard.sort((a, b) => {
            const resA = tempResults[a];
            const resB = tempResults[b];
            if (resA.matchWins !== resB.matchWins) return resB.matchWins - resA.matchWins;
            if (resA.gamesWon !== resB.gamesWon) return resB.gamesWon - resA.gamesWon;
            const directH2H = (resA.opponents[b] || 0) - (resB.opponents[a] || 0);
            if (directH2H !== 0) return directH2H > 0 ? -1 : 1;
            return a.localeCompare(b);
        });

        leaderboard.forEach(p => {
            const res = tempResults[p];
            res.winLossDiff = res.gamesWon - res.gamesLost;
            res.matchWinrate = res.matchesPlayed > 0 ? ((res.matchWins / res.matchesPlayed) * 100).toFixed(0) : 0;
        });

        setResults({ leaderboard, data: tempResults });
        return { leaderboard, data: tempResults };
    };

    const saveTournamentResults = async (finalResults, finalPlayerDbIds) => {
        if (!finalResults || !finalPlayerDbIds) return;

        const tournamentsRef = ref(database, 'tournaments');
        const newTournamentRef = push(tournamentsRef);

        const playersWithIds = finalResults.leaderboard.map(playerName => {
            return {
                ...finalResults.data[playerName],
                playerId: finalPlayerDbIds[playerName],
                name: playerName,
            };
        });

        await set(newTournamentRef, {
            createdAt: serverTimestamp(),
            type: "Swingers",
            name: tournamentName.trim() || `Swingers Tournament`,
            results: playersWithIds,
        });
    };

    const renderRoundRadios = () => {
        const maxPossibleRounds = 13;
        const radios = [];
        const n = players.length;
        const maxRounds = n >= 4 ? (n % 2 === 0 ? n - 1 : n) : 0;

        for (let i = 1; i <= maxPossibleRounds; i++) {
            const disabled = i > maxRounds;
            radios.push(
                <React.Fragment key={i}>
                    <input
                        type="radio"
                        id={`round-${i}`}
                        name="numRounds"
                        value={i}
                        checked={numRounds === i}
                        onChange={() => setNumRounds(i)}
                        disabled={disabled}
                    />
                    <RadioInput
                        htmlFor={`round-${i}`}
                        label={i}
                        disabled={disabled}
                    />
                </React.Fragment>
            );
        }
        return radios;
    };

    const RadioInput = ({ htmlFor, label, disabled }) => (
        <label htmlFor={htmlFor} className={`inline-block py-2 px-4 font-medium border-2 rounded-lg transition-all ease-in-out duration-200 min-w-[50px] text-center ${disabled ? 'bg-gray-900 border-gray-800 text-gray-700 cursor-not-allowed shadow-none' : 'bg-gray-800 border-gray-700 text-gray-400 cursor-pointer'}`}>
            {label}
        </label>
    );

    // --- Chip Input Handlers ---
    const handleInputChange = (e) => {
        const value = e.target.value;
        setInputValue(value);
        if (value) {
            const filteredSuggestions = allUsernames
                .filter(name => name.toLowerCase().startsWith(value.toLowerCase()))
                .filter(name => !players.includes(name)) // Don't suggest names already added
                .slice(0, 5); // Limit suggestions
            setSuggestions(filteredSuggestions);
        } else {
            setSuggestions([]);
        }
        setHighlightedIndex(-1); // Reset highlight when input changes
    };

    const addPlayer = (name) => {
        const trimmedName = name.trim();
        if (trimmedName && !players.includes(trimmedName)) {
            setPlayers([...players, trimmedName]);
        }
        setInputValue('');
        setSuggestions([]);
        setHighlightedIndex(-1);
        inputRef.current.focus();
    };

    const removePlayer = (nameToRemove) => {
        setPlayers(players.filter(name => name !== nameToRemove));
    };

    const handleKeyDown = (e) => {
        if (suggestions.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlightedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
            } else if ((e.key === 'Enter' || e.key === 'Tab') && highlightedIndex > -1) {
                e.preventDefault();
                addPlayer(suggestions[highlightedIndex]);
            } else if (e.key === 'Enter' && inputValue) {
                e.preventDefault();
                addPlayer(inputValue);
            }
        } else if (e.key === 'Enter' && inputValue) {
            e.preventDefault();
            addPlayer(inputValue);
        }

        if (e.key === 'Backspace' && !inputValue && players.length > 0) {
            e.preventDefault();
            removePlayer(players[players.length - 1]);
        }
    };

    const handleSuggestionClick = (name) => {
        addPlayer(name);
    };

    useEffect(() => {
        setErrorMessage('');
    }, [players, numRounds]);

    const renderLeaderboard = () => {
        if (!results || !results.leaderboard) return null;

        const podiumNames = [ // eslint-disable-line no-unused-vars
            results.leaderboard[0] || 'N/A',
            results.leaderboard[1] || 'N/A',
            results.leaderboard[2] || 'N/A'
        ];

        return (
            <>
                <div className="flex items-end justify-center space-x-2 md:space-x-4 mb-10 text-center font-bold">
                    <div className="order-2 md:order-1 bg-gray-200 border-2 border-gray-400 rounded-t-lg p-4 w-1/4 h-32 flex flex-col justify-end shadow-lg">
                        <p className="text-4xl text-gray-600">2</p>
                        <p className="text-lg text-gray-800 truncate" title={podiumNames[1]}>{podiumNames[1]}</p>
                    </div>
                    <div className="order-1 md:order-2 bg-yellow-300 border-2 border-yellow-500 rounded-t-lg p-4 w-1/3 h-40 flex flex-col justify-end shadow-xl">
                        <p className="text-5xl text-yellow-700">1</p>
                        <p className="text-xl text-yellow-900 truncate" title={podiumNames[0]}>{podiumNames[0]}</p>
                    </div>
                    <div className="order-3 md:order-3 bg-yellow-600 border-2 border-yellow-800 rounded-t-lg p-4 w-1/4 h-24 flex flex-col justify-end shadow-md">
                        <p className="text-3xl text-yellow-100">3</p>
                        <p className="text-base text-white truncate" title={podiumNames[2]}>{podiumNames[2]}</p>
                    </div>
                </div>
                <div className="overflow-x-auto shadow-md rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-700">
                            <tr className="divide-x divide-gray-600">
                                <th rowSpan="2" scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider align-middle">Rank</th>
                                <th rowSpan="2" scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider align-middle">Player</th>
                                <th colSpan="3" scope="colgroup" className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider border-b border-gray-600">Matches</th>
                                <th colSpan="3" scope="colgroup" className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider border-b border-gray-600">Games</th>
                            </tr>
                            <tr className="divide-x divide-gray-600">
                                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">Wins</th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">Played</th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">Winrate</th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">Wins</th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">Played</th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">W-L Diff</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200 text-gray-900">
                            {results.leaderboard.map((playerName, idx) => {
                                const res = results.data[playerName];
                                const rank = idx + 1;
                                let rowClassName = '';
                                if (rank === 1) rowClassName = 'bg-yellow-100 font-bold';
                                else if (rank === 2) rowClassName = 'bg-gray-100 font-medium';
                                else if (rank === 3) rowClassName = 'bg-yellow-50 font-medium';

                                return (
                                    <tr key={playerName} className={`${rowClassName} divide-x divide-gray-200`}>
                                        <td className="px-6 py-4 text-center">{rank}</td>
                                        <td className="px-6 py-4 whitespace-nowrap" style={{ color: playerColors[playerName], fontWeight: 'bold' }}>{playerName}</td>
                                        <td className="px-6 py-4 text-center">{res.matchWins}</td>
                                        <td className="px-6 py-4 text-center">{res.matchesPlayed}</td>
                                        <td className="px-6 py-4 text-center">{res.matchWinrate}%</td>
                                        <td className="px-6 py-4 text-center">{res.gamesWon}</td>
                                        <td className="px-6 py-4 text-center">{res.totalGamesPlayed}</td>
                                        <td className="px-6 py-4 text-center">{res.winLossDiff > 0 ? '+' : ''}{res.winLossDiff}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </>
        );
    };

    return (
        <>
            <BackButton to="/smash" text="Back to Smash Tools" />
            <div className="font-['Inter',_sans-serif] bg-gray-900 text-gray-100 flex items-center justify-center p-4">            <style>{`
                /* Fade-in animation */
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .screen-animation {
                    animation: fadeIn 0.5s ease-in-out;
                }
                
                /* Custom radio button styles */
                .radio-group input[type="radio"] {
                    display: none;
                }
                .radio-group input[type="radio"]:checked + label {
                    background-color: #60a5fa; /* blue-400 */
                    border-color: #3182ce; /* blue-600 */
                    color: white;
                    box-shadow: 0 4px 6px -1px rgba(66, 153, 225, 0.3);
                }
                .radio-group input[type="radio"]:disabled + label {
                    background-color: #1a202c; /* gray-900 */
                    border-color: #2d3748; /* gray-800 */
                    color: #4a5568; /* gray-700 */
                    cursor: not-allowed;
                    box-shadow: none;
                }
                .score-selected {
                    background-color: #60a5fa;
                    border-color: #3182ce;
                    color: white;
                    box-shadow: 0 4px 6px -1px rgba(66, 153, 225, 0.3);
                }
                /* Chip styles */
                .chip {
                    display: inline-flex;
                    align-items: center;
                    padding: 4px 8px;
                    margin: 4px;
                    background-color: #4a5568; /* gray-600 */
                    color: white;
                    border-radius: 16px;
                    font-size: 0.875rem;
                }
                .chip-remove {
                    margin-left: 8px;
                    cursor: pointer;
                }
            `}</style>
            <div className="w-full max-w-[900px] bg-gray-800 rounded-lg shadow-xl overflow-hidden border border-gray-700">
                <header className="p-6 bg-gray-700 border-b border-gray-600">
                    <h1 className="text-2xl md:text-3xl font-bold text-center text-white">Swingers Smash Tournament</h1>
                </header>

                <div id="setup-screen" className={`${screen === 'setup' ? 'block screen-animation' : 'hidden'} p-6 md:p-8 space-y-6 relative z-[1]`}>
                    <div>
                        <label htmlFor="tournament-name" className="block text-sm font-medium text-gray-300 mb-2">Tournament Name (Optional)</label>
                        <input
                            id="tournament-name"
                            type="text"
                            value={tournamentName}
                            onChange={(e) => setTournamentName(e.target.value)}
                            className="w-full p-3 bg-gray-900 border border-gray-700 rounded-md text-gray-100 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(66,153,225,0.5)] text-sm transition-all duration-200"
                            placeholder="e.g., Friday Night Fights"
                        />
                    </div>
                    <div>
                        <label htmlFor="player-input" className="block text-sm font-medium text-gray-300 mb-2">Players</label>
                        <div className="relative">
                            <div className="flex flex-wrap items-center w-full p-2 bg-gray-900 border border-gray-700 rounded-md text-gray-100 focus-within:border-blue-500 focus-within:shadow-[0_0_0_2px_rgba(66,153,225,0.5)] transition-all duration-200 min-h-[46px]">
                                {players.map(name => (
                                    <div key={name} className="chip">
                                        <span>{name}</span>
                                        <span className="chip-remove" onClick={() => removePlayer(name)}>×</span>
                                    </div>
                                ))}
                                <input
                                    id="player-input"
                                    ref={inputRef}
                                    type="text"
                                    value={inputValue}
                                    onChange={handleInputChange}
                                    onKeyDown={handleKeyDown}
                                    className="flex-grow bg-transparent p-1 focus:outline-none text-sm"
                                    placeholder={players.length === 0 ? "Type player names..." : ""}
                                />
                            </div>
                            {suggestions.length > 0 && (
                                <ul className="absolute z-10 w-full mt-1 bg-gray-700 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                                    {suggestions.map((name, index) => (
                                        <li key={name}
                                            onClick={() => handleSuggestionClick(name)}
                                            className={`px-4 py-2 cursor-pointer ${index === highlightedIndex ? 'bg-blue-600' : 'hover:bg-gray-600'}`}
                                        >{name}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Number of Rounds</label>
                        <div className="radio-group flex flex-wrap gap-2">
                            {renderRoundRadios()}
                        </div>
                    </div>

                    {errorMessage && <div className="text-red-400 text-sm font-medium">{errorMessage}</div>}

                    <button onClick={handleGenerateTournament} className="w-full text-lg inline-block py-3 px-6 rounded-lg font-semibold text-center transition-all duration-200 ease-in-out border-none cursor-pointer bg-blue-500 text-white shadow-[0_4px_6px_-1px_rgba(66,153,225,0.3)] hover:bg-blue-600 hover:shadow-[0_10px_15px_-3px_rgba(66,153,225,0.3)] hover:-translate-y-0.5">
                        Generate Tournament
                    </button>
                </div>

                <div id="tournament-screen" className={`${screen === 'tournament' ? 'block screen-animation' : 'hidden'} p-6 md:p-8 space-y-6 relative z-[1]`}>
                    <div className="space-y-8">
                        {rounds.map((round, roundIdx) => (
                            <div key={roundIdx} className="round-container space-y-4">
                                <h3 className="text-2xl font-semibold border-b border-gray-600 pb-2 text-blue-300">Round {roundIdx + 1}</h3>
                                {round.map((match, matchIdx) => {
                                    const team1Won = match.team1.score !== null && match.team2.score !== null && match.team1.score > match.team2.score;
                                    const team2Won = match.team1.score !== null && match.team2.score !== null && match.team2.score > match.team1.score;
                                    const baseTeamClasses = 'rounded-md p-4 transition-all duration-300 ease-in-out border-2 border-transparent md:col-span-5 flex flex-col sm:items-center sm:justify-between sm:gap-4';
                                    const winningClasses = 'bg-blue-600/70 border-blue-500 shadow-[0_0_15px_rgba(66,153,225,0.4)] scale-[1.02]';
                                    const defaultClasses = 'bg-gray-800';

                                    const team1Classes = `${baseTeamClasses} sm:flex-row-reverse ${team1Won ? winningClasses : defaultClasses}`;
                                    const team2Classes = `${baseTeamClasses} sm:flex-row ${team2Won ? winningClasses : defaultClasses}`;

                                    return (
                                        <div key={matchIdx} className="matchup-card bg-gray-700 rounded-lg p-4 transition-all duration-200 grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
                                            <div className={team1Classes}>
                                                <div className="mb-4 sm:mb-0 font-semibold min-w-0 flex-grow sm:text-right flex-1">
                                                    <p className="text-lg truncate" style={{ color: playerColors[match.team1.p1] }} title={match.team1.p1}>{match.team1.p1}</p>
                                                    <p className="text-lg truncate" style={{ color: playerColors[match.team1.p2] }} title={match.team1.p2}>{match.team1.p2}</p>
                                                </div>
                                                <div className="flex space-x-2">
                                                    {[0, 1, 2, 3].map(score => {
                                                        const isSelected = match.team1.score === score;
                                                        return <button key={score} onClick={() => handleScoreChange(roundIdx, matchIdx, 'team1', score)} className={`py-2 px-4 font-semibold rounded-md transition-all duration-200 bg-gray-700 text-gray-200 border border-gray-600 min-w-[40px] hover:bg-gray-600 cursor-pointer ${isSelected ? 'score-selected' : ''}`}>{score}</button>
                                                    })}
                                                </div>
                                            </div>
                                            <div className="text-center text-lg font-bold text-gray-400 md:col-span-1">VS</div>
                                            <div className={team2Classes}>
                                                <div className="mb-4 sm:mb-0 font-semibold min-w-0 flex-grow flex-1">
                                                    <p className="text-lg truncate" style={{ color: playerColors[match.team2.p1] }} title={match.team2.p1}>{match.team2.p1}</p>
                                                    <p className="text-lg truncate" style={{ color: playerColors[match.team2.p2] }} title={match.team2.p2}>{match.team2.p2}</p>
                                                </div>
                                                <div className="flex space-x-2">
                                                    {[0, 1, 2, 3].map(score => {
                                                        const isSelected = match.team2.score === score;
                                                        return <button key={score} onClick={() => handleScoreChange(roundIdx, matchIdx, 'team2', score)} className={`py-2 px-4 font-semibold rounded-md transition-all duration-200 bg-gray-700 text-gray-200 border border-gray-600 min-w-[40px] hover:bg-gray-600 cursor-pointer ${isSelected ? 'score-selected' : ''}`}>{score}</button>
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ))}
                    </div>

                    {tournamentErrorMessage && <div className="text-red-400 text-sm font-medium">{tournamentErrorMessage}</div>}

                    <div className="flex space-x-4">
                        <button onClick={() => setScreen('setup')} className="w-1/2 inline-block py-3 px-6 rounded-lg font-semibold text-center transition-all duration-200 ease-in-out cursor-pointer bg-gray-700 text-gray-200 border border-gray-600 hover:bg-gray-600">Back to Setup</button>
                        <button onClick={handleFinishTournament} className="w-1/2 inline-block py-3 px-6 rounded-lg font-semibold text-center transition-all duration-200 ease-in-out border-none cursor-pointer bg-blue-500 text-white shadow-[0_4px_6px_-1px_rgba(66,153,225,0.3)] hover:bg-blue-600 hover:shadow-[0_10px_15px_-3px_rgba(66,153,225,0.3)] hover:-translate-y-0.5">Finish & See Results</button>
                    </div>
                </div>

                <div id="results-screen" className={`${screen === 'results' ? 'block screen-animation' : 'hidden'} p-6 md:p-8 relative z-[1]`}>
                    <h2 className="text-3xl font-bold mb-8 text-center">Leaderboard</h2>
                    {renderLeaderboard()}
                    <button onClick={handleStartNew} className="w-full mt-8 inline-block py-3 px-6 rounded-lg font-semibold text-center transition-all duration-200 ease-in-out border-none cursor-pointer bg-blue-500 text-white shadow-[0_4px_6px_-1px_rgba(66,153,225,0.3)] hover:bg-blue-600 hover:shadow-[0_10px_15px_-3px_rgba(66,153,225,0.3)] hover:-translate-y-0.5">Start New Tournament</button>
                </div>
            </div>
            </div>
        </>
    );
};

export default Swingers;
