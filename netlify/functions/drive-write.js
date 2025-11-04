const { getAuthenticatedDriveClient } = require('./drive-client');
const { Readable } = require('stream');

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
    const { fileId, fileName, content, parentFolderId } = JSON.parse(event.body);
    
    if (!fileName || content === undefined) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: 'fileName and content required' }) 
      };
    }

    const drive = await getAuthenticatedDriveClient(email);
    const fileBuffer = Buffer.from(content, 'utf8');

    if (fileId) {
      // Update existing file
      // Convert Buffer to stream for Google Drive API
      const fileStream = Readable.from(fileBuffer);
      await drive.files.update({
        fileId: fileId,
        media: {
          mimeType: 'text/plain',
          body: fileStream
        }
      });

      const fileMetadata = await drive.files.get({
        fileId: fileId,
        fields: 'id, name, modifiedTime'
      });

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: fileMetadata.data.id,
          name: fileMetadata.data.name,
          modifiedTime: fileMetadata.data.modifiedTime
        })
      };
    } else {
      // Create new file
      const fileMetadata = {
        name: fileName,
        mimeType: 'text/plain'
      };

      if (parentFolderId) {
        fileMetadata.parents = [parentFolderId];
      }

      // Convert Buffer to stream for Google Drive API
      const fileStream = Readable.from(fileBuffer);
      const response = await drive.files.create({
        requestBody: fileMetadata,
        media: {
          mimeType: 'text/plain',
          body: fileStream
        },
        fields: 'id, name, modifiedTime'
      });

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: response.data.id,
          name: response.data.name,
          modifiedTime: response.data.modifiedTime
        })
      };
    }
  } catch (error) {
    console.error('Drive write error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Failed to write file' })
    };
  }
};
