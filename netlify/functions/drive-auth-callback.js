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

  const { code, state, error } = event.queryStringParameters || {};

  if (error) {
    return {
      statusCode: 302,
      headers: {
        'Location': '/editor.html?drive_auth_error=' + encodeURIComponent(error)
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
  const cookies = event.headers.cookie?.split(';') || [];
  const stateCookie = cookies.find(c => c.trim().startsWith('drive_auth_state='));
  
  if (!stateCookie) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'State cookie not found' })
    };
  }

  const cookieState = stateCookie.split('=')[1].trim();
  if (cookieState !== state) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid state parameter' })
    };
  }

  // Get user email from session
  const email = await getUserEmailFromSession(event);
  if (!email) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Not authenticated' })
    };
  }

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

    // Clear state cookie
    const clearStateCookie = 'drive_auth_state=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

    return {
      statusCode: 302,
      multiValueHeaders: {
        'Set-Cookie': [clearStateCookie]
      },
      headers: {
        'Location': '/editor.html?drive_auth_success=true'
      }
    };
  } catch (error) {
    console.error('Token exchange error:', error);
    return {
      statusCode: 302,
      headers: {
        'Location': '/editor.html?drive_auth_error=' + encodeURIComponent('Token exchange failed')
      }
    };
  }
};
