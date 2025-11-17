// Create global namespace
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

window.Evaluation = {

    async getCurrentUserProfileId() {
        const { data: { user } } = await supabase.auth.getUser();
        return user ? user.id : null;
    },

    evaluateCorrectness(userOutput, expectedOutput) {
        if (!userOutput || !expectedOutput) return 0;
        return userOutput.trim() === expectedOutput.trim() ? 1 : 0;
    },

    evaluateLevel(level, judgeResult, userCode, timeTaken, totalErrors, totalRuns, expectedOutput) {
        
        const correctness = this.evaluateCorrectness(
            atob(judgeResult.stdout || ""),
            expectedOutput
        );

        const lineCount = userCode.split("\n").length;
        const runtime = judgeResult.time || 0;

        let score = 0;
        let maxScore = level;

        switch (level) {
            case 1:
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
