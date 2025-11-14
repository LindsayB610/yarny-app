# NoteEditor TipTap Testing Investigation Report

**Date**: 2025-01-14  
**Component**: `src/components/story/NoteEditor.tsx`  
**Issue**: Tests timeout when attempting to mock TipTap editor instance

## Executive Summary

The `NoteEditor` component uses TipTap's `usePlainTextEditor` hook to create a rich text editor instance. Unit testing this component with React Testing Library has proven challenging due to the complexity of properly mocking TipTap's editor instance and its asynchronous initialization behavior.

## Current Status

- **Test File**: `src/components/story/NoteEditor.test.tsx`
- **Status**: Tests are currently skipped (`describe.skip`)
- **Reason**: All tests timeout after 5000ms when attempting to render the component with mocked TipTap editor

## Technical Analysis

### Component Dependencies

The `NoteEditor` component has the following key dependencies:

1. **TipTap Editor** (`usePlainTextEditor` hook)
   - Creates a TipTap editor instance
   - Handles editor lifecycle (mount/unmount)
   - Manages editor state (content, focus, blur)
   - Emits events (`update`, `focus`, `blur`)

2. **Editor Content Management**
   - Uses `buildPlainTextDocument` to convert plain text to TipTap document format
   - Uses `extractPlainTextFromDocument` to convert TipTap JSON back to plain text
   - Manages debounced auto-save functionality

3. **React Query Mutations**
   - `useMutation` for saving notes
   - Handles optimistic updates and error states

### Mocking Challenges

#### 1. TipTap Editor Instance Complexity

TipTap's `useEditor` hook returns a complex editor instance with:
- **Commands API**: `setContent`, `focus`, `blur`, etc.
- **Event System**: `on()`, `off()` for subscribing to editor events
- **State Properties**: `isDestroyed`, `isEditable`, `isFocused`
- **Content Management**: `getJSON()`, `getHTML()`, `getText()`
- **Lifecycle**: Initialization, updates, destruction

**Attempted Mock**:
```typescript
const createMockEditor = () => {
  const updateHandlers: Array<() => void> = [];
  
  return {
    getJSON: vi.fn(() => ({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Test content" }] }]
    })),
    commands: {
      setContent: vi.fn(),
      focus: vi.fn()
    },
    on: vi.fn((event: string, handler: () => void) => {
      if (event === "update") updateHandlers.push(handler);
      return () => { /* cleanup */ };
    }),
    off: vi.fn(),
    isDestroyed: false,
    isEditable: true,
    isFocused: false
  };
};
```

**Issues Encountered**:
- Editor instance may not be immediately available when component renders
- Event handlers may not be properly attached
- `setContent` calls may trigger update events that cause infinite loops
- Component's `useEffect` hooks depend on editor being fully initialized

#### 2. Asynchronous Initialization

The component has multiple `useEffect` hooks that depend on the editor:

```typescript
useEffect(() => {
  if (!editor) return;
  // Set initial content
  editor.commands.setContent(initialDocument);
}, [editor, initialDocument]);

useEffect(() => {
  if (!editor) return;
  const handleUpdate = () => {
    const text = extractPlainTextFromDocument(editor.getJSON());
    setEditorContent(text);
  };
  editor.on("update", handleUpdate);
  return () => editor.off("update", handleUpdate);
}, [editor]);
```

**Problem**: The mocked editor may not satisfy all the conditions these effects check, causing them to not execute or to execute incorrectly.

#### 3. Debounced Auto-Save

The component implements debounced auto-save:

```typescript
const debounceRef = useRef<number | undefined>(undefined);

// In handleUpdate:
if (debounceRef.current) {
  clearTimeout(debounceRef.current);
}
debounceRef.current = window.setTimeout(() => {
  // Save logic
}, 2000);
```

**Problem**: Testing debounced behavior requires careful timing control and may cause tests to timeout if not properly handled.

## Root Cause Analysis

### Primary Issue: Editor Instance Availability

The component expects the editor instance to be:
1. **Immediately available** after `usePlainTextEditor` returns
2. **Fully functional** with all methods and properties
3. **Event-capable** with proper event emitter behavior

However, TipTap's actual `useEditor` hook:
- May return `null` initially during initialization
- Requires DOM elements to be mounted before it's fully functional
- Has complex internal state management that's difficult to replicate in mocks

### Secondary Issue: Event Loop Timing

The component's `useEffect` hooks create a complex dependency chain:
1. Editor initializes → sets content
2. Content set → triggers update event
3. Update event → updates `editorContent` state
4. State update → may trigger re-render
5. Re-render → may trigger more effects

Without proper synchronization, this can lead to:
- Infinite update loops
- Race conditions
- Test timeouts

## Attempted Solutions

### Solution 1: Simple Mock (Current)

**Approach**: Create a minimal mock editor with basic methods and event handlers.

**Result**: Tests timeout - editor instance not properly initialized.

### Solution 2: Enhanced Mock with Event Simulation

**Approach**: Add helper methods to trigger events (`_triggerUpdate`, `_triggerFocus`, etc.).

**Result**: Still times out - component's effects don't properly handle mocked events.

### Solution 3: Integration Testing

**Approach**: Use real TipTap editor in tests with jsdom.

**Consideration**: Requires full DOM setup and may be slow, but could work.

**Status**: Not yet attempted.

## Recommendations

### Short-Term (Immediate)

1. **Keep Tests Skipped**: Continue using `describe.skip` for NoteEditor tests until a proper solution is implemented.

2. **Document Limitations**: Add comments explaining why tests are skipped and what functionality is not covered.

3. **Manual Testing**: Rely on manual testing and E2E tests for NoteEditor functionality.

### Medium-Term (Next Sprint)

1. **Integration Tests**: Create integration tests that use real TipTap editor:
   ```typescript
   // Use real editor with jsdom
   import { usePlainTextEditor } from "../../editor/plainTextEditor";
   
   // Don't mock - use real implementation
   // Test component behavior with real editor
   ```

2. **E2E Tests**: Add Playwright tests for NoteEditor:
   - Create note
   - Edit note content
   - Verify auto-save
   - Test debouncing

### Long-Term (Future)

1. **Component Refactoring**: Consider extracting editor logic into a custom hook:
   ```typescript
   // useNoteEditor.ts
   export function useNoteEditor(note: Note | null) {
     const editor = usePlainTextEditor({ content: ... });
     // All editor logic here
     return { editor, content, save, ... };
   }
   
   // NoteEditor.tsx - just renders UI
   export function NoteEditor() {
     const { editor, content, save } = useNoteEditor(note);
     return <EditorContent editor={editor} />;
   }
   ```
   
   This would allow testing the hook separately from the component.

2. **Test Utilities**: Create a TipTap testing utility library:
   ```typescript
   // tests/utils/tiptap-test-utils.ts
   export function createTestEditor(content?: string) {
     // Helper to create properly initialized editor for tests
   }
   ```

3. **Mock Library**: Develop a comprehensive TipTap mock library that properly simulates editor behavior.

## Alternative Testing Strategies

### 1. Snapshot Testing

Test that the component renders without errors:
```typescript
it("renders NoteEditor without crashing", () => {
  const { container } = render(<NoteEditor />);
  expect(container).toMatchSnapshot();
});
```

**Pros**: Simple, catches rendering errors  
**Cons**: Doesn't test functionality

### 2. Behavior Testing (E2E)

Focus on user-visible behavior:
- Can user type in editor?
- Does content save automatically?
- Does debouncing work?

**Pros**: Tests actual user experience  
**Cons**: Slower, requires browser environment

### 3. Unit Test Hook Logic

Extract editor logic into hooks and test those:
```typescript
// Test useNoteEditor hook separately
describe("useNoteEditor", () => {
  it("updates content when editor changes", () => {
    // Test hook logic without component
  });
});
```

**Pros**: Faster, more focused  
**Cons**: Requires refactoring

## Test Coverage Gaps

Without unit tests for NoteEditor, the following functionality is not covered:

1. ✅ **Rendering**: Covered by E2E tests
2. ❌ **Auto-save debouncing**: Not tested
3. ❌ **Content synchronization**: Not tested
4. ❌ **Error handling**: Not tested
5. ❌ **Optimistic updates**: Not tested
6. ❌ **Local backup mirroring**: Not tested

## Conclusion

The TipTap editor mocking complexity makes unit testing `NoteEditor` challenging. The recommended approach is to:

1. **Short-term**: Keep tests skipped, rely on E2E tests
2. **Medium-term**: Implement integration tests with real TipTap editor
3. **Long-term**: Refactor component to separate concerns and enable better testing

The component is currently functional and tested through E2E tests, so this is not a blocking issue, but improving test coverage should be prioritized.

## Related Files

- `src/components/story/NoteEditor.tsx` - Component implementation
- `src/components/story/NoteEditor.test.tsx` - Test file (currently skipped)
- `src/editor/plainTextEditor.ts` - TipTap editor hook
- `src/components/story/StoryEditor.tsx` - Similar component with same challenges
- `src/components/story/StoryEditor.test.tsx` - Similar test file (partially skipped)

## References

- [TipTap Documentation](https://tiptap.dev/)
- [TipTap Testing Guide](https://tiptap.dev/guide/testing)
- [React Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

