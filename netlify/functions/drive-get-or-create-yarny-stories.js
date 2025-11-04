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
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const email = await getUserEmailFromSession(event);
  if (!email) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Not authenticated' }) };
  }

  try {
    const drive = await getAuthenticatedDriveClient(email);
    const YARNY_STORIES_FOLDER = 'yarny-stories';
    
    // Search for yarny-stories folder
    const query = `name='${YARNY_STORIES_FOLDER}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const existingFolders = await drive.files.list({
      q: query,
      fields: 'files(id, name)'
    });

    if (existingFolders.data.files && existingFolders.data.files.length > 0) {
      // Folder exists, return it
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

    // Folder doesn't exist, create it
    const folderMetadata = {
      name: YARNY_STORIES_FOLDER,
      mimeType: 'application/vnd.google-apps.folder'
    };

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
    console.error('Drive get/create yarny-stories error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Failed to get or create yarny-stories folder' })
    };
  }
};
