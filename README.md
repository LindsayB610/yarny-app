# Yarny - Personal Writing Tool

A simple, secure writing tool with WebAuthn authentication (passwordless login using your device's biometric authentication).

## Features

- **Passwordless Authentication**: Sign in using email + WebAuthn (Touch ID, Face ID, fingerprint, or security key)
- **No Passwords**: Uses your device's built-in security instead
- **Simple & Secure**: Built on WebAuthn standard (FIDO2)
- **Free**: No third-party services or costs

## Tech Stack

- **Frontend**: Vanilla HTML/JS (no framework needed)
- **Backend**: Netlify Functions (serverless)
- **Authentication**: WebAuthn via @simplewebauthn
- **Storage**: Temporary file storage (for single-user use)

## Setup Instructions

### 1. Install Dependencies

```bash
cd yarny-app
npm install
```

### 2. Configure Environment Variables

In your Netlify dashboard, go to **Site settings > Environment variables** and add:

- `RP_ID`: Your domain (e.g., `yarny.lindsaybrunner.com`)
- `RP_NAME`: Display name (e.g., `Yarny - Writing Tool`)
- `ORIGIN`: Full URL (e.g., `https://yarny.lindsaybrunner.com`)

### 3. Create GitHub Repository

```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "Initial commit: Yarny writing tool with WebAuthn"

# Create new repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/yarny-app.git
git branch -M main
git push -u origin main
```

### 4. Deploy to Netlify

1. Go to [Netlify](https://app.netlify.com)
2. Click **Add new site > Import an existing project**
3. Connect your GitHub repository
4. Configure build settings:
   - **Build command**: Leave empty (or `echo 'No build'`)
   - **Publish directory**: `public`
5. Add environment variables (from step 2)
6. Click **Deploy site**

### 5. Configure Subdomain

1. In Netlify dashboard, go to **Domain settings**
2. Click **Add custom domain**
3. Enter `yarny.lindsaybrunner.com`
4. Follow DNS configuration instructions:
   - Add a CNAME record: `yarny` → `your-site.netlify.app`
   - Or use Netlify DNS if you manage DNS there

### 6. Test Authentication

1. Visit `https://yarny.lindsaybrunner.com`
2. Enter your email address
3. Click "Sign in with your device"
4. Approve the authentication request on your device (biometric, PIN, etc.)
5. You're in!

## Development

### Local Development

```bash
# Install Netlify CLI globally (if not already installed)
npm install -g netlify-cli

# Start local dev server
npm run dev
```

Visit `http://localhost:8888` to test locally.

### Project Structure

```
yarny-app/
├── netlify/
│   ├── functions/
│   │   └── auth/
│   │       ├── register.js          # Generate registration options
│   │       ├── verify-register.js   # Verify registration
│   │       ├── login.js             # Generate login options
│   │       ├── verify-login.js      # Verify login
│   │       ├── config.js            # WebAuthn configuration
│   │       └── storage.js           # Credential storage
│   └── functions/
├── public/
│   ├── index.html                   # Main app page
│   └── app.js                       # Frontend WebAuthn logic
├── netlify.toml                     # Netlify configuration
├── package.json
└── README.md
```

## Security Notes

- Credentials are stored in `/tmp` (temporary filesystem) - this is fine for single-user personal use
- For production with multiple users, consider:
  - Netlify Blobs for credential storage
  - Database (PostgreSQL, MongoDB, etc.)
  - Proper session management with secure cookies
- WebAuthn requires HTTPS (Netlify provides this automatically)

## Next Steps

After authentication is working, you can build out the writing tool features:
- Text editor
- Save/load documents
- Export options
- etc.

## License

MIT

