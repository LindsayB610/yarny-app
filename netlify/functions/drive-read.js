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

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const email = await getUserEmailFromSession(event);
  if (!email) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Not authenticated' }) };
  }

  try {
    const { fileId } = JSON.parse(event.body);
    if (!fileId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'fileId required' }) };
    }

    const drive = await getAuthenticatedDriveClient(email);
    
    // Get file metadata first
    const fileMetadata = await drive.files.get({
      fileId: fileId,
      fields: 'id, name, mimeType'
    });

    // Download file content
    const fileContent = await drive.files.get(
      { fileId: fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );

    // Convert buffer to string (assuming text files)
    const content = Buffer.from(fileContent.data).toString('utf8');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: fileMetadata.data.id,
        name: fileMetadata.data.name,
        mimeType: fileMetadata.data.mimeType,
        content: content
      })
    };
  } catch (error) {
    console.error('Drive read error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Failed to read file' })
    };
  }
};
