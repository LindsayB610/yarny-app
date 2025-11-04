// Google OAuth configuration
exports.handler = async (event) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  
  if (!clientId) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Google Client ID not configured' })
    };
  }

  // Log first few characters for debugging (don't log full ID for security)
  console.log('Serving Client ID:', clientId.substring(0, 20) + '...');

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*', // Allow CORS
    },
    body: JSON.stringify({ clientId }),
  };
};
