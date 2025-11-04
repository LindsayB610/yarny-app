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
    // Try to get store - if Blobs is enabled, this will work automatically
    const store = getStore('drive-tokens');
    
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
    // If Blobs isn't configured, fall back to null
    return null;
  }
}

async function saveTokens(email, tokens) {
  try {
    // Try to get store - if Blobs is enabled, this will work automatically
    const store = getStore('drive-tokens');
    
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
    
    // Update stored tokens
    tokens = {
      access_token: newTokens.access_token,
      refresh_token: tokens.refresh_token, // Keep original refresh token
      expiry_date: newTokens.expiry_date
    };
    
    await saveTokens(email, tokens);
  }

  // Create OAuth2 client with current tokens
  const oauth2Client = new OAuth2Client(
    GDRIVE_CLIENT_ID,
    GDRIVE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token
  });

  // Return Drive API client
  return google.drive({ version: 'v3', auth: oauth2Client });
}

module.exports = {
  getAuthenticatedDriveClient,
  getTokens,
  saveTokens
};
