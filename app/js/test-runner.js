import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener("DOMContentLoaded", () => {
    lucide.createIcons();

    // DOM elements
    const runBtn = document.getElementById("runBtn");
    const editor = document.getElementById("editor");
    const inputArea = document.getElementById("input-area");
    const consoleEl = document.getElementById("console-text");
    const execStatus = document.getElementById("exec-status");
    const execTime = document.getElementById("exec-time");
    const execMemory = document.getElementById("exec-memory");
    const timerEl = document.getElementById("timer");
    const questionPanel = document.getElementById("question-panel");
    const submitBtn = document.getElementById("submitBtn");
    const headerTitle = document.getElementById("header-title");
    const progress = document.getElementById("progress");
    const clearConsoleBtn = document.getElementById("clearConsole");

    let instance = {
        id: null,
        durationMinutes: 30,
        questions: [],
        currentquestionIndex: 0,
        isTimed: false,
        startTime: null,
        lastJudge0Result: null,
        totalRuns: 0,
        errorCount: 0
    };

    // Load question from URL param
    const loadQuestionFromParam = async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const testParam = urlParams.get('test');

        if (testParam && testParam.startsWith('question-')) {
            const questionId = testParam.replace('question-', '');
            console.log('Loading question with id:', questionId);

            try {
                const { data: question, error } = await supabase
                    .from('question')
                    .select('question_id, title, question, input, output, answer, difficulty, category')
                    .eq('question_id', questionId)
                    .single();

                if (error || !question) {
                    console.error('Error fetching question:', error);
                    alert('Question not found.');
                    return false;
                }

                // Update instance
                instance.id = questionId;
                instance.questions = [question];
                instance.isTimed = ['Intermediate', 'Advanced', 'Expert'].includes(question.difficulty);
                instance.durationMinutes = instance.isTimed ? 30 : 0; // Set duration for timed tests

                // Update UI
                headerTitle.textContent = `Test: ${question.title}`;
                progress.textContent = `${question.category} - ${question.difficulty} Level`;

                console.log('Question loaded:', question);

                // If not timed, hide timer or show unlimited
                if (!instance.isTimed) {
                    document.querySelector('.bg-gray-800.px-6.py-3.rounded-lg.border.border-gray-700').style.display = 'none';
                }

                return true;
            } catch (err) {
                console.error('Error loading question:', err);
                alert('Failed to load question.');
                return false;
            }
        } else {
            // No param, use mock for fallback
            console.log('No test param, using mock data');
            instance.questions = [
                {
                    id: 1,
                    title: "Default Question",
                    question: "This is a default question. Please go back to dashboard and select a test."
                }
            ];
            instance.isTimed = false;
            instance.durationMinutes = 0;
            return true;
        }
    };

    // Judge0 CE (FREE, unlimited)
    const JUDGE0_URL ='https://ce.judge0.com/submissions/?base64_encoded=true&wait=true';


    const JAVA_ID = 91;

    // Run code
    const runCode = async () => {
        const sourceCode = editor.value.trim();

        if (!sourceCode) {
            consoleEl.textContent = "Please write some code before running.";
            return;
        }

        if (execStatus) {
            execStatus.textContent = "Running...";
            execStatus.style.color = '#fbbf24'; // yellow
        }
        consoleEl.textContent = "Executing...";

        const testInput = inputArea ? inputArea.value.trim() : '';

        const payload = {
            language_id: JAVA_ID,
            source_code: btoa(sourceCode),
        };

        // Only add stdin if there's actual input
        if (testInput) {
            payload.stdin = btoa(testInput);
        }

        try {
            const response = await fetch(JUDGE0_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            // Track execution data
            instance.totalRuns++;
            if (result.status?.id !== 3) { // Not successful
                instance.errorCount++;
            }

            // Store successful result
            if (result.status?.id === 3) {
                instance.lastJudge0Result = result;
            }

            // Update execution stats
            if (execStatus) {
                execStatus.textContent = result.status?.description || 'Error';
                execStatus.style.color = result.status?.id === 3 ? '#10b981' : '#ef4444';
            }
            if (execTime) execTime.textContent = `${result.time || 0}s`;
            if (execMemory) execMemory.textContent = `${result.memory || 0} KB`;

            // If judge0 returns error structure
            if (!result || !result.status) {
                consoleEl.textContent =
                    "API Error: " +
                    (result.error || result.message || "Unexpected Judge0 response.");
                return;
            }

            // Build output safely
            let output = '';

            if (result.stdout) {
                output += `${atob(result.stdout)}\n`;
            }
            if (result.stderr) {
                output += `Error: ${atob(result.stderr)}\n`;
            }
            if (result.compile_output) {
                output += `Compilation: ${atob(result.compile_output)}\n`;
            }

            consoleEl.textContent = output || 'No output generated';

        } catch (err) {
            console.error(err);
            if (execStatus) {
                execStatus.textContent = 'Error';
                execStatus.style.color = '#ef4444';
            }
            consoleEl.textContent = "Network error. Please try again.";
        }
    };

    // Render questions
    const renderquestion = () => {
        const q = instance.questions[instance.currentquestionIndex];
        questionPanel.innerHTML = `
            <h2 class="text-lg font-semibold">${q.title}</h2>
            <div class="mt-2 text-sm text-gray-300">${q.question}</div>
            ${q.input ? `<div class="mt-4 p-3 bg-gray-800 rounded border-l-4 border-blue-500">
                <h3 class="text-sm font-semibold text-blue-400 mb-1">Sample Input:</h3>
                <pre class="font-mono text-sm text-gray-200">${q.input}</pre>
            </div>` : ''}
            ${q.output ? `<div class="mt-3 p-3 bg-gray-800 rounded border-l-4 border-green-500">
                <h3 class="text-sm font-semibold text-green-400 mb-1">Expected Output:</h3>
                <pre class="font-mono text-sm text-gray-200">${q.output}</pre>
            </div>` : ''}
        `;
    };

    // Timer
    const displayTimer = (minutes) => {
        if (timerEl) {
            const mm = String(minutes).padStart(2, "0");
            timerEl.textContent = `${mm}:00:00`;
        }
    };

    // Submit test results to Supabase
    const submitTestResults = async () => {
        if (!instance.lastJudge0Result || !instance.id) {
            console.error('No test results to submit');
            return;
        }

        try {
            const { data: user } = await supabase.auth.getUser();
            if (!user.user) throw new Error('Not authenticated');

            // Get user's current level
            const { data: levelData, error: levelError } = await supabase
                .from('level')
                .select('level_status')
                .eq('profile_id', user.user.id)
                .single();

            if (levelError) {
                console.error('Error fetching user level:', levelError);
                throw new Error('Could not determine user level');
            }

            const userLevel = levelData?.level_status || 'Beginner';
            const levelMapping = { 'Beginner': 1, 'Novice': 2, 'Intermediate': 3, 'Advanced': 4, 'Expert': 5 };
            const numericLevel = levelMapping[userLevel] || 1;

            const question = instance.questions[0];
            const sourceCode = editor.value;
            const timeTaken = (Date.now() - instance.startTime) / (1000 * 60); // minutes

            // Initialize all metrics to null
            let correctness = null;
            let lineCode = null;
            let runtime = null;
            let errorMade = null;

            // Calculate only metrics required for current level
            if (numericLevel >= 1) {
                // Always calculate correctness for all levels
                correctness = Evaluation.evaluateCorrectness(
                    sourceCode,
                    question.answer || ''
                );
            }

            if (numericLevel >= 2) {
                // For Novice and above, include time_taken (processed by database)
                // timeTaken is always included, so no special handling needed here
            }

            if (numericLevel >= 3) {
                // For Intermediate and above, include code quality
                const linesOfCode = sourceCode.split('\n').filter(line => line.trim().length > 0).length;
                lineCode = Math.max(1, Math.min(10, 11 - linesOfCode)); // Shorter better, cap at 10
            }

            if (numericLevel >= 4) {
                // For Advanced and above, include runtime
                runtime = instance.lastJudge0Result.time || 0;
            }

            if (numericLevel >= 5) {
                // For Expert level, include error handling
                const errorRate = instance.totalRuns > 0 ? instance.errorCount / instance.totalRuns : 0;
                errorMade = Math.max(0, 10 - (errorRate * 10));
            }

            await supabase
                .from('evaluation')
                .insert({
                    question_id: instance.id,
                    profile_id: user.user.id,
                    correctness: correctness,
                    line_code: lineCode,
                    time_taken: numericLevel >= 2 ? timeTaken : null,
                    runtime: runtime,
                    error_made: errorMade
                });

            // Store question title for quick access on completion page
            localStorage.setItem('lastTestQuestionTitle', question.title);
            localStorage.setItem('lastTestQuestionId', instance.id);

            console.log('Test results saved successfully');
        } catch (error) {
            console.error('Failed to save test results:', error);
            alert('Failed to submit test results. Please try again.');
        }
    };

    // Submit modal
    const showSubmitModal = async () => {
        if (document.getElementById("submit-modal")) return;

        // Get user profile ID first
        const { data: user } = await supabase.auth.getUser();
        const profileId = user?.user?.id || 'Not available';

        // Get user's current level
        const { data: levelData, error: levelError } = await supabase
            .from('level')
            .select('level_status')
            .eq('profile_id', profileId)
            .single();

        const userLevel = levelData?.level_status || 'Beginner';
        const levelMapping = { 'Beginner': 1, 'Novice': 2, 'Intermediate': 3, 'Advanced': 4, 'Expert': 5 };
        const numericLevel = levelMapping[userLevel] || 1;

        // Calculate scores based on level
        const question = instance.questions[0];
        const sourceCode = editor.value;
        const timeTaken = (Date.now() - instance.startTime) / (1000 * 60);

        // Run level-based evaluation
        const evaluationResult = Evaluation.evaluateLevel(
            numericLevel,
            instance.lastJudge0Result || {},
            sourceCode,
            timeTaken,
            instance.errorCount,
            instance.totalRuns,
            question.answer || ''
        );

        const questionId = instance.id || 'Not available';

        const modal = document.createElement("div");
        modal.id = "submit-modal";
        modal.className =
            "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50";

        modal.innerHTML = `
            <div class="bg-gray-900 text-gray-100 p-6 rounded-lg w-[90%] max-w-lg text-center">
                <h3 class="text-lg font-semibold mb-4">Test Results</h3>
                <div class="space-y-3 text-left mb-4">
                    <div class="flex justify-between">
                        <span class="text-gray-400">User Profile ID:</span>
                        <span class="text-white font-mono text-sm">${profileId}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-400">Question ID:</span>
                        <span class="text-white font-mono text-sm">${questionId}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-400">Current Level:</span>
                        <span class="text-blue-400 font-bold">${userLevel}</span>
                    </div>
                </div>
                <div class="border-t border-gray-700 pt-4">
                    <h4 class="text-sm font-semibold text-gray-300 mb-2">Evaluation Factors:</h4>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between">
                            <span class="text-gray-400">Correctness:</span>
                            <span class="text-emerald-400">${evaluationResult.details.correctness}/10</span>
                        </div>
                        ${numericLevel > 1 ? `
                        <div class="flex justify-between">
                            <span class="text-gray-400">Time Efficiency:</span>
                            <span class="text-yellow-400">${Math.max(0, 10 - evaluationResult.details.timeTaken)}/10</span>
                        </div>
                        ` : ''}
                        ${numericLevel > 2 ? `
                        <div class="flex justify-between">
                            <span class="text-gray-400">Code Quality:</span>
                            <span class="text-blue-400">${evaluationResult.details.lineCount > 20 ? 0 : Math.max(1, 11 - evaluationResult.details.lineCount)}/10</span>
                        </div>
                        ` : ''}
                        ${numericLevel > 3 ? `
                        <div class="flex justify-between">
                            <span class="text-gray-400">Runtime Performance:</span>
                            <span class="text-orange-400">${evaluationResult.details.runtime >= 0 ? Math.max(0, 10 - evaluationResult.details.runtime * 10) : 10}/10</span>
                        </div>
                        ` : ''}
                        ${numericLevel > 4 ? `
                        <div class="flex justify-between">
                            <span class="text-gray-400">Error Handling:</span>
                            <span class="text-red-400">${10 - (evaluationResult.details.totalRuns > 0 ? (evaluationResult.details.totalErrors / evaluationResult.details.totalRuns) * 10 : 0)}/10</span>
                        </div>
                        ` : ''}
                        <div class="border-t border-gray-600 pt-2 mt-3">
                            <div class="flex justify-between font-bold">
                                <span class="text-gray-300">Total Score:</span>
                                <span class="text-emerald-400">${Math.round((evaluationResult.score / evaluationResult.maxScore) * 100)}%</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="mt-6 flex items-center justify-center gap-3">
                    <button id="confirmSubmit" class="px-4 py-2 bg-emerald-500 rounded-md text-white font-semibold">Proceed to Results</button>
                    <button id="cancelSubmit" class="px-4 py-2 bg-gray-700 rounded-md text-gray-200">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById("confirmSubmit").onclick = async () => {
            // Submit test results to Supabase first
            await submitTestResults();
            modal.remove();
            window.location.href = "completion.html";
        };

        document.getElementById("cancelSubmit").onclick = () => modal.remove();
    };

    // Clear console functionality
    const clearConsole = () => {
        if (consoleEl) consoleEl.textContent = "Console cleared. Ready for new execution.";
    };

    // Events
    if (runBtn) runBtn.addEventListener("click", runCode);
    if (submitBtn) submitBtn.addEventListener("click", showSubmitModal);
    if (clearConsoleBtn) clearConsoleBtn.addEventListener("click", clearConsole);

    // Init
    const init = async () => {
        const loaded = await loadQuestionFromParam();
        if (loaded) {
            renderquestion();
            displayTimer(instance.durationMinutes);
            instance.startTime = Date.now(); // Start tracking time
        }
    };

    init();
});
