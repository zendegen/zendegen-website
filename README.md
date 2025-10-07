# Zen Degen Waitlist Website

Landing page for Zen Degen waitlist at **zendegen.app**

## 📁 Project Structure

```
zendegen-website/
├── index.html              # Main landing page
├── oauth-callback.html     # OAuth callback handler
├── js/
│   ├── landing.js         # Landing page logic
│   └── supabaseClient.js  # Supabase client
├── creative/              # Images and assets
│   ├── logo.png
│   ├── landingpagebg2.png
│   ├── landingpagebgdark.png
│   └── favicon.png
├── vercel.json           # Vercel configuration
├── .gitignore            # Git ignore file
└── README.md             # This file
```

## 🚀 Deployment Instructions

### Step 1: Setup GitHub Repository

1. **Initialize Git:**
   ```bash
   cd /Users/davidkrohlfing/Documents/zendegen-website
   git init
   git add .
   git commit -m "Initial commit - Zen Degen waitlist website"
   ```

2. **Create GitHub Repository:**
   - Go to [github.com/new](https://github.com/new)
   - Repository name: `zendegen-website` (or any name)
   - Keep it **Public** (required for free Vercel hosting)
   - DON'T initialize with README (we already have one)
   - Click **"Create repository"**

3. **Push to GitHub:**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/zendegen-website.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Deploy to Vercel

1. **Sign up for Vercel:**
   - Go to [vercel.com/signup](https://vercel.com/signup)
   - Sign up with GitHub (easiest)
   - Authorize Vercel to access your GitHub repos

2. **Create New Project:**
   - Click **"Add New..."** → **"Project"**
   - Select **"Import Git Repository"**
   - Find `zendegen-website` and click **"Import"**

3. **Configure Project:**
   - Framework Preset: **Other** (it's a static site)
   - Root Directory: `./` (leave as is)
   - Build Command: *Leave empty*
   - Output Directory: *Leave empty*
   - Click **"Deploy"**

4. **Wait for Deployment:**
   - Vercel will deploy your site (takes ~30 seconds)
   - You'll get a URL like: `zendegen-website.vercel.app`
   - Click **"Visit"** to test it!

### Step 3: Connect Custom Domain (zendegen.app)

1. **In Vercel:**
   - Go to your project → **Settings** → **Domains**
   - Click **"Add Domain"**
   - Enter: `zendegen.app`
   - Click **"Add"**

2. **Vercel will show DNS records:**
   - You'll see something like:
     ```
     Type: A
     Name: @
     Value: 76.76.21.21
     
     Type: CNAME
     Name: www
     Value: cname.vercel-dns.com
     ```

3. **Go to GoDaddy:**
   - Log into [godaddy.com](https://godaddy.com)
   - Go to **My Products** → **Domains**
   - Click on `zendegen.app`
   - Click **"Manage DNS"**

4. **Update DNS Records:**
   
   **Delete existing records:**
   - Delete any existing A records
   - Delete any existing CNAME records for `www`
   
   **Add new records:**
   - Click **"Add"** → Select **"A"**
     - Name: `@`
     - Value: `76.76.21.21` (Vercel's IP)
     - TTL: `600` (10 minutes)
   
   - Click **"Add"** → Select **"CNAME"**
     - Name: `www`
     - Value: `cname.vercel-dns.com`
     - TTL: `600`
   
   - Click **"Save"**

5. **Wait for DNS Propagation:**
   - Can take 5 minutes to 48 hours
   - Usually works in ~10-30 minutes
   - Check status in Vercel (it will show "Valid Configuration" when done)

6. **Enable HTTPS:**
   - Vercel automatically provides free SSL
   - Once DNS is configured, your site will be live at:
     - `https://zendegen.app`
     - `https://www.zendegen.app`

### Step 4: Update Supabase Redirect URLs

1. **Go to Supabase Dashboard:**
   - Navigate to: **Authentication** → **URL Configuration**

2. **Add Redirect URLs:**
   - Add: `https://zendegen.app/oauth-callback.html`
   - Add: `https://www.zendegen.app/oauth-callback.html`
   - Click **"Save"**

3. **Test the Flow:**
   - Visit `https://zendegen.app`
   - Click "Connect with Gmail"
   - Complete OAuth
   - Should add you to waitlist! ✅

## 🔄 Making Updates

Whenever you make changes:

```bash
cd /Users/davidkrohlfing/Documents/zendegen-website
git add .
git commit -m "Description of changes"
git push
```

Vercel will automatically detect the push and redeploy within seconds!

## 📊 Viewing Waitlist Data

To see who joined:

1. Go to Supabase Dashboard
2. Click **"Table Editor"**
3. Select **"waitlist"** table
4. You'll see all signups with:
   - Email
   - Name
   - Source (gmail/twitter)
   - Wants updates (yes/no)
   - Created date

## 🆘 Troubleshooting

**OAuth not working?**
- Make sure you added redirect URLs to Supabase
- Check browser console for errors
- Verify popup blockers are disabled

**Domain not resolving?**
- DNS can take up to 48 hours
- Check [whatsmydns.net](https://www.whatsmydns.net)
- Make sure you deleted old DNS records in GoDaddy

**Need help?**
- Check Vercel logs in dashboard
- Check browser console for errors
- Verify Supabase settings

---

Built with ❤️ for mindful degens

