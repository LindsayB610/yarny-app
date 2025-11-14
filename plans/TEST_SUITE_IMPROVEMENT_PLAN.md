# Test Suite Improvement Plan

**Date**: 2025-01-14  
**Status**: Draft for Review

## Executive Summary

The test suite review revealed:
- ✅ **All 441 tests pass** across 56 test files
- ✅ **Coverage command works** (was slow, not hanging - ~17s execution time)
- ⚠️ **React `act()` warnings** in multiple test files (non-blocking but should be fixed)
- ⚠️ **Test coverage gaps** identified in critical areas (26.95% overall, 54.76% for src/)
- ⚠️ **E2E tests** not yet verified in this review

## Issue #1: Coverage Command Performance ✅ RESOLVED

### Problem
The `npm run test:coverage` command appeared to hang, but investigation revealed it was simply slow (~17 seconds) due to HTML report generation.

### Root Cause
- Coverage command missing `--run` flag (though it still works)
- HTML report generation is computationally expensive
- Multiple vitest worker processes running simultaneously

### Solution Implemented
1. ✅ Verified coverage command works correctly
2. ✅ Coverage report generated successfully showing:
   - Overall: 26.95% statements, 67.65% branches, 50.87% functions
   - Source code: 54.76% statements, 50% branches, 50% functions

### Recommendations
- **Option A**: Keep current behavior (acceptable for occasional use)
- **Option B**: Add `--run` flag explicitly to package.json script for clarity
- **Option C**: Create separate scripts:
  - `test:coverage:quick` - text-only report (faster)
  - `test:coverage:full` - includes HTML report (current behavior)

**Recommendation**: Option B - Add `--run` flag for clarity, keep HTML report generation.

---

## Issue #2: React `act()` Warnings (High Priority)

### Problem
Multiple test files show warnings about state updates not wrapped in `act()`:
- `useExport.test.tsx` - 9+ warnings
- `useSyncStatus.test.ts` - 12+ warnings  
- `useAuth.test.tsx` - 5+ warnings
- `useNetworkStatus.test.ts` - 5+ warnings
- `LoginPage.test.tsx` - 2+ warnings
- `OfflineBanner.test.tsx` - 1+ warning

### Impact
- Tests pass but warnings indicate potential timing issues
- Could lead to flaky tests in CI/CD
- May mask real async behavior problems

### Solution Plan

#### Phase 1: Quick Wins (2-4 hours)
1. **Wrap async operations in `act()`**
   - Update test utilities to automatically wrap async operations
   - Fix warnings in `useSyncStatus.test.ts` (event listeners)
   - Fix warnings in `useNetworkStatus.test.ts` (event listeners)

2. **Use `waitFor` from Testing Library**
   - Replace manual `setTimeout` with `waitFor` where appropriate
   - Use `findBy*` queries instead of `getBy*` + `waitFor`

#### Phase 2: Systematic Fixes (4-6 hours)
3. **Fix hook tests**
   - Update `useExport.test.tsx` to properly handle async mutations
   - Update `useAuth.test.tsx` to wrap login/logout operations
   - Review all hook tests for proper async handling

4. **Fix component tests**
   - Update `LoginPage.test.tsx` to wrap form submissions
   - Update `OfflineBanner.test.tsx` to wrap localStorage events

#### Phase 3: Prevention (1-2 hours)
5. **Add ESLint rule**
   - Consider adding rule to catch common `act()` issues
   - Document best practices in test README

**Estimated Time**: 7-12 hours  
**Priority**: High (affects test reliability)

---

## Issue #3: Test Coverage Gaps (Medium-High Priority)

### Current Coverage
- **Overall**: 26.95% statements, 67.65% branches, 50.87% functions
- **Source Code**: 54.76% statements, 50% branches, 50% functions

### Critical Gaps Identified

#### High Priority Areas (0% coverage)
1. **Story Editor Core** (`StoryEditor.tsx`) - 66.59% coverage
   - Missing: Snippet switching edge cases
   - Missing: Large document handling
   - Missing: Performance metrics integration

2. **Notes Management** (`NoteEditor.tsx`, `NotesSidebar.tsx`) - 0% coverage
   - Missing: Autosave functionality
   - Missing: Drag-and-drop reordering
   - Missing: Tab switching with unsaved changes

3. **Drive Client** (`driveClient.ts`) - 0% coverage
   - Missing: Paginated file listing
   - Missing: JSON file reading with fallback
   - Missing: Error handling scenarios

4. **Service Worker** (`serviceWorker/`) - 0% coverage
   - Missing: Registration logic
   - Missing: Background sync handling
   - Missing: Message handling

#### Medium Priority Areas (Low coverage)
5. **Story Mutations** (`useStoryMutations.ts`) - 24.77% coverage
6. **Story Queries** (`useStoriesQuery.ts`) - 24.24% coverage
7. **Story Progress** (`useStoryProgress.ts`) - 25.71% coverage
8. **Local Backups** (`useLocalBackups.ts`) - 0% coverage
9. **Manual Sync** (`useManualSync.ts`) - 16.36% coverage

### Solution Plan

#### Phase 1: Critical Path Coverage (8-12 hours)
1. **Notes Management Tests**
   - Create `NoteEditor.test.tsx` with autosave tests
   - Create `NotesSidebar.test.tsx` with drag-and-drop tests
   - Test tab switching and unsaved changes handling

2. **Story Editor Core Tests**
   - Expand `StoryEditor.tsx` tests for snippet switching
   - Add performance metrics tests
   - Test large document handling

3. **Drive Client Tests**
   - Create `driveClient.test.ts` for pagination
   - Test JSON file reading with fallback
   - Test error scenarios

#### Phase 2: Integration Coverage (6-8 hours)
4. **Service Worker Tests**
   - Create tests for registration
   - Test background sync scenarios
   - Mock service worker environment

5. **Story Management Tests**
   - Expand `useStoryMutations.ts` tests
   - Expand `useStoriesQuery.ts` tests
   - Expand `useStoryProgress.ts` tests

#### Phase 3: Edge Cases (4-6 hours)
6. **Local Backups Tests**
   - Test enable/disable flows
   - Test permission handling
   - Test error scenarios

7. **Manual Sync Tests**
   - Expand existing tests
   - Test retry logic
   - Test error handling

**Estimated Time**: 18-26 hours  
**Priority**: Medium-High (important for reliability)

**Target Coverage Goals**:
- Overall: 40%+ statements
- Source Code: 70%+ statements
- Critical paths: 80%+ statements

---

## Issue #4: E2E Test Verification (Medium Priority)

### Problem
E2E tests exist but were not executed during this review.

### Solution Plan

#### Phase 1: Verify E2E Setup (1-2 hours)
1. **Check E2E test configuration**
   - Verify Playwright config is correct
   - Check if dev server needs to be running
   - Verify test data/mocks are in place

2. **Run E2E tests**
   - Execute `npm run test:e2e`
   - Document any failures
   - Verify visual regression tests work

#### Phase 2: Expand E2E Coverage (4-6 hours)
3. **Add missing E2E scenarios**
   - Authentication flow (if not covered)
   - Notes management workflows
   - Export workflows
   - Conflict resolution flows

**Estimated Time**: 5-8 hours  
**Priority**: Medium (E2E tests are valuable but less critical than unit tests)

---

## Issue #5: Test Infrastructure Improvements (Low Priority)

### Improvements Needed

1. **Test Performance**
   - Current test suite takes ~17 seconds
   - Consider parallelization optimizations
   - Review slow tests (>500ms)

2. **Test Organization**
   - Some tests are co-located, some in `tests/` directory
   - Consider standardizing location strategy
   - Improve test naming conventions

3. **Test Documentation**
   - Update `tests/README.md` with latest patterns
   - Document async testing best practices
   - Add examples for common scenarios

**Estimated Time**: 4-6 hours  
**Priority**: Low (nice-to-have improvements)

---

## Implementation Timeline

### Week 1: Critical Fixes
- ✅ Coverage command investigation (DONE)
- Fix React `act()` warnings (7-12 hours)
- Verify E2E tests (1-2 hours)

### Week 2: Coverage Expansion
- Notes management tests (4-6 hours)
- Story editor core tests (4-6 hours)
- Drive client tests (2-3 hours)

### Week 3: Integration & Edge Cases
- Service worker tests (3-4 hours)
- Story management expansion (4-6 hours)
- Local backups tests (2-3 hours)

### Week 4: Polish & Documentation
- Test infrastructure improvements (2-3 hours)
- Documentation updates (2-3 hours)
- Performance optimization (2-3 hours)

**Total Estimated Time**: 35-50 hours

---

## Success Metrics

1. ✅ Coverage command works reliably
2. Zero React `act()` warnings
3. Source code coverage >70%
4. All E2E tests passing
5. Test suite runs in <20 seconds
6. Critical paths have >80% coverage

---

## Next Steps

1. **Review this plan** with team
2. **Prioritize** based on business needs
3. **Create GitHub issues** for each phase
4. **Begin implementation** starting with highest priority items

---

## References

- [Vitest Coverage Guide](https://vitest.dev/guide/coverage.html)
- [React Testing Library Best Practices](https://testing-library.com/docs/react-testing-library/intro/)
- [React `act()` Documentation](https://react.dev/reference/react/act)
- Existing coverage gaps: `plans/TEST_COVERAGE_GAPS.md`
- Test suite documentation: `tests/README.md`

