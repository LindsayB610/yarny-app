const API_BASE = '/.netlify/functions';

// Initiate Drive authorization
async function authorizeDrive() {
  try {
    const response = await fetch(`${API_BASE}/drive-auth`);
    if (response.status === 302 || response.redirected) {
      // Redirect to Google OAuth
      const location = response.headers.get('Location') || response.url;
      if (location) {
        window.location.href = location;
      } else {
        throw new Error('No redirect URL received');
      }
    } else if (response.ok) {
      // Try to get location from headers
      const location = response.headers.get('Location');
      if (location) {
        window.location.href = location;
      } else {
        const text = await response.text();
        throw new Error('Unexpected response format');
      }
    } else {
      const error = await response.json();
      throw new Error(error.error || 'Failed to initiate Drive authorization');
    }
  } catch (error) {
    console.error('Drive authorization error:', error);
    alert('Failed to authorize Drive: ' + error.message);
    throw error;
  }
}

// List files in Drive
async function listDriveFiles(folderId = null) {
  try {
    const url = new URL(`${API_BASE}/drive-list`, window.location.origin);
    if (folderId) {
      url.searchParams.set('folderId', folderId);
    }
    
    const response = await fetch(url);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to list files');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Drive list error:', error);
    throw error;
  }
}

// Read file from Drive
async function readDriveFile(fileId) {
  try {
    const response = await fetch(`${API_BASE}/drive-read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to read file');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Drive read error:', error);
    throw error;
  }
}

// Write file to Drive
async function writeDriveFile(fileName, content, fileId = null, parentFolderId = null) {
  try {
    const response = await fetch(`${API_BASE}/drive-write`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName,
        content,
        fileId,
        parentFolderId
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to write file');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Drive write error:', error);
    throw error;
  }
}

// Check if Drive is authorized
async function checkDriveAuth() {
  try {
    // Try to list files - if it fails with auth error, not authorized
    await listDriveFiles();
    return true;
  } catch (error) {
    if (error.message.includes('No Drive tokens') || error.message.includes('authorize')) {
      return false;
    }
    throw error; // Re-throw other errors
  }
}

// Export for use in editor
window.driveAPI = {
  authorize: authorizeDrive,
  list: listDriveFiles,
  read: readDriveFile,
  write: writeDriveFile,
  checkAuth: checkDriveAuth
};
