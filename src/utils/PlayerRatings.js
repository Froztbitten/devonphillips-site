import { database } from '../firebase';
import { ref, get, query, orderByChild, startAt } from 'firebase/database';
 
/**
 * Calculates a rating for a player based on their performance in tournaments over the last year.
 * The rating is the average of points from each tournament.
 * Points per tournament = sqrt(number of participants) / player's placement.
 *
 * @param {string} playerId - The database ID of the player.
 * @returns {Promise<object>} An object containing the final rating and its components.
 */
export const calculatePlayerRating = async (playerId) => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearAgoTimestamp = oneYearAgo.getTime();

    const tournamentsQuery = query(ref(database, 'tournaments'), orderByChild('createdAt'), startAt(oneYearAgoTimestamp));
    const snapshot = await get(tournamentsQuery);

    if (!snapshot.exists()) {
        return { finalRating: 0, baseRating: 0, winLossMultiplier: 1, participationMultiplier: 1 };
    }
    const tournamentsData = snapshot.val();

    let totalTournamentsInLastYear = 0;
    const tournamentPoints = [];
    let totalWinLossDiff = 0;

    for (const tournamentId in tournamentsData) {
        const tournament = tournamentsData[tournamentId];

        // Check if tournament is within the last year and has valid results
        if (tournament.results && Array.isArray(tournament.results) && tournament.createdAt >= oneYearAgoTimestamp) {
            totalTournamentsInLastYear++;

            const numParticipants = tournament.results.length;
            const playerResult = tournament.results.find(result => result.playerId === playerId);

            if (playerResult) {
                const playerResultIndex = tournament.results.indexOf(playerResult);
                const placement = playerResultIndex + 1;
                const points = Math.sqrt(numParticipants) / placement;
                tournamentPoints.push(points);

                // Sum up the win-loss difference from each tournament in the last year
                totalWinLossDiff += (playerResult.winLossDiff || 0);
            }
        }
    }

    if (tournamentPoints.length === 0) {
        return {
            finalRating: 0,
            baseRating: 0,
            winLossMultiplier: 1,
            participationMultiplier: 1,
        };
    }

    const totalPoints = tournamentPoints.reduce((sum, points) => sum + points, 0);
    const baseRating = totalPoints / tournamentPoints.length;

    // 1. Win-loss difference multiplier
    const winLossMultiplier = 1 + (totalWinLossDiff / 100);

    // 2. Participation multiplier
    const tournamentsParticipated = tournamentPoints.length;
    const participationRatio = totalTournamentsInLastYear > 0 ? tournamentsParticipated / totalTournamentsInLastYear : 0;
    const y = participationRatio / 10;
    const participationMultiplier = 1 + y;

    // Ensure multiplier doesn't drop rating below 0
    const finalRating = baseRating * Math.max(0, winLossMultiplier) * Math.max(0, participationMultiplier);

    return {
        finalRating,
        baseRating,
        winLossMultiplier,
        participationMultiplier,
    };
};