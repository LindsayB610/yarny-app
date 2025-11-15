# Test Review - Focus on App Behavior, Not TipTap Internals

## Summary

We should test **app behavior** (how our code responds to events), not **TipTap internals** (editor API methods).

## What We SHOULD Test ✅

### 1. Auto-Save Behavior (Already Well Tested ✅)
- **File**: `src/hooks/useAutoSave.persistence.test.tsx`
- **Tests**: Debouncing, queuing when offline, persistence across reloads
- **Approach**: Tests hook directly with content changes, uses fake timers for debounce
- **Status**: ✅ Good - tests app behavior, not editor internals

### 2. Content Flow Through System
- **What to test**: When content changes → auto-save triggers → Drive save happens
- **Current**: Partially tested in `tests/integration/round-trip.test.tsx`
- **Approach**: Test data flow (store → hook → API), not editor rendering

### 3. Conflict Detection
- **What to test**: Conflict detection triggers when content changes
- **Current**: Some tests skipped in `StoryEditor.test.tsx`
- **Approach**: Test that conflict detection hook is called with correct data

### 4. Content Synchronization
- **What to test**: When snippet changes, editor content updates
- **Current**: Tests skipped because they test TipTap internals
- **Approach**: Test that `editorContent` state updates, not `editor.commands.setContent()`

## What We SHOULD NOT Test ❌

### TipTap Internal Methods
- ❌ `editor.commands.setContent()` - TipTap internal API
- ❌ `editor.getJSON()` - TipTap internal API  
- ❌ `editor._triggerUpdate()` - Mock helper, not real behavior
- ❌ `editor.on("update")` - TipTap event system
- ❌ Editor rendering/DOM - Covered by E2E tests

### Why Skip These?
- TipTap is a third-party library - we trust it works
- Testing internals creates brittle mocks
- E2E tests already verify editor works end-to-end
- Focus on **our code's behavior** with editor events

## Current Test Status

### ✅ Good Tests (Keep These)
1. **`useAutoSave.persistence.test.tsx`**
   - Tests debouncing ✅
   - Tests offline queuing ✅
   - Tests persistence ✅
   - Tests content changes triggering saves ✅

2. **`StoryEditor.test.tsx` - Basic Rendering**
   - Loading states ✅
   - Empty states ✅
   - Component rendering ✅

### ⚠️ Tests to Refactor (Currently Skipped)
1. **`StoryEditor.test.tsx` - Editor Content Updates**
   - **Current**: Tests `mockEditor._triggerUpdate()` and `mockEditor.getJSON()`
   - **Should test**: When `editorContent` state changes, auto-save triggers
   - **Approach**: Mock `useEditorContent` to return different content, verify `useAutoSave` is called

2. **`StoryEditor.test.tsx` - Snippet Switching**
   - **Current**: Tests `mockEditor.commands.setContent()`
   - **Should test**: When snippet changes, `editorContent` updates
   - **Approach**: Change store state, verify `useEditorContent` hook updates

3. **`StoryEditor.test.tsx` - Conflict Detection**
   - **Current**: Tests `mockEditor._triggerFocus()` to trigger conflict check
   - **Should test**: Conflict detection hook is called when content changes
   - **Approach**: Change content, verify `useConflictDetection` is called

## Recommended Test Structure

### Unit Tests (Test Hooks Directly)
```typescript
// ✅ GOOD: Test useAutoSave hook directly
it("triggers save after debounce when content changes", async () => {
  const { rerender } = renderHook(
    ({ content }) => useAutoSave("file-1", content, { debounceMs: 100 }),
    { initialProps: { content: "initial" } }
  );
  
  rerender({ content: "updated" });
  await vi.advanceTimersByTimeAsync(150);
  
  expect(apiClient.writeDriveFile).toHaveBeenCalledWith(
    expect.objectContaining({ content: "updated" })
  );
});

// ❌ BAD: Don't test TipTap internals
it("calls editor.commands.setContent when snippet changes", () => {
  // This tests TipTap, not our app
});
```

### Integration Tests (Test Data Flow)
```typescript
// ✅ GOOD: Test content flows through system
it("saves content when editorContent changes", async () => {
  await renderAppLayout(queryClient);
  
  // Simulate content change via hook (not editor)
  const autoSaveHook = useAutoSave.mock.results[0]?.value;
  await autoSaveHook.save();
  
  expect(apiClient.writeDriveFile).toHaveBeenCalled();
});

// ❌ BAD: Don't test editor DOM
it("editor contenteditable contains text", () => {
  const editor = document.querySelector('[contenteditable="true"]');
  // This tests TipTap rendering, not our app
});
```

## Action Items

1. ✅ **Keep**: `useAutoSave.persistence.test.tsx` - Already testing app behavior correctly
2. ⚠️ **Refactor**: `StoryEditor.test.tsx` skipped tests to test hooks/state instead of editor internals
3. ✅ **Keep**: `tests/integration/round-trip.test.tsx` - Tests data flow (already refactored)
4. ✅ **Keep**: E2E tests - They test editor rendering end-to-end

## Key Principle

**Test the contract, not the implementation:**
- ✅ Test: "When content changes, auto-save triggers after debounce"
- ❌ Don't test: "When editor fires update event, getJSON is called"

The editor is a black box - we care about what happens when content changes, not how TipTap implements it.

