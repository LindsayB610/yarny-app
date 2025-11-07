# React Migration Gap Analysis

**Date**: 2025-01-XX  
**Purpose**: Identify incomplete or incorrectly completed aspects of the React migration plan

## Executive Summary

This document compares the requirements in `REACT_MIGRATION_PLAN.md` against the **actual codebase implementation**. It identifies:
- Incomplete checklist items
- Missing deliverables
- Unmet success criteria
- Critical gaps that need attention
- Components/hooks that exist but aren't integrated
- Tests that exist but don't validate requirements

## Methodology

This analysis is based on:
1. **Codebase exploration** - Actual files, components, hooks, tests
2. **Integration verification** - Whether components are actually used
3. **Test coverage review** - Whether tests validate requirements
4. **Configuration checks** - Deployment, build, and infrastructure setup

---

## Phase 1: Setup & Infrastructure

### ✅ Completed (Verified in Codebase)
- React + TypeScript + Vite setup (`vite.config.ts`, `tsconfig.json`)
- TypeScript configuration (multiple tsconfig files)
- Netlify build configuration (`netlify.toml`)
- Library installation and configuration (`package.json`)
- TanStack Query setup (`src/app/queryClient.ts`, `src/app/providers/AppProviders.tsx`)
- Drive I/O hooks created (`src/hooks/useDriveQueries.ts`)
- TipTap plain text configuration (`src/editor/plainTextEditor.ts`)
- Text extraction utilities (`src/editor/textExtraction.ts`)
- Component structure (`src/components/`)
- Zustand state management (`src/store/`)
- Normalized state structure (`src/store/types.ts`)
- Selectors (`src/store/selectors.ts`)
- MUI theme customization (`src/theme/`)
- Test corpus folder structure (`test-corpus/`)

### ❌ Missing/Incomplete
- [ ] **Definition of Done**: Verify TanStack Query is used for **ALL** Drive I/O operations - Need to audit all API calls to ensure none bypass React Query
- [ ] **Definition of Done**: API contract formalization with Zod schemas - **PARTIALLY COMPLETE** - Zod schemas exist (`src/api/contract.ts`) and are used in API client (`src/api/client.ts`), but need to verify ALL API calls use validation
- [ ] **Smoke test checklist execution** - Test corpus exists but smoke tests not executed
- [ ] **Test corpus population** - Only `test-small` exists; `test-medium` and `test-large` not populated

---

## Phase 2: Authentication, Router & API Contract

### ✅ Completed (Verified in Codebase)
- React Router with TypeScript (`src/app/routes.tsx`)
- Routing structure with loaders (`src/app/loaders.ts`)
- Route loaders with React Query prefetching
- API contract module with Zod schemas (`src/api/contract.ts` - comprehensive schemas)
- Typed API client (`src/api/client.ts` - uses Zod validation)
- Netlify Functions converted to TypeScript (all `.ts` files exist)
- Login page converted to React (`src/components/auth/`)
- Google Sign-In SDK integration
- Auth context/provider (`src/hooks/useAuth.ts`)
- Auth state and redirects
- Window focus reconciliation hook (`src/hooks/useWindowFocusReconciliation.ts`)

### ❌ Missing/Incomplete
- [ ] **Verification needed**: Confirm API contract definitions are enforced in ALL Netlify Functions (some may still use unvalidated data)

---

## Phase 3: Stories Page with Virtualization Stub

### ✅ Completed (Verified in Codebase)
- Stories list converted to React (`src/components/stories/`)
- Search/filtering implemented
- Modals (new story, delete confirmation)
- Drive API hooks integration
- Virtualization infrastructure (`@tanstack/react-virtual` installed, `src/components/stories/VirtualizedStoryList.tsx` exists)

### ❌ Missing/Incomplete
- [ ] **Virtualization is STUBBED, not implemented** - `VirtualizedStoryList.tsx` is a placeholder with TODO comments, not actually using virtualization
- [ ] **Test story management** - Checklist item not completed
- [ ] **Validation needed**: Search and modal behavior against classic UX anchors

---

## Phase 4: Editor – Tri-Pane Shell & Plain Text Round-Trip

### ✅ Completed (Verified in Codebase)
- Three-column layout (`src/components/layout/AppLayout.tsx`)
- Story list sidebar converted (`src/components/navigation/StoryList.tsx`)
- Notes sidebar with tabs (`src/components/story/NotesSidebar.tsx` - but placeholder content)
- Footer word/character counts (`src/components/story/EditorFooter.tsx`)
- Save status display (integrated in `StoryEditor.tsx`)
- TipTap editor with plain text configuration (`src/editor/plainTextEditor.ts`)
- TipTap integrated with conflict detection (`src/components/story/StoryEditor.tsx`)
- Editor as truth (authoritative while open) - logic exists in `StoryEditor.tsx`
- Basic editor functionality

### ❌ Missing/Incomplete (Critical)
- [ ] **NotesSidebar is a placeholder** - Shows "People notes will appear here" etc., not actually displaying notes
- [ ] **Test round-tripping with Google Docs** - **CRITICAL** - No tests found for round-trip validation
- [ ] **Run smoke tests on small project (`test-small`)** - Not executed
- [ ] **Validate round-tripping with small project** - Not done
- [ ] **Populate medium project (`test-medium`)** - Not done
- [ ] **Classic UX anchors visual parity check**: Goal meter, "Today" chip, footer counts (pixel diff or side-by-side comparison) - **REQUIRED before closing editor phase, NOT DONE**
- [ ] **Success Criteria**: Visual parity side-by-side `/react` vs. root checks - **NOT DONE**
- [ ] **Deployment to `/react` path** - `netlify.toml` shows catch-all to `/index.html`, no `/react` path configured for parallel deployment

---

## Phase 5: Library Features & Goals UI

### ✅ Completed (Verified in Codebase)
- Drag & drop with `@dnd-kit` (components created: `SortableChapterList.tsx`, `SortableSnippetList.tsx`)
- Color picker integrated (`ColorPicker.tsx`)
- Context menus built (`ContextMenu.tsx`)
- All modals converted to Material UI Dialog (multiple modal components)
- Tabs using Material UI Tabs (`StoryTabs.tsx`)
- Goals UI: goal meter (`GoalMeter.tsx`) and goal panel modal (`GoalsPanelModal.tsx`)
- "Today • N" chip (`TodayChip.tsx`)
- Word count updates wired (`useWordCount.ts`)
- Conflict detection hooks created (`useConflictDetection.ts`)
- Conflict resolution UI and modal (`ConflictResolutionModal.tsx`)
- **GoalMeter and TodayChip are integrated** (`StorySidebarHeader.tsx`)

### ❌ Missing/Incomplete (Critical)
- [ ] **SortableChapterList and SortableSnippetList may not be integrated** - Need to verify they're actually used in the UI
- [ ] **Test cross-edits**: Edit in Google Docs while Yarny is idle, return and verify conflict detection works - **CRITICAL** - No tests found
- [ ] **Success Criteria**: Concurrency safety - Conflicts surfaced for Docs edits and second Yarny tabs - **NOT TESTED**
- [ ] **Success Criteria**: Round-trip integrity - Paragraphs and soft line breaks round-trip without collapse/duplication - **NOT TESTED**

---

## Phase 6: Lazy Loading & Exports

### ✅ Completed (Verified in Codebase)
- Lazy loading hooks created (`useVisibilityGatedQueries.ts`)
- Auto-save functionality (`useAutoSave.ts` - **INTEGRATED in StoryEditor.tsx**)
- Offline/spotty-network semantics (`useNetworkStatus.ts`, `OfflineBanner.tsx` - **INTEGRATED in AppLayout.tsx**)
- Export functionality with chunking (`useExport.ts` - **INTEGRATED in StoryEditor.tsx`)
- Chunked export logic
- Progress indication (`ExportProgressDialog.tsx`)

### ❌ Missing/Incomplete
- [ ] **Full visibility gating not active** - `useVisibilityGatedSnippetQueries` is integrated but prefetching only; full visibility gating requires snippet list DOM elements which don't exist yet (NotesSidebar is placeholder)
- [ ] **Run full smoke test suite on small and medium projects** - Not executed
- [ ] **Validate all operations work correctly** (including conflict resolution) - Not done
- [ ] **Populate large project (`test-large`) with very large chapter (50+ snippets)** - Not done
- [ ] **Test export of very large chapter to validate chunking** - Not done

---

## Phase 7: Accessibility, Performance & Polish

### ✅ Completed (Verified in Codebase)
- Keyboard navigation for @dnd-kit (components have keyboard support)
- Visible focus rings (theme customization exists)
- ARIA labels and roles (components have ARIA attributes)
- Contrast checking utility created (`src/utils/contrastChecker.ts`)
- Performance metrics hook created (`src/hooks/usePerformanceMetrics.ts`)

### ❌ Missing/Incomplete (Many Critical Items)

#### Performance (Critical)
- [ ] **usePerformanceMetrics is NOT integrated into StoryEditor** - Hook exists but not imported/used in `StoryEditor.tsx`
- [ ] **Performance budgets not validated** - Performance tests exist (`tests/e2e/performance.spec.ts`) but may not be comprehensive
- [ ] **Review and optimize memoization** - Not done
- [ ] **Verify @tanstack/react-virtual is properly implemented** - It's NOT implemented, only stubbed
- [ ] **Profile with React DevTools** - Not done

#### Visual Parity (Critical - Required Before Closing Phase 4)
- [ ] **Side-by-side comparison of React vs legacy components** - **NOT DONE**
  - GoalMeter
  - TodayChip
  - EditorFooter
- [ ] **Document visual differences with screenshots** - **NOT DONE**
- [ ] **Deploy to `/react` path for comparison** - `netlify.toml` doesn't configure `/react` path

#### Accessibility
- [ ] **Verify keyboard-only flows** for create, rename, reorder, export tasks - Manual testing needed
- [ ] **Screen reader testing** - Manual testing needed
- [ ] **Verify all 12 accent colors meet contrast requirements** on actual backgrounds - Utility exists but not run against actual UI
- [ ] **Success Criteria**: Keyboard-only completion of core tasks - **NOT VERIFIED**

#### Testing
- [ ] **Run contrast checker against actual UI backgrounds** - Not done
- [ ] **Set up Playwright performance tests** - Basic tests exist but may not be comprehensive
- [ ] **Create visual regression test suite** - Basic visual regression tests exist (`tests/e2e/visual-regression.spec.ts`) but don't compare against legacy app

#### Documentation
- [ ] **Document accessibility improvements** - Not done
- [ ] **Document performance metrics and budgets** - Not done
- [ ] **Create accessibility testing checklist** - Not done

---

## Phase 8: Test Automation

### ✅ Completed (Verified in Codebase)
- Testing infrastructure set up (Playwright, React Testing Library, Vitest in `package.json`)
- Mock Google Drive API server with MSW (`tests/setup/msw-handlers.ts`, `tests/setup/msw-server.ts`)
- Test data fixtures (`tests/utils/test-fixtures.ts`)
- Component-level test coverage (some tests exist: `GoalMeter.test.tsx`, `ColorPicker.test.tsx`, `ContextMenu.test.tsx`)
- Integration tests (`tests/integration/`)
- End-to-end tests (`tests/e2e/` - auth, editor, performance, stories, visual-regression)
- Visual regression tests (`tests/e2e/visual-regression.spec.ts`)
- Performance tests (`tests/e2e/performance.spec.ts`)
- CI/CD integration (mentioned in phase file)

### ❌ Missing/Incomplete

#### Component-Level Tests
- [ ] **Search filtering and highlighting** - No tests found
- [ ] **Drag & drop operations** - No tests found using `@testing-library/user-event`

#### Integration Tests
- [ ] **Conflict detection logic** - No tests found
- [ ] **Format normalization** - No tests found
- [ ] **Session persistence** - No tests found

#### End-to-End Tests
- [ ] **Chapter/snippet management** - Basic editor tests exist but not comprehensive
- [ ] **Color coding flows** - No tests found
- [ ] **Search across chapters/snippets/content** - No tests found
- [ ] **Goals setup and validation** (elastic/strict) - No tests found
- [ ] **Notes CRUD** (People/Places/Things) - No tests found (NotesSidebar is placeholder anyway)
- [ ] **Export workflows** (content structure validation) - No tests found
- [ ] **Conflict resolution scenarios** - **CRITICAL** - No tests found
- [ ] **Round-tripping validation** - **CRITICAL** - No tests found
- [ ] **Visibility-based request gating** - No tests found
- [ ] **Rate limiting handling** (429 backoff) - No tests found

#### Performance Tests
- [ ] **Large story performance** (25+ chapters, 200+ snippets) - Tests exist but may not cover large scale
- [ ] **Lazy loading behavior** - No tests found
- [ ] **Virtualization thresholds** - No tests found (virtualization not implemented anyway)

#### Visual Regression Tests
- [ ] **Visual regression tests don't compare against legacy app** - Tests take screenshots but don't compare side-by-side with legacy app at root path
- [ ] **No pixel-diff comparison with legacy app** - Tests are self-referential only

#### Test Data Management
- [ ] **Provide reset utilities** - Not found

#### Success Criteria
- [ ] **Update manual testing checklist post-automation** - Not done

---

## Overall Success Criteria (From Plan)

### Must Have (MVP) - Critical Gaps

- [ ] **All existing features work** - Need comprehensive testing
- [ ] **No regression in functionality** - Need regression test suite
- [ ] **Performance budgets met** - **PARTIALLY**:
  - [ ] Time-to-first-keystroke ≤ 800 ms - Tests exist but `usePerformanceMetrics` not integrated
  - [ ] Snippet switch ≤ 300 ms - Tests exist but may not be comprehensive
  - [ ] Background load never blocks typing (no jank > 16 ms frames) - Tests exist but may not be comprehensive
  - [ ] Budgets met on medium corpus - Not tested (medium corpus doesn't exist)
  - [ ] Virtualization kicks in automatically for large corpus - **NOT IMPLEMENTED** (virtualization is stubbed)
- [ ] **Classic UX anchors preserved**: Goal meter, Today chip, footer word/character counts look and behave identically - **Visual parity check NOT completed**
- [ ] **Visual parity**: Side-by-side `/react` vs. root checks pass - **NOT DONE, `/react` path not configured**
- [ ] **Concurrency safety**: Conflicts surfaced for Docs edits and second Yarny tabs - **NOT TESTED**
- [ ] **Round-trip integrity**: Paragraphs and soft line breaks round-trip without collapse/duplication - **NOT TESTED**
- [ ] **Bundle discipline**: Starter-kit removed; only TipTap extensions actually used are shipped - **✅ VERIFIED** - `package.json` shows individual extensions only, no starter-kit

### Ship Checklist (Critical Deltas) - All Unverified

- [ ] **Offline UX**: 
  - [ ] Visible offline banner - **✅ IMPLEMENTED** (`OfflineBanner.tsx` integrated)
  - [ ] Queued saves indicator - **✅ IMPLEMENTED** (in `OfflineBanner.tsx`)
  - [ ] Footer save status shows appropriate variant for offline state - Need to verify
  - [ ] **No lost text on reconnect**: All queued mutations automatically retry - **✅ IMPLEMENTED** (in `useAutoSave.ts`) but **NOT TESTED**
  - [ ] Test: Go offline → Make edits → Reconnect → Verify all changes saved successfully - **NOT TESTED**

- [ ] **Timezone correctness**: 
  - [ ] "Today" chip updates correctly at midnight in user's IANA timezone - **NOT TESTED**
  - [ ] Daily rollover verified across DST boundaries - **NOT TESTED**
  - [ ] Goal calculations remain correct across DST boundaries - **NOT TESTED**

- [ ] **Order persistence**: 
  - [ ] Order persisted in Drive metadata - **NOT VERIFIED**
  - [ ] Multi-tab reorder test passes - **NOT TESTED**
  - [ ] Order survives concurrent edits - **NOT TESTED**
  - [ ] Order survives background loads - **NOT TESTED**

- [ ] **RTL snippet passes**: 
  - [ ] RTL test snippet added to test corpus - **NOT FOUND**
  - [ ] Caret movement correct in RTL text - **NOT TESTED**
  - [ ] Word counting includes RTL words correctly - **NOT TESTED**
  - [ ] Paste normalization handles RTL content - **NOT TESTED**

- [ ] **Memory bound**: 
  - [ ] Cache limited to 50 most-recent snippet bodies - **NOT VERIFIED**
  - [ ] LRU eviction implemented - **NOT VERIFIED**
  - [ ] Active snippet protection verified - **NOT VERIFIED**
  - [ ] Cache never grows beyond target during long sessions - **NOT TESTED**

### Should Have - Gaps

- [ ] **Accessibility polish beyond MUI defaults**:
  - [ ] Minimum contrast ratios verified - Utility exists but not run
  - [ ] Visible focus rings on all actionable items - Need verification
  - [ ] Keyboard-only flows for reordering lists - Need verification
  - [ ] **Keyboard-only completion of core tasks** - **NOT VERIFIED**
  - [ ] **Contrast checks on every chip color** - **NOT DONE**

- [ ] **Editor truth and Google Docs round-tripping** - **NOT TESTED**

- [ ] **Configurable virtualization thresholds** - **NOT IMPLEMENTED** (virtualization is stubbed)

- [ ] **Chunked export writes** - **✅ IMPLEMENTED** but **NOT VALIDATED** with large chapters

- [ ] **Order persistence** - **NOT VERIFIED**

---

## Critical Missing Validations

### 1. Visual Parity Testing (Phase 4 Requirement) - **CRITICAL**
**Status**: Not completed  
**Impact**: High - Classic UX anchors are P1/P2 priority  
**Findings**:
- `netlify.toml` doesn't configure `/react` path for parallel deployment
- Visual regression tests exist but don't compare against legacy app
- No side-by-side comparison performed
- No pixel-diff comparison with legacy app

**Action Required**: 
- Configure `/react` path in `netlify.toml`
- Deploy React app to `/react` path
- Perform side-by-side comparison with current app
- Pixel-diff or side-by-side visual comparison for:
  - Goal meter
  - Today chip
  - Footer counts
  - Story cards
  - Modal spacing
- Document "diff" screenshots as artifacts

### 2. Round-Trip Testing (Phase 4 Requirement) - **CRITICAL**
**Status**: Not completed  
**Impact**: Critical - Data integrity risk  
**Findings**:
- No round-trip tests found in codebase
- No tests for Google Docs ↔ Yarny round-tripping

**Action Required**:
- Create round-trip tests
- Test editing in Yarny → saving → editing in Google Docs → switching snippets in Yarny
- Verify no format loss
- Test with small project (`test-small`)
- Validate paragraph breaks and soft line breaks round-trip correctly

### 3. Cross-Edit Conflict Testing (Phase 5 Requirement) - **CRITICAL**
**Status**: Not completed  
**Impact**: Critical - Data loss risk  
**Findings**:
- Conflict detection hooks exist (`useConflictDetection.ts`)
- Conflict resolution modal exists (`ConflictResolutionModal.tsx`)
- **NO TESTS FOUND** for conflict scenarios

**Action Required**:
- Create conflict detection tests
- Test: Edit in Google Docs while Yarny is idle
- Test: Return to Yarny and verify conflict detection works
- Test: Second Yarny tab editing same snippet
- Verify no silent last-writer-wins

### 4. Performance Budget Validation (Phase 7 Requirement) - **CRITICAL**
**Status**: Partially implemented  
**Impact**: High - Performance is MVP requirement  
**Findings**:
- `usePerformanceMetrics` hook exists but **NOT INTEGRATED** into `StoryEditor.tsx`
- Performance tests exist (`tests/e2e/performance.spec.ts`) but may not be comprehensive
- No integration of performance monitoring in actual editor

**Action Required**:
- Integrate `usePerformanceMetrics` into `StoryEditor` component
- Call `recordFirstKeystroke()` on first keystroke
- Call `startSnippetSwitch()` / `endSnippetSwitch()` on snippet switches
- Validate all performance budgets:
  - Time-to-first-keystroke ≤ 800 ms
  - Snippet switch ≤ 300 ms
  - No jank > 16 ms frames
- Test with medium corpus (needs to be populated first)
- Verify virtualization kicks in for large corpus (needs to be implemented first)

### 5. Smoke Test Execution (Multiple Phases) - **HIGH PRIORITY**
**Status**: Not completed  
**Impact**: High - Regression risk  
**Findings**:
- Test corpus structure exists (`test-corpus/`)
- Only `test-small` appears to be populated
- No smoke test execution found

**Action Required**:
- Populate `test-medium` project
- Populate `test-large` project with very large chapter (50+ snippets)
- Run smoke tests on small project (`test-small`)
- Run smoke tests on medium project (`test-medium`)
- Run smoke tests on large project (`test-large`)
- Validate all operations work correctly

### 6. Virtualization Implementation (Phase 3/7 Requirement) - **HIGH PRIORITY**
**Status**: Stubbed, not implemented  
**Impact**: Medium - Performance requirement  
**Findings**:
- `@tanstack/react-virtual` is installed
- `VirtualizedStoryList.tsx` exists but is a **STUB** with TODO comments
- Virtualization not actually implemented

**Action Required**:
- Implement virtualization in `VirtualizedStoryList.tsx`
- Implement virtualization for chapter/snippet lists when needed
- Verify virtualization thresholds (50+ chapters, 200+ snippets)
- Test with large corpus

### 7. Notes Sidebar Implementation (Phase 4 Requirement) - **MEDIUM PRIORITY**
**Status**: Placeholder  
**Impact**: Medium - Feature incomplete  
**Findings**:
- `NotesSidebar.tsx` exists but shows placeholder text ("People notes will appear here")
- Not actually displaying notes
- Snippet lists not built out (needed for full visibility gating)

**Action Required**:
- Implement notes display in `NotesSidebar.tsx`
- Build out snippet list components
- Enable full visibility gating for lazy loading

### 8. Accessibility Verification (Phase 7 Requirement) - **MEDIUM PRIORITY**
**Status**: Partially implemented  
**Impact**: Medium - Should Have requirement  
**Findings**:
- Contrast checker utility exists (`src/utils/contrastChecker.ts`)
- Focus rings and ARIA attributes exist
- **NOT VERIFIED** against actual UI

**Action Required**:
- Verify keyboard-only flows for all core tasks
- Screen reader testing
- Run contrast checker against actual UI backgrounds
- Verify all 12 accent colors meet contrast requirements

---

## Codebase-Specific Findings

### Components That Exist But May Not Be Integrated
- `SortableChapterList.tsx` and `SortableSnippetList.tsx` - Need to verify they're used in UI
- `usePerformanceMetrics.ts` - **NOT INTEGRATED** into `StoryEditor.tsx`

### Components That Are Placeholders
- `NotesSidebar.tsx` - Shows placeholder text, not functional
- `VirtualizedStoryList.tsx` - Stub with TODO comments, not implemented

### Tests That Exist But Don't Validate Requirements
- Visual regression tests - Don't compare against legacy app
- Performance tests - May not be comprehensive
- No conflict resolution tests
- No round-trip tests

### Configuration Gaps
- `netlify.toml` - No `/react` path configured for parallel deployment
- No deployment configuration for side-by-side testing

---

## Recommendations

### Immediate Priority (Before Production) - **CRITICAL**
1. **Integrate `usePerformanceMetrics` into StoryEditor** - MVP requirement
2. **Complete visual parity testing** - Required before closing Phase 4
3. **Execute round-trip testing** - Critical for data integrity
4. **Test cross-edit conflict detection** - Critical for data loss prevention
5. **Configure `/react` path deployment** - Required for visual parity testing
6. **Run smoke tests on all test corpus projects** - Regression prevention

### High Priority (Before Ship)
1. **Complete all Ship Checklist items** - Critical edge cases
2. **Implement virtualization** - Performance requirement
3. **Complete Notes Sidebar** - Feature completeness
4. **Complete remaining E2E tests** - Test automation coverage
5. **Populate and test large project** - Performance validation

### Medium Priority
1. **Complete accessibility verification** - Should Have requirement
2. **Complete remaining component tests** - Test coverage
3. **Document all improvements** - Knowledge preservation
4. **Update manual testing checklist** - Process improvement

---

## Summary Statistics

- **Total Phases**: 8
- **Phases with Critical Gaps**: 7 (all except Phase 1)
- **Must Have (MVP) Items Incomplete**: ~10
- **Ship Checklist Items Unverified**: 5 (all)
- **Visual Parity Testing**: Not completed (required before closing editor phase)
- **Round-Trip Testing**: Not completed (critical for data integrity)
- **Performance Budget Validation**: Partially implemented, not integrated
- **Smoke Test Execution**: Not completed
- **Virtualization**: Stubbed, not implemented
- **Notes Sidebar**: Placeholder, not functional
- **Conflict Resolution**: Implemented but not tested
- **Bundle Discipline**: ✅ Verified (starter-kit not in package.json)

---

## Next Steps

1. **Create action plan** to address critical gaps
2. **Prioritize** based on impact (Critical > High > Medium)
3. **Assign ownership** for each gap
4. **Set deadlines** for completion
5. **Track progress** against this gap analysis
6. **Update this document** as gaps are resolved
