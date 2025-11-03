const { verifyRegistrationResponse } = require('@simplewebauthn/server');
const { RP_ID, ORIGIN } = require('./config');
const { saveCredential } = require('./storage');

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
    const challenge = await getChallenge(`register:${email}`);

    if (!email || !credential) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Email and credential required' })
      };
    }

    // Verify registration response
    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: challenge, // Pass the challenge from the registration step
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
    });

    if (verification.verified && verification.registrationInfo) {
      // Save the credential for future logins
      await saveCredential(email, verification.registrationInfo);
      
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
    console.error('Verify registration error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
