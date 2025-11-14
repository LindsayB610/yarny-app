# Google Drive OAuth Setup Guide

This guide will help you set up a fresh Google Drive OAuth 2.0 client for your Yarny app.

## Step 1: Create New OAuth 2.0 Client in Google Cloud Console

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Select your project (or create a new one)

2. **Enable Google Drive API**
   - Navigate to: **APIs & Services** > **Library**
   - Search for "Google Drive API"
   - Click on it and press **Enable** (if not already enabled)

3. **Configure OAuth Consent Screen** (if not already done)
   - Navigate to: **APIs & Services** > **OAuth consent screen**
   - Choose **External** (unless you have a Google Workspace)
   - Fill in:
     - App name: `Yarny`
     - User support email: Your email
     - Developer contact: Your email
   - Click **Save and Continue**
   - Add scopes: `https://www.googleapis.com/auth/drive.file`
   - Click **Save and Continue**
   - Add test users (your email) if in testing mode
   - Click **Save and Continue**

4. **Create OAuth 2.0 Client**
   - Navigate to: **APIs & Services** > **Credentials**
   - Click **+ CREATE CREDENTIALS** > **OAuth client ID**
   - Application type: **Web application**
   - Name: `Yarny Drive OAuth Client` (or any name you prefer)
   
5. **Configure Authorized Redirect URIs**
   - **IMPORTANT**: Add exactly this URI (no trailing slash, exact match):
     ```
     https://yarny.lindsaybrunner.com/.netlify/functions/drive-auth-callback
     ```
   - For local development (optional), also add:
     ```
     http://localhost:8888/.netlify/functions/drive-auth-callback
     ```
   - Click **CREATE**

6. **Copy Your Credentials**
   - You'll see a popup with:
     - **Client ID** (ends with `.apps.googleusercontent.com`)
     - **Client Secret**
   - **Copy both immediately** - you won't be able to see the secret again!
   - Save them somewhere safe (you'll paste them into Netlify next)

## Step 2: Delete Old Environment Variables in Netlify

1. **Go to Netlify Dashboard**
   - Visit: https://app.netlify.com/
   - Select your site (yarny.lindsaybrunner.com)

2. **Navigate to Environment Variables**
   - Go to: **Site settings** > **Environment variables**

3. **Delete Old Variables**
   - Find and delete:
     - `GDRIVE_CLIENT_ID` (if it exists)
     - `GDRIVE_CLIENT_SECRET` (if it exists)
   - **Note**: Keep `GOOGLE_CLIENT_ID` if it exists (that's for Google Sign-In, different from Drive OAuth)

## Step 3: Add New Environment Variables in Netlify

1. **Still in Environment Variables**
   - Click **Add a variable**

2. **Add GDRIVE_CLIENT_ID**
   - Key: `GDRIVE_CLIENT_ID`
   - Value: Paste the **Client ID** from Step 1 (the one ending in `.apps.googleusercontent.com`)
   - **IMPORTANT**: 
     - No spaces before or after
     - Copy the entire ID (should be quite long)
     - Should end with `.apps.googleusercontent.com`
   - Click **Save**

3. **Add GDRIVE_CLIENT_SECRET**
   - Click **Add a variable** again
   - Key: `GDRIVE_CLIENT_SECRET`
   - Value: Paste the **Client Secret** from Step 1
   - **IMPORTANT**: 
     - No spaces before or after
     - Copy the entire secret
     - Typically 24-40 characters long
   - Click **Save**

4. **Optional: Set Explicit Redirect URI** (usually not needed)
   - If you want to be explicit, you can also add:
   - Key: `GDRIVE_REDIRECT_URI`
   - Value: `https://yarny.lindsaybrunner.com/.netlify/functions/drive-auth-callback`
   - But this is optional - the code will auto-detect it

## Step 4: Redeploy Your Site

After adding environment variables, you need to trigger a new deployment:

1. **Option 1: Trigger Redeploy**
   - Go to **Deploys** tab
   - Click **Trigger deploy** > **Deploy site**
   - This will use the new environment variables

2. **Option 2: Make a Small Change**
   - Make a small change to any file (or just add a comment)
   - Commit and push to trigger a new deployment

## Step 5: Test the Authorization

1. **Visit your site**: https://yarny.lindsaybrunner.com
2. **Sign in** (if not already signed in)
3. **Try to authorize Drive**:
   - Navigate to the stories page
   - Click any button that triggers Drive authorization
   - You should be redirected to Google OAuth consent screen
4. **Check the authorization**:
   - You should see a consent screen asking for Drive access
   - After approving, you should be redirected back to your app
   - Check the browser console and Netlify function logs for any errors

## Troubleshooting

### Common Issues:

1. **"redirect_uri_mismatch" error**
   - The redirect URI in Google Console must **exactly match** what your app sends
   - Check: `https://yarny.lindsaybrunner.com/.netlify/functions/drive-auth-callback`
   - No trailing slashes, exact protocol (https), exact path

2. **"invalid_client" error**
   - Client ID and Secret don't match
   - Ensure you copied them correctly (no extra spaces)
   - Make sure they're from the same OAuth client
   - Verify environment variables are set correctly in Netlify

3. **"access_denied" error**
   - User canceled the authorization
   - OAuth consent screen not configured properly
   - Try again and approve the authorization

4. **Environment variables not updating**
   - Make sure you redeployed after adding/changing variables
   - Check that variables are set for the correct environment (Production/Branch)

### Verify Environment Variables:

You can check if your environment variables are set correctly by:
1. Looking at Netlify function logs (in the Netlify dashboard)
2. The code logs the first/last characters of the Client ID (for debugging)
3. Check for any validation errors in the logs

## Environment Variables Summary

Your Netlify site should have these environment variables:

- ✅ `GDRIVE_CLIENT_ID` - Your Google Drive OAuth Client ID
- ✅ `GDRIVE_CLIENT_SECRET` - Your Google Drive OAuth Client Secret
- ✅ `GOOGLE_CLIENT_ID` - Your Google Sign-In Client ID (different from Drive OAuth)
- ✅ `ALLOWED_EMAIL` - Email address allowed to access the app
- ⚪ `GDRIVE_REDIRECT_URI` - Optional, auto-detected if not set

## Notes

- The Drive OAuth client is **separate** from the Google Sign-In client
- You may have two different OAuth clients:
  - One for Google Sign-In (uses `GOOGLE_CLIENT_ID`)
  - One for Google Drive (uses `GDRIVE_CLIENT_ID`)
- The redirect URI must match **exactly** between Google Console and your code
- The code automatically determines the redirect URI based on your domain, but you can override it with `GDRIVE_REDIRECT_URI` if needed

