const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');

const GDRIVE_CLIENT_ID = process.env.GDRIVE_CLIENT_ID;
const GDRIVE_CLIENT_SECRET = process.env.GDRIVE_CLIENT_SECRET;
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

async function getUserEmailFromSession(event) {
  const cookies = event.headers.cookie?.split(';') || [];
  const sessionCookie = cookies.find(c => c.trim().startsWith('session='));
  if (!sessionCookie) return null;
  
  try {
    const sessionToken = sessionCookie.split('=')[1].trim();
    const decoded = Buffer.from(sessionToken, 'base64').toString();
    const parts = decoded.split(':');
    return parts[0];
  } catch (error) {
    return null;
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // Validate environment variables
  if (!GDRIVE_CLIENT_ID || !GDRIVE_CLIENT_SECRET) {
    console.error('Missing Drive OAuth credentials');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server configuration error: Missing Drive OAuth credentials. Please configure GDRIVE_CLIENT_ID and GDRIVE_CLIENT_SECRET.' })
    };
  }

  // Get user session from cookie
  const email = await getUserEmailFromSession(event);
  if (!email) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Not authenticated' })
    };
  }

  // Generate state parameter for CSRF protection
  // Encode email in state so we can retrieve it on callback without relying on session cookie
  const randomState = crypto.randomBytes(32).toString('hex');
  const emailEncoded = Buffer.from(email).toString('base64');
  const state = `${emailEncoded}:${randomState}`;
  
  // Store state in cookie (short-lived, 10 minutes) - just for CSRF verification
  // Use SameSite=Lax to allow cookie to be sent on OAuth redirects
  const stateCookie = `drive_auth_state=${randomState}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`;
  
  // Determine redirect URI - must match exactly what's configured in Google Cloud Console
  const host = event.headers.host || event.headers['x-forwarded-host'];
  const protocol = host?.includes('localhost') ? 'http' : 'https';
  const redirectUri = process.env.GDRIVE_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI || 
    `${protocol}://${host}/.netlify/functions/drive-auth-callback`;
  
  console.log('Drive auth initiated - Redirect URI:', redirectUri);
  console.log('Using Client ID (first 20 chars):', GDRIVE_CLIENT_ID?.substring(0, 20) + '...');

  // Create OAuth2 client
  const oauth2Client = new OAuth2Client(
    GDRIVE_CLIENT_ID,
    GDRIVE_CLIENT_SECRET,
    redirectUri
  );

  // Generate authorization URL
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Required to get refresh token
    scope: [DRIVE_SCOPE],
    state: state,
    prompt: 'consent' // Force consent screen to get refresh token
  });

  return {
    statusCode: 302,
    multiValueHeaders: {
      'Set-Cookie': [stateCookie],
      'Location': [authUrl]
    }
  };
};
