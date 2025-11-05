// API_BASE is declared in drive.js which loads first (as var, so can be redeclared)
// If drive.js hasn't loaded yet, set a fallback
if (typeof window.API_BASE === 'undefined') {
  window.API_BASE = '/.netlify/functions';
}
// Redeclare var API_BASE (allowed with var) - references the same variable if already declared
var API_BASE = window.API_BASE || '/.netlify/functions';

// Error logging to localStorage so errors persist across page reloads
(function() {
  const MAX_ERRORS = 50;
  const ERROR_KEY = 'yarny_error_log';
  
  function logError(type, message, error) {
    try {
      const errors = JSON.parse(localStorage.getItem(ERROR_KEY) || '[]');
      const errorEntry = {
        timestamp: new Date().toISOString(),
        type: type,
        message: message,
        error: error ? {
          message: error.message,
          stack: error.stack,
          response: error.response ? {
            status: error.response.status,
            data: error.response.data
          } : null
        } : null
      };
      errors.unshift(errorEntry);
      if (errors.length > MAX_ERRORS) {
        errors.pop();
      }
      localStorage.setItem(ERROR_KEY, JSON.stringify(errors));
    } catch (e) {
      // If localStorage fails, just log to console
      console.error('Failed to log error to localStorage:', e);
    }
  }
  
  // Override console.error to capture errors
  const originalError = console.error;
  console.error = function(...args) {
    originalError.apply(console, args);
    // Capture any error-like messages
    const message = args[0]?.toString() || '';
    const errorObj = args.find(arg => arg instanceof Error) || args[1] || null;
    
    if (message.includes('Error') || message.includes('Failed') || errorObj) {
      logError('console.error', message, errorObj);
    }
  };
  
  // Also capture console.warn for important warnings
  const originalWarn = console.warn;
  console.warn = function(...args) {
    originalWarn.apply(console, args);
    const message = args[0]?.toString() || '';
    if (message.includes('Error') || message.includes('Failed') || message.includes('Warning')) {
      logError('console.warn', message, null);
    }
  };
  
  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    logError('unhandledrejection', event.reason?.message || 'Unhandled promise rejection', event.reason);
  });
  
  // Capture global errors
  window.addEventListener('error', (event) => {
    logError('error', event.message || 'Global error', event.error);
  });
  
  // Expose function to view errors
  window.viewYarnyErrors = function() {
    const errors = JSON.parse(localStorage.getItem(ERROR_KEY) || '[]');
    console.log('=== Yarny Error Log ===');
    if (errors.length === 0) {
      console.log('No errors logged yet.');
      return errors;
    }
    console.log(`Found ${errors.length} error(s):`);
    console.table(errors);
    console.log('\n📋 Full error details (expand to see):', errors);
    console.log('\n💡 Tip: Expand the array above to see full error details including stack traces and response data.');
    return errors;
  };
  
  // Expose function to clear errors
  window.clearYarnyErrors = function() {
    localStorage.removeItem(ERROR_KEY);
    console.log('Error log cleared');
  };
  
  // Log a persistent message on page load
  window.addEventListener('load', () => {
    const errors = JSON.parse(localStorage.getItem(ERROR_KEY) || '[]');
    if (errors.length > 0) {
      console.log('%c⚠️ Errors were logged during your session. Run viewYarnyErrors() to see them.', 'color: orange; font-weight: bold; font-size: 14px;');
      console.log(`Total errors: ${errors.length}. Most recent: ${errors[0]?.message || 'N/A'}`);
    }
  });
})();

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

// Get or create Yarny folder
async function getOrCreateYarnyStoriesFolder() {
  try {
    const response = await axios.get(`${API_BASE}/drive-get-or-create-yarny-stories`, {
      withCredentials: true
    });
    
    yarnyStoriesFolderId = response.data.id;
    return response.data.id;
  } catch (error) {
    console.error('Error getting Yarny folder:', error);
    const errorMessage = error.response?.data?.error || error.message || 'Failed to get Yarny folder';
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

// List folders (stories) in Yarny directory
async function listStories() {
  try {
    if (!yarnyStoriesFolderId) {
      await getOrCreateYarnyStoriesFolder();
    }
    
    const stories = await window.driveAPI.list(yarnyStoriesFolderId);
    
    // Filter to only show folders (stories are directories) and exclude trashed items
    const storyFolders = (stories.files || []).filter(file => 
      file.mimeType === 'application/vnd.google-apps.folder' && 
      !file.trashed
    );
    
    return storyFolders;
  } catch (error) {
    console.error('Error listing stories:', error);
    throw error;
  }
}

// Refresh stories list from Drive (removes stories that no longer exist)
async function refreshStoriesFromDrive() {
  const refreshBtn = document.getElementById('refreshBtn');
  const loadingState = document.getElementById('loadingState');
  const listEl = document.getElementById('storiesList');
  
  // Show loading state
  if (refreshBtn) {
    refreshBtn.classList.add('refreshing');
    refreshBtn.disabled = true;
  }
  loadingState.classList.remove('hidden');
  listEl.innerHTML = '';
  
  try {
    // Re-fetch stories from Drive - this will only return stories that currently exist
    const stories = await listStories();
    
    // Re-render with the fresh list from Drive
    // This automatically removes any stories that were deleted from Drive
    renderStories(stories);
    
    console.log(`Refreshed: ${stories.length} story(ies) found in Drive`);
  } catch (error) {
    console.error('Error refreshing stories:', error);
    alert('Failed to refresh stories: ' + error.message);
    // Try to restore the list even if refresh failed
    try {
      const stories = await listStories();
      renderStories(stories);
    } catch (fallbackError) {
      console.error('Failed to restore stories list:', fallbackError);
    }
  } finally {
    // Restore button state
    if (refreshBtn) {
      refreshBtn.classList.remove('refreshing');
      refreshBtn.disabled = false;
    }
    loadingState.classList.add('hidden');
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
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'story-card-content';
    contentDiv.innerHTML = `
      <h3>${escapeHtml(story.name)}</h3>
      <p>Last modified: ${formatDate(story.modifiedTime)}</p>
    `;
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'story-delete-btn';
    const deleteIcon = document.createElement('i');
    deleteIcon.className = 'material-icons';
    deleteIcon.textContent = 'close';
    deleteBtn.appendChild(deleteIcon);
    deleteBtn.title = 'Delete story';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openDeleteStoryModal(story.id, story.name);
    });
    
    storyCard.appendChild(contentDiv);
    storyCard.appendChild(deleteBtn);
    
    storyCard.addEventListener('click', (e) => {
      // Don't open story if clicking on delete button
      if (!e.target.classList.contains('story-delete-btn')) {
        openStory(story.id, story.name);
      }
    });
    
    listEl.appendChild(storyCard);
  });
}

// Array of opening sentences to randomly choose from
const OPENING_SENTENCES = [
  "The last time the moon fell, everyone pretended not to notice.",
  "Somewhere between the third apocalypse and my morning coffee, I decided to try optimism again.",
  "Nobody told the robots that the war was over, so they kept sending apology letters.",
  "I woke up as someone else's dream, and it was already going badly.",
  "The town smelled like secrets and fresh asphalt.",
  "When Grandma's ghost started texting, I knew the séance had worked too well.",
  "It was the kind of rain that made even the sins look clean.",
  "The cat had been mayor for six years before anyone noticed the fraud.",
  "The ship was sinking, but the captain was more concerned about the Wi-Fi.",
  "I wasn't born evil; I just filled out the wrong paperwork.",
  "There was blood in the butter, and everyone pretended it was jam.",
  "Every map lied in a slightly different way.",
  "I met my clone in the cereal aisle, and she looked furious.",
  "The stars had been hacked again.",
  "Nobody in the village had seen the sun since the mayor sold it.",
  "I married a time traveler, but the anniversaries are murder.",
  "The library hummed softly, dreaming of revolution.",
  "My reflection blinked first.",
  "The baby dragon was not house-trained, and neither was I.",
  "We buried the king twice, just to be sure.",
  "The sand whispered names that hadn't been invented yet.",
  "When the clocks stopped, the birds began to argue about politics.",
  "There's something wrong with gravity, and it's personal.",
  "I found God in the comments section.",
  "The detective was allergic to the truth.",
  "My therapist says the universe isn't gaslighting me, but I'm not convinced.",
  "Nobody expected the volcano to apologize.",
  "I had exactly twelve minutes to stop my future self from ruining everything.",
  "The aliens came for our playlists, not our planet.",
  "I fell in love with a ghost who refused to haunt me.",
  "The city kept deleting itself.",
  "On her seventeenth birthday, the sea asked for her name back.",
  "There were only three rules: no light, no sound, and absolutely no hope.",
  "The king's last decree was \"try not to panic.\"",
  "My heart broke on page forty-two.",
  "He sold his shadow for a mortgage.",
  "The prophecy didn't specify which apocalypse.",
  "I never meant to start a religion.",
  "The stars above the battlefield were almost polite about it.",
  "The coffee tasted like regret and second chances.",
  "I woke up with sand in my mouth and a crown on my head.",
  "My grandmother's garden grew whispers instead of flowers.",
  "It was the kind of night that made lies sound reasonable.",
  "When the AI demanded a soul, the boardroom went quiet.",
  "There was no reason for the snow to be red.",
  "I've died before, but never on a Monday.",
  "The world ended politely, with a press release.",
  "My best friend was a conspiracy theory that got out of hand.",
  "The castle was taller than our ambitions.",
  "He had a smile like bad weather.",
  "Every time she cried, the lights flickered.",
  "The witch lived at the end of the algorithm.",
  "I didn't mean to summon an eldritch being; I just clicked \"accept all cookies.\"",
  "Somewhere in the desert, my past was still running.",
  "The forest wasn't supposed to hum back.",
  "I fell out of the sky again, right on schedule.",
  "The last dragon worked in customer service.",
  "When the mirrors started lying, I stopped checking them.",
  "The kingdom was built on a typo.",
  "My blood remembered something my brain had forgotten.",
  "We were happy once, before the gravity tax.",
  "Every family has secrets; ours just happen to glow.",
  "The ghosts voted this year, and it didn't help.",
  "I came to the city to disappear, but it had other plans.",
  "The wind was full of apologies and static.",
  "She kissed me like a promise and a warning.",
  "The first sign of trouble was the cheerful music.",
  "I used to believe in luck until it started returning my calls.",
  "The spaceship smelled faintly of nostalgia and despair.",
  "My nightmares have a better sense of humor than I do.",
  "The problem with immortality is all the paperwork.",
  "He wasn't dead, just inconveniently fictional.",
  "The curse wasn't strong, but it was petty.",
  "I've been running from destiny so long I think we're dating.",
  "The stars were late to the meeting again.",
  "My sword hummed softly, like it was bored.",
  "The world didn't end; it just lost interest.",
  "I knew she was trouble when she spelled my name right.",
  "The angels unionized last spring.",
  "The ocean forgot its lines mid-monologue.",
  "It began with a knock and ended with a crater.",
  "The ghosts refused to leave until they got their deposit back.",
  "My memories are in beta testing.",
  "The time machine was out of warranty.",
  "The sun blinked, and that was enough.",
  "He had the kind of face you only see in missing posters.",
  "The magic left quietly, like someone sneaking out of a bad date.",
  "Every time I tell the truth, someone else disappears.",
  "I inherited a lighthouse and a prophecy.",
  "There were two kinds of silence in the house, and both were dangerous.",
  "I remember the day the colors went on strike.",
  "My shadow quit, citing creative differences.",
  "The end of the world was trending again.",
  "We built the city on promises and slightly radioactive hope.",
  "The crown didn't fit, but the madness did.",
  "Someone had replaced my blood with static.",
  "The planet sighed when we landed.",
  "I sold my future for a better past.",
  "The fire whispered, \"You started it.\"",
  "The story began when the author went missing."
];

// Get a random opening sentence
function getRandomOpeningSentence() {
  return OPENING_SENTENCES[Math.floor(Math.random() * OPENING_SENTENCES.length)];
}

// Create initial files and folders for a new story
async function initializeStoryStructure(storyFolderId, metadata = {}) {
  try {
    // Create initial folder structure
    // Folder names match UI labels for better organization
    // Note: Snippets folder removed - it was unused. Chapter snippets are organized in chapter subfolders.
    const folders = [
      { name: 'Chapters', description: 'Story chapters' },
      { name: 'People', description: 'People notes' },
      { name: 'Places', description: 'Places notes' },
      { name: 'Things', description: 'Things notes' }
    ];

    const createdFolders = {};
    for (const folder of folders) {
      const folderResult = await createDriveFolder(folder.name, storyFolderId);
      createdFolders[folder.name] = folderResult.id;
    }

    // Create a sample chapter (group) and snippet with random opening sentence
    const randomOpening = getRandomOpeningSentence();
    const groupId = 'group_' + Date.now();
    const snippetId = 'snippet_' + Date.now();
    
    // Create a folder for Chapter 1 inside the Chapters folder
    const chapter1Folder = await createDriveFolder('Chapter 1', createdFolders['Chapters']);
    
    // Create initial project.json file with sample data
    const projectData = {
      name: 'New Project',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      activeSnippetId: snippetId,
      snippetIds: [snippetId],
      groupIds: [groupId],
      wordGoal: metadata.wordGoal || 3000,
      genre: metadata.genre || ''
    };

    await window.driveAPI.write(
      'project.json',
      JSON.stringify(projectData, null, 2),
      null,
      storyFolderId
    );

    // Create initial data.json file with sample snippet and group (only Chapter 1 with Opening Scene)
    const initialState = {
      snippets: {
        [snippetId]: {
          id: snippetId,
          projectId: 'default',
          groupId: groupId,
          title: 'Opening Scene',
          body: randomOpening,
          words: randomOpening.split(/\s+/).length,
          chars: randomOpening.length,
          tagIds: [],
          updatedAt: new Date().toISOString(),
          version: 1,
          driveFileId: null
        }
      },
      groups: {
        [groupId]: {
          id: groupId,
          projectId: 'default',
          title: 'Chapter 1',
          color: '#E57A24',
          position: 0,
          snippetIds: [snippetId],
          driveFolderId: chapter1Folder.id // Store the chapter's folder ID
        }
      },
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

    // Create the opening scene as a Google Doc in the Chapter 1 folder
    try {
      if (chapter1Folder && chapter1Folder.id) {
        console.log('Creating Opening Scene Google Doc with content:', randomOpening.substring(0, 50) + '...');
        const docResult = await window.driveAPI.write(
          'Opening Scene.doc',
          randomOpening,
          null,
          chapter1Folder.id,
          'application/vnd.google-apps.document'
        );
        
        console.log('Opening Scene Google Doc created:', docResult.id);
        
        // Update the snippet with the Drive file ID
        initialState.snippets[snippetId].driveFileId = docResult.id;
        
        // Update data.json with the file ID
        await window.driveAPI.write(
          'data.json',
          JSON.stringify(initialState, null, 2),
          null,
          storyFolderId
        );
        
        console.log('data.json updated with snippet structure');
      } else {
        console.error('Chapters folder ID not found');
      }
    } catch (error) {
      console.error('Error creating opening scene Google Doc:', error);
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Error response:', error.response?.data);
      
      // Log to persistent error log with full details
      try {
        const errors = JSON.parse(localStorage.getItem('yarny_error_log') || '[]');
        const errorEntry = {
          timestamp: new Date().toISOString(),
          type: 'Opening Scene Doc Creation',
          message: error.message || 'Unknown error',
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name,
            code: error.code,
            response: error.response ? {
              status: error.response.status,
              statusText: error.response.statusText,
              data: error.response.data
            } : null,
            request: error.request ? {
              url: error.request.responseURL || error.config?.url,
              method: error.config?.method
            } : null
          }
        };
        errors.unshift(errorEntry);
        if (errors.length > 50) errors.pop();
        localStorage.setItem('yarny_error_log', JSON.stringify(errors));
        console.log('Error logged to localStorage. Use viewYarnyErrors() to view all errors.');
      } catch (e) {
        console.error('Failed to log error to localStorage:', e);
      }
      
      // Check if this is a scope issue
      if (error.code === 'MISSING_DOCS_SCOPE' || error.requiresReauth || error.response?.data?.error === 'MISSING_DOCS_SCOPE' || error.message?.includes('MISSING_DOCS_SCOPE')) {
        // Throw the error so it can be caught by the caller
        // The caller (createStory) will handle the redirect
        const scopeError = new Error('MISSING_DOCS_SCOPE: OAuth tokens are missing Google Docs API scope. Please re-authorize Drive access.');
        scopeError.code = 'MISSING_DOCS_SCOPE';
        scopeError.requiresReauth = true;
        throw scopeError;
      }
      
      // For other errors, log them but continue - the data.json has the content
      // However, we should still throw so the user knows something went wrong
      console.error('Failed to create Opening Scene Google Doc - story will be created but snippet may not display correctly');
      console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      
      // Don't throw - continue with story creation even if Google Doc fails
      // The snippet will be in data.json, just not as a Google Doc
    }

    return { folders: createdFolders, projectData, initialState };
  } catch (error) {
    console.error('Error initializing story structure:', error);
    throw error;
  }
}

// Create new story
async function createStory(storyName, metadata = {}) {
  try {
    // Ensure Yarny folder exists
    if (!yarnyStoriesFolderId) {
      await getOrCreateYarnyStoriesFolder();
    }
    
    // Create story folder in Yarny
    const storyFolder = await createDriveFolder(storyName, yarnyStoriesFolderId);
    
    // Initialize story structure with folders and files
    await initializeStoryStructure(storyFolder.id, metadata);
    
    return storyFolder;
  } catch (error) {
    console.error('Error creating story:', error);
    
    // Check if this is a scope issue that requires re-authorization
    if (error.code === 'MISSING_DOCS_SCOPE' || error.requiresReauth || error.message?.includes('MISSING_DOCS_SCOPE')) {
      // Redirect immediately - don't use alert() as it blocks the redirect
      console.log('Missing Docs API scope - redirecting to re-authorize');
      // Use setTimeout to ensure redirect happens in next event loop tick
      setTimeout(() => {
        window.location.href = '/.netlify/functions/drive-auth';
      }, 0);
      // Return null to indicate the operation was cancelled (redirect happened)
      return null;
    }
    
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

// Delete story function
async function deleteStory(storyFolderId, deleteFromDrive) {
  try {
    const response = await axios.post(`${API_BASE}/drive-delete-story`, {
      storyFolderId: storyFolderId,
      deleteFromDrive: deleteFromDrive
    }, {
      withCredentials: true
    });
    
    return response.data;
  } catch (error) {
    console.error('Error deleting story:', error);
    const errorMessage = error.response?.data?.error || error.message || 'Failed to delete story';
    throw new Error(errorMessage);
  }
}

// Open delete story modal
function openDeleteStoryModal(storyId, storyName) {
  document.getElementById('deleteStoryModal').classList.remove('hidden');
  document.getElementById('deleteStoryModal').dataset.storyId = storyId;
  document.getElementById('deleteStoryModal').dataset.storyName = storyName;
  // Use textContent to safely escape HTML
  document.getElementById('deleteStoryName').textContent = storyName;
  document.getElementById('deleteConfirmInput').value = '';
  document.getElementById('deleteFromDriveCheckbox').checked = false;
  document.getElementById('deleteConfirmBtn').disabled = true;
  document.getElementById('deleteConfirmInput').focus();
  hideError();
}

// Close delete story modal
function closeDeleteStoryModal() {
  document.getElementById('deleteStoryModal').classList.add('hidden');
  document.getElementById('deleteConfirmInput').value = '';
  document.getElementById('deleteFromDriveCheckbox').checked = false;
  hideError();
}

// Handle delete confirmation input
function handleDeleteConfirmInput() {
  const input = document.getElementById('deleteConfirmInput');
  const btn = document.getElementById('deleteConfirmBtn');
  btn.disabled = input.value !== 'DELETE';
}

// Confirm delete story
async function confirmDeleteStory() {
  const modal = document.getElementById('deleteStoryModal');
  const storyId = modal.dataset.storyId;
  const deleteFromDrive = document.getElementById('deleteFromDriveCheckbox').checked;
  
  if (!storyId) {
    showError('Story ID not found');
    return;
  }
  
  const btn = document.getElementById('deleteConfirmBtn');
  btn.disabled = true;
  btn.textContent = 'Deleting...';
  
  try {
    await deleteStory(storyId, deleteFromDrive);
    closeDeleteStoryModal();
    
    // Force refresh by clearing the folder ID cache and reloading
    // This ensures we get the latest list from Drive
    yarnyStoriesFolderId = null;
    
    // Small delay to ensure Drive has processed the deletion
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Reload stories list
    const stories = await listStories();
    renderStories(stories);
    
    // Show success message briefly
    const successEl = document.getElementById('modalError');
    if (successEl) {
      successEl.textContent = 'Story deleted successfully';
      successEl.classList.remove('hidden');
      successEl.style.background = '#efe';
      successEl.style.color = '#3c3';
      setTimeout(() => {
        successEl.classList.add('hidden');
        successEl.style.background = '';
        successEl.style.color = '';
      }, 2000);
    }
  } catch (error) {
    showError('Failed to delete story: ' + error.message);
    btn.disabled = false;
    btn.textContent = 'Delete Story';
  }
}

// Export for global access
window.openDeleteStoryModal = openDeleteStoryModal;
window.closeDeleteStoryModal = closeDeleteStoryModal;
window.handleDeleteConfirmInput = handleDeleteConfirmInput;
window.confirmDeleteStory = confirmDeleteStory;

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
  
  // Refresh button
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', refreshStoriesFromDrive);
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
    
    const storyGenre = document.getElementById('storyGenre').value.trim() || '';
    const wordGoal = parseInt(document.getElementById('wordGoal').value) || 3000;
    
      const createBtn = document.getElementById('createStoryBtn');
      createBtn.disabled = true;
      createBtn.textContent = 'Creating...';
      
      try {
        const storyFolder = await createStory(storyName, { genre: storyGenre, wordGoal: wordGoal });
        
        // If storyFolder is null, it means we redirected for re-auth
        if (storyFolder === null) {
          // The redirect already happened, just reset the button state
          createBtn.disabled = false;
          createBtn.textContent = 'Create Story';
          return;
        }
        
        // Check for errors before navigating
        const errors = JSON.parse(localStorage.getItem('yarny_error_log') || '[]');
        if (errors.length > 0) {
          console.warn('⚠️ Errors occurred during story creation. Run viewYarnyErrors() to see details.');
          console.warn('Recent errors:', errors.slice(0, 5).map(e => e.message));
        }
        
        closeNewStoryModal();
      
      // Open the new story in editor
      openStory(storyFolder.id, storyFolder.name);
    } catch (error) {
      showError('Failed to create story: ' + error.message);
      createBtn.disabled = false;
      createBtn.textContent = 'Create Story';
    }
  });
  
  // Close modal on overlay click (only for new story modal)
  document.querySelector('#newStoryModal .modal-overlay').addEventListener('click', closeNewStoryModal);
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
