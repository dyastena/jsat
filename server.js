const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Environment variables for Supabase (injected at runtime)
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

// Serve the dynamically generated config.js as ES module
app.get('/config.js', (req, res) => {
    res.type('application/javascript');
    res.send(`// Auto-generated config from environment variables
export const SUPABASE_URL = "${SUPABASE_URL}";
export const SUPABASE_ANON_KEY = "${SUPABASE_ANON_KEY}";
`);
});

// Also serve from /app/config.js path (for relative imports from app/js/*.js)
app.get('/app/config.js', (req, res) => {
    res.type('application/javascript');
    res.send(`// Auto-generated config from environment variables
export const SUPABASE_URL = "${SUPABASE_URL}";
export const SUPABASE_ANON_KEY = "${SUPABASE_ANON_KEY}";
`);
});

// Serve static files from dist folder (CSS)
app.use('/dist', express.static(path.join(__dirname, 'dist')));

// Serve static files from app folder (HTML, JS)
app.use('/app', express.static(path.join(__dirname, 'app')));

// Serve static files from root (for any other assets)
app.use(express.static(__dirname));

// Redirect root to app/index.html
app.get('/', (req, res) => {
    res.redirect('/app/index.html');
});

// Handle SPA-style routing - serve index.html for unmatched routes
app.get('*', (req, res) => {
    // If requesting an HTML file that doesn't exist, redirect to app index
    if (req.path.endsWith('.html')) {
        res.status(404).sendFile(path.join(__dirname, 'app', 'index.html'));
    } else {
        res.status(404).send('Not found');
    }
});

app.listen(PORT, () => {
    console.log(`J-SAT server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
});
