// Google OAuth configuration
exports.handler = async (event) => {
  const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim(); // Trim whitespace
  
  if (!clientId) {
    console.error('GOOGLE_CLIENT_ID environment variable is missing or empty');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Google Client ID not configured' })
    };
  }

  // Log length and first few characters for debugging (don't log full ID for security)
  console.log('Serving Client ID (length:', clientId.length + ', prefix:', clientId.substring(0, 20) + '...)');

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*', // Allow CORS
    },
    body: JSON.stringify({ clientId }), // Send trimmed client ID
  };
};
