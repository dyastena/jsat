// Leaderboard management for JSAT

import { supabase } from './auth.js';

// Global variables to store data
let currentUser = null;
let currentProfile = null;
let leaderboardData = [];

// Export function to initialize leaderboard
export async function initializeLeaderboard(user, profile) {
    currentUser = user;
    currentProfile = profile;

    // Initialize filters and load data
    initializeFilters();
    await loadLeaderboard();
}

// Initialize filter event listeners
function initializeFilters() {
    // Level filter buttons
    const levelButtons = document.querySelectorAll('.filter-btn');
    levelButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove selected class from all level buttons
            levelButtons.forEach(btn => btn.classList.remove('selected'));
            // Add selected class to clicked button
            button.classList.add('selected');
            // Reload data with new filter
            loadLeaderboard();
        });
    });

    // Period filter buttons
    const periodButtons = document.querySelectorAll('.period-btn');
    periodButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove selected class from all period buttons
            periodButtons.forEach(btn => btn.classList.remove('selected'));
            // Add selected class to clicked button
            button.classList.add('selected');
            // Reload data with new filter (currently all time only)
            loadLeaderboard();
        });
    });

    // Refresh button
    const refreshButton = document.querySelector('button span');
    if (refreshButton && refreshButton.nextElementSibling && refreshButton.nextElementSibling.textContent === 'Refresh') {
        refreshButton.parentElement.addEventListener('click', () => {
            loadLeaderboard();
        });
    }
}

// Load leaderboard data from Supabase
async function loadLeaderboard() {
    try {
        // Get current level filter
        const selectedLevelBtn = document.querySelector('.filter-btn.selected');
        const levelFilter = selectedLevelBtn ? selectedLevelBtn.getAttribute('data-level') : 'all';

        // Get current period filter
        const selectedPeriodBtn = document.querySelector('.period-btn.selected');
        const periodFilter = selectedPeriodBtn ? selectedPeriodBtn.getAttribute('data-period') : 'all';

        // Try RPC function first, fallback to manual query if it fails
        let { data, error } = await supabase
            .rpc('get_leaderboard_data', {
                level_filter: levelFilter,
                period_filter: periodFilter
            });

        if (error || !data) {
            console.log('RPC failed, using fallback query:', error);
            // Fallback: manual query using the existing approach
            const fallbackData = await loadLeaderboardFallback(levelFilter);
            data = fallbackData;
        }

        leaderboardData = data || [];
        renderLeaderboard();
        updateUserRanking();

    } catch (error) {
        console.error('Error loading leaderboard:', error);
    }
}

// Process raw data into leaderboard format
function processLeaderboardData(rawData) {
    return rawData.map((item, index) => {
        const profile = item.profiles;

        return {
            id: profile?.id,
            rank: index + 1,
            first_name: profile?.first_name || 'Anonymous',
            last_name: profile?.last_name || '',
            username: createUsername(profile),
            total_points: item.Progress || 0,
            current_level: item.Level_status || 'Beginner',
            accuracy_percent: Math.round(item.accuracy || 0),
            total_tests: item.testCount || 0
        };
    });
}

// Render the leaderboard with real data
function renderLeaderboard() {
    // Update top 3 podium
    updateTop3Podium();

    // Update rankings table
    updateRankingsTable();
}

function updateTop3Podium() {
    if (leaderboardData.length < 3) return;

    const top3 = leaderboardData.slice(0, 3);

    // Update 2nd place
    const secondPlace = document.querySelector('.slide-up:nth-child(1)');
    if (secondPlace && top3[1]) {
        updatePodiumCard(secondPlace, top3[1], 2);
    }

    // Update 1st place
    const firstPlace = document.querySelector('.slide-up:nth-child(2)');
    if (firstPlace && top3[0]) {
        updatePodiumCard(firstPlace, top3[0], 1);
    }

    // Update 3rd place
    const thirdPlace = document.querySelector('.slide-up:nth-child(3)');
    if (thirdPlace && top3[2]) {
        updatePodiumCard(thirdPlace, top3[2], 3);
    }
}

function updatePodiumCard(card, userData, rank) {
    const rankNumber = card.querySelector('.rank-1, .rank-2, .rank-3');
    if (rankNumber) rankNumber.textContent = rank;

    const nameElement = card.querySelector('h4');
    if (nameElement) {
        nameElement.textContent = `${userData.first_name} ${userData.last_name}`.trim();
    }

    const usernameElement = card.querySelector('p.text-sm.text-gray-400');
    if (usernameElement) {
        usernameElement.textContent = `@${userData.username}`;
    }

    const scoreElement = card.querySelector('span.text-2xl, span.text-3xl');
    if (scoreElement) {
        scoreElement.textContent = Math.round(userData.total_points);
    }

    const levelBadge = card.querySelector('.bg-purple-500\\/20');
    if (levelBadge) {
        levelBadge.textContent = userData.current_level;
    }
}

function updateRankingsTable() {
    const tableBody = document.querySelector('tbody.divide-y');
    if (!tableBody) return;

    let html = '';

    leaderboardData.slice(3).forEach((user, index) => {
        const rank = index + 4;
        const isCurrentUser = user.id === currentUser.id;
        const rowClass = isCurrentUser ? 'bg-emerald-500/10 border-l-4 border-emerald-500 hover:bg-emerald-500/20' : 'hover:bg-gray-800/50';

        html += `
            <tr class="${rowClass} transition">
                <td class="px-6 py-4 text-white font-bold">${rank}</td>
                <td class="px-6 py-4">
                    <div class="flex items-center space-x-3">
                        <div class="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center">
                            <i data-lucide="user" class="w-5 h-5 text-gray-400"></i>
                        </div>
                        <div>
                            <p class="text-white font-medium">${user.first_name} ${user.last_name}</p>
                            <p class="text-xs text-gray-400">@${user.username}</p>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <span class="px-2 py-1 bg-${getLevelColor(user.current_level).bg} text-${getLevelColor(user.current_level).text} rounded text-xs font-medium">${user.current_level}</span>
                </td>
                <td class="px-6 py-4">
                    <div class="flex items-center space-x-1">
                        <i data-lucide="star" class="w-4 h-4 text-yellow-500"></i>
                        <span class="text-white font-semibold">${Math.round(user.total_points)}</span>
                    </div>
                </td>
                <td class="px-6 py-4 text-white">${user.accuracy_percent}%</td>
                <td class="px-6 py-4 text-white">${user.total_tests}</td>
                <td class="px-6 py-4">
                    <div class="flex items-center space-x-1">
                        ${getBadges(user)}
                    </div>
                </td>
            </tr>
        `;
    });

    tableBody.innerHTML = html;

    // Re-initialize icons for the new table rows
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }
}

function updateUserRanking() {
    const userData = leaderboardData.find(user => user.id === currentUser.id);
    if (!userData) return;

    // Update "Your Ranking" stats
    const userRankElement = document.querySelector('.text-5xl.font-bold.text-emerald-400');
    if (userRankElement) {
        userRankElement.textContent = '#' + userData.rank;
    }

    const userCountElement = document.querySelector('.text-sm.text-gray-400');
    if (userCountElement) {
        userCountElement.textContent = `out of ${leaderboardData.length} participants`;
    }

    // Update stats
    const pointsElement = document.querySelector('.text-white.font-semibold:nth-of-type(1)');
    if (pointsElement) pointsElement.textContent = Math.round(userData.total_points);

    const testsElement = document.querySelector('.text-white.font-semibold:nth-of-type(2)');
    if (testsElement) testsElement.textContent = userData.total_tests;

    const accuracyElement = document.querySelector('.text-white.font-semibold:nth-of-type(3)');
    if (accuracyElement) accuracyElement.textContent = userData.accuracy_percent + '%';
}

// Fallback function for leaderboard data loading using manual queries
async function loadLeaderboardFallback(levelFilter) {
    try {
        // First get level data
        let levelQuery = supabase
            .from('level')
            .select(`
                id,
                Progress,
                Level_status,
                Profile_id
            `)
            .order('Progress', { ascending: false });

        // Apply level filter if specified
        if (levelFilter && levelFilter !== 'all') {
            levelQuery = levelQuery.eq('Level_status', levelFilter);
        }

        const { data: levelData, error: levelError } = await levelQuery;

        if (levelError) {
            console.error('Fallback level query error:', levelError);
            return [];
        }

        // Get profile data for these profiles
        const profileIds = levelData.map(level => level.Profile_id);
        const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .in('id', profileIds)
            .eq('role', 'candidate');

        if (profilesError) {
            console.error('Fallback profiles query error:', profilesError);
            return [];
        }

        // Get evaluation data for accuracy calculation
        const evaluationsPromises = profileIds.map(profileId =>
            supabase
                .from('evaluation')
                .select('correctness')
                .eq('Profile_id', profileId)
        );

        const evaluationsResults = await Promise.all(evaluationsPromises);

        // Process data
        const processedData = levelData.map((level, index) => {
            const profile = profilesData.find(p => p.id === level.Profile_id);
            const evaluations = evaluationsResults[profileIds.indexOf(level.Profile_id)]?.data || [];
            const totalCorrectness = evaluations.reduce((sum, e) => sum + (e.correctness || 0), 0);
            const avgAccuracy = evaluations.length > 0 ? (totalCorrectness / evaluations.length) * 10 : 0;

            return {
                id: profile?.id || level.Profile_id,
                rank: index + 1,
                first_name: profile?.first_name || 'Anonymous',
                last_name: profile?.last_name || '',
                username: createUsername(profile),
                total_points: level.Progress || 0,
                current_level: level.Level_status || 'Beginner',
                accuracy_percent: Math.round(avgAccuracy),
                total_tests: evaluations.length
            };
        });

        return processedData;
    } catch (error) {
        console.error('Fallback leaderboard loading error:', error);
        return [];
    }
}

// Helper functions
function createUsername(user) {
    // Create a simple username from name or ID
    if (user.first_name && user.last_name) {
        return user.first_name.toLowerCase() + user.last_name.toLowerCase().replace(/\s+/g, '');
    }
    return user.id.substring(0, 8);
}

function getLevelColor(level) {
    const colors = {
        'Beginner': { bg: 'green-500/20', text: 'green-400' },
        'Novice': { bg: 'blue-500/20', text: 'blue-400' },
        'Intermediate': { bg: 'emerald-500/20', text: 'emerald-400' },
        'Advanced': { bg: 'orange-500/20', text: 'orange-400' },
        'Expert': { bg: 'purple-500/20', text: 'purple-400' }
    };
    return colors[level] || { bg: 'gray-500/20', text: 'gray-400' };
}

function getBadges(user) {
    let badges = '';

    if (user.total_points > 300) badges += '<i data-lucide="crown" class="w-4 h-4 text-yellow-500"></i>';
    if (user.total_tests > 20) badges += '<i data-lucide="target" class="w-4 h-4 text-emerald-500"></i>';
    if (user.accuracy_percent > 90) badges += '<i data-lucide="zap" class="w-4 h-4 text-orange-500"></i>';
    if (user.current_level === 'Expert') badges += '<i data-lucide="star" class="w-4 h-4 text-purple-500"></i>';

    return badges || '<i data-lucide="award" class="w-4 h-4 text-gray-500"></i>';
}
