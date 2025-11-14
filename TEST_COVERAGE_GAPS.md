# Test Coverage Gaps Analysis

This document identifies areas of the codebase that could benefit from additional test coverage. The analysis was conducted by reviewing existing tests and comparing them against the application's components, hooks, services, and utilities.

## Summary

The codebase has good test coverage in many areas, particularly:
- ✅ E2E tests for major user workflows
- ✅ Component tests for complex UI interactions (modals, color pickers, etc.)
- ✅ Integration tests for API contracts and state management
- ✅ Unit tests for utilities and services

However, there are several areas that could benefit from additional tests:

## High Priority Test Gaps

### 1. Authentication Components & Hooks

**Components:**
- `LoginPage.tsx` - Complex authentication flow with Google Sign-In and local bypass
  - Google Sign-In initialization and error handling
  - Local bypass secret management
  - Error state display
  - Redirect logic after authentication

- `ProtectedRoute.tsx` - Route protection logic
  - Loading state handling
  - Redirect to login when unauthenticated
  - Children rendering when authenticated

**Hooks:**
- `useAuth.ts` - Core authentication hook
  - Token storage and retrieval
  - Login/logout mutations
  - Local bypass authentication
  - Window focus reconciliation
  - Auth state persistence

**Test Scenarios Needed:**
- Successful Google Sign-In flow
- Failed authentication handling
- Local bypass authentication
- Token expiration handling
- Multiple tab synchronization
- Storage errors (privacy mode, quota exceeded)

### 2. Error Handling Components

**Components:**
- `ErrorBoundary.tsx` - React error boundary
  - Error catching and display
  - Reset functionality
  - Development vs production error display

- `RouteErrorBoundary.tsx` - Route-level error handling
  - Chunk load error detection and recovery
  - 404 vs 500 error handling
  - Reload functionality

**Test Scenarios Needed:**
- Component error catching
- Chunk load error recovery
- Network error handling
- Error boundary reset
- Error display in dev vs production

### 3. Network & Offline Functionality

**Components:**
- `OfflineBanner.tsx` - Network status indicator
  - Offline state display
  - Slow connection detection
  - Queued saves display
  - Manual retry functionality

**Hooks:**
- `useNetworkStatus.ts` - Network monitoring
  - Online/offline detection
  - Slow connection detection
  - Connection quality monitoring

**Test Scenarios Needed:**
- Offline state detection
- Slow connection detection (2G, slow-2g)
- Queued saves display and retry
- Network state transitions
- Multiple tab synchronization

### 4. Notes Management

**Components:**
- `NoteEditor.tsx` - Note editing component
  - Autosave functionality
  - Content synchronization
  - Save state management
  - Beforeunload handling

- `NotesSidebar.tsx` - Notes sidebar with drag-and-drop
  - Note creation
  - Note reordering
  - Tab switching
  - Active note selection

**Hooks:**
- `useNotesQuery.ts` - Notes data fetching
- `useNotesMutations.ts` - Notes CRUD operations

**Test Scenarios Needed:**
- Note autosave debouncing
- Note switching with unsaved changes
- Drag-and-drop reordering
- Note creation and deletion
- Tab persistence
- Error handling for failed saves

### 5. Export Functionality

**Hooks:**
- `useExport.ts` - Export to Google Docs or local filesystem
  - Chunking for large exports
  - Progress tracking
  - Error handling
  - File name sanitization

**Test Scenarios Needed:**
- Small export (<500k chars)
- Large export chunking
- Export progress tracking
- Export error handling
- Local vs Drive export
- File name sanitization edge cases

### 6. Story Editor Core

**Components:**
- `StoryEditor.tsx` - Main editor component
  - Snippet switching
  - Content synchronization
  - Conflict detection integration
  - Performance metrics

**Test Scenarios Needed:**
- Snippet switching with unsaved changes
- Editor content synchronization
- Conflict detection integration
- Performance metrics collection
- Large document handling

### 7. Drive Client & API Utilities

**Services:**
- `driveClient.ts` - Drive API client
  - Project listing
  - Story loading
  - JSON primary architecture integration
  - Fallback handling

- `listAllDriveFiles.ts` - Paginated file listing
  - Page token handling
  - Max pages limit
  - Error handling

**Test Scenarios Needed:**
- Paginated file listing
- JSON file reading with fallback
- Project metadata parsing
- Error handling and fallbacks
- Large folder handling

### 8. Utility Functions

**Hooks:**
- `useWordCount.ts` - Word count calculations
  - Single text word count
  - Multiple text aggregation
  - Snippet word count updates

**Test Scenarios Needed:**
- Word count accuracy
- Edge cases (empty strings, special characters)
- Multiple text aggregation
- Performance with large texts

## Medium Priority Test Gaps

### 9. Layout & Navigation Components

**Components:**
- `DocsPage.tsx` - Documentation page
  - Navigation drawer
  - Section scrolling
  - Responsive behavior
  - Uptime status display

- `DriveAuthPrompt.tsx` - Drive authentication prompt
- `EmptyState.tsx` - Empty state display
- `LoadingState.tsx` - Loading state display

**Test Scenarios Needed:**
- Navigation interactions
- Responsive layout behavior
- Empty state display
- Loading state transitions

### 10. Additional Hooks

**Hooks:**
- `useLocalBackups.ts` - Local filesystem backup management
- `useManualSync.ts` - Manual sync functionality
- `useDriveQueries.ts` - Drive query management
- `useStoryMetadata.ts` - Story metadata fetching
- `useStoryMutations.ts` - Story CRUD operations
- `useStoryProgress.ts` - Story progress tracking
- `useVisibilityGatedQueries.ts` - Visibility-based query gating
- `useWindowFocusReconciliation.ts` - Window focus reconciliation

**Test Scenarios Needed:**
- Local backup enable/disable
- Manual sync triggering
- Query visibility gating
- Window focus reconciliation
- Story progress calculations

### 11. Service Worker Integration

**Services:**
- `serviceWorker/registerServiceWorker.ts` - Service worker registration
- `serviceWorker/syncMessageHandler.ts` - Background sync handling

**Test Scenarios Needed:**
- Service worker registration
- Background sync registration
- Message handling
- Offline queue processing

## Low Priority Test Gaps

### 12. Simple Presentational Components

These components are mostly presentational and may not need extensive testing:
- `AppFooter.tsx`
- `RouteLoader.tsx`
- Various simple display components

However, accessibility tests and basic rendering tests could still be valuable.

## Recommended Test Priorities

1. **Critical Path Tests** (High Priority):
   - Authentication flow (`LoginPage`, `useAuth`, `ProtectedRoute`)
   - Error boundaries (`ErrorBoundary`, `RouteErrorBoundary`)
   - Network/offline handling (`OfflineBanner`, `useNetworkStatus`)

2. **Core Functionality Tests** (High Priority):
   - Notes management (`NoteEditor`, `NotesSidebar`, related hooks)
   - Export functionality (`useExport`)
   - Story editor core (`StoryEditor`)

3. **Integration Tests** (Medium Priority):
   - Drive client (`driveClient`, `listAllDriveFiles`)
   - Service worker integration
   - Local backup functionality

4. **Edge Cases & Error Handling** (Medium Priority):
   - All error scenarios
   - Network failures
   - Storage quota exceeded
   - Large data handling

## Testing Recommendations

1. **Component Tests**: Use React Testing Library for component tests focusing on user interactions and accessibility.

2. **Hook Tests**: Test hooks in isolation using `@testing-library/react-hooks` or similar, mocking dependencies.

3. **Integration Tests**: Use MSW (Mock Service Worker) for API mocking, as already established in the codebase.

4. **E2E Tests**: Add Playwright tests for critical user flows that aren't yet covered.

5. **Error Scenarios**: Ensure all error paths are tested, including network failures, API errors, and edge cases.

6. **Accessibility**: Add accessibility tests for new components using `@testing-library/jest-dom` and `jest-axe`.

## Notes

- The codebase already has good test infrastructure with Vitest, React Testing Library, Playwright, and MSW.
- Many components have E2E coverage but lack unit/integration tests for edge cases.
- Focus on testing behavior rather than implementation details.
- Consider adding visual regression tests for UI components if not already covered.

