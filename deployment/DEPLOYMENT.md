# JSAT Deployment Guide - Vercel

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Git Repository**: Code pushed to GitHub/GitLab/Bitbucket
3. **Supabase Project**: Active Supabase project with configured database

---

## Step 1: Prepare Your Repository

Ensure your code is pushed to a Git repository:

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

---

## Step 2: Deploy to Vercel

### Option A: Using Vercel Dashboard (Easiest)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your Git repository
3. Configure project:
   - **Framework Preset**: Other
   - **Build Command**: `npm run build`
   - **Output Directory**: `app`
   - **Install Command**: `npm install`

4. Add Environment Variables:
   - `SUPABASE_URL`: `https://uupbhvoohukgquxmkfpn.supabase.co`
   - `SUPABASE_ANON_KEY`: Your Supabase anon key

5. Click **Deploy**

### Option B: Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Follow the prompts:
# - Set up and deploy? Y
# - Which scope? (select your account)
# - Link to existing project? N
# - Project name? jsat
# - Directory? ./
# - Override settings? N

# Add environment variables
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY

# Deploy to production
vercel --prod
```

---

## Step 3: Configure Supabase for Production

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Navigate to **Settings** → **API**
3. Add your Vercel domain to allowed origins:
   - Go to **Authentication** → **URL Configuration**
   - Add Site URL: `https://your-app.vercel.app`
   - Add Redirect URLs: `https://your-app.vercel.app/**`

4. Configure CORS:
   - Go to **Settings** → **API** → **CORS**
   - Add your Vercel domain

---

## Step 4: Verify Deployment

1. Visit your deployed URL: `https://your-app.vercel.app`
2. Test authentication flow:
   - Sign up a new user
   - Log in
   - Verify role selection works
3. Check browser console for any errors
4. Test all major features:
   - Dashboard access
   - Practice ground
   - Leaderboard
   - Test runner

---

## Continuous Deployment

Vercel automatically deploys:
- **Production**: On push to `main` branch
- **Preview**: On pull requests and other branches

```bash
# To deploy a specific branch
git checkout feature-branch
git push origin feature-branch
# Vercel creates a preview deployment automatically
```

---

## Custom Domain (Optional)

1. Go to your project in Vercel Dashboard
2. Navigate to **Settings** → **Domains**
3. Add your custom domain
4. Configure DNS records as instructed
5. Wait for SSL certificate (automatic)

---

## Monitoring & Logs

- **Deployments**: Dashboard → Your Project → Deployments
- **Runtime Logs**: Dashboard → Your Project → Logs
- **Analytics**: Dashboard → Your Project → Analytics (free tier available)

---

## Troubleshooting

### Build Fails

```bash
# Test build locally first
npm install
npm run build
```

### Environment Variables Not Working

- Ensure variables are set in Vercel Dashboard
- Redeploy after adding variables
- Check variable names match exactly

### Supabase Connection Issues

- Verify SUPABASE_URL and SUPABASE_ANON_KEY are correct
- Check Supabase CORS settings
- Verify allowed redirect URLs in Supabase Auth settings

### 404 Errors on Routes

- Ensure `vercel.json` has proper rewrites configuration
- Check that all HTML files are in the `app` directory

---

## Security Checklist

- ✅ Environment variables set in Vercel (not in code)
- ✅ Supabase RLS policies enabled
- ✅ CORS configured in Supabase
- ✅ Redirect URLs whitelisted
- ✅ HTTPS enabled (automatic with Vercel)
- ✅ Security headers configured in `vercel.json`

---

## Rollback

If something goes wrong:

```bash
# Via CLI
vercel rollback

# Or in Dashboard:
# Go to Deployments → Select previous working deployment → Promote to Production
```

---

## Cost

- **Vercel**: Free tier includes:
  - 100GB bandwidth/month
  - Unlimited deployments
  - Automatic HTTPS
  - Preview deployments

- **Supabase**: Free tier includes:
  - 500MB database
  - 1GB file storage
  - 50,000 monthly active users

---

## Support

- Vercel Docs: https://vercel.com/docs
- Supabase Docs: https://supabase.com/docs
- JSAT Issues: [Your GitHub repo]/issues
