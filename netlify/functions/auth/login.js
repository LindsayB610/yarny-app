const { generateAuthenticationOptions } = require('@simplewebauthn/server');
const { RP_ID, ALLOWED_EMAIL } = require('./config');
const { getCredential, saveChallenge } = require('./storage');

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

    // Check if user has registered credentials
    const credential = await getCredential(email);
    
    if (!credential) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'User not registered. Please register first.' }),
      };
    }

    // Generate authentication options
    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      allowCredentials: [{
        id: Buffer.from(credential.credentialID, 'base64'),
        type: 'public-key',
        transports: credential.transports || ['internal', 'hybrid'], // Allow cross-device
      }],
      userVerification: 'preferred',
      timeout: 60000,
    });

    // Store challenge for verification
    await saveChallenge(`login:${email}`, options.challenge);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

