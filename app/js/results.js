import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Fetch average performance metrics across all users
 * @returns {Promise<Array>} [accuracy, efficiency, style, errorHandling, runtime]
 */
export async function getAveragePerformance() {
    try {
        // Fetch all evaluation data for candidate users
        const { data: evaluations, error } = await supabase
            .from('evaluation')
            .select('correctness, line_code, runtime, error_made, time_taken, profile_id');

        if (error) {
            console.error('Error fetching average performance:', error);
            return [75, 70, 72, 68, 75]; // Fallback to defaults
        }

        if (!evaluations || evaluations.length === 0) {
            return [0, 0, 0, 0, 0]; // Return 0s if no evaluation data exists in system
        }

        // Calculate averages
        const totalEntries = evaluations.length;
        let totalCorrectness = 0, countCorrectness = 0;
        let totalLineCode = 0, countLineCode = 0;
        let totalRuntime = 0, countRuntime = 0;
        let totalErrors = 0, countErrors = 0;
        let totalTimeTaken = 0, countTime = 0;

        evaluations.forEach(evaluation => {
            if (evaluation.correctness !== null) {
                totalCorrectness += evaluation.correctness;
                countCorrectness++;
            }
            if (evaluation.line_code !== null) {
                totalLineCode += evaluation.line_code;
                countLineCode++;
            }
            if (evaluation.runtime !== null) {
                totalRuntime += evaluation.runtime;
                countRuntime++;
            }
            if (evaluation.error_made !== null) {
                totalErrors += evaluation.error_made;
                countErrors++;
            }
            if (evaluation.time_taken !== null) {
                totalTimeTaken += evaluation.time_taken;
                countTime++;
            }
        });

        // Calculate average percentages (assuming raw scores are 0-1 or 0-10)
        const avgAccuracy = countCorrectness > 0 ? (totalCorrectness / countCorrectness) * 10 : 0;
        const avgEfficiency = countRuntime > 0 ? (totalRuntime / countRuntime) * 10 : 0;
        const avgStyle = countLineCode > 0 ? (totalLineCode / countLineCode) * 10 : 0;
        const avgErrors = countErrors > 0 ? (totalErrors / countErrors) * 10 : 0; // Scale to 0-100 range
        const avgTime = countTime > 0 ? (totalTimeTaken / countTime) * 10 : 0;

        // Return in chart format: [Accuracy, Efficiency, Style, ErrorHandling (inverted), Runtime (inverted)]
        // For inverted metrics: if no data (avg=0), show 0; if data exists, invert (100 - value)
        return [
            Math.min(100, Math.max(0, avgAccuracy)),
            Math.min(100, Math.max(0, avgEfficiency)),
            Math.min(100, Math.max(0, avgStyle)),
            Math.min(100, Math.max(0, avgErrors === 0 ? 0 : 100 - avgErrors)), // Fewer errors = better; if no data, show 0
            Math.min(100, Math.max(0, avgTime === 0 ? 0 : 100 - avgTime))     // Less time = better; if no data, show 0
        ];
    } catch (err) {
        console.error('Error getting average performance:', err);
        return [75, 70, 72, 68, 75];
    }
}

/**
 * Load and display results data
 * @param {string} userId - The user's ID
 * @returns {Object} The calculated results data
 */
export async function loadResults(userId) {
    try {
        console.log('Loading results for user:', userId);

        // Guard: check if userId is valid
        if (!userId || userId === 'undefined' || typeof userId !== 'string' || userId.length !== 36) {
            console.warn('Invalid userId, loading default data');
            const defaultAverages = [0, 8.5, 38, 7.8, 2, 18];
            populateUI(0, defaultAverages, 17, 20, 26);
            return { averages: defaultAverages };
        }

        // Fetch overall progress from level table
        const { data: levelData, error: levelError } = await supabase
            .from('level')
            .select('progress, level_status')
            .eq('profile_id', userId)
            .single();

        if (levelError && levelError.code !== 'PGRST116') { // Allow missing level data
            console.error('Error fetching level data:', levelError);
            alert('Error loading level data: ' + levelError.message);
            return { averages: [0, 0, 0, 0, 0] };
        }

        console.log('Level data:', levelData);

        // Fetch user's evaluations with scores
        const { data: evaluationData, error: evalError } = await supabase
            .from('evaluation')
            .select('correctness, line_code, time_taken, runtime, error_made, id')
            .eq('profile_id', userId);

        if (evalError) {
            console.error('Error fetching evaluation data:', evalError);
            alert('Error loading evaluation data: ' + evalError.message);
            return { averages: [0, 0, 0, 0, 0] };
        }

        console.log('Evaluation data:', evaluationData);

        // If no evaluations, set defaults
        if (!evaluationData || evaluationData.length === 0) {
            console.log('No evaluations found for user');
            const defaultAverages = [0, 0, 0, 0, 0];
            populateUI(0, [...defaultAverages, 0], 0, 0, 0);
            return { averages: defaultAverages };
        }

        // Fetch recent result score
        const { data: recentResult, error: resultError } = await supabase
            .from('result')
            .select('score')
            .eq('evaluation_id', evaluationData[evaluationData.length - 1].id)
            .single();

        let recentScore = 0;
        if (resultError && resultError.code !== 'PGRST116') { // Allow missing result data
            console.error('Error fetching recent result:', resultError);
        } else if (!resultError && recentResult) {
            recentScore = recentResult.score;
        }

        console.log('Recent score:', recentScore);

        // Fetch all user's results with scores
        const { data: resultData, error: resultAllError } = await supabase
            .from('result')
            .select('score')
            .in('evaluation_id', evaluationData.map(e => e.id));

        if (resultAllError) {
            console.error('Error fetching all result data:', resultAllError);
            return { averages: [0, 0, 0, 0, 0] };
        }

        console.log('All result data:', resultData);

        // Calculate totals from result data
        let max_per_test = 10; // max score per test
        let totalCorrect = resultData.reduce((sum, r) => sum + (r.score || 0), 0);
        let countTestsTaken = resultData.length;
        let countCorrectness = countTestsTaken * max_per_test;

        // Calculate averages and populate UI
        const calculation = calculateAverages(evaluationData);
        const overall = levelData ? levelData.progress : 0;
        const data = [...calculation.averages, recentScore];

        populateUI(overall, data, totalCorrect, countCorrectness, calculation.totalPoints);

        return { averages: calculation.averages };

    } catch (err) {
        console.error('Error loading results:', err);
        alert('Failed to load results: ' + err.message);
        return { averages: [0, 0, 0, 0, 0] };
    }
}

/**
 * Calculate average metrics from evaluations
 * @param {Array} evaluations - Array of evaluation records
 * @returns {Object} {averages: [accuracy, efficiency, time, style, errors], totalCorrect, countCorrectness, totalPoints}
 */
function calculateAverages(evaluations) {
    let totalCorrectness = 0, countCorrectness = 0;
    let totalCorrect = 0;
    let totalLineCode = 0, countLineCode = 0;
    let totalTime = 0, countTime = 0;
    let totalRuntime = 0, countRuntime = 0;
    let totalErrors = 0;
    let totalPoints = 0;

    evaluations.forEach(evaluation => {
        // Sum all non-null values for total points
        totalPoints += (evaluation.correctness || 0) + (evaluation.line_code || 0) + (evaluation.time_taken || 0) + (evaluation.runtime || 0) + (evaluation.error_made || 0);

        // Correctness: assume 0-1, used for count and percentage
        if (evaluation.correctness !== null && evaluation.correctness !== undefined) {
            totalCorrectness += evaluation.correctness;
            if (evaluation.correctness >= 0.8) { // assuming 80% is considered correct
                totalCorrect += 1;
            }
            countCorrectness++;
        }

        // Line_code: assume score 0-10, scale to 0-10
        if (evaluation.line_code !== null && evaluation.line_code !== undefined) {
            totalLineCode += parseFloat(evaluation.line_code);
            countLineCode++;
        }

        // Time_taken: assume in minutes
        if (evaluation.time_taken !== null && evaluation.time_taken !== undefined) {
            totalTime += parseFloat(evaluation.time_taken);
            countTime++;
        }

        // Runtime: assume score 0-10
        if (evaluation.runtime !== null && evaluation.runtime !== undefined) {
            totalRuntime += parseFloat(evaluation.runtime);
            countRuntime++;
        }

        // error_made: count errors
        if (evaluation.error_made !== null && evaluation.error_made !== undefined) {
            totalErrors += parseFloat(evaluation.error_made);
        }
    });

    const accuracy = countCorrectness > 0 ? (totalCorrectness / countCorrectness) * 10 : 0;
    const efficiency = countRuntime > 0 ? (totalRuntime / countRuntime) * 10 : 0;
    const avgTime = countTime > 0 ? (totalTime / countTime) * 10 : 0;
    const style = countLineCode > 0 ? (totalLineCode / countLineCode) * 10 : 0;
    const errors = countTime > 0 ? (totalErrors / countTime) * 10 : 0; // average errors per test * 10

    return {
        averages: [accuracy, efficiency, avgTime, style, errors],
        totalCorrect,
        countCorrectness,
        totalPoints
    };
}

/**
 * Populate the UI with results data
 * @param {number} overall - Overall progress points
 * @param {Array} averages - [accuracy %, efficiency /10, time m, style /10, errors, recent score]
 * @param {number} totalCorrect - Total sum of scores
 * @param {number} countCorrectness - Total number of tests * max_per_test
 * @param {number} totalPoints - Total points earned
 */
function populateUI(overall, averages, totalCorrect, countCorrectness, totalPoints) {
    let countTestsTaken = countCorrectness / 10; // Assuming max_per_test = 10
    let avgScore = countTestsTaken > 0 ? totalCorrect / countTestsTaken : 0;
    let overallPercent;
    if (totalCorrect === 17 && countCorrectness === 20) {
        // Default data: average score 8.5, so 85%
        overallPercent = 85.0;
    } else {
        overallPercent = avgScore * 10; // Convert average score (out of 10) to percentage
    }

    // Overall score: percentage based on average of test scores
    const overallElement = document.getElementById('overall-score');
    if (overallElement) {
        overallElement.textContent = `${overallPercent}%`;
    }

    // Score fraction: shows number of tests taken
    const fractionElement = document.getElementById('score-fraction');
    if (fractionElement) {
        fractionElement.textContent = `${countTestsTaken} test${countTestsTaken !== 1 ? 's' : ''}`;
    }

    // Determine number of unlocked cards based on overall progress thresholds
    let unlockedCards = 1;
    if (overall >= 100) unlockedCards = 2;
    if (overall >= 150) unlockedCards = 3;
    if (overall >= 200) unlockedCards = 4;
    if (overall >= 250) unlockedCards = 5;
    if (overall >= 300) unlockedCards = 6;

    // Define unlock levels for each card
    const unlockLevels = {
        1: 'Novice',
        2: 'Intermediate',
        3: 'Advanced',
        4: 'Expert'
    };

    // Smaller cards: select all text-2xl font-bold white spans in grid
    const cards = document.querySelectorAll('.grid.grid-cols-3 .text-2xl.font-bold.text-white');
    const cardIcons = document.querySelectorAll('.grid.grid-cols-3 .w-6.h-6');
    if (cards.length >= 6) {
        const [accuracy, efficiency, time, style, errors] = averages;

        for (let i = 0; i < 6; i++) {
            const isUnlocked = i === 5 || i < unlockedCards;
            if (isUnlocked) {
                // Set values for unlocked cards
                if (i < 5) {
                    cards[i].textContent = `${averages[i]}%`;
                } else {
                    cards[i].textContent = `${totalPoints} pts`;
                }
                // Set original icon and color
                if (cardIcons[i]) {
                    const originalIcons = ['target', 'code', 'clock', 'zap', 'alert-triangle', 'star'];
                    cardIcons[i].setAttribute('data-lucide', originalIcons[i]);
                    cardIcons[i].style.color = ''; // reset to original color
                }
            } else {
                // Set locked state
                cards[i].textContent = `${unlockLevels[i]}`;
                if (cardIcons[i]) {
                    cardIcons[i].setAttribute('data-lucide', 'lock');
                    cardIcons[i].style.color = '#9ca3af'; // gray-400
                }
            }
        }
    }

    // Rerender icons after attribute changes
    lucide.createIcons();

    // Update total points description if present
    const totalPtsElement = document.querySelector('.grid.grid-cols-3 .text-xs.text-gray-500');
    if (totalPtsElement && totalPtsElement.textContent.includes('Total:')) {
        totalPtsElement.textContent = `Recent: ${averages[5]} pts`;
    }

    console.log('UI populated with results:', { overall, averages, totalCorrect, countCorrectness });
}
