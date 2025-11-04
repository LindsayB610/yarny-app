// ============================================
// Yarny Editor - Main Application Logic
// ============================================

// State Management
const state = {
  project: {
    id: 'default',
    title: 'Untitled Project',
    wordGoal: 3000,
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
  previewVersion: 1
};

// Initialize with sample data
function initializeState() {
  // Sample groups
  const group1 = {
    id: 'group1',
    projectId: 'default',
    title: 'Chapter 1',
    color: '#E57A24',
    position: 0,
    snippetIds: ['snippet1', 'snippet2']
  };
  
  const group2 = {
    id: 'group2',
    projectId: 'default',
    title: 'Chapter 2',
    color: '#3B82F6',
    position: 1,
    snippetIds: ['snippet3']
  };

  // Sample snippets
  const snippet1 = {
    id: 'snippet1',
    projectId: 'default',
    groupId: 'group1',
    title: 'Opening Scene',
    body: 'The morning light filtered through the window, casting long shadows across the room.',
    words: 12,
    chars: 81,
    tagIds: ['tag1'],
    updatedAt: new Date().toISOString(),
    version: 1
  };

  const snippet2 = {
    id: 'snippet2',
    projectId: 'default',
    groupId: 'group1',
    title: 'Character Introduction',
    body: 'She stood at the edge of the cliff, the wind whipping through her hair.',
    words: 13,
    chars: 68,
    tagIds: ['tag2'],
    updatedAt: new Date().toISOString(),
    version: 1
  };

  const snippet3 = {
    id: 'snippet3',
    projectId: 'default',
    groupId: 'group2',
    title: 'The Journey Begins',
    body: 'The path ahead was long and winding, disappearing into the mist.',
    words: 11,
    chars: 65,
    tagIds: [],
    updatedAt: new Date().toISOString(),
    version: 1
  };

  // Sample tags
  const tag1 = {
    id: 'tag1',
    name: 'Opening',
    color: '#E57A24'
  };

  const tag2 = {
    id: 'tag2',
    name: 'Character',
    color: '#D9534F'
  };

  // Sample notes
  const note1 = {
    id: 'note1',
    projectId: 'default',
    kind: 'person',
    title: 'Sarah',
    body: 'Main protagonist. 28 years old. Works as a journalist.',
    tagIds: [],
    position: 0
  };

  state.groups[group1.id] = group1;
  state.groups[group2.id] = group2;
  state.snippets[snippet1.id] = snippet1;
  state.snippets[snippet2.id] = snippet2;
  state.snippets[snippet3.id] = snippet3;
  state.tags[tag1.id] = tag1;
  state.tags[tag2.id] = tag2;
  state.notes[note1.id] = note1;

  state.project.groupIds = [group1.id, group2.id];
  state.project.tagIds = [tag1.id, tag2.id];
  state.project.noteIds = [note1.id];
  state.project.activeSnippetId = snippet1.id;

  // Render initial UI
  renderStoryList();
  renderEditor();
  renderNotesList();
  updateFooter();
  updateGoalMeter();
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
    headerEl.innerHTML = `
      <div class="group-color-chip" style="background-color: ${group.color}"></div>
      <span class="group-title">${escapeHtml(group.title)}</span>
      <span class="group-snippet-count">${group.snippetIds.length} snippets</span>
    `;
    
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
        saveTimeout = setTimeout(() => {
          note.body = textEl.value;
          renderNotesList();
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

  // After debounce, mark as saved
  typingTimeout = setTimeout(() => {
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

function createNewSnippet() {
  const activeGroupId = state.project.groupIds[0] || null;
  if (!activeGroupId) {
    // Create a default group first
    const groupId = createNewGroup();
    if (!groupId) return;
    activeGroupId = groupId;
  }

  const snippetId = 'snippet_' + Date.now();
  const newSnippet = {
    id: snippetId,
    projectId: 'default',
    groupId: activeGroupId,
    title: 'Untitled Snippet',
    body: '',
    words: 0,
    chars: 0,
    tagIds: [],
    updatedAt: new Date().toISOString(),
    version: 1
  };

  state.snippets[snippetId] = newSnippet;
  state.groups[activeGroupId].snippetIds.push(snippetId);
  state.project.activeSnippetId = snippetId;

  renderStoryList();
  renderEditor();
  updateFooter();
  
  // Focus editor
  document.getElementById('editorContent').focus();
}

function createNewGroup() {
  const groupId = 'group_' + Date.now();
  const colors = ['#E57A24', '#D9534F', '#3B82F6'];
  const color = colors[state.project.groupIds.length % colors.length];
  
  const newGroup = {
    id: groupId,
    projectId: 'default',
    title: 'New Group',
    color: color,
    position: state.project.groupIds.length,
    snippetIds: []
  };

  state.groups[groupId] = newGroup;
  state.project.groupIds.push(groupId);

  renderStoryList();
  return groupId;
}

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

function checkAuth() {
  // Check localStorage first (more reliable)
  const localStorageAuth = localStorage.getItem('yarny_auth');
  
  // Also check cookie
  const cookies = document.cookie.split(';');
  const authCookie = cookies.find(c => c.trim().startsWith('auth='));
  
  if (!localStorageAuth && !authCookie) {
    // Redirect to login if not authenticated
    window.location.href = '/';
  }
}

// ============================================
// Event Listeners
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // Check authentication first
  checkAuth();
  
  // Initialize state
  initializeState();

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

  // Close tag palette on outside click
  document.addEventListener('click', (e) => {
    const palette = document.getElementById('tagPalette');
    const tagsButton = document.getElementById('tagsButton');
    
    if (!palette.contains(e.target) && !tagsButton.contains(e.target) && !palette.classList.contains('hidden')) {
      palette.classList.add('hidden');
    }
  });
});

