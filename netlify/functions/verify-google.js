const { OAuth2Client } = require('google-auth-library');

const ALLOWED_EMAIL = process.env.ALLOWED_EMAIL || 'lindsayb82@gmail.com';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { token } = JSON.parse(event.body);

    if (!token) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Token required' })
      };
    }

    if (!GOOGLE_CLIENT_ID) {
      console.error('GOOGLE_CLIENT_ID not configured');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Server configuration error' })
      };
    }

    // Verify the Google ID token
    const client = new OAuth2Client(GOOGLE_CLIENT_ID);
    
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload.email;

    // Verify email is allowed
    if (email.toLowerCase() !== ALLOWED_EMAIL.toLowerCase()) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Access denied. This application is private.' })
      };
    }

    // Create session
    const sessionToken = Buffer.from(`${email}:${Date.now()}`).toString('base64');
    
    // Set both HttpOnly (secure) and non-HttpOnly (for client-side checks) cookies
    // Netlify Functions needs multiple Set-Cookie headers as an array
    const cookieOptions = `Path=/; Max-Age=${60 * 60 * 48}`; // 48 hours
    const httpOnlyCookie = `session=${sessionToken}; HttpOnly; Secure; SameSite=Strict; ${cookieOptions}`;
    const clientCookie = `auth=${sessionToken}; Secure; SameSite=Strict; ${cookieOptions}`;
    
    return {
      statusCode: 200,
      multiValueHeaders: {
        'Set-Cookie': [httpOnlyCookie, clientCookie],
      },
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        verified: true,
        user: email,
        name: payload.name,
        picture: payload.picture,
        token: sessionToken // Include token for localStorage fallback
      }),
    };
  } catch (error) {
    console.error('Google OAuth verification error:', error);
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Authentication failed. Please try again.' }),
    };
  }
};

