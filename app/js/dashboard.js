import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Load and display user's profile and level data on the dashboard
 * @param {string} userId - The user's ID
 * @param {boolean} recreateIcons - Whether to recreate Lucide icons after updates
 */
export async function loadUserLevelData(userId, recreateIcons = true) {
    try {
        console.log('Attempting to load user data for user:', userId);

        // First, fetch user's profile data
        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', userId)
            .single();

        if (profileError) {
            console.error('Error fetching profile data:', profileError);
        } else if (profileData) {
            // Update welcome message with user's name
            updateWelcomeMessage(profileData.first_name, profileData.last_name);
        }

        // Then fetch user's level data from Level table
        const { data: levelData, error } = await supabase
            .from('level')
            .select('Level_status, Progress')
            .eq('Profile_id', userId)
            .single();

        console.log('Level Supabase response:', { data: levelData, error });

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            console.error('Error fetching level data:', error);
            alert('Error loading level data: ' + error.message);
            return;
        }

        if (levelData) {
            console.log('Level data found, updating UI...', levelData);

            // Calculate actual level based on progress (in case database is not updated)
            const actualLevel = calculateLevelFromProgress(levelData.Progress);

            // Update level badge
            updateLevelBadge(actualLevel);

            // Update progress bar and stats
            await updateProgressBar(actualLevel, levelData.Progress, userId);

            // Update level milestones
            updateLevelMilestones(actualLevel);

            if (recreateIcons) {
                // Reinitialize Lucide icons after DOM updates
                if (window.lucide) {
                    window.lucide.createIcons();
                }
            }

            console.log('Level data loaded and UI updated:', levelData);
            return levelData;
        } else {
            console.log('No level data found for user - this is normal for new users');
            // Try to initialize level data for new users
            const initializedData = await initializeUserLevel(userId, 'Beginner', 0);
            if (initializedData) {
                console.log('Initialized new user level data, reloading UI...');
                return loadUserLevelData(userId, recreateIcons);
            }
            return null;
        }
    } catch (err) {
        console.error('Error loading user data:', err);
        alert('Failed to load user data: ' + err.message);
        return null;
    }
}

/**
 * Update the welcome message with user's actual name
 * @param {string} firstName - User's first name
 * @param {string} lastName - User's last name
 */
export function updateWelcomeMessage(firstName, lastName) {
    const welcomeMessage = document.getElementById('welcome-message');
    if (welcomeMessage) {
        let displayName = 'User';
        if (firstName && lastName) {
            displayName = `${firstName} ${lastName}`;
        } else if (firstName) {
            displayName = firstName;
        } else if (lastName) {
            displayName = lastName;
        }
        welcomeMessage.textContent = `Welcome back, ${displayName}!`;
    }
}

/**
 * Update the level badge display
 * @param {string} levelStatus - The user's current level
 */
export function updateLevelBadge(levelStatus) {
    const levelBadge = document.querySelector('.inline-flex.items-center.space-x-2');
    if (levelBadge) {
        const levelText = levelBadge.querySelector('span');
        if (levelText) {
            levelText.textContent = levelStatus.toUpperCase();
        }
    }
}

/**
 * Update the progress bar and related stats
 * @param {string} levelStatus - The user's current level
 * @param {number} progress - The user's current progress points
 * @param {string} userId - The user's ID for stats
 */
export async function updateProgressBar(levelStatus, progress, userId) {
    // Calculate total points and progress percentage
    const pointsByLevel = {
        'Beginner': { min: 0, max: 100 },
        'Novice': { min: 101, max: 150 },
        'Intermediate': { min: 151, max: 200 },
        'Advanced': { min: 201, max: 250 },
        'Expert': { min: 251, max: 300 }
    };

    const levelConfig = pointsByLevel[levelStatus] || pointsByLevel['Beginner'];

    const levelData = { ...levelConfig, current: progress };

    // Update progress display
    const progressText = document.querySelector('.flex.items-center.justify-between.mb-3 span:last-child');
    if (progressText) {
        progressText.textContent = `${levelData.current} / ${levelData.max} pts`;
    }

    // Update progress bar width (relative to level range)
    const progressBar = document.querySelector('.bg-gradient-to-r.from-emerald-500');
    if (progressBar) {
        const relativeProgress = levelData.current - levelConfig.min;
        const relativeMax = levelConfig.max - levelConfig.min;
        const percentage = Math.min((relativeProgress / relativeMax) * 100, 100);
        progressBar.style.width = `${percentage}%`; // Bar resets to 0% when entering new level
    }

    // Update progress description
    const progressDesc = document.querySelector('.text-gray-400.mt-2');
    if (progressDesc) {
        const remaining = levelData.max - levelData.current;
        if (remaining > 0) {
            const nextLevel = levelStatus === 'Expert' ? 'Master' : getNextLevel(levelStatus);
            progressDesc.textContent = `${remaining} points to ${nextLevel} level`;
        } else {
            progressDesc.textContent = `${levelStatus} level completed!`;
        }
    }

    // Update stats (total points, completed, accuracy)
    await updateDashboardStats(userId);
}

/**
 * Update dashboard statistics from Supabase
 * @param {string} userId - The user's ID
 */
export async function updateDashboardStats(userId) {
    try {
        // Get user's evaluations for both completed count and accuracy calculation
        const { data: userEvaluations, error: evalError } = await supabase
            .from('evaluation')
            .select('id')
            .eq('profile_id', userId);

        const completedCount = userEvaluations ? userEvaluations.length : 0;

        // Get average accuracy - average score of all tests taken
        let accuracy = 0;
        if (userEvaluations && userEvaluations.length > 0) {
            const evaluationIds = userEvaluations.map(e => e.id);
            const { data: results, error: resultError } = await supabase
                .from('result')
                .select('Score')
                .in('Evaluation_id', evaluationIds);

            if (!resultError && results && results.length > 0) {
                const totalScore = results.reduce((sum, r) => sum + (r.Score || 0), 0);
                accuracy = totalScore / results.length;
            }
        }

        // Update total points (from level.progress)
        const { data: levelData, error: levelError } = await supabase
            .from('level')
            .select('Progress')
            .eq('Profile_id', userId)
            .single();

        // Update the DOM - find each stat card individually
        // Total Points (first stat card)
        const totalPointsEl = document.querySelectorAll('.grid.grid-cols-3 .text-2xl.font-bold')[0];
        if (totalPointsEl) {
            totalPointsEl.textContent = !levelError && levelData ? levelData.Progress || 0 : 0;
        }

        // Completed (second stat card)
        const completedEl = document.querySelectorAll('.grid.grid-cols-3 .text-2xl.font-bold')[1];
        if (completedEl) {
            completedEl.textContent = completedCount;
        }

        // Accuracy (third stat card) - average score as percentage
        const accuracyEl = document.querySelectorAll('.grid.grid-cols-3 .text-2xl.font-bold')[2];
        if (accuracyEl) {
            accuracyEl.textContent = accuracy > 0 ? `${accuracy * 10}%` : '0%';
        }

        // Debug logging
        console.log('DEBUG - Stats update - Points:', (!levelError && levelData ? levelData.Progress || 0 : 0), 'Completed:', completedCount, 'Accuracy:', accuracy > 0 ? `${accuracy * 10}%` : '0%');

    } catch (error) {
        console.error('Error updating dashboard stats:', error);
        // Keep default 0 values if error
    }
}



/**
 * Get the next level name
 * @param {string} currentLevel - Current level name
 * @returns {string} Next level name
 */
function getNextLevel(currentLevel) {
    const levels = ['Beginner', 'Novice', 'Intermediate', 'Advanced', 'Expert'];
    const currentIndex = levels.indexOf(currentLevel);
    return currentIndex < levels.length - 1 ? levels[currentIndex + 1] : 'Expert';
}

/**
 * Update the level milestone indicators
 * @param {string} currentLevel - The user's current level
 */
export function updateLevelMilestones(currentLevel) {
    const levels = ['Beginner', 'Novice', 'Intermediate', 'Advanced', 'Expert'];
    const currentIndex = levels.indexOf(currentLevel);

    // Update milestone circles
    const milestoneCircles = document.querySelectorAll('.text-center > div:first-child');
    milestoneCircles.forEach((circle, index) => {
        circle.className = 'w-12 h-12 rounded-full flex items-center justify-center mb-1';

        if (index < currentIndex) {
            // Completed levels
            circle.className += ' bg-emerald-500';
            const icon = circle.querySelector('i');
            if (icon) icon.setAttribute('data-lucide', 'check');
        } else if (index === currentIndex) {
            // Current level
            circle.className += ' bg-emerald-500 ring-4 ring-emerald-500/30';
            const icon = circle.querySelector('i');
            if (icon) icon.setAttribute('data-lucide', 'zap');
        } else {
            // Future levels
            circle.className += ' bg-gray-700';
            const icon = circle.querySelector('i');
            if (index === levels.length - 1) {
                // Expert level gets crown
                if (icon) icon.setAttribute('data-lucide', 'crown');
            } else {
                if (icon) icon.setAttribute('data-lucide', 'lock');
            }
        }
    });

    // Update progress lines
    const progressLines = document.querySelectorAll('.w-16.h-1');
    progressLines.forEach((line, index) => {
        if (index < currentIndex) {
            line.className = 'w-16 h-1 bg-emerald-500';
        } else {
            line.className = 'w-16 h-1 bg-gray-700';
        }
    });

    // Update level labels - current level highlighted
    const levelLabels = document.querySelectorAll('.text-center p:first-of-type');
    levelLabels.forEach((label, index) => {
        if (index === currentIndex) {
            label.className = 'text-xs text-emerald-500 font-medium';
        } else {
            label.className = 'text-xs text-gray-400';
        }
    });
}

/**
 * Initialize level system with default data for new users
 * @param {string} userId - The user's ID
 * @param {string} initialLevel - Initial level to set (default: Beginner)
 * @param {number} initialProgress - Initial progress points (default: 0)
 */
export async function initializeUserLevel(userId, initialLevel = 'Beginner', initialProgress = 0) {
    try {
        // Check if user already has level data
        const { data: existingLevel, error: checkError } = await supabase
            .from('level')
            .select('id')
            .eq('Profile_id', userId)
            .single();

        if (existingLevel) {
            console.log('User level already initialized');
            return existingLevel;
        }

        // Create initial level data
        const { data: newLevel, error: insertError } = await supabase
            .from('level')
            .insert({
                Profile_id: userId,
                Level_status: initialLevel,
                Progress: initialProgress
            })
            .select()
            .single();

        if (insertError) {
            console.error('Error initializing level:', insertError);
            return null;
        }

        console.log('User level initialized:', newLevel);
        return newLevel;
    } catch (err) {
        console.error('Error initializing user level:', err);
        return null;
    }
}

/**
 * Update user's level progress
 * @param {string} userId - The user's ID
 * @param {number} pointsEarned - Points to add to progress
 */
export async function updateUserProgress(userId, pointsEarned) {
    try {
        // Get current level data
        const { data: currentLevel, error: fetchError } = await supabase
            .from('level')
            .select('Level_status, Progress')
            .eq('Profile_id', userId)
            .single();

        if (fetchError) {
            console.error('Error fetching current level:', fetchError);
            return null;
        }

        const newProgress = currentLevel.Progress + pointsEarned;
        const newLevel = calculateLevelFromProgress(newProgress);

        // Update level data
        const { data: updatedLevel, error: updateError } = await supabase
            .from('level')
            .update({
                Level_status: newLevel,
                Progress: newProgress
            })
            .eq('Profile_id', userId)
            .select()
            .single();

        if (updateError) {
            console.error('Error updating progress:', updateError);
            return null;
        }

        console.log('Progress updated:', updatedLevel);
        return updatedLevel;
    } catch (err) {
        console.error('Error updating user progress:', err);
        return null;
    }
}

/**
 * Calculate level based on total progress points
 * @param {number} totalProgress - Total progress points
 * @returns {string} Level name
 */
export function calculateLevelFromProgress(totalProgress) {
    if (totalProgress >= 251) return 'Expert';
    if (totalProgress >= 201) return 'Advanced';
    if (totalProgress >= 151) return 'Intermediate';
    if (totalProgress >= 101) return 'Novice';
    return 'Beginner';
}

/**
 * Load and display upcoming tests based on user level or selected difficulty
 * @param {string} userId - The user's ID
 * @param {string} levelStatus - The user's current level
 * @param {string} selectedDifficulty - Optional selected difficulty from dropdown
 */
export async function loadUpcomingTests(userId, levelStatus, selectedDifficulty = null) {
    try {
        // Get questions already completed by the user to exclude them
        const { data: completedEvaluations, error: evalError } = await supabase
            .from('evaluation')
            .select('Question_id')
            .eq('profile_id', userId);

        const completedQuestionIds = completedEvaluations ? completedEvaluations.map(e => e.Question_id) : [];

        // Fetch up to 5 questions from the question table for the selected difficulty, excluding completed ones
        const currentDifficulty = selectedDifficulty || levelStatus;

        // First get all questions for the difficulty
        const { data: allQuestions, error: qError } = await supabase
            .from('question')
            .select('Question_id, Title, Category')
            .eq('Difficulty', currentDifficulty);

        if (qError) throw qError;

        // Filter out completed questions in JavaScript
        const availableQuestions = allQuestions.filter(q => !completedQuestionIds.includes(q.Question_id));

        // Take only 5 questions for display
        const questions = availableQuestions.slice(0, 5);

        if (qError) throw qError;

        // Function to get icon and color based on category
        function getCategoryIcon(category) {
            const categoryMap = {
                'Arrays': { icon: 'file-text', iconColor: 'blue' },
                'Strings': { icon: 'terminal', iconColor: 'emerald' },
                'String': { icon: 'terminal', iconColor: 'emerald' }, // Handle both "Strings" and "String"
                'Data Structures': { icon: 'database', iconColor: 'purple' },
                'Algorithms': { icon: 'cpu', iconColor: 'orange' },
                'Hash Maps': { icon: 'hash', iconColor: 'red' },
                'Two Pointers': { icon: 'move', iconColor: 'cyan' },
                'Conditionals': { icon: 'split', iconColor: 'lime' },
                'Loops': { icon: 'repeat', iconColor: 'yellow' },
                'Math': { icon: 'calculator', iconColor: 'cyan' },
                'Basic Logic': { icon: 'zap', iconColor: 'yellow' },
            };
            return categoryMap[category] || { icon: 'code', iconColor: 'gray' };
        }

        // Check if user level requires timed tests
        const isTimed = ['Intermediate', 'Advanced', 'Expert'].includes(levelStatus);

        // Map questions to test display objects
        const tests = (questions || []).map((question, index) => {
            console.log(`Question ${index + 1} category: "${question.Category}"`);
            const { icon, iconColor } = getCategoryIcon(question.Category);
            console.log(`Icon for category "${question.Category}": ${icon}`);
            return {
                name: question.Title,
                duration: `${45 + (index * 15)} minutes`, // Vary duration
                icon: icon,
                iconColor: iconColor,
                param: `question-${question.Question_id}`,
                isTimed: isTimed
            };
        });



        // Update the upcoming tests section
        const upcomingContainer = document.querySelector('.bg-gray-900.rounded-xl.p-6.border.border-gray-800 .space-y-4');
        if (!upcomingContainer) return;

        upcomingContainer.innerHTML = '';

        if (!tests || tests.length === 0) {
            // Show message when no available tests
            const noTestsDiv = document.createElement('div');
            noTestsDiv.className = 'text-center py-8 text-gray-400';
            noTestsDiv.innerHTML = `
                <p>You've completed all available tests at this difficulty level!</p>
                <p class="text-sm mt-2">Try another difficulty or check back later for new questions.</p>
            `;
            upcomingContainer.appendChild(noTestsDiv);
            return;
        }

        tests.forEach((test, index) => {
            const testDiv = document.createElement('div');
            testDiv.className = 'bg-gray-800/50 rounded-lg p-4 border border-gray-700 hover:border-emerald-500/50 transition';
            testDiv.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-4">
                        <div class="w-12 h-12 bg-${test.iconColor}-500/20 rounded-lg flex items-center justify-center">
                            <i data-lucide="${test.icon}" class="w-6 h-6 text-${test.iconColor}-500"></i>
                        </div>
                        <div>
                            <h4 class="text-white font-semibold">${test.name}</h4>
                            ${test.isTimed ? `<p class="text-sm text-gray-400 flex items-center space-x-1">
                                <i data-lucide="clock" class="w-3 h-3 text-yellow-500"></i>
                                <span>${test.duration}</span>
                            </p>` : ''}
                        </div>
                    </div>

                    <button
                        onclick="window.location.href='test-runner.html?test=${test.param}'"
                        class="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-lg transition flex items-center space-x-2"
                    >
                        <i data-lucide='play' class='w-4 h-4'></i>
                        <span>${index === 0 ? 'Start Test' : 'Preview'}</span>
                    </button>
                </div>
            `;
            upcomingContainer.appendChild(testDiv);
        });

        // Re-render icons
        if (window.lucide) {
            window.lucide.createIcons();
        }

    } catch (error) {
        console.error('Error loading upcoming tests:', error);
    }
}

/**
 * Load and display recent completions
 * @param {string} userId - The user's ID
 */
export async function loadRecent(userId) {
    try {
        // Get recent evaluations for the user, limit to 5, ordered by date desc
        const { data: evaluations, error } = await supabase
            .from('evaluation')
            .select('id, Question_id, created_at')
            .eq('profile_id', userId)
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) throw error;
        console.log('Evaluations found:', evaluations ? evaluations.length : 0);

        // Get question details for each evaluation
        const evaluationsWithDetails = [];
        for (const evaluation of evaluations) {
            try {
                const { data: question, error: qError } = await supabase
                    .from('question')
                    .select('Title, Category, Difficulty')
                    .eq('Question_id', evaluation.Question_id)
                    .single();

                // If question doesn't exist or error, use fallback
                const questionData = (!qError && question) ? question : {
                    Title: 'Question No Longer Available',
                    Category: 'N/A',
                    Difficulty: 'Unknown'
                };

                evaluationsWithDetails.push({
                    ...evaluation,
                    Question: questionData
                });
            } catch (err) {
                console.error('Error fetching question details:', err);
                evaluationsWithDetails.push({
                    ...evaluation,
                    Question: {
                        Title: 'Question No Longer Available',
                        Category: 'N/A',
                        Difficulty: 'Unknown'
                    }
                });
            }
        }

        // Update the recent completions table
        const tableBody = document.querySelector('.bg-gray-900.rounded-xl.p-6.border.border-gray-800 table tbody');
        if (!tableBody) return;

        tableBody.innerHTML = '';

        if (!evaluations || evaluations.length === 0) {
            // Show no recent completions message
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="6" class="py-8 text-center text-gray-400">
                    No recent test completions found. Start practicing to see your results here!
                </td>
            `;
            tableBody.appendChild(row);
            return;
        }

        // Process evaluations serially since calculateScore is async
        for (const evalData of evaluationsWithDetails) {
            const score = await calculateScore(evalData); // Wait for the async function
            const level = evalData.Question.Difficulty;
            const date = new Date(evalData.created_at).toLocaleDateString();

            const iconColor = getLevelIconColor(level);

            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-800/50 transition';
            row.innerHTML = `
                <td class="py-4">
                    <div class="flex items-center space-x-3">
                        <div class="w-8 h-8 bg-${iconColor}-500/20 rounded flex items-center justify-center">
                            <i data-lucide="code" class="w-4 h-4 text-${iconColor}-500"></i>
                        </div>
                        <span class="text-white font-medium">${evalData.Question.Title}</span>
                    </div>
                </td>
                <td class="py-4 text-gray-400">${date}</td>
                <td class="py-4">
                    <span class="${getScoreColor(score * 10)} font-bold">${score * 10}%</span>
                </td>
                <td class="py-4">
                    <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getLevelBadgeClass(level)}">
                        ${level}
                    </span>
                </td>
                <td class="py-4">
                    <span class="${getScoreColor(score * 10)} font-bold">${score}</span>
                </td>
                <td class="py-4">
                    <button class="text-emerald-500 hover:text-emerald-400 text-sm font-medium">View Details</button>
                </td>
            `;

            tableBody.appendChild(row);
        }

        // Re-render icons
        if (window.lucide) {
            window.lucide.createIcons();
        }

    } catch (error) {
        console.error('Error loading recent completions:', error);
        // Show error message
        const tableBody = document.querySelector('.bg-gray-900.rounded-xl.p-6.border.border-gray-800 table tbody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="py-8 text-center text-red-400">
                        Error loading recent completions. Please try refreshing the page.
                    </td>
                </tr>
            `;
        }
    }
}

/**
 * Calculate score from evaluation data
 * @param {object} eval - Evaluation data
 * @returns {number} Score from database (0-10)
 */
async function calculateScore(evalData) {
    try {
        // Get the actual score from the result table for this evaluation
        const { data: result, error } = await supabase
            .from('result')
            .select('Score')
            .eq('Evaluation_id', evalData.id)
            .single();

        if (!error && result && result.Score !== null) {
            // Return the raw score from database (0-10 scale)
            console.log('Raw score from database:', result.Score);
            return result.Score;
        }
    } catch (err) {
        console.error('Error fetching score for evaluation:', evalData.id, err);
    }

    // Fallback to mock score if no result found (0-10 scale)
    return Math.floor(Math.random() * 40) / 10 + 6; // 6.0-10.0
}

/**
 * Get color for score display
 * @param {number} score - Score percentage
 * @returns {string} CSS class
 */
function getScoreColor(score) {
    if (score >= 90) return 'text-emerald-500';
    if (score >= 80) return 'text-blue-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
}

/**
 * Get badge class for level
 * @param {string} level - Difficulty level
 * @returns {string} CSS class
 */
function getLevelBadgeClass(level) {
    const classes = {
        'Beginner': 'bg-emerald-500/20 text-emerald-500',
        'Novice': 'bg-blue-500/20 text-blue-500',
        'Intermediate': 'bg-yellow-500/20 text-yellow-500',
        'Advanced': 'bg-orange-500/20 text-orange-500',
        'Expert': 'bg-purple-500/20 text-purple-500'
    };
    return classes[level] || 'bg-gray-500/20 text-gray-500';
}

/**
 * Get icon color based on level
 * @param {string} level - Difficulty level
 * @returns {string} Color name
 */
function getLevelIconColor(level) {
    const colors = {
        'Beginner': 'emerald',
        'Novice': 'blue',
        'Intermediate': 'yellow',
        'Advanced': 'orange',
        'Expert': 'purple'
    };
    return colors[level] || 'gray';
}

/**
 * Initialize the difficulty dropdown functionality
 * @param {string} userId - The user's ID
 */
export function initializeDifficultyDropdown(userId) {
    const dropdownBtn = document.getElementById('difficulty-dropdown-btn');
    const dropdown = document.getElementById('difficulty-dropdown');
    const currentDifficultyText = document.getElementById('current-difficulty-text');

    if (!dropdownBtn || !dropdown) return;

    // Set initial text to user's current level
    if (window.currentLevel && currentDifficultyText) {
        const levelOptions = {
            'Beginner': 'Beginner Level',
            'Novice': 'Novice Level',
            'Intermediate': 'Intermediate Level',
            'Advanced': 'Advanced Level',
            'Expert': 'Expert Level'
        };
        const displayText = levelOptions[window.currentLevel] || 'Level Difficulty';
        currentDifficultyText.textContent = displayText;
    }

    // Toggle dropdown on button click
    dropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = dropdown.classList.contains('hidden');
        dropdown.classList.toggle('hidden');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && !dropdownBtn.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });

    // Show only difficulty levels the user can access (current level and below)
    const allLevels = ['Beginner', 'Novice', 'Intermediate', 'Advanced', 'Expert'];
    const currentLevelIndex = allLevels.indexOf(window.currentLevel);
    const accessibleLevels = allLevels.slice(0, currentLevelIndex + 1);

    // Hide/filter difficulty filter buttons
    const filterButtons = dropdown.querySelectorAll('.difficulty-filter');
    filterButtons.forEach(button => {
        const difficulty = button.getAttribute('data-difficulty');
        if (accessibleLevels.includes(difficulty)) {
            button.style.display = 'block';
        } else {
            button.style.display = 'none';
        }

        button.addEventListener('click', async () => {
            const buttonDifficulty = button.getAttribute('data-difficulty');
            const buttonText = button.textContent.trim();

            // Update dropdown text
            currentDifficultyText.textContent = buttonText;

            // Close dropdown
            dropdown.classList.add('hidden');

            // Reload tests with selected difficulty
            await loadUpcomingTests(userId, window.currentLevel, buttonDifficulty);
        });
    });
}
