const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');

const GDRIVE_CLIENT_ID = (process.env.GDRIVE_CLIENT_ID || '').trim();
const GDRIVE_CLIENT_SECRET = (process.env.GDRIVE_CLIENT_SECRET || '').trim();
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

// Validate client ID format
function validateClientId(clientId) {
  if (!clientId) return { valid: false, error: 'Client ID is empty' };
  
  // Check for invalid characters (should only contain alphanumeric, hyphens, dots, underscores)
  const invalidChars = /[^a-zA-Z0-9._-]/.exec(clientId);
  if (invalidChars) {
    return { 
      valid: false, 
      error: `Client ID contains invalid character: "${invalidChars[0]}" at position ${invalidChars.index}` 
    };
  }
  
  // Google client IDs should end with .apps.googleusercontent.com
  if (!clientId.endsWith('.apps.googleusercontent.com')) {
    console.warn('Client ID does not end with .apps.googleusercontent.com - may not be a valid Google OAuth client ID');
  }
  
  // Check for common issues
  if (clientId.includes(' ')) {
    return { valid: false, error: 'Client ID contains spaces (should be trimmed)' };
  }
  
  return { valid: true };
}

// Validate client secret format
function validateClientSecret(clientSecret) {
  if (!clientSecret) return { valid: false, error: 'Client Secret is empty' };
  
  // Check for invalid characters (should be alphanumeric or base64-like)
  // Google secrets are typically alphanumeric, may contain dashes
  const invalidChars = /[^a-zA-Z0-9_-]/.exec(clientSecret);
  if (invalidChars) {
    return { 
      valid: false, 
      error: `Client Secret contains invalid character: "${invalidChars[0]}" at position ${invalidChars.index}` 
    };
  }
  
  // Check for common issues
  if (clientSecret.includes(' ')) {
    return { valid: false, error: 'Client Secret contains spaces (should be trimmed)' };
  }
  
  // Typical Google client secrets are 24-40 characters
  if (clientSecret.length < 20 || clientSecret.length > 100) {
    console.warn(`Client Secret length (${clientSecret.length}) is unusual - typical range is 24-40 characters`);
  }
  
  return { valid: true };
}

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

  // Validate client ID format
  const clientIdValidation = validateClientId(GDRIVE_CLIENT_ID);
  if (!clientIdValidation.valid) {
    console.error('Invalid Client ID:', clientIdValidation.error);
    console.error('Client ID value (first/last 20 chars):', GDRIVE_CLIENT_ID.substring(0, 20) + '...' + GDRIVE_CLIENT_ID.substring(GDRIVE_CLIENT_ID.length - 20));
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Invalid Client ID format: ${clientIdValidation.error}` })
    };
  }

  // Validate client secret format
  const clientSecretValidation = validateClientSecret(GDRIVE_CLIENT_SECRET);
  if (!clientSecretValidation.valid) {
    console.error('Invalid Client Secret:', clientSecretValidation.error);
    console.error('Client Secret length:', GDRIVE_CLIENT_SECRET.length);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Invalid Client Secret format: ${clientSecretValidation.error}` })
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
