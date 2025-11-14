// J-SAT Test Runner Logic

document.addEventListener('DOMContentLoaded', () => {
    // Initialize lucide icons
    lucide.createIcons();

    // --- DOM Elements ---
    const runBtn = document.getElementById('runBtn');
    const editor = document.getElementById('editor');
    const consoleEl = document.getElementById('console');
    const timerEl = document.getElementById('timer');
    const questionPanel = document.getElementById('question-panel');
    const progressEl = document.getElementById('progress');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');

    // --- Mock Data ---
    // In a real application, this would be fetched from a server
    const mockInstance = {
        id: 'mock-1',
        durationMinutes: 30,
        questions: [
            { id: 1, title: 'Hello, World!', body: 'Write a Java program that prints "Hello, World!" to the console.', starter: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}' },
            { id: 2, title: 'Reverse a String', body: 'Write a function to reverse a string.', starter: '// TODO: Implement string reversal' }
        ],
        currentQuestionIndex: 0
    };
    let instance = mockInstance;

    // --- Judge0 API Configuration ---
    const JUDGE0_API_URL = 'https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=true&wait=true';
    const RAPIDAPI_KEY = '5a9cf99a28mshe6aa16b658248bcp1f599ejsn60882e686b34'; // <-- IMPORTANT: Replace with your RapidAPI key
    const RAPIDAPI_HOST = 'judge0-ce.p.rapidapi.com';
    const JAVA_LANGUAGE_ID = 91; 

    /**
     * Runs the code through the Judge0 API.
     */
    const runCode = async () => {
        const sourceCode = editor.value;
        const languageId = JAVA_LANGUAGE_ID;

        if (!sourceCode.trim()) {
            consoleEl.textContent = 'Please write some code before running.';
            return;
        }
        
        if (RAPIDAPI_KEY === 'YOUR_API_KEY') {
            consoleEl.textContent = 'API Key not configured. Please replace "YOUR_API_KEY" in test-runner.js.';
            return;
        }

        consoleEl.textContent = 'Executing...';

        const options = {
            method: 'POST',
            headers: {
                'X-RapidAPI-Key': RAPIDAPI_KEY,
                'X-RapidAPI-Host': RAPIDAPI_HOST,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                language_id: languageId,
                source_code: btoa(sourceCode), // Base64 encode the source code
            })
        };

        try {
            const response = await fetch(JUDGE0_API_URL, options);
            const result = await response.json();

            let output = `Status: ${result.status.description}\n`;
            output += `Time: ${result.time}s\n`;
            output += `Memory: ${result.memory} KB\n\n`;

            if (result.stdout) {
                output += `--- Output ---\n${atob(result.stdout)}\n`;
            }
            if (result.stderr) {
                output += `--- Error ---\n${atob(result.stderr)}\n`;
            }
            if (result.compile_output) {
                output += `--- Compile Output ---\n${atob(result.compile_output)}\n`;
            }
            
            consoleEl.textContent = output;

        } catch (error) {
            console.error('Error executing code:', error);
            consoleEl.textContent = 'An error occurred while trying to execute the code. See browser console for details.';
        }
    };

    /**
     * Renders the current question.
     */
    const renderQuestion = () => {
        const q = instance.questions[instance.currentQuestionIndex];
        questionPanel.innerHTML = `
            <h2 class="text-lg font-semibold">${q.title}</h2>
            <div class="mt-2 text-sm text-gray-300">${q.body}</div>
        `;
        progressEl.textContent = `Question ${instance.currentQuestionIndex + 1} of ${instance.questions.length}`;
        if (!editor.value.trim() || editor.value.startsWith('//')) {
             editor.value = q.starter || '';
        }
    };

    /**
     * Displays the timer.
     * @param {number} minutes - The total time in minutes.
     */
    const displayTimer = (minutes) => {
        const mm = String(Math.floor(minutes)).padStart(2, '0');
        timerEl.textContent = `${mm}:00:00`;
    };

    /**
     * Shows the submission confirmation modal.
     */
    const showSubmitModal = () => {
        if (document.getElementById('submit-modal')) return;

        const modal = document.createElement('div');
        modal.id = 'submit-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-gray-900 text-gray-100 p-6 rounded-lg w-[90%] max-w-md text-center">
                <h3 class="text-lg font-semibold mb-2">Submit Test</h3>
                <p class="text-sm text-gray-300 mb-4">Are you sure you want to submit? You won't be able to change answers after submission.</p>
                <div class="flex items-center justify-center gap-3">
                    <button id="confirmSubmit" class="px-4 py-2 bg-emerald-500 rounded-md text-white font-semibold">Confirm</button>
                    <button id="cancelSubmit" class="px-4 py-2 bg-gray-700 rounded-md text-gray-200">Go Back</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('confirmSubmit').addEventListener('click', () => {
            window.location.href = new URL('completion.html', location.href).href;
        });

        document.getElementById('cancelSubmit').addEventListener('click', () => {
            modal.remove();
        });
    };

    // --- Event Listeners ---
    if (runBtn) runBtn.addEventListener('click', runCode);
    if (submitBtn) submitBtn.addEventListener('click', showSubmitModal);

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (instance.currentQuestionIndex > 0) {
                instance.currentQuestionIndex--;
                renderQuestion();
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (instance.currentQuestionIndex < instance.questions.length - 1) {
                instance.currentQuestionIndex++;
                renderQuestion();
            }
        });
    }

    // --- Initialization ---
    const init = () => {
        renderQuestion();
        displayTimer(instance.durationMinutes || 30);
    };

    init();
});
