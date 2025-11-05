# Yarny - Personal Writing Tool

> ⚠️ **Alpha Version**: Yarny is currently in alpha testing. Features may change, and there may be bugs or incomplete functionality.

A simple, secure writing tool with Google Sign-In authentication and Google Drive integration for cloud storage. Perfect for writers who want a distraction-free environment with powerful organization features.

**Access**: Yarny requires an invitation. To request access, please email [lb@lindsaybrunner.com](mailto:lb@lindsaybrunner.com) with your Google account email address.

## Features

### Authentication & Security
- **Google Sign-In Authentication**: Secure authentication using Google Identity Services
- **Multi-User Support**: Configure allowed users via environment variables
- **Session Management**: HttpOnly cookies for secure session handling
- **CSRF Protection**: OAuth state parameter verification

### Google Drive Integration
- **Cloud Storage**: All stories are automatically saved to Google Drive
- **Google Docs API**: Stories are stored as Google Docs for rich text support
- **Automatic Sync**: Changes are saved automatically to Drive
- **Token Refresh**: OAuth tokens automatically refresh when expired
- **Privacy-Focused**: Uses `drive.file` scope - only accesses files created by the app
- **Refresh from Drive**: Manual sync button to remove deleted stories from the list

### Story Management
- **Create Stories**: Start new writing projects with organized folder structure
- **List Stories**: View all your stories with last modified dates
- **Delete Stories**: Remove stories with confirmation (optional Drive deletion)
- **Story Organization**: Each story is a folder in Google Drive containing organized subfolders

### Rich Text Editor
- **Chapters (Groups)**: Organize your writing into chapters or groups
- **Chapter Color Coding**: Color-code chapters with 12 accent colors using an interactive color picker
- **Snippets**: Individual writing snippets within chapters
- **Instant Snippet Creation**: New snippets appear immediately - start typing while Drive file creation happens in the background
- **Drag & Drop**: Reorder chapters and snippets by dragging
- **Search**: Full-text search across all snippets and chapters
- **Tags**: Create and apply tags to snippets for better organization
- **Tag Filtering**: Filter snippets by selected tags
- **Snippets System**: All content is organized as snippets:
  - **Chapter Snippets**: Writing snippets within chapters (stored in chapter-specific subfolders within the Chapters folder)
  - **People Snippets**: Character notes and details (stored in People folder)
  - **Places Snippets**: Location and setting notes (stored in Places folder)
  - **Things Snippets**: Object and item notes (stored in Things folder)
- **Unified Editor**: All snippets open in the main editor window for consistent editing experience
- **Background Autosave**: Changes are automatically saved when switching between snippets
- **Word Count Tracking**: Real-time word and character counts
- **Goal Tracking**: Set word count goals with visual progress indicator
- **Auto-Save**: Automatic saving to Google Drive as you write
- **Save Status**: Visual indicator showing save state (idle/saving/saved)

### Keyboard Shortcuts
- `Cmd/Ctrl + N`: Create new snippet
- `Cmd/Ctrl + Shift + N`: Create new chapter/group
- `Cmd/Ctrl + K`: Open tag palette
- `Cmd/Ctrl + F`: Focus search input
- `Esc`: Toggle focus mode (hide sidebars)

## Tech Stack

- **Frontend**: Vanilla HTML/JS/CSS (no framework dependencies)
- **Backend**: Netlify Functions (serverless)
- **Authentication**: Google Identity Services (GSI)
- **Storage**: 
  - Google Drive API with `https://www.googleapis.com/auth/drive.file` scope
  - Google Docs API with `https://www.googleapis.com/auth/documents` scope
  - Netlify Blobs for OAuth token storage (multi-user support)
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
3. Enable the required APIs:
   - **Google Drive API**: Navigate to "APIs & Services" > "Library" > Search "Google Drive API" > Enable
   - **Google Docs API**: Navigate to "APIs & Services" > "Library" > Search "Google Docs API" > Enable
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
  - **For users**: If you need access, email [lb@lindsaybrunner.com](mailto:lb@lindsaybrunner.com) to request an invitation
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
4. Authorize Google Drive access when prompted (make sure to grant both Drive and Docs API permissions)
5. Create your first story!

## Project Structure

```
yarny-app/
├── netlify/
│   ├── functions/
│   │   ├── auth/                          # WebAuthn authentication (legacy, not currently used)
│   │   │   ├── config.js
│   │   │   ├── login.js
│   │   │   ├── register.js
│   │   │   ├── storage.js
│   │   │   ├── verify-login.js
│   │   │   └── verify-register.js
│   │   ├── config.js                      # Google Client ID config (for frontend)
│   │   ├── verify-google.js               # Verify Google ID tokens
│   │   ├── logout.js                      # Logout handler
│   │   ├── drive-auth.js                  # Initiate Drive OAuth flow
│   │   ├── drive-auth-callback.js         # Handle OAuth callback
│   │   ├── drive-client.js                # Drive API client with token refresh & Proxy support
│   │   ├── drive-list.js                  # List files/folders
│   │   ├── drive-read.js                  # Read file content (supports Google Docs)
│   │   ├── drive-write.js                 # Write/update files (supports Google Docs)
│   │   ├── drive-create-folder.js         # Create folders
│   │   ├── drive-delete-story.js          # Delete story folders
│   │   └── drive-get-or-create-yarny-stories.js  # Manage Yarny stories folder
│   └── netlify.toml                       # Netlify configuration
├── public/
│   ├── index.html                         # Login page
│   ├── stories.html                       # Stories landing page
│   ├── editor.html                         # Main editor interface
│   ├── docs.html                           # User guide/documentation
│   ├── app.js                              # Login/authentication logic
│   ├── stories.js                          # Stories management (list, create, delete, refresh)
│   ├── editor.js                            # Editor functionality (snippets, tags, notes, color picker, etc.)
│   ├── drive.js                            # Drive API frontend wrapper
│   ├── global.css                           # Global design system and CSS variables
│   ├── stories.css                          # Stories page styles
│   ├── editor.css                           # Editor styles
│   └── docs.css                             # Documentation page styles
├── package.json
└── README.md
```

## How It Works

### Authentication Flow

1. User clicks "Sign in with Google" on the login page
2. Google Identity Services handles the sign-in
3. Backend verifies the Google ID token via `verify-google` function
4. Session cookie is set for authenticated requests
5. User is redirected to the stories page

### Drive Integration

1. On first use, user must authorize Google Drive access
2. OAuth2 flow exchanges authorization code for access/refresh tokens
3. Tokens include both Drive and Docs API scopes
4. Tokens are stored server-side in Netlify Blobs (persistent storage, supports multiple users)
5. All Drive API calls use server-side Netlify Functions
6. Tokens automatically refresh when expired (handled by `drive-client.js`)
7. The Drive client uses a Proxy to provide `_auth` access without modifying non-extensible objects

### Stories Management

1. All stories are stored as folders in a `Yarny` folder in Google Drive
2. The `Yarny` folder is automatically created on first story creation
3. Each story contains organized subfolders:
   - `Chapters`: Contains chapter-specific subfolders (e.g., "Chapter 1", "Chapter 2") with snippets stored as Google Docs
   - `People`, `Places`, `Things`: Snippets stored as text files
4. Story data is stored as JSON files within each story folder
5. Chapter snippets are stored as Google Docs for rich text support, organized in chapter subfolders
6. People/Places/Things snippets are stored as text files
7. Stories can be deleted from the UI (with optional Drive deletion)

### Editor Features

1. **Chapters (Groups)**: Each chapter can contain multiple snippets
2. **Chapter Color Coding**: Click the color chip next to a chapter title to open a color picker with 12 accent colors (red, orange, amber, yellow, lime, emerald, teal, cyan, blue, indigo, violet, fuchsia)
3. **Snippets**: Individual pieces of writing within chapters
4. **Instant Snippet Creation**: Click the "+" button to add a snippet - it appears immediately so you can start typing right away, while Drive file creation happens in the background
5. **Drag & Drop**: Reorder chapters and snippets by dragging
6. **Search**: Searches across snippet titles and content
7. **Tags**: Create tags and apply to snippets for organization
8. **Tag Filtering**: Show only snippets matching selected tags
9. **Snippets**: Unified snippet system - all content (chapters, people, places, things) uses snippets
10. **Background Autosave**: Changes automatically save when switching between snippets
11. **Auto-Save**: Changes are automatically saved to Drive
12. **Word Count**: Real-time tracking with goal progress indicator

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

### Error Logging

The application includes error logging that persists to localStorage. To view errors in the browser console:

```javascript
// View error log
viewYarnyErrors()

// Clear error log
clearYarnyErrors()
```

## API Endpoints

### Authentication
- `GET /.netlify/functions/config` - Get Google Client ID for frontend
- `POST /.netlify/functions/verify-google` - Verify Google ID token and create session
- `POST /.netlify/functions/logout` - Clear session and logout

### Drive Integration
- `GET /.netlify/functions/drive-auth` - Initiate Drive OAuth flow
- `GET /.netlify/functions/drive-auth-callback` - OAuth callback handler (redirects to stories page)
- `GET /.netlify/functions/drive-list?folderId=<id>` - List files/folders in a folder
- `POST /.netlify/functions/drive-read` - Read file content (supports Google Docs)
- `POST /.netlify/functions/drive-write` - Write/update file (creates Google Docs)
- `POST /.netlify/functions/drive-create-folder` - Create a new folder
- `POST /.netlify/functions/drive-delete-story` - Delete a story folder (optional Drive deletion)
- `GET /.netlify/functions/drive-get-or-create-yarny-stories` - Get or create the main Yarny stories folder

## Security Notes

- **Multi-User Support**: Supports multiple users via `ALLOWED_EMAIL` environment variable (comma-separated emails)
- **Token Storage**: OAuth tokens stored in Netlify Blobs (persistent, secure, supports multiple users)
- **Session Management**: Uses HttpOnly cookies for session tokens
- **CSRF Protection**: OAuth flow includes state parameter verification
- **Scope Limitation**: Uses `drive.file` scope - only accesses files created by the app
- **HTTPS Required**: All authentication requires HTTPS (provided by Netlify)
- **Token Refresh**: Automatic token refresh with error handling and timeout protection

### Adding New Users

To allow a new user to access the app:
1. Go to Netlify dashboard → Site settings → Environment variables
2. Find `ALLOWED_EMAIL`
3. Add the new email address (comma-separated): `existing@email.com,new@email.com`
4. Save and redeploy (or the next deployment will pick it up)

## Recent Improvements

- **Performance Optimizations**: Significantly faster editor loading with parallel file operations, lazy loading of snippet content, and optimized batch processing - UI becomes interactive almost immediately while content loads in the background
- **Chapter Color Coding**: Interactive color picker with 12 accent colors for visual chapter organization
- **Improved Snippet Creation UX**: Snippets appear instantly when created - no waiting for Drive file creation
- **Background File Creation**: Drive files are created asynchronously so users can start typing immediately
- **Proxy-based Drive Client**: Fixed "object is not extensible" error using Proxy pattern
- **Timeout Handling**: Added timeout protection to prevent function hangs
- **Refresh from Drive**: Added manual sync button to remove deleted stories
- **Google Docs Support**: Full support for creating and editing Google Docs
- **Error Handling**: Improved error handling and logging throughout

## License

MIT

