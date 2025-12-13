#!/bin/bash

# JSAT - Vercel Deployment Script
# This script prepares and deploys JSAT to Vercel

echo "🚀 JSAT Vercel Deployment Script"
echo "================================"
echo ""

# Navigate to project root (parent directory)
cd ..
echo "📂 Working directory: $(pwd)"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null
then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
    echo "✅ Vercel CLI installed"
else
    echo "✅ Vercel CLI found"
fi

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🎨 Building Tailwind CSS..."
npm run build

echo ""
echo "🔍 Checking for .env file..."
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Using hardcoded values from config.js"
    echo "   For production, set environment variables in Vercel Dashboard"
else
    echo "✅ .env file found"
fi

echo ""
echo "📤 Deploying to Vercel..."
echo ""
echo "Please answer the following prompts:"
echo "  - Set up and deploy? → Y"
echo "  - Which scope? → (select your account)"
echo "  - Link to existing project? → N (unless you already created one)"
echo "  - Project name? → jsat"
echo "  - Directory? → ./"
echo "  - Override settings? → N"
echo ""
read -p "Press Enter to continue with deployment..."

vercel

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Add environment variables (if not using hardcoded values):"
echo "   vercel env add SUPABASE_URL"
echo "   vercel env add SUPABASE_ANON_KEY"
echo ""
echo "2. Deploy to production:"
echo "   vercel --prod"
echo ""
echo "3. Configure Supabase:"
echo "   - Add your Vercel URL to Supabase Auth settings"
echo "   - Update redirect URLs and CORS settings"
echo ""
echo "📖 See DEPLOYMENT.md for detailed instructions"
