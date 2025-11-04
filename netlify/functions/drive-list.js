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
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const email = await getUserEmailFromSession(event);
  if (!email) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Not authenticated' }) };
  }

  console.log('Drive list - looking for tokens for email:', email);

  try {
    const drive = await getAuthenticatedDriveClient(email);
    
    const { folderId, pageToken } = event.queryStringParameters || {};
    
    const query = folderId 
      ? `'${folderId}' in parents and trashed=false`
      : "trashed=false";
    
    const response = await drive.files.list({
      q: query,
      fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, size)',
      pageSize: 100,
      pageToken: pageToken || undefined,
      orderBy: 'modifiedTime desc'
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response.data)
    };
  } catch (error) {
    console.error('Drive list error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Failed to list files' })
    };
  }
};
