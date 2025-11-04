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
  if (event.httpMethod !== 'POST' && event.httpMethod !== 'DELETE') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const email = await getUserEmailFromSession(event);
  if (!email) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Not authenticated' }) };
  }

  try {
    const { storyFolderId, deleteFromDrive } = JSON.parse(event.body);
    
    if (!storyFolderId) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: 'storyFolderId required' }) 
      };
    }

    const drive = await getAuthenticatedDriveClient(email);
    
    if (deleteFromDrive) {
      // Permanently delete the folder from Google Drive
      await drive.files.delete({
        fileId: storyFolderId
      });
      
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          success: true, 
          message: 'Story deleted from Google Drive',
          deletedFromDrive: true
        })
      };
    } else {
      // Just trash the folder (soft delete - can be recovered)
      await drive.files.update({
        fileId: storyFolderId,
        requestBody: {
          trashed: true
        }
      });
      
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          success: true, 
          message: 'Story moved to trash',
          deletedFromDrive: false
        })
      };
    }
  } catch (error) {
    console.error('Drive delete story error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Failed to delete story' })
    };
  }
};

