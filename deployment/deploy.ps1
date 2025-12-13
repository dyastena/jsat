# JSAT - Vercel Deployment Script (Windows)
# This script prepares and deploys JSAT to Vercel

Write-Host "🚀 JSAT Vercel Deployment Script" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to project root (parent directory)
Set-Location -Path ".."
Write-Host "📂 Working directory: $(Get-Location)" -ForegroundColor Cyan
Write-Host ""

# Check if Vercel CLI is installed
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue
if (-not $vercelInstalled) {
    Write-Host "❌ Vercel CLI not found. Installing..." -ForegroundColor Yellow
    npm install -g vercel
    Write-Host "✅ Vercel CLI installed" -ForegroundColor Green
} else {
    Write-Host "✅ Vercel CLI found" -ForegroundColor Green
}

Write-Host ""
Write-Host "📦 Installing dependencies..." -ForegroundColor Cyan
npm install

Write-Host ""
Write-Host "🎨 Building Tailwind CSS..." -ForegroundColor Cyan
npm run build

Write-Host ""
Write-Host "🔍 Checking for .env file..." -ForegroundColor Cyan
if (-not (Test-Path .env)) {
    Write-Host "⚠️  No .env file found. Using hardcoded values from config.js" -ForegroundColor Yellow
    Write-Host "   For production, set environment variables in Vercel Dashboard" -ForegroundColor Yellow
} else {
    Write-Host "✅ .env file found" -ForegroundColor Green
}

Write-Host ""
Write-Host "📤 Deploying to Vercel..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Please answer the following prompts:" -ForegroundColor Yellow
Write-Host "  - Set up and deploy? → Y"
Write-Host "  - Which scope? → (select your account)"
Write-Host "  - Link to existing project? → N (unless you already created one)"
Write-Host "  - Project name? → jsat"
Write-Host "  - Directory? → ./"
Write-Host "  - Override settings? → N"
Write-Host ""
Read-Host "Press Enter to continue with deployment"

vercel

Write-Host ""
Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Add environment variables (if not using hardcoded values):"
Write-Host "   vercel env add SUPABASE_URL"
Write-Host "   vercel env add SUPABASE_ANON_KEY"
Write-Host ""
Write-Host "2. Deploy to production:"
Write-Host "   vercel --prod"
Write-Host ""
Write-Host "3. Configure Supabase:"
Write-Host "   - Add your Vercel URL to Supabase Auth settings"
Write-Host "   - Update redirect URLs and CORS settings"
Write-Host ""
Write-Host "📖 See DEPLOYMENT.md for detailed instructions" -ForegroundColor Cyan
