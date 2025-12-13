# Pre-Deployment Checklist

Before deploying to Vercel, ensure all items are checked:

## 🔒 Security
- [ ] API keys are not hardcoded in production build
- [ ] Supabase RLS policies are enabled for all tables
- [ ] Auth redirect URLs configured in Supabase
- [ ] CORS settings configured in Supabase for your domain
- [ ] `.env` file is in `.gitignore`

## 🏗️ Build & Code
- [ ] `npm install` runs without errors
- [ ] `npm run build` completes successfully
- [ ] No console errors in browser (test locally)
- [ ] All pages load correctly
- [ ] Authentication flow works (signup, login, logout)
- [ ] Role selection works for all roles

## 🗄️ Database
- [ ] All necessary tables exist in Supabase
- [ ] Database schema is up to date
- [ ] RLS policies tested and working
- [ ] Triggers are properly set up (profile creation, etc.)

## 📝 Files
- [ ] `vercel.json` configuration is correct
- [ ] `package.json` has correct build scripts
- [ ] `.vercelignore` excludes unnecessary files
- [ ] All HTML files are in `/app` directory
- [ ] CSS is compiled to `/dist/output.css`

## 🧪 Testing
- [ ] Test authentication on localhost
- [ ] Test all user roles (admin, recruiter, candidate)
- [ ] Test navigation between pages
- [ ] Test practice ground functionality
- [ ] Test leaderboard display
- [ ] Test dashboard features

## 🚀 Deployment
- [ ] Git repository is up to date
- [ ] All changes are committed
- [ ] Changes are pushed to remote
- [ ] Vercel CLI is installed
- [ ] Logged into Vercel account

## 📋 Post-Deployment
- [ ] Verify deployment succeeded in Vercel Dashboard
- [ ] Test production URL
- [ ] Configure custom domain (if applicable)
- [ ] Set up monitoring/analytics
- [ ] Update Supabase with production URL
- [ ] Test all features in production
- [ ] Check for console errors in production

## 🆘 Rollback Plan
- [ ] Know how to rollback in Vercel Dashboard
- [ ] Previous working deployment identified
- [ ] Team notified of deployment window

---

## Quick Commands

```bash
# Test build locally
npm install
npm run build

# Deploy to Vercel preview
vercel

# Deploy to production
vercel --prod

# Check deployment logs
vercel logs

# Rollback if needed
vercel rollback
```
