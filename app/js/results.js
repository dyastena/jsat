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
            // Fixed: time should be 3.8 not 38 (normalized scale where 30 minutes is be 3.0 in 10s scale)
            const defaultAverages = [0, 8.5, 3.8, 7.8, 2, 18];
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

        // Fetch all user's results with scores and cart_eval, joining with questions
        const { data: resultData, error: resultAllError } = await supabase
            .from('result')
            .select(`
                score,
                cart_eval,
                evaluation_id,
                evaluation!inner(question_id, question!inner(title, category, difficulty))
            `)
            .in('evaluation_id', evaluationData.map(e => e.id));

        if (resultAllError) {
            console.error('Error fetching all result data:', resultAllError);
            return { averages: [0, 0, 0, 0, 0] };
        }

        console.log('All result data with questions:', resultData);

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

        return {
            averages: calculation.averages,
            totalScore: totalCorrect,
            testCount: countTestsTaken,
            testResults: resultData || []  // Include detailed test results with titles, scores, cart_eval
        };

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
 * Populate the CART Skill Classification card showing overall performance and individual factors
 * @param {number} totalScore - Total score from all user's test results
 * @param {number} testCount - Number of tests taken by the user
 * @param {Array} averages - [accuracy, efficiency, avgTime, style, errors] all 0-10
 */
export function populateClassificationCard(totalScore, testCount, averages) {
    try {
        console.log('Populating classification card with totalScore:', totalScore, 'testCount:', testCount);

        // Validate input
        if (typeof totalScore !== 'number' || typeof testCount !== 'number') {
            console.error('Invalid input - totalScore:', totalScore, 'testCount:', testCount);
            totalScore = 0;
            testCount = 1;
        }

        // Calculate average score per test (assuming each test is out of 10)
        const avgScorePerTest = testCount > 0 ? totalScore / testCount : 0;
        const avgScoreScaled = Math.min(10, Math.max(0, avgScorePerTest)); // Cap at 0-10 scale

        console.log('Calculated scores:', { totalScore, testCount, avgScorePerTest, avgScoreScaled });

        // Determine classification level based on average score (0-10 scale)
        let level = 'RANK D';
        let description = 'Fundamental coding abilities with basic comprehension';
        let icon = 'trending-up';

        if (avgScoreScaled <= 2) {
            level = 'RANK D';
            description = 'Fundamental coding abilities with basic comprehension';
            icon = 'trending-up';
        } else if (avgScoreScaled <= 4) {
            level = 'RANK C';
            description = 'Growing competency with emerging problem-solving skills';
            icon = 'zap';
        } else if (avgScoreScaled <= 6) {
            level = 'RANK B';
            description = 'Established problem-solving with reliable code execution';
            icon = 'target';
        } else if (avgScoreScaled <= 8) {
            level = 'RANK A';
            description = 'Advanced efficiency and code quality across multiple domains';
            icon = 'star';
        } else {
            level = 'RANK S';
            description = 'Elite mastery with exceptional coding skills';
            icon = 'award';
        }

        console.log('Classification determined:', { level, description, icon, avgScoreScaled });

        // Update elements
        const levelEl = document.getElementById('classification-level');
        if (levelEl) {
            levelEl.textContent = level;
        }

        const iconEl = document.getElementById('classification-icon');
        if (iconEl) {
            iconEl.setAttribute('data-lucide', icon);
        }

        const descEl = document.getElementById('classification-description');
        if (descEl) {
            descEl.textContent = description;
        }

        // Calculate scores for each skill (using the averages passed in)
        const [accuracy, efficiency, avgTime, style, errors] = averages || [0, 0, 0, 0, 0];

        const problemSolving = Math.max(0, Math.min(10, accuracy || 0));
        const algorithmDesign = Math.max(0, Math.min(10, efficiency || 0));
        const codeQuality = Math.max(0, Math.min(10, style || 0));
        const timeEfficiency = Math.max(0, Math.min(10, avgTime === 0 ? 0 : Math.max(0, 10 - avgTime)));
        const errorHandling = errors === 0 ? 0 : Math.max(0, Math.min(10, 10 - errors));

        // Update the individual skill factors - show all for all levels
        const metrics = [
            { id: 'problem-solving', score: problemSolving },
            { id: 'algorithm-design', score: algorithmDesign },
            { id: 'code-quality', score: codeQuality },
            { id: 'time-efficiency', score: timeEfficiency },
            { id: 'error-handling', score: errorHandling }
        ];

        // Map classification factors to correspond with the small card display order
        // Small cards show: [0]Accuracy, [3]Code Style, [2]Time Taken, [1]Code Efficiency, [4]Errors
        const factorMappings = [
            { id: 'problem-solving', averageIndex: 0 },  // maps to Accuracy %
            { id: 'algorithm-design', averageIndex: 3 },  // maps to Code Style %
            { id: 'code-quality', averageIndex: 2 },     // maps to Time Taken %
            { id: 'time-efficiency', averageIndex: 1 },  // maps to Code Efficiency %
            { id: 'error-handling', averageIndex: 4 }    // maps to Errors %
        ];

        console.log('Populating factor scores:', factorMappings);

        factorMappings.forEach(mapping => {
            const scoreEl = document.getElementById(`${mapping.id}-score`);
            const barEl = document.getElementById(`${mapping.id}-bar`);
            const percentageValue = averages[mapping.averageIndex] || 0;
            const decimalValue = percentageValue / 10;
            const displayValue = decimalValue % 1 === 0 ? decimalValue.toFixed(0) : decimalValue.toFixed(1);

            console.log(`Setting ${mapping.id}-score to: ${displayValue}/10`);
            console.log(`Setting ${mapping.id}-bar width to: ${percentageValue}%`);

            // Display as X/10 or X.X/10 format (decimal only if needed)
            if (scoreEl) scoreEl.textContent = `${displayValue}/10`;
            if (barEl) barEl.style.width = `${percentageValue}%`;  // Keep percentage for bar width
        });

        // Recreate lucide icons
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
        }

        console.log('Classification card populated successfully with overall score and individual factors');
    } catch (error) {
        console.error('Error populating classification card:', error);
    }
}

/**
 * Populate the question-by-question breakdown cards with real test data
 * @param {Array} testResults - Array of test results with question titles, scores, and cart_eval
 */
export function populateTestBreakdown(testResults) {
    try {
        console.log('Populating question-by-question cards with', testResults?.length || 0, 'results');

        const container = document.querySelector('.test-breakdown-container');

        if (!container) {
            console.warn('Test breakdown container not found');
            return;
        }

        // Clear existing content
        container.innerHTML = '';

        if (!testResults || testResults.length === 0) {
            // Show no tests message
            const noTestsCard = document.createElement('div');
            noTestsCard.className = 'bg-gray-800/50 rounded-lg p-4 border border-gray-700';
            noTestsCard.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-4 flex-1">
                        <div class="w-10 h-10 bg-gray-500 rounded-lg flex items-center justify-center">
                            <i data-lucide="help-circle" class="w-5 h-5 text-white"></i>
                        </div>
                        <div class="flex-1">
                            <h4 class="text-white font-semibold">No tests completed yet</h4>
                            <p class="text-sm text-gray-400">Complete tests to see detailed results here</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="text-gray-500 font-bold text-lg">--</p>
                        <p class="text-xs text-gray-400">Score</p>
                    </div>
                </div>
            `;
            container.appendChild(noTestsCard);
            return;
        }

        // Create a card for each test result
        testResults.forEach((result, index) => {
            const questionTitle = result.evaluation?.question?.title || 'Unknown Question';
            const score = result.score || 0;
            const cartEval = result.cart_eval || 'UNKNOWN';
            const category = result.evaluation?.question?.category || 'Unknown';
            const difficulty = result.evaluation?.question?.difficulty || 'Unknown';

            // Determine icon and color based on score
            let iconName = 'minus';
            let iconColor = 'yellow';
            let scoreText = '';
            let scoreColor = 'yellow';

            if (score >= 8) {
                iconName = 'check';
                iconColor = 'green';
                scoreText = 'Excellent';
                scoreColor = 'green';
            } else if (score >= 6) {
                iconName = 'check';
                iconColor = 'green';
                scoreText = 'Good';
                scoreColor = 'green';
            } else {
                iconName = 'minus';
                iconColor = 'yellow';
                scoreText = 'Partial credit';
            }

            const testCard = document.createElement('div');
            testCard.className = 'bg-gray-800/50 rounded-lg p-4 border border-gray-700';

            testCard.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-4 flex-1">
                        <div class="w-10 h-10 bg-${iconColor}-500 rounded-lg flex items-center justify-center">
                            <i data-lucide="${iconName}" class="w-5 h-5 text-white"></i>
                        </div>
                        <div class="flex-1">
                            <h4 class="text-white font-semibold">${index + 1}: ${questionTitle}</h4>
                            <p class="text-sm text-gray-400">${category} | ${difficulty} Level</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="text-emerald-500 font-bold text-lg">${score}/10</p>
                        <p class="text-sm text-gray-400">${cartEval}</p>
                    </div>
                </div>
            `;

            container.appendChild(testCard);
        });

        // Recreate lucide icons after adding new content
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
        }

        console.log('Question-by-question cards populated successfully');
    } catch (error) {
        console.error('Error populating question-by-question cards:', error);
    }
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
