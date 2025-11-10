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
    // Log error with details for debugging (this is the lowest level, so we keep it)
    // But make it less verbose - higher levels will log with more context
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.error('Drive write error (auth):', {
        status: error.response?.status,
        error: error.response?.data?.error,
        message: error.response?.data?.message || error.message
      });
    } else {
      console.error('Drive write error:', {
        status: error.response?.status,
        error: error.response?.data?.error,
        message: error.response?.data?.message || error.message
      });
    }
    
    // Check if this is a missing scope error
    if (error.response?.data?.error === 'MISSING_DOCS_SCOPE' || error.response?.data?.requiresReauth) {
      const scopeError = new Error(error.response.data.message || 'Missing Google Docs API scope');
      scopeError.code = 'MISSING_DOCS_SCOPE';
      scopeError.requiresReauth = true;
      throw scopeError;
    }
    
    // Check if file was deleted (404 error)
    if (error.response?.status === 404 || error.response?.data?.error === 'FILE_NOT_FOUND') {
      const fileNotFoundError = new Error(error.response?.data?.message || 'File was deleted or does not exist');
      fileNotFoundError.code = 'FILE_NOT_FOUND';
      fileNotFoundError.fileId = error.response?.data?.fileId;
      throw fileNotFoundError;
    }
    
    const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to write file';
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

// Delete file from Drive (moves to trash)
async function deleteDriveFile(fileId) {
  try {
    const response = await axios.post(`${API_BASE}/drive-delete-file`,
      { fileId },
      { withCredentials: true }
    );
    
    return response.data;
  } catch (error) {
    console.error('Drive delete error:', error);
    const errorMessage = error.response?.data?.error || error.message || 'Failed to delete file';
    throw new Error(errorMessage);
  }
}

// Rename file in Drive
async function renameDriveFile(fileId, newName) {
  try {
    const response = await axios.post(`${API_BASE}/drive-rename-file`,
      { fileId, fileName: newName },
      { withCredentials: true }
    );
    
    return response.data;
  } catch (error) {
    console.error('Drive rename error:', error);
    const errorMessage = error.response?.data?.error || error.message || 'Failed to rename file';
    throw new Error(errorMessage);
  }
}

// Check for comments and tracked changes in a Google Doc
async function checkCommentsAndChanges(fileId) {
  try {
    const response = await axios.post(`${API_BASE}/drive-check-comments`,
      { fileId },
      { withCredentials: true }
    );
    
    return response.data;
  } catch (error) {
    console.error('Drive check comments error:', error);
    // If check fails, assume no comments/changes to avoid blocking saves
    return {
      hasComments: false,
      hasTrackedChanges: false,
      commentCount: 0
    };
  }
}

// ============================================
// Shared Progress Meter Functions
// Used by both editor and stories page to ensure consistency
// ============================================

/**
 * Calculate total word count from chapter snippets
 * Uses the same logic as the editor's progress meter
 * @param {Object} snippets - Object mapping snippet IDs to snippet objects
 * @param {Object} groups - Object mapping group IDs to group objects
 * @returns {number} Total word count
 */
window.calculateStoryWordCount = function(snippets, groups) {
  if (!snippets || !groups) return 0;
  
  // Filter to only include snippets that have a groupId AND the group exists
  // This matches the logic in updateGoalMeter
  const chapterSnippets = Object.values(snippets).filter(snippet => {
    const group = snippet.groupId ? groups[snippet.groupId] : null;
    return !!group; // Only count if group exists
  });
  
  // Sum word counts
  const totalWords = chapterSnippets.reduce((sum, snippet) => {
    return sum + (snippet.words || 0);
  }, 0);
  
  return totalWords;
};

/**
 * Update progress meter DOM elements
 * @param {HTMLElement} textElement - Element to display text (e.g., "1,234 / 3,000")
 * @param {HTMLElement} barElement - Element to display progress bar (sets width style)
 * @param {number} totalWords - Current word count
 * @param {number} wordGoal - Target word count
 */
window.updateProgressMeter = function(textElement, barElement, totalWords, wordGoal) {
  if (!textElement || !barElement) return;
  
  const percentage = wordGoal > 0 ? Math.min(100, Math.round((totalWords / wordGoal) * 100)) : 0;
  
  // Update text
  textElement.textContent = `${totalWords.toLocaleString()} / ${wordGoal.toLocaleString()}`;
  
  // Update bar width
  barElement.style.width = `${percentage}%`;
};

// Export for use in editor
window.driveAPI = {
  authorize: authorizeDrive,
  list: listDriveFiles,
  read: readDriveFile,
  write: writeDriveFile,
  delete: deleteDriveFile,
  rename: renameDriveFile,
  checkAuth: checkDriveAuth,
  checkComments: checkCommentsAndChanges
};
