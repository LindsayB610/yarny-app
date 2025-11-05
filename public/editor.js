// ============================================
// Yarny Editor - Main Application Logic
// ============================================

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
    if (args[0] && (typeof args[0] === 'string' && args[0].includes('Error')) || (args[1] && args[1] instanceof Error)) {
      const message = typeof args[0] === 'string' ? args[0] : args[1]?.message || 'Error';
      const errorObj = args[1] instanceof Error ? args[1] : args[0] instanceof Error ? args[0] : null;
      logError('console.error', message, errorObj);
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
  
  // Expose function to view errors (only if not already defined)
  if (!window.viewYarnyErrors) {
    window.viewYarnyErrors = function() {
      const errors = JSON.parse(localStorage.getItem(ERROR_KEY) || '[]');
      console.log('=== Yarny Error Log ===');
      if (errors.length === 0) {
        console.log('No errors logged yet.');
        return errors;
      }
      console.table(errors);
      console.log('\nFull error details:', errors);
      return errors;
    };
  }
  
  // Expose function to clear errors (only if not already defined)
  if (!window.clearYarnyErrors) {
    window.clearYarnyErrors = function() {
      localStorage.removeItem(ERROR_KEY);
      console.log('Error log cleared');
    };
  }
  
  // Log when page loads
  console.log('Error logging initialized. Use viewYarnyErrors() to see captured errors.');
})();

// Define the 12 categorical accent colors (used for chapter color coding)
const ACCENT_COLORS = [
  { name: 'red', value: '#EF4444' },
  { name: 'orange', value: '#F97316' },
  { name: 'amber', value: '#F59E0B' },
  { name: 'yellow', value: '#EAB308' },
  { name: 'lime', value: '#84CC16' },
  { name: 'emerald', value: '#10B981' },
  { name: 'teal', value: '#14B8A6' },
  { name: 'cyan', value: '#06B6D4' },
  { name: 'blue', value: '#3B82F6' },
  { name: 'indigo', value: '#6366F1' },
  { name: 'violet', value: '#8B5CF6' },
  { name: 'fuchsia', value: '#D946EF' }
];

// State Management
const state = {
  project: {
    id: 'default',
    title: 'Untitled Project',
    wordGoal: 3000,
    genre: '',
    groupIds: [],
    snippetIds: [], // Unified: includes both chapter snippets and People/Places/Things snippets
    activeSnippetId: null, // Unified: active snippet (chapter or People/Places/Things)
    activeRightTab: 'people',
    filters: {
      search: ''
    },
    editing: {
      isTyping: false,
      savingState: 'idle', // 'idle' | 'saving' | 'saved'
      lastSavedAt: null
    }
  },
  groups: {},
  snippets: {}, // Unified: all snippets (chapters have groupId, People/Places/Things have kind)
  // Drive integration
  drive: {
    storyFolderId: null,
    folderIds: {
      chapters: null,
      snippets: null,
      people: null,
      places: null,
      things: null
    }
  }
};

// Initialize with empty state (should only be used as fallback)
// Real stories should load from Drive via loadStoryFromDrive()
function initializeState() {
  // Clear all state
  state.groups = {};
  state.snippets = {};
  state.project.groupIds = [];
  state.project.snippetIds = [];
  state.project.activeSnippetId = null;

  // Render empty UI
  renderStoryList();
  renderEditor();
  renderSnippetsList();
  // Ensure noteEditor textarea is hidden (notes now open in main editor)
  document.getElementById('noteEditor').classList.add('hidden');
  updateFooter();
  updateGoalMeter();
  updateSaveStatus(); // Initialize save status and logout button warning
}

// ============================================
// Rendering Functions
// ============================================

function renderStoryList() {
  const listEl = document.getElementById('storyList');
  listEl.innerHTML = '';

  const groups = state.project.groupIds
    .map(id => state.groups[id])
    .filter(group => {
      if (!group) return false;
      // Filter by search
      if (state.project.filters.search) {
        const searchLower = state.project.filters.search.toLowerCase();
        const matchesGroup = group.title.toLowerCase().includes(searchLower);
        const matchesSnippets = group.snippetIds.some(snippetId => {
          const snippet = state.snippets[snippetId];
          if (!snippet) return false;
          return snippet.title.toLowerCase().includes(searchLower) ||
                 snippet.body.toLowerCase().includes(searchLower);
        });
        if (!matchesGroup && !matchesSnippets) return false;
      }
      return true;
    })
    .sort((a, b) => a.position - b.position);

  groups.forEach(group => {
    const groupEl = document.createElement('div');
    groupEl.className = 'story-group';
    groupEl.dataset.groupId = group.id;

    const headerEl = document.createElement('div');
    headerEl.className = 'group-header';
    headerEl.draggable = true;
    
    const colorChip = document.createElement('div');
    colorChip.className = 'group-color-chip';
    colorChip.style.backgroundColor = group.color || '#3B82F6';
    colorChip.title = 'Click to change color';
    colorChip.addEventListener('click', (e) => {
      e.stopPropagation();
      openColorPicker(group.id, colorChip);
    });
    
    const titleSpan = document.createElement('span');
    titleSpan.className = 'group-title';
    titleSpan.textContent = group.title;
    
    const countSpan = document.createElement('span');
    countSpan.className = 'group-snippet-count';
    countSpan.textContent = `${group.snippetIds.length} snippets`;
    
    const addBtn = document.createElement('button');
    addBtn.className = 'add-snippet-btn';
    addBtn.title = 'Add snippet to this chapter';
    const addIcon = document.createElement('i');
    addIcon.className = 'material-icons';
    addIcon.textContent = 'add';
    addBtn.appendChild(addIcon);
    addBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      addSnippetToGroup(group.id);
    });
    
    headerEl.appendChild(colorChip);
    headerEl.appendChild(titleSpan);
    headerEl.appendChild(countSpan);
    headerEl.appendChild(addBtn);
    
    // Drag & drop handlers
    headerEl.addEventListener('dragstart', (e) => handleGroupDragStart(e, group.id));
    headerEl.addEventListener('dragover', handleDragOver);
    headerEl.addEventListener('drop', (e) => handleGroupDrop(e, group.id));
    headerEl.addEventListener('dragend', handleDragEnd);
    
    // Right-click context menu
    headerEl.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showContextMenu(e, 'group', group.id);
    });

    const snippetsEl = document.createElement('div');
    snippetsEl.className = 'group-snippets';

    const snippets = group.snippetIds
      .map(id => state.snippets[id])
      .filter(snippet => {
        if (!snippet) return false;
        // Filter by search
        if (state.project.filters.search) {
          const searchLower = state.project.filters.search.toLowerCase();
          const matches = snippet.title.toLowerCase().includes(searchLower) ||
                         snippet.body.toLowerCase().includes(searchLower);
          if (!matches) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const aIndex = group.snippetIds.indexOf(a.id);
        const bIndex = group.snippetIds.indexOf(b.id);
        return aIndex - bIndex;
      });

    snippets.forEach(snippet => {
      const snippetEl = document.createElement('div');
      snippetEl.className = `snippet-item ${snippet.id === state.project.activeSnippetId ? 'active' : ''}`;
      snippetEl.dataset.snippetId = snippet.id;
      snippetEl.draggable = true;
      snippetEl.innerHTML = `
        <span class="snippet-title">${escapeHtml(snippet.title)}</span>
        <span class="snippet-word-count">${snippet.words} words</span>
      `;
      
      snippetEl.addEventListener('click', async () => {
        // Cancel any pending autosave timeout (we'll save manually)
        clearTimeout(typingTimeout);
        
        // Save current editor content to in-memory state before switching
        // This ensures no data loss when jumping between snippets
        saveCurrentEditorContent();
        
        // Capture ID of previous snippet before switching
        const previousSnippetId = state.project.activeSnippetId;
        const targetSnippetId = snippet.id;
        
        // Check for conflicts in the target snippet BEFORE switching
        const conflict = await checkSnippetConflict(targetSnippetId);
        if (conflict) {
          // Show conflict resolution modal
          const resolution = await showConflictResolutionModal(conflict);
          
          if (resolution.action === 'cancel') {
            // User canceled, don't switch snippets
            return;
          } else if (resolution.action === 'useLocal') {
            // User chose to keep local version, it will be saved to Drive below
            // Continue with switch
          } else if (resolution.action === 'useDrive') {
            // Drive content already loaded into snippet by resolveConflictWithDrive
            // Continue with switch
          }
        }
        
        // If switching from a different snippet, save it to Drive in background
        if (previousSnippetId && previousSnippetId !== targetSnippetId) {
          // Fire-and-forget save - don't block UI
          // Use the saved in-memory state, not the editor (which will change)
          (async () => {
            try {
              await saveItemToDriveById(previousSnippetId, null);
            } catch (error) {
              console.error('Background save failed (non-critical):', error);
            }
          })();
        }
        
        // If user chose local version in conflict, save it to Drive now
        if (conflict && conflictResolutionPromise === null) {
          // Conflict was resolved with local version
          (async () => {
            try {
              await saveItemToDriveById(targetSnippetId, null);
            } catch (error) {
              console.error('Failed to save local version after conflict resolution:', error);
            }
          })();
        }
        
        // Switch immediately (responsive UI)
        state.project.activeSnippetId = targetSnippetId;
        renderStoryList();
        renderEditor();
        updateFooter();
      });

      // Drag & drop handlers
      snippetEl.addEventListener('dragstart', (e) => handleSnippetDragStart(e, snippet.id, group.id));
      snippetEl.addEventListener('dragover', handleDragOver);
      snippetEl.addEventListener('drop', (e) => handleSnippetDrop(e, snippet.id, group.id));
      snippetEl.addEventListener('dragend', handleDragEnd);
      
      // Right-click context menu
      snippetEl.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showContextMenu(e, 'snippet', snippet.id);
      });

      snippetsEl.appendChild(snippetEl);
    });

    groupEl.appendChild(headerEl);
    groupEl.appendChild(snippetsEl);
    listEl.appendChild(groupEl);
  });

  // Highlight search matches
  if (state.project.filters.search) {
    highlightSearchMatches();
  }
  
  // Add "New Chapter" button at the bottom
  const newChapterBtn = document.createElement('button');
  newChapterBtn.className = 'new-chapter-btn';
  newChapterBtn.style.display = 'flex';
  newChapterBtn.style.alignItems = 'center';
  newChapterBtn.style.gap = '6px';
  const newChapterIcon = document.createElement('i');
  newChapterIcon.className = 'material-icons';
  newChapterIcon.textContent = 'add';
  newChapterIcon.style.fontSize = '18px';
  const newChapterText = document.createElement('span');
  newChapterText.textContent = 'New Chapter';
  newChapterBtn.appendChild(newChapterIcon);
  newChapterBtn.appendChild(newChapterText);
  newChapterBtn.addEventListener('click', async () => {
    await createNewGroup();
  });
  listEl.appendChild(newChapterBtn);
}

// Helper function to get text content from contenteditable preserving line breaks
function getEditorTextContent(element) {
  // In contenteditable, line breaks can be represented as:
  // - <br> tags (line breaks)
  // - <div> or <p> elements (paragraph breaks)
  // - Actual newline characters in textContent
  
  // Simple approach: use a temporary element to normalize
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = element.innerHTML || '';
  
  // Convert <br> tags to newlines
  tempDiv.querySelectorAll('br').forEach(br => {
    br.replaceWith(document.createTextNode('\n'));
  });
  
  // Convert block elements (div, p) to newlines
  // When a block element ends, add a newline before its content
  tempDiv.querySelectorAll('div, p').forEach(block => {
    // Insert a newline at the start of the block
    if (block.firstChild) {
      block.insertBefore(document.createTextNode('\n'), block.firstChild);
    } else {
      block.appendChild(document.createTextNode('\n'));
    }
    // Replace the block with its content (now including the newline)
    const parent = block.parentNode;
    while (block.firstChild) {
      parent.insertBefore(block.firstChild, block);
    }
    parent.removeChild(block);
  });
  
  // Get text content which will now have newlines
  let text = tempDiv.textContent || '';
  
  // Normalize line endings (CRLF -> LF, CR -> LF)
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Clean up excessive newlines (more than 2 consecutive) but preserve intentional line breaks
  // This prevents issues from empty paragraphs
  text = text.replace(/\n{3,}/g, '\n\n');
  
  return text;
}

// Helper function to set text content preserving line breaks
function setEditorTextContent(element, text) {
  // Use textContent which will preserve \n as actual line breaks
  // With white-space: pre-wrap CSS, these will be displayed correctly
  element.textContent = text || '';
}

function renderEditor() {
  const editorEl = document.getElementById('editorContent');
  const activeSnippet = state.project.activeSnippetId 
    ? state.snippets[state.project.activeSnippetId] 
    : null;

  if (activeSnippet) {
    setEditorTextContent(editorEl, activeSnippet.body);
  } else {
    setEditorTextContent(editorEl, '');
  }

  // Update save status
  updateSaveStatus();
}

function renderSnippetsList() {
  const listEl = document.getElementById('notesList'); // Keep HTML ID for now
  listEl.innerHTML = '';

  const activeTab = state.project.activeRightTab;
  // Map tab names to snippet kinds
  const kindMap = {
    'people': 'person',
    'places': 'place',
    'things': 'thing'
  };
  const targetKind = kindMap[activeTab];
  
  // Filter snippets by kind (People/Places/Things snippets have kind, chapter snippets don't)
  const snippets = state.project.snippetIds
    .map(id => state.snippets[id])
    .filter(snippet => snippet && snippet.kind === targetKind)
    .sort((a, b) => (a.position || 0) - (b.position || 0));

  if (snippets.length === 0) {
    listEl.innerHTML = '<div style="padding: 20px; text-align: center; color: #6B7280; font-size: 13px;">No snippets yet</div>';
  } else {
    snippets.forEach(snippet => {
      const snippetEl = document.createElement('div');
      snippetEl.className = `note-item ${snippet.id === state.project.activeSnippetId ? 'active' : ''}`; // Keep CSS class for now
      snippetEl.dataset.snippetId = snippet.id;
      snippetEl.innerHTML = `
        <div class="note-title">${escapeHtml(snippet.title)}</div>
        <div class="note-excerpt">${escapeHtml(snippet.body.substring(0, 60))}${snippet.body.length > 60 ? '...' : ''}</div>
      `;

      snippetEl.addEventListener('click', async () => {
        // Cancel any pending autosave timeout (we'll save manually)
        clearTimeout(typingTimeout);
        
        // Save current editor content to in-memory state before switching
        // This ensures no data loss when jumping between snippets
        saveCurrentEditorContent();
        
        // Capture ID of previous snippet before switching
        const previousSnippetId = state.project.activeSnippetId;
        const targetSnippetId = snippet.id;
        
        // Check for conflicts in the target snippet BEFORE switching
        const conflict = await checkSnippetConflict(targetSnippetId);
        if (conflict) {
          // Show conflict resolution modal
          const resolution = await showConflictResolutionModal(conflict);
          
          if (resolution.action === 'cancel') {
            // User canceled, don't switch snippets
            return;
          } else if (resolution.action === 'useLocal') {
            // User chose to keep local version, it will be saved to Drive below
            // Continue with switch
          } else if (resolution.action === 'useDrive') {
            // Drive content already loaded into snippet by resolveConflictWithDrive
            // Continue with switch
          }
        }
        
        // If switching from a different snippet, save it to Drive in background
        if (previousSnippetId && previousSnippetId !== targetSnippetId) {
          // Fire-and-forget save - don't block UI
          (async () => {
            try {
              await saveItemToDriveById(previousSnippetId, null);
            } catch (error) {
              console.error('Background save failed (non-critical):', error);
            }
          })();
        }
        
        // If user chose local version in conflict, save it to Drive now
        if (conflict && conflictResolutionAction === 'useLocal') {
          // Conflict was resolved with local version - save it to Drive
          (async () => {
            try {
              await saveItemToDriveById(targetSnippetId, null);
            } catch (error) {
              console.error('Failed to save local version after conflict resolution:', error);
            }
          })();
        }
        
        // Switch immediately (responsive UI)
        state.project.activeSnippetId = targetSnippetId;
        renderSnippetsList();
        renderEditor();
        updateFooter();
              });
      
      // Right-click context menu
      snippetEl.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showContextMenu(e, 'snippet', snippet.id);
      });

      listEl.appendChild(snippetEl);
    });
  }
  
  // Add "New Snippet" button at the bottom
  const newSnippetBtn = document.createElement('button');
  newSnippetBtn.className = 'new-note-btn'; // Keep CSS class for now
  newSnippetBtn.style.display = 'flex';
  newSnippetBtn.style.alignItems = 'center';
  newSnippetBtn.style.gap = '6px';
  const newSnippetIcon = document.createElement('i');
  newSnippetIcon.className = 'material-icons';
  newSnippetIcon.textContent = 'add';
  newSnippetIcon.style.fontSize = '18px';
  const newSnippetText = document.createElement('span');
  newSnippetText.textContent = 'New Snippet';
  newSnippetBtn.appendChild(newSnippetIcon);
  newSnippetBtn.appendChild(newSnippetText);
  newSnippetBtn.addEventListener('click', async () => {
    await createNewSnippet();
  });
  listEl.appendChild(newSnippetBtn);
}

// ============================================
// Update Functions
// ============================================

function updateFooter() {
  const activeSnippet = state.project.activeSnippetId 
    ? state.snippets[state.project.activeSnippetId] 
    : null;

  if (activeSnippet) {
    // Calculate word and char count if not already set (for People/Places/Things snippets)
    const words = activeSnippet.words || (activeSnippet.body ? activeSnippet.body.trim().split(/\s+/).filter(w => w.length > 0).length : 0);
    const chars = activeSnippet.chars || (activeSnippet.body ? activeSnippet.body.length : 0);
    document.getElementById('wordCount').textContent = `Words: ${words}`;
    document.getElementById('charCount').textContent = `Characters: ${chars}`;
  } else {
    document.getElementById('wordCount').textContent = 'Words: 0';
    document.getElementById('charCount').textContent = 'Characters: 0';
  }

  if (activeSnippet && activeSnippet.updatedAt) {
    const date = new Date(activeSnippet.updatedAt);
    const formatted = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    document.getElementById('lastModified').textContent = `Last Modified: ${formatted}`;
  } else {
    document.getElementById('lastModified').textContent = 'Last Modified: —';
  }
}

function updateGoalMeter() {
  // Use shared calculation function to ensure consistency
  const totalWords = window.calculateStoryWordCount(state.snippets, state.groups);
  const goal = state.project.wordGoal;
  
  // Use shared update function to ensure consistency
  const textEl = document.getElementById('goalText');
  const barEl = document.getElementById('goalProgressBar');
  window.updateProgressMeter(textEl, barEl, totalWords, goal);
}

function updateSaveStatus() {
  const statusEl = document.getElementById('saveStatus');
  const editing = state.project.editing;

  statusEl.className = 'save-status';
  
  if (editing.savingState === 'saving') {
    statusEl.textContent = 'Saving…';
    statusEl.classList.add('saving');
  } else if (editing.savingState === 'saved' && editing.lastSavedAt) {
    const date = new Date(editing.lastSavedAt);
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    statusEl.textContent = `Saved at ${time}`;
    statusEl.classList.add('saved');
  } else {
    statusEl.textContent = '';
  }
  
  // Update logout button appearance based on unsaved changes
  updateLogoutButtonWarning();
}

function updateLogoutButtonWarning() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (!logoutBtn) return;
  
  if (hasUnsavedChanges()) {
    logoutBtn.classList.add('has-unsaved-changes');
    logoutBtn.title = 'Sign out (You have unsaved changes)';
  } else {
    logoutBtn.classList.remove('has-unsaved-changes');
    logoutBtn.title = 'Sign out';
  }
}

function updateWordCount() {
  const editorEl = document.getElementById('editorContent');
  const text = getEditorTextContent(editorEl);
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const chars = text.length;

  if (state.project.activeSnippetId) {
    const snippet = state.snippets[state.project.activeSnippetId];
    if (snippet) {
      snippet.body = text;
      snippet.words = words;
      snippet.chars = chars;
      snippet.updatedAt = new Date().toISOString();
      
      updateFooter();
      updateGoalMeter();
      
      // Update snippet in list if visible (check both chapter and People/Places/Things snippets)
      const snippetEl = document.querySelector(`[data-snippet-id="${snippet.id}"]`);
      if (snippetEl) {
        const wordCountEl = snippetEl.querySelector('.snippet-word-count');
        if (wordCountEl) {
          wordCountEl.textContent = `${words} words`;
        }
        // Also update excerpt for People/Places/Things snippets
        const excerptEl = snippetEl.querySelector('.note-excerpt');
        if (excerptEl) {
          excerptEl.textContent = `${escapeHtml(snippet.body.substring(0, 60))}${snippet.body.length > 60 ? '...' : ''}`;
        }
      }
    }
  }
}

// Save current editor content to in-memory state (synchronous)
// This ensures no data loss when switching between snippets
function saveCurrentEditorContent() {
  const editorEl = document.getElementById('editorContent');
  const text = getEditorTextContent(editorEl);
  
  if (state.project.activeSnippetId) {
    const snippet = state.snippets[state.project.activeSnippetId];
    if (snippet) {
      snippet.body = text;
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      const chars = text.length;
      snippet.words = words;
      snippet.chars = chars;
      snippet.updatedAt = new Date().toISOString();
    }
  }
}

// ============================================
// Conflict Detection
// ============================================

// Check if a snippet has been modified in Drive since we last loaded it
async function checkSnippetConflict(snippetId) {
  const snippet = state.snippets[snippetId];
  if (!snippet || !snippet.driveFileId) {
    // No conflict possible if snippet doesn't have a Drive file yet
    return null;
  }
  
  try {
    // Get current file metadata from Drive
    // We need to list the parent folder to get metadata
    let parentFolderId = null;
    if (snippet.groupId && state.groups[snippet.groupId]) {
      parentFolderId = state.groups[snippet.groupId].driveFolderId;
    } else if (snippet.kind === 'person') {
      parentFolderId = state.drive.folderIds.people;
    } else if (snippet.kind === 'place') {
      parentFolderId = state.drive.folderIds.places;
    } else if (snippet.kind === 'thing') {
      parentFolderId = state.drive.folderIds.things;
    }
    
    if (!parentFolderId) {
      return null; // Can't check without parent folder
    }
    
    try {
      const files = await window.driveAPI.list(parentFolderId);
      const driveFile = files.files?.find(f => f.id === snippet.driveFileId);
      
      if (!driveFile || !driveFile.modifiedTime) {
        // File not found or no modifiedTime, no conflict to check
        // This could happen if the folder was deleted/renamed, but we'll handle gracefully
        return null;
      }
      
      const driveModifiedTime = driveFile.modifiedTime;
      const lastKnownTime = snippet.lastKnownDriveModifiedTime;
      
      // If we don't have a last known time, load it now (first time checking this snippet)
      if (!lastKnownTime) {
        // Load the file to get its current modifiedTime
        const fileData = await window.driveAPI.read(snippet.driveFileId);
        if (fileData.modifiedTime) {
          snippet.lastKnownDriveModifiedTime = fileData.modifiedTime;
        }
        return null; // First check, no conflict yet
      }
      
      // Compare timestamps
      if (driveModifiedTime && lastKnownTime) {
        const driveTime = new Date(driveModifiedTime).getTime();
        const lastKnownTimeMs = new Date(lastKnownTime).getTime();
        
        // If Drive version is newer, check if content actually differs
        if (driveTime > lastKnownTimeMs) {
          // Get the Drive content to compare
          const driveData = await window.driveAPI.read(snippet.driveFileId);
          const driveContent = (driveData.content || '').trim();
          const localContent = (snippet.body || '').trim();
          
          // Only report conflict if content actually differs
          if (driveContent !== localContent) {
            return {
              snippet: snippet,
              driveContent: driveContent,
              driveModifiedTime: driveModifiedTime,
              localContent: localContent,
              localModifiedTime: snippet.updatedAt || lastKnownTime
            };
          } else {
            // Content is the same, just update the timestamp
            snippet.lastKnownDriveModifiedTime = driveModifiedTime;
          }
        }
      }
      
      return null; // No conflict
    } catch (error) {
      // If listing the parent folder fails (e.g., folder was deleted/renamed),
      // try to find the file directly by ID as a fallback
      console.warn('Could not list parent folder, trying direct file lookup:', error);
      try {
        const fileData = await window.driveAPI.read(snippet.driveFileId);
        if (fileData.modifiedTime) {
          const lastKnownTime = snippet.lastKnownDriveModifiedTime;
          if (lastKnownTime) {
            const driveTime = new Date(fileData.modifiedTime).getTime();
            const lastKnownTimeMs = new Date(lastKnownTime).getTime();
            
            if (driveTime > lastKnownTimeMs) {
              const driveContent = (fileData.content || '').trim();
              const localContent = (snippet.body || '').trim();
              
              if (driveContent !== localContent) {
                return {
                  snippet: snippet,
                  driveContent: driveContent,
                  driveModifiedTime: fileData.modifiedTime,
                  localContent: localContent,
                  localModifiedTime: snippet.updatedAt || lastKnownTime
                };
              } else {
                snippet.lastKnownDriveModifiedTime = fileData.modifiedTime;
              }
            }
          } else {
            snippet.lastKnownDriveModifiedTime = fileData.modifiedTime;
          }
        }
      } catch (fallbackError) {
        console.error('Error in fallback conflict check:', fallbackError);
        // File might have been deleted, no conflict to check
      }
      return null;
    }
  } catch (error) {
    console.error('Error checking snippet conflict:', error);
    // Don't block user if conflict check fails
    return null;
  }
}

// Show conflict resolution modal
let conflictResolutionPromise = null;
let conflictResolutionAction = null;

function showConflictResolutionModal(conflict) {
  return new Promise((resolve) => {
    conflictResolutionPromise = resolve;
    conflictResolutionAction = null;
    
    const modal = document.getElementById('snippetConflictModal');
    const titleEl = document.getElementById('conflictTitle');
    const localPreviewEl = document.getElementById('conflictLocalPreview');
    const drivePreviewEl = document.getElementById('conflictDrivePreview');
    const localTimeEl = document.getElementById('conflictLocalTime');
    const driveTimeEl = document.getElementById('conflictDriveTime');
    
    titleEl.textContent = `Conflict: ${escapeHtml(conflict.snippet.title)}`;
    
    // Format timestamps
    const localDate = new Date(conflict.localModifiedTime);
    const driveDate = new Date(conflict.driveModifiedTime);
    localTimeEl.textContent = `Last modified in Yarny: ${localDate.toLocaleString()}`;
    driveTimeEl.textContent = `Last modified in Google Docs: ${driveDate.toLocaleString()}`;
    
    // Show previews (first 500 chars)
    const localPreview = conflict.localContent.substring(0, 500);
    const drivePreview = conflict.driveContent.substring(0, 500);
    localPreviewEl.textContent = localPreview + (conflict.localContent.length > 500 ? '...' : '');
    drivePreviewEl.textContent = drivePreview + (conflict.driveContent.length > 500 ? '...' : '');
    
    // Store conflict data on modal for button handlers
    modal.dataset.conflictSnippetId = conflict.snippet.id;
    modal.dataset.conflictDriveContent = conflict.driveContent;
    modal.dataset.conflictDriveTime = conflict.driveModifiedTime;
    
    modal.classList.remove('hidden');
  });
}

function resolveConflictWithLocal() {
  const modal = document.getElementById('snippetConflictModal');
  const snippetId = modal.dataset.conflictSnippetId;
  const snippet = state.snippets[snippetId];
  
  if (snippet && conflictResolutionPromise) {
    // Update lastKnownDriveModifiedTime to current Drive time so we don't show conflict again
    // But keep local content (user chose local)
    snippet.lastKnownDriveModifiedTime = modal.dataset.conflictDriveTime;
    conflictResolutionAction = 'useLocal';
    conflictResolutionPromise({ action: 'useLocal', snippetId: snippetId });
  }
  
  modal.classList.add('hidden');
  conflictResolutionPromise = null;
}

function resolveConflictWithDrive() {
  const modal = document.getElementById('snippetConflictModal');
  const snippetId = modal.dataset.conflictSnippetId;
  const snippet = state.snippets[snippetId];
  
  if (snippet && conflictResolutionPromise) {
    // Load Drive content into snippet
    const driveContent = modal.dataset.conflictDriveContent || '';
    snippet.body = driveContent;
    snippet.words = driveContent.split(/\s+/).filter(w => w.length > 0).length;
    snippet.chars = driveContent.length;
    snippet.lastKnownDriveModifiedTime = modal.dataset.conflictDriveTime;
    snippet.updatedAt = modal.dataset.conflictDriveTime;
    
    // Refresh editor if this is the active snippet
    if (state.project.activeSnippetId === snippetId) {
      renderEditor();
      updateFooter();
    }
    
    conflictResolutionAction = 'useDrive';
    conflictResolutionPromise({ action: 'useDrive', snippetId: snippetId });
  }
  
  modal.classList.add('hidden');
  conflictResolutionPromise = null;
}

function cancelConflictResolution() {
  const modal = document.getElementById('snippetConflictModal');
  modal.classList.add('hidden');
  if (conflictResolutionPromise) {
    conflictResolutionAction = 'cancel';
    conflictResolutionPromise({ action: 'cancel' });
  }
  conflictResolutionPromise = null;
}

// Expose conflict resolution functions globally
window.resolveConflictWithLocal = resolveConflictWithLocal;
window.resolveConflictWithDrive = resolveConflictWithDrive;
window.cancelConflictResolution = cancelConflictResolution;

// Save current editor content to Drive (async, non-blocking)
// Returns a promise that resolves when save completes
async function saveCurrentEditorToDrive() {
  // First, save to in-memory state immediately
  saveCurrentEditorContent();
  
  // Then save to Drive asynchronously
  if (state.project.activeSnippetId && state.snippets[state.project.activeSnippetId]) {
    const snippet = state.snippets[state.project.activeSnippetId];
    try {
      // If Drive file is being created in background, wait a bit for it to complete
      if (snippet._creatingDriveFile && !snippet.driveFileId) {
        let waited = 0;
        while (snippet._creatingDriveFile && waited < 2000) {
          await new Promise(resolve => setTimeout(resolve, 100));
          waited += 100;
        }
      }
      
      // Save to appropriate folder based on snippet type
      if (snippet.kind) {
        // People/Places/Things snippet - save to appropriate folder
        await saveSnippetToDriveByKind(snippet);
      } else {
        // Chapter snippet - save to chapters folder
        await saveSnippetToDrive(snippet);
      }
      
      if (snippet._creatingDriveFile) {
        snippet._creatingDriveFile = false;
      }
    } catch (error) {
      console.error('Error saving snippet to Drive:', error);
      throw error;
    }
  }
}

// Save a specific snippet to Drive (by ID, using in-memory state)
// This is used when switching - saves the previous snippet without reading from editor
async function saveItemToDriveById(snippetId, noteId) {
  // Note: noteId parameter kept for backward compatibility but unused
  if (snippetId && state.snippets[snippetId]) {
    const snippet = state.snippets[snippetId];
    try {
      if (snippet._creatingDriveFile && !snippet.driveFileId) {
        let waited = 0;
        while (snippet._creatingDriveFile && waited < 2000) {
          await new Promise(resolve => setTimeout(resolve, 100));
          waited += 100;
        }
      }
      
      // Save to appropriate folder based on snippet type
      if (snippet.kind) {
        // People/Places/Things snippet
        await saveSnippetToDriveByKind(snippet);
      } else {
        // Chapter snippet
        await saveSnippetToDrive(snippet);
      }
      
      if (snippet._creatingDriveFile) {
        snippet._creatingDriveFile = false;
      }
      
      // Save data.json immediately to update word counts for stories page
      // This ensures word counts are persisted right away
      try {
        console.log('Saving data.json after snippet save...');
        await saveStoryDataToDrive();
        console.log('data.json saved successfully after snippet save');
      } catch (error) {
        console.error('Error saving data.json after snippet save:', error);
        // Schedule a retry after a short delay
        clearTimeout(dataJsonSaveTimeout);
        dataJsonSaveTimeout = setTimeout(async () => {
          try {
            await saveStoryDataToDrive();
            console.log('data.json saved successfully on retry after snippet save');
          } catch (retryError) {
            console.error('Error saving data.json on retry after snippet save:', retryError);
          }
        }, 2000);
      }
    } catch (error) {
      console.error('Error saving snippet to Drive:', error);
      throw error;
    }
  }
}

// ============================================
// Fade-to-Focus Behavior
// ============================================

let typingTimeout;
let pointerTimeout;
let dataJsonSaveTimeout;

function handleTypingStart() {
  state.project.editing.isTyping = true;
  
  // Fade sidebars
  document.getElementById('leftRail').classList.add('faded');
  document.getElementById('rightRail').classList.add('faded');

  // Set saving state
  state.project.editing.savingState = 'saving';
  updateSaveStatus();

  // Clear any existing timeout
  clearTimeout(typingTimeout);
  clearTimeout(pointerTimeout);
}

function handleTypingStop() {
  state.project.editing.isTyping = false;
  
  // Clear existing timeout
  clearTimeout(typingTimeout);
  
  // Set saving state
  state.project.editing.savingState = 'saving';
  updateSaveStatus();

  // After debounce, save to Drive and mark as saved
  typingTimeout = setTimeout(async () => {
    state.project.editing.savingState = 'saving';
    updateSaveStatus();
    
    // Use the centralized save function
    try {
      // Ensure word count is updated in memory before saving
      updateWordCount();
      
      await saveCurrentEditorToDrive();
      
      state.project.editing.savingState = 'saved';
      state.project.editing.lastSavedAt = new Date().toISOString();
      updateSaveStatus();
      
      // Save data.json immediately to update word counts and driveFileId for stories page
      // This ensures word counts and file IDs are persisted right away
      // Don't debounce - save immediately after snippet content is saved
      try {
        // Double-check word count is updated before saving
        if (state.project.activeSnippetId && state.snippets[state.project.activeSnippetId]) {
          const snippet = state.snippets[state.project.activeSnippetId];
          const editorEl = document.getElementById('editorContent');
          if (editorEl) {
            const text = getEditorTextContent(editorEl);
            const words = text.trim() ? text.trim().split(/\s+/).length : 0;
            snippet.words = words;
            snippet.chars = text.length;
            console.log(`Updated word count for snippet ${snippet.id}: ${words} words`);
          }
          
          // Ensure driveFileId is set (it should be set by saveCurrentEditorToDrive, but double-check)
          if (!snippet.driveFileId) {
            console.warn(`Snippet ${snippet.id} (${snippet.title}) has no driveFileId after save - this should be set by saveSnippetToDrive`);
          }
        }
        
        console.log('Saving data.json with updated word counts and driveFileIds...');
        await saveStoryDataToDrive();
        console.log('data.json saved successfully with updated word counts and driveFileIds');
      } catch (error) {
        console.error('Error saving data.json after content update:', error);
        // Schedule a retry after a short delay
        clearTimeout(dataJsonSaveTimeout);
        dataJsonSaveTimeout = setTimeout(async () => {
          try {
            await saveStoryDataToDrive();
            console.log('data.json saved successfully on retry');
          } catch (retryError) {
            console.error('Error saving data.json on retry:', retryError);
          }
        }, 2000);
      }
    } catch (error) {
      // Error already logged in saveCurrentEditorToDrive
      // Still mark as saved since in-memory state is updated
      state.project.editing.savingState = 'saved';
      state.project.editing.lastSavedAt = new Date().toISOString();
      updateSaveStatus();
    }
    
    // Restore sidebars after 400ms idle
    setTimeout(() => {
      if (!state.project.editing.isTyping) {
        document.getElementById('leftRail').classList.remove('faded');
        document.getElementById('rightRail').classList.remove('faded');
      }
    }, 400);
  }, 500);
}

function handlePointerMove() {
  // Restore sidebars immediately
  document.getElementById('leftRail').classList.remove('faded');
  document.getElementById('rightRail').classList.remove('faded');
  
  // Clear timeouts
  clearTimeout(typingTimeout);
  clearTimeout(pointerTimeout);
  clearTimeout(dataJsonSaveTimeout);
}

// ============================================
// Search Functionality
// ============================================

function handleSearch() {
  const searchInput = document.getElementById('searchInput');
  state.project.filters.search = searchInput.value;
  renderStoryList();
  updateGoalMeter();
}

function highlightSearchMatches() {
  if (!state.project.filters.search) return;
  
  const searchLower = state.project.filters.search.toLowerCase();
  const titles = document.querySelectorAll('.snippet-title, .group-title');
  
  titles.forEach(el => {
    const text = el.textContent;
    if (text.toLowerCase().includes(searchLower)) {
      // Could add highlight styling here if needed
    }
  });
}


// ============================================
// Drag & Drop
// ============================================

let draggedElement = null;
let draggedType = null; // 'group' or 'snippet'
let draggedId = null;
let draggedGroupId = null;

function handleGroupDragStart(e, groupId) {
  draggedElement = e.target.closest('.group-header');
  draggedType = 'group';
  draggedId = groupId;
  draggedElement.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function handleSnippetDragStart(e, snippetId, groupId) {
  draggedElement = e.target.closest('.snippet-item');
  draggedType = 'snippet';
  draggedId = snippetId;
  draggedGroupId = groupId;
  draggedElement.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function handleGroupDrop(e, targetGroupId) {
  e.preventDefault();
  
  if (draggedType === 'group' && draggedId !== targetGroupId) {
    // Reorder groups
    const draggedGroup = state.groups[draggedId];
    const targetGroup = state.groups[targetGroupId];
    
    if (draggedGroup && targetGroup) {
      const draggedIndex = state.project.groupIds.indexOf(draggedId);
      const targetIndex = state.project.groupIds.indexOf(targetGroupId);
      
      state.project.groupIds.splice(draggedIndex, 1);
      state.project.groupIds.splice(targetIndex, 0, draggedId);
      
      // Update positions
      state.project.groupIds.forEach((id, index) => {
        if (state.groups[id]) {
          state.groups[id].position = index;
        }
      });
      
      renderStoryList();
    }
  }
}

function handleSnippetDrop(e, targetSnippetId, targetGroupId) {
  e.preventDefault();
  
  if (draggedType === 'snippet' && draggedId !== targetSnippetId) {
    const draggedSnippet = state.snippets[draggedId];
    const targetSnippet = state.snippets[targetSnippetId];
    
    if (draggedSnippet && targetSnippet) {
      const sourceGroup = state.groups[draggedGroupId];
      const targetGroup = state.groups[targetGroupId];
      
      if (sourceGroup && targetGroup) {
        // Remove from source
        const sourceIndex = sourceGroup.snippetIds.indexOf(draggedId);
        sourceGroup.snippetIds.splice(sourceIndex, 1);
        
        // Add to target
        const targetIndex = targetGroup.snippetIds.indexOf(targetSnippetId);
        targetGroup.snippetIds.splice(targetIndex, 0, draggedId);
        
        // Update snippet's group
        draggedSnippet.groupId = targetGroupId;
        
        renderStoryList();
      }
    }
  }
}

function handleDragEnd() {
  if (draggedElement) {
    draggedElement.classList.remove('dragging');
  }
  draggedElement = null;
  draggedType = null;
  draggedId = null;
  draggedGroupId = null;
}

// ============================================
// Keyboard Shortcuts
// ============================================

function handleKeyboardShortcuts(e) {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

  // Cmd/Ctrl+N = new snippet
  if (cmdOrCtrl && e.key === 'n' && !e.shiftKey) {
    e.preventDefault();
    createNewSnippet();
  }

  // Cmd/Ctrl+Shift+N = new group
  if (cmdOrCtrl && e.shiftKey && e.key === 'N') {
    e.preventDefault();
    createNewGroup();
  }

  // Cmd/Ctrl+F = focus Search
  if (cmdOrCtrl && e.key === 'f') {
    e.preventDefault();
    document.getElementById('searchInput').focus();
  }

  // Esc = toggle focus mode
  if (e.key === 'Escape') {
    const leftRail = document.getElementById('leftRail');
    const rightRail = document.getElementById('rightRail');
    
    if (leftRail.classList.contains('faded')) {
      leftRail.classList.remove('faded');
      rightRail.classList.remove('faded');
    } else {
      leftRail.classList.add('faded');
      rightRail.classList.add('faded');
    }
  }
}

async function createNewSnippet() {
  const activeGroupId = state.project.groupIds[0] || null;
  if (!activeGroupId) {
    // Create a default group first
    const groupId = await createNewGroup();
    if (!groupId) return;
    activeGroupId = groupId;
  }

  await addSnippetToGroup(activeGroupId);
}

// Helper function to create a folder in Drive
async function createDriveFolder(folderName, parentFolderId) {
  try {
    const API_BASE = window.API_BASE || '/.netlify/functions';
    const response = await fetch(`${API_BASE}/drive-create-folder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        folderName: folderName,
        parentFolderId: parentFolderId
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to create folder' }));
      throw new Error(errorData.error || 'Failed to create folder');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating folder:', error);
    throw error;
  }
}

async function createNewGroup() {
  const groupId = 'group_' + Date.now();
  // Use the 12 accent colors, cycling through them
  const defaultColor = ACCENT_COLORS[state.project.groupIds.length % ACCENT_COLORS.length].value;
  
  // Generate chapter number based on existing chapters
  const chapterNumber = state.project.groupIds.length + 1;
  const title = `Chapter ${chapterNumber}`;
  
  // Create a folder for this chapter inside the Chapters folder
  let chapterFolderId = null;
  if (state.drive.folderIds.chapters) {
    try {
      const folderResult = await createDriveFolder(title, state.drive.folderIds.chapters);
      chapterFolderId = folderResult.id;
    } catch (error) {
      console.error('Error creating chapter folder:', error);
      // Continue without folder - snippets will still work, just won't be organized
    }
  }
  
  const newGroup = {
    id: groupId,
    projectId: 'default',
    title: title,
    color: defaultColor,
    position: state.project.groupIds.length,
    snippetIds: [],
    driveFolderId: chapterFolderId // Store the chapter's folder ID
  };

  state.groups[groupId] = newGroup;
  state.project.groupIds.push(groupId);

  // Save to Drive
  try {
    await saveStoryDataToDrive();
  } catch (error) {
    console.error('Error saving new chapter to Drive:', error);
  }

  renderStoryList();
  return groupId;
}

// Add snippet to a specific group/chapter
async function addSnippetToGroup(groupId) {
  const snippetId = 'snippet_' + Date.now();
  
  // Count existing snippets in this chapter to generate a unique numbered title
  const group = state.groups[groupId];
  const existingSnippetCount = group ? group.snippetIds.length : 0;
  const snippetNumber = existingSnippetCount + 1;
  const snippetTitle = `Snippet ${snippetNumber}`;
  
  const newSnippet = {
    id: snippetId,
    projectId: 'default',
    groupId: groupId,
    title: snippetTitle,
    body: '',
    words: 0,
    chars: 0,
    updatedAt: new Date().toISOString(),
    version: 1,
    driveFileId: null,
    _creatingDriveFile: false // Flag to track background Drive file creation
  };

  state.snippets[snippetId] = newSnippet;
  state.groups[groupId].snippetIds.push(snippetId);
  state.project.activeSnippetId = snippetId;

  // Render UI immediately so user can start typing
  renderStoryList();
  renderEditor();
  updateFooter();
  
  // Focus editor and allow title editing
  document.getElementById('editorContent').focus();

  // Create Google Doc in Drive in the background (don't block UI)
  // If user starts typing before this completes, autosave will handle it
  (async () => {
    try {
      // Only create if chapters folder is available and file isn't already being created
      if (state.drive.folderIds.chapters && !newSnippet.driveFileId) {
        newSnippet._creatingDriveFile = true;
        await saveSnippetToDrive(newSnippet);
        newSnippet._creatingDriveFile = false;
        // Only save story data if we successfully created the file
        await saveStoryDataToDrive();
      }
    } catch (error) {
      console.error('Error creating snippet in Drive:', error);
      newSnippet._creatingDriveFile = false;
      // Don't show error to user - Drive file will be created on first autosave
    }
  })();
}

// Save story data to Drive (data.json and project.json)
async function saveStoryDataToDrive() {
  if (!state.drive.storyFolderId) {
    console.warn('Story folder ID not set, cannot save to Drive');
    return;
  }
  
  try {
    const files = await window.driveAPI.list(state.drive.storyFolderId);
    
    // Calculate total words using shared function (same logic as updateGoalMeter)
    // This ensures data.json word counts match what's shown in the progress bar
    const totalWords = window.calculateStoryWordCount(state.snippets, state.groups);
    const chapterSnippets = Object.values(state.snippets).filter(snippet => {
      const group = snippet.groupId ? state.groups[snippet.groupId] : null;
      return !!group;
    });
    
    // Count how many snippets have driveFileId set
    const snippetsWithDriveId = Object.values(state.snippets).filter(s => s.driveFileId).length;
    console.log(`Saving data.json: ${chapterSnippets.length} chapter snippets, ${totalWords} total words, ${snippetsWithDriveId}/${Object.keys(state.snippets).length} snippets have driveFileId`);
    
    // Ensure all snippets have their driveFileId saved (create a deep copy to avoid modifying state during save)
    // CRITICAL: Save ALL snippets from state.snippets - this should match mergedSnippets exactly
    const snippetsToSave = {};
    const snippetIds = Object.keys(state.snippets);
    console.log(`saveStoryDataToDrive: state.snippets has ${snippetIds.length} snippets:`, snippetIds);
    snippetIds.forEach(snippetId => {
      const snippet = state.snippets[snippetId];
      if (!snippet) {
        console.warn(`Snippet ${snippetId} is null/undefined in state.snippets!`);
        return;
      }
      snippetsToSave[snippetId] = {
        ...snippet,
        // Ensure driveFileId is included
        driveFileId: snippet.driveFileId || null
      };
    });
    console.log(`saveStoryDataToDrive: snippetsToSave has ${Object.keys(snippetsToSave).length} snippets`);
    
    // Debug: Log what we're about to save
    const chapterSnippetsToSave = Object.values(snippetsToSave).filter(s => {
      const group = s.groupId ? state.groups[s.groupId] : null;
      return !!group;
    });
    console.log(`About to save data.json with ${Object.keys(snippetsToSave).length} total snippets:`, {
      totalSnippets: Object.keys(snippetsToSave).length,
      chapterSnippets: chapterSnippetsToSave.length,
      chapterSnippetDetails: chapterSnippetsToSave.map(s => ({
        id: s.id,
        title: s.title,
        words: s.words,
        groupId: s.groupId,
        hasGroup: !!state.groups[s.groupId]
      })),
      allSnippetIds: Object.keys(snippetsToSave)
    });
    
    // Save data.json - all snippets unified (chapter snippets have groupId, People/Places/Things have kind)
    const storyData = {
      snippets: snippetsToSave,
      groups: state.groups,
      // Legacy notes structure for backward compatibility (empty - all moved to snippets)
      notes: {
        people: {},
        places: {},
        things: {}
      },
    };
    
    // CRITICAL: Use the same file ID we loaded from, not just any data.json file found
    // This ensures we're updating the correct file, not creating a duplicate
    const dataFile = files.files.find(f => f.name === 'data.json');
    const fileIdToUse = state.drive.dataJsonFileId || dataFile?.id || null;
    
    if (!fileIdToUse && dataFile) {
      // If we don't have a stored file ID but found a data.json, use it and store it
      state.drive.dataJsonFileId = dataFile.id;
      console.log(`No stored dataJsonFileId, using found file: ${dataFile.id}`);
    } else if (fileIdToUse && fileIdToUse !== dataFile?.id) {
      console.warn(`WARNING: Stored dataJsonFileId (${fileIdToUse}) doesn't match found file (${dataFile?.id}). Using stored ID.`);
    }
    
    const jsonString = JSON.stringify(storyData, null, 2);
    
    // CRITICAL: Verify what's actually in the JSON we're about to save
    const parsedForVerification = JSON.parse(jsonString);
    const chapterSnippetsInJson = Object.values(parsedForVerification.snippets || {}).filter(s => {
      const group = s.groupId ? parsedForVerification.groups?.[s.groupId] : null;
      return !!group;
    });
    console.log(`About to write data.json with ${Object.keys(parsedForVerification.snippets || {}).length} total snippets, ${chapterSnippetsInJson.length} chapter snippets:`, 
      chapterSnippetsInJson.map(s => ({ id: s.id, title: s.title, words: s.words }))
    );
    
    console.log(`Saving data.json (${jsonString.length} bytes) with ${Object.keys(snippetsToSave).length} snippets, fileId: ${fileIdToUse || 'NEW'} (folder: ${state.drive.storyFolderId})`);
    
    const writeResult = await window.driveAPI.write(
      'data.json',
      jsonString,
      fileIdToUse,
      state.drive.storyFolderId,
      'text/plain'
    );
    
    console.log(`data.json write completed. File ID: ${writeResult?.id || 'unknown'}, result:`, writeResult);
    
    // Save project.json
    const projectData = {
      name: state.project.title || 'New Project',
      createdAt: state.project.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      activeSnippetId: state.project.activeSnippetId,
      snippetIds: Object.keys(state.snippets),
      groupIds: state.project.groupIds,
      wordGoal: state.project.wordGoal || 3000,
      genre: state.project.genre || '',
      // Store folder IDs so they persist even if folders are renamed
      driveFolderIds: state.drive.folderIds || {}
    };
    
    const projectFile = files.files.find(f => f.name === 'project.json');
    await window.driveAPI.write(
      'project.json',
      JSON.stringify(projectData, null, 2),
      projectFile ? projectFile.id : null,
      state.drive.storyFolderId,
      'text/plain'
    );
  } catch (error) {
    console.error('Error saving story data to Drive:', error);
    throw error;
  }
}

// Export for global access
window.addSnippetToGroup = addSnippetToGroup;

// ============================================
// Snippets Management (People/Places/Things)
// ============================================

// Create a new snippet (People/Places/Things) based on the active tab
async function createNewSnippet() {
  const activeTab = state.project.activeRightTab;
  
  // Map tab names to snippet kinds
  const kindMap = {
    'people': 'person',
    'places': 'place',
    'things': 'thing'
  };
  
  const snippetKind = kindMap[activeTab] || 'person';
  
  // Count existing snippets of this kind to generate a unique numbered title
  const existingSnippets = state.project.snippetIds
    .map(id => state.snippets[id])
    .filter(snippet => snippet && snippet.kind === snippetKind);
  
  const snippetNumber = existingSnippets.length + 1;
  
  // Generate title based on kind
  const titleMap = {
    'person': `Person ${snippetNumber}`,
    'place': `Place ${snippetNumber}`,
    'thing': `Thing ${snippetNumber}`
  };
  
  const snippetTitle = titleMap[snippetKind];
  
  const snippetId = 'snippet_' + Date.now();
  const newSnippet = {
    id: snippetId,
    projectId: 'default',
    kind: snippetKind,
    title: snippetTitle,
    body: '',
    words: 0,
    chars: 0,
    position: existingSnippets.length,
    updatedAt: new Date().toISOString(),
    version: 1,
    driveFileId: null,
    _creatingDriveFile: false
  };
  
  state.snippets[snippetId] = newSnippet;
  state.project.snippetIds.push(snippetId);
  state.project.activeSnippetId = snippetId;
  
  // Render UI immediately
  renderSnippetsList();
  renderEditor();
  updateFooter();
  
  // Focus the main editor
  const editorEl = document.getElementById('editorContent');
  if (editorEl) {
    editorEl.focus();
  }
  
  // Save to Drive in the background
  (async () => {
    try {
      // Check if the appropriate folder exists for this snippet kind
      const folderMap = {
        'person': 'people',
        'place': 'places',
        'thing': 'things'
      };
      const folderKey = folderMap[snippetKind];
      
      if (state.drive.folderIds[folderKey]) {
        await saveSnippetToDriveByKind(newSnippet);
        await saveStoryDataToDrive();
      }
    } catch (error) {
      console.error('Error creating snippet in Drive:', error);
      // Don't show error to user - snippet will be saved on first edit
    }
  })();
}

// Export for global access
window.createNewSnippet = createNewSnippet;

// ============================================
// Color Picker
// ============================================

let currentColorPickerGroupId = null;
let currentColorPickerChip = null;

function openColorPicker(groupId, colorChip) {
  const picker = document.getElementById('colorPicker');
  const grid = picker.querySelector('.color-picker-grid');
  
  currentColorPickerGroupId = groupId;
  currentColorPickerChip = colorChip;
  
  // Clear previous colors
  grid.innerHTML = '';
  
  // Render color options
  ACCENT_COLORS.forEach(color => {
    const colorOption = document.createElement('button');
    colorOption.className = 'color-picker-option';
    colorOption.style.backgroundColor = color.value;
    colorOption.title = color.name;
    colorOption.setAttribute('data-color', color.value);
    colorOption.setAttribute('data-color-name', color.name);
    
    // Check if this is the current color
    const group = state.groups[groupId];
    if (group && group.color === color.value) {
      colorOption.classList.add('selected');
    }
    
    colorOption.addEventListener('click', (e) => {
      e.stopPropagation();
      selectColor(groupId, color.value, color.name);
    });
    
    grid.appendChild(colorOption);
  });
  
  // Position the picker near the color chip
  const chipRect = colorChip.getBoundingClientRect();
  picker.style.top = `${chipRect.bottom + 8}px`;
  picker.style.left = `${chipRect.left}px`;
  picker.classList.remove('hidden');
}

function selectColor(groupId, colorValue, colorName) {
  const group = state.groups[groupId];
  if (!group) return;
  
  // Update group color
  group.color = colorValue;
  
  // Update the color chip
  if (currentColorPickerChip) {
    currentColorPickerChip.style.backgroundColor = colorValue;
  }
  
  // Update selected state in picker
  const picker = document.getElementById('colorPicker');
  const options = picker.querySelectorAll('.color-picker-option');
  options.forEach(option => {
    option.classList.remove('selected');
    if (option.getAttribute('data-color') === colorValue) {
      option.classList.add('selected');
    }
  });
  
  // Close picker after a short delay
  setTimeout(() => {
    closeColorPicker();
  }, 150);
  
  // Save to Drive
  saveStoryDataToDrive().catch(error => {
    console.error('Error saving color change to Drive:', error);
  });
}

function closeColorPicker() {
  const picker = document.getElementById('colorPicker');
  picker.classList.add('hidden');
  currentColorPickerGroupId = null;
  currentColorPickerChip = null;
}

// ============================================
// Context Menu
// ============================================

let currentContextType = null; // 'group', 'snippet', or 'note'
let currentContextId = null;
let renameContextType = null; // Persist context for rename modal
let renameContextId = null;
let deleteContextType = null; // Persist context for delete modal
let deleteContextId = null;

function showContextMenu(event, type, id) {
  const menu = document.getElementById('contextMenu');
  currentContextType = type;
  currentContextId = id;
  
  // Position menu at cursor
  menu.style.left = `${event.clientX}px`;
  menu.style.top = `${event.clientY}px`;
  menu.classList.remove('hidden');
  
  // Close menu on outside click
  const closeMenu = (e) => {
    // Don't close if clicking on a context menu item
    if (e.target.closest('.context-menu-item')) {
      return;
    }
    if (!menu.contains(e.target)) {
      menu.classList.add('hidden');
      document.removeEventListener('click', closeMenu);
    }
  };
  
  // Use setTimeout to avoid immediate close
  setTimeout(() => {
    document.addEventListener('click', closeMenu);
  }, 0);
}

function hideContextMenu() {
  const menu = document.getElementById('contextMenu');
  menu.classList.add('hidden');
  currentContextType = null;
  currentContextId = null;
}

// ============================================
// Rename Functionality
// ============================================

function openRenameModal() {
  // Save context before hiding menu (which clears them)
  renameContextType = currentContextType;
  renameContextId = currentContextId;
  
  hideContextMenu();
  
  const modal = document.getElementById('renameModal');
  const input = document.getElementById('renameInput');
  const title = document.getElementById('renameModalTitle');
  
  let currentTitle = '';
  let itemType = '';
  
  if (renameContextType === 'group') {
    const group = state.groups[renameContextId];
    if (!group) return;
    currentTitle = group.title;
    itemType = 'Chapter';
  } else if (renameContextType === 'snippet') {
    const snippet = state.snippets[renameContextId];
    if (!snippet) return;
    currentTitle = snippet.title;
    itemType = 'Snippet';
  } else {
    return;
  }
  
  title.textContent = `Rename ${itemType}`;
  input.value = currentTitle;
  modal.classList.remove('hidden');
  
  // Focus and select text
  setTimeout(() => {
    input.focus();
    input.select();
  }, 100);
}

function closeRenameModal() {
  const modal = document.getElementById('renameModal');
  modal.classList.add('hidden');
  renameContextType = null;
  renameContextId = null;
}

async function saveRename() {
  const input = document.getElementById('renameInput');
  const newName = input.value.trim();
  const saveBtn = document.getElementById('renameSaveBtn');
  
  if (!newName) {
    alert('Please enter a name');
    return;
  }
  
  if (!renameContextType || !renameContextId) {
    closeRenameModal();
    return;
  }
  
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';
  
  try {
    if (renameContextType === 'group') {
      const group = state.groups[renameContextId];
      if (!group) return;
      
      group.title = newName;
      
      // Save to Drive
      await saveStoryDataToDrive();
      
      // Re-render
      renderStoryList();
    } else if (renameContextType === 'snippet') {
      // Handle both chapter snippets and People/Places/Things snippets
      const snippet = state.snippets[renameContextId];
      if (!snippet) return;
      
      snippet.title = newName;
      
      // Update Drive file name based on snippet type
      if (snippet.driveFileId) {
        try {
          const extension = snippet.kind ? '.txt' : '.doc';
          await window.driveAPI.rename(snippet.driveFileId, `${newName}${extension}`);
          // Also save content to ensure it's up to date
          if (snippet.kind) {
            await saveSnippetToDriveByKind(snippet);
          } else if (state.drive.folderIds.chapters) {
            await saveSnippetToDrive(snippet);
          }
        } catch (error) {
          console.error('Error renaming snippet in Drive:', error);
          // Continue even if Drive rename fails
        }
      }
      
      // Save story data
      await saveStoryDataToDrive();
      
      // Re-render based on snippet type
      if (snippet.kind) {
        renderSnippetsList();
      } else {
        renderStoryList();
      }
      
      // Update editor if this is the active snippet
      if (state.project.activeSnippetId === snippet.id) {
        renderEditor();
        updateFooter();
      }
    }
    
    closeRenameModal();
  } catch (error) {
    console.error('Error renaming:', error);
    alert('Failed to rename: ' + error.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';
  }
}

// Export for global access
window.closeRenameModal = closeRenameModal;
window.openRenameModal = openRenameModal;
window.saveRename = saveRename;

// ============================================
// Delete Functionality
// ============================================

function openDeleteModal() {
  // Save context before hiding menu (which clears them)
  deleteContextType = currentContextType;
  deleteContextId = currentContextId;
  
  hideContextMenu();
  
  const modal = document.getElementById('deleteModal');
  const message = document.getElementById('deleteModalMessage');
  
  let itemName = '';
  let itemType = '';
  
  if (deleteContextType === 'group') {
    const group = state.groups[deleteContextId];
    if (!group) return;
    itemName = group.title;
    itemType = 'chapter';
  } else if (deleteContextType === 'snippet') {
    const snippet = state.snippets[deleteContextId];
    if (!snippet) return;
    itemName = snippet.title;
    itemType = 'snippet';
  } else {
    return;
  }
  
  message.textContent = `Are you sure you want to delete "${itemName}"? This will move it to your Google Drive trash.`;
  modal.classList.remove('hidden');
}

function closeDeleteModal() {
  const modal = document.getElementById('deleteModal');
  modal.classList.add('hidden');
  deleteContextType = null;
  deleteContextId = null;
}

async function confirmDelete() {
  const confirmBtn = document.getElementById('deleteConfirmBtn');
  
  if (!deleteContextType || !deleteContextId) {
    closeDeleteModal();
    return;
  }
  
  confirmBtn.disabled = true;
  confirmBtn.textContent = 'Deleting...';
  
  try {
    if (deleteContextType === 'group') {
      const group = state.groups[deleteContextId];
      if (!group) return;
      
      // Delete all snippets in this group first
      const snippetIds = [...group.snippetIds]; // Copy array
      for (const snippetId of snippetIds) {
        await deleteSnippet(snippetId);
      }
      
      // Remove group from state
      delete state.groups[deleteContextId];
      const groupIndex = state.project.groupIds.indexOf(deleteContextId);
      if (groupIndex > -1) {
        state.project.groupIds.splice(groupIndex, 1);
      }
      
      // Save to Drive
      await saveStoryDataToDrive();
      
      // Re-render
      renderStoryList();
      
      // Clear editor if this group's snippet was active
      if (state.project.activeSnippetId) {
        const activeSnippet = state.snippets[state.project.activeSnippetId];
        if (!activeSnippet || activeSnippet.groupId === deleteContextId) {
          state.project.activeSnippetId = null;
          renderEditor();
          updateFooter();
        }
      }
    } else if (deleteContextType === 'snippet') {
      await deleteSnippet(deleteContextId);
      // Note: 'note' type removed - all are snippets now
    }
    
    closeDeleteModal();
  } catch (error) {
    console.error('Error deleting:', error);
    alert('Failed to delete: ' + error.message);
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.textContent = 'Delete';
  }
}

async function deleteSnippet(snippetId) {
  const snippet = state.snippets[snippetId];
  if (!snippet) return;
  
  // Delete from Drive (move to trash)
  if (snippet.driveFileId) {
    try {
      await window.driveAPI.delete(snippet.driveFileId);
    } catch (error) {
      console.error('Error deleting snippet from Drive:', error);
      // Continue with local deletion even if Drive deletion fails
    }
  }
  
  // Remove snippet from its group
  if (snippet.groupId) {
    const group = state.groups[snippet.groupId];
    if (group) {
      const snippetIndex = group.snippetIds.indexOf(snippetId);
      if (snippetIndex > -1) {
        group.snippetIds.splice(snippetIndex, 1);
      }
    }
  }
  
  // Remove from state
  delete state.snippets[snippetId];
  
  // Clear active snippet if it was this one
  if (state.project.activeSnippetId === snippetId) {
    state.project.activeSnippetId = null;
    renderEditor();
    updateFooter();
  }
  
  // Save to Drive
  await saveStoryDataToDrive();
  
  // Re-render
  renderStoryList();
}

async function deleteSnippet(snippetId) {
  const snippet = state.snippets[snippetId];
  if (!snippet) return;
  
  // Delete from Drive (move to trash)
  if (snippet.driveFileId) {
    try {
      await window.driveAPI.delete(snippet.driveFileId);
    } catch (error) {
      console.error('Error deleting snippet from Drive:', error);
      // Continue with local deletion even if Drive deletion fails
    }
  }
  
  // Remove from group if it's a chapter snippet
  if (snippet.groupId) {
    const group = state.groups[snippet.groupId];
    if (group) {
      const snippetIndex = group.snippetIds.indexOf(snippetId);
      if (snippetIndex > -1) {
        group.snippetIds.splice(snippetIndex, 1);
      }
    }
  }
  
  // Remove from state
  delete state.snippets[snippetId];
  
  // Remove from project snippetIds
  const snippetIndex = state.project.snippetIds.indexOf(snippetId);
  if (snippetIndex > -1) {
    state.project.snippetIds.splice(snippetIndex, 1);
  }
  
  // Clear active snippet if it was this one
  if (state.project.activeSnippetId === snippetId) {
    state.project.activeSnippetId = null;
    renderEditor();
    updateFooter();
  }
  
  // Save to Drive
  await saveStoryDataToDrive();
  
  // Re-render
  if (snippet.kind) {
    renderSnippetsList();
  } else {
    renderStoryList();
  }
}

// Export for global access
window.closeDeleteModal = closeDeleteModal;
window.confirmDelete = confirmDelete;

// ============================================
// Notes Tab Switching
// ============================================

window.switchNotesTab = function(tab) {
  state.project.activeRightTab = tab;
  state.project.activeSnippetId = null; // Clear active snippet when switching tabs
  
  // Update tab buttons
  document.querySelectorAll('.notes-tab').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.tab === tab) {
      btn.classList.add('active');
    }
  });

  renderSnippetsList();
  renderEditor(); // Clear editor when switching tabs
  updateFooter();
};

// ============================================
// ============================================
// Story Info Modal
// ============================================

function openStoryInfoModal() {
  const modal = document.getElementById('storyInfoModal');
  const titleInput = document.getElementById('storyTitle');
  const genreInput = document.getElementById('storyGenreInfo');
  const wordGoalInput = document.getElementById('wordGoalInfo');
  
  // Populate form with current values
  titleInput.value = state.project.title || '';
  genreInput.value = state.project.genre || '';
  wordGoalInput.value = state.project.wordGoal || 3000;
  
  // Hide error message
  document.getElementById('storyInfoError').classList.add('hidden');
  
  modal.classList.remove('hidden');
  titleInput.focus();
}

function closeStoryInfoModal() {
  const modal = document.getElementById('storyInfoModal');
  modal.classList.add('hidden');
  document.getElementById('storyInfoError').classList.add('hidden');
}

async function saveStoryInfo() {
  const titleInput = document.getElementById('storyTitle');
  const genreInput = document.getElementById('storyGenreInfo');
  const wordGoalInput = document.getElementById('wordGoalInfo');
  const errorEl = document.getElementById('storyInfoError');
  const saveBtn = document.getElementById('saveStoryInfoBtn');
  
  errorEl.classList.add('hidden');
  
  const title = titleInput.value.trim();
  const genre = genreInput.value.trim();
  const wordGoal = parseInt(wordGoalInput.value);
  
  if (!title) {
    errorEl.textContent = 'Please enter a story title';
    errorEl.classList.remove('hidden');
    return;
  }
  
  if (!wordGoal || wordGoal < 1) {
    errorEl.textContent = 'Please enter a valid word count goal';
    errorEl.classList.remove('hidden');
    return;
  }
  
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';
  
  try {
    // Update state
    state.project.title = title;
    state.project.genre = genre;
    state.project.wordGoal = wordGoal;
    
    // Save to Drive
    await saveStoryDataToDrive();
    
    // Update UI
    updateGoalMeter();
    
    // Update document title if needed
    if (document.title) {
      document.title = `${title} - Yarny`;
    }
    
    closeStoryInfoModal();
  } catch (error) {
    console.error('Error saving story info:', error);
    errorEl.textContent = 'Failed to save: ' + error.message;
    errorEl.classList.remove('hidden');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Changes';
  }
}

// Make functions globally accessible
window.openStoryInfoModal = openStoryInfoModal;
window.closeStoryInfoModal = closeStoryInfoModal;

// ============================================
// Utility Functions
// ============================================

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================
// Authentication Check
// ============================================

// Session expiration: 48 hours in milliseconds
const SESSION_DURATION_MS = 48 * 60 * 60 * 1000;

// Check if token is expired (token format: base64(email:timestamp))
function isTokenExpired(token) {
  if (!token) return true;
  
  try {
    // Decode base64 token (browser-compatible)
    const decoded = atob(token);
    const parts = decoded.split(':');
    
    if (parts.length !== 2) return true;
    
    const timestamp = parseInt(parts[1], 10);
    if (isNaN(timestamp)) return true;
    
    // Check if token is within 48 hours
    const now = Date.now();
    const age = now - timestamp;
    
    return age > SESSION_DURATION_MS;
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true;
  }
}

function checkAuth() {
  // Check localStorage first (more reliable)
  const localStorageAuth = localStorage.getItem('yarny_auth');
  
  // Validate localStorage token if present
  if (localStorageAuth && !isTokenExpired(localStorageAuth)) {
    // Check if story is selected
    checkStorySelected();
    return; // Authenticated
  } else if (localStorageAuth && isTokenExpired(localStorageAuth)) {
    // Clear expired token
    localStorage.removeItem('yarny_auth');
    localStorage.removeItem('yarny_user');
  }
  
  // Also check cookie
  const cookies = document.cookie.split(';');
  const authCookie = cookies.find(c => c.trim().startsWith('auth='));
  
  if (authCookie) {
    const cookieValue = authCookie.split('=')[1].trim();
    if (!isTokenExpired(cookieValue)) {
      // Check if story is selected
      checkStorySelected();
      return; // Authenticated
    } else {
      // Clear expired cookie
      document.cookie = 'auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    }
  }
  
  // No valid auth found, redirect to login
  window.location.href = '/';
}

// Check if a story is selected, redirect to stories page if not
function checkStorySelected() {
  const currentStory = localStorage.getItem('yarny_current_story');
  if (!currentStory) {
    // No story selected, redirect to stories page
    window.location.href = '/stories.html';
  }
}

// Check if there are unsaved changes
function hasUnsavedChanges() {
  // Check if currently saving or has pending changes
  if (state.project.editing.savingState === 'saving') {
    return true;
  }
  
  // Check if user is currently typing (which would trigger a save)
  if (state.project.editing.isTyping) {
    return true;
  }
  
  // If we've never saved or last saved is null, there might be changes
  // This is a basic check - could be enhanced by tracking actual changes
  return false;
}

// Logout function with unsaved changes warning
window.logout = async function() {
  // Check for unsaved changes
  if (hasUnsavedChanges()) {
    const confirmMessage = 'You have unsaved changes. Are you sure you want to sign out? Your changes may be lost if they haven\'t been saved yet.';
    const shouldLogout = confirm(confirmMessage);
    
    if (!shouldLogout) {
      // User canceled logout
      return;
    }
  }
  
  // Disable Google auto-select if available
  if (window.google && window.google.accounts && window.google.accounts.id) {
    window.google.accounts.id.disableAutoSelect();
  }
  
  // Clear all auth data from localStorage
  localStorage.removeItem('yarny_auth');
  localStorage.removeItem('yarny_user');
  localStorage.removeItem('yarny_current_story');
  
  // Call server-side logout to clear HttpOnly cookies
  const API_BASE = '/.netlify/functions';
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

// Get current story info
function getCurrentStory() {
  const storyData = localStorage.getItem('yarny_current_story');
  if (storyData) {
    return JSON.parse(storyData);
  }
  return null;
}

// ============================================
// Drive Integration Functions
// ============================================

// Load story folder structure from Drive
async function loadStoryFolders(storyFolderId, savedFolderIds = null) {
  try {
    state.drive.storyFolderId = storyFolderId;
    state.drive.dataJsonFileId = null; // Reset when loading a new story
    
    // List folders in the story directory
    const files = await window.driveAPI.list(storyFolderId);
    const folders = {};
    
    // First, try to find folders by saved IDs (if available)
    if (savedFolderIds) {
      files.files.forEach(file => {
        if (file.mimeType === 'application/vnd.google-apps.folder' && !file.trashed) {
          // Check if this folder matches any saved ID
          if (savedFolderIds.chapters === file.id) {
            folders.chapters = file.id;
          } else if (savedFolderIds.people === file.id) {
            folders.people = file.id;
          } else if (savedFolderIds.places === file.id) {
            folders.places = file.id;
          } else if (savedFolderIds.things === file.id) {
            folders.things = file.id;
          }
        }
      });
    }
    
    // Fallback to name-based matching for any folders not found by ID
    files.files.forEach(file => {
      if (file.mimeType === 'application/vnd.google-apps.folder' && !file.trashed) {
        const name = file.name.toLowerCase();
        // Only use name matching if we didn't already find this folder by ID
        if (name === 'chapters' && !folders.chapters) {
          folders.chapters = file.id;
        } else if (name === 'people' && !folders.people) {
          folders.people = file.id;
        } else if (name === 'places' && !folders.places) {
          folders.places = file.id;
        } else if (name === 'things' && !folders.things) {
          folders.things = file.id;
        }
      }
    });
    
    state.drive.folderIds = folders;
    return folders;
  } catch (error) {
    console.error('Error loading story folders:', error);
    throw error;
  }
}

// Map chapter subfolders to groups by matching folder IDs first, then by name
async function mapChapterFoldersToGroups(chaptersFolderId) {
  try {
    const chapterFolders = await window.driveAPI.list(chaptersFolderId);
    
    // Find all subfolders (these are the chapter folders)
    const subfolders = (chapterFolders.files || []).filter(
      file => file.mimeType === 'application/vnd.google-apps.folder' && !file.trashed
    );
    
    // First pass: Match by ID (if groups already have driveFolderId from data.json)
    subfolders.forEach(folder => {
      const matchingGroup = Object.values(state.groups).find(
        group => group.driveFolderId === folder.id
      );
      
      if (matchingGroup) {
        // Verify the folder still exists and update if needed
        console.log(`Matched chapter folder by ID: "${folder.name}" (${folder.id}) to group ${matchingGroup.id}`);
        // driveFolderId already set, no need to update
      }
    });
    
    // Second pass: Match by name for any groups that don't have a folder ID yet
    subfolders.forEach(folder => {
      const folderName = folder.name.trim();
      // Find a group with a matching title that doesn't already have a driveFolderId
      const matchingGroup = Object.values(state.groups).find(
        group => !group.driveFolderId && group.title && group.title.trim() === folderName
      );
      
      if (matchingGroup) {
        // Store the folder ID in the group
        matchingGroup.driveFolderId = folder.id;
        console.log(`Mapped chapter folder by name: "${folderName}" (${folder.id}) to group ${matchingGroup.id}`);
      }
    });
  } catch (error) {
    console.error('Error mapping chapter folders to groups:', error);
    // Don't throw - this is a nice-to-have feature, not critical
  }
}

// Save snippet to Drive as Google Doc
async function saveSnippetToDrive(snippet) {
  // Get the chapter folder ID from the snippet's group
  let targetFolderId = null;
  
  if (snippet.groupId && state.groups[snippet.groupId]) {
    const group = state.groups[snippet.groupId];
    // Use the chapter's specific folder if it exists, otherwise fall back to chapters folder
    targetFolderId = group.driveFolderId || state.drive.folderIds.chapters;
  } else {
    // Fallback to chapters folder if no group is found
    targetFolderId = state.drive.folderIds.chapters;
  }
  
  if (!targetFolderId) {
    console.warn('Chapter folder not available, skipping Drive save');
    return;
  }
  
  try {
    const fileName = `${snippet.title}.doc`;
    // If driveFileId exists, update the existing file; otherwise create a new one
    const result = await window.driveAPI.write(
      fileName,
      snippet.body,
      snippet.driveFileId || null,
      targetFolderId,
      'application/vnd.google-apps.document'
    );
    
    // Always store Drive file ID in snippet (update if it exists, set if it doesn't)
    if (result && result.id) {
      snippet.driveFileId = result.id;
      console.log(`Updated driveFileId for snippet ${snippet.id} (${snippet.title}): ${result.id}`);
    } else {
      console.warn(`No file ID returned from Drive write for snippet ${snippet.id} (${snippet.title})`);
    }
    
    // Update lastKnownDriveModifiedTime after successful save
    // Note: We use current time since Drive API doesn't return modifiedTime yet
    // This prevents false conflicts. A future improvement would read file metadata after save.
    snippet.lastKnownDriveModifiedTime = new Date().toISOString();
    
    return result;
  } catch (error) {
    console.error('Error saving snippet to Drive:', error);
    throw error;
  }
}

// Save snippet (People/Places/Things) to Drive by kind
async function saveSnippetToDriveByKind(snippet) {
  let folderId = null;
  
  // Determine which folder based on snippet kind
  if (snippet.kind === 'person') {
    folderId = state.drive.folderIds.people;
  } else if (snippet.kind === 'place') {
    folderId = state.drive.folderIds.places;
  } else if (snippet.kind === 'thing') {
    folderId = state.drive.folderIds.things;
  }
  
  if (!folderId) {
    console.warn('Folder not found for snippet kind:', snippet.kind);
    return;
  }
  
  try {
    const fileName = `${snippet.title}.txt`;
    const content = snippet.body || '';
    const result = await window.driveAPI.write(
      fileName,
      content,
      snippet.driveFileId || null,
      folderId,
      'text/plain'
    );
    
    // Always store Drive file ID in snippet (update if it exists, set if it doesn't)
    if (result && result.id) {
      snippet.driveFileId = result.id;
      console.log(`Updated driveFileId for snippet ${snippet.id} (${snippet.title}): ${result.id}`);
    } else {
      console.warn(`No file ID returned from Drive write for snippet ${snippet.id} (${snippet.title})`);
    }
    
    // Update lastKnownDriveModifiedTime after successful save
    // Note: We use current time since Drive API doesn't return modifiedTime yet
    // This prevents false conflicts. A future improvement would read file metadata after save.
    snippet.lastKnownDriveModifiedTime = new Date().toISOString();
    
    return result;
  } catch (error) {
    console.error('Error saving snippet to Drive:', error);
    throw error;
  }
}

// Load story data from Drive
async function loadStoryFromDrive(storyFolderId) {
  try {
    // Load project.json first to get saved folder IDs
    let savedFolderIds = null;
    try {
      const projectFiles = await window.driveAPI.list(storyFolderId);
      const projectFile = projectFiles.files.find(f => f.name === 'project.json');
      
      if (projectFile) {
        const projectData = await window.driveAPI.read(projectFile.id);
        if (projectData.content) {
          const parsed = JSON.parse(projectData.content);
          // Merge with defaults to ensure required fields exist
          // Map 'name' from project.json to 'title' in state
          Object.assign(state.project, {
            wordGoal: 3000,
            genre: '',
            title: 'Untitled Project',
            ...parsed,
            title: parsed.name || parsed.title || 'Untitled Project'
          });
          
          // Extract saved folder IDs if available
          if (parsed.driveFolderIds) {
            savedFolderIds = parsed.driveFolderIds;
            console.log('Loaded saved folder IDs from project.json:', savedFolderIds);
          }
        }
      }
    } catch (error) {
      console.warn('Could not load project.json:', error);
    }
    
    // Load folder structure using saved IDs if available
    await loadStoryFolders(storyFolderId, savedFolderIds);
    
    // Clear existing state first
    state.snippets = {};
    state.groups = {};
    
    // Load data.json for metadata (but we'll prioritize Google Docs for content)
    // CRITICAL: Store the data.json file ID so we save to the same file
    // Also handle duplicate data.json files by keeping only the most recent one
    let dataJsonFileId = null;
    try {
      const dataFiles = await window.driveAPI.list(storyFolderId);
      const allDataJsonFiles = (dataFiles.files || []).filter(f => f.name === 'data.json' && !f.trashed);
      
      if (allDataJsonFiles.length > 1) {
        // Multiple data.json files found - this is a problem! Keep the most recent one
        console.warn(`WARNING: Found ${allDataJsonFiles.length} data.json files in story folder. Keeping the most recent one and deleting duplicates.`);
        // Sort by modifiedTime, most recent first
        allDataJsonFiles.sort((a, b) => {
          const timeA = new Date(a.modifiedTime || 0).getTime();
          const timeB = new Date(b.modifiedTime || 0).getTime();
          return timeB - timeA; // Most recent first
        });
        
        const primaryDataFile = allDataJsonFiles[0];
        const duplicateFiles = allDataJsonFiles.slice(1);
        
        console.log(`Keeping data.json file ID: ${primaryDataFile.id} (modified: ${primaryDataFile.modifiedTime})`);
        console.log(`Deleting ${duplicateFiles.length} duplicate data.json file(s):`, duplicateFiles.map(f => ({ id: f.id, modified: f.modifiedTime })));
        
        // Delete duplicate files
        for (const duplicate of duplicateFiles) {
          try {
            await window.driveAPI.delete(duplicate.id);
            console.log(`Deleted duplicate data.json: ${duplicate.id}`);
          } catch (error) {
            console.error(`Failed to delete duplicate data.json ${duplicate.id}:`, error);
          }
        }
        
        dataJsonFileId = primaryDataFile.id;
        state.drive.dataJsonFileId = primaryDataFile.id;
        console.log(`Using data.json file ID: ${dataJsonFileId} in folder ${storyFolderId}`);
        const dataContent = await window.driveAPI.read(primaryDataFile.id);
        if (dataContent.content) {
          const parsed = JSON.parse(dataContent.content);
          
          // Load groups and structure from data.json
          if (parsed.groups) {
            state.groups = parsed.groups;
            state.project.groupIds = Object.keys(state.groups).sort((a, b) => {
              return (state.groups[a].position || 0) - (state.groups[b].position || 0);
            });
            console.log('Loaded groups from data.json:', Object.keys(state.groups), 'groupIds:', state.project.groupIds);
          } else {
            console.warn('No groups found in data.json');
          }
          
          // Load snippets metadata (content will be loaded from Google Docs)
          if (parsed.snippets) {
            state.snippets = parsed.snippets;
            console.log('Loaded snippets from data.json:', Object.keys(state.snippets));
          } else {
            console.warn('No snippets found in data.json');
          }
          
          // Merge legacy notes into snippets (for backward compatibility)
          if (parsed.notes) {
            if (parsed.notes.people) {
              Object.assign(state.snippets, parsed.notes.people);
            }
            if (parsed.notes.places) {
              Object.assign(state.snippets, parsed.notes.places);
            }
            if (parsed.notes.things) {
              Object.assign(state.snippets, parsed.notes.things);
            }
          }
          
          // Update snippetIds to include all snippets
          state.project.snippetIds = Object.keys(state.snippets);
        }
      }
    } catch (error) {
      console.warn('Could not load data.json:', error);
    }
    
    // Map chapter subfolders to groups (after groups are loaded)
    // Use ID-based matching first, then fallback to name matching
    if (state.drive.folderIds.chapters && Object.keys(state.groups).length > 0) {
      await mapChapterFoldersToGroups(state.drive.folderIds.chapters);
    }
    
    // Load individual files from chapter subfolders - this is the source of truth
    // Google Docs content overrides data.json content
    const loadedSnippets = {};
    // Collect all file IDs from chapter folders in the current story to validate snippets
    const chapterFileIdsInCurrentStory = new Set();
    
    if (state.drive.folderIds.chapters) {
      try {
        // Load files from each chapter's subfolder
        const groupsWithFolders = state.project.groupIds
          .map(id => state.groups[id])
          .filter(group => group && group.driveFolderId);
        
        if (groupsWithFolders.length > 0) {
          // First pass: collect all file IDs from chapter folders
          for (const group of groupsWithFolders) {
            try {
              const chapterFiles = await window.driveAPI.list(group.driveFolderId);
              if (chapterFiles.files) {
                chapterFiles.files.forEach(file => {
                  if (file.mimeType === 'application/vnd.google-apps.document' && !file.trashed) {
                    chapterFileIdsInCurrentStory.add(file.id);
                  }
                });
              }
            } catch (error) {
              console.warn(`Error collecting file IDs from chapter folder ${group.title}:`, error);
            }
          }
          
          // Second pass: load from chapter subfolders
          for (const group of groupsWithFolders) {
            console.log(`Loading files from chapter folder: ${group.title} (${group.driveFolderId})`);
            const chapterFiles = await window.driveAPI.list(group.driveFolderId);
            console.log('Chapter files found:', chapterFiles.files?.length || 0);
            if (chapterFiles.files && chapterFiles.files.length > 0) {
              console.log('Chapter files:', chapterFiles.files.map(f => ({ name: f.name, id: f.id, mimeType: f.mimeType })));
            } else {
              console.warn(`No chapter files found in ${group.title}!`);
            }
            
            // Build structure from Google Docs - this is the source of truth
            // Only show snippets that exist as Google Docs in the chapter folder
            for (const file of chapterFiles.files || []) {
              if (file.mimeType === 'application/vnd.google-apps.document' && !file.trashed) {
                // Remove .doc or .docx extension from filename
                const fileName = file.name.replace(/\.docx?$/i, '').trim();
                
                // Try to find matching snippet in existing state
                // Priority: match by driveFileId first (most reliable), then by title
                // Only match snippets from data.json if their driveFileId matches this file OR they don't have a driveFileId yet
                let snippet = Object.values(state.snippets).find(s => {
                  if (s.groupId !== group.id) return false;
                  // If snippet has a driveFileId, it must match the current file
                  if (s.driveFileId) {
                    return s.driveFileId === file.id;
                  }
                  // If no driveFileId, match by title (for backward compatibility)
                  const snippetTitle = (s.title || '').trim();
                  return snippetTitle.toLowerCase() === fileName.toLowerCase();
                });
                
                console.log(`Processing file: ${file.name}, fileName: ${fileName}, found snippet:`, snippet ? snippet.id : 'none');
                
                // Load content from Google Doc
                try {
                  const docContent = await window.driveAPI.read(file.id);
                  const snippetBody = (docContent.content || '').trim();
                  console.log(`Loaded content from ${file.name}, length: ${snippetBody.length}, first 50: ${snippetBody.substring(0, 50)}`);
                  
                  if (snippet) {
                    // Update existing snippet with Google Doc content
                    snippet.driveFileId = file.id;
                    snippet.body = snippetBody;
                    snippet.words = snippetBody.split(/\s+/).filter(w => w.length > 0).length;
                    snippet.chars = snippetBody.length;
                    // Store last known Drive modifiedTime for conflict detection
                    snippet.lastKnownDriveModifiedTime = docContent.modifiedTime || file.modifiedTime || new Date().toISOString();
                    loadedSnippets[snippet.id] = snippet;
                    console.log(`Updated snippet ${snippet.id} with content`);
                  } else {
                    // Create new snippet from Google Doc
                    // Use the snippet ID from data.json ONLY if it doesn't have a driveFileId
                    // (if it has a driveFileId, it must have matched above, so we shouldn't reuse it)
                    // Otherwise generate a new ID
                    let snippetId = null;
                    // Try to find snippet ID from data.json that might not have been matched
                    // Only reuse if it has NO driveFileId (backward compatibility)
                    if (group.snippetIds) {
                      // Check if any snippet in this group matches by title AND has no driveFileId
                      for (const sid of group.snippetIds) {
                        const existingSnippet = state.snippets[sid];
                        if (existingSnippet && existingSnippet.title === fileName && !existingSnippet.driveFileId) {
                          snippetId = sid;
                          break;
                        }
                      }
                    }
                    
                    if (!snippetId) {
                      snippetId = 'snippet_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                    }
                    
                    snippet = {
                      id: snippetId,
                      projectId: 'default',
                      groupId: group.id,
                      title: fileName,
                      body: snippetBody,
                      words: snippetBody.split(/\s+/).filter(w => w.length > 0).length,
                      chars: snippetBody.length,
                      updatedAt: file.modifiedTime || new Date().toISOString(),
                      version: 1,
                      driveFileId: file.id,
                      lastKnownDriveModifiedTime: docContent.modifiedTime || file.modifiedTime || new Date().toISOString()
                    };
                    loadedSnippets[snippetId] = snippet;
                  }
                } catch (error) {
                  console.warn('Could not load content from Google Doc:', file.name, error);
                  // Still create snippet entry even if content load fails
                  // Only reuse snippets from data.json if they have no driveFileId OR their driveFileId matches
                  if (!snippet) {
                    const snippetId = Object.keys(state.snippets).find(sid => {
                      const s = state.snippets[sid];
                      if (!s || s.groupId !== group.id) return false;
                      // If snippet has a driveFileId, it MUST match the current file
                      if (s.driveFileId) {
                        return s.driveFileId === file.id;
                      }
                      // If no driveFileId, match by title (backward compatibility)
                      return s.title === fileName;
                    });
                    if (snippetId) {
                      snippet = state.snippets[snippetId];
                      snippet.driveFileId = file.id;
                      // Try to get modifiedTime if available
                      if (file.modifiedTime) {
                        snippet.lastKnownDriveModifiedTime = file.modifiedTime;
                      }
                      loadedSnippets[snippetId] = snippet;
                    }
                  }
                }
              }
            }
          }
        } else {
          // Fallback: if no chapter folders exist, try loading from main Chapters folder (backward compatibility)
          console.log('No chapter folders found, trying to load from main Chapters folder (backward compatibility)');
          const chapterFiles = await window.driveAPI.list(state.drive.folderIds.chapters);
          console.log('Chapter files found:', chapterFiles.files?.length || 0);
          
          // Process files similar to above but without group filtering
          for (const file of chapterFiles.files || []) {
            if (file.mimeType === 'application/vnd.google-apps.document' && !file.trashed) {
              const fileName = file.name.replace(/\.docx?$/i, '').trim();
              // Match snippets from data.json - prioritize driveFileId match, then title match
              // Only match by title if snippet has no driveFileId (to prevent cross-story contamination)
              let snippet = Object.values(state.snippets).find(s => {
                // If snippet has a driveFileId, it MUST match the current file
                if (s.driveFileId) {
                  return s.driveFileId === file.id;
                }
                // If no driveFileId, match by title (backward compatibility)
                const snippetTitle = (s.title || '').trim();
                return snippetTitle.toLowerCase() === fileName.toLowerCase();
              });
              
              if (!snippet) {
                // Try to find by matching to first group
                // Only reuse snippets that have NO driveFileId (backward compatibility)
                if (state.project.groupIds.length > 0) {
                  const firstGroup = state.groups[state.project.groupIds[0]];
                  if (firstGroup && firstGroup.snippetIds) {
                    for (const sid of firstGroup.snippetIds) {
                      const existingSnippet = state.snippets[sid];
                      if (existingSnippet && existingSnippet.title === fileName && !existingSnippet.driveFileId) {
                        snippet = existingSnippet;
                        break;
                      }
                    }
                  }
                }
              }
              
              if (snippet) {
                try {
                  const docContent = await window.driveAPI.read(file.id);
                  const snippetBody = (docContent.content || '').trim();
                  snippet.driveFileId = file.id;
                  snippet.body = snippetBody;
                  snippet.words = snippetBody.split(/\s+/).filter(w => w.length > 0).length;
                  snippet.chars = snippetBody.length;
                  snippet.lastKnownDriveModifiedTime = docContent.modifiedTime || file.modifiedTime || new Date().toISOString();
                  loadedSnippets[snippet.id] = snippet;
                } catch (error) {
                  console.warn('Could not load content from Google Doc:', file.name, error);
                }
              }
            }
          }
        }
      } catch (error) {
        console.warn('Could not load chapter files:', error);
      }
    }
    
    // Load People/Places/Things snippets from their respective Drive folders
    // This ensures we only load files from the current story's folders
    const peoplePlacesThingsSnippets = {};
    const folderKinds = [
      { folderId: state.drive.folderIds.people, kind: 'person' },
      { folderId: state.drive.folderIds.places, kind: 'place' },
      { folderId: state.drive.folderIds.things, kind: 'thing' }
    ];
    
    for (const { folderId, kind } of folderKinds) {
      if (!folderId) continue;
      
      try {
        console.log(`Loading ${kind} snippets from folder: ${folderId}`);
        const folderFiles = await window.driveAPI.list(folderId);
        console.log(`${kind} files found:`, folderFiles.files?.length || 0);
        
        if (folderFiles.files && folderFiles.files.length > 0) {
          for (const file of folderFiles.files) {
            // Only process text files (People/Places/Things are saved as .txt)
            if (file.mimeType === 'text/plain' && !file.trashed) {
              // Remove .txt extension from filename
              const fileName = file.name.replace(/\.txt$/i, '').trim();
              
              // Try to find matching snippet in existing state by title or driveFileId
              let snippet = Object.values(state.snippets).find(s => {
                const snippetTitle = (s.title || '').trim();
                return s.kind === kind && 
                       (snippetTitle.toLowerCase() === fileName.toLowerCase() || s.driveFileId === file.id);
              });
              
              console.log(`Processing ${kind} file: ${file.name}, fileName: ${fileName}, found snippet:`, snippet ? snippet.id : 'none');
              
              // Load content from file
              try {
                const fileContent = await window.driveAPI.read(file.id);
                const snippetBody = (fileContent.content || '').trim();
                console.log(`Loaded ${kind} content from ${file.name}, length: ${snippetBody.length}`);
                
                if (snippet) {
                  // Update existing snippet with file content
                  snippet.driveFileId = file.id;
                  snippet.body = snippetBody;
                  snippet.words = snippetBody.split(/\s+/).filter(w => w.length > 0).length;
                  snippet.chars = snippetBody.length;
                  snippet.lastKnownDriveModifiedTime = fileContent.modifiedTime || file.modifiedTime || new Date().toISOString();
                  peoplePlacesThingsSnippets[snippet.id] = snippet;
                  console.log(`Updated ${kind} snippet ${snippet.id} with content`);
                } else {
                  // Create new snippet from file
                  // Try to find snippet ID from data.json that might not have been matched
                  let snippetId = Object.keys(state.snippets).find(sid => {
                    const s = state.snippets[sid];
                    return s && s.kind === kind && s.title === fileName;
                  });
                  
                  if (!snippetId) {
                    snippetId = 'snippet_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                  }
                  
                  snippet = {
                    id: snippetId,
                    projectId: 'default',
                    kind: kind,
                    title: fileName,
                    body: snippetBody,
                    words: snippetBody.split(/\s+/).filter(w => w.length > 0).length,
                    chars: snippetBody.length,
                    updatedAt: file.modifiedTime || new Date().toISOString(),
                    version: 1,
                    driveFileId: file.id,
                    lastKnownDriveModifiedTime: fileContent.modifiedTime || file.modifiedTime || new Date().toISOString()
                  };
                  peoplePlacesThingsSnippets[snippetId] = snippet;
                  console.log(`Created new ${kind} snippet ${snippetId} from file`);
                }
              } catch (error) {
                console.warn(`Could not load content from ${kind} file:`, file.name, error);
                // Still create snippet entry even if content load fails
                if (!snippet) {
                  const snippetId = Object.keys(state.snippets).find(sid => {
                    const s = state.snippets[sid];
                    return s && s.kind === kind && (s.title === fileName || s.driveFileId === file.id);
                  });
                  if (snippetId) {
                    snippet = state.snippets[snippetId];
                    snippet.driveFileId = file.id;
                    if (file.modifiedTime) {
                      snippet.lastKnownDriveModifiedTime = file.modifiedTime;
                    }
                    peoplePlacesThingsSnippets[snippetId] = snippet;
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        console.warn(`Could not load ${kind} files:`, error);
      }
    }
    
    // Merge loaded snippets from Google Docs and People/Places/Things files with snippets from data.json
    // This ensures snippets show up even if file creation failed
    // Save original snippets from data.json before merging
    const originalSnippets = { ...state.snippets };
    const mergedSnippets = {};
    
    // First, add all snippets loaded from Drive folders (chapters and People/Places/Things)
    // These are the source of truth - only files that exist in the current story's folders
    console.log(`Merging snippets: ${Object.keys(loadedSnippets).length} loaded from Drive, ${Object.keys(peoplePlacesThingsSnippets).length} People/Places/Things, ${Object.keys(originalSnippets).length} from data.json`);
    Object.keys(loadedSnippets).forEach(snippetId => {
      mergedSnippets[snippetId] = loadedSnippets[snippetId];
    });
    Object.keys(peoplePlacesThingsSnippets).forEach(snippetId => {
      mergedSnippets[snippetId] = peoplePlacesThingsSnippets[snippetId];
    });
    
    // Then, add snippets from data.json that don't have a matching Drive file in the current story
    // This ensures we only include snippets that belong to the current story
    // Build a set of all driveFileIds from files loaded from Drive folders
    const driveFileIdsFromCurrentStory = new Set();
    Object.values(loadedSnippets).forEach(s => {
      if (s.driveFileId) driveFileIdsFromCurrentStory.add(s.driveFileId);
    });
    Object.values(peoplePlacesThingsSnippets).forEach(s => {
      if (s.driveFileId) driveFileIdsFromCurrentStory.add(s.driveFileId);
    });
    // Also add chapter file IDs from the collection pass
    chapterFileIdsInCurrentStory.forEach(fileId => {
      driveFileIdsFromCurrentStory.add(fileId);
    });
    console.log(`driveFileIdsFromCurrentStory:`, Array.from(driveFileIdsFromCurrentStory));
    
    Object.keys(originalSnippets).forEach(snippetId => {
      const snippet = originalSnippets[snippetId];
      // Only include if it's not already in mergedSnippets (i.e., wasn't loaded from Drive)
      if (!mergedSnippets[snippetId]) {
        // CRITICAL: If snippet has a driveFileId, ONLY include it if that file is in the current story's Drive folders
        // If driveFileId doesn't match any file in current story, it belongs to another story - REJECT IT
        if (snippet.driveFileId) {
          if (driveFileIdsFromCurrentStory.has(snippet.driveFileId)) {
            // This snippet's file is in the current story, include it
            mergedSnippets[snippetId] = snippet;
          } else {
            // This snippet's driveFileId points to a file NOT in the current story - REJECT IT
            console.log(`REJECTING snippet ${snippetId} "${snippet.title}" - driveFileId ${snippet.driveFileId} not found in current story's folders`);
          }
          // Don't process further for snippets with driveFileId
          return;
        }
        
        // Snippets without driveFileId (for backward compatibility)
        if (!snippet.driveFileId) {
          // Snippet doesn't have a driveFileId yet, include it for backward compatibility
          // Only do this if we're not loading from Drive (backward compatibility mode)
          if (snippet.groupId) {
            // Chapter snippet - only include if no chapters were loaded from Drive
            if (Object.keys(loadedSnippets).length === 0) {
              mergedSnippets[snippetId] = snippet;
            }
          } else if (snippet.kind) {
            // People/Places/Things snippet - check if folder exists and if files were loaded
            const folderKinds = [
              { folderId: state.drive.folderIds.people, kind: 'person' },
              { folderId: state.drive.folderIds.places, kind: 'place' },
              { folderId: state.drive.folderIds.things, kind: 'thing' }
            ];
            const matchingFolder = folderKinds.find(fk => fk.kind === snippet.kind);
            if (matchingFolder && !matchingFolder.folderId) {
              // Folder doesn't exist, include from data.json
              mergedSnippets[snippetId] = snippet;
            } else if (matchingFolder && matchingFolder.folderId) {
              // Folder exists - only include if no files were loaded from that folder (backward compatibility)
              const wasLoaded = Object.values(peoplePlacesThingsSnippets).some(s => 
                s.kind === snippet.kind && s.title === snippet.title
              );
              if (!wasLoaded) {
                mergedSnippets[snippetId] = snippet;
              }
            }
          }
        }
      }
    });
    
    // If no files were loaded from Drive but we have snippets in data.json, keep them
    if (Object.keys(loadedSnippets).length === 0 && Object.keys(peoplePlacesThingsSnippets).length === 0 && Object.keys(originalSnippets).length > 0) {
      console.log('No Drive files found, but data.json has snippets - keeping snippets from data.json');
      // Already handled above in the merge logic
    }
    
    // Ensure groups are created for all snippets
    // This MUST run regardless of whether chapters folder exists
    const validGroupIds = new Set();
    Object.values(mergedSnippets).forEach(snippet => {
      if (snippet.groupId) {
        validGroupIds.add(snippet.groupId);
      }
    });
    
    // Build groups from data.json structure
    const loadedGroups = {};
    console.log('Processing groups - state.groups:', Object.keys(state.groups), 'state.project.groupIds:', state.project.groupIds);
    Object.keys(state.groups).forEach(groupId => {
      const group = state.groups[groupId];
      console.log(`Processing group ${groupId}:`, group);
      // Include group if it has snippets in mergedSnippets OR if it's in project.groupIds
      if (validGroupIds.has(groupId) || state.project.groupIds.includes(groupId)) {
        // Filter snippetIds to only include snippets that exist
        let validSnippetIds = group.snippetIds.filter(sid => mergedSnippets[sid]);
        console.log(`Group ${groupId} validSnippetIds after filtering:`, validSnippetIds);
        
        // If this is the first group and validSnippetIds is empty, ensure snippets from data.json are included
        // BUT ONLY if they don't have a driveFileId OR their driveFileId matches a file in current story
        // This ensures the initial chapter/snippet from data.json is preserved even if Google Doc wasn't created
        if (validSnippetIds.length === 0 && groupId === state.project.groupIds[0] && group.snippetIds.length > 0) {
          console.log('First group has no valid snippets, checking data.json snippets');
          // Add any missing snippets from data.json to mergedSnippets
          // BUT filter out any that have driveFileIds pointing to other stories
          group.snippetIds.forEach(sid => {
            const originalSnippet = originalSnippets[sid];
            if (originalSnippet && !mergedSnippets[sid]) {
              // Only add if it has no driveFileId OR if driveFileId matches current story
              if (!originalSnippet.driveFileId || driveFileIdsFromCurrentStory.has(originalSnippet.driveFileId)) {
                mergedSnippets[sid] = originalSnippet;
                console.log(`Added missing snippet ${sid} from data.json to mergedSnippets`);
              } else {
                console.log(`REJECTING snippet ${sid} "${originalSnippet.title}" - driveFileId points to another story`);
              }
            }
          });
          // Recalculate validSnippetIds after adding missing snippets
          validSnippetIds = group.snippetIds.filter(sid => mergedSnippets[sid]);
          console.log(`Group ${groupId} validSnippetIds after adding from data.json:`, validSnippetIds);
        }
        
        // Include group if it has valid snippets or if it's the first group (Chapter 1)
        if (validSnippetIds.length > 0 || groupId === state.project.groupIds[0]) {
          group.snippetIds = validSnippetIds;
          loadedGroups[groupId] = group;
          validGroupIds.add(groupId);
          console.log(`Added group ${groupId} to loadedGroups with snippetIds:`, validSnippetIds);
        } else {
          console.log(`Skipping group ${groupId} - no valid snippets and not first group`);
        }
      } else {
        console.log(`Skipping group ${groupId} - not in validGroupIds or project.groupIds`);
      }
    });
    
    // Update state.snippets with the final merged snippets
    state.snippets = mergedSnippets;
    
    state.groups = loadedGroups;
    state.project.groupIds = Object.keys(loadedGroups).sort((a, b) => {
      return (loadedGroups[a].position || 0) - (loadedGroups[b].position || 0);
    });
    
    // CRITICAL VERIFICATION: mergedSnippets should have all snippets
    const chapterSnippetsInMerged = Object.values(mergedSnippets).filter(s => {
      const group = s.groupId ? loadedGroups[s.groupId] : null;
      return !!group;
    });
    console.log('Final state after loading:', {
      snippets: Object.keys(state.snippets),
      mergedSnippets: Object.keys(mergedSnippets),
      chapterSnippetsInState: chapterSnippetsInMerged.length,
      chapterSnippetDetails: chapterSnippetsInMerged.map(s => ({
        id: s.id,
        title: s.title,
        words: s.words,
        driveFileId: s.driveFileId
      })),
      groups: Object.keys(state.groups),
      groupIds: state.project.groupIds,
      loadedGroups: Object.keys(loadedGroups),
      mergedSnippetsCount: Object.keys(mergedSnippets).length
    });
    
    // Verify state.snippets === mergedSnippets (should be same object reference now)
    if (state.snippets !== mergedSnippets) {
      console.error('ERROR: state.snippets is not the same as mergedSnippets!');
    }
    
    // CRITICAL: Save data.json with updated word counts after loading from Google Docs
    // This ensures word counts in data.json match the actual content in Google Docs
    // Must happen AFTER state.snippets is updated with merged snippets
    try {
      console.log('Saving data.json with updated word counts after loading...');
      const totalWordsBeforeSave = window.calculateStoryWordCount(state.snippets, state.groups);
      console.log(`Word count before save: ${totalWordsBeforeSave}`);
      console.log(`state.snippets has ${Object.keys(state.snippets).length} snippets before save`);
      
      await saveStoryDataToDrive();
      
      // Verify the save worked by checking what we saved
      const totalWordsAfterSave = window.calculateStoryWordCount(state.snippets, state.groups);
      console.log(`Word count after save: ${totalWordsAfterSave}`);
      console.log('data.json saved successfully with updated word counts after loading');
    } catch (error) {
      console.error('ERROR saving data.json after loading - this is critical!', error);
      // This is actually critical - word counts won't match between editor and stories page
      // Try again after a short delay
      setTimeout(async () => {
        try {
          console.log('Retrying save data.json after loading...');
          await saveStoryDataToDrive();
          console.log('data.json saved successfully on retry');
        } catch (retryError) {
          console.error('Failed to save data.json on retry:', retryError);
        }
      }, 1000);
    }
    
    // Ensure activeSnippetId is valid after loading
    // If activeSnippetId is not set or doesn't exist, set it to the first snippet of the first group
    if (!state.project.activeSnippetId || !state.snippets[state.project.activeSnippetId]) {
      if (state.project.groupIds.length > 0) {
        const firstGroup = state.groups[state.project.groupIds[0]];
        console.log('First group:', firstGroup);
        if (firstGroup && firstGroup.snippetIds && firstGroup.snippetIds.length > 0) {
          const firstSnippetId = firstGroup.snippetIds[0];
          console.log('First snippet ID:', firstSnippetId, 'exists:', !!state.snippets[firstSnippetId]);
          if (state.snippets[firstSnippetId]) {
            state.project.activeSnippetId = firstSnippetId;
            console.log('Set activeSnippetId to first snippet:', firstSnippetId);
          } else {
            console.warn('First snippet not found in state.snippets:', firstSnippetId);
          }
        } else {
          console.warn('First group has no snippetIds:', firstGroup);
        }
      } else {
        console.warn('No groupIds in state.project.groupIds');
      }
    }
    
  } catch (error) {
    console.error('Error loading story from Drive:', error);
    throw error;
  }
}

// ============================================
// Event Listeners
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  // Check authentication first
  checkAuth();
  
  // Handle Drive auth callbacks
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('drive_auth_success') === 'true') {
    // Show success message or update UI
    console.log('Drive authorization successful!');
    // You can add UI feedback here if needed
    // Clean up URL
    window.history.replaceState({}, document.title, window.location.pathname);
  } else if (urlParams.get('drive_auth_error')) {
    const error = urlParams.get('drive_auth_error');
    console.error('Drive authorization failed:', decodeURIComponent(error));
    alert('Drive authorization failed: ' + decodeURIComponent(error));
    // Clean up URL
    window.history.replaceState({}, document.title, window.location.pathname);
  }
  
  // Load story from Drive if available
  const currentStory = getCurrentStory();
  if (currentStory && currentStory.id) {
    try {
      await loadStoryFromDrive(currentStory.id);
      // Update story name in UI
      if (currentStory.name) {
        const storyTitleEl = document.querySelector('.rail-title');
        if (storyTitleEl) {
          storyTitleEl.textContent = currentStory.name;
        }
      }
      // Render UI with loaded data
      renderStoryList();
      renderEditor();
      renderSnippetsList();
      // Ensure noteEditor textarea is hidden (notes now open in main editor)
      document.getElementById('noteEditor').classList.add('hidden');
      updateFooter();
      updateGoalMeter();
      updateSaveStatus(); // Initialize save status and logout button warning
    } catch (error) {
      console.error('Error loading story from Drive, using sample data:', error);
      // Fallback to sample data
      initializeState();
      updateSaveStatus(); // Initialize save status and logout button warning
    }
  } else {
    // No story loaded, use sample data
    initializeState();
    // Ensure noteEditor textarea is hidden (notes now open in main editor)
    document.getElementById('noteEditor').classList.add('hidden');
    updateSaveStatus(); // Initialize save status and logout button warning
  }

  // Editor content editable
  const editorEl = document.getElementById('editorContent');
  
  editorEl.addEventListener('input', () => {
    handleTypingStart();
    updateWordCount();
    handleTypingStop();
  });

  editorEl.addEventListener('keydown', (e) => {
    handleTypingStart();
  });

  // Search input
  const searchInput = document.getElementById('searchInput');
  let searchTimeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(handleSearch, 200);
  });


  // Pointer move to restore sidebars
  document.addEventListener('pointermove', handlePointerMove);

  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyboardShortcuts);

  // Story info button
  document.getElementById('storyInfoBtn').addEventListener('click', openStoryInfoModal);
  
  // Goal meter click
  document.getElementById('goalMeter').addEventListener('click', openStoryInfoModal);
  
  // Story info form
  document.getElementById('storyInfoForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveStoryInfo();
  });
  
  // Close modal on overlay click
  document.querySelector('#storyInfoModal .modal-overlay').addEventListener('click', closeStoryInfoModal);

  // Close color picker on outside click
  document.addEventListener('click', (e) => {
    const colorPicker = document.getElementById('colorPicker');
    const colorChip = e.target.closest('.group-color-chip');
    
    if (!colorPicker.contains(e.target) && !colorChip && !colorPicker.classList.contains('hidden')) {
      closeColorPicker();
    }
  });
  
  // Context menu button handlers
  document.getElementById('contextMenuRename').addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    openRenameModal();
  });
  document.getElementById('contextMenuDelete').addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    openDeleteModal();
  });
  
  // Rename modal keyboard shortcuts
  document.getElementById('renameInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeRenameModal();
    }
  });
  
  // Close rename modal on overlay click
  document.querySelector('#renameModal .modal-overlay').addEventListener('click', closeRenameModal);
  
  // Close delete modal on overlay click
  document.querySelector('#deleteModal .modal-overlay').addEventListener('click', closeDeleteModal);
});

