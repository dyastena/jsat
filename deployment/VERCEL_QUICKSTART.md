# Quick Start - Deploy to Vercel

## 🚀 One-Click Deploy

Click the button below to deploy JSAT to Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/dyastena/jsat)

---

## 📋 Manual Deployment Steps

### 1. Install Vercel CLI

```bash
npm install -g vercel
```

### 2. Login to Vercel

```bash
vercel login
```

### 3. Deploy from Project Root

```bash
# Navigate to project directory
cd c:\xampp\htdocs\jsat

# Deploy to Vercel (first time)
vercel

# Answer the prompts:
# Set up and deploy? Y
# Which scope? (select your account)
# Link to existing project? N
# Project name? jsat
# Directory? ./
# Override settings? N
```

### 4. Add Environment Variables

```bash
# Add Supabase URL
vercel env add SUPABASE_URL production
# Paste: https://uupbhvoohukgquxmkfpn.supabase.co

# Add Supabase Anon Key
vercel env add SUPABASE_ANON_KEY production
# Paste: your_anon_key_here
```

### 5. Deploy to Production

```bash
vercel --prod
```

---

## 🌐 Configure Supabase

After deployment, update your Supabase settings:

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Authentication** → **URL Configuration**
4. Add your Vercel URL:
   - **Site URL**: `https://your-app.vercel.app`
   - **Redirect URLs**: `https://your-app.vercel.app/**`

---

## ✅ Verify Deployment

Your app will be live at: `https://your-project.vercel.app`

Test these features:
- ✓ Sign up / Login
- ✓ Role selection
- ✓ Dashboard access
- ✓ Practice ground
- ✓ Leaderboard

---

## 🔄 Automatic Deployments

Vercel automatically deploys when you push to Git:

```bash
# Make changes
git add .
git commit -m "Update feature"
git push origin main

# Vercel automatically deploys to production
```

---

## 🛠️ Troubleshooting

**Build fails?**
```bash
# Test locally first
npm install
npm run build
```

**Can't connect to Supabase?**
- Check environment variables in Vercel Dashboard
- Verify Supabase CORS settings
- Confirm redirect URLs are whitelisted

**Need help?**
- Check `DEPLOYMENT.md` for detailed guide
- View deployment logs in Vercel Dashboard
- Check browser console for errors

---

## 📊 Monitor Your App

- **Logs**: https://vercel.com/dashboard → Your Project → Logs
- **Analytics**: https://vercel.com/dashboard → Your Project → Analytics
- **Deployments**: https://vercel.com/dashboard → Your Project → Deployments

---

## 💰 Cost

**FREE TIER INCLUDES:**
- Unlimited deployments
- 100GB bandwidth/month
- Automatic HTTPS
- Preview deployments for PRs
- Global CDN

Perfect for your JSAT application!
