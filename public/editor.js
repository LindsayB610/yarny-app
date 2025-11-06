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

// ============================================
// Word Count Utilities
// ============================================

/**
 * Count words in text string
 * Centralized function to ensure consistency across the codebase
 * @param {string} text - Text to count words in
 * @returns {number} Word count
 */
function countWords(text) {
  if (!text || typeof text !== 'string') return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Update word count for a snippet from its body
 * @param {Object} snippet - Snippet object to update
 * @returns {number} The calculated word count
 */
function updateSnippetWordCount(snippet) {
  if (!snippet) return 0;
  const words = countWords(snippet.body);
  snippet.words = words;
  return words;
}

// Export countWords for potential use in other files (though currently only used in editor.js)
window.countWords = countWords;

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
  collapsedGroups: new Set(), // Track which groups are collapsed
  // Drive integration
  drive: {
    storyFolderId: null,
    folderIds: {
      chapters: null,
      snippets: null,
      people: null,
      places: null,
      things: null
    },
    goalJsonFileId: null
  },
  // Goals tracking
  goal: {
    target: null, // Word count target
    deadline: null, // ISO date string
    startDate: null, // ISO date string - when goal was first set (for strict mode)
    writingDays: [true, true, true, true, true, true, true], // Mon-Sun, default all days
    daysOff: [], // Array of ISO date strings
    mode: 'elastic', // 'elastic' | 'strict'
    ledger: {}, // { date: 'YYYY-MM-DD', words: number }
    lastCalculatedDate: null // Last date we calculated daily target for (YYYY-MM-DD)
  }
};

// Initialize with empty state (should only be used as fallback)
// Real stories should load from Drive via loadStoryFromDrive()
function initializeState() {
  // Reset background loading flags
  _backgroundLoadingStarted = false;
  _backgroundLoadingInProgress = false;
  if (_goalMeterUpdateTimeout) {
    clearTimeout(_goalMeterUpdateTimeout);
    _goalMeterUpdateTimeout = null;
  }
  if (_backgroundLoadStartTimeout) {
    clearTimeout(_backgroundLoadStartTimeout);
    _backgroundLoadStartTimeout = null;
  }
  
  // Clear all state
  state.groups = {};
  state.snippets = {};
  state.project.groupIds = [];
  state.project.snippetIds = [];
  state.project.activeSnippetId = null;
  state.collapsedGroups = new Set();

  // Render empty UI
  renderStoryList();
  renderEditor();
  renderSnippetsList();
  // Ensure noteEditor textarea is hidden (notes now open in main editor)
  document.getElementById('noteEditor').classList.add('hidden');
  updateFooter();
  updateGoalMeter(); // This also calls updateTodayChip
  updateTodayChip(); // Explicitly ensure chip is visible
  updateSaveStatus(); // Initialize save status and logout button warning
}

// Load collapsed groups from localStorage
function loadCollapsedGroups() {
  if (!state.drive.storyFolderId) return;
  
  try {
    const key = `yarny_collapsed_${state.drive.storyFolderId}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      const collapsed = JSON.parse(saved);
      // Filter out any group IDs that no longer exist
      const validCollapsed = collapsed.filter(groupId => state.groups[groupId]);
      state.collapsedGroups = new Set(validCollapsed);
      
      // If we filtered out any IDs, save the cleaned-up version
      if (validCollapsed.length !== collapsed.length) {
        saveCollapsedGroups();
      }
    }
  } catch (error) {
    console.error('Failed to load collapsed groups:', error);
  }
}

// Save collapsed groups to localStorage
function saveCollapsedGroups() {
  if (!state.drive.storyFolderId) return;
  
  try {
    const key = `yarny_collapsed_${state.drive.storyFolderId}`;
    const collapsed = Array.from(state.collapsedGroups);
    localStorage.setItem(key, JSON.stringify(collapsed));
  } catch (error) {
    console.error('Failed to save collapsed groups:', error);
  }
}

// Toggle group collapse state
function toggleGroupCollapse(groupId) {
  if (state.collapsedGroups.has(groupId)) {
    state.collapsedGroups.delete(groupId);
  } else {
    state.collapsedGroups.add(groupId);
  }
  saveCollapsedGroups();
  renderStoryList();
}

// ============================================
// Rendering Functions
// ============================================

function renderStoryList() {
  const listEl = document.getElementById('storyList');
  listEl.innerHTML = '';

  // Preserve exact order from state.project.groupIds - never sort by position
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
    });
  // Note: Removed .sort() - we preserve the exact order from state.project.groupIds

  groups.forEach(group => {
    const groupEl = document.createElement('div');
    groupEl.className = 'story-group';
    groupEl.dataset.groupId = group.id;

    const headerEl = document.createElement('div');
    headerEl.className = 'group-header';
    headerEl.draggable = true;
    headerEl.title = 'Drag to reorder chapters';
    
    // Collapse/expand button
    const collapseBtn = document.createElement('button');
    collapseBtn.className = 'collapse-btn';
    collapseBtn.title = state.collapsedGroups.has(group.id) ? 'Expand chapter' : 'Collapse chapter';
    const collapseIcon = document.createElement('i');
    collapseIcon.className = 'material-icons';
    // When expanded (snippets visible), show down arrow (to collapse)
    // When collapsed (snippets hidden), show right arrow (to expand)
    collapseIcon.textContent = state.collapsedGroups.has(group.id) ? 'keyboard_arrow_right' : 'keyboard_arrow_down';
    collapseBtn.appendChild(collapseIcon);
    collapseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleGroupCollapse(group.id);
    });
    
    const colorChip = document.createElement('div');
    colorChip.className = 'group-color-chip';
    colorChip.style.backgroundColor = group.color || '#3B82F6';
    colorChip.title = 'Click to change color';
    colorChip.addEventListener('click', (e) => {
      e.stopPropagation();
      openColorPicker(group.id, null, colorChip);
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
    
    headerEl.appendChild(collapseBtn);
    headerEl.appendChild(colorChip);
    headerEl.appendChild(titleSpan);
    headerEl.appendChild(countSpan);
    headerEl.appendChild(addBtn);
    
    // Drag & drop handlers
    headerEl.addEventListener('dragstart', (e) => handleGroupDragStart(e, group.id));
    headerEl.addEventListener('dragover', handleDragOver);
    headerEl.addEventListener('dragleave', handleDragLeave);
    headerEl.addEventListener('drop', (e) => {
      handleGroupDrop(e, group.id);
      headerEl.classList.remove('drag-over');
    });
    headerEl.addEventListener('dragend', handleDragEnd);
    
    // Right-click context menu
    headerEl.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showContextMenu(e, 'group', group.id);
    });

    const snippetsEl = document.createElement('div');
    snippetsEl.className = 'group-snippets';
    if (state.collapsedGroups.has(group.id)) {
      snippetsEl.classList.add('collapsed');
    }

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
      snippetEl.title = 'Drag to reorder snippets';
      snippetEl.innerHTML = `
        <span class="snippet-title">${escapeHtml(snippet.title)}</span>
        <span class="snippet-word-count">${snippet.words !== undefined ? snippet.words : 0} words</span>
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
        
        // OPTIMIZATION: Ensure content is loaded for target snippet before switching
        await ensureSnippetContentLoaded(targetSnippetId, true);
        
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
              // Log full error details for debugging
              const errorDetails = {
                message: error.message,
                code: error.code,
                response: error.response?.data,
                stack: error.stack
              };
              console.error('Background save failed (non-critical):', {
                snippetId: previousSnippetId,
                error: errorDetails
              });
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
        
        // Clear editor content immediately to prevent showing old content
        // First, set activeSnippetId to null and render empty editor
        const editorEl = document.getElementById('editorContent');
        if (editorEl) {
          setEditorTextContent(editorEl, '');
        }
        
        // Set the new active snippet ID and update sidebar immediately
        state.project.activeSnippetId = targetSnippetId;
        renderStoryList();
        
        // Use requestAnimationFrame to ensure the empty state is painted before showing new content
        requestAnimationFrame(() => {
          // Now render the editor with the new snippet's content
          renderEditor();
          updateFooter();
        });
      });

      // Drag & drop handlers
      snippetEl.addEventListener('dragstart', (e) => handleSnippetDragStart(e, snippet.id, group.id));
      snippetEl.addEventListener('dragover', handleDragOver);
      snippetEl.addEventListener('dragleave', handleDragLeave);
      snippetEl.addEventListener('drop', (e) => {
        handleSnippetDrop(e, snippet.id, group.id);
        snippetEl.classList.remove('drag-over');
      });
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
    // Disable button and show feedback
    newChapterBtn.disabled = true;
    const originalText = newChapterText.textContent;
    newChapterText.textContent = 'Creating...';
    
    try {
      await createNewGroup();
    } finally {
      // Re-enable button after a short delay to prevent rapid clicking
      setTimeout(() => {
        newChapterBtn.disabled = false;
        newChapterText.textContent = originalText;
      }, 500);
    }
  });
  listEl.appendChild(newChapterBtn);
}

// Helper function to get text content from contenteditable preserving line breaks
function getEditorTextContent(element) {
  // In contenteditable, line breaks can be represented as:
  // - <br> tags (line breaks)
  // - <div> or <p> elements (paragraph breaks)
  // - Actual newline characters in textContent
  
  // Walk the DOM tree to extract text properly
  // Only add newlines for top-level blocks (direct children of element), not nested ones
  function walkNode(node, parts, isTopLevel = false) {
    if (node.nodeType === Node.TEXT_NODE) {
      parts.push(node.textContent || '');
      return;
    }
    
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }
    
    const tagName = node.tagName?.toLowerCase();
    
    // Handle <br> tags as single line breaks
    if (tagName === 'br') {
      parts.push('\n');
      return;
    }
    
    // Handle block elements (div, p) - only top-level blocks become line breaks
    const isBlock = tagName === 'div' || tagName === 'p';
    const isTopLevelBlock = isTopLevel && isBlock;
    
    // Track if we've added content from this block
    const contentStartIndex = parts.length;
    
    // Process children (they are not top-level)
    for (let i = 0; i < node.childNodes.length; i++) {
      walkNode(node.childNodes[i], parts, false);
    }
    
    // Add newline after top-level block elements to represent paragraph break
    // Only add if the block had some content (text or other elements)
    if (isTopLevelBlock) {
      const hadContent = parts.length > contentStartIndex;
      if (hadContent) {
        parts.push('\n');
      }
    }
  }
  
  const parts = [];
  // Process direct children as top-level
  for (let i = 0; i < element.childNodes.length; i++) {
    const node = element.childNodes[i];
    const isBlock = node.nodeType === Node.ELEMENT_NODE && 
                    (node.tagName?.toLowerCase() === 'div' || node.tagName?.toLowerCase() === 'p');
    walkNode(node, parts, isBlock);
  }
  
  let text = parts.join('');
  
  // Normalize line endings (CRLF -> LF, CR -> LF)
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Clean up excessive newlines (more than 2 consecutive) but preserve intentional line breaks
  // This prevents issues from empty paragraphs
  text = text.replace(/\n{3,}/g, '\n\n');
  
  // Remove leading/trailing whitespace
  text = text.trim();
  
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
    // Check if content is loaded (for lazy loading optimization)
    // CRITICAL: Only show content if it's actually loaded to prevent flashing wrong content
    if (activeSnippet._contentLoaded === false && activeSnippet.driveFileId && !activeSnippet.body) {
      // Content is still loading - show loading message and clear editor
      // This prevents showing old/wrong content from a previous snippet
      const loadingIndicator = editorEl.querySelector('.content-loading-indicator');
      if (!loadingIndicator) {
        const indicator = document.createElement('div');
        indicator.className = 'content-loading-indicator';
        indicator.style.cssText = `
          position: absolute;
          top: 10px;
          right: 10px;
          font-size: 12px;
          color: var(--color-text-secondary);
          display: flex;
          align-items: center;
          gap: 6px;
          z-index: 10;
        `;
        indicator.innerHTML = `
          <div style="
            width: 12px;
            height: 12px;
            border: 2px solid var(--color-border);
            border-top-color: var(--color-primary);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          "></div>
          Loading content...
        `;
        editorEl.style.position = 'relative';
        editorEl.appendChild(indicator);
      }
      // Clear editor content to prevent showing wrong content
      setEditorTextContent(editorEl, '');
    } else if (activeSnippet._contentLoaded && activeSnippet.body !== undefined) {
      // Content is loaded, remove loading indicator if present and show content
      const loadingIndicator = editorEl.querySelector('.content-loading-indicator');
      if (loadingIndicator) {
        loadingIndicator.remove();
      }
      setEditorTextContent(editorEl, activeSnippet.body || '');
    } else {
      // Snippet exists but no content yet (shouldn't happen, but handle gracefully)
      const loadingIndicator = editorEl.querySelector('.content-loading-indicator');
      if (loadingIndicator) {
        loadingIndicator.remove();
      }
      setEditorTextContent(editorEl, activeSnippet.body || '');
    }
  } else {
    // Remove loading indicator if present
    const loadingIndicator = editorEl.querySelector('.content-loading-indicator');
    if (loadingIndicator) {
      loadingIndicator.remove();
    }
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
      snippetEl.draggable = true;
      snippetEl.title = 'Drag to reorder snippets';
      
      // Create color chip
      const colorChip = document.createElement('div');
      colorChip.className = 'snippet-color-chip';
      // Assign default color if not set - use a different default color for each kind
      const defaultColors = {
        'person': '#EF4444', // red
        'place': '#10B981', // emerald
        'thing': '#6366F1'  // indigo
      };
      colorChip.style.backgroundColor = snippet.color || defaultColors[snippet.kind] || '#3B82F6';
      colorChip.title = 'Click to change color';
      colorChip.addEventListener('click', (e) => {
        e.stopPropagation();
        openColorPicker(null, snippet.id, colorChip);
      });
      
      // Create title and excerpt elements
      const titleEl = document.createElement('div');
      titleEl.className = 'note-title';
      titleEl.textContent = escapeHtml(snippet.title);
      
      const excerptEl = document.createElement('div');
      excerptEl.className = 'note-excerpt';
      excerptEl.textContent = escapeHtml(snippet.body ? (snippet.body.substring(0, 60) + (snippet.body.length > 60 ? '...' : '')) : 'Loading...');
      
      // Append color chip, title, and excerpt
      snippetEl.appendChild(colorChip);
      snippetEl.appendChild(titleEl);
      snippetEl.appendChild(excerptEl);

      snippetEl.addEventListener('click', async () => {
        // Cancel any pending autosave timeout (we'll save manually)
        clearTimeout(typingTimeout);
        
        // Save current editor content to in-memory state before switching
        // This ensures no data loss when jumping between snippets
        saveCurrentEditorContent();
        
        // Capture ID of previous snippet before switching
        const previousSnippetId = state.project.activeSnippetId;
        const targetSnippetId = snippet.id;
        
        // OPTIMIZATION: Ensure content is loaded for target snippet before switching
        await ensureSnippetContentLoaded(targetSnippetId, true);
        
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
              // Log full error details for debugging
              const errorDetails = {
                message: error.message,
                code: error.code,
                response: error.response?.data,
                stack: error.stack
              };
              console.error('Background save failed (non-critical):', {
                snippetId: previousSnippetId,
                error: errorDetails
              });
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
        
        // Clear editor content immediately to prevent showing old content
        const editorEl = document.getElementById('editorContent');
        if (editorEl) {
          setEditorTextContent(editorEl, '');
        }
        
        // Set the new active snippet ID and update sidebar immediately
        state.project.activeSnippetId = targetSnippetId;
        renderSnippetsList();
        
        // Use requestAnimationFrame to ensure the empty state is painted before showing new content
        requestAnimationFrame(() => {
          // Now render the editor with the new snippet's content
          renderEditor();
          updateFooter();
        });
      });
      
      // Drag & drop handlers for People/Places/Things snippets
      snippetEl.addEventListener('dragstart', (e) => handleNoteDragStart(e, snippet.id, snippet.kind));
      snippetEl.addEventListener('dragover', handleDragOver);
      snippetEl.addEventListener('dragleave', handleDragLeave);
      snippetEl.addEventListener('drop', (e) => {
        handleNoteDrop(e, snippet.id, snippet.kind);
        snippetEl.classList.remove('drag-over');
      });
      snippetEl.addEventListener('dragend', handleDragEnd);
      
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
    const words = activeSnippet.words !== undefined ? activeSnippet.words : countWords(activeSnippet.body);
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
  
  // Update today chip if goal is set
  updateTodayChip();
}

// Update the "Today" chip with daily progress
function updateTodayChip() {
  const todayChip = document.getElementById('todayChip');
  const todayCount = document.getElementById('todayCount');
  const todayProgressBar = document.getElementById('todayProgressBar');
  
  // If elements don't exist yet (during initial load), return early
  if (!todayChip || !todayCount || !todayProgressBar) {
    return;
  }
  
  // Always show chip (even when no goal is set, so user can click to set one)
  todayChip.classList.remove('hidden');
  
  if (!state.goal.target || !state.goal.deadline) {
    // No goal set - show placeholder text
    todayCount.textContent = '—';
    todayProgressBar.style.width = '0%';
    todayChip.title = 'Click to set writing goal';
    return;
  }
  
  // Update title for when goal is set
  todayChip.title = 'Click to edit goal';
  
  // Calculate daily target
  try {
    const dailyInfo = calculateDailyTarget();
    
    if (!dailyInfo) {
      console.log('updateTodayChip: calculateDailyTarget returned null');
      todayCount.textContent = '—';
      todayProgressBar.style.width = '0%';
      return;
    }
    
    console.log('updateTodayChip: Daily info calculated:', dailyInfo);
    
    // Update count
    const todayWords = dailyInfo.todayWords !== undefined ? dailyInfo.todayWords : 0;
    todayCount.textContent = todayWords.toLocaleString();
    
    // Update progress bar
    const progress = dailyInfo.target > 0 
      ? Math.min(100, Math.round((todayWords / dailyInfo.target) * 100))
      : 0;
    todayProgressBar.style.width = `${progress}%`;
    
    console.log('updateTodayChip: Updated chip - words:', todayWords, 'target:', dailyInfo.target, 'progress:', progress + '%');
    
    // Add visual feedback for ahead/behind in strict mode
    if (state.goal.mode === 'strict') {
      if (dailyInfo.isAhead) {
        todayProgressBar.style.backgroundColor = '#10B981'; // green
      } else if (dailyInfo.isBehind) {
        todayProgressBar.style.backgroundColor = '#EF4444'; // red
      } else {
        todayProgressBar.style.backgroundColor = 'var(--color-primary)';
      }
    } else {
      todayProgressBar.style.backgroundColor = 'var(--color-primary)';
    }
  } catch (error) {
    console.error('updateTodayChip: Error calculating daily target:', error);
    todayCount.textContent = '—';
    todayProgressBar.style.width = '0%';
  }
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

    // Update word count display in sidebar for a specific snippet
// @param {string} snippetId - The snippet ID to update (optional, defaults to active snippet)
function updateSnippetWordCountInSidebar(snippetId = null) {
  const targetSnippetId = snippetId || state.project.activeSnippetId;
  if (!targetSnippetId) return;
  
  const snippet = state.snippets[targetSnippetId];
  if (!snippet) return;
  
  const snippetEl = document.querySelector(`[data-snippet-id="${snippet.id}"]`);
  if (snippetEl) {
    const wordCountEl = snippetEl.querySelector('.snippet-word-count');
    if (wordCountEl) {
      // Use snippet.words if available, otherwise calculate from body
      const words = snippet.words !== undefined ? snippet.words : countWords(snippet.body);
      wordCountEl.textContent = `${words} words`;
    }
    // Also update excerpt for People/Places/Things snippets
    const excerptEl = snippetEl.querySelector('.note-excerpt');
    if (excerptEl && snippet.body) {
      excerptEl.textContent = `${escapeHtml(snippet.body.substring(0, 60))}${snippet.body.length > 60 ? '...' : ''}`;
    }
  }
}

function updateWordCount() {
  const editorEl = document.getElementById('editorContent');
  const text = getEditorTextContent(editorEl);
  const words = countWords(text);
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
      updateSnippetWordCountInSidebar(state.project.activeSnippetId);
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
      const words = countWords(text);
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
    snippet.words = countWords(driveContent);
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

// ============================================
// Comments/Tracked Changes Warning
// ============================================

let commentsWarningPromise = null;

function showCommentsWarningModal(commentInfo, snippetTitle) {
  return new Promise((resolve) => {
    commentsWarningPromise = resolve;
    
    const modal = document.getElementById('commentsWarningModal');
    const countEl = document.getElementById('commentsWarningCount');
    
    // Build warning message
    const parts = [];
    if (commentInfo.hasComments && commentInfo.commentCount > 0) {
      parts.push(`${commentInfo.commentCount} ${commentInfo.commentCount === 1 ? 'comment' : 'comments'}`);
    }
    if (commentInfo.hasTrackedChanges) {
      parts.push('tracked changes');
    }
    
    const warningText = parts.length > 0 ? parts.join(' and ') : 'comments or tracked changes';
    countEl.textContent = warningText;
    
    modal.classList.remove('hidden');
  });
}

function confirmCommentsWarning() {
  const modal = document.getElementById('commentsWarningModal');
  modal.classList.add('hidden');
  
  if (commentsWarningPromise) {
    commentsWarningPromise({ action: 'confirm' });
  }
  
  commentsWarningPromise = null;
}

function cancelCommentsWarning() {
  const modal = document.getElementById('commentsWarningModal');
  modal.classList.add('hidden');
  
  if (commentsWarningPromise) {
    commentsWarningPromise({ action: 'cancel' });
  }
  
  commentsWarningPromise = null;
}

// Expose comments warning functions globally
window.confirmCommentsWarning = confirmCommentsWarning;
window.cancelCommentsWarning = cancelCommentsWarning;

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
      // Log error with context since this is a user-initiated save (not background)
      const errorDetails = {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        stack: error.stack
      };
      console.error('Error saving snippet to Drive:', {
        snippetId: snippet.id,
        snippetTitle: snippet.title,
        error: errorDetails
      });
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
      // Don't log here - error will be logged by the caller (background save handler)
      // This prevents duplicate error logs
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
            snippet.words = countWords(text);
            snippet.chars = text.length;
            console.log(`Updated word count for snippet ${snippet.id}: ${snippet.words} words`);
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
let draggedType = null; // 'group', 'snippet', or 'note'
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

function handleNoteDragStart(e, snippetId, kind) {
  draggedElement = e.target.closest('.note-item');
  draggedType = 'note';
  draggedId = snippetId;
  draggedGroupId = kind; // Store kind in draggedGroupId for notes
  draggedElement.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  
  // Add visual feedback for valid drop targets
  const targetEl = e.target.closest('.group-header, .snippet-item, .note-item');
  if (targetEl && !targetEl.classList.contains('dragging')) {
    targetEl.classList.add('drag-over');
  }
}

function handleDragLeave(e) {
  // Remove visual feedback when leaving drop target
  const targetEl = e.target.closest('.group-header, .snippet-item, .note-item');
  if (targetEl) {
    targetEl.classList.remove('drag-over');
  }
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
      
      // Save the new order to Drive
      saveStoryDataToDrive().catch(error => {
        console.error('Failed to save group order:', error);
      });
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
        // Check if we're moving within the same group or between groups
        if (draggedGroupId === targetGroupId) {
          // Reordering within the same group
          const snippetIds = sourceGroup.snippetIds;
          const draggedIndex = snippetIds.indexOf(draggedId);
          const targetIndex = snippetIds.indexOf(targetSnippetId);
          
          // Remove from current position
          snippetIds.splice(draggedIndex, 1);
          
          // Insert at target position
          snippetIds.splice(targetIndex, 0, draggedId);
        } else {
          // Moving between groups
          // Remove from source
          const sourceIndex = sourceGroup.snippetIds.indexOf(draggedId);
          sourceGroup.snippetIds.splice(sourceIndex, 1);
          
          // Add to target
          const targetIndex = targetGroup.snippetIds.indexOf(targetSnippetId);
          targetGroup.snippetIds.splice(targetIndex, 0, draggedId);
          
          // Update snippet's group
          draggedSnippet.groupId = targetGroupId;
        }
        
        renderStoryList();
        
        // Save the new order to Drive
        saveStoryDataToDrive().catch(error => {
          console.error('Failed to save snippet order:', error);
        });
      }
    }
  }
}

function handleNoteDrop(e, targetSnippetId, targetKind) {
  e.preventDefault();
  
  if (draggedType === 'note' && draggedId !== targetSnippetId && draggedGroupId === targetKind) {
    // Only allow reordering within the same kind (People/Places/Things)
    const draggedSnippet = state.snippets[draggedId];
    const targetSnippet = state.snippets[targetSnippetId];
    
    if (draggedSnippet && targetSnippet && draggedSnippet.kind === targetKind) {
      // Get all snippets of the same kind, sorted by position
      const sameKindSnippets = state.project.snippetIds
        .map(id => state.snippets[id])
        .filter(s => s && s.kind === targetKind)
        .sort((a, b) => (a.position || 0) - (b.position || 0));
      
      // Find indices
      const draggedIndex = sameKindSnippets.findIndex(s => s.id === draggedId);
      const targetIndex = sameKindSnippets.findIndex(s => s.id === targetSnippetId);
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        // Remove from current position
        sameKindSnippets.splice(draggedIndex, 1);
        
        // Insert at target position
        sameKindSnippets.splice(targetIndex, 0, draggedSnippet);
        
        // Update positions
        sameKindSnippets.forEach((snippet, index) => {
          snippet.position = index;
        });
        
        renderSnippetsList();
        
        // Save the new order to Drive
        saveStoryDataToDrive().catch(error => {
          console.error('Failed to save note order:', error);
        });
      }
    }
  }
}

function handleDragEnd() {
  // Remove dragging class from dragged element
  if (draggedElement) {
    draggedElement.classList.remove('dragging');
  }
  
  // Remove drag-over classes from all elements
  document.querySelectorAll('.drag-over').forEach(el => {
    el.classList.remove('drag-over');
  });
  
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

// Global flag to prevent concurrent chapter creation
let isCreatingChapter = false;

async function createNewGroup() {
  // Prevent concurrent chapter creation (from button or keyboard shortcut)
  if (isCreatingChapter) {
    console.log('Chapter creation already in progress, ignoring duplicate request');
    return null;
  }
  
  isCreatingChapter = true;
  
  try {
    const groupId = 'group_' + Date.now();
    // Use the 12 accent colors, cycling through them
    const defaultColor = ACCENT_COLORS[state.project.groupIds.length % ACCENT_COLORS.length].value;
    
    // Generate chapter number based on existing chapters
    const chapterNumber = state.project.groupIds.length + 1;
    const title = `Chapter ${chapterNumber}`;
    
    // Create the group object immediately (without Drive folder ID)
    const newGroup = {
      id: groupId,
      projectId: 'default',
      title: title,
      color: defaultColor,
      position: state.project.groupIds.length,
      snippetIds: [],
      driveFolderId: null, // Will be set in background
      _creatingDriveFolder: false // Flag to track background Drive folder creation
    };

    state.groups[groupId] = newGroup;
    state.project.groupIds.push(groupId);

    // Render UI immediately so user can see and start working with the new chapter
    renderStoryList();

    // Create Drive folder in the background (don't block UI)
    // If user starts adding snippets before this completes, autosave will handle it
    (async () => {
      try {
        if (state.drive.folderIds.chapters) {
          newGroup._creatingDriveFolder = true;
          const folderResult = await createDriveFolder(title, state.drive.folderIds.chapters);
          newGroup.driveFolderId = folderResult.id;
          newGroup._creatingDriveFolder = false;
          
          // Save story data to update driveFolderId in Drive
          await saveStoryDataToDrive();
        }
      } catch (error) {
        console.error('Error creating chapter folder:', error);
        newGroup._creatingDriveFolder = false;
        // Continue without folder - snippets will still work, just won't be organized
        // Save story data anyway (without folder ID)
        try {
          await saveStoryDataToDrive();
        } catch (saveError) {
          console.error('Error saving new chapter to Drive:', saveError);
        }
      }
    })();

    return groupId;
  } finally {
    // Reset flag after a short delay to allow UI to update
    setTimeout(() => {
      isCreatingChapter = false;
    }, 500);
  }
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
  
  // Track saving state to prevent duplicate saves
  if (isSavingDataJson) {
    console.log('saveStoryDataToDrive already in progress, skipping...');
    return;
  }
  
  isSavingDataJson = true;
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
    // CRITICAL: Recalculate word counts from snippet.body to ensure they're accurate
    const snippetsToSave = {};
    const snippetIds = Object.keys(state.snippets);
    console.log(`saveStoryDataToDrive: state.snippets has ${snippetIds.length} snippets:`, snippetIds);
    snippetIds.forEach(snippetId => {
      const snippet = state.snippets[snippetId];
      if (!snippet) {
        console.warn(`Snippet ${snippetId} is null/undefined in state.snippets!`);
        return;
      }
      
      // Always recalculate word count from body to ensure accuracy
      // This is critical because background loading may update word counts after initial save
      // We always recalculate here to ensure data.json has the most accurate counts
      if (snippet.body !== undefined && snippet.body !== null) {
        const recalculatedWords = countWords(snippet.body);
        // Only update if different to avoid unnecessary state mutations
        if (snippet.words !== recalculatedWords) {
          snippet.words = recalculatedWords;
        }
      } else if (snippet.words === undefined || snippet.words === null) {
        // No body and no words, set to 0
        snippet.words = 0;
      }
      
      snippetsToSave[snippetId] = {
        ...snippet,
        words: snippet.words,
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
    // Calculate total words from what we're about to save
    const totalWordsToSave = chapterSnippetsToSave.reduce((sum, s) => sum + (s.words || 0), 0);
    console.log(`About to save data.json with ${Object.keys(snippetsToSave).length} total snippets, ${totalWordsToSave} total words:`, {
      totalSnippets: Object.keys(snippetsToSave).length,
      chapterSnippets: chapterSnippetsToSave.length,
      totalWords: totalWordsToSave,
      chapterSnippetDetails: chapterSnippetsToSave.map(s => ({
        id: s.id,
        title: s.title,
        words: s.words,
        bodyLength: s.body ? s.body.length : 0,
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
    
    // CRITICAL: Always use the stored file ID we loaded from
    // This prevents creating duplicate data.json files
    // If we don't have a stored file ID, find the existing one and store it
    let fileIdToUse = state.drive.dataJsonFileId;
    
    if (!fileIdToUse) {
      // No stored file ID - find existing data.json and use it
      const dataFiles = files.files.filter(f => f.name === 'data.json' && !f.trashed);
      if (dataFiles.length > 1) {
        console.warn(`WARNING: Multiple data.json files found (${dataFiles.length}). Using the most recent one.`);
        // Sort by modifiedTime, most recent first
        dataFiles.sort((a, b) => {
          const timeA = new Date(a.modifiedTime || 0).getTime();
          const timeB = new Date(b.modifiedTime || 0).getTime();
          return timeB - timeA;
        });
      }
      if (dataFiles.length > 0) {
        fileIdToUse = dataFiles[0].id;
        state.drive.dataJsonFileId = fileIdToUse;
        console.log(`No stored dataJsonFileId, using existing file: ${fileIdToUse}`);
      }
    } else {
      // Verify the stored file ID still exists
      const dataFile = files.files.find(f => f.id === fileIdToUse && f.name === 'data.json');
      if (!dataFile) {
        console.warn(`WARNING: Stored dataJsonFileId (${fileIdToUse}) no longer exists. Looking for existing data.json...`);
        const dataFiles = files.files.filter(f => f.name === 'data.json' && !f.trashed);
        if (dataFiles.length > 0) {
          fileIdToUse = dataFiles[0].id;
          state.drive.dataJsonFileId = fileIdToUse;
          console.log(`Using existing data.json file: ${fileIdToUse}`);
        } else {
          console.log('No existing data.json found, will create new one');
          fileIdToUse = null; // Will create new file
        }
      }
    }
    
    const jsonString = JSON.stringify(storyData, null, 2);
    
    // CRITICAL: Verify what's actually in the JSON we're about to save
    const parsedForVerification = JSON.parse(jsonString);
    const chapterSnippetsInJson = Object.values(parsedForVerification.snippets || {}).filter(s => {
      const group = s.groupId ? parsedForVerification.groups?.[s.groupId] : null;
      return !!group;
    });
    const totalWordsInJson = chapterSnippetsInJson.reduce((sum, s) => sum + (s.words || 0), 0);
    console.log(`About to write data.json with ${Object.keys(parsedForVerification.snippets || {}).length} total snippets, ${chapterSnippetsInJson.length} chapter snippets, ${totalWordsInJson} total words:`, 
      chapterSnippetsInJson.map(s => ({ id: s.id, title: s.title, words: s.words, bodyLength: s.body ? s.body.length : 0 }))
    );
    
    console.log(`Saving data.json (${jsonString.length} bytes) with ${Object.keys(snippetsToSave).length} snippets, fileId: ${fileIdToUse || 'NEW'} (folder: ${state.drive.storyFolderId})`);
    
    let writeResult;
    try {
      writeResult = await window.driveAPI.write(
        'data.json',
        jsonString,
        fileIdToUse,
        state.drive.storyFolderId,
        'text/plain'
      );
    } catch (error) {
      // If data.json was deleted, retry without fileId to create new one
      if (error.code === 'FILE_NOT_FOUND') {
        console.warn('data.json was deleted, creating new file');
        writeResult = await window.driveAPI.write(
          'data.json',
          jsonString,
          null,
          state.drive.storyFolderId,
          'text/plain'
        );
      } else {
        throw error;
      }
    }
    
    console.log(`data.json write completed. File ID: ${writeResult?.id || 'unknown'}, result:`, writeResult);
    
    // Update stored file ID if we got a new one
    if (writeResult?.id) {
      state.drive.dataJsonFileId = writeResult.id;
    }
    
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
    let projectFileId = projectFile ? projectFile.id : null;
    try {
      await window.driveAPI.write(
        'project.json',
        JSON.stringify(projectData, null, 2),
        projectFileId,
        state.drive.storyFolderId,
        'text/plain'
      );
    } catch (error) {
      // If project.json was deleted, retry without fileId to create new one
      if (error.code === 'FILE_NOT_FOUND') {
        console.warn('project.json was deleted, creating new file');
        await window.driveAPI.write(
          'project.json',
          JSON.stringify(projectData, null, 2),
          null,
          state.drive.storyFolderId,
          'text/plain'
        );
      } else {
        throw error;
      }
    }
    
    // Save goal.json if goal is set
    // Note: We don't write today's words to ledger here - that only happens on midnight rollover
    // The ledger is updated via handleMidnightRollover(), not on every save
    if (state.goal.target !== null) {
      await saveGoalToDrive(files);
    }
  } catch (error) {
    console.error('Error saving story data to Drive:', error);
    throw error;
  } finally {
    // Always reset saving state, even if there was an error
    isSavingDataJson = false;
  }
}

// Load goal data from Drive
async function loadGoalFromDrive(storyFolderId, filesList = null) {
  try {
    const files = filesList || await window.driveAPI.list(storyFolderId);
    const goalFile = files.files?.find(f => f.name === 'goal.json');
    
    if (goalFile) {
      const goalData = await window.driveAPI.read(goalFile.id);
      if (goalData.content) {
        const parsed = JSON.parse(goalData.content);
        // Merge with defaults
        state.goal = {
          target: parsed.target ?? null,
          deadline: parsed.deadline ?? null,
          startDate: parsed.startDate ?? null,
          writingDays: parsed.writingDays ?? [true, true, true, true, true, true, true],
          daysOff: parsed.daysOff ?? [],
          mode: parsed.mode ?? 'elastic',
          ledger: parsed.ledger ?? {},
          lastCalculatedDate: parsed.lastCalculatedDate ?? null
        };
        state.drive.goalJsonFileId = goalFile.id;
        console.log('Loaded goal.json:', state.goal);
        return true;
      }
    }
    return false;
  } catch (error) {
    console.warn('Could not load goal.json:', error);
    return false;
  }
}

// Save goal data to Drive
async function saveGoalToDrive(filesList = null) {
  if (!state.drive.storyFolderId) {
    console.warn('Story folder ID not set, cannot save goal to Drive');
    return;
  }
  
  try {
    const files = filesList || await window.driveAPI.list(state.drive.storyFolderId);
    const goalFile = files.files?.find(f => f.name === 'goal.json');
    
    const goalData = {
      target: state.goal.target,
      deadline: state.goal.deadline,
      startDate: state.goal.startDate,
      writingDays: state.goal.writingDays,
      daysOff: state.goal.daysOff,
      mode: state.goal.mode,
      ledger: state.goal.ledger,
      lastCalculatedDate: state.goal.lastCalculatedDate
    };
    
    await window.driveAPI.write(
      'goal.json',
      JSON.stringify(goalData, null, 2),
      goalFile ? goalFile.id : null,
      state.drive.storyFolderId,
      'text/plain'
    );
    
    // Store file ID for future saves
    if (!goalFile) {
      const updatedFiles = await window.driveAPI.list(state.drive.storyFolderId);
      const newGoalFile = updatedFiles.files?.find(f => f.name === 'goal.json');
      if (newGoalFile) {
        state.drive.goalJsonFileId = newGoalFile.id;
      }
    } else {
      state.drive.goalJsonFileId = goalFile.id;
    }
    
    console.log('Saved goal.json');
  } catch (error) {
    console.error('Error saving goal to Drive:', error);
    throw error;
  }
}

// Get current date in US Pacific time (for testing - will be configurable later)
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

// Check if a date is a writing day (not a day off and matches weekly mask)
function isWritingDay(dateString) {
  const date = new Date(dateString + 'T12:00:00'); // Noon to avoid timezone issues
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  // Convert to Mon-Sun index (0 = Monday, 6 = Sunday)
  const writingDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  
  // Check if it's in daysOff array
  if (state.goal.daysOff.includes(dateString)) {
    return false;
  }
  
  // Check weekly mask
  return state.goal.writingDays[writingDayIndex] === true;
}

// Count effective writing days between two dates
function countWritingDays(startDate, endDate) {
  let count = 0;
  const start = new Date(startDate + 'T12:00:00');
  const end = new Date(endDate + 'T12:00:00');
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    if (isWritingDay(dateStr)) {
      count++;
    }
  }
  
  return count;
}

// Calculate daily word target
function calculateDailyTarget() {
  if (!state.goal.target || !state.goal.deadline) {
    return null;
  }
  
  const today = getPacificDate();
  const deadline = state.goal.deadline.split('T')[0]; // Remove time if present
  
  // Calculate total words written so far (from ledger + today's progress)
  const totalWords = window.calculateStoryWordCount(state.snippets, state.groups);
  
  // Calculate words already accounted for in ledger (excluding today)
  let ledgerWords = 0;
  Object.keys(state.goal.ledger).forEach(date => {
    if (date !== today) {
      ledgerWords += state.goal.ledger[date] || 0;
    }
  });
  
  // Calculate words written today (total - ledger)
  const todayWords = totalWords - ledgerWords;
  
  // Count remaining writing days
  const remainingDays = countWritingDays(today, deadline);
  
  if (remainingDays <= 0) {
    return { target: 0, remaining: 0, wordsRemaining: Math.max(0, state.goal.target - totalWords) };
  }
  
  // Calculate remaining words needed
  const wordsRemaining = Math.max(0, state.goal.target - totalWords);
  
  if (state.goal.mode === 'elastic') {
    // Elastic: recalculate daily target based on remaining words and days
    const dailyTarget = Math.ceil(wordsRemaining / remainingDays);
    return {
      target: dailyTarget,
      remaining: remainingDays,
      wordsRemaining: wordsRemaining,
      todayWords: todayWords,
      isAhead: todayWords > dailyTarget,
      isBehind: todayWords < dailyTarget
    };
  } else {
    // Strict: fixed daily target (calculate from original target and total days from start to deadline)
    const startDate = state.goal.startDate || state.goal.lastCalculatedDate || today;
    const totalWritingDays = countWritingDays(
      startDate.split('T')[0],
      deadline
    );
    const fixedDailyTarget = totalWritingDays > 0 ? Math.ceil(state.goal.target / totalWritingDays) : 0;
    
    return {
      target: fixedDailyTarget,
      remaining: remainingDays,
      wordsRemaining: wordsRemaining,
      todayWords: todayWords,
      isAhead: todayWords > fixedDailyTarget,
      isBehind: todayWords < fixedDailyTarget
    };
  }
}

// Check if a snippet was edited externally (outside Yarny)
function checkForExternalEdit(snippet, driveModifiedTime) {
  if (!driveModifiedTime || !snippet.lastKnownDriveModifiedTime) {
    return false;
  }
  
  const driveTime = new Date(driveModifiedTime).getTime();
  const lastKnownTime = new Date(snippet.lastKnownDriveModifiedTime).getTime();
  
  // If Drive file is newer than our last known time, it was edited externally
  return driveTime > lastKnownTime;
}

// Handle midnight rollover - move today's count to ledger
function handleMidnightRollover() {
  const today = getPacificDate();
  
  // If we've already calculated for today, don't rollover
  if (state.goal.lastCalculatedDate === today) {
    return;
  }
  
  // If lastCalculatedDate exists and is different from today, rollover
  if (state.goal.lastCalculatedDate && state.goal.lastCalculatedDate !== today) {
    // Calculate yesterday's words (total - ledger excluding yesterday)
    const totalWords = window.calculateStoryWordCount(state.snippets, state.groups);
    let ledgerWords = 0;
    Object.keys(state.goal.ledger).forEach(date => {
      if (date !== state.goal.lastCalculatedDate) {
        ledgerWords += state.goal.ledger[date] || 0;
      }
    });
    
    const yesterdayWords = totalWords - ledgerWords;
    
    // Save yesterday to ledger
    state.goal.ledger[state.goal.lastCalculatedDate] = yesterdayWords;
    
    console.log(`Midnight rollover: saved ${yesterdayWords} words for ${state.goal.lastCalculatedDate}`);
  }
  
  // Update last calculated date
  state.goal.lastCalculatedDate = today;
  
  // Save goal data (don't await - do in background to avoid blocking)
  // This is non-critical - if it fails, we'll retry on next load
  saveGoalToDrive().catch(err => {
    console.warn('Error saving goal after rollover (non-critical, will retry):', err);
  });
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
  
  // Assign default colors based on kind
  const defaultColors = {
    'person': '#EF4444', // red
    'place': '#10B981', // emerald
    'thing': '#6366F1'  // indigo
  };
  
  const newSnippet = {
    id: snippetId,
    projectId: 'default',
    kind: snippetKind,
    title: snippetTitle,
    body: '',
    words: 0,
    chars: 0,
    position: existingSnippets.length,
    color: defaultColors[snippetKind] || '#3B82F6',
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
let currentColorPickerSnippetId = null;
let currentColorPickerChip = null;

function openColorPicker(groupId, snippetId, colorChip) {
  const picker = document.getElementById('colorPicker');
  const grid = picker.querySelector('.color-picker-grid');
  
  currentColorPickerGroupId = groupId;
  currentColorPickerSnippetId = snippetId;
  currentColorPickerChip = colorChip;
  
  // Clear previous colors
  grid.innerHTML = '';
  
  // Determine current color
  let currentColor = null;
  if (groupId) {
    const group = state.groups[groupId];
    currentColor = group ? group.color : null;
  } else if (snippetId) {
    const snippet = state.snippets[snippetId];
    currentColor = snippet ? snippet.color : null;
  }
  
  // Render color options
  ACCENT_COLORS.forEach(color => {
    const colorOption = document.createElement('button');
    colorOption.className = 'color-picker-option';
    colorOption.style.backgroundColor = color.value;
    colorOption.title = color.name;
    colorOption.setAttribute('data-color', color.value);
    colorOption.setAttribute('data-color-name', color.name);
    
    // Check if this is the current color
    if (currentColor === color.value) {
      colorOption.classList.add('selected');
    }
    
    colorOption.addEventListener('click', (e) => {
      e.stopPropagation();
      selectColor(groupId, snippetId, color.value, color.name);
    });
    
    grid.appendChild(colorOption);
  });
  
  // Position the picker near the color chip
  const chipRect = colorChip.getBoundingClientRect();
  picker.style.top = `${chipRect.bottom + 8}px`;
  picker.style.left = `${chipRect.left}px`;
  picker.classList.remove('hidden');
}

function selectColor(groupId, snippetId, colorValue, colorName) {
  // Update group or snippet color
  if (groupId) {
    const group = state.groups[groupId];
    if (!group) return;
    group.color = colorValue;
  } else if (snippetId) {
    const snippet = state.snippets[snippetId];
    if (!snippet) return;
    snippet.color = colorValue;
  } else {
    return;
  }
  
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
  currentColorPickerSnippetId = null;
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
    
    // Sync goal target with project word goal (they should always be the same)
    if (state.goal.target !== null) {
      state.goal.target = wordGoal;
      // Save goal data if goal is already set
      await saveGoalToDrive();
    }
    
    // Save to Drive
    await saveStoryDataToDrive();
    
    // Update UI
    updateGoalMeter();
    updateTodayChip(); // Also update today chip if goal is set
    
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

// Goal Panel Modal Functions
function openGoalPanel() {
  const modal = document.getElementById('goalPanelModal');
  const errorEl = document.getElementById('goalPanelError');
  
  // Hide error
  if (errorEl) {
    errorEl.classList.add('hidden');
    errorEl.textContent = '';
  }
  
  // Populate form with current goal data
  if (state.goal.target !== null) {
    document.getElementById('goalTarget').value = state.goal.target;
    document.getElementById('goalDeadline').value = state.goal.deadline ? state.goal.deadline.split('T')[0] : '';
    document.getElementById('goalMode').value = state.goal.mode || 'elastic';
    document.getElementById('daysOffInput').value = state.goal.daysOff.join(', ');
    
    // Set writing days checkboxes
    for (let i = 0; i < 7; i++) {
      const checkbox = document.getElementById(`writingDay${i}`);
      if (checkbox) {
        checkbox.checked = state.goal.writingDays[i] === true;
      }
    }
  } else {
    // If no goal target set, use project word goal as default
    const defaultTarget = state.project.wordGoal || '';
    document.getElementById('goalTarget').value = defaultTarget;
    document.getElementById('goalDeadline').value = '';
    document.getElementById('goalMode').value = 'elastic';
    document.getElementById('daysOffInput').value = '';
    // Default all days checked
    for (let i = 0; i < 7; i++) {
      const checkbox = document.getElementById(`writingDay${i}`);
      if (checkbox) {
        checkbox.checked = true;
      }
    }
  }
  
  modal.classList.remove('hidden');
}

function closeGoalPanel() {
  document.getElementById('goalPanelModal').classList.add('hidden');
  const errorEl = document.getElementById('goalPanelError');
  if (errorEl) {
    errorEl.classList.add('hidden');
    errorEl.textContent = '';
  }
}

async function saveGoal() {
  const errorEl = document.getElementById('goalPanelError');
  const saveBtn = document.getElementById('saveGoalBtn');
  
  // Hide error
  if (errorEl) {
    errorEl.classList.add('hidden');
    errorEl.textContent = '';
  }
  
  // Get form values
  const target = parseInt(document.getElementById('goalTarget').value);
  const deadline = document.getElementById('goalDeadline').value;
  const mode = document.getElementById('goalMode').value;
  const daysOffInput = document.getElementById('daysOffInput').value.trim();
  
  // Validate
  if (!target || target <= 0) {
    if (errorEl) {
      errorEl.textContent = 'Please enter a valid word count target';
      errorEl.classList.remove('hidden');
    }
    return;
  }
  
  if (!deadline) {
    if (errorEl) {
      errorEl.textContent = 'Please select a deadline';
      errorEl.classList.remove('hidden');
    }
    return;
  }
  
  // Check deadline is in the future
  const deadlineDate = new Date(deadline + 'T12:00:00');
  const today = new Date(getPacificDate() + 'T12:00:00');
  if (deadlineDate <= today) {
    if (errorEl) {
      errorEl.textContent = 'Deadline must be in the future';
      errorEl.classList.remove('hidden');
    }
    return;
  }
  
  // Parse writing days
  const writingDays = [];
  for (let i = 0; i < 7; i++) {
    const checkbox = document.getElementById(`writingDay${i}`);
    writingDays.push(checkbox.checked);
  }
  
  // Check at least one day is selected
  if (!writingDays.some(d => d)) {
    if (errorEl) {
      errorEl.textContent = 'Please select at least one writing day';
      errorEl.classList.remove('hidden');
    }
    return;
  }
  
  // Parse days off
  let daysOff = [];
  if (daysOffInput) {
    daysOff = daysOffInput.split(',').map(d => d.trim()).filter(d => {
      // Validate date format YYYY-MM-DD
      return /^\d{4}-\d{2}-\d{2}$/.test(d);
    });
  }
  
  // Disable save button
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
  }
  
  try {
    // Update state
    state.goal.target = target;
    state.goal.deadline = deadline + 'T23:59:59'; // End of day
    state.goal.writingDays = writingDays;
    state.goal.daysOff = daysOff;
    state.goal.mode = mode;
    
    // Sync word goal with project word goal (they should always be the same)
    state.project.wordGoal = target;
    
    // Initialize startDate and lastCalculatedDate if not set (first time setting goal)
    const today = getPacificDate();
    if (!state.goal.startDate) {
      state.goal.startDate = today;
    }
    if (!state.goal.lastCalculatedDate) {
      state.goal.lastCalculatedDate = today;
    }
    
    // Save to Drive
    await saveGoalToDrive();
    await saveStoryDataToDrive(); // Also save story data since wordGoal changed
    
    // Update UI
    updateGoalMeter(); // Update the main progress bar
    updateTodayChip();
    closeGoalPanel();
  } catch (error) {
    console.error('Error saving goal:', error);
    if (errorEl) {
      errorEl.textContent = 'Failed to save goal: ' + error.message;
      errorEl.classList.remove('hidden');
    }
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Goal';
    }
  }
}

async function clearGoal() {
  if (!confirm('Are you sure you want to clear the writing goal? This will remove all goal tracking data.')) {
    return;
  }
  
  // Reset goal state
  state.goal = {
    target: null,
    deadline: null,
    startDate: null,
    writingDays: [true, true, true, true, true, true, true],
    daysOff: [],
    mode: 'elastic',
    ledger: {},
    lastCalculatedDate: null
  };
  
  // Delete goal.json from Drive if it exists
  if (state.drive.goalJsonFileId && state.drive.storyFolderId) {
    try {
      await window.driveAPI.delete(state.drive.goalJsonFileId);
      state.drive.goalJsonFileId = null;
    } catch (error) {
      console.warn('Could not delete goal.json:', error);
    }
  }
  
  // Update UI
  updateTodayChip();
  closeGoalPanel();
}

// Export for global access
window.openGoalPanel = openGoalPanel;
window.closeGoalPanel = closeGoalPanel;
window.clearGoal = clearGoal;

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
    
    // If folder is being created, wait for it (with timeout)
    if (group._creatingDriveFolder && !group.driveFolderId) {
      let waited = 0;
      while (group._creatingDriveFolder && !group.driveFolderId && waited < 3000) {
        await new Promise(resolve => setTimeout(resolve, 100));
        waited += 100;
      }
    }
    
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
  
  // Check for comments/tracked changes before saving (only for existing files)
  if (snippet.driveFileId) {
    try {
      const commentInfo = await window.driveAPI.checkComments(snippet.driveFileId);
      
      if (commentInfo.hasComments || commentInfo.hasTrackedChanges) {
        // Show warning and wait for user confirmation
        const userResponse = await showCommentsWarningModal(commentInfo, snippet.title);
        
        if (userResponse.action === 'cancel') {
          // User cancelled, don't save
          throw new Error('Save cancelled by user due to comments/tracked changes');
        }
        // If user confirmed, continue with save below
      }
    } catch (error) {
      // If check fails or user cancels, re-throw to stop the save
      if (error.message.includes('cancelled')) {
        throw error;
      }
      // For other errors in checking, log but continue (don't block saves)
      console.warn('Could not check for comments/tracked changes:', error.message);
    }
  }
  
  try {
    const fileName = `${snippet.title}.doc`;
    // If driveFileId exists, update the existing file; otherwise create a new one
    let result;
    try {
      result = await window.driveAPI.write(
        fileName,
        snippet.body,
        snippet.driveFileId || null,
        targetFolderId,
        'application/vnd.google-apps.document'
      );
    } catch (error) {
      // If file was deleted, clear the driveFileId and retry as a new file
      if (error.code === 'FILE_NOT_FOUND') {
        console.warn(`File for snippet ${snippet.id} (${snippet.title}) was deleted, creating new file`);
        delete snippet.driveFileId;
        // Retry without fileId to create a new file
        result = await window.driveAPI.write(
          fileName,
          snippet.body,
          null,
          targetFolderId,
          'application/vnd.google-apps.document'
        );
      } else {
        throw error;
      }
    }
    
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
    // Don't log here - error will be logged by the caller
    // This prevents duplicate error logs
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
    let result;
    try {
      result = await window.driveAPI.write(
        fileName,
        content,
        snippet.driveFileId || null,
        folderId,
        'text/plain'
      );
    } catch (error) {
      // If file was deleted, clear the driveFileId and retry as a new file
      if (error.code === 'FILE_NOT_FOUND') {
        console.warn(`File for snippet ${snippet.id} (${snippet.title}) was deleted, creating new file`);
        delete snippet.driveFileId;
        // Retry without fileId to create a new file
        result = await window.driveAPI.write(
          fileName,
          content,
          null,
          folderId,
          'text/plain'
        );
      } else {
        throw error;
      }
    }
    
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
    // Don't log here - error will be logged by the caller
    // This prevents duplicate error logs
    throw error;
  }
}

// Find the most recently edited snippet across all types (chapters and People/Places/Things)
function findMostRecentlyEditedSnippet() {
  const allSnippets = Object.values(state.snippets);
  
  if (allSnippets.length === 0) {
    return null;
  }
  
  // Filter out snippets without updatedAt timestamp
  const snippetsWithTimestamp = allSnippets.filter(snippet => snippet.updatedAt);
  
  if (snippetsWithTimestamp.length === 0) {
    // If no snippets have updatedAt, fall back to first snippet
    return allSnippets[0] || null;
  }
  
  // Find snippet with most recent updatedAt
  const mostRecent = snippetsWithTimestamp.reduce((latest, current) => {
    const latestTime = new Date(latest.updatedAt || 0).getTime();
    const currentTime = new Date(current.updatedAt || 0).getTime();
    return currentTime > latestTime ? current : latest;
  });
  
  return mostRecent;
}

// Lazy load snippet content from Drive if not already loaded
// @param {string} snippetId - The snippet ID to load
// @param {boolean} isActiveSnippet - If true, shows loading indicator in editor and updates UI. If false, loads silently in background.
async function ensureSnippetContentLoaded(snippetId, isActiveSnippet = false) {
  const snippet = state.snippets[snippetId];
  if (!snippet) {
    console.warn(`Snippet ${snippetId} not found in state`);
    return;
  }
  
  // If content is already loaded, return immediately
  if (snippet._contentLoaded && snippet.body) {
    return;
  }
  
  // If no driveFileId, can't load from Drive
  if (!snippet.driveFileId) {
    console.warn(`Snippet ${snippetId} has no driveFileId, cannot load content`);
    return;
  }
  
  try {
    // Only show loading indicator if this is the active snippet
    if (isActiveSnippet) {
      const editorContent = document.getElementById('editorContent');
      if (editorContent) {
        editorContent.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--color-text-secondary);">Loading content...</div>';
      }
    }
    
    // Determine mimeType based on snippet type
    const mimeType = snippet.kind ? 'text/plain' : 'application/vnd.google-apps.document';
    const docContent = await window.driveAPI.read(snippet.driveFileId);
    const snippetBody = (docContent.content || '').trim();
    
    snippet.body = snippetBody;
    snippet.words = countWords(snippetBody);
    snippet.chars = snippetBody.length;
    snippet._contentLoaded = true;
    
    // Check if this snippet was edited externally (outside Yarny)
    const wasExternallyEdited = checkForExternalEdit(snippet, docContent.modifiedTime);
    
    snippet.lastKnownDriveModifiedTime = docContent.modifiedTime || snippet.lastKnownDriveModifiedTime || new Date().toISOString();
    
    // Update updatedAt if Drive file is newer
    if (docContent.modifiedTime) {
      const driveTime = new Date(docContent.modifiedTime).getTime();
      const currentUpdatedAt = snippet.updatedAt ? new Date(snippet.updatedAt).getTime() : 0;
      if (driveTime > currentUpdatedAt) {
        snippet.updatedAt = docContent.modifiedTime;
      }
    }
    
    if (isActiveSnippet) {
      console.log(`Loaded content for active snippet: ${snippet.title}`);
    } else {
      console.log(`Background loaded content for snippet: ${snippet.title}`);
    }
    
    // If externally edited, handle goal recalculation (non-blocking)
    if (wasExternallyEdited && state.goal.target !== null) {
      // Handle midnight rollover first (in case we crossed midnight)
      // This is fast (synchronous calculation), so it won't block
      handleMidnightRollover();
      // Recalculate today's progress
      updateGoalMeter();
      console.log(`External edit detected for ${snippet.title} - goal totals recalculated`);
    }
    
    // Update UI - only if this is the active snippet or if word count needs updating
    if (isActiveSnippet) {
      renderEditor();
      updateWordCount();
      updateGoalMeter();
      
      // After active snippet loads, trigger background loading of all remaining snippets
      // This ensures word counts are available for all snippets in the story
      // Use a small delay to avoid interfering with rapid snippet switching
      // Only start background loading if we haven't already started it for this story session
      if (!_backgroundLoadingStarted) {
        // Cancel any pending background load start timeout (in case user switches snippets rapidly)
        if (_backgroundLoadStartTimeout) {
          clearTimeout(_backgroundLoadStartTimeout);
        }
        // Small delay to allow UI to settle after active snippet loads
        _backgroundLoadStartTimeout = setTimeout(() => {
          _backgroundLoadStartTimeout = null;
          loadAllRemainingSnippetsInBackground().catch(err => {
            console.error('Error loading remaining snippets in background:', err);
          });
        }, 300); // 300ms delay - allows UI to render before starting background work
      }
    } else {
      // For background loading, just update word count and progress meter
      // Don't re-render editor since it would show wrong content
      // Use throttled update during background loading to improve performance
      if (_backgroundLoadingInProgress) {
        updateGoalMeterThrottled();
      } else {
        updateGoalMeter();
      }
      // Update word count in sidebar for this specific snippet
      updateSnippetWordCountInSidebar(snippetId);
    }
  } catch (error) {
    console.error(`Error lazy loading content for snippet ${snippetId}:`, error);
    // Only show error in editor if this is the active snippet
    if (isActiveSnippet) {
      const editorContent = document.getElementById('editorContent');
      if (editorContent) {
        editorContent.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--color-danger);">Error loading content. Please try again.</div>';
      }
    }
  }
}

// Flag to prevent multiple simultaneous background loading operations
let _backgroundLoadingInProgress = false;
let _backgroundLoadingStarted = false; // Track if we've started background loading for this story session
let _goalMeterUpdateTimeout = null; // For throttling updateGoalMeter during background loading
let _backgroundLoadStartTimeout = null; // For delaying background load start

// Throttled version of updateGoalMeter for use during background loading
// This prevents excessive DOM updates while batches are loading
function updateGoalMeterThrottled() {
  if (_goalMeterUpdateTimeout) {
    clearTimeout(_goalMeterUpdateTimeout);
  }
  // Update after a short delay to batch multiple updates
  _goalMeterUpdateTimeout = setTimeout(() => {
    updateGoalMeter();
    _goalMeterUpdateTimeout = null;
  }, 200); // 200ms throttle - balances responsiveness with performance
}

// Load all remaining snippets in the background (for word count calculation)
async function loadAllRemainingSnippetsInBackground() {
  // Prevent duplicate background loading
  if (_backgroundLoadingInProgress) {
    console.log('Background loading already in progress, skipping...');
    return;
  }
  
  const snippetsToLoad = Object.values(state.snippets).filter(snippet => {
    return snippet.driveFileId && !snippet._contentLoaded && !snippet.body;
  });
  
  if (snippetsToLoad.length === 0) {
    return;
  }
  
  _backgroundLoadingInProgress = true;
  _backgroundLoadingStarted = true;
  console.log(`Loading ${snippetsToLoad.length} remaining snippets in background for word count...`);
  
  try {
    // Load snippets in batches to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < snippetsToLoad.length; i += batchSize) {
      const batch = snippetsToLoad.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map(snippet => ensureSnippetContentLoaded(snippet.id, false))
      );
      
      // Use throttled update to avoid excessive DOM manipulation
      // This is better for performance when loading many snippets
      updateGoalMeterThrottled();
    }
    
    console.log(`Finished loading all ${snippetsToLoad.length} snippets in background`);
    // Final update (immediate, not throttled) to ensure accurate final state
    if (_goalMeterUpdateTimeout) {
      clearTimeout(_goalMeterUpdateTimeout);
      _goalMeterUpdateTimeout = null;
    }
    updateGoalMeter();
  } finally {
    _backgroundLoadingInProgress = false;
  }
}

// Load story data from Drive
async function loadStoryFromDrive(storyFolderId) {
  // Reset background loading flags for new story
  _backgroundLoadingStarted = false;
  _backgroundLoadingInProgress = false;
  if (_goalMeterUpdateTimeout) {
    clearTimeout(_goalMeterUpdateTimeout);
    _goalMeterUpdateTimeout = null;
  }
  if (_backgroundLoadStartTimeout) {
    clearTimeout(_backgroundLoadStartTimeout);
    _backgroundLoadStartTimeout = null;
  }
  
  try {
    // Check if this is a newly created story
    const isNewStory = localStorage.getItem('yarny_newly_created_story') === 'true';
    if (isNewStory) {
      // Clear the flag so it doesn't affect future loads
      localStorage.removeItem('yarny_newly_created_story');
    }
    
    // Show prominent loading indicator - make it visible immediately
    const editorContent = document.getElementById('editorContent');
    if (editorContent) {
      const loadingTitle = isNewStory ? 'Setting up your story...' : 'Loading story...';
      const loadingMessage = isNewStory 
        ? 'Creating files in Google Drive' 
        : 'Fetching your content from Google Drive';
      
      editorContent.innerHTML = `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          padding: 40px;
          text-align: center;
        ">
          <div style="
            font-size: 24px;
            font-weight: 600;
            color: var(--color-text-primary);
            margin-bottom: 16px;
          ">${loadingTitle}</div>
          <div style="
            font-size: 14px;
            color: var(--color-text-secondary);
            margin-bottom: 24px;
          ">${loadingMessage}</div>
          <div style="
            width: 40px;
            height: 40px;
            border: 4px solid var(--color-border);
            border-top-color: var(--color-primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
          "></div>
        </div>
        <style>
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        </style>
      `;
    }
    
    // Also show loading in sidebar
    const storyList = document.getElementById('storyList');
    if (storyList) {
      storyList.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--color-text-secondary);">Loading...</div>';
    }
    
    // Load project.json and list story folder in parallel
    let savedFolderIds = null;
    const projectFilesResult = await window.driveAPI.list(storyFolderId).catch(err => {
      console.warn('Could not list story folder:', err);
      return { files: [] };
    });
    
    // Load project.json from the files we already listed
    try {
      const projectFile = projectFilesResult.files.find(f => f.name === 'project.json');
      
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
    
    // Load goal.json in parallel with folder loading (non-blocking)
    // This doesn't block UI rendering since it's independent of story structure
    loadGoalFromDrive(storyFolderId, projectFilesResult).then((goalLoaded) => {
      console.log('Goal loading completed. Goal loaded:', goalLoaded, 'Goal state:', state.goal);
      // Handle midnight rollover if goal is set (after goal loads)
      if (state.goal.target !== null && state.goal.deadline) {
        handleMidnightRollover();
        console.log('Goal is set, updating today chip. Target:', state.goal.target, 'Deadline:', state.goal.deadline);
      }
      // Always update chip after goal loads (whether goal exists or not)
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        updateTodayChip();
        updateGoalMeter(); // Also update goal meter to ensure chip shows
        console.log('Today chip updated after goal load');
      });
    }).catch(err => {
      console.warn('Failed to load goal.json (non-critical):', err);
      // Still try to update chip in case goal state changed
      requestAnimationFrame(() => {
        updateTodayChip();
      });
    });
    
    // Load folder structure using saved IDs if available
    await loadStoryFolders(storyFolderId, savedFolderIds);
    
    // Clear existing state first
    state.snippets = {};
    state.groups = {};
    state.collapsedGroups = new Set(); // Reset collapsed groups
    // Note: loadCollapsedGroups() will be called after groups are loaded
    
    // Load data.json for metadata (but we'll prioritize Google Docs for content)
    // CRITICAL: Store the data.json file ID so we save to the same file
    // Also handle duplicate data.json files by keeping only the most recent one
    let dataJsonFileId = null;
    try {
      const dataFiles = projectFilesResult.files || [];
      const allDataJsonFiles = (dataFiles || []).filter(f => f.name === 'data.json' && !f.trashed);
      
      if (allDataJsonFiles.length > 1) {
        // Multiple data.json files found - read them all in PARALLEL and keep the one with actual content
        console.warn(`WARNING: Found ${allDataJsonFiles.length} data.json files in story folder. Analyzing content to determine which to keep.`);
        
        // Read all files in parallel
        const fileReadPromises = allDataJsonFiles.map(async (file) => {
          try {
            const content = await window.driveAPI.read(file.id);
            if (content.content) {
              const parsed = JSON.parse(content.content);
              // Count snippets with actual content
              const snippetCount = parsed.snippets ? Object.keys(parsed.snippets).length : 0;
              const totalWords = parsed.snippets && parsed.groups 
                ? window.calculateStoryWordCount(parsed.snippets, parsed.groups) 
                : 0;
              
              return {
                file: file,
                parsed: parsed,
                snippetCount: snippetCount,
                totalWords: totalWords,
                hasContent: snippetCount > 0 || totalWords > 0 || (parsed.groups && Object.keys(parsed.groups).length > 0)
              };
            }
            return null;
          } catch (error) {
            console.error(`Failed to read data.json file ${file.id}:`, error);
            return null;
          }
        });
        
        const fileContents = (await Promise.all(fileReadPromises)).filter(f => f !== null);
        
        // Log results
        fileContents.forEach(fc => {
          console.log(`data.json file ${fc.file.id}: ${fc.snippetCount} snippets, ${fc.totalWords} words, modified: ${fc.file.modifiedTime}`);
        });
        
        // Determine which file to keep:
        // 1. Prefer file with actual content (snippets/words)
        // 2. If multiple have content, prefer the one with more words
        // 3. If still tied, prefer most recent
        fileContents.sort((a, b) => {
          // First priority: files with content
          if (a.hasContent && !b.hasContent) return -1;
          if (!a.hasContent && b.hasContent) return 1;
          
          // Second priority: more words
          if (a.totalWords !== b.totalWords) {
            return b.totalWords - a.totalWords;
          }
          
          // Third priority: more snippets
          if (a.snippetCount !== b.snippetCount) {
            return b.snippetCount - a.snippetCount;
          }
          
          // Fourth priority: most recent
          const timeA = new Date(a.file.modifiedTime || 0).getTime();
          const timeB = new Date(b.file.modifiedTime || 0).getTime();
          return timeB - timeA;
        });
        
        const primaryDataFile = fileContents[0].file;
        const duplicateFiles = fileContents.slice(1).map(fc => fc.file);
        
        console.log(`Keeping data.json file ID: ${primaryDataFile.id} (${fileContents[0].snippetCount} snippets, ${fileContents[0].totalWords} words, modified: ${primaryDataFile.modifiedTime})`);
        console.log(`Deleting ${duplicateFiles.length} duplicate data.json file(s):`, duplicateFiles.map(f => ({ id: f.id, modified: f.modifiedTime })));
        
        // Delete duplicate files (only if we're confident we're keeping the right one)
        if (fileContents[0].hasContent || fileContents.length === 1 || fileContents[0].totalWords > 0) {
          for (const duplicate of duplicateFiles) {
            try {
              await window.driveAPI.delete(duplicate.id);
              console.log(`Deleted duplicate data.json: ${duplicate.id}`);
            } catch (error) {
              console.error(`Failed to delete duplicate data.json ${duplicate.id}:`, error);
            }
          }
        } else {
          console.warn('⚠️ All data.json files appear empty - keeping most recent but NOT deleting others to be safe');
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
            
            // Always preserve the saved order from project.json - never reorder automatically
            const savedGroupIds = state.project.groupIds || [];
            
            if (savedGroupIds.length > 0 && savedGroupIds.every(id => state.groups[id])) {
              // Saved order exists and all groups are still present - preserve exact order
              // Add any new groups that weren't in the saved order (at the end)
              const newGroups = Object.keys(state.groups).filter(id => !savedGroupIds.includes(id));
              state.project.groupIds = [...savedGroupIds, ...newGroups];
              console.log('Preserved exact groupIds order from project.json:', state.project.groupIds);
            } else if (savedGroupIds.length > 0) {
              // Saved order exists but some groups are missing - filter to only existing groups, preserve order
              const filteredSavedOrder = savedGroupIds.filter(id => state.groups[id]);
              const newGroups = Object.keys(state.groups).filter(id => !savedGroupIds.includes(id));
              state.project.groupIds = [...filteredSavedOrder, ...newGroups];
              console.log('Preserved groupIds order from project.json (filtered missing groups):', state.project.groupIds);
            } else {
              // No saved order - use whatever order the groups are in (no sorting)
              state.project.groupIds = Object.keys(state.groups);
              console.log('No saved order found, using groups as-is:', state.project.groupIds);
            }
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
    // CRITICAL: Also create groups from folder structure if data.json is empty
    // This ensures we can load content from Google Docs even if data.json is blank
    if (state.drive.folderIds.chapters) {
      if (Object.keys(state.groups).length > 0) {
        // Match existing groups to folders
        await mapChapterFoldersToGroups(state.drive.folderIds.chapters);
      } else {
        // No groups in data.json - create them from folder structure
        console.log('No groups found in data.json, creating groups from chapter folder structure...');
        try {
          const chapterFolders = await window.driveAPI.list(state.drive.folderIds.chapters);
          const subfolders = (chapterFolders.files || []).filter(
            file => file.mimeType === 'application/vnd.google-apps.folder' && !file.trashed
          );
          
          // Create a group for each chapter folder
          subfolders.forEach((folder, index) => {
            const groupId = `group_${Date.now()}_${index}`;
            state.groups[groupId] = {
              id: groupId,
              title: folder.name.trim(),
              position: index,
              color: ACCENT_COLORS[index % ACCENT_COLORS.length].value,
              driveFolderId: folder.id,
              snippetIds: []
            };
            console.log(`Created group from folder: ${folder.name} (${folder.id}) -> ${groupId}`);
          });
          
          // Update groupIds in state
          // Preserve saved order if it exists, otherwise use groups as-is (no sorting)
          const savedGroupIds = state.project.groupIds || [];
          
          if (savedGroupIds.length > 0 && savedGroupIds.every(id => state.groups[id])) {
            // Saved order exists and all groups are present - preserve it
            const newGroups = Object.keys(state.groups).filter(id => !savedGroupIds.includes(id));
            state.project.groupIds = [...savedGroupIds, ...newGroups];
            console.log('Preserved groupIds order when creating from folder structure:', state.project.groupIds);
          } else {
            // No saved order or some groups missing - use groups as-is (no sorting)
            state.project.groupIds = Object.keys(state.groups);
            console.log('Using groups as-is when creating from folder structure (no saved order):', state.project.groupIds);
          }
          
          console.log(`Created ${state.project.groupIds.length} groups from folder structure`);
        } catch (error) {
          console.error('Error creating groups from folder structure:', error);
        }
      }
    }
    
    // Load individual files from chapter subfolders - OPTIMIZED: parallel loading
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
          // OPTIMIZATION: List all chapter folders in parallel
          const chapterListPromises = groupsWithFolders.map(group => 
            window.driveAPI.list(group.driveFolderId).catch(err => {
              console.warn(`Error listing chapter folder ${group.title}:`, err);
              return { files: [] };
            })
          );
          const chapterListResults = await Promise.all(chapterListPromises);
          
          // First pass: collect all file IDs from chapter folders (metadata only)
          chapterListResults.forEach((chapterFiles, index) => {
            if (chapterFiles.files) {
              chapterFiles.files.forEach(file => {
                if (file.mimeType === 'application/vnd.google-apps.document' && !file.trashed) {
                  chapterFileIdsInCurrentStory.add(file.id);
                }
              });
            }
          });
          
          // Second pass: process files and create snippet metadata (without loading content yet)
          const allFilesToProcess = [];
          chapterListResults.forEach((chapterFiles, index) => {
            const group = groupsWithFolders[index];
            console.log(`Processing files from chapter folder: ${group.title} (${group.driveFolderId})`);
            console.log('Chapter files found:', chapterFiles.files?.length || 0);
            
            if (chapterFiles.files && chapterFiles.files.length > 0) {
              for (const file of chapterFiles.files) {
                if (file.mimeType === 'application/vnd.google-apps.document' && !file.trashed) {
                  const fileName = file.name.replace(/\.docx?$/i, '').trim();
                  
                  // Try to find matching snippet in existing state
                  let snippet = Object.values(state.snippets).find(s => {
                    if (s.groupId !== group.id) return false;
                    if (s.driveFileId) {
                      return s.driveFileId === file.id;
                    }
                    const snippetTitle = (s.title || '').trim();
                    return snippetTitle.toLowerCase() === fileName.toLowerCase();
                  });
                  
                  // If no snippet found, create one
                  if (!snippet) {
                    let snippetId = null;
                    if (group.snippetIds) {
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
                      body: '', // Will be loaded lazily
                      words: 0, // Will be updated when content loads
                      chars: 0,
                      updatedAt: file.modifiedTime || new Date().toISOString(),
                      version: 1,
                      driveFileId: file.id,
                      lastKnownDriveModifiedTime: file.modifiedTime || new Date().toISOString(),
                      _contentLoaded: false // Flag to track if content is loaded
                    };
                  } else {
                    // Update existing snippet with file metadata
                    snippet.driveFileId = file.id;
                    snippet.lastKnownDriveModifiedTime = file.modifiedTime || new Date().toISOString();
                    snippet._contentLoaded = false; // Mark as needing content load
                    
                    // Update updatedAt if Drive file is newer
                    if (file.modifiedTime) {
                      const driveTime = new Date(file.modifiedTime).getTime();
                      const currentUpdatedAt = snippet.updatedAt ? new Date(snippet.updatedAt).getTime() : 0;
                      if (driveTime > currentUpdatedAt) {
                        snippet.updatedAt = file.modifiedTime;
                      }
                    }
                  }
                  
                  // Ensure snippet is in group's snippetIds array
                  if (!group.snippetIds) {
                    group.snippetIds = [];
                  }
                  if (!group.snippetIds.includes(snippet.id)) {
                    group.snippetIds.push(snippet.id);
                  }
                  
                  allFilesToProcess.push({ file, snippet, group });
                  loadedSnippets[snippet.id] = snippet;
                }
              }
            }
          });
          
          // OPTIMIZATION: Determine which snippet to load immediately (active or first)
          const activeSnippetId = state.project.activeSnippetId;
          const activeSnippetInfo = allFilesToProcess.find(f => f.snippet.id === activeSnippetId);
          const firstSnippetInfo = allFilesToProcess[0];
          const snippetToLoadNow = activeSnippetInfo || firstSnippetInfo;
          
          // Load content for the active/first snippet immediately
          if (snippetToLoadNow) {
            try {
              const docContent = await window.driveAPI.read(snippetToLoadNow.file.id);
              const snippetBody = (docContent.content || '').trim();
              snippetToLoadNow.snippet.body = snippetBody;
              snippetToLoadNow.snippet.words = countWords(snippetBody);
              snippetToLoadNow.snippet.chars = snippetBody.length;
              snippetToLoadNow.snippet._contentLoaded = true;
              snippetToLoadNow.snippet.lastKnownDriveModifiedTime = docContent.modifiedTime || snippetToLoadNow.file.modifiedTime || new Date().toISOString();
              console.log(`Loaded content for active snippet: ${snippetToLoadNow.snippet.title}`);
            } catch (error) {
              console.warn('Could not load content for active snippet:', error);
            }
          }
          
          // OPTIMIZATION: Load remaining snippets in background after active snippet is loaded
          // This ensures word counts are available for the progress meter
          // Content will be loaded in background via loadAllRemainingSnippetsInBackground()
          const remainingSnippets = allFilesToProcess.filter(f => f !== snippetToLoadNow);
          if (remainingSnippets.length > 0) {
            console.log(`Will load ${remainingSnippets.length} remaining snippets in background after active snippet loads`);
          }
        } else {
          // Fallback: if no chapter folders exist, try loading from main Chapters folder (backward compatibility)
          console.log('No chapter folders found, trying to load from main Chapters folder (backward compatibility)');
          const chapterFiles = await window.driveAPI.list(state.drive.folderIds.chapters);
          console.log('Chapter files found:', chapterFiles.files?.length || 0);
          
          // Process files similar to above but without group filtering
          // OPTIMIZATION: Only load metadata, defer content loading
          const activeSnippetId = state.project.activeSnippetId;
          for (const file of chapterFiles.files || []) {
            if (file.mimeType === 'application/vnd.google-apps.document' && !file.trashed) {
              const fileName = file.name.replace(/\.docx?$/i, '').trim();
              let snippet = Object.values(state.snippets).find(s => {
                if (s.driveFileId) {
                  return s.driveFileId === file.id;
                }
                const snippetTitle = (s.title || '').trim();
                return snippetTitle.toLowerCase() === fileName.toLowerCase();
              });
              
              if (!snippet) {
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
                snippet.driveFileId = file.id;
                snippet.lastKnownDriveModifiedTime = file.modifiedTime || new Date().toISOString();
                snippet._contentLoaded = false; // Defer content loading
                
                // Only load content immediately if this is the active snippet
                if (snippet.id === activeSnippetId) {
                  try {
                    const docContent = await window.driveAPI.read(file.id);
                    const snippetBody = (docContent.content || '').trim();
                    snippet.body = snippetBody;
                    snippet.words = countWords(snippetBody);
                    snippet.chars = snippetBody.length;
                    snippet._contentLoaded = true;
                    snippet.lastKnownDriveModifiedTime = docContent.modifiedTime || file.modifiedTime || new Date().toISOString();
                  } catch (error) {
                    console.warn('Could not load content from Google Doc:', file.name, error);
                  }
                }
                
                loadedSnippets[snippet.id] = snippet;
              }
            }
          }
        }
      } catch (error) {
        console.warn('Could not load chapter files:', error);
      }
    }
    
    // Load People/Places/Things snippets from their respective Drive folders - OPTIMIZED: parallel loading
    // This ensures we only load files from the current story's folders
    const peoplePlacesThingsSnippets = {};
    const folderKinds = [
      { folderId: state.drive.folderIds.people, kind: 'person' },
      { folderId: state.drive.folderIds.places, kind: 'place' },
      { folderId: state.drive.folderIds.things, kind: 'thing' }
    ];
    
    // OPTIMIZATION: List all People/Places/Things folders in parallel
    const folderListPromises = folderKinds
      .filter(fk => fk.folderId)
      .map(({ folderId, kind }) => 
        window.driveAPI.list(folderId).catch(err => {
          console.warn(`Error listing ${kind} folder:`, err);
          return { files: [], kind, folderId };
        }).then(result => ({ ...result, kind, folderId }))
      );
    
    const folderListResults = await Promise.all(folderListPromises);
    
    // Process all folders in parallel
    const allPeoplePlacesThingsFiles = [];
    folderListResults.forEach(({ files, kind, folderId }) => {
      if (!files || !files.files) return;
      console.log(`Processing ${kind} snippets from folder: ${folderId}`);
      console.log(`${kind} files found:`, files.files?.length || 0);
      
      files.files.forEach(file => {
        if (file.mimeType === 'text/plain' && !file.trashed) {
          const fileName = file.name.replace(/\.txt$/i, '').trim();
          
          let snippet = Object.values(state.snippets).find(s => {
            const snippetTitle = (s.title || '').trim();
            return s.kind === kind && 
                   (snippetTitle.toLowerCase() === fileName.toLowerCase() || s.driveFileId === file.id);
          });
          
          if (!snippet) {
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
              body: '', // Will be loaded lazily
              words: 0,
              chars: 0,
              updatedAt: file.modifiedTime || new Date().toISOString(),
              version: 1,
              driveFileId: file.id,
              lastKnownDriveModifiedTime: file.modifiedTime || new Date().toISOString(),
              _contentLoaded: false
            };
          } else {
            snippet.driveFileId = file.id;
            snippet.lastKnownDriveModifiedTime = file.modifiedTime || new Date().toISOString();
            snippet._contentLoaded = false;
            
            // Update updatedAt if Drive file is newer
            if (file.modifiedTime) {
              const driveTime = new Date(file.modifiedTime).getTime();
              const currentUpdatedAt = snippet.updatedAt ? new Date(snippet.updatedAt).getTime() : 0;
              if (driveTime > currentUpdatedAt) {
                snippet.updatedAt = file.modifiedTime;
              }
            }
          }
          
          allPeoplePlacesThingsFiles.push({ file, snippet, kind });
          peoplePlacesThingsSnippets[snippet.id] = snippet;
        }
      });
    });
    
    // OPTIMIZATION: Load People/Places/Things content in background after active snippet loads
    // This ensures word counts are available for the progress meter
    // Content will be loaded in background via loadAllRemainingSnippetsInBackground()
    if (allPeoplePlacesThingsFiles.length > 0) {
      console.log(`Will load ${allPeoplePlacesThingsFiles.length} People/Places/Things snippets in background after active snippet loads`);
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
    
    // CRITICAL: First, rebuild snippetIds for all groups from mergedSnippets
    // This ensures groups include all snippets that were loaded from Google Docs
    Object.keys(state.groups).forEach(groupId => {
      const group = state.groups[groupId];
      // Find all snippets in mergedSnippets that belong to this group
      const snippetsInGroup = Object.values(mergedSnippets).filter(s => s.groupId === groupId);
      if (snippetsInGroup.length > 0) {
        // Rebuild snippetIds from mergedSnippets
        group.snippetIds = snippetsInGroup.map(s => s.id);
        console.log(`Rebuilt group ${groupId} snippetIds from mergedSnippets:`, group.snippetIds);
      }
    });
    
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
    
    // Always preserve the saved order from project.json - never reorder automatically
    const savedGroupIds = state.project.groupIds || [];
    
    if (savedGroupIds.length > 0 && savedGroupIds.every(id => loadedGroups[id])) {
      // Saved order exists and all groups are still present - preserve exact order
      // Add any new groups that weren't in the saved order (at the end)
      const newGroups = Object.keys(loadedGroups).filter(id => !savedGroupIds.includes(id));
      state.project.groupIds = [...savedGroupIds, ...newGroups];
      console.log('Preserved exact groupIds order after merging snippets:', state.project.groupIds);
    } else if (savedGroupIds.length > 0) {
      // Saved order exists but some groups are missing - filter to only existing groups, preserve order
      const filteredSavedOrder = savedGroupIds.filter(id => loadedGroups[id]);
      const newGroups = Object.keys(loadedGroups).filter(id => !savedGroupIds.includes(id));
      state.project.groupIds = [...filteredSavedOrder, ...newGroups];
      console.log('Preserved groupIds order after merging snippets (filtered missing groups):', state.project.groupIds);
    } else {
      // No saved order - use whatever order the groups are in (no sorting)
      state.project.groupIds = Object.keys(loadedGroups);
      console.log('No saved order found after merging, using groups as-is:', state.project.groupIds);
    }
    
    // Load collapsed groups state now that groups are loaded
    // This must happen after groups are in state so the IDs match
    loadCollapsedGroups();
    
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
    
    // OPTIMIZATION: Show UI structure immediately after metadata is loaded
    // This makes the UI appear much faster, even before content is fully loaded
    // We'll update word counts and content as they load in the background
    if (typeof renderStoryList === 'function' && typeof renderSnippetsList === 'function') {
      renderStoryList();
      renderSnippetsList();
      updateFooter();
      updateGoalMeter(); // This also calls updateTodayChip
      // Explicitly update today chip to ensure it shows if goal is already loaded
      updateTodayChip();
    }
    
    // Verify state.snippets === mergedSnippets (should be same object reference now)
    if (state.snippets !== mergedSnippets) {
      console.error('ERROR: state.snippets is not the same as mergedSnippets!');
    }
    
    // CRITICAL: Save data.json with updated word counts after loading from Google Docs
    // OPTIMIZATION: Do this in the background - don't block UI rendering
    // This ensures word counts in data.json match the actual content in Google Docs
    // Must happen AFTER state.snippets is updated with merged snippets
    (async () => {
      try {
        console.log('Saving data.json with updated word counts after loading (background)...');
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
    })();
    
    // Ensure activeSnippetId is valid after loading
    // If activeSnippetId is not set or doesn't exist, open the most recently edited snippet
    let activeSnippetChanged = false;
    if (!state.project.activeSnippetId || !state.snippets[state.project.activeSnippetId]) {
      activeSnippetChanged = true;
      const mostRecentSnippet = findMostRecentlyEditedSnippet();
      
      if (mostRecentSnippet) {
        state.project.activeSnippetId = mostRecentSnippet.id;
        console.log('Set activeSnippetId to most recently edited snippet:', mostRecentSnippet.id, mostRecentSnippet.title);
        
        // If the snippet is a People/Places/Things snippet, switch to the appropriate tab
        if (mostRecentSnippet.kind) {
          const tabMap = {
            'person': 'people',
            'place': 'places',
            'thing': 'things'
          };
          const targetTab = tabMap[mostRecentSnippet.kind];
          if (targetTab) {
            state.project.activeRightTab = targetTab;
            // Update tab buttons
            document.querySelectorAll('.notes-tab').forEach(btn => {
              btn.classList.remove('active');
              if (btn.dataset.tab === targetTab) {
                btn.classList.add('active');
              }
            });
            console.log('Switched to tab:', targetTab);
          }
        }
      } else {
        // Fallback: set to first snippet of first group if no snippets have timestamps
        if (state.project.groupIds.length > 0) {
          const firstGroup = state.groups[state.project.groupIds[0]];
          console.log('First group:', firstGroup);
          if (firstGroup && firstGroup.snippetIds && firstGroup.snippetIds.length > 0) {
            const firstSnippetId = firstGroup.snippetIds[0];
            console.log('First snippet ID:', firstSnippetId, 'exists:', !!state.snippets[firstSnippetId]);
            if (state.snippets[firstSnippetId]) {
              state.project.activeSnippetId = firstSnippetId;
              console.log('Set activeSnippetId to first snippet (fallback):', firstSnippetId);
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
    }
    
    // OPTIMIZATION: Load active snippet content if it wasn't already loaded
    // This ensures the editor shows content immediately even if activeSnippetId changed
    // Background loading of remaining snippets will be triggered automatically after active snippet loads
    if (state.project.activeSnippetId && state.snippets[state.project.activeSnippetId]) {
      const activeSnippet = state.snippets[state.project.activeSnippetId];
      if (!activeSnippet._contentLoaded && activeSnippet.driveFileId) {
        // Load content in background (non-blocking) - UI is already rendered
        // Background loading of remaining snippets will be triggered automatically
        ensureSnippetContentLoaded(state.project.activeSnippetId, true).catch(err => {
          console.error('Error loading active snippet content:', err);
        });
      } else if (activeSnippet._contentLoaded) {
        // Active snippet already loaded, trigger background loading of remaining snippets
        loadAllRemainingSnippetsInBackground().catch(err => {
          console.error('Error loading remaining snippets in background:', err);
        });
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

// Track if we're currently saving data.json to avoid duplicate saves
let isSavingDataJson = false;

// Save data.json before navigation (synchronous if possible)
async function saveDataJsonBeforeNavigation() {
  if (!state.drive.storyFolderId) return;
  
  // If already saving, wait for it to complete
  if (isSavingDataJson) {
    console.log('Waiting for existing data.json save to complete...');
    // Wait up to 3 seconds for save to complete
    for (let i = 0; i < 30; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (!isSavingDataJson) break;
    }
    // Continue to save again after waiting - word counts may have been updated by background loading
  }
  
  // Ensure current editor content is saved to state
  // This updates word count for the active snippet
  saveCurrentEditorContent();
  
  // CRITICAL: Recalculate ALL word counts from body before saving
  // This ensures we save the latest word counts even if background loading updated them
  console.log('Recalculating word counts for all snippets before navigation save...');
  Object.values(state.snippets).forEach(snippet => {
    if (snippet.body !== undefined && snippet.body !== null) {
      const recalculatedWords = countWords(snippet.body);
      if (snippet.words !== recalculatedWords) {
        console.log(`Updating word count for snippet ${snippet.id}: ${snippet.words} -> ${recalculatedWords}`);
        snippet.words = recalculatedWords;
      }
    } else if (snippet.words === undefined || snippet.words === null) {
      snippet.words = 0;
    }
  });
  
  const totalWordsBeforeNavigationSave = window.calculateStoryWordCount(state.snippets, state.groups);
  console.log(`Total words before navigation save: ${totalWordsBeforeNavigationSave}`);
  
  // Save data.json with recalculated word counts
  isSavingDataJson = true;
  try {
    await saveStoryDataToDrive();
    const totalWordsAfterNavigationSave = window.calculateStoryWordCount(state.snippets, state.groups);
    console.log(`data.json saved before navigation with ${totalWordsAfterNavigationSave} total words`);
  } catch (error) {
    console.error('Error saving data.json before navigation:', error);
    // Don't block navigation, but log the error
  } finally {
    isSavingDataJson = false;
  }
  
  // Clear story progress cache so stories page fetches fresh data
  if (state.drive.storyFolderId) {
    try {
      const CACHE_KEY_STORY_PROGRESS = 'yarny_story_progress';
      const cached = localStorage.getItem(CACHE_KEY_STORY_PROGRESS);
      if (cached) {
        const progressCache = JSON.parse(cached);
        delete progressCache[state.drive.storyFolderId];
        localStorage.setItem(CACHE_KEY_STORY_PROGRESS, JSON.stringify(progressCache));
        console.log('Cleared story progress cache for story:', state.drive.storyFolderId);
      }
    } catch (e) {
      console.warn('Error clearing story progress cache:', e);
    }
  }
}

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
  
  // Intercept back-to-stories link clicks to save before navigation
  const backToStoriesLink = document.querySelector('.back-to-stories-link');
  if (backToStoriesLink) {
    backToStoriesLink.addEventListener('click', async (e) => {
      e.preventDefault();
      await saveDataJsonBeforeNavigation();
      window.location.href = '/stories.html';
    });
  }
  
  // Save data.json before page unload (when user navigates away or closes tab)
  window.addEventListener('beforeunload', (e) => {
    // Note: Modern browsers don't allow async operations in beforeunload
    // So we use sendBeacon or a flag to indicate we need to save
    // For now, we'll ensure word counts are at least updated in state
    saveCurrentEditorContent();
    
    // Only fix missing word counts (trust that updateWordCount() keeps active snippet accurate)
    Object.values(state.snippets).forEach(snippet => {
      if (snippet.words === undefined || snippet.words === null) {
        snippet.words = countWords(snippet.body || '');
      }
    });
    
    // Set a flag that we need to save (stories page can check this)
    if (state.drive.storyFolderId) {
      localStorage.setItem('yarny_pending_save', JSON.stringify({
        storyId: state.drive.storyFolderId,
        timestamp: Date.now()
      }));
      
      // Clear story progress cache
      try {
        const CACHE_KEY_STORY_PROGRESS = 'yarny_story_progress';
        const cached = localStorage.getItem(CACHE_KEY_STORY_PROGRESS);
        if (cached) {
          const progressCache = JSON.parse(cached);
          delete progressCache[state.drive.storyFolderId];
          localStorage.setItem(CACHE_KEY_STORY_PROGRESS, JSON.stringify(progressCache));
        }
      } catch (e) {
        // Ignore errors
      }
    }
  });
  
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
      // OPTIMIZATION: Render UI structure immediately with metadata
      // This makes the UI appear instantly, even if content is still loading
      renderStoryList();
      renderSnippetsList();
      // Ensure noteEditor textarea is hidden (notes now open in main editor)
      document.getElementById('noteEditor').classList.add('hidden');
      updateFooter();
      updateGoalMeter(); // This also calls updateTodayChip
      updateTodayChip(); // Explicitly call to ensure chip shows even if goal hasn't loaded yet
      updateSaveStatus(); // Initialize save status and logout button warning
      
      // Render editor with placeholder or loading state
      renderEditor();
      
      // Load active snippet content in background (non-blocking)
      // This allows UI to be interactive immediately
      // Background loading of remaining snippets will be triggered automatically after active snippet loads
      if (state.project.activeSnippetId) {
        ensureSnippetContentLoaded(state.project.activeSnippetId, true).then(() => {
          // Re-render with loaded content when it's ready
          renderEditor();
          updateWordCount();
          updateGoalMeter();
          // Background loading of remaining snippets is triggered automatically by ensureSnippetContentLoaded
        }).catch(err => {
          console.error('Error loading active snippet content:', err);
        });
      } else {
        // No active snippet, just load all snippets in background
        loadAllRemainingSnippetsInBackground().catch(err => {
          console.error('Error loading remaining snippets in background:', err);
        });
      }
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
  
  // Today chip click - open goal panel
  document.getElementById('todayChip').addEventListener('click', openGoalPanel);
  
  // Story info form
  document.getElementById('storyInfoForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveStoryInfo();
  });
  
  // Goal panel form
  document.getElementById('goalPanelForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveGoal();
  });
  
  // Close modal on overlay click
  document.querySelector('#storyInfoModal .modal-overlay').addEventListener('click', closeStoryInfoModal);
  document.querySelector('#goalPanelModal .modal-overlay').addEventListener('click', closeGoalPanel);

  // Close color picker on outside click
  document.addEventListener('click', (e) => {
    const colorPicker = document.getElementById('colorPicker');
    const groupColorChip = e.target.closest('.group-color-chip');
    const snippetColorChip = e.target.closest('.snippet-color-chip');
    
    if (!colorPicker.contains(e.target) && !groupColorChip && !snippetColorChip && !colorPicker.classList.contains('hidden')) {
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
  
  // Close comments warning modal on overlay click
  document.querySelector('#commentsWarningModal .modal-overlay').addEventListener('click', cancelCommentsWarning);
  
  // Export dropdown toggle
  const exportBtn = document.getElementById('exportBtn');
  const exportDropdown = document.getElementById('exportDropdown');
  
  if (exportBtn && exportDropdown) {
    exportBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      exportDropdown.classList.toggle('hidden');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!exportBtn.contains(e.target) && !exportDropdown.contains(e.target)) {
        exportDropdown.classList.add('hidden');
      }
    });
  }
  
  // Export filename modal keyboard shortcuts
  const exportFilenameInput = document.getElementById('exportFilenameInput');
  if (exportFilenameInput) {
    exportFilenameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        confirmExportFilename();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeExportFilenameModal();
      }
    });
  }
  
  // Close export filename modal on overlay click
  const exportFilenameModal = document.getElementById('exportFilenameModal');
  if (exportFilenameModal) {
    exportFilenameModal.querySelector('.modal-overlay')?.addEventListener('click', closeExportFilenameModal);
  }
});

// ============================================
// Export Functionality
// ============================================

// Store pending export info
let pendingExport = null;

/**
 * Open filename modal for chapters export
 */
function exportChapters() {
  if (!state.drive.storyFolderId) {
    alert('Story folder not found. Please reload the page.');
    return;
  }
  
  // Check if there are chapters to export
  const groups = state.project.groupIds
    .map(id => state.groups[id])
    .filter(group => group)
    .sort((a, b) => a.position - b.position);
  
  if (groups.length === 0) {
    alert('No chapters to export.');
    return;
  }
  
  // Store export info
  pendingExport = {
    type: 'chapters',
    suggestedName: `${state.project.title || 'Untitled Story'} - All Chapters`
  };
  
  // Open modal with suggested name
  openExportFilenameModal();
}

/**
 * Open filename modal for outline export
 */
function exportOutline() {
  if (!state.drive.storyFolderId) {
    alert('Story folder not found. Please reload the page.');
    return;
  }
  
  // Check if there are chapters to export
  const groups = state.project.groupIds
    .map(id => state.groups[id])
    .filter(group => group)
    .sort((a, b) => a.position - b.position);
  
  if (groups.length === 0) {
    alert('No chapters to export.');
    return;
  }
  
  // Store export info
  pendingExport = {
    type: 'outline',
    suggestedName: `${state.project.title || 'Untitled Story'} - Outline`
  };
  
  // Open modal with suggested name
  openExportFilenameModal();
}

/**
 * Open filename modal for People export
 */
function exportPeople() {
  openExportFilenameModalForKind('person', 'People');
}

/**
 * Open filename modal for Places export
 */
function exportPlaces() {
  openExportFilenameModalForKind('place', 'Places');
}

/**
 * Open filename modal for Things export
 */
function exportThings() {
  openExportFilenameModalForKind('thing', 'Things');
}

/**
 * Helper to open filename modal for kind-based exports
 */
function openExportFilenameModalForKind(kind, kindDisplayName) {
  if (!state.drive.storyFolderId) {
    alert('Story folder not found. Please reload the page.');
    return;
  }
  
  // Check if there are snippets to export
  const snippets = state.project.snippetIds
    .map(id => state.snippets[id])
    .filter(snippet => snippet && snippet.kind === kind)
    .sort((a, b) => (a.position || 0) - (b.position || 0));
  
  if (snippets.length === 0) {
    alert(`No ${kindDisplayName.toLowerCase()} to export.`);
    return;
  }
  
  // Store export info
  pendingExport = {
    type: 'kind',
    kind: kind,
    kindDisplayName: kindDisplayName,
    suggestedName: `${state.project.title || 'Untitled Story'} - All ${kindDisplayName}`
  };
  
  // Open modal with suggested name
  openExportFilenameModal();
}

/**
 * Open the export filename modal
 */
function openExportFilenameModal() {
  const modal = document.getElementById('exportFilenameModal');
  const input = document.getElementById('exportFilenameInput');
  const snippetNamesGroup = document.getElementById('exportSnippetNamesGroup');
  const snippetNamesCheckbox = document.getElementById('exportSnippetNamesCheckbox');
  
  if (!modal || !input) return;
  
  // Pre-populate with suggested name
  input.value = pendingExport?.suggestedName || '';
  
  // Show/hide snippet names checkbox based on export type
  // Only show for chapters export, not for outline or kind exports
  if (snippetNamesGroup && snippetNamesCheckbox) {
    if (pendingExport?.type === 'chapters') {
      snippetNamesGroup.style.display = 'block';
      snippetNamesCheckbox.checked = false; // Default: unchecked (don't include snippet names)
    } else {
      snippetNamesGroup.style.display = 'none';
      snippetNamesCheckbox.checked = false;
    }
  }
  
  // Show modal
  modal.classList.remove('hidden');
  
  // Focus and select the input
  setTimeout(() => {
    input.focus();
    input.select();
  }, 100);
  
  // Close dropdown if open
  document.getElementById('exportDropdown')?.classList.add('hidden');
}

/**
 * Close the export filename modal
 */
function closeExportFilenameModal() {
  const modal = document.getElementById('exportFilenameModal');
  if (modal) {
    modal.classList.add('hidden');
  }
  pendingExport = null;
}

/**
 * Confirm export and proceed with the actual export
 */
async function confirmExportFilename() {
  const input = document.getElementById('exportFilenameInput');
  const filename = input?.value?.trim();
  
  if (!filename) {
    alert('Please enter a file name.');
    return;
  }
  
  if (!pendingExport) {
    alert('Export information not found. Please try again.');
    closeExportFilenameModal();
    return;
  }
  
  // Save export info before closing modal (which clears pendingExport)
  const exportInfo = { ...pendingExport };
  const finalFilename = filename;
  
  // Get checkbox state for chapters export (before closing modal)
  const includeSnippetNames = exportInfo.type === 'chapters' 
    ? document.getElementById('exportSnippetNamesCheckbox')?.checked || false
    : false;
  
  // Close modal (this clears pendingExport)
  closeExportFilenameModal();
  
  // Show loading state
  const exportBtn = document.getElementById('exportBtn');
  const originalContent = exportBtn.innerHTML;
  exportBtn.disabled = true;
  exportBtn.innerHTML = '<i class="material-icons" style="animation: spin 1s linear infinite;">hourglass_empty</i><span>Exporting...</span>';
  
  try {
    let combinedContent = '';
    
    if (exportInfo.type === 'chapters') {
      // Export chapters
      const groups = state.project.groupIds
        .map(id => state.groups[id])
        .filter(group => group)
        .sort((a, b) => a.position - b.position);
      
      groups.forEach((group, groupIndex) => {
        // Add chapter title
        combinedContent += `# ${group.title}\n\n`;
        
        // Get snippets in this group, sorted by position
        const snippets = group.snippetIds
          .map(id => state.snippets[id])
          .filter(snippet => snippet)
          .sort((a, b) => (a.position || 0) - (b.position || 0));
        
        snippets.forEach((snippet) => {
          // Add snippet title only if checkbox is checked
          if (includeSnippetNames && snippet.title) {
            combinedContent += `## ${snippet.title}\n\n`;
          }
          
          // Add snippet body
          if (snippet.body) {
            combinedContent += snippet.body.trim() + '\n\n';
          }
        });
        
        // Add separator between chapters (except after last one)
        if (groupIndex < groups.length - 1) {
          combinedContent += '---\n\n';
        }
      });
    } else if (exportInfo.type === 'outline') {
      // Export outline (just chapter and snippet titles)
      const groups = state.project.groupIds
        .map(id => state.groups[id])
        .filter(group => group)
        .sort((a, b) => a.position - b.position);
      
      groups.forEach((group, groupIndex) => {
        // Add chapter title
        combinedContent += `# ${group.title}\n\n`;
        
        // Get snippets in this group, sorted by position
        const snippets = group.snippetIds
          .map(id => state.snippets[id])
          .filter(snippet => snippet)
          .sort((a, b) => (a.position || 0) - (b.position || 0));
        
        snippets.forEach((snippet) => {
          // Add snippet title (only titles, no body)
          if (snippet.title) {
            combinedContent += `## ${snippet.title}\n\n`;
          }
        });
        
        // Add separator between chapters (except after last one)
        if (groupIndex < groups.length - 1) {
          combinedContent += '---\n\n';
        }
      });
    } else if (exportInfo.type === 'kind') {
      // Export by kind (People/Places/Things)
      const snippets = state.project.snippetIds
        .map(id => state.snippets[id])
        .filter(snippet => snippet && snippet.kind === exportInfo.kind)
        .sort((a, b) => (a.position || 0) - (b.position || 0));
      
      snippets.forEach((snippet, index) => {
        // Add snippet title
        if (snippet.title) {
          combinedContent += `## ${snippet.title}\n\n`;
        }
        
        // Add snippet body
        if (snippet.body) {
          combinedContent += snippet.body.trim() + '\n\n';
        }
        
        // Add separator between snippets (except after last one)
        if (index < snippets.length - 1) {
          combinedContent += '---\n\n';
        }
      });
    }
    
    // Create Google Doc with user-provided filename
    await window.driveAPI.write(
      finalFilename,
      combinedContent.trim(),
      null,
      state.drive.storyFolderId,
      'application/vnd.google-apps.document'
    );
    
    // Show success
    exportBtn.innerHTML = '<i class="material-icons">check</i><span>Exported!</span>';
    setTimeout(() => {
      exportBtn.innerHTML = originalContent;
      exportBtn.disabled = false;
    }, 2000);
    
  } catch (error) {
    console.error('Export error:', error);
    let exportType = 'content';
    if (exportInfo?.type === 'chapters') {
      exportType = 'chapters';
    } else if (exportInfo?.type === 'outline') {
      exportType = 'outline';
    } else if (exportInfo?.kindDisplayName) {
      exportType = exportInfo.kindDisplayName.toLowerCase();
    }
    alert(`Failed to export ${exportType}: ` + (error.message || 'Unknown error'));
    exportBtn.innerHTML = originalContent;
    exportBtn.disabled = false;
  }
}

// Export functions for global access
window.exportChapters = exportChapters;
window.exportOutline = exportOutline;
window.exportPeople = exportPeople;
window.exportPlaces = exportPlaces;
window.exportThings = exportThings;
window.closeExportFilenameModal = closeExportFilenameModal;
window.confirmExportFilename = confirmExportFilename;

