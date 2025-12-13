# Local Save Feature Plan

**Date**: 2025-11-08  
**Last Updated**: 2025-01-XX  
**Status**: ✅ Implemented  
**Owners**: Frontend Platform (React migration)  
**Goal**: Allow users to opt into saving their Yarny stories to a local folder that mirrors the existing Google Drive hierarchy, enabling offline work and unblock testing when Google Auth is unavailable.

## Quick Status Summary

✅ **Core feature is implemented and functional**
- Settings UI available in Settings → Storage
- File System Access API integration complete
- Auto-save mirroring integrated into all mutation hooks
- Comprehensive test coverage (unit/integration)
- Error handling and permission management implemented

⚠️ **Future enhancements possible**
- E2E tests for local backup workflows
- Feature flag for gradual rollout
- Enhanced telemetry/event logging
- Encryption option for sensitive projects

See [Section 9: Implementation Status](#9-implementation-status) for detailed breakdown.

---

## 1. Objectives & Guardrails

- **Primary objective**: When enabled, every story/note/metadata write that currently targets Drive also writes to an equivalent local file structure.
- **Opt-in**: Setting is disabled by default; user must explicitly choose a local root directory.
- **Parity with Drive**: Folder and file naming mirrors Drive schema (stories, snippets, notes, metadata, attachments), including deletion flows (chapters/snippets delete immediately; story deletes respect the existing `DELETE` confirmation modal).
- **Browser scope**: Initial launch targets Chromium-based browsers with File System Access API support; all other browsers see the disabled toggle with fallback messaging.
- **Security & privacy**: All file system interactions stay within directories explicitly granted by the user. No automatic expansion beyond granted scope.
- **Progressive enhancement**: Feature gracefully degrades on browsers that lack the File System Access API or similar capabilities.
- **Testing unblock**: Provide deterministic local fixtures for integration/e2e tests without requiring Google Auth.

---

## 2. User Experience Flow

1. User opens `Settings → Storage` tab (new UI subsection).
2. Toggle `Enable Local Story Backups` on.
3. App prompts for a root folder using File System Access API (`showDirectoryPicker`).
4. After consent, app remembers the directory handle (persisted via IndexedDB using Storage Foundation).
5. Auto-save pipeline writes to Drive and, on success/failure, mirrors data locally. Errors surface in save status toast/banner.
6. User can `Open Local Folder` from settings to inspect files or `Disconnect` to revoke access.

Fallback: If API unsupported, toggle is disabled with explanatory tooltip and link to docs.

---

## 3. Architecture Overview

### 3.1 Settings & State
- Extend Zustand store in `src/store/settingsStore.ts` (or create `src/store/localBackupSlice.ts` if not present).
- Persist:
  - `localBackupsEnabled: boolean`
  - `localRootHandle: FileSystemDirectoryHandle | null`
  - `lastSyncedAt: string | null`
  - `errorState: { code, message } | null`
- Use `idb-keyval` or existing storage abstraction to serialize directory handles (`FileSystemHandle` must be stored via `structuredClone`). Gate behind feature detection.

### 3.2 File System Access Abstraction
- Create `src/services/localFs/` with:
  - `LocalFsCapability.ts` – feature detection and permission helpers.
  - `LocalFsRepository.ts` – methods `ensureStructure`, `writeStory`, `writeMetadata`, `writeNote`, `deleteEntry`.
  - `LocalFsPathResolver.ts` – maps Yarny entities to relative paths (reuse Drive naming conventions from `drivePathBuilder.ts`).
- Ensure `ensureStructure` mirrors existing Drive layout (Stories, Notes/People|Places|Things, Metadata, Attachments).
- Provide fallbacks (no-op) if capability unavailable.

### 3.3 Integration Points
- `useAutoSave.ts`: After Drive write resolves, invoke `localFsRepository.writeStory`.
  - On Drive failure but local success, surface warning.
  - On both failure, escalate error (existing conflict detection should still run).
- `useNotesMutation`, `useMetadataMutation`, etc.: extend to call local FS methods in parallel (including mirrored deletions so local state stays in lockstep with Drive).
- Create a shared helper (`mirrorDriveWrite`) to reduce duplication.
- Hook into initial load: if local backup enabled, call `ensureStructure` and pre-flight permission check on mount.

### 3.4 Permissions Lifecycle
- Permissions can be revoked externally. Before each write:
  - Check `queryPermission({ mode: "readwrite" })`.
  - If denied, flip `localBackupsEnabled` to false and notify user.
- Add background watcher (on app focus) to re-validate permissions.
- Provide manual `Reconnect` flow in settings.

---

## 4. Data & File Layout

- Root/
  - `stories/{storyId}/story.md`
  - `stories/{storyId}/metadata.json`
  - `stories/{storyId}/notes/{noteId}.md`
  - `stories/{storyId}/snippets/{snippetId}.md`
  - `assets/{storyId}/{attachmentId}` (binary via `createWritable`)
  - `index/index.json` (optional aggregated manifest to speed selectors)
- Maintain same UUIDs and naming as Drive exporter. Reuse slug/ID helpers from `src/utils/driveSlug.ts` (verify actual name).
- Ensure newline + encoding parity (`utf-8`).

---

## 5. Settings UI Deliverables

- New `StorageSettingsSection` component in `src/components/settings/`.
- Toggle component, descriptive copy, feature unavailable banner.
- CTA buttons: `Choose Folder`, `Open Folder`, `Disconnect`.
- Save status indicator showing last sync time or error.
- Analytics events (if instrumentation exists) for enable/disable, errors.

---

## 6. Testing Strategy

- **Unit**: Mock File System Access API to cover repository methods and permission edge cases.
- **Integration**: Extend `useAutoSave` tests to assert dual-write behavior. Add tests for settings store serialization.
- **E2E**: Playwright scenario using `browserContext.overridePermissions` to simulate directory access where supported.
- **Manual QA**: New checklist documenting enabling, writing, revoking, re-enabling (coordinate with `testing-workbook.html` phases and React migration smoke tests).
- **Regression**: Ensure Drive-only workflow unaffected when backups disabled.
- **Test corpus parity**: Seeded local corpus must match the size/edge-case coverage defined in `test-corpus/README.md` (small/medium/large projects, RTL/CJK/emoji snippets, large chapter export fixture).

---

## 7. Rollout & Observability

- Feature flag via environment-configurable toggle (e.g., `REACT_APP_ENABLE_LOCAL_BACKUPS`).
- Ship behind beta flag for internal testers first. Provide fallback local stub environment.
- Logging: send structured events to existing telemetry (`useEventLogger`).
- Error reporting: wrap local FS operations with `try/catch` and report to Sentry with sanitized paths.

---

## 8. Open Questions & Follow-Ups

1. ✅ **Browser support**: Currently Chrome/Edge-only (File System Access API). Progressive enhancement implemented - feature unavailable in unsupported browsers with clear messaging.
2. ⚠️ **Encryption at rest**: Not implemented - files are stored as plain text (matches Drive behavior for readability).
3. ⚠️ **Large binary attachments**: Basic attachment support exists via `writeAttachment()` but size limits/chunking not explicitly implemented.
4. ✅ **UX copy**: Settings UI includes descriptive copy and error messaging.

### Future Enhancements

- Consider adding encryption option for sensitive projects
- Add attachment size limits and chunking for large files
- Implement app focus-based permission revalidation
- Add E2E tests for local backup workflows
- Consider feature flag for gradual rollout

---

## 9. Implementation Status

### ✅ Completed Deliverables

- [x] **Capability detection & permission management utilities**
  - Implemented in `src/services/localFs/LocalFsCapability.ts`
  - Feature detection via `isFileSystemAccessSupported()`
  - Permission helpers: `requestDirectoryHandle()`, `ensureDirectoryPermission()`, `queryDirectoryPermission()`

- [x] **Local FS repository mirroring Drive structure**
  - Implemented in `src/services/localFs/LocalFsRepository.ts`
  - Methods: `writeStoryDocument()`, `writeDataJson()`, `writeProjectJson()`, `writeGoalJson()`, `writeSnippet()`, `writeNote()`, `deleteEntry()`
  - Path resolution in `src/services/localFs/LocalFsPathResolver.ts`
  - Directory structure mirrors Drive layout (stories, notes, snippets, metadata, attachments)

- [x] **Zustand store updates + persistence layer**
  - Implemented in `src/store/localBackupStore.ts` and `src/store/localBackupProvider.tsx`
  - State: `enabled`, `isSupported`, `permission`, `rootHandle`, `repository`, `error`, `lastSyncedAt`, `refreshStatus`
  - Directory handle persisted via IndexedDB using `structuredClone`
  - Enabled preference persisted in localStorage

- [x] **Settings UI with opt-in/out flow**
  - Implemented in `src/components/settings/StorageSettingsSection.tsx`
  - Toggle for enabling/disabling backups
  - "Choose Folder", "Open Folder", and "Disconnect" buttons
  - Status indicators for last sync time, errors, and refresh status
  - Support detection with fallback messaging

- [x] **Auto-save and mutation pipelines writing to local FS**
  - Mirror functions in `src/services/localFs/localBackupMirror.ts`
  - `mirrorSnippetWrite()` - mirrors snippet content writes
  - `mirrorStoryDocument()` - mirrors story document writes
  - `refreshAllStoriesToLocal()` - full refresh of all stories
  - Integrated into `useAutoSave.ts` hook
  - Integrated into mutation hooks: `useStoryMutations.ts`, `useSnippetMutations.ts`, `useChapterMutations.ts`, `useNotesMutations.ts`
  - Hook `useLocalBackups()` in `src/hooks/useLocalBackups.ts` provides UI integration

- [x] **Tests (unit/integration)**
  - `src/hooks/useLocalBackups.test.tsx` - Hook tests (260 lines, comprehensive coverage)
  - `src/components/settings/StorageSettingsSection.test.tsx` - UI component tests
  - `src/services/localFs/localBackupMirror.test.ts` - Mirror service tests
  - `src/store/localBackupProvider.test.tsx` - Store provider tests
  - `src/hooks/useAutoSave.persistence.test.tsx` - Auto-save integration tests include local backup mirroring

- [x] **Error handling**
  - Error state management in store
  - Error messages displayed in UI
  - Permission errors handled gracefully
  - DOMException handling for file system errors

### ⚠️ Partial Implementation

- [ ] **E2E tests**
  - Playwright E2E tests not yet implemented for local backup feature
  - Manual QA documented but could be expanded

- [ ] **Telemetry/Event logging**
  - Error reporting exists but structured telemetry events may not be fully implemented
  - Consider integrating with `useEventLogger` if available

- [ ] **Feature flag**
  - No environment-configurable toggle found (e.g., `REACT_APP_ENABLE_LOCAL_BACKUPS`)
  - Feature is always available when browser supports File System Access API

- [ ] **Test corpus generation**
  - Deterministic local test corpus generation not explicitly implemented
  - Could leverage repository APIs for test corpus creation

### 📝 Implementation Notes

- **File Structure**: The implementation follows the planned structure:
  - `stories/{storyId}/` - Story documents, metadata, notes, snippets
  - Mirrors Drive naming conventions via `LocalFsPathResolver`
  - UTF-8 encoding with proper MIME types (text/markdown, application/json)

- **Permission Lifecycle**: 
  - Permissions checked before writes
  - Permission state tracked in store
  - Manual refresh available via `refreshPermission()`
  - App focus-based permission revalidation could be added

- **Integration Approach**:
  - Mirroring happens after Drive writes (not in parallel)
  - Errors are tracked but don't block Drive saves
  - Manual refresh available via Settings UI

## 10. Deliverable Checklist (Historical Reference)

- [x] Capability detection & permission management utilities.
- [x] Local FS repository mirroring Drive structure.
- [x] Zustand store updates + persistence layer.
- [x] Settings UI with opt-in/out flow.
- [x] Auto-save and mutation pipelines writing to local FS.
- [x] Tests (unit/integration) and manual QA checklist.
- [x] Error handling and basic observability.
- [ ] E2E tests (Playwright scenarios).
- [ ] Telemetry/event logging integration.
- [ ] Environment feature flag.
- [ ] Generate deterministic local test corpus via repository APIs.

