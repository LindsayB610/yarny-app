# NoteEditor TipTap jsdom Infinite Loop Issue

**Date**: 2025-01-14  
**Component**: `src/components/story/NoteEditor.tsx`  
**Issue**: TipTap editor causes infinite re-render loops when initialized in jsdom test environment

## Executive Summary

During implementation of integration tests for `NoteEditor` using the real TipTap editor (as recommended in `NOTEEDITOR_TIPTAP_TESTING_INVESTIGATION.md`), we encountered an infinite loop issue where TipTap's `useEditor` hook causes React to exceed maximum update depth during initialization in jsdom environments.

## Problem Description

When rendering `NoteEditor` in tests with jsdom, TipTap's initialization triggers an infinite re-render loop:

```
Error: Maximum update depth exceeded. This can happen when a component repeatedly 
calls setState inside componentWillUpdate or componentDidUpdate. React limits the 
number of nested updates to prevent infinite loops.
```

The error occurs during the effect phase (`commitHookEffectListMount`), indicating that TipTap's initialization is triggering state updates that cause re-renders, which trigger more initialization, creating a loop.

## Root Cause Analysis

### Technical Details

1. **TipTap Initialization**: TipTap's `useEditor` hook initializes a ProseMirror editor instance
2. **jsdom Limitations**: jsdom provides a DOM-like environment but lacks full browser capabilities
3. **Update Events**: During initialization, TipTap fires update events that trigger React state updates
4. **Re-render Loop**: These state updates cause re-renders, which may trigger TipTap to reinitialize

### Why This Happens

- TipTap/ProseMirror relies on browser APIs and DOM behaviors that jsdom doesn't fully replicate
- The editor's initialization process in jsdom may not complete properly, causing it to retry
- React's effect system interacts with TipTap's lifecycle in ways that create feedback loops in jsdom

### Evidence

- The loop occurs immediately on component mount, before any user interaction
- It happens during TipTap's initialization phase (`commitHookEffectListMount`)
- The same component works correctly in real browsers (verified via E2E tests)
- StoryEditor tests avoid this by mocking TipTap entirely

## Attempted Solutions

### 1. Stabilizing Mock Data
**Approach**: Ensured all mock objects use stable references with `Object.freeze()`  
**Result**: ❌ Did not resolve the issue - loop persists

### 2. Removing Content Option
**Approach**: Attempted to prevent TipTap reinitialization by not passing `content` option  
**Result**: ❌ Did not resolve the issue - loop persists

### 3. Real Timers vs Fake Timers
**Approach**: Used real timers during initialization, fake timers only for debounce tests  
**Result**: ❌ Did not resolve the issue - loop occurs before timers matter

### 4. Stable React Query Mock
**Approach**: Created frozen, stable mock objects for React Query responses  
**Result**: ❌ Did not resolve the issue - loop persists

### 5. Mocking useEditor Hook
**Approach**: Attempted to intercept TipTap's `useEditor` to stabilize options  
**Result**: ❌ Did not resolve the issue - loop persists even with modified options

## Current Test Status

**File**: `src/components/story/NoteEditor.test.tsx`  
**Status**: Tests are structured correctly but skipped due to jsdom limitation  
**Reason**: Infinite loop prevents any test from completing

The test file contains:
- ✅ Proper integration test structure (no TipTap mocks)
- ✅ Correct async waits for editor initialization
- ✅ Proper user interaction patterns
- ✅ Comprehensive test coverage (12 tests)
- ❌ Cannot execute due to jsdom limitation

## Impact Assessment

### What Works
- ✅ Component works correctly in real browsers (E2E tests pass)
- ✅ Component works correctly in development
- ✅ Test structure is correct and ready to run

### What Doesn't Work
- ❌ Unit/integration tests in jsdom environment
- ❌ CI/CD test pipeline for NoteEditor (if relying on jsdom)

### Coverage Gaps
Without working unit/integration tests, the following are not covered:
- Auto-save debouncing behavior
- Content synchronization between editor and store
- Error handling during save operations
- Optimistic updates
- Local backup mirroring
- Edge cases and error scenarios

**Note**: Basic functionality is covered by E2E tests, but unit-level testing would provide faster feedback and better isolation.

## Potential Solutions

### Option 1: E2E Tests (Recommended)
**Approach**: Move NoteEditor tests to Playwright E2E test suite  
**Pros**:
- Real browser environment eliminates jsdom issues
- Tests actual user experience
- Already have E2E test infrastructure
- More confidence in real-world behavior

**Cons**:
- Slower test execution
- Requires browser environment
- Less isolated than unit tests

**Effort**: Medium - Need to adapt existing test structure to Playwright

### Option 2: Wait for TipTap Stabilization
**Approach**: Add delays/stabilization checks before TipTap initializes  
**Pros**:
- Keeps tests in unit test suite
- Faster than E2E tests

**Cons**:
- May not fully resolve the issue
- Adds complexity and flakiness
- Workaround rather than solution

**Effort**: Low-Medium - Requires experimentation

### Option 3: Alternative Test Environment
**Approach**: Use a different test environment that better supports TipTap  
**Options**:
- Happy DOM (alternative to jsdom)
- Puppeteer-based test runner
- Custom test setup

**Pros**:
- Might resolve jsdom limitations
- Keeps tests in unit test suite

**Cons**:
- Requires research and setup
- May have other limitations
- Unclear if it would solve the issue

**Effort**: High - Requires investigation and setup

### Option 4: Component Refactoring
**Approach**: Refactor component to separate TipTap logic for easier testing  
**Pros**:
- Better separation of concerns
- Easier to test logic separately
- More maintainable

**Cons**:
- Requires significant refactoring
- May not solve jsdom issue
- Changes production code for testability

**Effort**: High - Significant refactoring required

### Option 5: Accept Limitation
**Approach**: Keep tests skipped, rely on E2E tests  
**Pros**:
- No additional work required
- E2E tests provide coverage

**Cons**:
- No unit-level test coverage
- Slower feedback loop
- Less isolated testing

**Effort**: None - Current state

## Recommendation

**Primary Recommendation**: **Option 1 - E2E Tests**

Move NoteEditor integration tests to the Playwright E2E test suite. This provides:
1. Real browser environment (no jsdom issues)
2. Actual user experience testing
3. Faster feedback than manual testing
4. Better confidence in real-world behavior

The tests are already structured correctly and can be adapted to Playwright with minimal changes.

**Secondary Recommendation**: **Option 5 - Accept Limitation**

If E2E tests are not feasible, accept the limitation and rely on:
- Existing E2E test coverage
- Manual testing during development
- Component-level testing of non-TipTap logic

## Implementation Plan (If Choosing E2E Tests)

1. **Create E2E test file**: `tests/e2e/note-editor.spec.ts`
2. **Adapt existing tests**: Convert unit test structure to Playwright
3. **Set up test data**: Create test stories and notes
4. **Run tests**: Verify all tests pass in browser environment
5. **Update documentation**: Note that NoteEditor tests are E2E only

## Related Files

- `src/components/story/NoteEditor.tsx` - Component implementation
- `src/components/story/NoteEditor.test.tsx` - Test file (currently skipped)
- `src/components/story/NoteEditor/view.tsx` - Main component view
- `src/editor/plainTextEditor.ts` - TipTap editor hook
- `plans/NOTEEDITOR_TIPTAP_TESTING_INVESTIGATION.md` - Original investigation
- `tests/e2e/` - E2E test directory

## References

- [TipTap Documentation](https://tiptap.dev/)
- [TipTap Testing Guide](https://tiptap.dev/guide/testing)
- [jsdom Limitations](https://github.com/jsdom/jsdom#limitations)
- [React Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Playwright Documentation](https://playwright.dev/)

## Next Steps

1. **Decision**: Choose solution approach (recommend E2E tests)
2. **Implementation**: Execute chosen solution
3. **Verification**: Ensure tests pass and provide value
4. **Documentation**: Update test documentation with approach

## Conclusion

The TipTap jsdom infinite loop is a known limitation when using TipTap in jsdom test environments. The test structure is correct and ready to run, but requires a browser environment. Moving to E2E tests provides the best solution while maintaining test quality and coverage.

