// API_BASE is declared in drive.js which loads first (as var, so can be redeclared)
// If drive.js hasn't loaded yet, set a fallback
if (typeof window.API_BASE === 'undefined') {
  window.API_BASE = '/.netlify/functions';
}
// Redeclare var API_BASE (allowed with var) - references the same variable if already declared
var API_BASE = window.API_BASE || '/.netlify/functions';

// Force logout handler - check URL parameter first
const urlParamsCheck = new URLSearchParams(window.location.search);
if (urlParamsCheck.get('force_logout') === 'true') {
  // Aggressively clear everything
  localStorage.clear();
  sessionStorage.clear();
  
  // Clear all cookies
  document.cookie.split(';').forEach(c => {
    const cookieName = c.split('=')[0].trim();
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname};`;
  });
  
  // Redirect to login with logout flag
  window.location.href = '/?logout=true&force=true';
}

// Add create folder function to driveAPI if not exists
if (window.driveAPI && !window.driveAPI.createFolder) {
  window.driveAPI.createFolder = async function(folderName, parentFolderId) {
    try {
      const response = await axios.post(`${API_BASE}/drive-create-folder`, {
        folderName: folderName,
        parentFolderId: parentFolderId
      }, {
        withCredentials: true
      });
      
      return response.data;
    } catch (error) {
      console.error('Error creating folder:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to create folder';
      throw new Error(errorMessage);
    }
  };
}

// State
let yarnyStoriesFolderId = null;
let isDriveAuthorized = false;

// Logout function - MUST be defined early, before initialize()
window.logout = async function(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  console.log('LOGOUT FUNCTION CALLED - forcing logout');
  
  // Aggressively clear all storage
  localStorage.clear();
  sessionStorage.clear();
  
  // Disable Google auto-select if available
  if (window.google && window.google.accounts && window.google.accounts.id) {
    try {
      window.google.accounts.id.disableAutoSelect();
      window.google.accounts.id.cancel();
    } catch (error) {
      console.error('Error disabling Google auto-select:', error);
    }
  }
  
  // Clear all cookies - try multiple variations
  const cookiesToClear = ['session', 'auth', 'drive_auth_state'];
  cookiesToClear.forEach(cookieName => {
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname};`;
  });
  
  // Also clear all cookies found in document.cookie
  document.cookie.split(';').forEach(c => {
    const cookieName = c.split('=')[0].trim();
    if (cookieName) {
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
    }
  });
  
  // Call server-side logout (don't wait for it)
  if (typeof axios !== 'undefined') {
    axios.post(`${API_BASE}/logout`, {}, {
      withCredentials: true
    }).catch(err => console.error('Logout request failed:', err));
  } else {
    fetch(`${API_BASE}/logout`, {
      method: 'POST',
      credentials: 'include'
    }).catch(err => console.error('Logout request failed:', err));
  }
  
  // Force immediate redirect with force parameter
  console.log('Redirecting to login...');
  window.location.href = '/?logout=true&force=true';
};

// Check if user is authenticated
function checkAuth() {
  // If force logout parameter is present, redirect immediately
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('force_logout') === 'true') {
    window.location.href = '/?logout=true&force=true';
    return false;
  }
  
  const cookies = document.cookie.split(';');
  const authCookie = cookies.find(c => c.trim().startsWith('auth='));
  
  if (!authCookie) {
    window.location.href = '/';
    return false;
  }
  
  return true;
}

// Check Drive authorization status
async function checkDriveAuth() {
  // Wait for driveAPI to be available
  if (!window.driveAPI) {
    console.log('driveAPI not loaded yet, waiting...');
    // Wait up to 2 seconds for driveAPI to load
    for (let i = 0; i < 20; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (window.driveAPI) break;
    }
    if (!window.driveAPI) {
      console.error('driveAPI failed to load');
      return false;
    }
  }
  
  try {
    const isAuthorized = await window.driveAPI.checkAuth();
    console.log('Drive auth check result:', isAuthorized);
    isDriveAuthorized = isAuthorized;
    return isAuthorized;
  } catch (error) {
    console.error('Error checking Drive auth:', error);
    // If error contains tokens or authorization, assume not authorized
    if (error.message && (
      error.message.includes('No Drive tokens') || 
      error.message.includes('authorize') ||
      error.message.includes('401') ||
      error.message.includes('Not authenticated')
    )) {
      return false;
    }
    // For other errors, still return false to show prompt
    return false;
  }
}

// Get or create yarny-stories folder
async function getOrCreateYarnyStoriesFolder() {
  try {
    const response = await axios.get(`${API_BASE}/drive-get-or-create-yarny-stories`, {
      withCredentials: true
    });
    
    yarnyStoriesFolderId = response.data.id;
    return response.data.id;
  } catch (error) {
    console.error('Error getting yarny-stories folder:', error);
    const errorMessage = error.response?.data?.error || error.message || 'Failed to get yarny-stories folder';
    throw new Error(errorMessage);
  }
}

// Create a new folder in Drive
async function createDriveFolder(folderName, parentFolderId) {
  try {
    const response = await axios.post(`${API_BASE}/drive-create-folder`, {
      folderName: folderName,
      parentFolderId: parentFolderId
    }, {
      withCredentials: true
    });
    
    return response.data;
  } catch (error) {
    console.error('Error creating folder:', error);
    const errorMessage = error.response?.data?.error || error.message || 'Failed to create folder';
    throw new Error(errorMessage);
  }
}

// List folders (stories) in yarny-stories directory
async function listStories() {
  try {
    if (!yarnyStoriesFolderId) {
      await getOrCreateYarnyStoriesFolder();
    }
    
    const stories = await window.driveAPI.list(yarnyStoriesFolderId);
    
    // Filter to only show folders (stories are directories)
    const storyFolders = stories.files.filter(file => 
      file.mimeType === 'application/vnd.google-apps.folder'
    );
    
    return storyFolders;
  } catch (error) {
    console.error('Error listing stories:', error);
    throw error;
  }
}

// Render stories list
function renderStories(stories) {
  const listEl = document.getElementById('storiesList');
  const emptyState = document.getElementById('emptyState');
  const loadingState = document.getElementById('loadingState');
  
  loadingState.classList.add('hidden');
  
  if (stories.length === 0) {
    listEl.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }
  
  emptyState.classList.add('hidden');
  listEl.innerHTML = '';
  
  stories.forEach(story => {
    const storyCard = document.createElement('div');
    storyCard.className = 'story-card';
    storyCard.innerHTML = `
      <h3>${escapeHtml(story.name)}</h3>
      <p>Last modified: ${formatDate(story.modifiedTime)}</p>
    `;
    
    storyCard.addEventListener('click', () => {
      openStory(story.id, story.name);
    });
    
    listEl.appendChild(storyCard);
  });
}

// Create initial files and folders for a new story
async function initializeStoryStructure(storyFolderId) {
  try {
    // Create initial folder structure
    const folders = [
      { name: 'snippets', description: 'Story snippets and content' },
      { name: 'groups', description: 'Story groups' },
      { name: 'notes', description: 'Story notes' }
    ];

    const createdFolders = {};
    for (const folder of folders) {
      const folderResult = await createDriveFolder(folder.name, storyFolderId);
      createdFolders[folder.name] = folderResult.id;
    }

    // Create initial project.json file
    const projectData = {
      name: 'New Project',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      activeSnippetId: null,
      snippetIds: [],
      groupIds: []
    };

    await window.driveAPI.write(
      'project.json',
      JSON.stringify(projectData, null, 2),
      null,
      storyFolderId
    );

    // Create initial data.json file with empty state
    const initialState = {
      snippets: {},
      groups: {},
      notes: {
        people: {},
        places: {},
        things: {}
      },
      tags: []
    };

    await window.driveAPI.write(
      'data.json',
      JSON.stringify(initialState, null, 2),
      null,
      storyFolderId
    );

    return { folders: createdFolders, projectData, initialState };
  } catch (error) {
    console.error('Error initializing story structure:', error);
    throw error;
  }
}

// Create new story
async function createStory(storyName) {
  try {
    // Ensure yarny-stories folder exists
    if (!yarnyStoriesFolderId) {
      await getOrCreateYarnyStoriesFolder();
    }
    
    // Create story folder in yarny-stories
    const storyFolder = await createDriveFolder(storyName, yarnyStoriesFolderId);
    
    // Initialize story structure with folders and files
    await initializeStoryStructure(storyFolder.id);
    
    return storyFolder;
  } catch (error) {
    console.error('Error creating story:', error);
    throw error;
  }
}

// Open story in editor
function openStory(storyFolderId, storyName) {
  // Store story info in localStorage for editor to use
  localStorage.setItem('yarny_current_story', JSON.stringify({
    id: storyFolderId,
    name: storyName
  }));
  
  // Navigate to editor
  window.location.href = '/editor.html';
}

// Show error message
function showError(message) {
  const errorEl = document.getElementById('modalError');
  errorEl.textContent = message;
  errorEl.classList.remove('hidden');
}

// Hide error message
function hideError() {
  const errorEl = document.getElementById('modalError');
  errorEl.classList.add('hidden');
}

// Open new story modal
function openNewStoryModal() {
  document.getElementById('newStoryModal').classList.remove('hidden');
  document.getElementById('storyName').focus();
  hideError();
}

// Close new story modal
function closeNewStoryModal() {
  document.getElementById('newStoryModal').classList.add('hidden');
  document.getElementById('newStoryForm').reset();
  hideError();
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Format date
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

// Initialize page
async function initialize() {
  // Check authentication
  if (!checkAuth()) {
    return;
  }
  
  // Setup logout button (always available in header)
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn && !logoutBtn.dataset.listenerAttached) {
    logoutBtn.addEventListener('click', window.logout);
    logoutBtn.dataset.listenerAttached = 'true';
  }
  
  // Check for manual force auth parameter
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('force_drive_auth') === 'true') {
    console.log('Force Drive auth requested');
    // Show Drive auth prompt regardless of check result
    const driveAuthPrompt = document.getElementById('driveAuthPrompt');
    const storiesContent = document.getElementById('storiesContent');
    
    if (driveAuthPrompt) {
      driveAuthPrompt.classList.remove('hidden');
    }
    if (storiesContent) {
      storiesContent.classList.add('hidden');
    }
    
    // Setup Connect Drive button
    const connectBtn = document.getElementById('connectDriveBtn');
    if (connectBtn) {
      const newConnectBtn = connectBtn.cloneNode(true);
      connectBtn.parentNode.replaceChild(newConnectBtn, connectBtn);
      
      newConnectBtn.addEventListener('click', async () => {
        console.log('Connect Drive button clicked (forced)');
        try {
          await window.driveAPI.authorize();
        } catch (error) {
          console.error('Failed to authorize Drive:', error);
          alert('Failed to connect to Drive: ' + error.message);
        }
      });
    }
    
    // Clean up URL
    window.history.replaceState({}, document.title, window.location.pathname);
    return;
  }
  
  // Check Drive authorization
  const driveAuthorized = await checkDriveAuth();
  
  console.log('Drive authorization status:', driveAuthorized);
  console.log('driveAuthPrompt element:', document.getElementById('driveAuthPrompt'));
  console.log('storiesContent element:', document.getElementById('storiesContent'));
  
  if (!driveAuthorized) {
    console.log('Drive NOT authorized - showing prompt');
    // Show Drive auth prompt
    const driveAuthPrompt = document.getElementById('driveAuthPrompt');
    const storiesContent = document.getElementById('storiesContent');
    
    if (driveAuthPrompt) {
      driveAuthPrompt.classList.remove('hidden');
      console.log('Drive auth prompt is now visible');
    } else {
      console.error('driveAuthPrompt element not found!');
    }
    
    if (storiesContent) {
      storiesContent.classList.add('hidden');
    }
    
    // Connect Drive button
    const connectBtn = document.getElementById('connectDriveBtn');
    if (connectBtn) {
      // Remove any existing listeners to avoid duplicates
      const newConnectBtn = connectBtn.cloneNode(true);
      connectBtn.parentNode.replaceChild(newConnectBtn, connectBtn);
      
      newConnectBtn.addEventListener('click', async () => {
        console.log('Connect Drive button clicked');
        try {
          await window.driveAPI.authorize();
        } catch (error) {
          console.error('Failed to authorize Drive:', error);
          alert('Failed to connect to Drive: ' + error.message);
        }
      });
      console.log('Connect Drive button listener attached');
    } else {
      console.error('connectDriveBtn element not found!');
    }
    
    return;
  }
  
  console.log('Drive IS authorized - showing stories content');
  
  // Drive is authorized, show stories content
  document.getElementById('driveAuthPrompt').classList.add('hidden');
  document.getElementById('storiesContent').classList.remove('hidden');
  
  // Load stories
  try {
    const stories = await listStories();
    renderStories(stories);
  } catch (error) {
    console.error('Error loading stories:', error);
    alert('Failed to load stories: ' + error.message);
  }
  
  // New story button
  document.getElementById('newStoryBtn').addEventListener('click', openNewStoryModal);
  
  // New story form
  document.getElementById('newStoryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();
    
    const storyName = document.getElementById('storyName').value.trim();
    if (!storyName) {
      showError('Please enter a story name');
      return;
    }
    
    const createBtn = document.getElementById('createStoryBtn');
    createBtn.disabled = true;
    createBtn.textContent = 'Creating...';
    
    try {
      const storyFolder = await createStory(storyName);
      closeNewStoryModal();
      
      // Open the new story in editor
      openStory(storyFolder.id, storyFolder.name);
    } catch (error) {
      showError('Failed to create story: ' + error.message);
      createBtn.disabled = false;
      createBtn.textContent = 'Create Story';
    }
  });
  
  // Close modal on overlay click
  document.querySelector('.modal-overlay').addEventListener('click', closeNewStoryModal);
}

// Handle Drive auth callback
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('drive_auth_success') === 'true') {
  // Clean up URL and reload
  window.history.replaceState({}, document.title, window.location.pathname);
  initialize();
} else if (urlParams.get('drive_auth_error')) {
  const error = urlParams.get('drive_auth_error');
  alert('Drive authorization failed: ' + decodeURIComponent(error));
  window.history.replaceState({}, document.title, window.location.pathname);
  initialize();
} else {
  // Initialize normally
  initialize();
}

// Export for global access
window.closeNewStoryModal = closeNewStoryModal;
