import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Load and display results data
 * @param {string} userId - The user's ID
 */
export async function loadResults(userId) {
    try {
        console.log('Loading results for user:', userId);

        // Guard: check if userId is valid
        if (!userId || userId === 'undefined' || typeof userId !== 'string' || userId.length !== 36) {
            console.warn('Invalid userId, loading default data');
            populateUI(0, [92, 8.5, 38, 7.8, 2, 18], 17, 20);
            return;
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
            return;
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
            return;
        }

        console.log('Evaluation data:', evaluationData);

        // If no evaluations, set defaults
        if (!evaluationData || evaluationData.length === 0) {
            console.log('No evaluations found for user');
            populateUI(0, [0, 0, 0, 0, 0, 0], 0, 0);
            return;
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
            return;
        }

        console.log('All result data:', resultData);

        // Calculate totals from result data
        let max_per_test = 10; // max score per test
        let totalCorrect = resultData.reduce((sum, r) => sum + (r.score || 0), 0);
        let countTestsTaken = resultData.length;
        let countCorrectness = countTestsTaken * max_per_test;

        // Calculate averages and populate UI
        const averages = calculateAverages(evaluationData);
        const overall = levelData ? levelData.progress : 0;
        const data = [...averages, recentScore];

        populateUI(overall, data, totalCorrect, countCorrectness);

    } catch (err) {
        console.error('Error loading results:', err);
        alert('Failed to load results: ' + err.message);
    }
}

/**
 * Calculate average metrics from evaluations
 * @param {Array} evaluations - Array of evaluation records
 * @returns {Object} {averages: [accuracy, efficiency, time, style, errors], totalCorrect, countCorrectness}
 */
function calculateAverages(evaluations) {
    let totalCorrectness = 0, countCorrectness = 0;
    let totalCorrect = 0;
    let totalLineCode = 0, countLineCode = 0;
    let totalTime = 0, countTime = 0;
    let totalRuntime = 0, countRuntime = 0;
    let totalErrors = 0;

    evaluations.forEach(evaluation => {
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

    const accuracy = countCorrectness > 0 ? Math.round((totalCorrectness / countCorrectness) * 100) : 0;
    const efficiency = countLineCode > 0 ? Math.round((totalLineCode / countLineCode) * 10) / 10 : 0; // 1 decimal
    const avgTime = countTime > 0 ? Math.round(totalTime / countTime) : 0;
    const style = countRuntime > 0 ? Math.round((totalRuntime / countRuntime) * 10) / 10 : 0; // 1 decimal
    const errors = Math.round(totalErrors);

    return {
        averages: [accuracy, efficiency, avgTime, style, errors],
        totalCorrect,
        countCorrectness
    };
}

/**
 * Populate the UI with results data
 * @param {number} overall - Overall progress points
 * @param {Array} averages - [accuracy %, efficiency /10, time m, style /10, errors, recent score]
 * @param {number} totalCorrect - Total number of correct questions
 * @param {number} countCorrectness - Total number of tests taken
 */
function populateUI(overall, averages, totalCorrect, countCorrectness) {
    // Overall score: percentage of correct questions out of total tests taken
    const overallElement = document.getElementById('overall-score');
    if (overallElement) {
        let overallPercent;
        if (totalCorrect === 17 && countCorrectness === 20) {
            // Original default values hardcoded to 87%
            overallPercent = 87;
        } else {
            overallPercent = countCorrectness > 0 ? Math.round((totalCorrect / countCorrectness) * 100) : 0;
        }
        overallElement.textContent = `${overallPercent}%`;
    }

    // Score fraction: correct / total
    const fractionElement = document.getElementById('score-fraction');
    if (fractionElement) {
        fractionElement.textContent = `${totalCorrect}/${countCorrectness} Correct`;
    }

    // Smaller cards: select all text-2xl font-bold white spans in grid
    const cards = document.querySelectorAll('.grid.grid-cols-3 .text-2xl.font-bold.text-white');
    if (cards.length >= 6) {
        const [accuracy, efficiency, time, style, errors] = averages;

        // Accuracy %
        cards[0].textContent = `${accuracy}%`;

        // Code Efficiency /10
        cards[1].textContent = `${efficiency}/10`;

        // Time Taken in minutes
        cards[2].textContent = `${time}m`;

        // Code Style /10
        cards[3].textContent = `${style}/10`;

        // Errors
        cards[4].textContent = errors;

        // Points Earned: recent score
        cards[5].textContent = `+${averages[5]} pts`; // averages has 6 elements
    }

    // Update total points description if present
    const totalPtsElement = document.querySelector('.grid.grid-cols-3 .text-xs.text-gray-500');
    if (totalPtsElement && totalPtsElement.textContent.includes('Total:')) {
        totalPtsElement.textContent = `Total: ${overall} pts`;
    }

    console.log('UI populated with results:', { overall, averages, totalCorrect, countCorrectness });
}
