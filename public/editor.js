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
    tagIds: [],
    noteIds: [],
    activeSnippetId: null,
    activeNoteId: null,
    activeRightTab: 'people',
    filters: {
      search: '',
      tagIds: []
    },
    editing: {
      isTyping: false,
      savingState: 'idle', // 'idle' | 'saving' | 'saved'
      lastSavedAt: null
    }
  },
  groups: {},
  snippets: {},
  notes: {},
  tags: {},
  previewVersion: 1,
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
  state.notes = {};
  state.tags = {};
  state.project.groupIds = [];
  state.project.tagIds = [];
  state.project.noteIds = [];
  state.project.activeSnippetId = null;

  // Render empty UI
  renderStoryList();
  renderEditor();
  renderNotesList();
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
      // Filter by tags
      if (state.project.filters.tagIds.length > 0) {
        const hasMatchingSnippet = group.snippetIds.some(snippetId => {
          const snippet = state.snippets[snippetId];
          if (!snippet) return false;
          return state.project.filters.tagIds.every(tagId => 
            snippet.tagIds.includes(tagId)
          );
        });
        if (!hasMatchingSnippet) return false;
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
    addBtn.textContent = '+';
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
        // Filter by tags
        if (state.project.filters.tagIds.length > 0) {
          return state.project.filters.tagIds.every(tagId => 
            snippet.tagIds.includes(tagId)
          );
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
      
      snippetEl.addEventListener('click', () => {
        state.project.activeSnippetId = snippet.id;
        renderStoryList();
        renderEditor();
        updateFooter();
      });

      // Drag & drop handlers
      snippetEl.addEventListener('dragstart', (e) => handleSnippetDragStart(e, snippet.id, group.id));
      snippetEl.addEventListener('dragover', handleDragOver);
      snippetEl.addEventListener('drop', (e) => handleSnippetDrop(e, snippet.id, group.id));
      snippetEl.addEventListener('dragend', handleDragEnd);

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
  newChapterBtn.textContent = '+ New Chapter';
  newChapterBtn.addEventListener('click', async () => {
    await createNewGroup();
  });
  listEl.appendChild(newChapterBtn);
}

function renderEditor() {
  const editorEl = document.getElementById('editorContent');
  const activeSnippet = state.project.activeSnippetId 
    ? state.snippets[state.project.activeSnippetId] 
    : null;

  if (activeSnippet) {
    editorEl.textContent = activeSnippet.body;
  } else {
    editorEl.textContent = '';
  }

  // Update save status
  updateSaveStatus();
}

function renderNotesList() {
  const listEl = document.getElementById('notesList');
  listEl.innerHTML = '';

  const activeTab = state.project.activeRightTab;
  const notes = state.project.noteIds
    .map(id => state.notes[id])
    .filter(note => note && note.kind === activeTab)
    .sort((a, b) => a.position - b.position);

  if (notes.length === 0) {
    listEl.innerHTML = '<div style="padding: 20px; text-align: center; color: #6B7280; font-size: 13px;">No notes yet</div>';
    return;
  }

  notes.forEach(note => {
    const noteEl = document.createElement('div');
    noteEl.className = `note-item ${note.id === state.project.activeNoteId ? 'active' : ''}`;
    noteEl.dataset.noteId = note.id;
    noteEl.innerHTML = `
      <div class="note-title">${escapeHtml(note.title)}</div>
      <div class="note-excerpt">${escapeHtml(note.body.substring(0, 60))}${note.body.length > 60 ? '...' : ''}</div>
    `;

    noteEl.addEventListener('click', () => {
      state.project.activeNoteId = note.id;
      renderNotesList();
      renderNoteEditor();
    });

    listEl.appendChild(noteEl);
  });
}

function renderNoteEditor() {
  const editorEl = document.getElementById('noteEditor');
  const textEl = document.getElementById('noteEditorText');
  
  if (state.project.activeNoteId) {
    const note = state.notes[state.project.activeNoteId];
    if (note) {
      editorEl.classList.remove('hidden');
      textEl.value = note.body;
      
      // Auto-save on change
      let saveTimeout;
      textEl.addEventListener('input', () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(async () => {
          note.body = textEl.value;
          renderNotesList();
          
          // Save to Drive
          try {
            await saveNoteToDrive(note);
          } catch (error) {
            console.error('Error saving note to Drive:', error);
          }
        }, 500);
      });
    }
  } else {
    editorEl.classList.add('hidden');
  }
}

function renderTagPalette() {
  const listEl = document.getElementById('tagPaletteList');
  listEl.innerHTML = '';

  const allTags = Object.values(state.tags);
  
  if (allTags.length === 0) {
    listEl.innerHTML = '<div style="padding: 20px; text-align: center; color: #6B7280; font-size: 13px;">No tags yet</div>';
    return;
  }

  allTags.forEach(tag => {
    const tagEl = document.createElement('div');
    const isSelected = state.project.filters.tagIds.includes(tag.id);
    tagEl.className = `tag-palette-item ${isSelected ? 'selected' : ''}`;
    tagEl.innerHTML = `
      <span class="tag-palette-item-name">${escapeHtml(tag.name)}</span>
      <span class="tag-palette-item-remove" onclick="removeTag('${tag.id}')">×</span>
    `;

    tagEl.addEventListener('click', (e) => {
      if (e.target.classList.contains('tag-palette-item-remove')) return;
      toggleTagFilter(tag.id);
    });

    listEl.appendChild(tagEl);
  });
}

function renderSelectedTags() {
  const containerEl = document.getElementById('selectedTags');
  containerEl.innerHTML = '';

  state.project.filters.tagIds.forEach(tagId => {
    const tag = state.tags[tagId];
    if (!tag) return;

    const chipEl = document.createElement('div');
    chipEl.className = 'tag-chip';
    chipEl.innerHTML = `
      <span>${escapeHtml(tag.name)}</span>
      <span class="remove-tag" onclick="removeTagFilter('${tag.id}')">×</span>
    `;
    containerEl.appendChild(chipEl);
  });
}

// ============================================
// Update Functions
// ============================================

function updateFooter() {
  const activeSnippet = state.project.activeSnippetId 
    ? state.snippets[state.project.activeSnippetId] 
    : null;

  if (activeSnippet) {
    document.getElementById('wordCount').textContent = `Words: ${activeSnippet.words}`;
    document.getElementById('charCount').textContent = `Characters: ${activeSnippet.chars}`;
  } else {
    document.getElementById('wordCount').textContent = 'Words: 0';
    document.getElementById('charCount').textContent = 'Characters: 0';
  }

  // Update version info (UI only for now)
  const version = state.previewVersion;
  document.getElementById('versionLabel').textContent = `Version: ${version}`;
  
  if (activeSnippet && activeSnippet.updatedAt) {
    const date = new Date(activeSnippet.updatedAt);
    const formatted = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    document.getElementById('lastModified').textContent = `Last Modified: ${formatted}`;
  } else {
    document.getElementById('lastModified').textContent = 'Last Modified: —';
  }
}

function updateGoalMeter() {
  const visibleSnippets = Object.values(state.snippets).filter(snippet => {
    const group = snippet.groupId ? state.groups[snippet.groupId] : null;
    if (!group) return false;
    
    // Check if group is visible
    if (state.project.filters.search || state.project.filters.tagIds.length > 0) {
      // Only count if would be visible after filtering
      return true; // Simplified for now
    }
    return true;
  });

  const totalWords = visibleSnippets.reduce((sum, snippet) => sum + snippet.words, 0);
  const goal = state.project.wordGoal;
  const percentage = goal > 0 ? Math.min((totalWords / goal) * 100, 100) : 0;

  document.getElementById('goalText').textContent = `${totalWords.toLocaleString()} / ${goal.toLocaleString()}`;
  document.getElementById('goalProgressBar').style.width = `${percentage}%`;
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
  const text = editorEl.textContent || '';
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
      
      // Update snippet in list if visible
      const snippetEl = document.querySelector(`[data-snippet-id="${snippet.id}"]`);
      if (snippetEl) {
        const wordCountEl = snippetEl.querySelector('.snippet-word-count');
        if (wordCountEl) {
          wordCountEl.textContent = `${words} words`;
        }
      }
    }
  }
}

// ============================================
// Fade-to-Focus Behavior
// ============================================

let typingTimeout;
let pointerTimeout;

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
    
    // Save current snippet to Drive if active
    if (state.project.activeSnippetId && state.snippets[state.project.activeSnippetId]) {
      try {
        const snippet = state.snippets[state.project.activeSnippetId];
        // Update snippet body from editor
        snippet.body = document.getElementById('editorContent').textContent || document.getElementById('editorContent').innerText || '';
        
        // If Drive file is being created in background, wait a bit for it to complete
        // This prevents duplicate file creation
        if (snippet._creatingDriveFile && !snippet.driveFileId) {
          // Wait up to 2 seconds for background creation to complete
          let waited = 0;
          while (snippet._creatingDriveFile && waited < 2000) {
            await new Promise(resolve => setTimeout(resolve, 100));
            waited += 100;
          }
        }
        
        // Save to Drive (will create file if driveFileId is null, or update if it exists)
        await saveSnippetToDrive(snippet);
        
        // Clear the background creation flag if it was set
        if (snippet._creatingDriveFile) {
          snippet._creatingDriveFile = false;
        }
      } catch (error) {
        console.error('Error saving snippet to Drive:', error);
      }
    }
    
    state.project.editing.savingState = 'saved';
    state.project.editing.lastSavedAt = new Date().toISOString();
    updateSaveStatus();
    
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
// Tag Filtering
// ============================================

function toggleTagFilter(tagId) {
  const index = state.project.filters.tagIds.indexOf(tagId);
  if (index > -1) {
    state.project.filters.tagIds.splice(index, 1);
  } else {
    state.project.filters.tagIds.push(tagId);
  }
  renderTagPalette();
  renderSelectedTags();
  renderStoryList();
  updateGoalMeter();
}

function removeTagFilter(tagId) {
  const index = state.project.filters.tagIds.indexOf(tagId);
  if (index > -1) {
    state.project.filters.tagIds.splice(index, 1);
    renderSelectedTags();
    renderStoryList();
    updateGoalMeter();
  }
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

  // Cmd/Ctrl+K = open Tag palette
  if (cmdOrCtrl && e.key === 'k') {
    e.preventDefault();
    toggleTagPalette();
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

async function createNewGroup() {
  const groupId = 'group_' + Date.now();
  // Use the 12 accent colors, cycling through them
  const defaultColor = ACCENT_COLORS[state.project.groupIds.length % ACCENT_COLORS.length].value;
  
  // Generate chapter number based on existing chapters
  const chapterNumber = state.project.groupIds.length + 1;
  const title = `Chapter ${chapterNumber}`;
  
  const newGroup = {
    id: groupId,
    projectId: 'default',
    title: title,
    color: defaultColor,
    position: state.project.groupIds.length,
    snippetIds: []
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
  const newSnippet = {
    id: snippetId,
    projectId: 'default',
    groupId: groupId,
    title: 'Untitled Snippet',
    body: '',
    words: 0,
    chars: 0,
    tagIds: [],
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
    
    // Save data.json
    const storyData = {
      snippets: state.snippets,
      groups: state.groups,
      notes: {
        people: {},
        places: {},
        things: {}
      },
      tags: state.tags || []
    };
    
    // Organize notes by kind
    Object.values(state.notes).forEach(note => {
      if (note.kind === 'person') {
        storyData.notes.people[note.id] = note;
      } else if (note.kind === 'place') {
        storyData.notes.places[note.id] = note;
      } else if (note.kind === 'thing') {
        storyData.notes.things[note.id] = note;
      }
    });
    
    const dataFile = files.files.find(f => f.name === 'data.json');
    await window.driveAPI.write(
      'data.json',
      JSON.stringify(storyData, null, 2),
      dataFile ? dataFile.id : null,
      state.drive.storyFolderId,
      'text/plain'
    );
    
    // Save project.json
    const projectData = {
      name: state.project.title || 'New Project',
      createdAt: state.project.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      activeSnippetId: state.project.activeSnippetId,
      snippetIds: Object.keys(state.snippets),
      groupIds: state.project.groupIds,
      wordGoal: state.project.wordGoal || 3000,
      genre: state.project.genre || ''
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
// Tag Palette
// ============================================

function toggleTagPalette() {
  const palette = document.getElementById('tagPalette');
  if (palette.classList.contains('hidden')) {
    palette.classList.remove('hidden');
    renderTagPalette();
  } else {
    palette.classList.add('hidden');
  }
}

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

function removeTag(tagId) {
  // Remove tag from all snippets
  Object.values(state.snippets).forEach(snippet => {
    const index = snippet.tagIds.indexOf(tagId);
    if (index > -1) {
      snippet.tagIds.splice(index, 1);
    }
  });

  // Remove from filters
  removeTagFilter(tagId);

  // Remove tag
  delete state.tags[tagId];
  const tagIndex = state.project.tagIds.indexOf(tagId);
  if (tagIndex > -1) {
    state.project.tagIds.splice(tagIndex, 1);
  }

  renderTagPalette();
  renderStoryList();
}

// ============================================
// Notes Tab Switching
// ============================================

window.switchNotesTab = function(tab) {
  state.project.activeRightTab = tab;
  state.project.activeNoteId = null;
  
  // Update tab buttons
  document.querySelectorAll('.notes-tab').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.tab === tab) {
      btn.classList.add('active');
    }
  });

  renderNotesList();
  renderNoteEditor();
};

// ============================================
// Version Slider
// ============================================

function setupVersionSlider() {
  const slider = document.getElementById('versionSlider');
  
  slider.addEventListener('input', (e) => {
    const version = parseInt(e.target.value);
    state.previewVersion = version;
    updateFooter();
    // In future: could show version diff here
  });
}

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
async function loadStoryFolders(storyFolderId) {
  try {
    state.drive.storyFolderId = storyFolderId;
    
    // List folders in the story directory
    const files = await window.driveAPI.list(storyFolderId);
    const folders = {};
    
    files.files.forEach(file => {
      if (file.mimeType === 'application/vnd.google-apps.folder') {
        const name = file.name.toLowerCase();
        if (name === 'chapters') {
          folders.chapters = file.id;
        } else if (name === 'people') {
          folders.people = file.id;
        } else if (name === 'places') {
          folders.places = file.id;
        } else if (name === 'things') {
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

// Save snippet to Drive as Google Doc
async function saveSnippetToDrive(snippet) {
  if (!state.drive.folderIds.chapters) {
    console.warn('Chapters folder not loaded, skipping Drive save');
    return;
  }
  
  try {
    const fileName = `${snippet.title}.doc`;
    // If driveFileId exists, update the existing file; otherwise create a new one
    const result = await window.driveAPI.write(
      fileName,
      snippet.body,
      snippet.driveFileId || null,
      state.drive.folderIds.chapters,
      'application/vnd.google-apps.document'
    );
    
    // Store Drive file ID in snippet if it wasn't set before
    if (!snippet.driveFileId && result && result.id) {
      snippet.driveFileId = result.id;
    }
    
    return result;
  } catch (error) {
    console.error('Error saving snippet to Drive:', error);
    throw error;
  }
}

// Save note to Drive
async function saveNoteToDrive(note) {
  let folderId = null;
  
  // Determine which folder based on note kind
  if (note.kind === 'person') {
    folderId = state.drive.folderIds.people;
  } else if (note.kind === 'place') {
    folderId = state.drive.folderIds.places;
  } else if (note.kind === 'thing') {
    folderId = state.drive.folderIds.things;
  }
  
  if (!folderId) {
    console.warn('Folder not found for note kind:', note.kind);
    return;
  }
  
  try {
    const fileName = `${note.title}.txt`;
    const content = note.body || '';
    const result = await window.driveAPI.write(
      fileName,
      content,
      note.driveFileId || null,
      folderId,
      'text/plain'
    );
    
    // Store Drive file ID in note
    if (!note.driveFileId) {
      note.driveFileId = result.id;
    }
    
    return result;
  } catch (error) {
    console.error('Error saving note to Drive:', error);
    throw error;
  }
}

// Load story data from Drive
async function loadStoryFromDrive(storyFolderId) {
  try {
    // Load folder structure
    await loadStoryFolders(storyFolderId);
    
    // Load project.json
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
        }
      }
    } catch (error) {
      console.warn('Could not load project.json:', error);
    }
    
    // Clear existing state first
    state.snippets = {};
    state.groups = {};
    state.notes = {};
    state.tags = {};
    
    // Load data.json for metadata (but we'll prioritize Google Docs for content)
    try {
      const dataFiles = await window.driveAPI.list(storyFolderId);
      const dataFile = dataFiles.files.find(f => f.name === 'data.json');
      
      if (dataFile) {
        const dataContent = await window.driveAPI.read(dataFile.id);
        if (dataContent.content) {
          const parsed = JSON.parse(dataContent.content);
          
          // Load groups and structure from data.json
          if (parsed.groups) {
            // Only keep groups that have snippets or are valid
            state.groups = parsed.groups;
            // Update project groupIds to match what we have
            state.project.groupIds = Object.keys(state.groups).sort((a, b) => {
              return (state.groups[a].position || 0) - (state.groups[b].position || 0);
            });
          }
          
          // Load snippets metadata (content will be loaded from Google Docs)
          if (parsed.snippets) {
            state.snippets = parsed.snippets;
          }
          
          if (parsed.notes) {
            // Merge notes by kind
            if (parsed.notes.people) {
              Object.assign(state.notes, parsed.notes.people);
            }
            if (parsed.notes.places) {
              Object.assign(state.notes, parsed.notes.places);
            }
            if (parsed.notes.things) {
              Object.assign(state.notes, parsed.notes.things);
            }
          }
          if (parsed.tags) state.tags = parsed.tags;
        }
      }
    } catch (error) {
      console.warn('Could not load data.json:', error);
    }
    
    // Load individual files from Chapters folder - this is the source of truth
    // Google Docs content overrides data.json content
    if (state.drive.folderIds.chapters) {
      try {
        console.log('Loading chapter files from folder:', state.drive.folderIds.chapters);
        const chapterFiles = await window.driveAPI.list(state.drive.folderIds.chapters);
        console.log('Chapter files found:', chapterFiles.files?.length || 0);
        if (chapterFiles.files && chapterFiles.files.length > 0) {
          console.log('Chapter files:', chapterFiles.files.map(f => ({ name: f.name, id: f.id, mimeType: f.mimeType })));
        } else {
          console.warn('No chapter files found! This means the Opening Scene Google Doc was not created.');
          console.warn('State snippets:', Object.keys(state.snippets));
          console.warn('State groups:', Object.keys(state.groups));
        }
        console.log('Current state.snippets:', Object.keys(state.snippets));
        console.log('Current state.groups:', Object.keys(state.groups));
        console.log('Current state.project.groupIds:', state.project.groupIds);
        
        // Build structure from Google Docs - this is the source of truth
        // Only show snippets that exist as Google Docs in the Chapters folder
        const loadedSnippets = {};
        const loadedGroups = {};
        
        for (const file of chapterFiles.files || []) {
          if (file.mimeType === 'application/vnd.google-apps.document' && !file.trashed) {
            // Remove .doc or .docx extension from filename
            const fileName = file.name.replace(/\.docx?$/i, '').trim();
            
            // Try to find matching snippet in existing state
            // Match by title (case-insensitive) or driveFileId
            let snippet = Object.values(state.snippets).find(s => {
              const snippetTitle = (s.title || '').trim();
              return snippetTitle.toLowerCase() === fileName.toLowerCase() || s.driveFileId === file.id;
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
                loadedSnippets[snippet.id] = snippet;
                console.log(`Updated snippet ${snippet.id} with content`);
              } else {
                // Create new snippet from Google Doc
                // Use the snippet ID from data.json if we can find it by group membership
                // Otherwise generate a new ID
                let snippetId = null;
                // Try to find snippet ID from data.json that might not have been matched
                if (state.project.groupIds.length > 0) {
                  const firstGroup = state.groups[state.project.groupIds[0]];
                  if (firstGroup && firstGroup.snippetIds) {
                    // Check if any snippet in this group matches
                    for (const sid of firstGroup.snippetIds) {
                      const existingSnippet = state.snippets[sid];
                      if (existingSnippet && existingSnippet.title === fileName) {
                        snippetId = sid;
                        break;
                      }
                    }
                  }
                }
                
                if (!snippetId) {
                  snippetId = 'snippet_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                }
                
                snippet = {
                  id: snippetId,
                  projectId: 'default',
                  groupId: state.project.groupIds[0] || null,
                  title: fileName,
                  body: snippetBody,
                  words: snippetBody.split(/\s+/).filter(w => w.length > 0).length,
                  chars: snippetBody.length,
                  tagIds: [],
                  updatedAt: file.modifiedTime || new Date().toISOString(),
                  version: 1,
                  driveFileId: file.id
                };
                loadedSnippets[snippetId] = snippet;
              }
            } catch (error) {
              console.warn('Could not load content from Google Doc:', file.name, error);
              // Still create snippet entry even if content load fails
              if (!snippet) {
                const snippetId = Object.keys(state.snippets).find(sid => {
                  const s = state.snippets[sid];
                  return s && (s.title === fileName || s.driveFileId === file.id);
                });
                if (snippetId) {
                  snippet = state.snippets[snippetId];
                  snippet.driveFileId = file.id;
                  loadedSnippets[snippetId] = snippet;
                }
              }
            }
          }
        }
        
        // Merge loaded snippets from Google Docs with snippets from data.json
        // This ensures snippets show up even if Google Doc creation failed
        const mergedSnippets = { ...state.snippets };
        
        // Add or update snippets from Google Docs
        Object.keys(loadedSnippets).forEach(snippetId => {
          mergedSnippets[snippetId] = loadedSnippets[snippetId];
        });
        
        // If no Google Docs were loaded but we have snippets in data.json, keep them
        if (Object.keys(loadedSnippets).length === 0 && Object.keys(state.snippets).length > 0) {
          console.log('No Google Docs found, but data.json has snippets - keeping snippets from data.json');
          // Keep all snippets from data.json
          Object.keys(state.snippets).forEach(snippetId => {
            mergedSnippets[snippetId] = state.snippets[snippetId];
          });
        }
        
        state.snippets = mergedSnippets;
        
        // Ensure groups are created for all snippets
        const validGroupIds = new Set();
        Object.values(mergedSnippets).forEach(snippet => {
          if (snippet.groupId) {
            validGroupIds.add(snippet.groupId);
          }
        });
        
        // Build groups from data.json structure
        Object.keys(state.groups).forEach(groupId => {
          const group = state.groups[groupId];
          // Include group if it has snippets in mergedSnippets OR if it's in project.groupIds
          if (validGroupIds.has(groupId) || state.project.groupIds.includes(groupId)) {
            // Filter snippetIds to only include snippets that exist
            const validSnippetIds = group.snippetIds.filter(sid => mergedSnippets[sid]);
            // Include group if it has valid snippets or if it's the first group (Chapter 1)
            if (validSnippetIds.length > 0 || groupId === state.project.groupIds[0]) {
              group.snippetIds = validSnippetIds;
              loadedGroups[groupId] = group;
              validGroupIds.add(groupId);
            }
          }
        });
        
        state.groups = loadedGroups;
        state.project.groupIds = Object.keys(loadedGroups).sort((a, b) => {
          return (loadedGroups[a].position || 0) - (loadedGroups[b].position || 0);
        });
        
        console.log('Final state after loading:', {
          snippets: Object.keys(state.snippets),
          groups: Object.keys(state.groups),
          groupIds: state.project.groupIds
        });
      } catch (error) {
        console.warn('Could not load chapter files:', error);
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
      // Render UI with loaded data
      renderStoryList();
      renderEditor();
      renderNotesList();
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

  // Tags button
  document.getElementById('tagsButton').addEventListener('click', toggleTagPalette);
  document.getElementById('closeTagPalette').addEventListener('click', () => {
    document.getElementById('tagPalette').classList.add('hidden');
  });

  // Pointer move to restore sidebars
  document.addEventListener('pointermove', handlePointerMove);

  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyboardShortcuts);

  // Version slider
  setupVersionSlider();
  
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

  // Close tag palette on outside click
  document.addEventListener('click', (e) => {
    const palette = document.getElementById('tagPalette');
    const tagsButton = document.getElementById('tagsButton');
    
    if (!palette.contains(e.target) && !tagsButton.contains(e.target) && !palette.classList.contains('hidden')) {
      palette.classList.add('hidden');
    }
    
    // Close color picker on outside click
    const colorPicker = document.getElementById('colorPicker');
    const colorChip = e.target.closest('.group-color-chip');
    
    if (!colorPicker.contains(e.target) && !colorChip && !colorPicker.classList.contains('hidden')) {
      closeColorPicker();
    }
  });
});

