// Simple file-based storage for credentials
// In production, use Netlify Blobs, a database, or similar
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const STORAGE_PATH = '/tmp/webauthn_credentials.json';

async function loadCredentials() {
  try {
    const data = await fs.readFile(STORAGE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // File doesn't exist, return empty object
    return {};
  }
}

async function saveCredentials(credentials) {
  await fs.writeFile(STORAGE_PATH, JSON.stringify(credentials, null, 2), 'utf8');
}

async function getCredential(email) {
  const credentials = await loadCredentials();
  return credentials[email] || null;
}

async function saveCredential(email, credentialData) {
  const credentials = await loadCredentials();
  
  // Convert credential data to storage format
  credentials[email] = {
    credentialID: Buffer.from(credentialData.credentialID).toString('base64'),
    credentialPublicKey: Buffer.from(credentialData.credentialPublicKey).toString('base64'),
    counter: credentialData.counter || 0,
    transports: credentialData.transports || ['internal'],
    createdAt: new Date().toISOString(),
  };
  
  await saveCredentials(credentials);
  return credentials[email];
}

const CHALLENGE_PATH = '/tmp/webauthn_challenges.json';

async function loadChallenges() {
  try {
    const data = await fs.readFile(CHALLENGE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

async function saveChallenges(challenges) {
  await fs.writeFile(CHALLENGE_PATH, JSON.stringify(challenges, null, 2), 'utf8');
}

async function saveChallenge(key, challenge) {
  const challenges = await loadChallenges();
  challenges[key] = {
    challenge,
    expiresAt: Date.now() + (5 * 60 * 1000), // 5 minutes
  };
  await saveChallenges(challenges);
}

async function getChallenge(key) {
  const challenges = await loadChallenges();
  const challengeData = challenges[key];
  
  if (!challengeData) {
    return null;
  }
  
  // Check if expired
  if (Date.now() > challengeData.expiresAt) {
    delete challenges[key];
    await saveChallenges(challenges);
    return null;
  }
  
  // Delete after use
  delete challenges[key];
  await saveChallenges(challenges);
  
  return challengeData.challenge;
}

module.exports = {
  getCredential,
  saveCredential,
  saveChallenge,
  getChallenge,
};

