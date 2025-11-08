# Local Save Feature Plan

**Date**: 2025-11-08  
**Owners**: Frontend Platform (React migration)  
**Goal**: Allow users to opt into saving their Yarny stories to a local folder that mirrors the existing Google Drive hierarchy, enabling offline work and unblock testing when Google Auth is unavailable.

---

## 1. Objectives & Guardrails

- **Primary objective**: When enabled, every story/note/metadata write that currently targets Drive also writes to an equivalent local file structure.
- **Opt-in**: Setting is disabled by default; user must explicitly choose a local root directory.
- **Parity with Drive**: Folder and file naming mirrors Drive schema (stories, snippets, notes, metadata, attachments).
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
- `useNotesMutation`, `useMetadataMutation`, etc.: extend to call local FS methods in parallel.
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
- **Manual QA**: New checklist documenting enabling, writing, revoking, re-enabling.
- **Regression**: Ensure Drive-only workflow unaffected when backups disabled.

---

## 7. Rollout & Observability

- Feature flag via environment-configurable toggle (e.g., `REACT_APP_ENABLE_LOCAL_BACKUPS`).
- Ship behind beta flag for internal testers first. Provide fallback local stub environment.
- Logging: send structured events to existing telemetry (`useEventLogger`).
- Error reporting: wrap local FS operations with `try/catch` and report to Sentry with sanitized paths.

---

## 8. Open Questions & Follow-Ups

1. Browser support expectations? Chrome-only initially or require polyfill?
2. Should local files be encrypted at rest?
3. Do we sync deletions (two-way) or only mirror writes? Plan assumes one-way mirror.
4. How do we handle large binary attachments (size cap? chunking?).
5. Need UX copy review for settings explanations.

---

## 9. Deliverable Checklist

- [ ] Capability detection & permission management utilities.
- [ ] Local FS repository mirroring Drive structure.
- [ ] Zustand store updates + persistence layer.
- [ ] Settings UI with opt-in/out flow.
- [ ] Auto-save and mutation pipelines writing to local FS.
- [ ] Tests (unit/integration/e2e) and manual QA checklist.
- [ ] Telemetry, error handling, and rollout flag.

