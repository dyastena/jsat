document.addEventListener("DOMContentLoaded", () => {
    lucide.createIcons();

    // DOM elements
    const runBtn = document.getElementById("runBtn");
    const editor = document.getElementById("editor");
    const consoleEl = document.getElementById("console-text");
    const timerEl = document.getElementById("timer");
    const questionPanel = document.getElementById("question-panel");
    const submitBtn = document.getElementById("submitBtn");

    // Mock (replace with server API later)
    const mockInstance = {
        id: "mock-1",
        durationMinutes: 30,
        questions: [
            {
                id: 1,
                title: "Hello, World!",
                body: 'Write a Java program that prints "Hello, World!" to the console.'
            },
        ],
        currentQuestionIndex: 0
    };
    let instance = mockInstance;

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

            // If judge0 returns error structure
            if (!result || !result.status) {
                consoleEl.textContent =
                    "API Error: " +
                    (result.error || result.message || "Unexpected Judge0 response.");
                return;
            }

            // Build output safely
            let output = `Status: ${result.status.description}\n`;
            output += `Time: ${result.time || 0}s\n`;
            output += `Memory: ${result.memory || 0} KB\n\n`;

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
        } catch (err) {
            console.error(err);
            consoleEl.textContent =
                "Network or server error. Please try again.";
        }
    };

    // Render questions
    const renderQuestion = () => {
        const q = instance.questions[instance.currentQuestionIndex];
        questionPanel.innerHTML = `
            <h2 class="text-lg font-semibold">${q.title}</h2>
            <div class="mt-2 text-sm text-gray-300">${q.body}</div>
        `;
    };

    // Timer
    const displayTimer = (minutes) => {
        const mm = String(minutes).padStart(2, "0");
        timerEl.textContent = `${mm}:00:00`;
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

    // Events
    if (runBtn) runBtn.addEventListener("click", runCode);
    if (submitBtn) submitBtn.addEventListener("click", showSubmitModal);

    // Init
    const init = () => {
        renderQuestion();
        displayTimer(instance.durationMinutes);
    };

    init();
});
