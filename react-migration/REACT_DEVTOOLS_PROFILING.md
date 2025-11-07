# React DevTools Profiling Guide

This guide documents how to use React DevTools Profiler to identify performance bottlenecks and optimize the Yarny React application.

## Prerequisites

1. **Install React DevTools Browser Extension**:
   - Chrome: [React Developer Tools](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)
   - Firefox: [React Developer Tools](https://addons.mozilla.org/en-US/firefox/addon/react-devtools/)
   - Edge: Available in Edge Add-ons store

2. **Enable Profiler in React DevTools**:
   - Open React DevTools (F12 → React tab)
   - Click on the "Profiler" tab
   - Ensure "Record why each component rendered" is enabled (gear icon)

## Profiling Workflow

### 1. Start Recording

1. Open the Yarny app in your browser
2. Open React DevTools (F12 → React tab → Profiler)
3. Click the blue "Record" button (circle icon) to start profiling
4. The button will turn red and show "Recording..."

### 2. Perform Actions

While recording, perform the actions you want to profile:

**Common Scenarios to Profile:**

- **Initial Load**:
  - Navigate to `/react` path
  - Wait for stories list to load
  - Click on a story to open editor

- **Snippet Switching**:
  - Open a story with multiple chapters/snippets
  - Click through different snippets
  - Observe editor content updates

- **Typing Performance**:
  - Open editor with a snippet
  - Type continuously for 10-20 seconds
  - Check for frame drops or jank

- **Large Story Rendering**:
  - Open a story with 20+ chapters
  - Scroll through chapter list
  - Expand/collapse chapters

- **Story List Virtualization**:
  - Navigate to stories page with 20+ stories
  - Scroll through the list
  - Verify virtualization is working

### 3. Stop Recording

1. Click the red "Stop" button to end profiling
2. React DevTools will display a flamegraph of the recording

## Analyzing Results

### Flamegraph View

The flamegraph shows:
- **Component hierarchy**: Nested components from top to bottom
- **Bar width**: Time spent rendering (wider = slower)
- **Bar color**: 
  - Yellow/Green: Fast render (< 4ms)
  - Orange: Medium render (4-16ms)
  - Red: Slow render (> 16ms)

### Key Metrics to Check

1. **Render Time**:
   - Look for components with red bars (slow renders)
   - Target: Most components should be < 4ms
   - Critical: No component should exceed 16ms (60fps threshold)

2. **Commit Duration**:
   - Total time for a React commit
   - Target: < 16ms for smooth 60fps
   - Check commit list at the top of profiler

3. **Component Re-renders**:
   - Click on a component to see why it rendered
   - Check "Why did this render?" section
   - Common causes:
     - Props changed
     - State changed
     - Parent re-rendered
     - Hooks changed

### Identifying Performance Issues

#### Issue: Unnecessary Re-renders

**Symptoms**:
- Component re-renders when props haven't changed
- Parent re-renders causing child re-renders

**Solutions**:
- Wrap component with `React.memo()` (already done for `StoryCard`, `GoalMeter`, `TodayChip`, `EditorFooter`)
- Use `useMemo()` for expensive calculations
- Use `useCallback()` for event handlers passed as props
- Check if Zustand selectors are creating new references

**Example**:
```typescript
// ✅ Good: Memoized component
export const StoryCard = memo(function StoryCard({ story }: StoryCardProps) {
  // ...
}, (prevProps, nextProps) => {
  return prevProps.story.id === nextProps.story.id;
});

// ✅ Good: Memoized callback
const handleClick = useCallback(() => {
  // ...
}, [story.id]);
```

#### Issue: Expensive Calculations

**Symptoms**:
- Component renders slowly even when props don't change
- Calculations run on every render

**Solutions**:
- Use `useMemo()` for expensive calculations
- Move calculations outside render if possible

**Example**:
```typescript
// ✅ Good: Memoized calculation
const totalWords = useMemo(
  () => snippets.reduce((sum, snippet) => sum + countWords(snippet.content), 0),
  [snippets]
);
```

#### Issue: Large Lists Rendering

**Symptoms**:
- Story list or snippet list renders slowly
- Scrolling is janky

**Solutions**:
- Verify `VirtualizedStoryList` is using `@tanstack/react-virtual` correctly
- Check virtualization threshold (default: 20 stories)
- Ensure only visible items are rendered

**Verification**:
- Check that `VirtualizedStoryList` uses `useVirtualizer` hook
- Verify `shouldVirtualize` is true for large lists
- Check DOM - only visible items should exist

## Specific Profiling Scenarios

### 1. Story List Performance

**Steps**:
1. Start recording
2. Navigate to stories page
3. Wait for stories to load
4. Scroll through list
5. Stop recording

**What to Check**:
- `VirtualizedStoryList` render time
- `StoryCard` re-render frequency
- Virtualization working (check DOM - only visible cards exist)

**Expected Results**:
- `VirtualizedStoryList`: < 4ms per render
- `StoryCard`: < 2ms per render
- Only 6-9 story cards in DOM (3 columns × 2-3 rows visible)

### 2. Editor Typing Performance

**Steps**:
1. Start recording
2. Open editor with a snippet
3. Type continuously for 10 seconds
4. Stop recording

**What to Check**:
- `StoryEditor` render time
- `EditorFooter` re-render frequency (word count updates)
- Frame drops during typing

**Expected Results**:
- `StoryEditor`: < 4ms per render
- `EditorFooter`: Updates only when word count changes (debounced)
- No frame drops (all commits < 16ms)

### 3. Snippet Switching Performance

**Steps**:
1. Start recording
2. Open story with multiple snippets
3. Click through 5-10 different snippets
4. Stop recording

**What to Check**:
- `StorySidebarContent` render time
- `SnippetItem` re-render frequency
- Editor content update time

**Expected Results**:
- Snippet switch latency: < 300ms (per performance budget)
- `StorySidebarContent`: < 4ms per render
- Editor updates smoothly

### 4. Large Story Rendering

**Steps**:
1. Start recording
2. Open story with 20+ chapters
3. Expand/collapse chapters
4. Scroll through chapter list
5. Stop recording

**What to Check**:
- `StorySidebarContent` render time
- `ChapterSnippetList` render time
- Visibility gating working (snippets load on scroll)

**Expected Results**:
- Initial render: < 100ms
- Chapter expand/collapse: < 16ms
- Snippets load lazily as they become visible

## Performance Budgets

When profiling, verify these budgets are met:

- **Time-to-first-keystroke**: ≤ 800ms (cold), ≤ 300ms (hot)
- **Snippet switch latency**: ≤ 300ms
- **Frame time**: < 16ms (60fps)
- **Component render time**: < 4ms (most components)
- **Commit duration**: < 16ms

## Common Optimizations Applied

### Memoization

The following components are memoized:
- `StoryCard` - Prevents re-render when story props don't change
- `GoalMeter` - Prevents re-render when word count/goal don't change
- `TodayChip` - Prevents re-render when today's words/target don't change
- `EditorFooter` - Prevents re-render when snippet content doesn't change

### Callback Memoization

Event handlers are memoized with `useCallback`:
- `StoryCard.handleClick`
- `StoryCard.handleDelete`
- `StorySidebarContent.toggleChapterCollapse`
- `StorySidebarContent.handleChapterReorder`
- `StorySidebarContent.handleSnippetReorder`

### Expensive Calculations

Calculations are memoized with `useMemo`:
- Word/character counts in `EditorFooter`
- Date formatting in `StoryCard`
- Progress calculations in `GoalMeter` and `TodayChip`
- Chapter/snippet data transformations in `StorySidebarContent`

## Reporting Issues

When reporting performance issues:

1. **Record a profile** using React DevTools
2. **Export the profile** (right-click on commit → "Save profile...")
3. **Document the scenario**:
   - What action triggered the issue?
   - What was the expected behavior?
   - What was the actual behavior?
4. **Include metrics**:
   - Component render times
   - Commit duration
   - Frame drops
5. **Attach the profile file** to the issue

## Additional Resources

- [React Profiler Documentation](https://react.dev/learn/react-developer-tools#profiler)
- [React Performance Optimization](https://react.dev/learn/render-and-commit#optimizing-performance)
- [@tanstack/react-virtual Documentation](https://tanstack.com/virtual/latest)


