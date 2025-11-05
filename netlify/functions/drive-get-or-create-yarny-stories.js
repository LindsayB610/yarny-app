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
    
    // First, search for "Yarny Stories" folder (new name)
    let query = `name='${escapeQuery(YARNY_STORIES_FOLDER)}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    console.log(`Searching for "${YARNY_STORIES_FOLDER}" folder for user ${email}`);
    let existingFolders = await drive.files.list({
      q: query,
      fields: 'files(id, name)',
      spaces: 'drive'
    });

    if (existingFolders.data.files && existingFolders.data.files.length > 0) {
      // "Yarny Stories" folder exists, return it
      console.log(`Found "${YARNY_STORIES_FOLDER}" folder: ${existingFolders.data.files[0].id}`);
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

    // "Yarny Stories" doesn't exist, check for old "Yarny" folder (migration)
    query = `name='${escapeQuery(OLD_YARNY_FOLDER)}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    console.log(`"Yarny Stories" not found, searching for old "${OLD_YARNY_FOLDER}" folder for user ${email}`);
    existingFolders = await drive.files.list({
      q: query,
      fields: 'files(id, name)',
      spaces: 'drive'
    });

    console.log(`Found ${existingFolders.data.files?.length || 0} folder(s) matching "${OLD_YARNY_FOLDER}"`);

    if (existingFolders.data.files && existingFolders.data.files.length > 0) {
      // Old "Yarny" folder exists, rename it to "Yarny Stories"
      const oldFolder = existingFolders.data.files[0];
      console.log(`Migrating folder "${OLD_YARNY_FOLDER}" (id: ${oldFolder.id}) to "${YARNY_STORIES_FOLDER}" for user ${email}`);
      
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
