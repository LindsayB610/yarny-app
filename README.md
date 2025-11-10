# Yarny - Personal Writing Tool

> ⚠️ **Alpha Version**: Yarny is currently in alpha testing. Features may change, and there may be bugs or incomplete functionality.
>
> ℹ️ **React SPA Default**: The production app now serves the React experience at `/`. The legacy vanilla interface is archived under `/vanilla-app/` for parity and rollback only.

A simple, secure writing tool with Google Sign-In authentication and Google Drive integration for cloud storage. Perfect for writers who want a distraction-free environment with powerful organization features.

**Access**: Yarny requires an invitation. To request access, please email [lb@lindsaybrunner.com](mailto:lb@lindsaybrunner.com) with your Google account email address.

## System Requirements

Yarny is designed for **desktop and laptop computers**. Mobile devices (phones and tablets) are not supported. If you attempt to access the editor from a mobile device, you will be redirected with a message to use a computer instead.

**Recommended:**
- Desktop or laptop computer
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection for Google Drive sync

## Features

### Authentication & Security
- **Google Sign-In Authentication**: Secure authentication using Google Identity Services
- **Multi-User Support**: Configure allowed users via environment variables
- **Session Management**: HttpOnly cookies for secure session handling (48-hour session duration)
- **CSRF Protection**: OAuth state parameter verification

### Google Drive Integration
- **Cloud Storage**: All stories are automatically saved to Google Drive
- **Google Docs API**: Stories are stored as Google Docs for rich text support
- **Automatic Sync**: Changes are saved automatically to Drive
- **Token Refresh**: OAuth tokens automatically refresh when expired
- **Privacy-Focused**: Uses `drive.file` scope - only accesses files created by the app
- **Refresh from Drive**: Manual sync button to remove deleted stories from the list
- **Comments/Tracked Changes Protection**: Warns users before overwriting Google Docs that contain comments or tracked changes, allowing them to cancel the save operation

### Story Management
- **Create Stories**: Start new writing projects with organized folder structure
  - Set story name, genre (optional), story description (optional), and word count goal
  - Optionally configure writing goals at creation: deadline, writing days, mode (Elastic/Strict), and days off
  - Goal settings are saved to `goal.json` and can be edited later via the "Today" button in the editor
  - Story descriptions can be added when creating a story or edited later via the Story Info & Settings modal
- **List Stories**: View all your stories with last modified dates, deadlines (when set), and progress information
- **Delete Stories**: Remove stories with confirmation (optional Drive deletion)
- **Story Organization**: Each story is a folder in Google Drive containing organized subfolders

### Rich Text Editor
- **Chapters (Groups)**: Organize your writing into chapters or groups
- **Chapter Color Coding**: Color-code chapters with 12 accent colors using an interactive color picker
- **Chapter Descriptions**: Add optional descriptions to chapters (300 character limit) - click the description icon next to chapter titles
- **Snippets**: Individual writing snippets within chapters
- **Snippet Descriptions**: Add optional descriptions to snippets (300 character limit) - click the description icon next to snippet titles
- **Instant Snippet Creation**: New snippets appear immediately - start typing while Drive file creation happens in the background
- **Drag & Drop**: Reorder chapters and snippets by dragging - changes are automatically saved to Google Drive
- **Chapter Collapse/Expand**: Minimize chapters you're not working on to focus on specific sections
- **Search**: Full-text search across all snippets and chapters
- **Snippets System**: All content is organized as snippets:
  - **Chapter Snippets**: Writing snippets within chapters (stored in chapter-specific subfolders within the Chapters folder)
  - **People Snippets**: Character notes and details (stored in People folder)
  - **Places Snippets**: Location and setting notes (stored in Places folder)
  - **Things Snippets**: Object and item notes (stored in Things folder)
- **Unified Editor**: All snippets open in the main editor window for consistent editing experience
- **Background Autosave**: Changes are automatically saved when switching between snippets
- **Word Count Tracking**: Real-time word and character counts
- **Goal Tracking**: Set word count goals with visual progress indicator
- **Daily Writing Goals**: "Goals that think" - set project targets with deadlines, choose writing days, and track daily progress with automatic quota calculation
  - Can be configured when creating a new story or edited later via the "Today" button
  - Settings include: word count target, deadline, writing days (Mon-Sun), mode (Elastic/Strict), and optional days off
  - All goal data is stored in `goal.json` and shared between the new story modal and goal panel
- **Auto-Save**: Automatic saving to Google Drive as you write
- **Save Status**: Visual indicator showing save state (idle/saving/saved)
- **Resume Where You Left Off**: Editor automatically opens to the most recently edited snippet (chapters or People/Places/Things) when you return to a story
- **Export Functionality**: Export combined content to Google Docs
  - Export all chapters as a single document (combines all chapter snippets in order)
  - Export all People, Places, or Things as separate combined documents
  - Custom filename prompt with suggested names based on story title
  - Files are created in the story folder in Google Drive

### Keyboard Shortcuts
- `Cmd/Ctrl + N`: Create new snippet
- `Cmd/Ctrl + Shift + N`: Create new chapter/group
- `Cmd/Ctrl + F`: Focus search input
- `Esc`: Toggle focus mode (hide sidebars)

## Tech Stack

- **Frontend (Production)**: React + TypeScript, Vite build pipeline, Material UI component system, Zustand store, TanStack Query data layer, TipTap editor.
- **Frontend (Legacy)**: Vanilla HTML/JS/CSS bundle retained under `/vanilla-app/` for archival parity and rollback.
- **Backend**: Netlify Functions (serverless)
- **Authentication**: Google Identity Services (GSI)
- **Storage**: 
  - Google Drive API with `https://www.googleapis.com/auth/drive.file` scope
  - Google Docs API with `https://www.googleapis.com/auth/documents` scope
  - Netlify Blobs for OAuth token storage (multi-user support)
- **Deployment**: Netlify (`dist/` publishes React SPA, legacy HTML available at `/vanilla-app/`)
- **Analytics**: Plausible (privacy-friendly analytics)

### Migration to React + TypeScript

Yarny is planning a migration to React + TypeScript. A detailed migration plan is available at [yarny.lindsaybrunner.com/migration-plan](https://yarny.lindsaybrunner.com/migration-plan) or see [`REACT_MIGRATION_PLAN.md`](./REACT_MIGRATION_PLAN.md) in this repository.

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
- `GOOGLE_REDIRECT_URI`: Alternative redirect URI variable (fallback, same as `GDRIVE_REDIRECT_URI`)
- `SITE_ID`: Alternative Netlify Site ID variable (fallback for `NETLIFY_SITE_ID`)
- `UPTIME_ROBOT_API_KEY`: Uptime Robot API key for status monitoring (see "Status Monitoring" section below)

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
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
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
│   │   ├── drive-check-comments.js        # Check for comments/tracked changes in Google Docs
│   │   ├── drive-create-folder.js         # Create folders
│   │   ├── drive-delete-story.js          # Delete story folders
│   │   ├── drive-delete-file.js           # Delete individual files (moves to trash)
│   │   ├── drive-rename-file.js           # Rename files
│   │   ├── drive-get-or-create-yarny-stories.js  # Manage Yarny stories folder
│   │   └── uptime-status.js               # Uptime Robot status checker
│   └── netlify.toml                       # Netlify configuration
├── public/
│   ├── index.html                         # Login page
│   ├── stories.html                       # Stories landing page
│   ├── editor.html                         # Main editor interface
│   ├── docs.html                           # User guide/documentation
│   ├── app.js                              # Login/authentication logic
│   ├── opening-sentences.js                # Collection of starter sentences for new stories
│   ├── stories.js                          # Stories management (list, create, delete, refresh)
│   ├── editor.js                            # Editor functionality (snippets, notes, color picker, etc.)
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
4. Session cookie is set for authenticated requests (valid for 48 hours)
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

1. All stories are stored as folders in a `Yarny Stories` folder in Google Drive
2. The `Yarny Stories` folder is automatically created on first story creation
3. **Migration**: Existing users with the old `Yarny` folder will have it automatically renamed to `Yarny Stories` on their next access
4. Each story contains organized subfolders:
   - `Chapters`: Contains chapter-specific subfolders (e.g., "Chapter 1", "Chapter 2") with snippets stored as Google Docs
   - `People`, `Places`, `Things`: Snippets stored as text files
5. Story data is stored as JSON files within each story folder
6. Chapter snippets are stored as Google Docs for rich text support, organized in chapter subfolders
7. People/Places/Things snippets are stored as text files
8. Stories can be deleted from the UI (with optional Drive deletion)

### Editor Features

1. **Chapters (Groups)**: Each chapter can contain multiple snippets
2. **Chapter Color Coding**: Click the color chip next to a chapter title to open a color picker with 12 accent colors (red, orange, amber, yellow, lime, emerald, teal, cyan, blue, indigo, violet, fuchsia)
3. **Snippets**: Individual pieces of writing within chapters
4. **Instant Snippet Creation**: Click the "+" button to add a snippet - it appears immediately so you can start typing right away, while Drive file creation happens in the background
5. **Drag & Drop**: Reorder chapters and snippets by dragging - order is automatically saved to Google Drive
6. **Chapter Collapse/Expand**: Click the collapse button on any chapter header to minimize it and focus on the chapters you're working on
7. **Search**: Searches across snippet titles and content
8. **Snippets**: Unified snippet system - all content (chapters, people, places, things) uses snippets
9. **Background Autosave**: Changes automatically save when switching between snippets
10. **Auto-Save**: Changes are automatically saved to Drive
11. **Word Count**: Real-time tracking with goal progress indicator
12. **Daily Writing Goals**: Set project word targets with deadlines, choose writing days (Mon-Sun), mark days off, and track daily progress. Features Elastic mode (rebalances daily targets) and Strict mode (fixed daily targets)
    - **Goal Configuration**: Can be set when creating a new story or edited anytime via the "Today" button in the editor
    - **Unified Fields**: The same goal fields appear in both the "New Story" modal and the "Today" goal panel, ensuring consistency
    - **Persistent Storage**: Goal settings are saved to `goal.json` and automatically loaded when editing
13. **Comments/Tracked Changes Protection**: Before saving a snippet that has comments or tracked changes in Google Docs, Yarny will warn you and allow you to cancel the save to preserve that collaborative feedback. If you proceed, comments and tracked changes will be lost (only plain text is preserved).
14. **Export**: Export combined content to Google Docs with custom filenames
    - Export all chapters as a single combined document
    - Export outline (chapter and snippet titles with descriptions) - includes story, chapter, and snippet descriptions when available
    - Export all People, Places, or Things as separate combined documents
    - Each export creates a Google Doc in the story folder with all snippets combined in order

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
LOCAL_DEV_BYPASS_EMAIL=dev@example.com
LOCAL_DEV_BYPASS_NAME=Dev User
# Optional but nice for the avatar shown in the UI
LOCAL_DEV_BYPASS_PICTURE=https://ui-avatars.com/api/?name=Dev+User
# Shared secret that authorises the bypass flow (only checked on localhost)
LOCAL_DEV_BYPASS_SECRET=run-`openssl rand -hex 32`-and-paste-here
```

#### Local Google Sign-In Bypass (localhost only)

Setting the `LOCAL_DEV_BYPASS_*` variables lets you click the login button on `http://localhost:8888/` without invoking the Google FedCM prompt. Instead, the login page will display “Continue as Dev User” (or whatever name you configure) and immediately mint the same cookies a real Google sign-in would generate.

- The bypass is ignored unless the app is served from `localhost`/`127.0.0.1`.
- You **still need** valid Google Drive/API credentials (`GOOGLE_CLIENT_ID`, `GDRIVE_CLIENT_ID`, `GDRIVE_CLIENT_SECRET`) so the Netlify functions can talk to Drive.
- Pick any email that’s listed in `ALLOWED_EMAIL`. The Drive integration will store OAuth tokens for that account as usual.
- Generate a random secret with `openssl rand -hex 32` (macOS/Linux) or `python -c 'import secrets; print(secrets.token_hex(32))'`. Keep it in `.env`; it never leaves your machine but prevents accidental activation.
- The first time you click the login button you’ll be prompted to paste the secret. Hold **Option/Alt** while clicking later if you need to update or clear the stored value.
- To switch users, remove `session`/`auth` cookies and update the env vars before restarting `npm run dev`.
- After bypass login you can still launch the Google Drive authorization flow from the stories page when Drive access hasn’t been granted yet.

If `LOCAL_DEV_BYPASS_SECRET` is unset, the login flow falls back to the regular Google Sign-In experience.

### Error Logging

The application includes error logging that persists to localStorage. Errors are automatically captured and stored (up to 50 most recent errors).

#### Accessing Error Logs

To view errors in the browser console:

```javascript
// View error log (shows table with timestamps, types, and messages)
viewYarnyErrors()

// Clear error log
clearYarnyErrors()
```

#### Error Types

The application logs the following error types:

- **`console.error`**: Errors logged via `console.error()` - typically application errors
- **`unhandledrejection`**: Unhandled promise rejections - async operation failures
- **`error`**: Global JavaScript errors - runtime exceptions

#### Common Error Scenarios

- **Drive API errors**: Usually indicate authentication or permission issues with Google Drive
  - Check that OAuth tokens are valid and not expired
  - Verify Google Cloud Console credentials are correct
  - Ensure Drive and Docs APIs are enabled
  
- **Network errors**: Connection issues preventing saves to Drive
  - Check internet connectivity
  - Verify Netlify function endpoints are accessible
  
- **File not found errors**: May occur if files were moved or deleted outside of Yarny
  - Use the "Refresh" button on stories page to sync
  - Check Drive folder structure matches expected format
  
- **Conflict detection errors**: Occurs when files are modified in Drive while being edited in Yarny
  - Usually handled automatically, but may require manual resolution

#### Error Log Structure

Each error entry includes:
- `timestamp`: ISO timestamp of when error occurred
- `type`: Error type (see above)
- `message`: Error message
- `error`: Error object with:
  - `message`: Detailed error message
  - `stack`: Stack trace (if available)
  - `response`: HTTP response details (if applicable)

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
- `POST /.netlify/functions/drive-check-comments` - Check for comments and tracked changes in a Google Doc
- `POST /.netlify/functions/drive-create-folder` - Create a new folder
- `POST /.netlify/functions/drive-delete-story` - Delete a story folder (optional Drive deletion)
- `GET /.netlify/functions/drive-get-or-create-yarny-stories` - Get or create the main Yarny stories folder
- `POST /.netlify/functions/drive-delete-file` - Delete a file (moves to trash)
- `POST /.netlify/functions/drive-rename-file` - Rename a file

### Status Monitoring
- `GET /.netlify/functions/uptime-status?monitorId=<id>` - Get Uptime Robot status (optional monitorId parameter)

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

## Status Monitoring

Yarny includes integration with Uptime Robot to display real-time availability status on the documentation page. The status indicator appears at the top of the left sidebar in the docs page, replacing the "Yarny" brand.

### Setup

1. **Create an Uptime Robot Account** (if you don't have one)
   - Sign up at [Uptime Robot](https://uptimerobot.com/)
   - Add a monitor for `yarny.lindsaybrunner.com`

2. **Get Your API Key**
   - Go to Uptime Robot dashboard → My Settings → API Settings
   - Copy your **Main API Key** (or create a monitor-specific API key)
   - The API key looks like: `ur1234567-abcdefghijklmnopqrstuvwxyz`

3. **Configure Environment Variable**
   - In Netlify dashboard, go to Site settings → Environment variables
   - Add: `UPTIME_ROBOT_API_KEY` = your API key
   - The status indicator will automatically appear on the docs page

### Status Colors

- **Green**: All systems operational (status: up)
- **Yellow**: Possible issues (status: seems down)
- **Red**: Service down (status: down)
- **Gray**: Status unknown or unavailable

The status updates automatically every 5 minutes. You can also specify a specific monitor ID by adding `?monitorId=<id>` to the function URL if you have multiple monitors.

### Technical Details

- Status is fetched via Netlify function: `/.netlify/functions/uptime-status`
- Uses Uptime Robot API v2 (`getMonitors` endpoint)
- Status is cached for 1 minute to reduce API calls
- Falls back gracefully if API key is not configured

## Recent Improvements

- **Story, Chapter, and Snippet Descriptions**: Add optional descriptions to stories (500 characters), chapters (300 characters), and snippets (300 characters). Descriptions can be added when creating a story or edited later via the Story Info & Settings modal (stories) or description icons (chapters/snippets). Descriptions are included in outline exports to create structured story overviews.
- **Goal Fields in New Story Modal**: When creating a new story, you can now set writing goal fields (deadline, writing days, mode, days off) that were previously only available via the "Today" button. These fields are shared between both interfaces for consistency.
- **Daily Writing Goals ("Goals that think")**: Set project targets with deadlines, choose writing days, and track daily progress with automatic quota calculation. Features Elastic mode (rebalances targets) and Strict mode (fixed targets). Includes midnight rollover, external edit detection, and dashboard badges
- **Comments/Tracked Changes Protection**: Warns users before overwriting Google Docs that contain comments or tracked changes, allowing them to cancel the save to preserve collaborative feedback
- **Performance Optimizations**: Significantly faster editor loading with parallel file operations, lazy loading of snippet content, and optimized batch processing - UI becomes interactive almost immediately while content loads in the background
- **Chapter Color Coding**: Interactive color picker with 12 accent colors for visual chapter organization
- **Improved Snippet Creation UX**: Snippets appear instantly when created - no waiting for Drive file creation
- **Background File Creation**: Drive files are created asynchronously so users can start typing immediately
- **Proxy-based Drive Client**: Fixed "object is not extensible" error using Proxy pattern
- **Timeout Handling**: Added timeout protection to prevent function hangs
- **Refresh from Drive**: Added manual sync button to remove deleted stories
- **Google Docs Support**: Full support for creating and editing Google Docs
- **Export Functionality**: Export combined chapters, people, places, or things to Google Docs with custom filenames
- **Error Handling**: Improved error handling and logging throughout

## License

MIT

