const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');
const { saveTokens } = require('./drive-client');

const GDRIVE_CLIENT_ID = (process.env.GDRIVE_CLIENT_ID || '').trim();
const GDRIVE_CLIENT_SECRET = (process.env.GDRIVE_CLIENT_SECRET || '').trim();

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

  console.log('Drive OAuth credentials check:');
  console.log('Client ID present:', !!GDRIVE_CLIENT_ID);
  console.log('Client ID length (after trim):', GDRIVE_CLIENT_ID?.length);
  console.log('Client ID prefix:', GDRIVE_CLIENT_ID?.substring(0, 20) + '...');
  console.log('Client ID suffix:', '...' + GDRIVE_CLIENT_ID?.substring(GDRIVE_CLIENT_ID.length - 10));
  console.log('Client ID validation: PASSED');
  console.log('Client Secret present:', !!GDRIVE_CLIENT_SECRET);
  console.log('Client Secret length (after trim):', GDRIVE_CLIENT_SECRET?.length);
  console.log('Client Secret validation: PASSED');

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

  // Determine redirect URI - must match exactly what's configured in Google Cloud Console
  const host = event.headers.host || event.headers['x-forwarded-host'];
  const protocol = host?.includes('localhost') ? 'http' : 'https';
  const redirectUri = process.env.GDRIVE_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI || 
    `${protocol}://${host}/.netlify/functions/drive-auth-callback`;

  console.log('Callback received - Redirect URI:', redirectUri);
  console.log('Host:', host);
  console.log('Protocol:', protocol);
  console.log('Expected redirect URI (must match Google Cloud Console):', redirectUri);

  // Exchange code for tokens
  const oauth2Client = new OAuth2Client(
    GDRIVE_CLIENT_ID,
    GDRIVE_CLIENT_SECRET,
    redirectUri
  );

  try {
    console.log('Attempting token exchange...');
    console.log('Redirect URI:', redirectUri);
    console.log('Redirect URI length:', redirectUri.length);
    console.log('Client ID (first 20 chars):', GDRIVE_CLIENT_ID?.substring(0, 20) + '...');
    console.log('Client ID (last 20 chars):', '...' + GDRIVE_CLIENT_ID?.substring(GDRIVE_CLIENT_ID.length - 20));
    console.log('Client Secret (first 10 chars):', GDRIVE_CLIENT_SECRET?.substring(0, 10) + '...');
    console.log('Client Secret (last 10 chars):', '...' + GDRIVE_CLIENT_SECRET?.substring(GDRIVE_CLIENT_SECRET.length - 10));
    console.log('Code present:', !!code);
    console.log('Code length:', code?.length);
    
    // Log a hash of the credentials to verify they're consistent (not logging full values for security)
    const clientIdHash = crypto.createHash('sha256').update(GDRIVE_CLIENT_ID).digest('hex').substring(0, 8);
    const secretHash = crypto.createHash('sha256').update(GDRIVE_CLIENT_SECRET).digest('hex').substring(0, 8);
    console.log('Client ID hash (first 8 chars):', clientIdHash);
    console.log('Client Secret hash (first 8 chars):', secretHash);
    
    const { tokens } = await oauth2Client.getToken(code);
    
    console.log('Token exchange successful');
    console.log('Has access_token:', !!tokens.access_token);
    console.log('Has refresh_token:', !!tokens.refresh_token);
    
    // Save tokens (access_token, refresh_token, expiry_date)
    await saveTokens(email, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date
    });
    
    console.log('Tokens saved successfully for:', email);

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
         console.error('Error message:', error.message);
         console.error('Error code:', error.code);
         console.error('Error response:', error.response?.data);
         
         // Log the exact request details (without sensitive data)
         if (error.config) {
           console.error('Request URL:', error.config.url);
           console.error('Request method:', error.config.method);
           console.error('Request headers:', JSON.stringify(error.config.headers, null, 2));
         }
         
         // More detailed error message
         let errorMessage = 'Token exchange failed';
         if (error.message) {
           errorMessage += ': ' + error.message;
         }
         if (error.response?.data?.error_description) {
           errorMessage += ' - ' + error.response.data.error_description;
         }
         if (error.response?.data?.error === 'invalid_client') {
           errorMessage += '\n\nTroubleshooting:';
           errorMessage += '\n1. Verify GDRIVE_CLIENT_ID and GDRIVE_CLIENT_SECRET in Netlify env vars match EXACTLY what\'s in Google Cloud Console';
           errorMessage += '\n2. Ensure the Client ID and Client Secret belong to the SAME OAuth 2.0 client';
           errorMessage += '\n3. Check that the OAuth client type is "Web application" (not Desktop app or other)';
           errorMessage += '\n4. Verify redirect URI matches Google Cloud Console EXACTLY (including trailing slashes): ' + redirectUri;
           errorMessage += '\n5. If you regenerated the client secret, make sure you updated the env var';
           errorMessage += '\n6. Ensure Google Drive API is enabled for this OAuth client\'s project';
           errorMessage += '\n7. Check that the OAuth consent screen is configured correctly';
         }
    
    return {
      statusCode: 302,
      headers: {
        'Location': '/stories.html?drive_auth_error=' + encodeURIComponent(errorMessage)
      }
    };
  }
};
