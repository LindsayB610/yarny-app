const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const { getStore } = require('@netlify/blobs');

const GDRIVE_CLIENT_ID = (process.env.GDRIVE_CLIENT_ID || '').trim();
const GDRIVE_CLIENT_SECRET = (process.env.GDRIVE_CLIENT_SECRET || '').trim();
const STORAGE_KEY = 'drive_tokens.json';

// Validate client ID format (shared validation)
function validateClientId(clientId) {
  if (!clientId) return { valid: false, error: 'Client ID is empty' };
  const invalidChars = /[^a-zA-Z0-9._-]/.exec(clientId);
  if (invalidChars) {
    return { valid: false, error: `Client ID contains invalid character: "${invalidChars[0]}"` };
  }
  if (clientId.includes(' ')) {
    return { valid: false, error: 'Client ID contains spaces' };
  }
  return { valid: true };
}

// Validate client secret format (shared validation)
function validateClientSecret(clientSecret) {
  if (!clientSecret) return { valid: false, error: 'Client Secret is empty' };
  const invalidChars = /[^a-zA-Z0-9_-]/.exec(clientSecret);
  if (invalidChars) {
    return { valid: false, error: `Client Secret contains invalid character: "${invalidChars[0]}"` };
  }
  if (clientSecret.includes(' ')) {
    return { valid: false, error: 'Client Secret contains spaces' };
  }
  return { valid: true };
}

async function getTokens(email) {
  try {
    // Use Netlify Blobs for multi-user token storage
    const siteID = process.env.NETLIFY_SITE_ID || process.env.SITE_ID;
    const token = process.env.NETLIFY_AUTH_TOKEN;
    
    const storeOptions = { name: 'drive-tokens' };
    if (siteID) {
      storeOptions.siteID = siteID;
    }
    if (token) {
      storeOptions.token = token;
    }
    
    const store = getStore(storeOptions);
    
    let allTokens = {};
    try {
      const data = await store.get(STORAGE_KEY);
      if (data) {
        allTokens = JSON.parse(data);
      }
    } catch (error) {
      // No data exists yet
      console.log('getTokens - no existing data, starting fresh');
    }
    
    console.log('getTokens - looking for email:', email);
    console.log('getTokens - available emails:', Object.keys(allTokens));
    const tokens = allTokens[email] || null;
    console.log('getTokens - found tokens:', !!tokens);
    return tokens;
  } catch (error) {
    console.log('getTokens - error:', error.message);
    return null;
  }
}

async function saveTokens(email, tokens) {
  try {
    // Use Netlify Blobs for multi-user token storage
    const siteID = process.env.NETLIFY_SITE_ID || process.env.SITE_ID;
    const token = process.env.NETLIFY_AUTH_TOKEN;
    
    const storeOptions = { name: 'drive-tokens' };
    if (siteID) {
      storeOptions.siteID = siteID;
    }
    if (token) {
      storeOptions.token = token;
    }
    
    const store = getStore(storeOptions);
    
    let allTokens = {};
    try {
      const data = await store.get(STORAGE_KEY);
      if (data) {
        allTokens = JSON.parse(data);
      }
    } catch (error) {
      // No data exists yet, start fresh
    }
    
    allTokens[email] = tokens;
    await store.set(STORAGE_KEY, JSON.stringify(allTokens, null, 2));
    console.log('saveTokens - tokens saved successfully for:', email);
  } catch (error) {
    console.error('saveTokens - error saving:', error.message);
    throw error;
  }
}

async function refreshAccessToken(email, refreshToken) {
  if (!GDRIVE_CLIENT_ID || !GDRIVE_CLIENT_SECRET) {
    throw new Error('Missing Drive OAuth credentials. Please configure GDRIVE_CLIENT_ID and GDRIVE_CLIENT_SECRET.');
  }
  
  // Validate credentials format
  const clientIdValidation = validateClientId(GDRIVE_CLIENT_ID);
  const clientSecretValidation = validateClientSecret(GDRIVE_CLIENT_SECRET);
  if (!clientIdValidation.valid || !clientSecretValidation.valid) {
    const errors = [];
    if (!clientIdValidation.valid) errors.push(`Client ID: ${clientIdValidation.error}`);
    if (!clientSecretValidation.valid) errors.push(`Client Secret: ${clientSecretValidation.error}`);
    throw new Error(`Invalid credentials format: ${errors.join('; ')}`);
  }

  const oauth2Client = new OAuth2Client(
    GDRIVE_CLIENT_ID,
    GDRIVE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    refresh_token: refreshToken
  });

  const { credentials } = await oauth2Client.refreshAccessToken();
  return credentials;
}

async function getAuthenticatedDriveClient(email) {
  if (!GDRIVE_CLIENT_ID || !GDRIVE_CLIENT_SECRET) {
    throw new Error('Missing Drive OAuth credentials. Please configure GDRIVE_CLIENT_ID and GDRIVE_CLIENT_SECRET.');
  }
  
  // Validate credentials format
  const clientIdValidation = validateClientId(GDRIVE_CLIENT_ID);
  const clientSecretValidation = validateClientSecret(GDRIVE_CLIENT_SECRET);
  if (!clientIdValidation.valid || !clientSecretValidation.valid) {
    const errors = [];
    if (!clientIdValidation.valid) errors.push(`Client ID: ${clientIdValidation.error}`);
    if (!clientSecretValidation.valid) errors.push(`Client Secret: ${clientSecretValidation.error}`);
    throw new Error(`Invalid credentials format: ${errors.join('; ')}`);
  }

  let tokens = await getTokens(email);
  
  if (!tokens) {
    throw new Error('No Drive tokens found. Please authorize Drive access.');
  }

  // Check if token is expired (with 5 minute buffer)
  const now = Date.now();
  const expiryTime = tokens.expiry_date;
  
  if (!expiryTime || now >= expiryTime - 300000) {
    // Token expired or expiring soon, refresh it
    if (!tokens.refresh_token) {
      throw new Error('No refresh token available. Please re-authorize Drive access.');
    }
    
    const newTokens = await refreshAccessToken(email, tokens.refresh_token);
    
    // Update stored tokens - preserve scope from original tokens
    // Refresh tokens maintain the original scopes, so new access token has same scopes
    tokens = {
      access_token: newTokens.access_token,
      refresh_token: tokens.refresh_token, // Keep original refresh token
      expiry_date: newTokens.expiry_date,
      scope: tokens.scope || newTokens.scope // Preserve scope from original or use from refresh
    };
    
    console.log('Refreshed tokens - scope preserved:', tokens.scope);
    await saveTokens(email, tokens);
  }

  // Create OAuth2 client with current tokens
  const oauth2Client = new OAuth2Client(
    GDRIVE_CLIENT_ID,
    GDRIVE_CLIENT_SECRET
  );

  // Set credentials including access token and refresh token
  // The refresh token will automatically refresh the access token if it expires
  oauth2Client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token
  });
  
  // Enable automatic token refresh
  oauth2Client.on('tokens', (newTokens) => {
    if (newTokens.access_token) {
      // Update stored tokens when automatically refreshed
      tokens.access_token = newTokens.access_token;
      if (newTokens.expiry_date) {
        tokens.expiry_date = newTokens.expiry_date;
      }
      // Save updated tokens
      saveTokens(email, tokens).catch(err => {
        console.error('Error saving auto-refreshed tokens:', err);
      });
    }
  });

  // Return Drive API client and auth client
  const driveClient = google.drive({ version: 'v3', auth: oauth2Client });
  
  // Attach auth client for use in other APIs (like Docs API)
  // Use Object.defineProperty to ensure it persists
  Object.defineProperty(driveClient, '_auth', {
    value: oauth2Client,
    writable: false,
    enumerable: false,
    configurable: false
  });
  
  // Verify it was attached
  if (!driveClient._auth) {
    console.error('WARNING: Failed to attach _auth to driveClient');
    // Fallback: attach directly
    driveClient._auth = oauth2Client;
  }
  
  console.log('Drive client created - _auth attached:', !!driveClient._auth);
  return driveClient;
}

module.exports = {
  getAuthenticatedDriveClient,
  getTokens,
  saveTokens
};
