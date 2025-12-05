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

// Show loading states
function showLoadingStates() {
    // Loading for top podium
    const topPodium = document.getElementById('top-podium');
    if (topPodium) {
        topPodium.innerHTML = `
            <div class="col-span-3">
                <div class="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center">
                    <div class="flex items-center justify-center space-x-3">
                        <div class="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent"></div>
                        <span class="text-gray-400 text-lg">Loading top performers...</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Loading for leaderboard table
    const tableBody = document.getElementById('leaderboard-tbody');
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-12 text-center">
                    <div class="flex items-center justify-center space-x-3">
                        <div class="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent"></div>
                        <span class="text-gray-400 text-lg">Loading leaderboard rankings...</span>
                    </div>
                </td>
            </tr>
        `;
    }
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
    // Show loading states
    showLoadingStates();
    
    try {
        // Get current level filter
        const selectedLevelBtn = document.querySelector('.filter-btn.selected');
        const levelFilter = selectedLevelBtn ? selectedLevelBtn.getAttribute('data-level') : 'all';

        // Get current period filter
        const selectedPeriodBtn = document.querySelector('.period-btn.selected');
        const periodFilter = selectedPeriodBtn ? selectedPeriodBtn.getAttribute('data-period') : 'all';

        console.log('Loading leaderboard with filters:', { levelFilter, periodFilter });

        // Use custom calculation instead of RPC function - calculate total points from evaluation metrics
        const data = await loadLeaderboardWithEvaluationSums(levelFilter);
        console.log('Leaderboard data with evaluation sums loaded: Type:', typeof data, 'Length:', data?.length);

        leaderboardData = data || [];
        renderLeaderboard();
        await updateUserRanking();

    } catch (error) {
        console.error('Error loading leaderboard:', error);
        // Fallback to existing RPC approach if needed
        await loadLeaderboardFallbackRPC();
    }
}

// New function to load leaderboard data with evaluation sums (same as dashboard)
async function loadLeaderboardWithEvaluationSums(levelFilter) {
    try {
        // Get all candidate profiles
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .eq('role', 'candidate');

        if (profilesError) {
            console.error('Error fetching profiles:', profilesError);
            return [];
        }

        console.log('Found profiles:', profiles.length);

        // Fetch all data in parallel for better performance
        const profileIds = profiles.map(p => p.id);
        
        const [evaluationsResults, levelsResults] = await Promise.all([
            Promise.all(profileIds.map(id => 
                supabase.from('evaluation').select('*').eq('profile_id', id)
            )),
            Promise.all(profileIds.map(id => 
                supabase.from('level').select('level_status, progress').eq('profile_id', id).single()
            ))
        ]);

        // Process all profiles
        const leaderboardUsers = await Promise.all(profiles.map(async (profile, index) => {
            try {
                const { data: evaluations } = evaluationsResults[index];
                const { data: levelData } = levelsResults[index];

                // Use progress from level table as total points (this is the accumulated score)
                const totalPoints = levelData ? (levelData.progress || 0) : 0;
                const currentLevel = levelData ? levelData.level_status : 'Beginner';

                // Calculate accuracy from result scores
                let accuracy = 0;
                let totalTests = 0;
                if (evaluations && evaluations.length > 0) {
                    const evaluationIds = evaluations.map(e => e.id);
                    const { data: results } = await supabase
                        .from('result')
                        .select('score')
                        .in('evaluation_id', evaluationIds);

                    if (results && results.length > 0) {
                        const totalScore = results.reduce((sum, r) => sum + (r.score || 0), 0);
                        const avgScore = totalScore / results.length;
                        // Convert average score (out of 10) to percentage
                        accuracy = (avgScore / 10) * 100;
                        totalTests = evaluations.length;
                    }
                }

                return {
                    id: profile.id,
                    first_name: profile.first_name || 'Anonymous',
                    last_name: profile.last_name || '',
                    username: createUsername(profile),
                    total_points: totalPoints,
                    current_level: currentLevel,
                    accuracy_percent: Math.round(accuracy),
                    total_tests: totalTests
                };
            } catch (err) {
                console.error(`Error processing profile ${profile.id}:`, err);
                return null;
            }
        }));

        // Filter out any null entries from errors
        const validUsers = leaderboardUsers.filter(user => user !== null);

        // Sort by total points descending
        validUsers.sort((a, b) => b.total_points - a.total_points);

        // Assign ranks
        validUsers.forEach((user, index) => {
            user.rank = index + 1;
        });

        // Apply level filter if specified
        let filteredUsers = validUsers;
        if (levelFilter && levelFilter !== 'all') {
            filteredUsers = validUsers.filter(user => user.current_level === levelFilter);
            // Re-rank within filtered results
            filteredUsers.forEach((user, index) => {
                user.rank = index + 1;
            });
        }

        console.log('Leaderboard data calculated from evaluation sums:', filteredUsers);
        return filteredUsers;

    } catch (error) {
        console.error('Error loading leaderboard with evaluation sums:', error);
        return [];
    }
}

// Fallback RPC function call (original approach)
async function loadLeaderboardFallbackRPC() {
    try {
        const selectedLevelBtn = document.querySelector('.filter-btn.selected');
        const levelFilter = selectedLevelBtn ? selectedLevelBtn.getAttribute('data-level') : 'all';

        const selectedPeriodBtn = document.querySelector('.period-btn.selected');
        const periodFilter = selectedPeriodBtn ? selectedPeriodBtn.getAttribute('data-period') : 'all';

        let { data, error } = await supabase
            .rpc('get_leaderboard_data', {
                level_filter: levelFilter,
                period_filter: periodFilter
            });

        if (error || !data) {
            data = loadLeaderboardFallback(levelFilter);
        }

        leaderboardData = data || [];
        renderLeaderboard();
        await updateUserRanking();
    } catch (error) {
        console.error('Fallback RPC loading failed:', error);
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
            total_points: item.progress || 0,
            current_level: item.level_status || 'Beginner',
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
    // Define podium positions in correct order: 2nd place (left), 1st place (middle), 3rd place (right)
    const podiumContainers = [
        document.querySelector('.slide-up:nth-child(1)'), // 2nd place (left)
        document.querySelector('.slide-up:nth-child(2)'), // 1st place (middle)
        document.querySelector('.slide-up:nth-child(3)')  // 3rd place (right)
    ];

    if (leaderboardData.length === 0) {
        // No data to show - hide all podium positions
        console.log('No leaderboard data - hiding all podium positions');
        podiumContainers.forEach(container => {
            if (container) {
                container.style.display = 'none';
            }
        });
        return;
    }

    // Reset all containers first
    podiumContainers.forEach(container => {
        if (container) {
            // Clear existing content
            const nameElement = container.querySelector('h4');
            if (nameElement) nameElement.textContent = '';

            const usernameElement = container.querySelector('p.text-sm.text-gray-400');
            if (usernameElement) usernameElement.textContent = '';

            const scoreElements = container.querySelectorAll('span.text-2xl, span.text-3xl');
            scoreElements.forEach(el => el.textContent = '');

            const levelBadge = container.querySelector('.bg-purple-500\\/20');
            if (levelBadge) levelBadge.textContent = '';
        }
    });

    // Map podium positions to ranks
    const podiumPositions = [
        { container: podiumContainers[0], rank: 2, dataIndex: 1 }, // 2nd place (left)
        { container: podiumContainers[1], rank: 1, dataIndex: 0 }, // 1st place (middle)
        { container: podiumContainers[2], rank: 3, dataIndex: 2 }  // 3rd place (right)
    ];

    // Update only as many podium positions as we have data for
    for (let i = 0; i < Math.min(podiumPositions.length, leaderboardData.length); i++) {
        const position = podiumPositions[i];
        const userData = leaderboardData[position.dataIndex];

        if (position.container && userData) {
            updatePodiumCard(position.container, userData, position.rank);
            position.container.style.display = 'block'; // Show the container
            console.log(`Updated podium position ${i + 1} with user:`, userData.first_name);
        }
    }

    // Hide empty podium slots
    for (let i = leaderboardData.length; i < podiumPositions.length; i++) {
        const position = podiumPositions[i];
        if (position.container) {
            position.container.style.display = 'none';
            console.log(`Hiding podium position ${i + 1} - no data`);
        }
    }
}

function updatePodiumCard(card, userData, rank) {
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
        scoreElement.textContent = userData.total_points % 1 === 0 ? userData.total_points.toFixed(0) : userData.total_points.toFixed(1);
    }

    const levelBadge = card.querySelector('.bg-purple-500\\/20');
    if (levelBadge) {
        const levelColor = getLevelColor(userData.current_level);
        levelBadge.textContent = userData.current_level;
        levelBadge.className = `px-2 py-1 bg-${levelColor.bg} text-${levelColor.text} rounded text-xs`;
    }
}

function updateRankingsTable() {
    const tableBody = document.getElementById('leaderboard-tbody');
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
                        <span class="text-white font-semibold">${user.total_points % 1 === 0 ? user.total_points.toFixed(0) : user.total_points.toFixed(1)}</span>
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

async function updateUserRanking() {
    console.log('Current user ID:', currentUser.id);

    // Get current filter selection
    const selectedLevelBtn = document.querySelector('.filter-btn.selected');
    const levelFilter = selectedLevelBtn ? selectedLevelBtn.getAttribute('data-level') : 'all';

    // First get user's level from the global data
    let { data: globalData, error: globalError } = await supabase
        .rpc('get_leaderboard_data', {
            level_filter: 'all',
            period_filter: 'all'
        });

    if (globalError) {
        console.error('Failed to get user level data:', globalError);
        return;
    }

    const globalUserData = globalData?.find(user => user.id === currentUser.id);
    if (!globalUserData) {
        // User has never taken tests
        console.log('User has no test data, showing placeholders');

        const userRankElement = document.querySelector('.text-5xl.font-bold.text-emerald-400');
        if (userRankElement) userRankElement.textContent = 'No Data';

        const userCountElement = document.querySelector('.text-sm.text-gray-400');
        if (userCountElement) userCountElement.textContent = 'Take a test to see ranking';

        const yourRankingDiv = document.querySelector('.bg-gradient-to-br.from-emerald-500\\/20.to-blue-500\\/20 .space-y-2');
        if (yourRankingDiv) {
            const statElements = yourRankingDiv.querySelectorAll('.flex.items-center.justify-between');
            if (statElements.length >= 3) {
                statElements[0].querySelector('.text-white.font-semibold').textContent = '0.0';
                statElements[1].querySelector('.text-white.font-semibold').textContent = '0';
                statElements[2].querySelector('.text-white.font-semibold').textContent = '0%';
            }
        }
        return;
    }

    // If no filter is applied, show ranking among ALL participants
    // If filter is applied, show ranking within that level
    let rankData, totalCount, levelText;
    
    if (levelFilter === 'all') {
        // Show ranking among ALL participants
        rankData = globalUserData;
        totalCount = globalData?.length || 0;
        levelText = 'participants';
    } else {
        // Show ranking within filtered level
        let { data: levelData, error: levelError } = await supabase
            .rpc('get_leaderboard_data', {
                level_filter: levelFilter,
                period_filter: 'all'
            });

        if (levelError) {
            console.error('Failed to get level data:', levelError);
            rankData = globalUserData;
            totalCount = globalData?.length || 0;
            levelText = 'participants';
        } else {
            rankData = levelData?.find(user => user.id === currentUser.id) || globalUserData;
            totalCount = levelData?.length || 0;
            levelText = `${levelFilter} users`;
        }
    }

    console.log('Updating "Your Ranking" card:', { rank: rankData?.rank, totalCount, levelText });

    // Update "Your Ranking" stats
    const userRankElement = document.querySelector('.text-5xl.font-bold.text-emerald-400');
    if (userRankElement) {
        userRankElement.textContent = '#' + (rankData?.rank || '?');
    }

    const userCountElement = document.querySelector('.text-sm.text-gray-400');
    if (userCountElement) {
        if (totalCount > 0) {
            userCountElement.textContent = `out of ${totalCount} ${levelText}`;
        } else {
            userCountElement.textContent = 'No ranking data';
        }
    }

    // Update stats with more specific selectors
    const yourRankingDiv = document.querySelector('.bg-gradient-to-br.from-emerald-500\\/20.to-blue-500\\/20 .space-y-2');
    if (yourRankingDiv) {
        const statElements = yourRankingDiv.querySelectorAll('.flex.items-center.justify-between');
        if (statElements.length >= 3) {
            const pointsToShow = globalUserData.total_points || 0;
            statElements[0].querySelector('.text-white.font-semibold').textContent = pointsToShow % 1 === 0 ? pointsToShow.toFixed(0) : pointsToShow.toFixed(1);
            statElements[1].querySelector('.text-white.font-semibold').textContent = globalUserData.total_tests || 0;
            statElements[2].querySelector('.text-white.font-semibold').textContent = (globalUserData.accuracy_percent || 0) + '%';
        }
    }

    // Update table row if user appears in filtered results
    const tableRows = document.querySelectorAll('tbody tr');
    tableRows.forEach(row => {
        const usernameCell = row.querySelector('p.text-xs.text-gray-400');
        if (usernameCell && usernameCell.textContent === `@${globalUserData.username}`) {
            const pointsCell = row.querySelector('span.font-semibold');
            if (pointsCell) pointsCell.textContent = globalUserData.total_points % 1 === 0 ? globalUserData.total_points.toFixed(0) : globalUserData.total_points.toFixed(1);
        }
    });
}

// Fallback function for leaderboard data loading using manual queries
async function loadLeaderboardFallback(levelFilter) {
    // Note: Period filter not implemented in fallback as it's better handled in the database
    // For full period filtering, update the get_leaderboard_data RPC function in Supabase
    try {
        // First get level data
        let levelQuery = supabase
            .from('level')
            .select(`
                id,
                progress,
                level_status,
                profile_id
            `)
            .order('progress', { ascending: false });

        // Apply level filter if specified
        if (levelFilter && levelFilter !== 'all') {
            levelQuery = levelQuery.eq('level_status', levelFilter);
        }

        const { data: levelData, error: levelError } = await levelQuery;

        if (levelError) {
            console.error('Fallback level query error:', levelError);
            return [];
        }

        // Get profile data for these profiles
        const profileIds = levelData.map(level => level.profile_id);
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
                .eq("profile_id", profileId)
        );

        const evaluationsResults = await Promise.all(evaluationsPromises);

        // Process data
        const processedData = levelData.map((level, index) => {
            const profile = profilesData.find(p => p.id === level.profile_id);
            const evaluations = evaluationsResults[profileIds.indexOf(level.profile_id)]?.data || [];

            // Match RPC function calculation: AVG(NULLIF(correctness, 0)) * 10
            const validEvaluations = evaluations.filter(e => e.correctness !== null && e.correctness !== 0);
            const avgCorrectness = validEvaluations.length > 0
                ? validEvaluations.reduce((sum, e) => sum + e.correctness, 0) / validEvaluations.length
                : 0;
            // Convert average correctness score (out of 10) to percentage
            const avgAccuracy = (avgCorrectness / 10) * 100;

            return {
                id: profile?.id || level.profile_id,
                rank: index + 1,
                first_name: profile?.first_name || 'Anonymous',
                last_name: profile?.last_name || '',
                username: createUsername(profile),
                total_points: level.progress || 0,
                current_level: level.level_status || 'Beginner',
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
        return user.first_name.toLowerCase() + user.last_name.toLowerCase().replace(/\s+/g, ' ');
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
    if (user.current_level === 'Expert') badges += '<i data-lucide="award" class="w-4 h-4 text-purple-500"></i>';

    return badges || '<i data-lucide="award" class="w-4 h-4 text-gray-500"></i>';
}
