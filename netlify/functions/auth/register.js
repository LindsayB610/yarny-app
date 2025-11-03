const { generateRegistrationOptions } = require('@simplewebauthn/server');
const { RP_ID, RP_NAME, ORIGIN, ALLOWED_EMAIL } = require('./config');
const { saveChallenge, getChallenge } = require('./storage');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { email } = JSON.parse(event.body);

    if (!email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Email required' })
      };
    }

    // Only allow the whitelisted email
    if (email.toLowerCase() !== ALLOWED_EMAIL.toLowerCase()) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Access denied. This application is private.' })
      };
    }

    // Generate registration options
    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userName: email,
      userDisplayName: email,
      timeout: 60000,
      attestationType: 'none',
      excludeCredentials: [], // For first-time setup
      supportedAlgorithmIDs: [-7, -257], // ES256 and RS256
      authenticatorSelection: {
        authenticatorAttachment: 'cross-platform', // Allows cross-device (phone) authentication
        userVerification: 'preferred',
        requireResidentKey: false,
      },
    });

    // Store challenge for verification
    await saveChallenge(`register:${email}`, options.challenge);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    };
  } catch (error) {
    console.error('Registration error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

