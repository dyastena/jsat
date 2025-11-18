import { supabase } from './auth.js';

let currentUser = null;

// Set current user for use in the module
export function setCurrentUser(user) {
    currentUser = user;
}

// Function to load challenges from Supabase based on difficulty
export async function loadChallenges(difficulty) {
    try {
        const { data: questions, error } = await supabase
            .from('question')
            .select('Question_id, Title, Category, Difficulty')
            .eq('Difficulty', difficulty);

        if (error) throw error;

        // Update the challenge list
        const challengeContainer = document.querySelector('.space-y-3.max-h-96.overflow-y-auto');
        if (!challengeContainer) return;

        // Clear existing challenges
        challengeContainer.innerHTML = '';

        if (!questions || questions.length === 0) {
            challengeContainer.innerHTML = `
                <div class="text-center text-gray-400 py-8">
                    No challenges available for this difficulty level.
                </div>
            `;
            return;
        }

        // Create challenge buttons dynamically
        questions.forEach((question, index) => {
            const challengeBtn = document.createElement('button');
            challengeBtn.className = index === 0 ?
                'challenge-btn w-full text-left p-4 bg-emerald-500/10 border border-emerald-500/50 rounded-lg hover:bg-emerald-500/20 transition' :
                'challenge-btn w-full text-left p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition';

            challengeBtn.setAttribute('data-question-id', question.Question_id);
            challengeBtn.setAttribute('data-challenge', question.Title);
            challengeBtn.setAttribute('data-topic', question.Category);
            challengeBtn.setAttribute('data-difficulty', question.Difficulty);

            const difficultyBadge = getDifficultyBadge(question.Difficulty);

            challengeBtn.innerHTML = `
                <div class="flex items-start justify-between mb-2">
                    <h4 class="text-white font-semibold text-sm">${question.Title}</h4>
                    <span class="text-xs px-2 py-1 ${difficultyBadge.color} rounded">${difficultyBadge.label}</span>
                </div>
                <p class="text-xs text-gray-400">${question.Category}</p>
            <div class="flex items-center space-x-3 mt-2 text-xs text-gray-500">
                </div>
            `;

            challengeContainer.appendChild(challengeBtn);
        });

        // Re-attach event listeners to new challenge buttons
        attachChallengeListeners();

    } catch (error) {
        console.error('Error loading challenges:', error);
        const challengeContainer = document.querySelector('.space-y-3.max-h-96.overflow-y-auto');
        if (challengeContainer) {
            challengeContainer.innerHTML = `
                <div class="text-center text-red-400 py-8">
                    Error loading challenges. Please try again.
                </div>
            `;
        }
    }
}

// Function to load a specific question into the panel
export async function loadQuestion(btn) {
    const questionId = btn.dataset.questionId;
    if (!questionId) return;

    try {
        const { data: question, error } = await supabase
            .from('question')
            .select('Title, Question, Category, Difficulty')
            .eq('Question_id', questionId)
            .single();

        if (error) throw error;

        const difficultyBadge = getDifficultyBadge(question.Difficulty);

        document.getElementById("question-panel").innerHTML = `
            <h3 class="text-xl font-bold text-white mb-4">${question.Title}</h3>
            <p class="text-gray-400 text-sm mb-3">${question.Category}</p>
            <span class="inline-block px-3 py-1 ${difficultyBadge.color} text-xs rounded mb-4">${difficultyBadge.label}</span>

            <div class="p-4 bg-gray-800 rounded-lg border border-gray-700 mb-4">
                <p class="text-gray-300 text-sm">${question.Question}</p>
            </div>
        `;

    } catch (error) {
        console.error('Error loading question:', error);
        document.getElementById("question-panel").innerHTML = `
            <div class="text-center text-red-400 py-8">
                Error loading question details.
            </div>
        `;
    }
}

// Function to get difficulty badge styling
function getDifficultyBadge(difficulty) {
    const badges = {
        'Beginner': { color: 'bg-green-500/20 text-green-500', label: 'Beginner' },
        'Novice': { color: 'bg-yellow-500/20 text-yellow-500', label: 'Novice' },
        'Intermediate': { color: 'bg-orange-500/20 text-orange-500', label: 'Intermediate' },
        'Advanced': { color: 'bg-red-500/20 text-red-500', label: 'Advanced' },
        'Expert': { color: 'bg-purple-500/20 text-purple-500', label: 'Expert' }
    };
    return badges[difficulty] || { color: 'bg-gray-500/20 text-gray-500', label: 'Unknown' };
}

// Function to attach event listeners to challenge buttons
export function attachChallengeListeners() {
    const challengeButtons = document.querySelectorAll('.challenge-btn');
    challengeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            challengeButtons.forEach(b => {
                b.classList.remove('bg-emerald-500/20','border-emerald-500/50');
                b.classList.add('bg-gray-800');
            });
            btn.classList.remove('bg-gray-800');
            btn.classList.add('bg-emerald-500/20','border','border-emerald-500/50');
            loadQuestion(btn);
        });
    });
}

// Function to update the user's ranking based on progress
export async function updateUserRanking(userId) {
    try {
        // Get candidate profile IDs
        const { data: candidates, error: candError } = await supabase
            .from('profiles')
            .select('id')
            .eq('role', 'candidate');

        if (candError) throw candError;

        const candidateIds = candidates.map(c => c.id);

        // Get total candidate count
        const totalCandidates = candidateIds.length;

        // Get user's rank among candidates by progress
        const { data: allCandidates, error: fetchError } = await supabase
            .from('level')
            .select('Profile_id, Progress')
            .in('Profile_id', candidateIds);

        if (fetchError) throw fetchError;

        // Sort by progress descending
        allCandidates.sort((a, b) => b.Progress - a.Progress);

        // Find user's rank
        let rank = 1;
        for (let i = 0; i < allCandidates.length; i++) {
            if (allCandidates[i].Profile_id === userId) {
                rank = i + 1;
                break;
            }
        }

        // Update the ranking display
        const rankingDiv = document.querySelector('.bg-gradient-to-br.from-purple-500\\/10');
        if (rankingDiv) {
            const rankDiv = rankingDiv.querySelector('.text-4xl');
            const countSpan = rankingDiv.querySelector('.text-sm.text-gray-400');
            if (rankDiv) rankDiv.textContent = `#${rank}`;
            if (countSpan) countSpan.textContent = `out of ${totalCandidates || 0} participants`;
        }
    } catch (error) {
        console.error('Error updating user ranking:', error);
        // Keep default values if query fails
    }
}

// Setup function to initialize difficulty filters
export function setupDifficultyFilters() {
    const difficultyButtons = document.querySelectorAll('.difficulty-btn');
    difficultyButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            difficultyButtons.forEach(b => {
                b.classList.remove('bg-green-500/20','border-green-500/50','text-green-500');
                b.classList.add('bg-gray-800','text-white');
            });
            btn.classList.remove('bg-gray-800','text-white');
            btn.classList.add('bg-green-500/20','border','border-green-500/50','text-green-500');

            const difficulty = btn.dataset.difficulty;
            loadChallenges(difficulty);
        });
    });
}
