# Yarny - Personal Writing Tool

A simple, secure writing tool with Google Sign-In authentication and Google Drive integration for cloud storage.

## Features

- **Google Sign-In Authentication**: Secure authentication using Google Identity Services
- **Google Drive Integration**: All stories are stored in your Google Drive
- **Story Management**: Create and manage multiple writing projects (stories)
- **Rich Text Editor**: Write with tags, notes, and organization features
- **Cloud Sync**: All your work is automatically synced to Google Drive
- **Privacy-Focused**: Uses `drive.file` scope - only accesses files created by the app

## Tech Stack

- **Frontend**: Vanilla HTML/JS/CSS (no framework)
- **Backend**: Netlify Functions (serverless)
- **Authentication**: Google Identity Services (GSI)
- **Storage**: Google Drive API with `https://www.googleapis.com/auth/drive.file` scope
- **Deployment**: Netlify

## Setup Instructions

### 1. Install Dependencies

```bash
cd yarny-app
npm install
```

### 2. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Drive API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Drive API"
   - Click "Enable"
4. Create OAuth 2.0 credentials (you need TWO separate clients):
   
   **Client 1: Google Sign-In (for user authentication)**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Application type: "Web application"
   - Name: `Yarny Google Sign-In`
   - **Authorized JavaScript origins:**
     - `http://localhost:8888` (for local dev)
     - `https://yarny.lindsaybrunner.com` (for production)
   - **Authorized redirect URIs:** Leave empty (not needed for Google Sign-In)
   - Copy the **Client ID** (you won't need the secret for this one)
   
   **Client 2: Google Drive (for Drive API access)**
   - Click "Create Credentials" > "OAuth client ID" again
   - Application type: "Web application"
   - Name: `Yarny Drive OAuth Client`
   - **Authorized JavaScript origins:** Leave empty
   - **Authorized redirect URIs:**
     - `http://localhost:8888/.netlify/functions/drive-auth-callback` (for local dev)
     - `https://yarny.lindsaybrunner.com/.netlify/functions/drive-auth-callback` (for production)
   - Copy the **Client ID** and **Client Secret**

### 3. Configure Environment Variables

In your Netlify dashboard, go to **Site settings > Environment variables** and add:

#### Required:
- `GOOGLE_CLIENT_ID`: Your Google Sign-In OAuth Client ID (from Client 1 above)
- `GDRIVE_CLIENT_ID`: Your Google Drive OAuth Client ID (from Client 2 above)
- `GDRIVE_CLIENT_SECRET`: Your Google Drive OAuth Client Secret (from Client 2 above)
- `ALLOWED_EMAIL`: Email addresses allowed to access the app, comma-separated (e.g., `user1@gmail.com,user2@example.com`)
  - **Note**: To add new users, update this environment variable with their email addresses separated by commas
- `NETLIFY_SITE_ID`: Your Netlify Site ID (Project ID) - found in Project configuration > General > Project information
- `NETLIFY_AUTH_TOKEN`: Your Netlify Personal Access Token - create at https://app.netlify.com/user/applications

#### Optional:
- `GDRIVE_REDIRECT_URI`: Full callback URL (auto-detected if not set)
  - Production: `https://yarny.lindsaybrunner.com/.netlify/functions/drive-auth-callback`

### 4. Create GitHub Repository

```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "Initial commit: Yarny writing tool"

# Create new repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/yarny-app.git
git branch -M main
git push -u origin main
```

### 5. Deploy to Netlify

1. Go to [Netlify](https://app.netlify.com)
2. Click **Add new site > Import an existing project**
3. Connect your GitHub repository
4. Configure build settings:
   - **Build command**: Leave empty (or `echo 'No build step needed'`)
   - **Publish directory**: `public`
5. Add environment variables (from step 3)
6. Click **Deploy site**

### 6. Configure Custom Domain

1. In Netlify dashboard, go to **Domain settings**
2. Click **Add custom domain**
3. Enter your domain (e.g., `yarny.lindsaybrunner.com`)
4. Follow DNS configuration instructions:
   - Add a CNAME record: `yarny` → `your-site.netlify.app`
   - Or use Netlify DNS if you manage DNS there

### 7. Test the Application

1. Visit your deployed site
2. Click "Sign in with Google"
3. Select your Google account
4. Authorize Google Drive access when prompted
5. Create your first story!

## Project Structure

```
yarny-app/
├── netlify/
│   ├── functions/
│   │   ├── auth/
│   │   │   ├── config.js              # Auth configuration (RP_ID, ALLOWED_EMAIL, etc.)
│   │   │   ├── login.js                # WebAuthn login initiation
│   │   │   ├── register.js             # WebAuthn registration
│   │   │   ├── verify-login.js         # WebAuthn login verification
│   │   │   ├── verify-register.js      # WebAuthn registration verification
│   │   │   └── storage.js              # WebAuthn credential storage
│   │   ├── config.js                   # Google Client ID config (for frontend)
│   │   ├── verify-google.js            # Verify Google ID tokens
│   │   ├── drive-auth.js              # Initiate Drive OAuth flow
│   │   ├── drive-auth-callback.js     # Handle OAuth callback
│   │   ├── drive-client.js            # Drive API client with token refresh
│   │   ├── drive-list.js              # List files/folders
│   │   ├── drive-read.js              # Read file content
│   │   ├── drive-write.js             # Write/update files
│   │   ├── drive-create-folder.js     # Create folders
│   │   └── drive-get-or-create-yarny-stories.js  # Manage yarny-stories folder
│   └── netlify.toml                   # Netlify configuration
├── public/
│   ├── index.html                     # Login page
│   ├── stories.html                   # Stories landing page
│   ├── editor.html                    # Main editor interface
│   ├── app.js                         # Login/authentication logic
│   ├── stories.js                     # Stories management
│   ├── editor.js                      # Editor functionality
│   ├── drive.js                       # Drive API frontend wrapper
│   ├── stories.css                    # Stories page styles
│   └── editor.css                     # Editor styles
├── package.json
└── README.md
```

## How It Works

### Authentication Flow

1. User clicks "Sign in with Google" on the login page
2. Google Identity Services handles the sign-in
3. Backend verifies the Google ID token
4. Session cookie is set for authenticated requests
5. User is redirected to the stories page

### Drive Integration

1. On first use, user must authorize Google Drive access
2. OAuth2 flow exchanges authorization code for access/refresh tokens
3. Tokens are stored server-side in Netlify Blobs (persistent storage, supports multiple users)
4. All Drive API calls use server-side Netlify Functions
5. Tokens automatically refresh when expired

### Stories Management

1. All stories are stored as folders in a `yarny-stories` folder in Google Drive
2. The `yarny-stories` folder is automatically created on first story creation
3. Each story is a directory that can contain multiple files
4. Stories are listed on the landing page and can be opened in the editor

## Development

### Local Development

```bash
# Install Netlify CLI globally (if not already installed)
npm install -g netlify-cli

# Start local dev server
npm run dev
```

Visit `http://localhost:8888` to test locally.

**Note**: For local development, make sure to add `http://localhost:8888/.netlify/functions/drive-auth-callback` as an authorized redirect URI in Google Cloud Console.

### Environment Variables for Local Dev

Create a `.env` file in the root directory (not committed to git):

```env
GOOGLE_CLIENT_ID=your-google-signin-client-id
GDRIVE_CLIENT_ID=your-drive-client-id
GDRIVE_CLIENT_SECRET=your-drive-client-secret
ALLOWED_EMAIL=your-email@gmail.com,another@email.com
NETLIFY_SITE_ID=your-site-id
NETLIFY_AUTH_TOKEN=your-netlify-token
GDRIVE_REDIRECT_URI=http://localhost:8888/.netlify/functions/drive-auth-callback
```

## Security Notes

- **Multi-User Support**: Supports multiple users via `ALLOWED_EMAIL` environment variable (comma-separated emails)
- **Token Storage**: OAuth tokens stored in Netlify Blobs (persistent, secure, supports multiple users)
- **Session Management**: Uses HttpOnly cookies for session tokens
- **CSRF Protection**: OAuth flow includes state parameter verification
- **Scope Limitation**: Uses `drive.file` scope - only accesses files created by the app
- **HTTPS Required**: All authentication requires HTTPS (provided by Netlify)

### Adding New Users

To allow a new user to access the app:
1. Go to Netlify dashboard → Site settings → Environment variables
2. Find `ALLOWED_EMAIL`
3. Add the new email address (comma-separated): `existing@email.com,new@email.com`
4. Save and redeploy (or the next deployment will pick it up)

## API Endpoints

### Authentication
- `GET /.netlify/functions/config` - Get Google Client ID
- `POST /.netlify/functions/verify-google` - Verify Google ID token

### Drive Integration
- `GET /.netlify/functions/drive-auth` - Initiate Drive OAuth
- `GET /.netlify/functions/drive-auth-callback` - OAuth callback handler
- `GET /.netlify/functions/drive-list?folderId=<id>` - List files/folders
- `POST /.netlify/functions/drive-read` - Read file content
- `POST /.netlify/functions/drive-write` - Write/update file
- `POST /.netlify/functions/drive-create-folder` - Create folder
- `GET /.netlify/functions/drive-get-or-create-yarny-stories` - Get/create yarny-stories folder

## License

MIT

