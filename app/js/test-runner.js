import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener("DOMContentLoaded", () => {
    lucide.createIcons();

    // DOM elements
    const runBtn = document.getElementById("runBtn");
    const editor = document.getElementById("editor");
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
        isTimed: false
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
                    .select('question_id, title, question, input, output, difficulty, category')
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

        const payload = {
            language_id: JAVA_ID,
            source_code: btoa(sourceCode),
        };

        try {
            const response = await fetch(JUDGE0_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

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

    // Submit modal
    const showSubmitModal = () => {
        if (document.getElementById("submit-modal")) return;

        const modal = document.createElement("div");
        modal.id = "submit-modal";
        modal.className =
            "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50";

        modal.innerHTML = `
            <div class="bg-gray-900 text-gray-100 p-6 rounded-lg w-[90%] max-w-md text-center">
                <h3 class="text-lg font-semibold mb-2">Submit Test</h3>
                <p class="text-sm text-gray-300 mb-4">Are you sure you want to submit?</p>
                <div class="flex items-center justify-center gap-3">
                    <button id="confirmSubmit" class="px-4 py-2 bg-emerald-500 rounded-md text-white font-semibold">Confirm</button>
                    <button id="cancelSubmit" class="px-4 py-2 bg-gray-700 rounded-md text-gray-200">Go Back</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById("confirmSubmit").onclick = () => {
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
        }
    };

    init();
});
