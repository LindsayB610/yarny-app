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
    const { folderName, parentFolderId } = JSON.parse(event.body);
    
    if (!folderName) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: 'folderName required' }) 
      };
    }

    const drive = await getAuthenticatedDriveClient(email, context);
    
    // Check if folder already exists
    const query = parentFolderId
      ? `name='${folderName.replace(/'/g, "\\'")}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
      : `name='${folderName.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    
    const existingFolders = await drive.files.list({
      q: query,
      fields: 'files(id, name)'
    });

    if (existingFolders.data.files && existingFolders.data.files.length > 0) {
      // Folder already exists, return it
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: existingFolders.data.files[0].id,
          name: existingFolders.data.files[0].name,
          created: false
        })
      };
    }

    // Create new folder
    const folderMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    };

    if (parentFolderId) {
      folderMetadata.parents = [parentFolderId];
    }

    const response = await drive.files.create({
      requestBody: folderMetadata,
      fields: 'id, name, createdTime'
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: response.data.id,
        name: response.data.name,
        created: true
      })
    };
  } catch (error) {
    console.error('Drive create folder error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Failed to create folder' })
    };
  }
};
