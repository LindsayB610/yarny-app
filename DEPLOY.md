# Deploy Instructions

## Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `yarny-app`
3. Description: "Personal writing tool with WebAuthn authentication"
4. Make it **Private** (or Public, your choice)
5. **Don't** initialize with README, .gitignore, or license (we already have these)
6. Click **Create repository**

## Step 2: Push to GitHub

After creating the repo, run these commands:

```bash
cd /Users/lindsaybrunner/yarny-app
git remote add origin https://github.com/YOUR_USERNAME/yarny-app.git
git branch -M main
git push -u origin main
```

(Replace `YOUR_USERNAME` with your GitHub username)

## Step 3: Deploy to Netlify

1. Go to https://app.netlify.com
2. Click **Add new site** → **Import an existing project**
3. Choose **GitHub** and authorize if needed
4. Select the `yarny-app` repository
5. Configure build settings:
   - **Build command**: (leave empty)
   - **Publish directory**: `public`
6. Click **Deploy site**

## Step 4: Configure Environment Variables

Once deployed, go to **Site settings** → **Environment variables** and add:

- **Key**: `RP_ID`
- **Value**: `yarny.lindsaybrunner.com`

- **Key**: `RP_NAME`
- **Value**: `Yarny - Writing Tool`

- **Key**: `ORIGIN`
- **Value**: `https://yarny.lindsaybrunner.com`

Click **Save** and **Trigger deploy** to redeploy with the new variables.

## Step 5: Configure Subdomain

1. In Netlify dashboard, go to **Domain settings**
2. Under **Custom domains**, click **Add custom domain**
3. Enter: `yarny.lindsaybrunner.com`
4. Choose **Add domain**
5. Netlify will show DNS configuration options:
   
   **Option A: If you manage DNS through Netlify**
   - Netlify will automatically configure everything
   
   **Option B: If you manage DNS elsewhere** (like your domain registrar)
   - Add a CNAME record:
     - **Name/Subdomain**: `yarny`
     - **Value/Target**: `your-site-name.netlify.app` (Netlify will show this)
   - Wait for DNS to propagate (5-60 minutes)

## Step 6: Test!

1. Once the domain is active, visit `https://yarny.lindsaybrunner.com`
2. Enter your email
3. Click "Sign in with your device"
4. Approve the authentication on your phone
5. You're in! 🎉

