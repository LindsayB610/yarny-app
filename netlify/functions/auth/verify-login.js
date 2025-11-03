const { verifyAuthenticationResponse } = require('@simplewebauthn/server');
const { RP_ID, ORIGIN } = require('./config');
const { getCredential, saveCredential } = require('./storage');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { email, credential } = body;

    // Get stored challenge
    const challenge = await getChallenge(`login:${email}`);

    if (!email || !credential) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Email and credential required' })
      };
    }

    // Get stored credential
    const storedCredential = await getCredential(email);

    if (!storedCredential) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Credential not found' }),
      };
    }

    // Convert stored credential back to binary format
    const credentialID = Buffer.from(storedCredential.credentialID, 'base64');
    const credentialPublicKey = Buffer.from(storedCredential.credentialPublicKey, 'base64');

    // Verify authentication response
    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: challenge, // Pass the challenge from the login step
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      authenticator: {
        credentialID,
        credentialPublicKey,
        counter: storedCredential.counter || 0,
      },
    });

    if (verification.verified) {
      // Update counter
      storedCredential.counter = verification.authenticationInfo.newCounter;
      await saveCredential(email, storedCredential);
      
      // Create session
      const sessionToken = Buffer.from(`${email}:${Date.now()}`).toString('base64');
      
      return {
        statusCode: 200,
        headers: {
          'Set-Cookie': `session=${sessionToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${60 * 60 * 24 * 7}`, // 7 days
        },
        body: JSON.stringify({ 
          verified: true,
          user: email 
        }),
      };
    } else {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Verification failed' }),
      };
    }
  } catch (error) {
    console.error('Verify login error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
