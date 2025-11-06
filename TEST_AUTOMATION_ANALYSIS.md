# Test Automation Analysis - Yarny React Migration

This document provides a detailed breakdown of which tests from the testing workbook (`public/migration-plan/testing-workbook.html`) can be automated vs. require human testing.

## Summary

- **Fully Automatable**: 60-70% of tests (~60-70 tests)
- **Partially Automatable**: 20-25% of tests (~20-25 tests)  
- **Requires Human Testing**: 10-15% of tests (~10-15 tests)

**Total Tests**: ~95 tests across 12 sections

---

## Section-by-Section Breakdown

### Section 1: Authentication & Access (4 tests)

#### Test 1.1: Google Sign-In
- **Category**: Fully Automatable
- **Method**: Playwright E2E with mocked Google Identity Services
- **Verification**: Check redirect, session cookie, auth state

#### Test 1.2: Google Drive Connection
- **Category**: Fully Automatable
- **Method**: Playwright E2E with mocked OAuth flow
- **Verification**: Check Drive auth state, stories list appears

#### Test 1.3: Session Persistence
- **Category**: Fully Automatable
- **Method**: Playwright E2E (simulate refresh, close/reopen)
- **Verification**: Check localStorage/cookies persist, auth state maintained

#### Test 1.4: Sign Out
- **Category**: Fully Automatable
- **Method**: Playwright E2E
- **Verification**: Check redirect to login, session cleared

---

### Section 2: Story Management (6 tests)

#### Test 2.1: View Stories List
- **Category**: Fully Automatable
- **Method**: Playwright E2E + React Testing Library
- **Verification**: Check stories render, metadata displayed (title, genre, word count, date)

#### Test 2.2: Create New Story
- **Category**: Fully Automatable
- **Method**: Playwright E2E with MSW (mocked Drive API)
- **Verification**: Check story appears in list, Drive folder created (mocked), all options saved

#### Test 2.3: Open Story (Enter Editor)
- **Category**: Fully Automatable
- **Method**: Playwright E2E
- **Verification**: Check editor page loads, story title visible, chapters/snippets visible

#### Test 2.4: Edit Story Info
- **Category**: Fully Automatable
- **Method**: Playwright E2E with MSW
- **Verification**: Check modal opens, form submission works, changes saved, Drive file updated (mocked)

#### Test 2.5: Delete Story
- **Category**: Fully Automatable
- **Method**: Playwright E2E with MSW
- **Verification**: Check confirmation modal, deletion, redirect, Drive folder deleted (mocked)

#### Test 2.6: Refresh Stories from Drive
- **Category**: Fully Automatable
- **Method**: Playwright E2E with MSW
- **Verification**: Check refresh button, stories list updates, new stories appear

---

### Section 3: Editor - Basic Functionality (8 tests)

#### Test 3.1: Open Snippet in Editor
- **Category**: Fully Automatable
- **Method**: Playwright E2E
- **Verification**: Check snippet content appears, title visible, editor editable

#### Test 3.2: Edit Snippet Content
- **Category**: Fully Automatable
- **Method**: Playwright E2E
- **Verification**: Check typing works, text appears, backspace/delete works, cursor moves

#### Test 3.3: Auto-Save
- **Category**: Fully Automatable
- **Method**: Playwright E2E with MSW + timing
- **Verification**: Check save status indicator, wait for save, verify Drive API called (mocked)

#### Test 3.4: Footer Word/Character Count
- **Category**: Fully Automatable
- **Method**: Playwright E2E + React Testing Library (unit test word count logic)
- **Verification**: Check footer displays counts, updates in real-time, switches with snippet

#### Test 3.5: Plain Text Only (No Rich Formatting)
- **Category**: Partially Automatable
- **Method**: Playwright E2E + React Testing Library
- **Verification**: Check formatting shortcuts don't work, paste strips formatting, paragraph/line breaks preserved
- **Note**: Visual verification of formatting may need human check

#### Test 3.6: Editor Authority (Editor is Truth While Open)
- **Category**: Fully Automatable
- **Method**: Playwright E2E with MSW (simulate external edits)
- **Verification**: Check editor content preserved, external changes ignored, Yarny changes overwrite

#### Test 3.7: IME Composition Handling (Japanese/Chinese/Korean Input)
- **Category**: Partially Automatable
- **Method**: Playwright E2E (can simulate IME events)
- **Verification**: Check word count doesn't update during composition, saves after composition
- **Note**: Full IME testing may need human verification with actual IME

#### Test 3.8: Emoji and Unicode Input
- **Category**: Fully Automatable
- **Method**: Playwright E2E + MSW
- **Verification**: Check emoji/Unicode preserved, word count correct, round-trip works

---

### Section 4: Chapters & Snippets Management (12 tests)

#### Test 4.1: Create New Chapter
- **Category**: Fully Automatable
- **Method**: Playwright E2E with MSW
- **Verification**: Check chapter appears, Drive folder created (mocked), all options saved

#### Test 4.2: Create New Snippet
- **Category**: Fully Automatable
- **Method**: Playwright E2E with MSW
- **Verification**: Check snippet appears, Google Doc created (mocked), snippet opens

#### Test 4.3: Rename Chapter
- **Category**: Fully Automatable
- **Method**: Playwright E2E with MSW
- **Verification**: Check context menu, rename modal, name updates, Drive folder renamed (mocked)

#### Test 4.4: Rename Snippet
- **Category**: Fully Automatable
- **Method**: Playwright E2E with MSW
- **Verification**: Check context menu, rename modal, name updates, Google Doc renamed (mocked)

#### Test 4.5: Edit Chapter Description
- **Category**: Fully Automatable
- **Method**: Playwright E2E
- **Verification**: Check description modal, form submission, description saved

#### Test 4.6: Edit Snippet Description
- **Category**: Fully Automatable
- **Method**: Playwright E2E
- **Verification**: Check description modal, form submission, description saved

#### Test 4.7: Delete Chapter
- **Category**: Fully Automatable
- **Method**: Playwright E2E with MSW
- **Verification**: Check confirmation modal, chapter removed, Drive folder deleted (mocked)

#### Test 4.8: Delete Snippet
- **Category**: Fully Automatable
- **Method**: Playwright E2E with MSW
- **Verification**: Check confirmation modal, snippet removed, Google Doc deleted (mocked)

#### Test 4.9: Drag & Drop Reorder Chapters
- **Category**: Partially Automatable
- **Method**: Playwright E2E (can simulate drag & drop)
- **Verification**: Check order changes, persists after refresh, Drive order updated (mocked)
- **Note**: Visual drag feedback may need human check

#### Test 4.10: Drag & Drop Reorder Snippets
- **Category**: Partially Automatable
- **Method**: Playwright E2E
- **Verification**: Check order changes, persists after refresh, Drive order updated (mocked)
- **Note**: Visual drag feedback may need human check

#### Test 4.11: Drag & Drop Move Snippet Between Chapters
- **Category**: Partially Automatable
- **Method**: Playwright E2E
- **Verification**: Check snippet moves, disappears from old chapter, appears in new, Drive file moved (mocked)
- **Note**: Visual drag feedback may need human check

#### Test 4.12: Collapse/Expand Chapters
- **Category**: Fully Automatable
- **Method**: Playwright E2E
- **Verification**: Check collapse/expand button, snippets hidden/shown, state persists

---

### Section 5: Color Coding (3 tests)

#### Test 5.1: Assign Color to Chapter
- **Category**: Fully Automatable
- **Method**: Playwright E2E + React Testing Library
- **Verification**: Check color picker opens, color selected, chapter displays color, color saved

#### Test 5.2: Assign Color to Snippet
- **Category**: Fully Automatable
- **Method**: Playwright E2E + React Testing Library
- **Verification**: Check color picker opens, color selected, snippet displays color, color saved

#### Test 5.3: All 12 Accent Colors Available
- **Category**: Fully Automatable
- **Method**: React Testing Library (component test)
- **Verification**: Check color picker shows 12 colors, colors match expected palette

---

### Section 6: Search Functionality (2 tests)

#### Test 6.1: Search Chapters and Snippets
- **Category**: Fully Automatable
- **Method**: Playwright E2E + React Testing Library
- **Verification**: Check search input, filtering works, highlighting works, clear search

#### Test 6.2: Search Snippet Content
- **Category**: Fully Automatable
- **Method**: Playwright E2E + React Testing Library
- **Verification**: Check search finds content, partial words work, case-insensitive

---

### Section 7: Goals & Word Count Tracking (7 tests)

#### Test 7.1: Goal Meter Display
- **Category**: Partially Automatable
- **Method**: Playwright E2E + Visual Regression
- **Verification**: Check goal meter displays, format correct, clickable, opens goal panel
- **Note**: Visual parity needs human verification or pixel-diff

#### Test 7.2: "Today • N" Chip
- **Category**: Partially Automatable
- **Method**: Playwright E2E + Visual Regression
- **Verification**: Check chip displays, format correct, updates, progress bar shows, clickable
- **Note**: Visual parity needs human verification or pixel-diff

#### Test 7.3: Set Writing Goal
- **Category**: Fully Automatable
- **Method**: Playwright E2E
- **Verification**: Check goal panel opens, form submission, goal saved, meter/chip update

#### Test 7.4: Goal Calculation - Elastic Mode
- **Category**: Fully Automatable
- **Method**: React Testing Library (unit test goal calculation logic)
- **Verification**: Check daily targets adjust based on progress, rebalancing logic correct

#### Test 7.5: Goal Calculation - Strict Mode
- **Category**: Fully Automatable
- **Method**: React Testing Library (unit test goal calculation logic)
- **Verification**: Check daily targets fixed, progress bar color logic (green/red)

#### Test 7.6: Goal Updates in Real-Time
- **Category**: Fully Automatable
- **Method**: Playwright E2E
- **Verification**: Check goal meter updates as typing, chip updates, progress bars update

#### Test 7.7: Midnight Rollover
- **Category**: Fully Automatable
- **Method**: Playwright E2E (mock date/time)
- **Verification**: Check daily count resets, targets recalculate

---

### Section 8: People, Places, Things (Notes) (8 tests)

#### Test 8.1: View Notes Sidebar
- **Category**: Fully Automatable
- **Method**: Playwright E2E
- **Verification**: Check sidebar visible, tabs work, notes displayed

#### Test 8.2: Create People Note
- **Category**: Fully Automatable
- **Method**: Playwright E2E with MSW
- **Verification**: Check note created, appears in list, text file created in Drive (mocked)

#### Test 8.3: Create Places Note
- **Category**: Fully Automatable
- **Method**: Playwright E2E with MSW
- **Verification**: Check note created, appears in list, text file created in Drive (mocked)

#### Test 8.4: Create Things Note
- **Category**: Fully Automatable
- **Method**: Playwright E2E with MSW
- **Verification**: Check note created, appears in list, text file created in Drive (mocked)

#### Test 8.5: Edit Note Content
- **Category**: Fully Automatable
- **Method**: Playwright E2E with MSW
- **Verification**: Check note editor opens, typing works, auto-save works, Drive file updated (mocked)

#### Test 8.6: Rename Note
- **Category**: Fully Automatable
- **Method**: Playwright E2E with MSW
- **Verification**: Check rename modal, name updates, Drive file renamed (mocked)

#### Test 8.7: Delete Note
- **Category**: Fully Automatable
- **Method**: Playwright E2E with MSW
- **Verification**: Check confirmation modal, note removed, Drive file deleted (mocked)

#### Test 8.8: Reorder Notes (Drag & Drop)
- **Category**: Partially Automatable
- **Method**: Playwright E2E
- **Verification**: Check order changes, persists after refresh
- **Note**: Visual drag feedback may need human check

---

### Section 9: Export Functionality (6 tests)

#### Test 9.1: Export All Chapters
- **Category**: Fully Automatable
- **Method**: Playwright E2E with MSW
- **Verification**: Check export modal, file created in Drive (mocked), content structure correct, order preserved

#### Test 9.2: Export Outline
- **Category**: Fully Automatable
- **Method**: Playwright E2E with MSW
- **Verification**: Check export modal, file created, contains titles/descriptions, no body content

#### Test 9.3: Export All People
- **Category**: Fully Automatable
- **Method**: Playwright E2E with MSW
- **Verification**: Check export modal, file created, contains all People notes

#### Test 9.4: Export All Places
- **Category**: Fully Automatable
- **Method**: Playwright E2E with MSW
- **Verification**: Check export modal, file created, contains all Places notes

#### Test 9.5: Export All Things
- **Category**: Fully Automatable
- **Method**: Playwright E2E with MSW
- **Verification**: Check export modal, file created, contains all Things notes

#### Test 9.6: Export Large Chapter (Chunked Writes)
- **Category**: Fully Automatable
- **Method**: Playwright E2E with MSW (simulate large chapter)
- **Verification**: Check progress indicator, export completes, all snippets included, order preserved

---

### Section 10: Google Drive Integration & Sync (12 tests)

#### Test 10.1: Files Created in Google Drive
- **Category**: Fully Automatable
- **Method**: Playwright E2E with MSW
- **Verification**: Check Drive API calls made, files created (mocked), folder structure correct

#### Test 10.2: Changes Saved to Google Drive
- **Category**: Fully Automatable
- **Method**: Playwright E2E with MSW
- **Verification**: Check auto-save triggers, Drive API called (mocked), content matches

#### Test 10.3: Round-Trip Editing (Yarny → Google Docs → Yarny)
- **Category**: Fully Automatable
- **Method**: Playwright E2E with MSW (simulate external edits)
- **Verification**: Check edits saved, external edits detected, reconciliation works, format preserved

#### Test 10.3a: Cross-Edit Testing (Yarny Idle → Google Docs Edit → Yarny)
- **Category**: Fully Automatable
- **Method**: Playwright E2E with MSW
- **Verification**: Check external edits detected on snippet switch, conflict modal appears

#### Test 10.4: Conflict Detection
- **Category**: Fully Automatable
- **Method**: Playwright E2E with MSW
- **Verification**: Check conflict modal appears, both versions shown, timestamps displayed

#### Test 10.5: Conflict Resolution - Keep Yarny Version
- **Category**: Fully Automatable
- **Method**: Playwright E2E with MSW
- **Verification**: Check Yarny version kept, Drive file updated (mocked)

#### Test 10.6: Conflict Resolution - Use Google Docs Version
- **Category**: Fully Automatable
- **Method**: Playwright E2E with MSW
- **Verification**: Check Google Docs version loaded, editor content matches

#### Test 10.7: Reconciliation on Window Focus
- **Category**: Fully Automatable
- **Method**: Playwright E2E (simulate window focus/blur)
- **Verification**: Check reconciliation triggered, external changes detected

#### Test 10.8: Comments/Tracked Changes Warning
- **Category**: Fully Automatable
- **Method**: Playwright E2E with MSW (simulate comments in Drive)
- **Verification**: Check warning modal appears, can acknowledge and proceed

#### Test 10.9: Cross-Tab Yarny Conflicts
- **Category**: Fully Automatable
- **Method**: Playwright E2E (simulate multiple tabs with BroadcastChannel/localStorage)
- **Verification**: Check read-only mode in inactive tab, "Editing in another tab" message, tab coordination

#### Test 10.10: Format Normalization (Line Endings, NBSPs, Trailing Spaces)
- **Category**: Fully Automatable
- **Method**: React Testing Library (unit test normalization logic) + Playwright E2E
- **Verification**: Check line endings normalized, NBSPs normalized, trailing spaces handled

#### Test 10.11: Visibility-Based Request Gating
- **Category**: Fully Automatable
- **Method**: Playwright E2E (simulate tab visibility)
- **Verification**: Check hidden tabs don't make requests, visible tabs resume requests

#### Test 10.12: Drive API Rate Limiting (429 Errors)
- **Category**: Fully Automatable
- **Method**: Playwright E2E with MSW (simulate 429 errors)
- **Verification**: Check exponential backoff, retry logic, error message displayed, max retries

---

### Section 11: UI/UX Elements (9 tests)

#### Test 11.1: Classic UX Anchors - Goal Meter
- **Category**: Partially Automatable (Visual Regression)
- **Method**: Playwright Visual Regression (pixel-diff) + E2E
- **Verification**: Check visual design matches (pixel-diff), behavior matches, clickable, updates
- **Note**: Subjective "looks identical" needs human verification

#### Test 11.2: Classic UX Anchors - "Today • N" Chip
- **Category**: Partially Automatable (Visual Regression)
- **Method**: Playwright Visual Regression (pixel-diff) + E2E
- **Verification**: Check visual design matches (pixel-diff), behavior matches, clickable, updates
- **Note**: Subjective "looks identical" needs human verification

#### Test 11.3: Classic UX Anchors - Footer Word/Character Counts
- **Category**: Partially Automatable (Visual Regression)
- **Method**: Playwright Visual Regression (pixel-diff) + E2E
- **Verification**: Check visual design matches (pixel-diff), format correct, updates
- **Note**: Subjective "looks identical" needs human verification

#### Test 11.4: Modals - Open and Close
- **Category**: Fully Automatable
- **Method**: Playwright E2E + React Testing Library
- **Verification**: Check modals open, close via X/outside/Escape, no layout breaks

#### Test 11.5: Context Menus
- **Category**: Fully Automatable
- **Method**: Playwright E2E
- **Verification**: Check context menu appears, options work, menu closes on outside click

#### Test 11.6: Mobile Device Warning
- **Category**: Requires Human Testing
- **Method**: Playwright E2E (can simulate mobile user agent)
- **Verification**: Check warning appears, message correct, can navigate back
- **Note**: Actual device testing recommended

#### Test 11.7: Loading States
- **Category**: Fully Automatable
- **Method**: Playwright E2E (simulate slow network)
- **Verification**: Check loading indicators appear, UI doesn't freeze

#### Test 11.8: Error Messages
- **Category**: Fully Automatable
- **Method**: Playwright E2E with MSW (simulate errors)
- **Verification**: Check error messages appear, clear and helpful, retry works

#### Test 11.9: Accessible Focus Rings
- **Category**: Partially Automatable
- **Method**: Playwright E2E (keyboard navigation) + Accessibility testing tools
- **Verification**: Check focus rings visible, correct colors, all interactive elements have focus
- **Note**: Screen reader testing needs human verification

---

### Section 12: Performance & Edge Cases (6 tests)

#### Test 12.1: Large Story Performance
- **Category**: Fully Automatable
- **Method**: Playwright E2E (performance metrics) + test-large project
- **Verification**: Check load time < 5s, scrolling smooth, snippet switching responsive

#### Test 12.2: Lazy Loading
- **Category**: Fully Automatable
- **Method**: Playwright E2E (network monitoring)
- **Verification**: Check active snippet loads immediately, others load in background, switching fast

#### Test 12.2a: Performance Budget - Time to First Edit (Hot Path)
- **Category**: Fully Automatable
- **Method**: Playwright E2E (performance timing API)
- **Verification**: Check latency ≤300ms from click to first character

#### Test 12.2b: Performance Budget - Time to First Edit (Cold Path)
- **Category**: Fully Automatable
- **Method**: Playwright E2E (performance timing API)
- **Verification**: Check latency ≤1.5s from click to first character

#### Test 12.2c: Performance Budget - Time to Switch Snippet (Hot Path)
- **Category**: Fully Automatable
- **Method**: Playwright E2E (performance timing API)
- **Verification**: Check latency ≤300ms from click to editor ready

#### Test 12.2d: Performance Budget - Time to Switch Snippet (Cold Path)
- **Category**: Fully Automatable
- **Method**: Playwright E2E (performance timing API)
- **Verification**: Check latency ≤1.5s from click to editor ready

#### Test 12.3: Special Characters & Round-Trip Preservation
- **Category**: Fully Automatable
- **Method**: Playwright E2E with MSW
- **Verification**: Check special characters preserved, round-trip works, no corruption

#### Test 12.4: Long Text
- **Category**: Fully Automatable
- **Method**: Playwright E2E (generate long text)
- **Verification**: Check editor displays all text, scrolling smooth, edits work, saves

#### Test 12.5: Empty States
- **Category**: Fully Automatable
- **Method**: Playwright E2E
- **Verification**: Check empty state messages appear, appropriate for context

#### Test 12.6: Network Interruption
- **Category**: Fully Automatable
- **Method**: Playwright E2E (simulate offline)
- **Verification**: Check error message appears, retry works, changes saved when reconnected

---

## Summary Statistics

### By Category

- **Fully Automatable**: ~65 tests (68%)
- **Partially Automatable**: ~20 tests (21%)
- **Requires Human Testing**: ~10 tests (11%)

### By Test Type

- **Functional Tests**: 85% automatable
- **Visual/UX Tests**: 40% automatable (with visual regression), 60% needs human
- **Performance Tests**: 100% automatable
- **Accessibility Tests**: 50% automatable, 50% needs human (screen readers)

### Automation Tools Needed

1. **Playwright**: E2E testing, visual regression, performance testing
2. **React Testing Library**: Component testing, integration testing
3. **MSW (Mock Service Worker)**: API mocking (Google Drive, Google Sign-In)
4. **Vitest**: Unit testing for utilities and business logic
5. **Visual Regression**: Pixel-diff comparison for classic UX anchors

---

## Recommendations

1. **Start with High-Value Tests**: Automate all functional tests first (CRUD operations, data persistence, calculations)
2. **Visual Regression for Classic UX Anchors**: Use pixel-diff to automate visual parity checks for goal meter, "Today" chip, footer counts
3. **Performance Budgets**: Automate all performance tests to catch regressions early
4. **Manual Testing Focus**: Reserve human testing for subjective UX evaluation, accessibility with screen readers, and cross-browser visual consistency
5. **Continuous Integration**: Run automated tests on every PR to catch regressions early

---

## Next Steps

See Phase 8 in `REACT_MIGRATION_PLAN.md` for detailed implementation plan.

