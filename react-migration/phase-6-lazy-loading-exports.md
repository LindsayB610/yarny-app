# Phase 6: Lazy Loading & Exports (Week 4)

## Checklist
- [x] Implement lazy loading using React Query prefetching and `useQueries` (visibility-gated) - **Implemented and prefetching integrated** (full visibility gating ready when snippet list components are built)
- [x] Implement auto-save functionality using React Query mutations (visibility-gated) - **Complete and integrated**
- [x] **JSON Primary Architecture**: Auto-save now uses JSON-first saves (<50ms) with background sync to Google Docs via Service Worker
- [x] Build offline/spotty-network semantics: network status hook, offline banner, queued saves, save status updates - **Complete and integrated**
- [x] Implement export functionality with chunked writes for large chapters - **Complete and integrated**
- [x] Implement chunked export logic for chapters exceeding `batchUpdate` body limits - **Complete**
- [x] Add progress indication for chunked exports - **Complete and integrated**
- [ ] Run full smoke test suite on small and medium projects
- [ ] Validate all operations work correctly (including conflict resolution from Phase 5)
- [ ] Populate large project (`test-large`) with very large chapter (50+ snippets)
- [ ] Test export of very large chapter to validate chunking

## Deliverables
- Visibility-aware loading and saving behaviors with resilient offline handling.
- Chunked export system validated against large project corpus and instrumented with user feedback.
- Smoke test evidence across small, medium, and large corpora demonstrating stability.

## Level of Effort
- Estimated 16–23 hours covering lazy loading, offline semantics, export chunking, and smoke test execution.

## Risk Checkpoint Focus
- Re-rate editor/Docs round-tripping, Drive quotas, and large-scale performance risks.
- Verify export chunking succeeds for large chapters and conflict resolution remains stable under network variability.

## Notes & References
- Reuse conflict detection hooks from Phase 5 within offline queuing paths.
- Capture metrics from smoke tests to feed Phase 7 performance and regression baselines.

## Implementation Summary

### Hooks Created
1. **useNetworkStatus.ts** - Monitors network status (online/offline, slow connection)
2. **useAutoSave.ts** - Visibility-gated auto-save with offline queuing support
3. **useVisibilityGatedQueries.ts** - Lazy loading of snippets using Intersection Observer
4. **useExport.ts** - Export functionality with chunking for large documents

### Components Created
1. **OfflineBanner.tsx** - Displays offline/slow connection status and queued saves
2. **ExportProgressDialog.tsx** - Progress dialog for chunked exports

### Features Implemented

#### Lazy Loading
- Visibility-gated snippet loading using Intersection Observer
- Prefetching of first 3 snippets for immediate display
- 200px margin before viewport to start loading early
- React Query integration with proper caching

#### Auto-Save (JSON Primary Architecture)
- JSON-first saves (<50ms) via `.{snippetId}.yarny.json` files
- Background sync to Google Docs via Service Worker + Background Sync API
- Debounced auto-save (default 2 seconds)
- Visibility change detection (saves when tab becomes hidden)
- Before unload handling (queues saves when page closes)
- Manual save function available
- Tracks unsaved changes state
- Sync status indicator in editor footer (Synced/Syncing/Pending/Failed)

#### Offline Support
- Network status detection (online/offline, slow connection)
- Queued saves stored in localStorage
- Automatic retry when connection restored
- Manual retry button in offline banner
- Cross-tab synchronization via storage events

#### Export with Chunking
- Automatic chunking for large documents (>500k characters per chunk)
- Progress tracking with chunk information
- Sequential chunk writing for Google Docs
- Error handling and recovery
- Progress dialog with visual feedback

### Integration Points
- **OfflineBanner** integrated into `AppLayout.tsx`
- Hooks ready for integration into snippet editing components
- Export hook ready for use in export UI components

### Integration Complete
- ✅ **useAutoSave** integrated into `StoryEditor.tsx`
  - Auto-saves editor content to JSON files first (<50ms), then syncs to Google Docs in background
  - Shows sync status in UI via sync status indicator ("Synced", "Syncing...", "Pending", "Failed")
  - Handles offline queuing automatically (queues JSON saves, syncs when online)
  - Saves on visibility change and before unload
  - Background sync continues even if page is closed (via Service Worker)

- ✅ **useExport** integrated into `StoryEditor.tsx`
  - Export menu button added to editor header
  - Export Chapters functionality with progress dialog
  - Chunked export for large documents
  - Progress tracking with visual feedback

- ✅ **useVisibilityGatedSnippetQueries** integrated into `StoryEditor.tsx`
  - Prefetching integrated (prefetches first 3 snippets)
  - Hook ready for full visibility gating when snippet list components are built
  - Will automatically enable full lazy loading when snippet DOM elements are available

- ✅ **OfflineBanner** integrated into `AppLayout.tsx`
  - Shows offline/slow connection status
  - Displays queued saves count
  - Manual retry button when online

### Lazy Loading Integration Status
- **useVisibilityGatedQueries**: Hook is implemented and ready
  - **Prefetching**: Can be integrated now to prefetch first 3 snippets (doesn't require DOM elements)
  - **Full visibility gating**: Requires snippet list components with individual DOM elements
  - **Current state**: NotesSidebar exists but snippet lists are placeholders
  - **Integration approach**: 
    - Prefetching can be added to StoryEditor or NotesSidebar now
    - Full visibility gating will be integrated when snippet list components are built out

### Next Steps for Testing
- Test with large projects (50+ snippets) to validate chunking
- Run smoke tests on small, medium, and large projects
- Validate conflict resolution works with offline queuing
- Test export functionality with very large chapters

