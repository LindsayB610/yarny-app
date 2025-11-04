// Declare API_BASE globally so it can be shared with other scripts
// Use var to allow redeclaration in other scripts if needed
var API_BASE = '/.netlify/functions';
window.API_BASE = API_BASE;

// Configure axios defaults if available (loaded via CDN)
if (typeof axios !== 'undefined') {
  axios.defaults.withCredentials = true; // Include cookies in requests
}

// Initiate Drive authorization
async function authorizeDrive() {
  try {
    // For OAuth redirects, we can't use fetch() due to CORS
    // Instead, directly navigate to the auth endpoint which will redirect to Google
    // But first, let's verify the endpoint exists by making a HEAD request
    // Actually, just navigate directly - the server will handle the redirect
    window.location.href = `${API_BASE}/drive-auth`;
  } catch (error) {
    console.error('Drive authorization error:', error);
    alert('Failed to authorize Drive: ' + error.message);
    throw error;
  }
}

// List files in Drive
async function listDriveFiles(folderId = null) {
  try {
    const params = folderId ? { folderId } : {};
    
    const response = await axios.get(`${API_BASE}/drive-list`, {
      params: params,
      withCredentials: true
    });
    
    return response.data;
  } catch (error) {
    console.error('Drive list error:', error);
    const errorMessage = error.response?.data?.error || error.message || 'Failed to list files';
    throw new Error(errorMessage);
  }
}

// Read file from Drive
async function readDriveFile(fileId) {
  try {
    const response = await axios.post(`${API_BASE}/drive-read`, 
      { fileId },
      { withCredentials: true }
    );
    
    return response.data;
  } catch (error) {
    console.error('Drive read error:', error);
    const errorMessage = error.response?.data?.error || error.message || 'Failed to read file';
    throw new Error(errorMessage);
  }
}

// Write file to Drive
async function writeDriveFile(fileName, content, fileId = null, parentFolderId = null, mimeType = 'text/plain') {
  try {
    const response = await axios.post(`${API_BASE}/drive-write`,
      {
        fileName,
        content,
        fileId,
        parentFolderId,
        mimeType
      },
      { withCredentials: true }
    );
    
    return response.data;
  } catch (error) {
    console.error('Drive write error:', error);
    const errorMessage = error.response?.data?.error || error.message || 'Failed to write file';
    throw new Error(errorMessage);
  }
}

// Check if Drive is authorized
async function checkDriveAuth() {
  try {
    // Try to call a simple Drive API endpoint - if it fails with auth error, not authorized
    const response = await axios.get('/.netlify/functions/drive-list', {
      withCredentials: true
    });
    
    // If we get here, we successfully called the API
    console.log('Drive is authorized');
    return true;
  } catch (error) {
    const status = error.response?.status;
    const errorMessage = error.response?.data?.error || error.message || '';
    
    if (status === 401) {
      console.log('Drive not authorized: 401 Unauthorized');
      return false;
    }
    
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
    if (status && status !== 401) {
      console.log('Drive API error (but past auth):', errorMessage);
      return true;
    }
    
    // For network errors, assume not authorized to be safe
    console.log('Drive auth check error:', error.message);
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
