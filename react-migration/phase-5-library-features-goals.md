# Phase 5: Library Features & Goals UI (Week 3–4)

## Checklist
- [x] Implement drag & drop with `@dnd-kit` (components created: SortableChapterList, SortableSnippetList)
- [x] Integrate color picker (ColorPicker component created)
- [x] Build context menus (ContextMenu component created)
- [x] Convert all modals (story info, rename, delete, etc.) using Material UI `Dialog` (DeleteStoryModal, GoalsPanelModal, StoryInfoModal, RenameModal all use Dialog)
- [x] Implement tabs using Material UI `Tabs` (StoryTabs component created)
- [x] Implement Goals UI: goal meter (left rail) and goal panel modal at parity with alpha plan (GoalMeter, GoalsPanelModal components created)
- [x] Implement "Today • N" chip with progress bar and ahead/behind indicator (TodayChip component created)
- [x] Wire word count updates (useWordCount hook and wordCount utilities created)
- [x] Create conflict detection hooks (`src/hooks/useConflictDetection.ts`)
- [x] Deliver conflict resolution UI and modal (ConflictResolutionModal component created)
- [x] **JSON Primary Architecture**: Conflict detection updated for JSON primary model (checks Google Doc modifiedTime, compares content if newer)
- [ ] Test cross-edits: edit in Google Docs while Yarny is idle, return and verify conflict detection works (with JSON Primary Architecture)

## Deliverables
- Library feature parity (drag & drop, context menus, color picker, modal flows) aligned with Material UI customization from Phase 1.
- Goals UI and conflict resolution experiences validated against classic UX requirements.
- Documented cross-edit test results ensuring conflict detection resilience.

## Level of Effort
- Estimated 25–35 hours including Goals UI work, conflict resolution tooling, and cross-edit testing.

## Risk Checkpoint Focus
- Re-rate editor/Docs round-tripping, Drive quotas, and large-scale performance risks.
- Confirm conflict resolution modal functions correctly and cross-edit testing passes before closing the phase.

## Notes & References
- Reuse conflict detection utilities in later offline/spotty-network work (Phase 6).
- Capture reference screenshots for goal meter and Today chip to feed Phase 7 visual regression baselines.

## Implementation Summary

### Components Created
1. **Drag & Drop**
   - `SortableChapterList.tsx` - Drag & drop for chapters using @dnd-kit
   - `SortableSnippetList.tsx` - Drag & drop for snippets using @dnd-kit

2. **UI Components**
   - `ColorPicker.tsx` - Color picker with 12 accent colors
   - `ContextMenu.tsx` - Reusable context menu component
   - `StoryTabs.tsx` - Tab component using Material UI Tabs

3. **Goals UI**
   - `GoalMeter.tsx` - Goal meter display with progress bar
   - `TodayChip.tsx` - Today chip with progress and ahead/behind indicators
   - `GoalsPanelModal.tsx` - Goals configuration modal

4. **Modals**
   - `ConflictResolutionModal.tsx` - Conflict resolution UI
   - `StoryInfoModal.tsx` - Story info and settings modal
   - `RenameModal.tsx` - Rename modal for chapters/snippets/stories

### Hooks Created
1. **useConflictDetection.ts** - Conflict detection and resolution utilities (updated for JSON Primary Architecture)
2. **useWordCount.ts** - Word count calculation and update utilities

### Utilities Created
1. **wordCount.ts** - Word counting utilities (countWords, countCharacters, calculateTotalWordCount)

### Dependencies Installed
- `@dnd-kit/core` - Core drag & drop functionality
- `@dnd-kit/sortable` - Sortable list functionality
- `@dnd-kit/utilities` - Utility functions for drag & drop

### Next Steps
- Integrate these components into the main StoryEditor component
- Wire up the components with actual data from the store/API
- Test cross-edits with Google Docs to verify conflict detection
- Capture reference screenshots for visual regression testing

