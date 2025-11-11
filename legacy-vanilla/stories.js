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

// Cache keys
const CACHE_KEY_YARNY_FOLDER = 'yarny_stories_folder_id';
const CACHE_KEY_STORY_PROGRESS = 'yarny_story_progress';
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes cache

// Get cached Yarny folder ID
function getCachedYarnyFolderId() {
  try {
    const cached = localStorage.getItem(CACHE_KEY_YARNY_FOLDER);
    if (cached) {
      const { folderId, timestamp } = JSON.parse(cached);
      // Cache is valid for 24 hours
      if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
        return folderId;
      }
    }
  } catch (e) {
    console.warn('Error reading cached folder ID:', e);
  }
  return null;
}

// Cache Yarny folder ID
function cacheYarnyFolderId(folderId) {
  try {
    localStorage.setItem(CACHE_KEY_YARNY_FOLDER, JSON.stringify({
      folderId,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.warn('Error caching folder ID:', e);
  }
}

// Get cached story progress
function getCachedStoryProgress(storyId) {
  try {
    const cached = localStorage.getItem(CACHE_KEY_STORY_PROGRESS);
    if (cached) {
      const progressCache = JSON.parse(cached);
      const storyProgress = progressCache[storyId];
      if (storyProgress && Date.now() - storyProgress.timestamp < CACHE_DURATION_MS) {
        return storyProgress.data;
      }
    }
  } catch (e) {
    console.warn('Error reading cached progress:', e);
  }
  return null;
}

// Cache story progress
function cacheStoryProgress(storyId, progress) {
  try {
    const cached = localStorage.getItem(CACHE_KEY_STORY_PROGRESS);
    const progressCache = cached ? JSON.parse(cached) : {};
    progressCache[storyId] = {
      data: progress,
      timestamp: Date.now()
    };
    localStorage.setItem(CACHE_KEY_STORY_PROGRESS, JSON.stringify(progressCache));
  } catch (e) {
    console.warn('Error caching progress:', e);
  }
}

// Clear cached progress for a story (when it's modified)
function clearCachedStoryProgress(storyId) {
  try {
    const cached = localStorage.getItem(CACHE_KEY_STORY_PROGRESS);
    if (cached) {
      const progressCache = JSON.parse(cached);
      delete progressCache[storyId];
      localStorage.setItem(CACHE_KEY_STORY_PROGRESS, JSON.stringify(progressCache));
    }
  } catch (e) {
    console.warn('Error clearing cached progress:', e);
  }
}

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
// OPTIMIZED: Reduced wait time and improved error handling
async function checkDriveAuth() {
  // Wait for driveAPI to be available
  if (!window.driveAPI) {
    console.log('driveAPI not loaded yet, waiting...');
    // OPTIMIZATION: Reduced from 2 seconds to 1 second max wait time
    // drive.js should load quickly since it's loaded in the HTML before stories.js
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (window.driveAPI) break;
    }
    if (!window.driveAPI) {
      console.error('driveAPI failed to load after 1 second');
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

// Get or create Yarny Stories folder
async function getOrCreateYarnyStoriesFolder(forceRefresh = false) {
  // Clear cache if force refresh is requested
  if (forceRefresh) {
    try {
      localStorage.removeItem(CACHE_KEY_YARNY_FOLDER);
      console.log('Cleared cached folder ID for refresh');
    } catch (e) {
      console.warn('Error clearing cache:', e);
    }
  }
  
  // Always check with backend to allow migration to run
  // The backend will handle migration from "Yarny" to "Yarny Stories"
  try {
    console.log('Calling backend to get or create Yarny Stories folder...');
    const response = await axios.get(`${API_BASE}/drive-get-or-create-yarny-stories`, {
      withCredentials: true
    });
    
    yarnyStoriesFolderId = response.data.id;
    cacheYarnyFolderId(response.data.id);
    
    // If migration occurred, log it and show a message
    if (response.data.migrated) {
      console.log('✅ Folder migrated from "Yarny" to "Yarny Stories"');
      // Optionally show a user-visible notification
    }
    
    return response.data.id;
  } catch (error) {
    console.error('Error getting Yarny Stories folder:', error);
    console.error('Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    // If backend call fails, fall back to cache if available
    const cached = getCachedYarnyFolderId();
    if (cached) {
      console.warn('Using cached folder ID due to backend error');
      yarnyStoriesFolderId = cached;
      return cached;
    }
    const errorMessage = error.response?.data?.error || error.message || 'Failed to get Yarny Stories folder';
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

// List folders (stories) in Yarny Stories directory
// OPTIMIZED: Returns basic story info without enrichment to speed up initial load
// Enrichment (updatedAt, progress) happens in renderStories() to avoid duplicate API calls
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
    
    // Sort by folder modifiedTime (most recent first) - we'll update with project.json updatedAt later
    storyFolders.sort((a, b) => {
      const timeA = new Date(a.modifiedTime || 0).getTime();
      const timeB = new Date(b.modifiedTime || 0).getTime();
      return timeB - timeA; // Descending order (most recent first)
    });
    
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
    // Clear cache to force fresh data
    try {
      localStorage.removeItem(CACHE_KEY_STORY_PROGRESS);
    } catch (e) {
      console.warn('Error clearing progress cache:', e);
    }
    
    // Re-fetch stories from Drive - this will only return stories that currently exist
    const stories = await listStories();
    
    // Re-render with the fresh list from Drive
    // This automatically removes any stories that were deleted from Drive
    // Pass skipLoadingState=true so we can control the loading state ourselves
    await renderStories(stories, true);
    
    console.log(`Refreshed: ${stories.length} story(ies) found in Drive`);
  } catch (error) {
    console.error('Error refreshing stories:', error);
    alert('Failed to refresh stories: ' + error.message);
    // Try to restore the list even if refresh failed
    try {
      const stories = await listStories();
      await renderStories(stories, true);
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

// Get current date in US Pacific time (same as editor.js)
function getPacificDate() {
  const now = new Date();
  // Use Intl.DateTimeFormat to get the date components in Pacific timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  // Format returns something like "12/25/2025" or "01/05/2025"
  const parts = formatter.formatToParts(now);
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  
  return `${year}-${month}-${day}`;
}

// Check if a date is a writing day (for dashboard goal calculations)
function isWritingDayForGoal(dateString, goal) {
  if (!goal) return false;
  const date = new Date(dateString + 'T12:00:00');
  const dayOfWeek = date.getDay();
  const writingDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  
  if (goal.daysOff && goal.daysOff.includes(dateString)) {
    return false;
  }
  
  return goal.writingDays && goal.writingDays[writingDayIndex] === true;
}

// Count effective writing days between two dates
function countWritingDaysForGoal(startDate, endDate, goal) {
  if (!goal) return 0;
  let count = 0;
  const start = new Date(startDate + 'T12:00:00');
  const end = new Date(endDate + 'T12:00:00');
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    if (isWritingDayForGoal(dateStr, goal)) {
      count++;
    }
  }
  
  return count;
}

// Calculate daily goal info for a story (for dashboard)
function calculateDailyGoalInfo(goal, totalWords) {
  if (!goal || !goal.target || !goal.deadline) {
    return null;
  }
  
  const today = getPacificDate();
  const deadline = goal.deadline.split('T')[0];
  
  // Calculate words already in ledger (excluding today)
  let ledgerWords = 0;
  if (goal.ledger) {
    Object.keys(goal.ledger).forEach(date => {
      if (date !== today) {
        ledgerWords += goal.ledger[date] || 0;
      }
    });
  }
  
  // Calculate today's words
  const todayWords = totalWords - ledgerWords;
  
  // Count remaining writing days
  const remainingDays = countWritingDaysForGoal(today, deadline, goal);
  
  if (remainingDays <= 0) {
    return { 
      todayWords: Math.max(0, todayWords), 
      remaining: 0,
      target: 0,
      wordsRemaining: Math.max(0, goal.target - totalWords)
    };
  }
  
  // Calculate remaining words needed
  const wordsRemaining = Math.max(0, goal.target - totalWords);
  
  if (goal.mode === 'elastic') {
    // Elastic: recalculate daily target based on remaining words and days
    const dailyTarget = Math.ceil(wordsRemaining / remainingDays);
    return {
      target: dailyTarget,
      todayWords: Math.max(0, todayWords),
      remaining: remainingDays,
      wordsRemaining: wordsRemaining,
      isAhead: todayWords > dailyTarget,
      isBehind: todayWords < dailyTarget
    };
  } else {
    // Strict: fixed daily target (calculate from original target and total days from start to deadline)
    const startDate = goal.startDate || goal.lastCalculatedDate || today;
    const totalWritingDays = countWritingDaysForGoal(
      startDate.split('T')[0],
      deadline,
      goal
    );
    const fixedDailyTarget = totalWritingDays > 0 ? Math.ceil(goal.target / totalWritingDays) : 0;
    
    return {
      target: fixedDailyTarget,
      todayWords: Math.max(0, todayWords),
      remaining: remainingDays,
      wordsRemaining: wordsRemaining,
      isAhead: todayWords > fixedDailyTarget,
      isBehind: todayWords < fixedDailyTarget
    };
  }
}

// Fetch story progress data (word count and goal) and enrichment (updatedAt)
// OPTIMIZED: Returns both progress and updatedAt in a single call to avoid duplicate file listings
async function fetchStoryProgressAndEnrichment(storyFolderId, fileMap = null, useCache = true) {
  // Check cache first
  if (useCache) {
    const cached = getCachedStoryProgress(storyFolderId);
    if (cached) {
      // Return cached progress with updatedAt if available
      return {
        progress: cached,
        updatedAt: cached.updatedAt || null
      };
    }
  }
  
  try {
    // List files if not provided (allows reuse of file listings)
    if (!fileMap) {
      const files = await window.driveAPI.list(storyFolderId);
      fileMap = {};
      (files.files || []).forEach(file => {
        fileMap[file.name] = file.id;
      });
    }
    
    let wordGoal = 3000; // Default goal
    let totalWords = 0;
    let goal = null;
    let updatedAt = null;
    
    // Read project.json, goal.json, and data.json in parallel
    const readPromises = [];
    
    if (fileMap['project.json']) {
      readPromises.push(
        window.driveAPI.read(fileMap['project.json'])
          .then(projectData => {
            if (projectData.content) {
              const project = JSON.parse(projectData.content);
              wordGoal = project.wordGoal || 3000;
              updatedAt = project.updatedAt || null;
            }
          })
          .catch(error => {
            console.warn(`Failed to read project.json for story ${storyFolderId}:`, error);
          })
      );
    }
    
    if (fileMap['goal.json']) {
      readPromises.push(
        window.driveAPI.read(fileMap['goal.json'])
          .then(goalData => {
            if (goalData.content) {
              goal = JSON.parse(goalData.content);
            }
          })
          .catch(error => {
            console.warn(`Failed to read goal.json for story ${storyFolderId}:`, error);
          })
      );
    }
    
    if (fileMap['data.json']) {
      readPromises.push(
        window.driveAPI.read(fileMap['data.json'])
          .then(dataContent => {
            if (dataContent.content) {
              const data = JSON.parse(dataContent.content);
              
              // Use shared calculation function - same logic as editor progress meter
              if (data.snippets && data.groups) {
                totalWords = window.calculateStoryWordCount(data.snippets, data.groups);
              }
            }
          })
          .catch(error => {
            console.warn(`Failed to read data.json for story ${storyFolderId}:`, error);
          })
      );
    }
    
    // Wait for all reads to complete in parallel
    await Promise.all(readPromises);
    
    const percentage = wordGoal > 0 ? Math.min(100, Math.round((totalWords / wordGoal) * 100)) : 0;
    
    // Calculate daily goal info if goal exists
    const dailyInfo = goal ? calculateDailyGoalInfo(goal, totalWords) : null;
    
    const progress = {
      wordGoal,
      totalWords,
      percentage,
      goal,
      dailyInfo,
      updatedAt // Include updatedAt in progress cache
    };
    
    // Cache the result
    cacheStoryProgress(storyFolderId, progress);
    
    return {
      progress,
      updatedAt
    };
  } catch (error) {
    console.warn(`Failed to fetch progress for story ${storyFolderId}:`, error);
    return {
      progress: null,
      updatedAt: null
    };
  }
}

// Legacy function for backward compatibility
async function fetchStoryProgress(storyFolderId, useCache = true) {
  const result = await fetchStoryProgressAndEnrichment(storyFolderId, null, useCache);
  return result.progress;
}

// Render stories list
// OPTIMIZED: Shows stories immediately, then fetches progress in parallel
async function renderStories(stories, skipLoadingState = false) {
  const listEl = document.getElementById('storiesList');
  const emptyState = document.getElementById('emptyState');
  const loadingState = document.getElementById('loadingState');
  
  if (!skipLoadingState) {
    loadingState.classList.add('hidden');
  }
  
  if (stories.length === 0) {
    listEl.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }
  
  emptyState.classList.add('hidden');
  listEl.innerHTML = '';
  
  // OPTIMIZATION: Show stories immediately with cached data or loading state
  // This makes the page interactive much faster
  const storyCards = stories.map(story => {
    const storyCard = document.createElement('div');
    storyCard.className = 'story-card';
    storyCard.dataset.storyId = story.id;
    
    // Try to get cached progress for immediate display
    const cachedProgress = getCachedStoryProgress(story.id);
    const cachedUpdatedAt = cachedProgress?.updatedAt || null;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'story-card-content';
    
    // Show cached progress if available, otherwise show loading
    let progressHtml = '';
    
    if (cachedProgress) {
      const percentage = cachedProgress.wordGoal > 0 
        ? Math.min(100, Math.round((cachedProgress.totalWords / cachedProgress.wordGoal) * 100)) 
        : 0;
      
      const exceedsGoal = cachedProgress.wordGoal > 0 && cachedProgress.totalWords > cachedProgress.wordGoal;
      const exceedsClass = exceedsGoal ? ' exceeds-goal' : '';
      
      // Build today progress section if goal exists
      let todaySectionHtml = '';
      if (cachedProgress.dailyInfo && cachedProgress.dailyInfo.target !== undefined) {
        const todayWords = cachedProgress.dailyInfo.todayWords || 0;
        const todayTarget = cachedProgress.dailyInfo.target || 0;
        const daysLeft = cachedProgress.dailyInfo.remaining || 0;
        const todayExceedsGoal = todayTarget > 0 && todayWords > todayTarget;
        const todayPercentage = todayTarget > 0 ? Math.min(100, Math.round((todayWords / todayTarget) * 100)) : 0;
        const todayExceedsClass = todayExceedsGoal ? ' exceeds-goal' : '';
        
        todaySectionHtml = `
          <div class="story-progress-row">
            <div class="story-progress-text">
              <span class="story-today-label">Today</span> ${todayWords.toLocaleString()} / ${todayTarget.toLocaleString()}${daysLeft > 0 ? ` <span class="story-days-left">· ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left</span>` : ''}
            </div>
            ${todayTarget > 0 ? `
              <div class="story-progress-bar-container">
                <div class="story-progress-bar${todayExceedsClass}" style="width: ${todayPercentage}%"></div>
              </div>
            ` : ''}
          </div>
        `;
      }
      
      progressHtml = `
        <div class="story-progress-container">
          <div class="story-progress-row">
            <div class="story-progress-text">${cachedProgress.totalWords.toLocaleString()} / ${cachedProgress.wordGoal.toLocaleString()} words</div>
            <div class="story-progress-bar-container">
              <div class="story-progress-bar${exceedsClass}" style="width: ${percentage}%"></div>
            </div>
          </div>
          ${todaySectionHtml}
        </div>
      `;
    } else {
      progressHtml = `
        <div class="story-progress-container">
          <div class="story-progress-row">
            <div class="story-progress-text">Loading progress...</div>
            <div class="story-progress-bar-container">
              <div class="story-progress-bar" style="width: 0%"></div>
            </div>
          </div>
        </div>
      `;
    }
    
    // Build deadline display if available
    let deadlineHtml = '';
    if (cachedProgress && cachedProgress.goal && cachedProgress.goal.deadline) {
      const deadlineFormatted = formatDeadline(cachedProgress.goal.deadline);
      if (deadlineFormatted) {
        deadlineHtml = `<p class="story-deadline">Deadline: ${deadlineFormatted}</p>`;
      }
    }
    
    contentDiv.innerHTML = `
      <h3>${escapeHtml(story.name)}</h3>
      <p class="story-modified">Last modified: ${formatDate(cachedUpdatedAt || story.modifiedTime)}</p>
      ${deadlineHtml}
      ${progressHtml}
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
    return { story, card: storyCard, hasCachedProgress: !!cachedProgress };
  });
  
  // OPTIMIZATION: Fetch progress for each story independently and update as data arrives
  // This allows stories to update progressively rather than waiting for all to complete
  storyCards.forEach(({ story, card, hasCachedProgress }) => {
    // Start fetching progress immediately for each story (fire and forget)
    // Each story updates independently as its data arrives
    (async () => {
      try {
        // List files for this story
        const files = await window.driveAPI.list(story.id);
        const fileMap = {};
        (files.files || []).forEach(file => {
          fileMap[file.name] = file.id;
        });
        
        // Fetch progress and updatedAt together (reuses fileMap to avoid duplicate listing)
        const { progress, updatedAt } = await fetchStoryProgressAndEnrichment(story.id, fileMap, false);
      
      if (progress) {
        // Update updatedAt in the modified date display
        if (updatedAt) {
          const modifiedEl = card.querySelector('.story-modified');
          if (modifiedEl) {
            modifiedEl.textContent = `Last modified: ${formatDate(updatedAt)}`;
          }
        }
        
        // Update deadline display
        let deadlineEl = card.querySelector('.story-deadline');
        if (progress.goal && progress.goal.deadline) {
          const deadlineFormatted = formatDeadline(progress.goal.deadline);
          if (deadlineFormatted) {
            if (deadlineEl) {
              deadlineEl.textContent = `Deadline: ${deadlineFormatted}`;
            } else {
              // Create new deadline element
              deadlineEl = document.createElement('p');
              deadlineEl.className = 'story-deadline';
              deadlineEl.textContent = `Deadline: ${deadlineFormatted}`;
              // Insert after the modified date, before the progress container
              const modifiedEl = card.querySelector('.story-modified');
              const progressContainer = card.querySelector('.story-progress-container');
              if (modifiedEl) {
                if (progressContainer) {
                  modifiedEl.parentNode.insertBefore(deadlineEl, progressContainer);
                } else {
                  modifiedEl.parentNode.appendChild(deadlineEl);
                }
              }
            }
          }
        } else if (deadlineEl) {
          // Remove deadline if it no longer exists
          deadlineEl.remove();
        }
        
        // Update progress display
        const progressContainer = card.querySelector('.story-progress-container');
        if (!progressContainer) {
          console.warn(`Could not find progress container for story ${story.name}`);
          return;
        }
        
        // Update overall progress row
        const overallRow = progressContainer.querySelector('.story-progress-row');
        if (overallRow) {
          const overallText = overallRow.querySelector('.story-progress-text');
          const overallBar = overallRow.querySelector('.story-progress-bar');
          
          if (overallText && overallBar) {
            overallText.textContent = `${progress.totalWords.toLocaleString()} / ${progress.wordGoal.toLocaleString()} words`;
            
            const percentage = progress.wordGoal > 0 
              ? Math.min(100, Math.round((progress.totalWords / progress.wordGoal) * 100)) 
              : 0;
            overallBar.style.width = `${percentage}%`;
            
            // Handle overflow - add exceeds-goal class if progress exceeds goal
            const exceedsGoal = progress.wordGoal > 0 && progress.totalWords > progress.wordGoal;
            if (exceedsGoal) {
              overallBar.classList.add('exceeds-goal');
            } else {
              overallBar.classList.remove('exceeds-goal');
            }
          }
        }
        
        // Update or create today progress row
        let todayRow = progressContainer.querySelectorAll('.story-progress-row')[1];
        if (progress.dailyInfo && progress.dailyInfo.target !== undefined) {
          const todayWords = progress.dailyInfo.todayWords || 0;
          const todayTarget = progress.dailyInfo.target || 0;
          const daysLeft = progress.dailyInfo.remaining || 0;
          const todayExceedsGoal = todayTarget > 0 && todayWords > todayTarget;
          const todayPercentage = todayTarget > 0 ? Math.min(100, Math.round((todayWords / todayTarget) * 100)) : 0;
          
          if (!todayRow) {
            // Create new today row
            todayRow = document.createElement('div');
            todayRow.className = 'story-progress-row';
            progressContainer.appendChild(todayRow);
          }
          
          const todayText = todayRow.querySelector('.story-progress-text');
          const todayBarContainer = todayRow.querySelector('.story-progress-bar-container');
          
          // Update today text
          if (todayText) {
            todayText.innerHTML = `<span class="story-today-label">Today</span> ${todayWords.toLocaleString()} / ${todayTarget.toLocaleString()}${daysLeft > 0 ? ` <span class="story-days-left">· ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left</span>` : ''}`;
          } else {
            const textDiv = document.createElement('div');
            textDiv.className = 'story-progress-text';
            textDiv.innerHTML = `<span class="story-today-label">Today</span> ${todayWords.toLocaleString()} / ${todayTarget.toLocaleString()}${daysLeft > 0 ? ` <span class="story-days-left">· ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left</span>` : ''}`;
            todayRow.appendChild(textDiv);
          }
          
          // Update today progress bar
          if (todayTarget > 0) {
            let barContainer = todayBarContainer;
            if (!barContainer) {
              barContainer = document.createElement('div');
              barContainer.className = 'story-progress-bar-container';
              todayRow.appendChild(barContainer);
            }
            
            let bar = barContainer.querySelector('.story-progress-bar');
            if (!bar) {
              bar = document.createElement('div');
              bar.className = 'story-progress-bar';
              barContainer.appendChild(bar);
            }
            
            bar.style.width = `${todayPercentage}%`;
            
            // Handle overflow - add exceeds-goal class if progress exceeds goal
            if (todayExceedsGoal) {
              bar.classList.add('exceeds-goal');
            } else {
              bar.classList.remove('exceeds-goal');
            }
          } else if (todayBarContainer) {
            todayBarContainer.remove();
          }
        } else if (todayRow) {
          // Remove today row if goal doesn't exist
          todayRow.remove();
        }
      } else {
        console.warn(`No progress data returned for story ${story.name}`);
        // Hide progress if we couldn't fetch it
        const progressContainer = card.querySelector('.story-progress-container');
        if (progressContainer && !hasCachedProgress) {
          progressContainer.style.display = 'none';
        }
      }
      } catch (error) {
        console.error(`Error fetching progress for story ${story.name}:`, error);
        // Only hide progress if we don't have cached data showing
        if (!hasCachedProgress) {
          const progressContainer = card.querySelector('.story-progress-container');
          if (progressContainer) {
            progressContainer.style.display = 'none';
          }
        }
      }
    })();
  });
  
  // Stories are now shown and will update progressively as data arrives
  // No need to wait - the page is immediately interactive
}

// Get a random opening sentence
// Note: OPENING_SENTENCES is defined in opening-sentences.js
function getRandomOpeningSentence() {
  if (typeof OPENING_SENTENCES === 'undefined' || !Array.isArray(OPENING_SENTENCES) || OPENING_SENTENCES.length === 0) {
    console.error('OPENING_SENTENCES is not defined or empty. Make sure opening-sentences.js is loaded before stories.js');
    return "It was a dark and stormy night.";
  }
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

    // OPTIMIZATION: Create all main folders in parallel for faster story creation
    const folderPromises = folders.map(folder => 
      createDriveFolder(folder.name, storyFolderId).then(result => ({ name: folder.name, id: result.id }))
    );
    const folderResults = await Promise.all(folderPromises);
    const createdFolders = {};
    folderResults.forEach(({ name, id }) => {
      createdFolders[name] = id;
    });

    // Create a sample chapter (group) and snippet with random opening sentence
    const randomOpening = getRandomOpeningSentence();
    const groupId = 'group_' + Date.now();
    const snippetId = 'snippet_' + Date.now();
    
    // Create initial project.json file data (can be created early)
    const projectData = {
      name: 'New Project',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      activeSnippetId: snippetId,
      snippetIds: [snippetId],
      groupIds: [groupId],
      wordGoal: metadata.wordGoal || 3000,
      genre: metadata.genre || '',
      description: metadata.description || ''
    };

    // OPTIMIZATION: Create Chapter 1 folder and project.json in parallel
    // Chapter 1 folder depends on Chapters folder, but project.json doesn't depend on anything
    const [chapter1Folder] = await Promise.all([
      createDriveFolder('Chapter 1', createdFolders['Chapters']),
      window.driveAPI.write(
        'project.json',
        JSON.stringify(projectData, null, 2),
        null,
        storyFolderId
      )
    ]);

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
      }
    };

    // OPTIMIZATION: Create data.json and Opening Scene doc in parallel
    // Both depend on chapter1Folder, but are independent of each other
    try {
      if (chapter1Folder && chapter1Folder.id) {
        console.log('Creating Opening Scene Google Doc with content:', randomOpening.substring(0, 50) + '...');
        
        const [docResult] = await Promise.all([
          window.driveAPI.write(
            'Opening Scene.doc',
            randomOpening,
            null,
            chapter1Folder.id,
            'application/vnd.google-apps.document'
          ),
          window.driveAPI.write(
            'data.json',
            JSON.stringify(initialState, null, 2),
            null,
            storyFolderId
          )
        ]);
        
        console.log('Opening Scene Google Doc created:', docResult.id);
        
        // Update the snippet with the Drive file ID
        initialState.snippets[snippetId].driveFileId = docResult.id;
        
        // Update data.json with the file ID (must happen after doc creation)
        await window.driveAPI.write(
          'data.json',
          JSON.stringify(initialState, null, 2),
          null,
          storyFolderId
        );
        
        console.log('data.json updated with snippet structure');
      } else {
        console.error('Chapters folder ID not found');
        // Still create data.json even if chapter folder creation failed
        await window.driveAPI.write(
          'data.json',
          JSON.stringify(initialState, null, 2),
          null,
          storyFolderId
        );
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
    
    // Create goal.json if goal metadata is provided (outside try-catch so it always runs)
    if (metadata.goal && metadata.goal.deadline) {
      const today = getPacificDate();
      const goalData = {
        target: metadata.goal.target || metadata.wordGoal || 3000,
        deadline: metadata.goal.deadline,
        startDate: today,
        writingDays: metadata.goal.writingDays || [true, true, true, true, true, true, true],
        daysOff: metadata.goal.daysOff || [],
        mode: metadata.goal.mode || 'elastic',
        ledger: {},
        lastCalculatedDate: today
      };
      
      try {
        await window.driveAPI.write(
          'goal.json',
          JSON.stringify(goalData, null, 2),
          null,
          storyFolderId,
          'text/plain'
        );
        console.log('goal.json created with initial goal settings');
      } catch (error) {
        console.warn('Failed to create goal.json (non-critical):', error);
        // Don't throw - goal.json is optional
      }
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
    // Ensure Yarny Stories folder exists
    if (!yarnyStoriesFolderId) {
      await getOrCreateYarnyStoriesFolder();
    }
    
    // Create story folder in Yarny Stories
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
function openStory(storyFolderId, storyName, isNewStory = false) {
  // Store story info in localStorage for editor to use
  localStorage.setItem('yarny_current_story', JSON.stringify({
    id: storyFolderId,
    name: storyName
  }));
  
  // Set flag if this is a newly created story (so editor can show appropriate loading message)
  if (isNewStory) {
    localStorage.setItem('yarny_newly_created_story', 'true');
  }
  
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
    clearCachedStoryProgress(storyId);
    
    // Small delay to ensure Drive has processed the deletion
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Reload stories list
    const stories = await listStories();
    await renderStories(stories);
    
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
  
  // Reset and setup character counter for story description
  const descInput = document.getElementById('storyDescription');
  const charCount = document.getElementById('storyDescriptionCharCount');
  if (descInput && charCount) {
    descInput.value = '';
    charCount.textContent = '0';
    descInput.addEventListener('input', () => {
      charCount.textContent = descInput.value.length;
    });
  }
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

// Format deadline date (similar to formatDate but for deadline display)
function formatDeadline(deadlineString) {
  if (!deadlineString) return null;
  const date = new Date(deadlineString);
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
  
  // OPTIMIZATION: Initialize folder ID proactively and cache it
  // This prevents listStories() from making a redundant folder lookup call
  try {
    const cachedFolderId = getCachedYarnyFolderId();
    if (cachedFolderId) {
      yarnyStoriesFolderId = cachedFolderId;
      console.log('Using cached folder ID:', cachedFolderId);
    } else {
      // Get or create folder ID now (before listing stories) to avoid duplicate call
      console.log('Getting or creating Yarny Stories folder...');
      yarnyStoriesFolderId = await getOrCreateYarnyStoriesFolder();
      console.log('Folder ID obtained:', yarnyStoriesFolderId);
    }
  } catch (error) {
    console.error('Error getting folder ID:', error);
    // Continue anyway - listStories() will try again if needed
  }
  
  // Load stories (will use cached yarnyStoriesFolderId if available)
  try {
    const stories = await listStories();
    if (stories && stories.length >= 0) {
      await renderStories(stories);
    } else {
      console.warn('No stories returned from listStories');
      // Show empty state
      document.getElementById('storiesList').innerHTML = '';
      document.getElementById('emptyState').classList.remove('hidden');
      document.getElementById('loadingState').classList.add('hidden');
    }
  } catch (error) {
    console.error('Error loading stories:', error);
    // Show error state but don't block the page
    const listEl = document.getElementById('storiesList');
    const loadingState = document.getElementById('loadingState');
    if (listEl && loadingState) {
      listEl.innerHTML = '';
      loadingState.classList.add('hidden');
      const errorEl = document.createElement('div');
      errorEl.className = 'error-message';
      errorEl.textContent = 'Failed to load stories: ' + error.message;
      errorEl.style.margin = '20px';
      errorEl.style.padding = '12px';
      errorEl.style.background = '#fee';
      errorEl.style.color = '#c33';
      errorEl.style.borderRadius = '4px';
      listEl.appendChild(errorEl);
    } else {
      alert('Failed to load stories: ' + error.message);
    }
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
    const storyDescription = document.getElementById('storyDescription').value.trim() || '';
    const goalTarget = parseInt(document.getElementById('goalTarget').value) || 3000;
    
    // Capture goal fields - using same field IDs as goal panel
    const goalDeadline = document.getElementById('goalDeadline').value.trim();
    const goalMode = document.getElementById('goalMode').value || 'elastic';
    const daysOffInput = document.getElementById('daysOffInput').value.trim();
    
    // Parse writing days
    const writingDays = [];
    for (let i = 0; i < 7; i++) {
      const checkbox = document.getElementById(`writingDay${i}`);
      writingDays.push(checkbox ? checkbox.checked : true);
    }
    
    // Parse days off
    let daysOff = [];
    if (daysOffInput) {
      daysOff = daysOffInput.split(',').map(d => d.trim()).filter(d => {
        // Validate date format YYYY-MM-DD
        return /^\d{4}-\d{2}-\d{2}$/.test(d);
      });
    }
    
    // Build goal metadata if deadline is provided (same structure as goal panel saves)
    const goalMetadata = goalDeadline ? {
      target: goalTarget,
      deadline: goalDeadline + 'T23:59:59', // End of day
      writingDays: writingDays,
      daysOff: daysOff,
      mode: goalMode
    } : null;
    
      const createBtn = document.getElementById('createStoryBtn');
      createBtn.disabled = true;
      createBtn.textContent = 'Creating...';
      
      try {
        const storyFolder = await createStory(storyName, { 
          genre: storyGenre,
          description: storyDescription,
          wordGoal: goalTarget, // Keep wordGoal for project.json compatibility
          goal: goalMetadata
        });
        
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
      
      // Open the new story in editor (pass true to indicate it's a new story)
      openStory(storyFolder.id, storyFolder.name, true);
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

// Refresh stories when page becomes visible or when window gains focus
// This helps update word counts when navigating back from the editor
function refreshStoriesOnReturn() {
  if (window.location.pathname === '/stories.html' || window.location.pathname === '/stories.html') {
    console.log('Refreshing stories on page return...');
    // Always clear progress cache to get fresh data after editing
    // This ensures word counts are always up-to-date
    try {
      localStorage.removeItem(CACHE_KEY_STORY_PROGRESS);
      console.log('Cleared story progress cache');
    } catch (e) {
      console.warn('Error clearing progress cache:', e);
    }
    // Delay to ensure Drive API is ready and data.json saves have completed
    // Longer delay when coming from editor to allow data.json save to finish
    const delay = document.referrer && document.referrer.includes('editor.html') ? 1500 : 500;
    setTimeout(async () => {
      try {
        const stories = await listStories();
        await renderStories(stories);
      } catch (error) {
        console.error('Error refreshing stories on return:', error);
      }
    }, delay);
  }
}

// Listen for visibility changes (when tab becomes visible)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    refreshStoriesOnReturn();
  }
});

// Listen for window focus (when user switches back to the tab)
window.addEventListener('focus', refreshStoriesOnReturn);

// Also refresh on page load if coming from editor (checking referrer)
window.addEventListener('load', () => {
  // Check if we're coming from editor
  const comingFromEditor = document.referrer && document.referrer.includes('editor.html');
  
  // Check for pending save flag (indicates editor had unsaved data)
  let pendingSaveDelay = 0;
  try {
    const pendingSave = localStorage.getItem('yarny_pending_save');
    if (pendingSave) {
      const pendingData = JSON.parse(pendingSave);
      // If pending save is recent (within last 5 seconds), add extra delay
      if (Date.now() - pendingData.timestamp < 5000) {
        pendingSaveDelay = 2000; // Wait 2 seconds for data.json save to complete
        console.log('Pending save detected, adding extra delay for data.json save');
      }
      // Clear the pending save flag
      localStorage.removeItem('yarny_pending_save');
    }
  } catch (e) {
    console.warn('Error checking pending save:', e);
  }
  
  // Delay to ensure everything is initialized and data.json saves complete
  const totalDelay = comingFromEditor ? 1500 + pendingSaveDelay : 500;
  setTimeout(() => {
    if (comingFromEditor) {
      console.log('Page loaded from editor, refreshing stories...');
      refreshStoriesOnReturn();
    }
  }, totalDelay);
});
