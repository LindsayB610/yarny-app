# Deploy Instructions

> ⚠️ **Note**: This file is outdated. For comprehensive deployment instructions, please see [README.md](./README.md).

## Quick Deploy Steps

1. **Create GitHub Repository** (if not already done)
   - Repository name: `yarny-app`
   - Description: "Personal writing tool with Google Drive integration"

2. **Push to GitHub**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/yarny-app.git
   git branch -M main
   git push -u origin main
   ```

3. **Deploy to Netlify**
   - Go to https://app.netlify.com
   - Import existing project from GitHub
   - Build command: (leave empty)
   - Publish directory: `public`

4. **Configure Environment Variables** (see README.md for full list)
   - `GOOGLE_CLIENT_ID`: Google Sign-In OAuth Client ID
   - `GDRIVE_CLIENT_ID`: Google Drive OAuth Client ID
   - `GDRIVE_CLIENT_SECRET`: Google Drive OAuth Client Secret
   - `ALLOWED_EMAIL`: Comma-separated list of allowed user emails
   - `NETLIFY_SITE_ID`: Your Netlify Site ID
   - `NETLIFY_AUTH_TOKEN`: Your Netlify Personal Access Token

5. **Configure Custom Domain**
   - Add custom domain: `yarny.lindsaybrunner.com`
   - Configure DNS (CNAME record or Netlify DNS)

For detailed setup instructions including Google Cloud Console configuration, OAuth setup, and all environment variables, see [README.md](./README.md).

