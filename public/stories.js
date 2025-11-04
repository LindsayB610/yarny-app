const API_BASE = '/.netlify/functions';

// Add create folder function to driveAPI if not exists
if (window.driveAPI && !window.driveAPI.createFolder) {
  window.driveAPI.createFolder = async function(folderName, parentFolderId) {
    try {
      const response = await fetch(`${API_BASE}/drive-create-folder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderName: folderName,
          parentFolderId: parentFolderId
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create folder');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
  };
}

// State
let yarnyStoriesFolderId = null;
let isDriveAuthorized = false;

// Check if user is authenticated
function checkAuth() {
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
  try {
    const isAuthorized = await window.driveAPI.checkAuth();
    isDriveAuthorized = isAuthorized;
    return isAuthorized;
  } catch (error) {
    console.error('Error checking Drive auth:', error);
    return false;
  }
}

// Get or create yarny-stories folder
async function getOrCreateYarnyStoriesFolder() {
  try {
    const response = await fetch(`${API_BASE}/drive-get-or-create-yarny-stories`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get yarny-stories folder');
    }
    const data = await response.json();
    yarnyStoriesFolderId = data.id;
    return data.id;
  } catch (error) {
    console.error('Error getting yarny-stories folder:', error);
    throw error;
  }
}

// Create a new folder in Drive
async function createDriveFolder(folderName, parentFolderId) {
  try {
    const response = await fetch(`${API_BASE}/drive-create-folder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        folderName: folderName,
        parentFolderId: parentFolderId
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create folder');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating folder:', error);
    throw error;
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
  
  // Check Drive authorization
  const driveAuthorized = await checkDriveAuth();
  
  if (!driveAuthorized) {
    // Show Drive auth prompt
    document.getElementById('driveAuthPrompt').classList.remove('hidden');
    document.getElementById('storiesContent').classList.add('hidden');
    
    // Connect Drive button
    document.getElementById('connectDriveBtn').addEventListener('click', async () => {
      try {
        await window.driveAPI.authorize();
      } catch (error) {
        alert('Failed to connect to Drive: ' + error.message);
      }
    });
    
    return;
  }
  
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

// Logout function
window.logout = async function() {
  // Disable Google auto-select if available
  if (window.google && window.google.accounts && window.google.accounts.id) {
    window.google.accounts.id.disableAutoSelect();
  }
  
  // Clear all auth data from localStorage
  localStorage.removeItem('yarny_auth');
  localStorage.removeItem('yarny_user');
  localStorage.removeItem('yarny_current_story');
  
  // Call server-side logout to clear HttpOnly cookies
  try {
    await fetch(`${API_BASE}/logout`, {
      method: 'POST',
      credentials: 'include' // Important: include cookies in the request
    });
  } catch (error) {
    console.error('Logout request failed:', error);
    // Continue with logout anyway
  }
  
  // Clear client-side cookies as backup
  const cookieOptions = '; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
  document.cookie = 'session=' + cookieOptions;
  document.cookie = 'auth=' + cookieOptions;
  document.cookie = 'drive_auth_state=' + cookieOptions;
  
  // Force redirect to login page with a flag to prevent auto-redirect
  window.location.href = '/?logout=true';
};

// Export for global access
window.closeNewStoryModal = closeNewStoryModal;
