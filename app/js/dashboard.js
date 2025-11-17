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
            updateProgressBar(actualLevel, levelData.Progress);

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
 */
export function updateProgressBar(levelStatus, progress) {
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

    // Update total points stat
    const totalPointsStat = document.querySelector('.grid.grid-cols-3 .text-2xl.font-bold');
    if (totalPointsStat) {
        totalPointsStat.textContent = levelData.current;
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
