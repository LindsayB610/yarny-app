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

// Helper to add timeout to promises
function withTimeout(promise, timeoutMs, errorMessage) {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(errorMessage || 'Operation timed out')), timeoutMs)
    )
  ]);
}

exports.handler = async (event, context) => {
  // Set function timeout to use as much time as available
  context.callbackWaitsForEmptyEventLoop = false;
  
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

    console.log('Creating folder:', folderName, 'parentFolderId:', parentFolderId);
    
    // Get authenticated drive client with timeout (max 8 seconds to leave buffer for response)
    const drive = await withTimeout(
      getAuthenticatedDriveClient(email),
      8000,
      'Drive client authentication timed out'
    );
    
    // Check if folder already exists (with timeout)
    const query = parentFolderId
      ? `name='${folderName.replace(/'/g, "\\'")}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
      : `name='${folderName.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    
    console.log('Checking for existing folder...');
    const existingFolders = await withTimeout(
      drive.files.list({
        q: query,
        fields: 'files(id, name)'
      }),
      8000,
      'Folder check timed out'
    );

    if (existingFolders.data.files && existingFolders.data.files.length > 0) {
      // Folder already exists, return it
      console.log('Folder already exists:', existingFolders.data.files[0].id);
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

    // Create new folder (with timeout)
    console.log('Creating new folder...');
    const folderMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    };

    if (parentFolderId) {
      folderMetadata.parents = [parentFolderId];
    }

    const response = await withTimeout(
      drive.files.create({
        requestBody: folderMetadata,
        fields: 'id, name, createdTime'
      }),
      8000,
      'Folder creation timed out'
    );

    console.log('Folder created successfully:', response.data.id);
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
    const errorMessage = error.message || 'Failed to create folder';
    
    // Check if it's a timeout error
    if (errorMessage.includes('timed out') || errorMessage.includes('timeout')) {
      return {
        statusCode: 504,
        body: JSON.stringify({ error: 'Request timed out. Please try again.' })
      };
    }
    
    return {
      statusCode: 500,
      body: JSON.stringify({ error: errorMessage })
    };
  }
};
