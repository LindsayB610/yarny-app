const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const fs = require('fs').promises;
const path = require('path');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const STORAGE_PATH = '/tmp/drive_tokens.json';

async function getTokens(email) {
  try {
    const data = await fs.readFile(STORAGE_PATH, 'utf8');
    const allTokens = JSON.parse(data);
    return allTokens[email] || null;
  } catch (error) {
    return null;
  }
}

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

async function refreshAccessToken(email, refreshToken) {
  const oauth2Client = new OAuth2Client(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    refresh_token: refreshToken
  });

  const { credentials } = await oauth2Client.refreshAccessToken();
  return credentials;
}

async function getAuthenticatedDriveClient(email) {
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
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET
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
