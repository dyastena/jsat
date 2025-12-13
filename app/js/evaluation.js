// Create global namespace
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config.js";

// Use the global supabase instance from UMD
if (!window.supabase) {
    throw new Error('Supabase not available. Make sure the UMD script is loaded.');
}
const supabase = window.supabase;

window.Evaluation = {

    async getCurrentUserProfileId() {
        const { data: { user } } = await supabase.auth.getUser();
        return user ? user.id : null;
    },

    evaluateCorrectness(code, expectedValues) {
        if (!code || !expectedValues) return 0;

        const normalizedCode = code.replace(/\s+/g, '').toLowerCase();
        const expectedChars = expectedValues.replace(/\s+/g, '').toLowerCase().split('');

        // Check if expected characters appear in order in the code
        let matchIndex = 0;
        for (const char of normalizedCode) {
            if (matchIndex < expectedChars.length && char === expectedChars[matchIndex]) {
                matchIndex++;
            }
        }

        return matchIndex === expectedChars.length ? 10 : 0;
    },

    evaluateLevel(level, judgeResult, userCode, timeTaken, totalErrors, totalRuns, expectedAnswer) {

        const correctness = this.evaluateCorrectness(
            userCode,
            expectedAnswer
        );

        const lineCount = userCode.split("\n").length;
        const runtime = judgeResult.time || 0;

        let score = 0;
        let maxScore = level;

        switch (level) {
            case 1: // Beginner - only correctness
                score += correctness;
                break;

            case 2:
                score += correctness;
                if (timeTaken < 30) score++;
                break;

            case 3:
                score += correctness;
                if (timeTaken < 30) score++;
                if (lineCount <= 20) score++;
                break;

            case 4:
                score += correctness;
                if (timeTaken < 30) score++;
                if (lineCount <= 20) score++;
                if (runtime < 0.10) score++;
                break;

            case 5:
                score += correctness;
                if (timeTaken < 30) score++;
                if (lineCount <= 20) score++;
                if (runtime < 0.10) score++;
                if (totalErrors === 0 && totalRuns === 1) score++;
                break;

            default:
                console.warn("Invalid level:", level);
        }

        return {
            level,
            score,
            maxScore,
            percentage: (score / maxScore) * 100,

            details: {
                correctness,
                timeTaken,
                lineCount,
                runtime,
                totalErrors,
                totalRuns
            }
        };
    }
};
