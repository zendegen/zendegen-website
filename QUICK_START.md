# 🚀 Quick Start Guide

## Complete Setup in 10 Minutes

### 1️⃣ Push to GitHub (2 minutes)

```bash
cd /Users/davidkrohlfing/Documents/zendegen-website

# Initialize git and commit
git init
git add .
git commit -m "Initial commit - Zen Degen waitlist"

# Create repo on GitHub:
# → Go to: https://github.com/new
# → Name: zendegen-website
# → Public repository
# → Don't add README (we have one)
# → Create

# Replace YOUR_USERNAME with your GitHub username:
git remote add origin https://github.com/YOUR_USERNAME/zendegen-website.git
git branch -M main
git push -u origin main
```

### 2️⃣ Deploy to Vercel (3 minutes)

1. Go to: https://vercel.com/signup
2. Click **"Continue with GitHub"**
3. Click **"Add New..."** → **"Project"**
4. Import `zendegen-website` repository
5. Click **"Deploy"** (use default settings)
6. Wait 30 seconds → Done! 🎉

Your site is now live at: `your-project.vercel.app`

### 3️⃣ Connect Domain (5 minutes)

**In Vercel:**
1. Project Settings → Domains
2. Add `zendegen.app`
3. Copy the DNS records shown

**In GoDaddy:**
1. Login → My Products → Domains → zendegen.app
2. Manage DNS
3. **Delete** existing A and CNAME records
4. **Add** Vercel's A record:
   - Type: A
   - Name: @
   - Value: 76.76.21.21
5. **Add** Vercel's CNAME record:
   - Type: CNAME
   - Name: www
   - Value: cname.vercel-dns.com
6. Save

Wait 10-30 minutes for DNS propagation.

### 4️⃣ Update Supabase (1 minute)

1. Supabase Dashboard → Authentication → URL Configuration
2. Add to **Redirect URLs**:
   - `https://zendegen.app/oauth-callback.html`
   - `https://www.zendegen.app/oauth-callback.html`
3. Save

### ✅ Test It!

1. Visit: `https://zendegen.app`
2. Check "I agree to terms"
3. Click "Connect with Gmail"
4. Complete OAuth
5. Check Supabase waitlist table → You should see your email! 🎉

---

## 🔄 Making Changes Later

```bash
cd /Users/davidkrohlfing/Documents/zendegen-website

# Edit files...

git add .
git commit -m "Updated landing page"
git push
```

Vercel auto-deploys in ~10 seconds!

---

## 📊 View Signups

Supabase Dashboard → Table Editor → waitlist

---

Need help? Check the full README.md

