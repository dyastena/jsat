# Vercel Deployment Troubleshooting

Common issues and solutions when deploying JSAT to Vercel.

---

## Build Issues

### ❌ "Command 'npm run build' failed"

**Solution:**
```powershell
# Test build locally first
npm install
npm run build

# Check for errors in output
# Fix any CSS or dependency issues
```

### ❌ "Module not found: @supabase/supabase-js"

**Solution:**
```powershell
# Ensure dependencies are in package.json
npm install @supabase/supabase-js --save

# Commit and redeploy
git add package.json package-lock.json
git commit -m "Fix dependencies"
git push
```

### ❌ "Tailwind CSS not generating"

**Solution:**
```powershell
# Check if src/input.css exists
# Verify tailwind.config.js is correct
npm install tailwindcss --save-dev
npm run build
```

---

## Deployment Issues

### ❌ "Error: No framework detected"

**Solution:**
- This is normal - JSAT is a static site
- In Vercel settings, set Framework Preset to "Other"
- Build command: `npm run build`
- Output directory: `app`

### ❌ "404 Not Found" after deployment

**Solution 1: Check vercel.json**
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

**Solution 2: Verify file structure**
- Ensure all HTML files are in `/app` directory
- Check that `index.html` exists in `/app`

### ❌ "Build succeeded but site is blank"

**Solution:**
```powershell
# Check browser console for errors
# Common causes:
# 1. CSS not loaded - check dist/output.css exists
# 2. JS modules not loading - check import paths
# 3. Supabase connection issue - check credentials
```

---

## Authentication Issues

### ❌ "Supabase auth not working in production"

**Solution:**
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add production URLs:
   ```
   Site URL: https://your-app.vercel.app
   Redirect URLs: https://your-app.vercel.app/**
   ```
3. Wait 1-2 minutes for changes to propagate
4. Clear browser cache and test again

### ❌ "User gets logged out immediately"

**Solution:**
- Check that cookies are enabled
- Verify redirect URLs include `/**` wildcard
- Check browser console for CORS errors
- Ensure HTTPS is used (Vercel auto-enables this)

### ❌ "CORS error when calling Supabase"

**Solution:**
1. Supabase Dashboard → Settings → API
2. Add your Vercel domain to allowed origins
3. Include both with and without `www`:
   - `https://your-app.vercel.app`
   - `https://www.your-app.vercel.app`

---

## Environment Variable Issues

### ❌ "Cannot read environment variables"

**Solution:**
```powershell
# Add variables in Vercel Dashboard
# Go to: Project Settings → Environment Variables

# Or via CLI:
vercel env add SUPABASE_URL production
vercel env add SUPABASE_ANON_KEY production

# Then redeploy:
vercel --prod
```

### ❌ "Credentials not working in production"

**Solution:**
- JSAT currently uses hardcoded credentials in `config.js`
- This is intentional - the anon key is meant to be public
- Security is enforced by Supabase RLS policies
- Verify your RLS policies are enabled

---

## Performance Issues

### ❌ "Site loads slowly"

**Solutions:**
1. **Optimize CSS**: Already minified with `npm run build`
2. **Enable Vercel Analytics**: Dashboard → Your Project → Analytics
3. **Check Supabase region**: Use region closest to users
4. **Optimize images**: Use WebP format, compress files

### ❌ "High bandwidth usage"

**Solutions:**
- Enable Vercel's automatic image optimization
- Minimize CSS/JS file sizes (already done with minify)
- Use Supabase CDN for static assets

---

## Database Issues

### ❌ "RLS policy blocks all queries"

**Solution:**
```sql
-- Check policies in Supabase SQL Editor
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- Verify policies allow authenticated users
-- Example policy:
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);
```

### ❌ "Profile not created on signup"

**Solution:**
```sql
-- Verify trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Recreate if needed (see SUPABASE_INTEGRATION_GUIDE.md)
-- Test with a new signup
```

---

## Vercel CLI Issues

### ❌ "vercel: command not found"

**Solution:**
```powershell
# Install globally
npm install -g vercel

# Verify installation
vercel --version

# If still not found, restart terminal
```

### ❌ "Not authorized to deploy"

**Solution:**
```powershell
# Login again
vercel login

# Select the correct scope/team
# Verify you have permissions for the project
```

---

## Git Issues

### ❌ "Vercel not detecting new commits"

**Solution:**
```powershell
# Check git status
git status

# Ensure changes are pushed
git add .
git commit -m "Update"
git push origin main

# Manually trigger deployment in Vercel Dashboard
# Or use: vercel --prod
```

### ❌ ".gitignore not working"

**Solution:**
```powershell
# Remove cached files
git rm -r --cached .
git add .
git commit -m "Fix .gitignore"
git push
```

---

## Browser Issues

### ❌ "Changes not visible after deployment"

**Solution:**
1. Hard refresh browser: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
2. Clear browser cache
3. Test in incognito/private mode
4. Verify deployment completed in Vercel Dashboard

### ❌ "Module errors in browser console"

**Solution:**
- Check that all JS files use ES6 module syntax
- Verify import paths are correct (relative paths)
- Ensure `type="module"` in script tags
- Check browser compatibility (use modern browsers)

---

## Quick Diagnostic Checklist

When something goes wrong, check these in order:

1. ✅ Vercel Dashboard → Deployment Status (successful?)
2. ✅ Vercel Dashboard → Logs (any errors?)
3. ✅ Browser Console (any errors?)
4. ✅ Network Tab (API calls succeeding?)
5. ✅ Supabase Dashboard → API Logs (requests coming through?)
6. ✅ Supabase Dashboard → Auth (users can sign up?)

---

## Getting Help

If you're still stuck:

1. **Check Vercel Logs**:
   ```powershell
   vercel logs your-deployment-url
   ```

2. **Check Supabase Logs**:
   - Dashboard → Logs → API Logs

3. **Vercel Support**:
   - Community: https://github.com/vercel/vercel/discussions
   - Documentation: https://vercel.com/docs

4. **Supabase Support**:
   - Discord: https://discord.supabase.com
   - Documentation: https://supabase.com/docs

5. **JSAT Issues**:
   - GitHub: https://github.com/dyastena/jsat/issues

---

## Emergency Rollback

If deployment breaks production:

```powershell
# Via CLI
vercel rollback

# Or in Dashboard:
# 1. Go to Deployments
# 2. Find last working deployment
# 3. Click "..." menu
# 4. Select "Promote to Production"
```

---

## Prevention

Avoid issues by:
- ✅ Testing builds locally before deploying
- ✅ Using preview deployments for testing (automatic on branches)
- ✅ Following the CHECKLIST.md before each deployment
- ✅ Keeping dependencies up to date
- ✅ Monitoring deployment logs

---

Need more help? Check `DEPLOYMENT.md` for detailed configuration guides.
