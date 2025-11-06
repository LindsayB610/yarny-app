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
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const email = await getUserEmailFromSession(event);
  if (!email) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Not authenticated' }) };
  }

  try {
    const drive = await getAuthenticatedDriveClient(email);
    const YARNY_STORIES_FOLDER = 'Yarny Stories';
    const OLD_YARNY_FOLDER = 'Yarny'; // Legacy folder name for migration
    
    // Escape single quotes in folder names for the query
    const escapeQuery = (name) => name.replace(/'/g, "\\'");
    
    // OPTIMIZATION: Search for both folder names in a single query
    // This reduces API calls from 2 to 1 for new accounts
    const escapedNew = escapeQuery(YARNY_STORIES_FOLDER);
    const escapedOld = escapeQuery(OLD_YARNY_FOLDER);
    const query = `(name='${escapedNew}' or name='${escapedOld}') and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    
    console.log(`Searching for "${YARNY_STORIES_FOLDER}" or "${OLD_YARNY_FOLDER}" folder for user ${email}`);
    const existingFolders = await drive.files.list({
      q: query,
      fields: 'files(id, name)',
      spaces: 'drive'
    });

    // Check if "Yarny Stories" folder exists (new name - preferred)
    const newFolder = existingFolders.data.files?.find(f => f.name === YARNY_STORIES_FOLDER);
    if (newFolder) {
      console.log(`Found "${YARNY_STORIES_FOLDER}" folder: ${newFolder.id}`);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newFolder.id,
          name: newFolder.name,
          created: false
        })
      };
    }

    // Check if old "Yarny" folder exists (migration)
    const oldFolder = existingFolders.data.files?.find(f => f.name === OLD_YARNY_FOLDER);
    if (oldFolder) {
      console.log(`Found old "${OLD_YARNY_FOLDER}" folder (id: ${oldFolder.id}), migrating to "${YARNY_STORIES_FOLDER}" for user ${email}`);
      
      try {
        await drive.files.update({
          fileId: oldFolder.id,
          requestBody: {
            name: YARNY_STORIES_FOLDER
          }
        });
        console.log(`Successfully renamed folder to "${YARNY_STORIES_FOLDER}"`);

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: oldFolder.id,
            name: YARNY_STORIES_FOLDER,
            created: false,
            migrated: true
          })
        };
      } catch (updateError) {
        console.error(`Failed to rename folder:`, updateError);
        throw new Error(`Failed to rename folder: ${updateError.message}`);
      }
    }

    // Neither folder exists, create "Yarny Stories"
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
    console.error('Drive get/create Yarny Stories folder error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Failed to get or create Yarny Stories folder' })
    };
  }
};
