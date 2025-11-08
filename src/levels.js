// Shared level thresholds (source of truth for GEMINI progression)
// Exposes `window.levelThresholds` for non-module pages to consume.
(function () {
  window.levelThresholds = {
    'Beginner': 100,
    'Novice': 150,
    'Intermediate': 200,
    'Advanced': 250,
    'Expert': 300
  };
})();
