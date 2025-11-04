const { OAuth2Client } = require('google-auth-library');
const fs = require('fs').promises;

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const STORAGE_PATH = '/tmp/drive_tokens.json';

async function saveTokens(email, tokens) {
  let allTokens = {};
  try {
    const data = await fs.readFile(STORAGE_PATH, 'utf8');
    allTokens = JSON.parse(data);
  } catch (error) {
    // File doesn't exist, start fresh
  }
  allTokens[email] = tokens;
  await fs.writeFile(STORAGE_PATH, JSON.stringify(allTokens, null, 2));
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
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.error('Missing Google OAuth credentials');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server configuration error: Missing Google OAuth credentials' })
    };
  }

  const { code, state, error } = event.queryStringParameters || {};

  if (error) {
    return {
      statusCode: 302,
      headers: {
        'Location': '/stories.html?drive_auth_error=' + encodeURIComponent(error)
      }
    };
  }

  if (!code || !state) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing code or state parameter' })
    };
  }

  // Verify state parameter (CSRF protection)
  // State format: base64(email):randomHexState
  const stateParts = state.split(':');
  if (stateParts.length !== 2) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid state parameter format' })
    };
  }
  
  const [emailEncoded, randomState] = stateParts;
  let email;
  try {
    email = Buffer.from(emailEncoded, 'base64').toString('utf8');
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid state parameter encoding' })
    };
  }
  
  // Verify random state matches cookie (CSRF protection)
  const cookies = event.headers.cookie?.split(';') || [];
  const stateCookie = cookies.find(c => c.trim().startsWith('drive_auth_state='));
  
  if (!stateCookie) {
    console.error('State cookie not found. Available cookies:', cookies.map(c => c.trim()));
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'State cookie not found' })
    };
  }

  // Extract cookie value (handle potential attributes after the value)
  const cookieState = stateCookie.split('=')[1].split(';')[0].trim();
  if (cookieState !== randomState) {
    console.error('State mismatch. Expected:', randomState, 'Got:', cookieState);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid state parameter' })
    };
  }

  // Verify the email matches the session (if session cookie is present)
  // This provides an additional security check, but we proceed even if session cookie is missing
  // since the state parameter contains the email and was verified via the state cookie
  const sessionEmail = await getUserEmailFromSession(event);
  if (sessionEmail && sessionEmail !== email) {
    console.error('Email mismatch. Session:', sessionEmail, 'State:', email);
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'Email mismatch' })
    };
  }
  
  // Use email from state parameter (not from session cookie)
  // This allows OAuth to work even if session cookie isn't sent due to SameSite=Strict

  // Determine redirect URI
  const host = event.headers.host || event.headers['x-forwarded-host'];
  const protocol = host?.includes('localhost') ? 'http' : 'https';
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 
    `${protocol}://${host}/.netlify/functions/drive-auth-callback`;

  // Exchange code for tokens
  const oauth2Client = new OAuth2Client(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    // Save tokens (access_token, refresh_token, expiry_date)
    await saveTokens(email, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date
    });

    // Clear state cookie (with SameSite=Lax to match original cookie)
    const clearStateCookie = 'drive_auth_state=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax; Secure;';

    return {
      statusCode: 302,
      multiValueHeaders: {
        'Set-Cookie': [clearStateCookie]
      },
      headers: {
        'Location': '/stories.html?drive_auth_success=true'
      }
    };
  } catch (error) {
    console.error('Token exchange error:', error);
    return {
      statusCode: 302,
      headers: {
        'Location': '/stories.html?drive_auth_error=' + encodeURIComponent('Token exchange failed')
      }
    };
  }
};
