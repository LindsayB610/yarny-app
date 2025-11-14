# JSON Primary Architecture Implementation Plan

**Date**: 2025-01-XX  
**Status**: ✅ Complete  
**Goal**: Migrate from direct Google Doc saves to JSON primary with background sync

## Architecture Overview

### Current System
- Editor saves directly to Google Docs via `useAutoSave`
- Each save requires multiple API calls (token refresh + get doc + batchUpdate)
- Slow saves (500ms-2s+), rate limiting risk, complex error handling

### New System
- **Primary**: Save to JSON files (`.{snippetId}.yarny.json`) - fast (<50ms)
- **Background**: Sync JSON → Google Docs via Service Worker + Background Sync API
- **Fallback**: Netlify Background Function for browsers without Service Worker support
- **Conflict Detection**: Check Google Doc `modifiedTime` on load, compare content if newer

## File Structure

### JSON Files
- **Snippet Content**: `.{snippetId}.yarny.json` (in chapter folder or story folder)
  ```json
  {
    "content": "...",
    "modifiedTime": "2025-01-15T10:30:00Z",
    "version": 1,
    "gdocFileId": "abc123",
    "gdocModifiedTime": "2025-01-15T10:25:00Z"
  }
  ```

### Existing Files (Unchanged)
- `project.json` - Story metadata
- `data.json` - Story structure (chapters, snippets metadata)
- `goal.json` - Goal tracking

## Implementation Phases

### Phase 1: Core JSON Storage ✅
- [x] Create `jsonStorage` service (`src/services/jsonStorage/`)
- [x] JSON file save/read utilities
- [x] Content comparison utilities

### Phase 2: Update Auto-Save ✅
- [x] Update `useAutoSave` to save to JSON files
- [x] Queue Google Doc sync (background)
- [x] Maintain backward compatibility during migration

### Phase 3: Background Sync Infrastructure ✅
- [x] Service Worker with Background Sync API
- [x] Netlify Background Function fallback
- [x] Smart batching (5s window, 10 files per batch, queue unlimited)

### Phase 4: Conflict Detection ✅
- [x] Check Google Doc `modifiedTime` on snippet load
- [x] Check on visibility change
- [x] Content diff (normalize both before comparing)
- [x] Update conflict modal for JSON primary

### Phase 5: Migration System ✅
- [x] One-time migration (all stories on first app load)
- [x] Progress bar UI
- [x] Error handling with manual retry

### Phase 6: UI Updates ✅
- [x] Sync status indicator (editor footer)
- [x] Manual sync button (per-story level)
- [x] Error notifications

### Phase 7: Cleanup ✅
- [x] Code cleanup (old paths kept for fallback where needed)
- [x] Update all tests
- [x] Documentation

## Key Decisions

1. **JSON Primary**: JSON files are source of truth, Google Docs are outputs
2. **File Naming**: `.{snippetId}.yarny.json` (hidden files, IDs stable)
3. **Sync Frequency**: Idle (30s) + page close
4. **Conflict Resolution**: Show modal (preserve current UX)
5. **Migration**: All stories on first load with progress bar
6. **Browser Support**: Service Worker + Netlify Background Function fallback
7. **Batch Size**: 10 files per batch, queue unlimited
8. **Google Docs**: Keep forever (they're outputs)

## Testing Strategy

- Unit tests for JSON storage utilities
- Integration tests for save → sync → load cycle
- E2E tests for background sync, conflict detection, migration
- Update existing tests for JSON primary architecture

