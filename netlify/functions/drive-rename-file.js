const { getAuthenticatedDriveClient } = require('./drive-client');

async function getUserEmailFromSession(event) {
  const cookies = event.headers.cookie?.split(';') || [];
  const sessionCookie = cookies.find(c => c.trim().startsWith('session='));
  if (!sessionCookie) return null;
  
  try {
    const sessionToken = sessionCookie.split('=')[1].trim();
    const decoded = Buffer.from(sessionToken, 'base64').toString();
    const parts = decoded.split(':');
    return parts[0];
  } catch (error) {
    return null;
  }
}

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const email = await getUserEmailFromSession(event);
  if (!email) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Not authenticated' }) };
  }

  try {
    const { fileId, fileName } = JSON.parse(event.body);
    
    if (!fileId || !fileName) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: 'fileId and fileName required' }) 
      };
    }

    const drive = await getAuthenticatedDriveClient(email);
    
    // Update file name
    await drive.files.update({
      fileId: fileId,
      requestBody: {
        name: fileName
      }
    });
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        success: true, 
        message: 'File renamed'
      })
    };
  } catch (error) {
    console.error('Drive rename file error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Failed to rename file' })
    };
  }
};

