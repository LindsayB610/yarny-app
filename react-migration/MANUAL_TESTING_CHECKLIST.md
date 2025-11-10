# Manual Testing Checklist for testing-workbook.html

This checklist contains all manual testing items that should be added to the testing workbook. These items require human verification and cannot be fully automated.

## Phase 4: Editor – Tri-Pane Shell & Plain Text Round-Trip

### Visual Parity Testing (CRITICAL - Required Before Closing Phase 4)
- [ ] **Execute visual parity tests** - Run `tests/e2e/visual-regression.spec.ts` and review results
- [ ] **Goal Meter visual comparison** - Side-by-side comparison of React vs legacy goal meter
  - [ ] Verify pixel-diff is < 5% threshold
  - [ ] Document any visual differences with screenshots
  - [ ] Fix any differences that exceed threshold
- [ ] **Today Chip visual comparison** - Side-by-side comparison of React vs legacy Today chip
  - [ ] Verify pixel-diff is < 5% threshold
  - [ ] Document any visual differences with screenshots
  - [ ] Fix any differences that exceed threshold
- [ ] **Footer counts visual comparison** - Side-by-side comparison of React vs legacy footer
  - [ ] Verify pixel-diff is < 5% threshold
  - [ ] Document any visual differences with screenshots
  - [ ] Fix any differences that exceed threshold
- [ ] **Stories page full-page comparison** - Compare React vs legacy stories page
  - [ ] Verify pixel-diff is < 10% threshold (full page allows higher threshold)
  - [ ] Document any visual differences with screenshots
- [ ] **Editor layout full-page comparison** - Compare React vs legacy editor layout
  - [ ] Verify pixel-diff is < 10% threshold (full page allows higher threshold)
  - [ ] Document any visual differences with screenshots

### Round-Trip Testing with test-small Project
- [ ] **Upload test-small project to Google Drive** - Follow upload guide to populate Drive
- [ ] **Round-trip test: Yarny → Google Docs → Yarny**
  - [ ] Edit content in Yarny React app
  - [ ] Save and verify content appears in Google Docs
  - [ ] Edit content in Google Docs
  - [ ] Switch snippets in Yarny and verify conflict detection works
  - [ ] Verify no format loss (paragraph breaks, line breaks, special characters)
- [ ] **Round-trip test: Multiple iterations**
  - [ ] Perform 3+ round-trips on same snippet
  - [ ] Verify content integrity maintained across all round-trips
- [ ] **Round-trip test: Special characters**
  - [ ] Test with quotes, em dashes, en dashes, ellipsis, copyright symbols
  - [ ] Verify all special characters round-trip correctly
- [ ] **Round-trip test: Empty content**
  - [ ] Create empty snippet, save, edit in Docs, verify round-trip
- [ ] **Round-trip test: Very long content**
  - [ ] Test with 10KB+ content snippet
  - [ ] Verify performance and content integrity

## Phase 5: Library Features & Goals UI

### Conflict Resolution Manual Testing
- [ ] **Cross-edit conflict: Google Docs while Yarny idle**
  - [ ] Open snippet in Yarny React app
  - [ ] Leave Yarny open and idle
  - [ ] Edit same snippet in Google Docs
  - [ ] Return to Yarny and switch snippets
  - [ ] Verify conflict detection modal appears
  - [ ] Verify both local and Drive versions are displayed
  - [ ] Test "Use Local" resolution
  - [ ] Test "Use Drive" resolution
  - [ ] Test "Cancel" resolution
- [ ] **Cross-edit conflict: Second Yarny tab**
  - [ ] Open same snippet in two Yarny tabs (React app)
  - [ ] Edit in first tab
  - [ ] Edit in second tab
  - [ ] Switch snippets in first tab
  - [ ] Verify conflict detection works correctly
- [ ] **Conflict resolution: Modified times display**
  - [ ] Verify conflict modal shows correct modified times for both versions
  - [ ] Verify times are in user's timezone

## Phase 6: Lazy Loading & Exports

### Smoke Tests with test-small Project
- [ ] **Story operations**
  - [ ] Create new story
  - [ ] Verify story appears in list
  - [ ] Verify story folder created in Google Drive
  - [ ] Delete story
  - [ ] Verify story removed from list
  - [ ] Verify story folder deleted from Drive (if option selected)
- [ ] **Chapter operations**
  - [ ] Create new chapter
  - [ ] Reorder chapters via drag & drop
  - [ ] Verify order persisted in Google Drive
  - [ ] Verify order survives page refresh
- [ ] **Snippet operations**
  - [ ] Create new snippet
  - [ ] Reorder snippets within chapter via drag & drop
  - [ ] Move snippet between chapters
  - [ ] Verify order persisted in Google Drive
  - [ ] Verify order survives page refresh
- [ ] **Conflict resolution operations**
  - [ ] Trigger conflict detection
  - [ ] Test "Use Local" - verify local content saved to Drive
  - [ ] Test "Use Drive" - verify Drive content loaded into editor
  - [ ] Test "Cancel" - verify no changes made
- [ ] **Auto-save persistence**
  - [ ] Make edits in editor
  - [ ] Verify save status updates correctly
  - [ ] Verify changes saved to Google Drive
  - [ ] Refresh page and verify changes persisted

### Smoke Tests with test-medium Project
- [ ] **Upload test-medium project to Google Drive** - Follow upload guide
- [ ] **Performance validation**
  - [ ] Load test-medium project (10 chapters, 80 snippets)
  - [ ] Verify editor loads within performance budgets
  - [ ] Verify snippet switching is responsive
  - [ ] Verify no jank while typing
- [ ] **Export operations**
  - [ ] Export all chapters as combined document
  - [ ] Verify export creates Google Doc in story folder
  - [ ] Verify all snippets included in correct order
  - [ ] Export outline
  - [ ] Verify outline includes story, chapter, and snippet descriptions
  - [ ] Export People notes
  - [ ] Export Places notes
  - [ ] Export Things notes

### Smoke Tests with test-large Project
- [ ] **Upload test-large project to Google Drive** - Follow upload guide
- [ ] **Large project performance**
  - [ ] Load test-large project (25 chapters, 375 snippets)
  - [ ] Verify editor loads within performance budgets
  - [ ] Verify virtualization kicks in for story list (if 20+ stories)
  - [ ] Verify lazy loading works correctly
- [ ] **Export chunking validation**
  - [ ] Export Chapter 13 (55 snippets - very large chapter)
  - [ ] Verify export uses chunking for large content
  - [ ] Verify all snippets included in correct order
  - [ ] Verify export progress dialog shows correctly
  - [ ] Verify final document is complete

## Phase 7: Accessibility, Performance & Polish

### Accessibility Manual Testing
- [ ] **Keyboard-only flows**
  - [ ] Create story using only keyboard
  - [ ] Rename story using only keyboard
  - [ ] Reorder chapters using only keyboard (arrow keys)
  - [ ] Reorder snippets using only keyboard (arrow keys)
  - [ ] Export using only keyboard
  - [ ] Complete all core tasks using only keyboard
- [ ] **Screen reader testing**
  - [ ] Test with NVDA (Windows) or VoiceOver (Mac)
  - [ ] Verify all interactive elements are announced
  - [ ] Verify form labels are read correctly
  - [ ] Verify modal dialogs are announced
  - [ ] Verify error messages are announced
- [ ] **Contrast verification**
  - [ ] Run contrast checker against actual UI backgrounds
  - [ ] Verify all 12 accent colors meet WCAG AA contrast requirements
  - [ ] Document any contrast issues
  - [ ] Fix any contrast issues
- [ ] **Focus management**
  - [ ] Verify visible focus rings on all actionable items
  - [ ] Verify focus order is logical
  - [ ] Verify focus trapped in modals
  - [ ] Verify focus returns after modal closes

### Performance Manual Testing
- [ ] **Performance budgets validation**
  - [ ] Test time-to-first-keystroke (should be ≤ 800ms)
  - [ ] Test snippet switch latency (should be ≤ 300ms)
  - [ ] Test story switch latency (should be ≤ 300ms)
  - [ ] Test frame time while typing (should be < 16ms)
  - [ ] Test with test-medium project (verify budgets met)
  - [ ] Test with test-large project (verify budgets met)
- [ ] **Virtualization testing**
  - [ ] Create 20+ stories to trigger virtualization
  - [ ] Verify virtualization activates automatically
  - [ ] Verify scrolling is smooth
  - [ ] Verify only visible stories are rendered
  - [ ] Verify story cards load correctly when scrolling

### Visual Parity Manual Verification
- [ ] **Side-by-side browser windows**
  - [ ] Open React app at `/editor` in one window
  - [ ] Open legacy app at `/editor.html` in other window
  - [ ] Compare Goal Meter side-by-side
  - [ ] Compare Today Chip side-by-side
  - [ ] Compare Footer counts side-by-side
  - [ ] Compare Story cards side-by-side
  - [ ] Compare Modal spacing side-by-side
  - [ ] Document any differences with screenshots

## Ship Checklist Items

### Offline UX
- [ ] **Offline banner visibility**
  - [ ] Go offline (disable network)
  - [ ] Verify offline banner appears
  - [ ] Verify queued saves indicator shows
  - [ ] Verify footer save status shows offline variant
- [ ] **Offline → Reconnect test**
  - [ ] Go offline
  - [ ] Make multiple edits
  - [ ] Reconnect to network
  - [ ] Verify all queued mutations automatically retry
  - [ ] Verify all changes saved successfully
  - [ ] Verify no text lost

### Timezone Correctness
- [ ] **"Today" chip midnight rollover**
  - [ ] Set system timezone to different IANA timezone
  - [ ] Verify "Today" chip updates correctly at midnight
  - [ ] Test across DST boundaries
- [ ] **Goal calculations across DST**
  - [ ] Set goal with deadline
  - [ ] Test goal calculations across DST boundaries
  - [ ] Verify calculations remain correct

### Order Persistence
- [ ] **Multi-tab reorder test**
  - [ ] Open same story in two tabs
  - [ ] Reorder chapters in first tab
  - [ ] Verify order updates in second tab
- [ ] **Order survives concurrent edits**
  - [ ] Reorder chapters
  - [ ] Make edits in different snippets
  - [ ] Verify order persists
- [ ] **Order survives background loads**
  - [ ] Reorder chapters
  - [ ] Trigger background load
  - [ ] Verify order persists

### RTL Snippet Testing
- [ ] **Add RTL test snippet to test corpus**
  - [ ] Create snippet with RTL text (Arabic, Hebrew, etc.)
  - [ ] Upload to test-small project
- [ ] **RTL caret movement**
  - [ ] Open RTL snippet in editor
  - [ ] Verify caret movement is correct in RTL text
  - [ ] Test arrow keys, Home, End keys
- [ ] **RTL word counting**
  - [ ] Verify word counting includes RTL words correctly
  - [ ] Verify word count updates correctly
- [ ] **RTL paste normalization**
  - [ ] Paste RTL content into editor
  - [ ] Verify normalization handles RTL content correctly

### Memory Bound
- [ ] **Cache size verification**
  - [ ] Open many snippets (50+)
  - [ ] Verify cache limited to 50 most-recent snippet bodies
  - [ ] Verify LRU eviction works
  - [ ] Verify active snippet is protected from eviction
- [ ] **Long session memory test**
  - [ ] Use app for extended period (1+ hour)
  - [ ] Open and close many snippets
  - [ ] Verify cache never grows beyond target
  - [ ] Monitor memory usage

## Notes Sidebar Testing

- [ ] **Notes display**
  - [ ] Upload test project with People, Places, Things notes
  - [ ] Verify notes appear in Notes Sidebar
  - [ ] Verify notes display with content preview
  - [ ] Verify modified dates display correctly
  - [ ] Verify empty states show correctly
- [ ] **Notes tabs**
  - [ ] Switch between People, Places, Things tabs
  - [ ] Verify correct notes displayed in each tab
  - [ ] Verify loading states show correctly

