// Declare API_BASE globally so it can be shared with other scripts
const API_BASE = '/.netlify/functions';
window.API_BASE = API_BASE;

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
    // Try to call a simple Drive API endpoint - if it fails with auth error, not authorized
    const response = await fetch('/.netlify/functions/drive-list', {
      method: 'GET',
      credentials: 'include'
    });
    
    if (response.status === 401) {
      console.log('Drive not authorized: 401 Unauthorized');
      return false;
    }
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || response.statusText;
      
      // Check if error indicates missing authorization
      if (
        errorMessage.includes('No Drive tokens') || 
        errorMessage.includes('authorize') ||
        errorMessage.includes('Not authenticated') ||
        errorMessage.includes('401')
      ) {
        console.log('Drive not authorized:', errorMessage);
        return false;
      }
      
      // Other errors might mean we're authorized but something else went wrong
      // In that case, return true since we got past auth check
      console.log('Drive API error (but past auth):', errorMessage);
      return true;
    }
    
    // If we get here, we successfully called the API
    console.log('Drive is authorized');
    return true;
  } catch (error) {
    console.log('Drive auth check error:', error.message);
    // Check error message for auth-related keywords
    if (
      error.message.includes('No Drive tokens') || 
      error.message.includes('authorize') ||
      error.message.includes('Not authenticated') ||
      error.message.includes('401')
    ) {
      return false;
    }
    // For network errors, assume not authorized to be safe
    return false;
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
