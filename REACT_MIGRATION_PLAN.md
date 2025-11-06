# React + TypeScript Migration Plan - Yarny App

## Executive Summary

This document outlines the plan and effort estimation for converting the Yarny writing application from vanilla JavaScript to **React with TypeScript**, while maintaining the existing Netlify Functions backend.

**Key Finding**: Using third-party React libraries can reduce the Level of Effort (LOE) by **40-50%**, making the migration significantly more feasible.

**Technology Stack**: React 18 + TypeScript 5 + Vite

---

## Understanding TypeScript + React

### They Work Together, Not Separately

**Important**: TypeScript and React are not alternatives—they work together. Everything in this migration will be built using **React components written in TypeScript**.

- **TypeScript** = The programming language (typed JavaScript)
- **React** = The UI framework/library for building components
- **Result** = React components written in TypeScript (`.tsx` files)

### What Gets Built as React Components (TypeScript)

All UI components will be React components written in TypeScript:

- **Pages**: `LoginPage.tsx`, `StoriesPage.tsx`, `EditorPage.tsx`
- **Editor Components**: `Editor.tsx`, `StorySidebar.tsx`, `NotesSidebar.tsx`, `TipTapEditor.tsx`
- **UI Components**: `Modal.tsx`, `ColorPicker.tsx`, `ContextMenu.tsx`, etc.
- **Shared Components**: `Header.tsx`, `Footer.tsx`

### What Gets Built as React Hooks (TypeScript)

Business logic will be React hooks written in TypeScript:

- **`useDrive.ts`** - Google Drive API wrapper with TypeScript types
- **`useAuth.ts`** - Authentication logic with TypeScript types
- **`useStory.ts`** - Story management with TypeScript types
- **`useGoal.ts`** - Goal calculation algorithms with TypeScript types
- **`useMobileDetection.ts`** - Mobile device detection

### What Gets Built as TypeScript Utilities

Pure functions and utilities written in TypeScript (no React):

- **`wordCount.ts`** - Word counting logic
- **`export.ts`** - Export functionality
- **`goalCalculation.ts`** - Goal calculation algorithms
- **`api/drive.ts`** - Drive API client with TypeScript types

### What Gets Built as TypeScript State Management

State management using Zustand with TypeScript:

- **`store/store.ts`** - Zustand store with TypeScript interfaces
- **`store/types.ts`** - TypeScript type definitions for all state structures

### What Stays the Same (No Changes)

- **Netlify Functions** (backend) - Remain in JavaScript (no changes needed)
- **Backend API endpoints** - No changes required
- **Google Drive API integration** - Backend already works, just needs React wrapper

### Example: React Component in TypeScript

```typescript
// File: src/components/editor/Editor.tsx
// This is a React component written in TypeScript

import React from 'react';
import { useStore } from '../../store/store';
import { Group } from '../../store/types';

interface EditorProps {
  storyId: string;
}

export function Editor({ storyId }: EditorProps): JSX.Element {
  const groups = useStore((state) => state.groups);
  const activeSnippetId = useStore((state) => state.project.activeSnippetId);
  
  // Component logic here...
  
  return (
    <div className="editor">
      {/* JSX here */}
    </div>
  );
}
```

### Example: React Hook in TypeScript

```typescript
// File: src/hooks/useDrive.ts
// This is a React hook written in TypeScript

import { useState, useEffect } from 'react';
import { DriveFile } from '../api/drive';

interface UseDriveResult {
  files: DriveFile[];
  loading: boolean;
  error: Error | null;
}

export function useDrive(folderId: string): UseDriveResult {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Hook logic here...
  
  return { files, loading, error };
}
```

### Summary

- ✅ **Everything** = React components written in TypeScript
- ✅ **UI Components** = React (`.tsx` files)
- ✅ **Business Logic** = React hooks (`.ts` files)
- ✅ **Utilities** = TypeScript functions (`.ts` files)
- ✅ **State** = Zustand with TypeScript types
- ❌ **Backend** = Stays in JavaScript (no changes)

**The plan states**: "This migration will use **TypeScript** throughout. All components, hooks, utilities, and state management will be written in TypeScript."

---

## Current Project Analysis

### Codebase Statistics
- **Total JavaScript**: ~8,782 lines across 4 main files
- **Largest File**: `editor.js` - 6,069 lines
- **Other Files**: 
  - `stories.js` - ~1,837 lines
  - `app.js` - ~503 lines
  - `drive.js` - ~269 lines
- **Architecture**: Vanilla JavaScript with direct DOM manipulation
- **Backend**: Already using Netlify Functions (no changes needed)

### Current Features
- ✅ Plain text editor (contentEditable, minimalist formatting)
- ✅ Story/Chapter/Snippet management
- ✅ Google Drive integration
- ✅ Google Sign-In authentication
- ✅ Drag & drop reordering
- ✅ Color coding for chapters/snippets (12 accent colors)
- ✅ Word count tracking & goals (elastic/strict modes)
- ✅ Search functionality
- ✅ Export functionality (chapters, outline, people, places, things)
- ✅ Notes system (People/Places/Things)
- ✅ Multiple modals and UI components
- ✅ Context menus
- ✅ Real-time save status
- ✅ Mobile device detection & warning
- ✅ Error logging to localStorage
- ✅ Lazy loading of snippet content
- ✅ Background loading optimization
- ✅ Conflict resolution (Yarny vs Google Docs)
- ✅ Comments/tracked changes detection

---

## Preserve Classic UX Anchors (P1/P2 Priority)

### Overview

**Why**: These UI elements are recognizable bits from the 2011–2015 screenshots that define Yarny's identity. Preserving them intact avoids the "new app uncanny valley" and maintains user familiarity during migration.

**What**: These specific UI elements must be preserved exactly as they appear in the current app, with identical visual design, behavior, and placement.

### Elements to Preserve

#### 1. Left-Rail Goal Meter

**Location**: Left sidebar, below story title and settings button

**Current Implementation**:
- Displays total word count vs. goal (e.g., "0 / 3,000")
- Progress bar showing completion percentage
- Clickable to open goal panel
- Updates in real-time as user writes

**Preservation Requirements**:
- ✅ Exact same visual design (font size, colors, spacing, border radius)
- ✅ Same placement in left rail header
- ✅ Same click behavior (opens goal panel)
- ✅ Same real-time update behavior
- ✅ Same progress bar styling and animation

**Code Locations**:
- `editor.html` lines 71-76 (HTML structure)
- `editor.css` lines 106-135 (styling)
- `editor.js` lines 974-986 (`updateGoalMeter` function)

**React Implementation**:
- Create `GoalMeter.tsx` component in `src/components/editor/`
- Preserve exact CSS classes and styling
- Use same calculation logic (`calculateStoryWordCount`)
- Maintain click handler to open goal panel

#### 2. "Today • N" Chip

**Location**: Left sidebar, below goal meter

**Current Implementation**:
- Displays "Today" label with daily word count (e.g., "Today • 250")
- Progress bar showing daily progress toward daily target
- Color-coded progress bar (green when ahead, red when behind in strict mode)
- Clickable to open goal panel
- Shows "—" when no goal is set

**Preservation Requirements**:
- ✅ Exact same visual design (chip style, padding, border, colors)
- ✅ Same placement below goal meter
- ✅ Same "Today • N" format with number formatting (e.g., "1,234" with commas)
- ✅ Same progress bar styling (2px height, subtle background)
- ✅ Same color logic (green/red in strict mode, primary color otherwise)
- ✅ Same click behavior (opens goal panel)
- ✅ Always visible (even when no goal set, shows "—")
- ✅ **Enhanced UX**: Expose "ahead/behind by N words" in chip state (e.g., "Today • 250 (+50 ahead)" or "Today • 150 (-50 behind)") so benefit is visible even when users don't open goal panel

**Code Locations**:
- `editor.html` lines 77-83 (HTML structure)
- `editor.css` lines 137-187 (styling)
- `editor.js` lines 988-1055 (`updateTodayChip` function)

**React Implementation**:
- Create `TodayChip.tsx` component in `src/components/editor/`
- Preserve exact CSS classes and styling
- Use same calculation logic (`calculateDailyTarget`)
- Maintain color logic for strict mode (ahead/behind indicators)
- Format numbers with `toLocaleString()` for comma separators

#### 3. Footer Word/Character Counts

**Location**: Footer bar, center section

**Current Implementation**:
- Displays "Words: N" and "Characters: N" with separator ("—")
- Updates in real-time as user types
- Shows counts for active snippet only
- Centered in footer bar
- Small font size, secondary text color

**Preservation Requirements**:
- ✅ Exact same visual design (font size, color, spacing, separator)
- ✅ Same placement in footer center
- ✅ Same format ("Words: N — Characters: N")
- ✅ Same real-time update behavior
- ✅ Same calculation logic (active snippet only)

**Code Locations**:
- `editor.html` lines 185-189 (HTML structure)
- `editor.css` lines 889-898 (styling)
- `editor.js` lines 949-972 (`updateFooter` function)

**React Implementation**:
- Create `Footer.tsx` component in `src/components/shared/`
- Preserve exact CSS classes and styling
- Use same calculation logic (active snippet word/char count)
- Update on active snippet change and content changes

#### 4. Version Slider Affordance

**Location**: Footer bar (historical Yarny UI - core affordance)

**Historical Implementation** (2011-2015 Yarny app):
- **Core Feature**: The version slider was a fundamental UI affordance in the original Yarny app footer
- Allows users to view/edit different versions of a snippet
- Timeline/history slider or version selector in the footer area
- **Note**: This feature may not be present in the current codebase but was a core part of Yarny's historical UX

**Preservation Requirements**:
- ✅ If present in current app: Preserve exact design and behavior
- ✅ If not present: Document for future implementation to restore this core historical affordance
- ✅ Maintain same visual affordance and interaction pattern as original design
- ✅ Reference original 2011-2015 UI documentation for specification details

**Investigation Needed**:
- Check reference documentation for original version slider implementation
- Verify if this feature exists in current codebase under different name or in a different location
- Review reference docs (Yarny_UI_Evidence_Book_Annotated_IMAGES.pdf, Yarny_UI_Companion_Notes_and_Spec_Crosswalk.pdf) for version slider specifications
- Document findings and implementation plan for restoration

**React Implementation**:
- If feature exists: Create `VersionSlider.tsx` component in `src/components/shared/` (footer area)
- Preserve exact design and interaction patterns from historical UI
- If not present: Document as future feature to restore this core historical affordance
- Anchor specification to original 2011-2015 UI design to ensure it doesn't get lost

### Implementation Strategy

#### Phase 1: Document and Audit

1. **Audit Current Implementation**:
   - Document exact HTML structure for each element
   - Document exact CSS styling (colors, spacing, fonts, animations)
   - Document exact JavaScript behavior (click handlers, update logic)
   - Take screenshots for visual reference

2. **Create Component Specifications**:
   - Create detailed specs for each component
   - Include pixel-perfect measurements
   - Document all state dependencies
   - Document all event handlers

#### Phase 4: Implement Footer Components

1. **Footer Component**:
   - Create `Footer.tsx` with exact styling
   - Implement `updateFooter` logic as hook
   - Preserve word/character count display
   - Test visual parity with current app

#### Phase 5: Implement Goals UI Components

1. **Goal Meter Component**:
   - Create `GoalMeter.tsx` with exact styling
   - Implement `updateGoalMeter` logic as hook
   - Test visual parity with current app

2. **Today Chip Component**:
   - Create `TodayChip.tsx` with exact styling
   - Implement `updateTodayChip` logic as hook
   - Preserve color logic for strict mode
   - Test visual parity with current app

3. **Version Slider** (historical core affordance):
   - Investigate current implementation status
   - Review historical UI documentation for specification
   - Create component if feature exists in current codebase
   - If not present, document for future restoration of this core historical affordance
   - Preserve exact design and behavior from original 2011-2015 UI

#### Phase 7: Visual Parity Testing

1. **Side-by-Side Comparison** (Required before closing editor phase):
   - Deploy React app to `/react` path
   - Compare each element side-by-side with current app
   - **Perform pixel-diff or side-by-side visual comparison** for goal meter, "Today" chip, and footer counts
   - Verify pixel-perfect visual match
   - Verify identical behavior
   - Document any visual discrepancies and resolve before proceeding

2. **User Testing**:
   - Test with users familiar with current app
   - Verify no "uncanny valley" effect
   - Confirm elements feel identical

### Benefits

1. **User Familiarity**: Users won't experience jarring visual changes
2. **Brand Consistency**: Maintains Yarny's recognizable identity
3. **Reduced Learning Curve**: No need to relearn UI elements
4. **Trust**: Preserves elements users rely on daily

### Success Criteria

- [ ] Goal meter looks and behaves identically to current app
- [ ] Today chip looks and behaves identically to current app
- [ ] Footer word/character counts look and behave identically to current app
- [ ] Version slider (if present) looks and behaves identically to historical/current app, or is documented for future restoration
- [ ] **Pixel-diff or side-by-side visual comparison confirms pixel-perfect match** (required before closing editor phase)
- [ ] User testing confirms no "uncanny valley" effect

### LOE

- **Documentation & Audit**: 2-3 hours
- **Component Implementation**: 4-6 hours (Goal Meter, Today Chip, Footer)
- **Version Slider Investigation & Documentation**: 1-2 hours (investigate current status, document historical specification for future restoration if needed)
- **Visual Parity Testing**: 2-3 hours
- **Total**: 9-14 hours

---

## Migration Strategy

### Approach: Incremental Migration
1. Set up React infrastructure alongside existing code
2. Migrate page by page (index → stories → editor)
3. Use third-party libraries to replace custom implementations
4. Maintain feature parity throughout migration

### Deployment Strategy: Parallel Development
- **New React App**: Deploy to `yarny.lindsaybrunner.com/react`
- **Existing App**: Remains live at `yarny.lindsaybrunner.com` (root)
- **Benefits**:
  - Keep existing app fully functional during development
  - Enable side-by-side testing and comparison
  - Allow gradual user migration
  - Easy rollback if needed
  - Test with real users before full migration

### Pages to Migrate
1. **index.html** (Login/Auth) - Low complexity
2. **stories.html** (Story list) - Medium complexity
3. **editor.html** (Main editor) - High complexity
4. **docs.html** (Documentation) - Low complexity

---

## Third-Party Library Replacements

This section details exactly which parts of the current codebase can be replaced by proven React libraries, significantly reducing development time and maintenance burden.

### Replaceable Components & Estimated Savings

| Component | Current Lines | Library | Savings | What It Replaces |
|-----------|---------------|---------|---------|------------------|
| Text Editor (Plain Text) | ~1,500-2,000 | TipTap (Plain Text Only) | ~1,500-2,000 lines | All contentEditable handling, text extraction, plain text formatting logic |
| Modals (8 total) | ~500-800 | Material UI Dialog | ~500-800 lines | Story Info, Export, Description Edit, Goal Panel, Rename, Delete, Conflict Resolution, Comments Warning |
| Drag & Drop | ~300-400 | @dnd-kit | ~300-400 lines | All drag event handlers, drop zones, reordering logic for chapters/snippets |
| Color Picker | ~150 | react-colorful | ~150 lines | Custom color picker UI, color selection logic, positioning |
| Tabs | ~100 | Material UI Tabs | ~100 lines | People/Places/Things tab switching, tab state management |
| Context Menu | ~150 | Material UI Menu | ~150 lines | Right-click menu for rename/delete, menu positioning |
| Dropdown Menus | ~100 | Material UI Menu | ~100 lines | Export dropdown menu, positioning, open/close logic |
| Forms | ~200 | React Hook Form | ~200 lines | Form validation, form state, error handling for all modals |
| Date Picker | ~50 | Material UI DatePicker | ~50 lines | Goal deadline date input, date validation |
| Tooltips | ~50 | Material UI Tooltip | ~50 lines | All title attributes and custom tooltip implementations |
| Toast Notifications | ~100 | react-hot-toast | ~100 lines | Save status updates, error notifications, success messages |
| Collapsible/Accordion | ~100 | Material UI Accordion | ~100 lines | Chapter collapse/expand functionality |
| **TOTAL** | **~3,300-4,200** | | **~3,300-4,200 lines** | **40-50% of codebase** |

### Detailed Component Mapping

#### 1. Rich Text Editor → TipTap (Constrained to Plain Text)
**Current Implementation:**
- `editor.js`: `getEditorTextContent()`, `setEditorTextContent()`, contentEditable event handlers
- Complex text extraction logic handling `<br>`, `<div>`, `<p>` tags
- Line break normalization
- Cursor position management
- Content synchronization with state
- **Content Format**: Plain text with line breaks (`\n`), stored as `snippet.body` string
- **Storage**: Google Docs API (for snippets) or plain text (for notes)
- **Conflict Detection**: Compares plain text content and timestamps

**Replacement:**
- TipTap configured for **minimalist plain text only** (no rich formatting)
- **Format Constraint**: Plain paragraphs and soft line breaks only (matches current model)
- **Editor as Truth**: Editor is authoritative while Yarny is open
- **Reconciliation**: Check for external changes on window focus, reconcile if needed
- **Early Conflict Detection**: Bring conflict detection forward to Phase 1/2
- Type-safe editor API
- Handles cursor management and content synchronization

**Critical Constraints:**
- **NO rich formatting** (bold, italic, colors, etc.) - Google Docs API doesn't handle arbitrary HTML well
- **Plain text only** - matches Yarny's minimalist model
- **Paragraph breaks** - use TipTap's paragraph support for `\n\n` (paragraph breaks)
- **Soft line breaks** - use TipTap's line break support for `\n` (single line breaks)
- **Text extraction** - must extract plain text that matches Google Docs API output format

**Code Locations:**
- `editor.js` lines ~590-670 (text content extraction)
- `editor.js` lines ~669-738 (editor rendering and content management)
- `editor.js` lines ~1160-1383 (conflict detection and resolution)
- All contentEditable event listeners throughout `editor.js`

#### 2. Modals → Material UI Dialog
**Current Implementation:**
- 8 separate modal implementations with custom show/hide logic
- Modal overlay management
- Focus trapping
- Escape key handling
- Click-outside-to-close logic

**Replacement:**
- Material UI Dialog component handles all modal behavior
- Accessible by default (ARIA, focus management)
- Keyboard navigation built-in
- Can style to match existing design with theme customization

**Code Locations:**
- `editor.html` lines 200-571 (all modal HTML structures)
- `editor.js` modal open/close functions throughout

#### 3. Drag & Drop → @dnd-kit
**Current Implementation:**
- Native HTML5 drag events (`dragstart`, `dragover`, `drop`, `dragend`)
- Custom drop zone detection
- Visual feedback during drag
- Reordering logic for groups and snippets

**Replacement:**
- @dnd-kit provides sortable list functionality
- Touch device support
- Better performance than native drag events
- Built-in visual feedback

**Code Locations:**
- `editor.js` lines ~300, 368-376 (group drag handlers)
- `editor.js` lines ~410, 526-534 (snippet drag handlers)
- `editor.js` lines ~766, 905-910 (notes drag handlers)
- All `handleGroupDragStart`, `handleSnippetDragStart`, `handleDragOver`, etc. functions

#### 4. Color Picker → react-colorful
**Current Implementation:**
- Custom color picker UI with 12 color grid
- Positioning logic relative to color chip
- Click-outside-to-close handling
- Color selection and application

**Replacement:**
- react-colorful provides pre-built color picker
- Can be styled to match 12-color palette
- Simpler integration

**Code Locations:**
- `editor.js` lines 2682-2784 (color picker functions)
- `editor.html` lines 437-442 (color picker HTML)

#### 5. Tabs → Material UI Tabs
**Current Implementation:**
- Custom tab switching for People/Places/Things
- Tab state management
- Active tab styling

**Replacement:**
- Material UI Tabs handles all tab functionality
- Accessible keyboard navigation
- Built-in active state management
- Can be styled to match existing design

**Code Locations:**
- `editor.html` lines 115-139 (tabs HTML)
- `editor.js` tab switching logic

#### 6. Context Menu → Material UI Menu
**Current Implementation:**
- Right-click event handling
- Menu positioning
- Rename/Delete menu items

**Replacement:**
- Material UI Menu provides full context menu functionality
- Accessible, keyboard navigable
- Proper positioning with anchor positioning
- Can be styled to match existing design

**Code Locations:**
- `editor.html` lines 444-448 (context menu HTML)
- `editor.js` context menu show/hide logic

#### 7. Forms → React Hook Form
**Current Implementation:**
- Manual form validation
- Form state management
- Error message display
- Used in: Story Info, New Story, Goal Panel, Rename, Description Edit modals

**Replacement:**
- React Hook Form handles validation, state, and errors
- TypeScript integration
- Better performance (uncontrolled components)

**Code Locations:**
- All modal forms in `editor.html` and `stories.html`
- Form validation logic in `editor.js` and `stories.js`

#### 8. Date Picker → Material UI DatePicker
**Current Implementation:**
- Native HTML5 date input
- Date validation
- Used in Goal Panel for deadline selection

**Replacement:**
- Material UI DatePicker provides better UX
- Date range selection
- Integrated with Material UI theme
- Accessible and keyboard navigable

**Code Locations:**
- `editor.html` lines 365-372 (goal deadline input)
- `stories.html` deadline input in new story modal

#### 9. Toast Notifications → react-hot-toast
**Current Implementation:**
- Custom save status updates ("Saving...", "Saved at X:XX")
- Manual status element updates
- Status styling and transitions

**Replacement:**
- react-hot-toast provides toast notifications
- Auto-dismiss, positioning, animations
- Success/error/info variants

**Code Locations:**
- `editor.js` lines 1057-1077 (`updateSaveStatus` function)
- `editor.html` line 108 (save status element)

#### 10. Collapsible/Accordion → Material UI Accordion
**Current Implementation:**
- Custom collapse/expand for chapters
- Collapse state management (localStorage)
- Icon toggling (arrow up/down)

**Replacement:**
- Material UI Accordion handles collapse functionality
- Accessible, keyboard navigable
- Built-in state management
- Can be styled to match existing design

**Code Locations:**
- `editor.js` lines 217-262 (collapse state management)
- `editor.js` lines 303-316 (collapse button rendering)
- `editor.js` lines 254-262 (`toggleGroupCollapse` function)

### Benefits of Using Third-Party Libraries

1. **Massive Code Reduction**: ~3,300-4,200 lines of custom code replaced by battle-tested libraries
2. **Accessibility Built-In**: All Material UI components are fully accessible (ARIA, keyboard nav)
3. **Type Safety**: All recommended libraries have excellent TypeScript support
4. **Maintenance**: Libraries are maintained by teams, reducing our maintenance burden
5. **Performance**: Optimized libraries often perform better than custom implementations
6. **Documentation**: Well-documented libraries with examples and community support
7. **Bug Fixes**: Libraries fix edge cases we haven't encountered yet
8. **Future-Proof**: Libraries evolve with React ecosystem
9. **Consistent Design System**: Material UI provides a cohesive design system that can be customized

### Recommended Library Stack

**Note**: This migration will use **TypeScript** throughout. All components, hooks, utilities, and state management will be written in TypeScript.

```json
{
  "dependencies": {
    "react": "^18.x",
    "react-dom": "^18.x",
    "react-router-dom": "^6.x",
    "@tiptap/react": "^2.x",
    "@tiptap/extension-document": "^2.x",
    "@tiptap/extension-paragraph": "^2.x",
    "@tiptap/extension-text": "^2.x",
    "@tiptap/extension-hard-break": "^2.x",
    "@tiptap/extension-history": "^2.x",
    "@mui/material": "^5.x",
    "@mui/icons-material": "^5.x",
    "@mui/x-date-pickers": "^6.x",
    "@emotion/react": "^11.x",
    "@emotion/styled": "^11.x",
    "@dnd-kit/core": "^6.x",
    "@dnd-kit/sortable": "^8.x",
    "@dnd-kit/utilities": "^3.x",
    "react-colorful": "^5.x",
    "react-hook-form": "^7.x",
    "react-hot-toast": "^2.x",
    "axios": "^1.x",
    "zustand": "^4.x",
    "zod": "^3.x",
    "@tanstack/react-query": "^5.x",
    "@tanstack/react-virtual": "^3.x"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.x",
    "vite": "^5.x",
    "typescript": "^5.x",
    "@types/react": "^18.x",
    "@types/react-dom": "^18.x",
    "@types/node": "^20.x",
    "typescript-plugin-css-modules": "^5.x"
  }
}
```

**Note**: `@tiptap/starter-kit` is **intentionally excluded** from dependencies. We use only individual extensions (Document, Paragraph, Text, HardBreak, History) to maintain strict plain text configuration. Do not add starter-kit to avoid accidental imports and extra bundle weight.

### Library Selection Rationale

#### Text Editor: **TipTap** (Recommended - Plain Text Only)
- ✅ Modern, extensible, built for React
- ✅ **Excellent TypeScript support** - Full type definitions included
- ✅ Active community and maintenance
- ✅ Handles contentEditable complexity
- ✅ Type-safe editor extensions and commands
- ✅ Replaces ~1,500-2,000 lines of custom contentEditable code
- ✅ **Configured for plain text only** - matches Yarny's minimalist model
- ✅ Handles text extraction matching Google Docs API format
- ✅ Supports paragraph breaks and soft line breaks (no rich formatting)
- **Note**: Will be configured with only Document, Paragraph, Text, HardBreak, History extensions (no Bold, Italic, etc.)
- **Alternative**: Slate.js (more complex but powerful, also has TypeScript support)

#### UI Components: **Material UI** (Recommended)
- ✅ Comprehensive component library with consistent design system
- ✅ Full keyboard navigation built-in
- ✅ ARIA attributes automatically handled
- ✅ Highly customizable with theme system - can match existing design
- ✅ **Full TypeScript support** - All components are typed
- ✅ Replaces ~1,000+ lines of modal, menu, tab, tooltip code
- ✅ Provides: Dialog (modals), Menu (dropdowns/context menus), Tabs, Tooltip, Accordion, DatePicker, and many more
- ✅ Includes Material Icons library for consistent iconography
- ✅ Active development and large community
- **Alternative**: Radix UI (unstyled, more minimal) or Headless UI (similar, different API)

#### Drag & Drop: **@dnd-kit** (Recommended)
- ✅ Modern, performant library
- ✅ Better than react-beautiful-dnd (which is unmaintained)
- ✅ Supports sortable lists out of the box
- ✅ Touch device support for tablets
- ✅ Replaces ~300-400 lines of native drag event handling
- ✅ Handles all the drag/drop logic for chapters and snippets
- ✅ Better visual feedback and drop zone detection than native events

---

## MUI Theming Strategy: Keep Brand Look, Use MUI for Plumbing (P2)

### Overview

**Principle**: Keep the brand look; let MUI do the plumbing.

**Why**: MUI is ergonomic but visually opinionated. You've already defined a 12-color system and gradient aesthetic; keep that as the design source of truth while using MUI for accessibility and behaviors. The plan already codifies the palette and usage guidelines—excellent.

### Design Philosophy

1. **Brand as Source of Truth**: The existing 12-color categorical accent system and gradient aesthetic are the design foundation. MUI components will be customized to match this palette, not the other way around.

2. **MUI for Behaviors**: Use MUI components for:
   - Accessibility (ARIA attributes, keyboard navigation, focus management)
   - Interaction behaviors (modal open/close, menu positioning, form validation)
   - Component plumbing (Dialog, Menu, Tabs, Tooltip, Accordion, DatePicker)
   - Built-in accessibility features that would be time-consuming to implement from scratch

3. **Customization Over Defaults**: MUI's theme system will be extensively customized to:
   - Map the 12-color accent palette to MUI's color system
   - Preserve the gradient aesthetic where applicable
   - Maintain the existing visual hierarchy and spacing
   - Keep the minimalist, clean design language

### Implementation Strategy

#### 1. MUI Theme Customization (Start in Phase 1)

Create `src/theme/theme.ts` that maps the brand palette to MUI's theme. **Critical: Include ALL palette tokens and gradient from the start, plus accessible focus rings**:

```typescript
import { createTheme } from '@mui/material/styles';

// Import the COMPLETE 12-color palette from the Color System section
// Include all variants: base, soft, dark, on-solid for each accent color
const brandColors = {
  primary: '#10B981', // Emerald (matches existing primary)
  primaryLight: '#D1FAE5',
  primaryDark: '#059669',
  
  // All 12 accent colors with all variants (base, soft, dark, on-solid)
  accent: {
    red: { base: '#EF4444', soft: '#FEE2E2', dark: '#991B1B', onSolid: '#FFFFFF' },
    orange: { base: '#F97316', soft: '#FFEDD5', dark: '#9A3412', onSolid: '#FFFFFF' },
    amber: { base: '#F59E0B', soft: '#FEF3C7', dark: '#92400E', onSolid: '#1F2937' },
    yellow: { base: '#EAB308', soft: '#FEF9C3', dark: '#854D0E', onSolid: '#1F2937' },
    lime: { base: '#84CC16', soft: '#ECFCCB', dark: '#365314', onSolid: '#0B1220' },
    emerald: { base: '#10B981', soft: '#D1FAE5', dark: '#065F46', onSolid: '#FFFFFF' },
    teal: { base: '#14B8A6', soft: '#CCFBF1', dark: '#115E59', onSolid: '#FFFFFF' },
    cyan: { base: '#06B6D4', soft: '#CFFAFE', dark: '#155E75', onSolid: '#FFFFFF' },
    blue: { base: '#3B82F6', soft: '#DBEAFE', dark: '#1E40AF', onSolid: '#FFFFFF' },
    indigo: { base: '#6366F1', soft: '#E0E7FF', dark: '#3730A3', onSolid: '#FFFFFF' },
    violet: { base: '#8B5CF6', soft: '#EDE9FE', dark: '#5B21B6', onSolid: '#FFFFFF' },
    fuchsia: { base: '#D946EF', soft: '#FAE8FF', dark: '#86198F', onSolid: '#FFFFFF' },
  },
  
  // Neutral colors (text on soft chips)
  neutrals: {
    ink900: '#0F172A',
    ink700: '#334155',
    ink500: '#64748B',
  },
  
  // Dark backgrounds for cards (used in left rail)
  darkCardBg: '#1F2937',
  
  // Pale chip backgrounds (used in left rail)
  paleChipBg: '#F3F4F6',
};

export const theme = createTheme({
  palette: {
    primary: {
      main: brandColors.primary,
      light: brandColors.primaryLight,
      dark: brandColors.primaryDark,
    },
    // Map accent colors to MUI's secondary, error, warning, info, success
    // Or create custom palette extensions
    // Include gradient tokens if applicable
  },
  // Customize component defaults to match brand BEFORE building components
  components: {
    MuiDialog: {
      styleOverrides: {
        paper: {
          // Match existing modal styling - use brand colors
          borderRadius: '8px',
          border: `1px solid ${brandColors.primary}`,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          // Match existing button styling - use brand colors
          '&:focus-visible': {
            // Accessible focus ring: 2px solid primary color with 2px offset
            outline: `2px solid ${brandColors.primary}`,
            outlineOffset: '2px',
          },
        },
      },
    },
    // Global focus ring styling for all interactive elements
    MuiCssBaseline: {
      styleOverrides: {
        '*:focus-visible': {
          // Ensure focus rings are visible against dark cards and pale chips
          outline: `2px solid ${brandColors.primary}`,
          outlineOffset: '2px',
          // For dark backgrounds, use lighter outline
          '@media (prefers-contrast: high)': {
            outlineColor: brandColors.primaryLight,
          },
        },
        // Custom focus rings for dark cards
        '.dark-card:focus-visible': {
          outline: `2px solid ${brandColors.primaryLight}`, // Lighter outline for dark backgrounds
          outlineOffset: '2px',
        },
        // Custom focus rings for pale chips
        '.pale-chip:focus-visible': {
          outline: `2px solid ${brandColors.primaryDark}`, // Darker outline for light backgrounds
          outlineOffset: '2px',
        },
      },
    },
    // Customize focus rings for specific components that may appear on dark cards or pale chips
    MuiListItem: {
      styleOverrides: {
        root: {
          '&.Mui-focusVisible': {
            // Ensure focus ring is visible on dark card backgrounds
            outline: `2px solid ${brandColors.primaryLight}`,
            outlineOffset: '2px',
            backgroundColor: 'rgba(16, 185, 129, 0.1)', // Subtle background highlight
          },
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          '&.Mui-focusVisible': {
            outline: `2px solid ${brandColors.primary}`,
            outlineOffset: '2px',
          },
        },
      },
    },
    // ... customize all MUI components used with brand tokens
  },
});
```

#### 2. Component-Level Styling

For components that need exact brand matching:

- Use MUI's `sx` prop for one-off customizations
- Use `styled()` API for reusable branded components
- Keep MUI's accessibility and behavior, override only visual styling

```typescript
import { Dialog, styled } from '@mui/material';

// Keep MUI Dialog behavior, customize appearance
const BrandedDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    // Match existing modal design exactly
    borderRadius: '8px',
    // Use brand colors
    border: `1px solid ${theme.palette.primary.main}`,
  },
}));
```

#### 3. Color System Integration

The existing 12-color categorical accent system (defined in the Color System section) will be:

- **Preserved**: All color variants (base, soft, dark, on-solid) remain as defined
- **Mapped**: Integrated into MUI's theme system for consistent usage
- **Extended**: Used in MUI components via theme overrides and custom props

#### 4. Usage Guidelines

- **Use MUI components** for: Modals (Dialog), Menus, Tabs, Tooltips, Accordions, DatePickers, Forms
- **Customize appearance** to match: Existing color palette, spacing, typography, border radius, shadows
- **Keep MUI behaviors**: Accessibility, keyboard navigation, focus management, ARIA attributes
- **Preserve brand identity**: Visual design remains consistent with existing app

### Benefits

1. **Accessibility Out of the Box**: MUI components provide full keyboard navigation, ARIA attributes, and focus management without custom implementation
2. **Reduced Code**: ~1,000+ lines of modal, menu, tab code replaced by MUI
3. **Brand Consistency**: Theme customization ensures visual consistency with existing design
4. **Maintainability**: MUI's theming system makes it easy to update brand colors globally
5. **Best of Both Worlds**: Brand look + MUI's proven accessibility and behaviors

### Implementation Timeline

This should be implemented in **Phase 1** (Setup & Infrastructure):
- Create `src/theme/theme.ts` with brand color mappings
- Customize MUI component defaults to match existing design
- Set up theme provider in app root
- Test theme customization with sample components

**LOE**: 4-6 hours (adds time but ensures brand consistency and proper MUI integration)

---

## Effort Estimation

### Original LOE (Without Libraries)

| Task | Hours | Complexity |
|------|-------|------------|
| Editor Component (6,069 lines) | 40-60 | Very High |
| State Management Migration | 20-30 | High |
| ContentEditable Integration | 15-25 | High |
| Stories Page | 12-18 | Medium |
| Authentication Flow | 8-12 | Medium |
| Google Drive Integration | 8-12 | Medium |
| CSS/Styling Updates | 10-15 | Medium |
| Docs Page | 4-6 | Low |
| Export Functionality | 6-10 | Medium |
| Goal Tracking & UI Components | 8-12 | Medium |
| React Setup & Configuration | 8-12 | Medium |
| Testing & Bug Fixes | 20-30 | High |
| **TOTAL** | **159-220** | |

**Timeline**: 4-11 weeks (depending on hours/week)

### Revised LOE (With Third-Party Libraries)

| Task | Hours | Savings |
|------|-------|---------|
| Text Editor (TipTap - Plain Text Only) | 15-25 | 25-35 hrs |
| UI Components (Material UI) | 10-15 | 20-25 hrs |
| Drag & Drop (@dnd-kit) | 4-6 | 11-14 hrs |
| Forms & Inputs (React Hook Form) | 3-4 | 5-8 hrs |
| State Management | 20-30 | 0 hrs |
| Stories Page | 8-12 | 4-6 hrs |
| Authentication Flow | 6-8 | 2-4 hrs |
| Google Drive Integration | 6-8 | 2-4 hrs |
| CSS/Styling Updates | 8-10 | 2-5 hrs |
| Docs Page | 2-3 | 2-3 hrs |
| Export Functionality | 4-6 | 2-4 hrs |
| Goal Tracking | 6-8 | 2-4 hrs |
| React Setup & Configuration | 8-12 | 0 hrs (includes TS setup) |
| TypeScript Type Definitions | 8-12 | -8-12 hrs (adds time but saves debugging) |
| Testing & Bug Fixes | 12-20 | 8 hrs (TypeScript catches errors earlier) |
| **TOTAL** | **105-160** | **66-87 hrs saved** |

**Timeline**: 2.6-4 weeks (40hr/week) or 5.3-8 weeks (20hr/week)

### Optimistic vs Realistic vs Pessimistic

| Scenario | Hours | Weeks (40hr) | Weeks (20hr) |
|----------|-------|--------------|--------------|
| **Optimistic** | 67 | 1.7 | 3.3 |
| **Realistic** | 86 | 2.1 | 4.3 |
| **Pessimistic** | 105 | 2.6 | 5.3 |

---

## Implementation Details

### Modals (8 Total)
1. **Story Info Modal** - Edit story title, genre, description, word goal
2. **Export Filename Modal** - User-provided filename for exports
3. **Description Edit Modal** - Edit chapter/snippet descriptions
4. **Goal Panel Modal** - Set writing goals (target, deadline, days, mode)
5. **Rename Modal** - Rename chapters/snippets
6. **Delete Confirmation Modal** - Confirm deletion
7. **Snippet Conflict Resolution Modal** - Resolve Yarny vs Google Docs conflicts
8. **Comments Warning Modal** - Warn about comments/tracked changes in Google Docs

### Color System

#### Primaries (Brand)
- **Primary**: `#10B981`
- **Primary-light**: `#D1FAE5`
- **Primary-dark**: `#059669`

#### 12 Categorical Accents (Chapter/Snippet Colors)

Each accent color has four variants: base (solid), soft (pale), dark, and on-solid (text color for contrast).

1. **Red**
   - Base: `#EF4444`
   - Soft: `#FEE2E2`
   - Dark: `#991B1B`
   - On-solid: `#FFFFFF`

2. **Orange**
   - Base: `#F97316`
   - Soft: `#FFEDD5`
   - Dark: `#9A3412`
   - On-solid: `#FFFFFF`

3. **Amber**
   - Base: `#F59E0B`
   - Soft: `#FEF3C7`
   - Dark: `#92400E`
   - On-solid: `#1F2937`

4. **Yellow**
   - Base: `#EAB308`
   - Soft: `#FEF9C3`
   - Dark: `#854D0E`
   - On-solid: `#1F2937`

5. **Lime**
   - Base: `#84CC16`
   - Soft: `#ECFCCB`
   - Dark: `#365314`
   - On-solid: `#0B1220`

6. **Emerald**
   - Base: `#10B981`
   - Soft: `#D1FAE5`
   - Dark: `#065F46`
   - On-solid: `#FFFFFF`

7. **Teal**
   - Base: `#14B8A6`
   - Soft: `#CCFBF1`
   - Dark: `#115E59`
   - On-solid: `#FFFFFF`

8. **Cyan**
   - Base: `#06B6D4`
   - Soft: `#CFFAFE`
   - Dark: `#155E75`
   - On-solid: `#FFFFFF`

9. **Blue**
   - Base: `#3B82F6`
   - Soft: `#DBEAFE`
   - Dark: `#1E40AF`
   - On-solid: `#FFFFFF`

10. **Indigo**
    - Base: `#6366F1`
    - Soft: `#E0E7FF`
    - Dark: `#3730A3`
    - On-solid: `#FFFFFF`

11. **Violet**
    - Base: `#8B5CF6`
    - Soft: `#EDE9FE`
    - Dark: `#5B21B6`
    - On-solid: `#FFFFFF`

12. **Fuchsia**
    - Base: `#D946EF`
    - Soft: `#FAE8FF`
    - Dark: `#86198F`
    - On-solid: `#FFFFFF`

#### Neutrals (Text on Soft Chips)
- **Ink-900**: `#0F172A`
- **Ink-700**: `#334155`
- **Ink-500**: `#64748B`

#### Usage Notes
- **Soft**: Use for left-rail "pale chip" backgrounds and subtle tag pills. Pair with Ink-900 text and a 1px border in the base color.
- **Base (solid)**: Use for stronger chips, selected rows, or small badges. Use the listed on-solid color to maintain contrast.
- **Dark**: Use for hover states, borders, or focus rings for the same accent.

### Export Types
1. **Export All Chapters** - All chapters with optional snippet names
2. **Export Outline** - Chapter and snippet titles with descriptions
3. **Export All People** - All person snippets
4. **Export All Places** - All place snippets
5. **Export All Things** - All thing snippets

### Goal System Features
- **Target**: Total word count goal
- **Deadline**: Target completion date
- **Writing Days**: Selectable days of week (Mon-Sun)
- **Mode**: 
  - Elastic: Rebalances daily targets based on progress
  - Strict: Fixed daily targets regardless of progress
- **Days Off**: Comma-separated dates to exclude
- **Midnight Rollover**: Handles day boundary crossings

### Code Statistics
- **Total Functions**: ~987 functions across all JS files
- **Error Logging**: Custom system with localStorage persistence
- **Background Loading**: Optimized batch loading with throttled updates

---

## State Normalization (P1 Priority)

### Overview

**Why**: Moving to React is the perfect moment to stop passing giant nested objects around. Normalized state keeps renders cheap, enables virtualized lists later, and makes the codebase more maintainable.

**What**: Model all entities (stories, groups, snippets, notes, tags, goals) keyed by id in the Zustand store. Use selectors to derive views (e.g., left-rail lists). This keeps renders cheap and enables virtualized lists later.

### Implementation Strategy

#### 1. Normalized Store Structure

All entities will be stored in normalized form (keyed by id) in the Zustand store:

```typescript
// src/store/types.ts
export interface AppState {
  // Normalized entities - keyed by id
  stories: Record<string, Story>;
  groups: Record<string, Group>;
  snippets: Record<string, Snippet>;
  notes: Record<string, Note>; // People, Places, Things
  tags: Record<string, Tag>;
  goals: Record<string, Goal>;
  
  // Denormalized views - derived via selectors
  project: {
    storyId: string | null;
    groupIds: string[]; // Ordered list of group ids
    snippetIds: string[]; // Ordered list of snippet ids
    activeSnippetId: string | null;
    activeRightTab: 'people' | 'places' | 'things';
    filters: {
      search: string;
    };
  };
  
  // UI state
  collapsedGroups: Set<string>;
  editing: {
    savingState: 'idle' | 'saving' | 'saved';
    lastSavedAt: string | null;
  };
}
```

#### 2. Memoized Selectors for Derived Views

Create **memoized selectors** to derive views from normalized state. Memoization prevents unnecessary re-renders when unrelated entities change:

```typescript
// src/store/selectors.ts
import { useStore } from './store';
import { useMemo } from 'react';

// Get groups as array (for left-rail list) - MEMOIZED
export function useGroupsList() {
  const groupIds = useStore((state) => state.project.groupIds);
  const groups = useStore((state) => state.groups);
  
  return useMemo(() => {
    return groupIds
      .map((id) => groups[id])
      .filter(Boolean); // Filter out any missing groups
  }, [groupIds, groups]);
}

// Get snippets for a specific group - MEMOIZED
export function useGroupSnippets(groupId: string) {
  const group = useStore((state) => state.groups[groupId]);
  const snippets = useStore((state) => state.snippets);
  
  return useMemo(() => {
    if (!group) return [];
    return group.snippetIds
      .map((id) => snippets[id])
      .filter(Boolean);
  }, [group, snippets]);
}

// Get active snippet ONLY - for editor viewport (pure component)
export function useActiveSnippet() {
  const activeSnippetId = useStore((state) => state.project.activeSnippetId);
  const snippet = useStore((state) => 
    activeSnippetId ? state.snippets[activeSnippetId] : null
  );
  
  // Only re-render when active snippet changes, not when other snippets update
  return useMemo(() => snippet, [snippet]);
}

// Get filtered groups (for search)
export function useFilteredGroups() {
  return useStore((state) => {
    const { project, groups } = state;
    const search = project.filters.search.toLowerCase();
    if (!search) {
      return project.groupIds.map((id) => groups[id]).filter(Boolean);
    }
    return project.groupIds
      .map((id) => groups[id])
      .filter((group) => {
        if (!group) return false;
        // Search in group title
        if (group.title.toLowerCase().includes(search)) return true;
        // Search in group snippets
        return group.snippetIds.some((snippetId) => {
          const snippet = state.snippets[snippetId];
          if (!snippet) return false;
          return (
            snippet.title.toLowerCase().includes(search) ||
            snippet.body.toLowerCase().includes(search)
          );
        });
      });
  });
}

// Get notes by type (People, Places, Things)
export function useNotesByType(type: 'person' | 'place' | 'thing') {
  return useStore((state) => {
    return Object.values(state.notes).filter((note) => note.kind === type);
  });
}
```

#### 3. Order Persistence in Drive Metadata

**Critical**: Order (groupIds/snippetIds) is a **first-class field** that must be persisted in Drive metadata. This ensures:
- Reorders survive concurrent edits (order changes are persisted independently of content)
- Order doesn't revert after background loads (order is stored in Drive, not just in-memory state)
- Order is authoritative source of truth (Drive metadata determines display order)
- Concurrent loads never revert list order (order is persisted atomically)

**Persistence Mechanism** (Explicit):

**Option 1: Drive File appProperties (Recommended)**
- Store order arrays in Drive file `appProperties` (metadata that survives file updates)
- Use `story.json` appProperties for `groupIds` array
- Use `chapter.json` appProperties for `snippetIds` array
- Benefits: Atomic updates, survives file content changes, doesn't require separate file

**Option 2: Separate structure.json File**
- Store order in a small `structure.json` file per story folder
- Contains: `{ "groupIds": [...], "chapters": { "chapter-id": { "snippetIds": [...] } } }`
- Benefits: Explicit separation of structure from content, easy to inspect/debug

**Implementation** (Using appProperties):
- When reordering chapters/snippets, update both in-memory state AND Drive file appProperties
- On load, read order from Drive file appProperties first, then populate entities
- Order changes trigger Drive write operations (update appProperties, not just in-memory updates)
- Use Drive API `files.update` with `appProperties` field to persist order atomically

**Drive Metadata Structure** (appProperties approach):
```typescript
// story.json in Drive (with appProperties)
{
  "id": "story-1",
  "title": "My Story",
  "appProperties": {
    "groupIds": "[\"group-1\",\"group-2\",\"group-3\"]" // ORDER IS PERSISTED HERE (JSON string in appProperties)
  },
  // ... other story fields
}

// chapter.json in Drive (with appProperties)
{
  "id": "group-1",
  "title": "Chapter 1",
  "appProperties": {
    "snippetIds": "[\"snippet-1\",\"snippet-2\",\"snippet-3\"]" // ORDER IS PERSISTED HERE (JSON string in appProperties)
  },
  // ... other chapter fields
}
```

**Alternative: structure.json approach**:
```typescript
// structure.json in story folder
{
  "groupIds": ["group-1", "group-2", "group-3"],
  "chapters": {
    "group-1": {
      "snippetIds": ["snippet-1", "snippet-2", "snippet-3"]
    },
    "group-2": {
      "snippetIds": ["snippet-4", "snippet-5"]
    }
  }
}
```

#### 4. Benefits of Normalization + Memoized Selectors

1. **Cheap Renders**: Components only re-render when their specific entities change, not when unrelated entities update
   - **Editor viewport as pure component**: Only subscribes to active snippet's slice, not entire state tree
   - **Memoized selectors**: Prevent unnecessary recalculations when unrelated entities change
2. **Virtualized Lists**: Normalized structure makes it easy to implement virtual scrolling for long lists later
3. **Single Source of Truth**: Each entity exists once in the store, eliminating duplication
4. **Efficient Updates**: Updating a single entity doesn't require re-rendering entire lists
5. **Type Safety**: TypeScript ensures we access entities correctly via selectors
6. **Prevents State Churn**: Normalized structure + memoized selectors prevent cascading re-renders during typing
7. **Order Persistence**: Order is persisted in Drive metadata, ensuring reorders survive concurrent edits and background loads

#### 5. Migration from Current Structure

**Before (nested objects)**:
```typescript
// ❌ DON'T DO THIS
const state = {
  groups: [
    {
      id: '1',
      title: 'Chapter 1',
      snippets: [
        { id: '1-1', title: 'Snippet 1', body: '...' },
        { id: '1-2', title: 'Snippet 2', body: '...' },
      ],
    },
  ],
};
```

**After (normalized)**:
```typescript
// ✅ DO THIS
const state = {
  groups: {
    '1': { id: '1', title: 'Chapter 1', snippetIds: ['1-1', '1-2'] },
  },
  snippets: {
    '1-1': { id: '1-1', title: 'Snippet 1', body: '...', groupId: '1' },
    '1-2': { id: '1-2', title: 'Snippet 2', body: '...', groupId: '1' },
  },
  project: {
    groupIds: ['1'],
  },
};

// Use selector to get groups as array
const groupsList = useGroupsList(); // Returns array of groups
```

### Implementation Timeline

This should be implemented in **Phase 1** (Setup & Infrastructure) as it's foundational:
- Define normalized state structure in `src/store/types.ts`
- Create Zustand store with normalized entities
- Create selectors in `src/store/selectors.ts`
- Update all components to use selectors instead of direct state access

**LOE**: 4-6 hours (adds time but saves significant debugging and enables future optimizations)

---

## What Needs Custom Implementation

These areas cannot be replaced with libraries and require custom React code:

### 1. State Management Architecture
- **Current**: Global `state` object with direct mutations and nested structures
- **React + TypeScript**: Zustand with TypeScript interfaces and **normalized state structure**
- **Complexity**: High
- **Lines**: ~500-800 lines of state logic + type definitions + selectors
- **TypeScript**: Will create interfaces for all state structures (Group, Snippet, Project, Goal, etc.)
- **Normalization**: All entities (stories, groups, snippets, notes, tags, goals) keyed by id in the store; selectors derive views (e.g., left-rail lists)
- **Benefits**: Keeps renders cheap, enables virtualized lists later, single source of truth

### 2. Google Drive Integration
- **Current**: API calls in `drive.js`
- **React + TypeScript**: Convert to React Query hooks using TanStack Query for ALL Drive I/O operations
- **Complexity**: Medium
- **Status**: Backend already works, just needs React Query wrapper
- **TypeScript**: Will create interfaces for API responses and request parameters
- **Critical**: ALL Drive operations (read, write, list, delete, rename, check comments, etc.) MUST use React Query, not ad-hoc useEffect hooks
- **Benefits**: Automatic deduplication, retries, stale-while-revalidate, cache invalidation, loading/error states

### 3. Word Counting Logic
- **Current**: `countWords()` function
- **React**: Can be reused as-is or converted to hook
- **Complexity**: Low
- **Lines**: ~50-100 lines

### 4. Goal Calculation Algorithms
- **Current**: Complex date/word calculation logic
- **React**: Convert to hooks (`useGoal`, `useDailyTarget`)
- **Complexity**: Medium-High
- **Lines**: ~200-300 lines

### 5. Export Functionality
- **Current**: Custom export logic for chapters/outline/notes
- **React**: Convert to utility functions or hooks
- **Complexity**: Medium-High
- **Lines**: ~300-400 lines (includes chunking logic)
- **Details**: 
  - Exports to Google Docs format
  - Supports 5 export types (chapters, outline, people, places, things)
  - Optional snippet name inclusion
  - User-provided filenames
  - **Chunked writes for large chapters**: When a chapter contains many snippets (50+), split export into multiple batchUpdate requests to avoid Google Docs API body size limits
  - **Batch size calculation**: Estimate request size and chunk accordingly (typically ~100KB per batchUpdate request)
  - **Progress indication**: Show progress during chunked exports
  - **Server-side batching for large stories**: For "Export All" operations on large stories (25+ chapters, 200+ snippets), consider batching on the server (Netlify Function) to avoid client-side rate limits and improve reliability
  - **Progress toast with Drive links**: Show progress toast during server-side batch exports, with Drive links to completed exports as they land

### 6. Search/Filtering Logic
- **Current**: Inline filtering in render functions
- **React**: Convert to `useMemo` hooks
- **Complexity**: Low-Medium
- **Lines**: ~100-150 lines
- **Details**: 
  - Searches group titles, snippet titles, and snippet body content
  - Case-insensitive matching

### 7. Authentication Flow
- **Current**: Google Sign-In SDK integration
- **React**: Convert to context + hooks
- **Complexity**: Medium
- **Lines**: ~200-300 lines
- **Details**: 
  - 48-hour session expiration
  - Token validation
  - Auto-redirect logic
  - Dev mode bypass for localhost

### 8. Lazy Loading Logic
- **Current**: Background loading of snippet content
- **React**: Convert to React Query with prefetching and background refetching
- **Complexity**: Medium
- **Lines**: ~300-400 lines
- **Details**: 
  - Loads active snippet first, then background loads remaining
  - Uses React Query's `prefetchQuery` and `useQueries` for batch loading
  - React Query handles throttling and prevents duplicate requests automatically
  - Prevents UI blocking with React Query's built-in background refetching
  - **Note**: This is part of the broader React Query strategy for ALL Drive I/O

### 9. Mobile Detection
- **Current**: User agent and touch detection
- **React**: Convert to custom hook (`useMobileDetection`)
- **Complexity**: Low
- **Lines**: ~50 lines
- **Details**: Shows warning message for mobile devices

### 10. Error Logging System
- **Current**: Custom localStorage-based error logging
- **React**: Can reuse or convert to error boundary + logging service
- **Complexity**: Low-Medium
- **Lines**: ~100 lines
- **Details**: 
  - Logs errors to localStorage (max 50)
  - Captures console errors, unhandled rejections
  - Exposes `viewYarnyErrors()` function

### 11. Midnight Rollover Handling
- **Current**: Handles goal calculation across day boundaries
- **React**: Convert to hook with date change detection
- **Complexity**: Medium
- **Lines**: ~100-150 lines
- **Details**: Recalculates daily targets when crossing midnight

### 12. Goal Calculation Modes
- **Current**: Elastic (rebalances) vs Strict (fixed) modes
- **React**: Convert to hook with mode-specific logic
- **Complexity**: Medium
- **Lines**: ~200-300 lines
- **Details**: 
  - Elastic: Adjusts daily targets based on progress
  - Strict: Fixed daily targets
  - Writing days selection (Mon-Sun)
  - Days off support

---

## Fetch/Caching Layer with TanStack Query (P1 Priority)

### Overview

**Why**: Multiple components will read/write the same Drive resources. Manual `useEffect` trees are brittle and lead to:
- Duplicate API calls when multiple components request the same data
- No automatic retry logic
- Manual cache management
- Inconsistent loading/error states
- Race conditions between reads and writes

**What**: Adopt **TanStack Query (React Query)** as the fetch/caching layer for ALL Drive I/O operations. This provides:
- **Automatic deduplication**: Multiple components requesting the same file won't trigger duplicate requests
- **Automatic retries**: Failed requests retry with exponential backoff
- **Stale-while-revalidate**: Show cached data immediately while fetching fresh data in background
- **Cache invalidation**: Automatically refetch when mutations occur
- **Loading/error states**: Built-in state management for all queries
- **Background refetching**: Keep data fresh without blocking UI

### Implementation Strategy

#### 1. React Query Setup

Create `src/lib/react-query.ts` to configure React Query with visibility-based gating and rate limit handling:

```typescript
import { QueryClient } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';

// Check if tab is visible (for visibility-based gating)
const isTabVisible = (): boolean => {
  if (typeof document === 'undefined') return true;
  return !document.hidden;
};

// Custom retry function with exponential backoff and rate limit detection
const retryWithBackoff = (failureCount: number, error: unknown): boolean => {
  // Don't retry if tab is not visible (prevents request storms in background tabs)
  if (!isTabVisible()) {
    return false;
  }

  // Don't retry on 4xx errors (except 429 rate limit)
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status && status >= 400 && status < 500 && status !== 429) {
      return false;
    }
    
    // For 429 (rate limit), use exponential backoff with jitter
    if (status === 429) {
      // Exponential backoff: 1s, 2s, 4s, 8s, 16s (max 30s)
      const delay = Math.min(1000 * 2 ** failureCount, 30000);
      // Add jitter (0-20% of delay) to prevent thundering herd
      const jitter = Math.random() * delay * 0.2;
      return new Promise((resolve) => {
        setTimeout(() => resolve(true), delay + jitter);
      }) as unknown as boolean;
    }
  }

  // Retry up to 3 times with exponential backoff
  if (failureCount < 3) {
    return true;
  }
  
  return false;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh for 5 min
      gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache for 10 min (formerly cacheTime)
      retry: retryWithBackoff, // Custom retry with visibility gating and rate limit handling
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
      refetchOnWindowFocus: false, // Don't refetch on window focus (Drive data doesn't change that often)
      refetchOnReconnect: true, // Refetch when network reconnects
      // Only refetch when tab is visible (prevents request storms in background tabs)
      refetchInterval: false, // Disable automatic refetching (use manual prefetching instead)
    },
    mutations: {
      retry: (failureCount, error) => {
        // Don't retry mutations if tab is not visible
        if (!isTabVisible()) {
          return false;
        }
        
        // Retry once on failure (excluding 4xx errors except 429)
        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          if (status && status >= 400 && status < 500 && status !== 429) {
            return false;
          }
          
          // For 429 (rate limit), retry once with exponential backoff
          if (status === 429 && failureCount < 1) {
            return true;
          }
        }
        
        return failureCount < 1;
      },
    },
  },
});
```

Wrap the app with `QueryClientProvider` in `App.tsx`:

```typescript
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/react-query';

export function App(): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Rest of app */}
    </QueryClientProvider>
  );
}
```

#### 2. React Query Hooks for Drive Operations

Create `src/hooks/useDriveQueries.ts` that wraps ALL Drive API calls with React Query:

```typescript
import { useQuery, useMutation, useQueryClient, useQueries } from '@tanstack/react-query';
import {
  listDriveFiles,
  readDriveFile,
  writeDriveFile,
  deleteDriveFile,
  renameDriveFile,
  checkCommentsAndChanges,
  createFolder,
  getOrCreateYarnyStories,
  type DriveListResponse,
  type DriveReadResponse,
  type DriveWriteRequest,
  type DriveWriteResponse,
} from '../api/client';

// Query keys - centralized for consistency
export const driveKeys = {
  all: ['drive'] as const,
  lists: () => [...driveKeys.all, 'list'] as const,
  list: (folderId: string | null) => [...driveKeys.lists(), folderId] as const,
  files: () => [...driveKeys.all, 'file'] as const,
  file: (fileId: string) => [...driveKeys.files(), fileId] as const,
  folders: () => [...driveKeys.all, 'folder'] as const,
  folder: (folderId: string) => [...driveKeys.folders(), folderId] as const,
  yarnyStories: () => [...driveKeys.all, 'yarny-stories'] as const,
};

// List files in a folder
export function useDriveFiles(folderId: string | null) {
  return useQuery({
    queryKey: driveKeys.list(folderId),
    queryFn: () => listDriveFiles(folderId),
    enabled: folderId !== null, // Only run if folderId is provided
  });
}

// Read a single file
export function useDriveFile(fileId: string | null) {
  return useQuery({
    queryKey: driveKeys.file(fileId!),
    queryFn: () => readDriveFile({ fileId: fileId! }),
    enabled: fileId !== null, // Only run if fileId is provided
  });
}

// Read multiple files in parallel (for lazy loading)
export function useDriveFilesBatch(fileIds: string[]) {
  return useQueries({
    queries: fileIds.map((fileId) => ({
      queryKey: driveKeys.file(fileId),
      queryFn: () => readDriveFile({ fileId }),
      staleTime: 5 * 60 * 1000, // 5 minutes
    })),
  });
}

// Check for comments/tracked changes
export function useDriveComments(fileId: string | null) {
  return useQuery({
    queryKey: [...driveKeys.file(fileId!), 'comments'],
    queryFn: () => checkCommentsAndChanges({ fileId: fileId! }),
    enabled: fileId !== null,
    staleTime: 2 * 60 * 1000, // 2 minutes - comments can change
  });
}

// Get or create Yarny Stories folder
export function useYarnyStoriesFolder() {
  return useQuery({
    queryKey: driveKeys.yarnyStories(),
    queryFn: () => getOrCreateYarnyStories(),
    staleTime: 10 * 60 * 1000, // 10 minutes - folder rarely changes
  });
}

// Write file mutation
export function useWriteDriveFile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (request: DriveWriteRequest) => writeDriveFile(request),
    onSuccess: (data, variables) => {
      // Invalidate the file query to refetch fresh data
      if (variables.fileId) {
        queryClient.invalidateQueries({ queryKey: driveKeys.file(variables.fileId) });
      }
      // Invalidate list queries that might include this file
      queryClient.invalidateQueries({ queryKey: driveKeys.lists() });
    },
  });
}

// Delete file mutation
export function useDeleteDriveFile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (fileId: string) => deleteDriveFile({ fileId }),
    onSuccess: (_, fileId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: driveKeys.file(fileId) });
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: driveKeys.lists() });
    },
  });
}

// Rename file mutation
export function useRenameDriveFile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ fileId, fileName }: { fileId: string; fileName: string }) =>
      renameDriveFile({ fileId, fileName }),
    onSuccess: (_, variables) => {
      // Invalidate the file query
      queryClient.invalidateQueries({ queryKey: driveKeys.file(variables.fileId) });
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: driveKeys.lists() });
    },
  });
}

// Create folder mutation
export function useCreateFolder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ folderName, parentFolderId }: { folderName: string; parentFolderId?: string }) =>
      createFolder({ folderName, parentFolderId }),
    onSuccess: () => {
      // Invalidate folder lists
      queryClient.invalidateQueries({ queryKey: driveKeys.lists() });
    },
  });
}
```

#### 3. Prefetching for Lazy Loading (Visibility-Gated)

For background loading of snippet content, use React Query's prefetching with visibility-based gating:

```typescript
// In Editor component or hook
import { queryClient } from '../lib/react-query';
import { driveKeys } from '../hooks/useDriveQueries';

// Check if tab is visible (prevents request storms in background tabs)
const isTabVisible = (): boolean => {
  if (typeof document === 'undefined') return true;
  return !document.hidden;
};

// Prefetch snippet content in background (only if tab is visible)
function prefetchSnippetContent(fileId: string) {
  // Only prefetch if tab is visible (prevents quota exhaustion in background tabs)
  if (!isTabVisible()) {
    return;
  }
  
  queryClient.prefetchQuery({
    queryKey: driveKeys.file(fileId),
    queryFn: () => readDriveFile({ fileId }),
    staleTime: 5 * 60 * 1000,
  });
}

// Prefetch multiple snippets in background (throttled, visibility-gated)
function prefetchSnippetsBatch(fileIds: string[], batchSize = 5, delay = 500) {
  // Only prefetch if tab is visible
  if (!isTabVisible()) {
    return;
  }
  
  fileIds.forEach((fileId, index) => {
    setTimeout(() => {
      // Re-check visibility before each prefetch (user may have switched tabs)
      if (isTabVisible()) {
        prefetchSnippetContent(fileId);
      }
    }, index * delay);
  });
}
```

#### 4. Component Usage Example

```typescript
// In a component that needs Drive data
import { useDriveFile, useWriteDriveFile } from '../hooks/useDriveQueries';

function SnippetEditor({ fileId }: { fileId: string }) {
  const { data: file, isLoading, error } = useDriveFile(fileId);
  const writeMutation = useWriteDriveFile();
  
  const handleSave = (content: string) => {
    writeMutation.mutate({
      fileId,
      fileName: file.name,
      content,
    });
  };
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      <Editor content={file.content} onSave={handleSave} />
      {writeMutation.isPending && <div>Saving...</div>}
    </div>
  );
}
```

### Drive Operations Covered

ALL of these operations MUST use React Query (not ad-hoc useEffect):

1. ✅ **List files/folders** - `useDriveFiles()`
2. ✅ **Read file content** - `useDriveFile()`, `useDriveFilesBatch()`
3. ✅ **Write/update file** - `useWriteDriveFile()` mutation
4. ✅ **Delete file** - `useDeleteDriveFile()` mutation
5. ✅ **Rename file** - `useRenameDriveFile()` mutation
6. ✅ **Check comments/changes** - `useDriveComments()`
7. ✅ **Create folder** - `useCreateFolder()` mutation
8. ✅ **Get/create Yarny Stories folder** - `useYarnyStoriesFolder()`
9. ✅ **Background/lazy loading** - `prefetchQuery()` and `useQueries()`

### Benefits

1. **No Duplicate Requests**: Multiple components reading the same file share one request
2. **Automatic Retries**: Failed requests retry automatically with exponential backoff
3. **Stale-While-Revalidate**: Show cached data immediately, update in background
4. **Cache Invalidation**: Mutations automatically invalidate related queries
5. **Loading States**: Built-in `isLoading`, `isFetching`, `isError` states
6. **Background Refetching**: Keep data fresh without blocking UI
7. **Optimistic Updates**: Can implement optimistic UI updates for better UX
8. **Type Safety**: Full TypeScript support with typed queries and mutations

### Migration from Current Code

**Before (ad-hoc useEffect)**:
```typescript
// ❌ DON'T DO THIS
function Component() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    readDriveFile(fileId)
      .then(setFile)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [fileId]);
  
  // ... component logic
}
```

**After (React Query)**:
```typescript
// ✅ DO THIS
function Component() {
  const { data: file, isLoading } = useDriveFile(fileId);
  
  // ... component logic
}
```

### Implementation Timeline

This should be implemented in **Phase 1** (Setup & Infrastructure) alongside API contract formalization:
- Install `@tanstack/react-query`
- Set up `QueryClient` and `QueryClientProvider`
- Create `useDriveQueries.ts` with all Drive operation hooks
- Update all components to use React Query hooks instead of direct API calls
- Replace lazy loading logic with React Query prefetching

**LOE**: 6-8 hours (adds time but saves significant debugging and provides better UX)

### Dependencies

Add to `package.json`:
```json
{
  "dependencies": {
    "@tanstack/react-query": "^5.x"
  }
}
```

---

## Offline/Spotty-Network Semantics (P2 Priority)

### Overview

**Why**: Network connectivity issues (offline, spotty WiFi, flapping connections) are common in real-world usage. Users need clear feedback about save status, queued operations, and when the app is read-only vs. editable. React Query's retry/backoff and cache staleness policies must be tied to visible UX indicators.

**What**: Define explicit UX behavior for network states: queued saves, read-only mode, offline banners, and "Saved at..." indicator behavior tied to React Query's retry/backoff and cache staleness.

### Network State Detection

Use React Query's `useIsFetching`, `useIsMutating`, and browser `navigator.onLine` API to detect network state:

```typescript
// src/hooks/useNetworkStatus.ts
import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  isFetching: boolean;
  isMutating: boolean;
  hasPendingMutations: boolean;
  lastSavedAt: string | null;
  saveState: 'idle' | 'saving' | 'saved' | 'queued' | 'error';
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const isFetching = useIsFetching() > 0;
  const isMutating = useIsMutating() > 0;
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Determine save state based on network and mutation status
  const saveState: NetworkStatus['saveState'] = 
    !isOnline ? 'queued' :
    isMutating ? 'saving' :
    'idle';
  
  return {
    isOnline,
    isFetching,
    isMutating,
    hasPendingMutations: isMutating,
    lastSavedAt: null, // Will be set by save hook
    saveState,
  };
}
```

### UX Behavior Definitions

#### 1. Queued Saves (Offline/Network Error)

**When**: User edits while offline or network request fails (after retries exhausted)

**Behavior**:
- **Editor remains editable**: User can continue typing and editing
- **Save state indicator**: Shows "Queued" or "Waiting for connection..." instead of "Saved at X:XX"
- **Save queue**: Mutations are queued in React Query's mutation queue (automatic via React Query)
- **Auto-retry on reconnect**: When network returns, React Query automatically retries queued mutations
- **Visual indicator**: Offline banner appears at top of editor (non-blocking, dismissible)

**Implementation**:
```typescript
// In Editor component
const { isOnline, saveState } = useNetworkStatus();
const writeMutation = useWriteDriveFile();

// Show queued state in save indicator
{saveState === 'queued' && (
  <div className="save-status queued">
    Waiting for connection... ({queuedCount} changes queued)
  </div>
)}

// Offline banner
{!isOnline && (
  <div className="offline-banner">
    You're offline. Changes will be saved when connection is restored.
  </div>
)}
```

#### 2. Read-Only Mode (Stale Cache)

**When**: Network is offline AND cache is stale (data older than `staleTime`)

**Behavior**:
- **Editor remains editable**: User can type, but see warning that changes may conflict
- **Cache staleness indicator**: Show "Using cached data" or "Last synced: X:XX" in footer
- **Read-only warning**: If cache is very stale (> 10 minutes), show warning: "You're viewing cached data. Some changes may not be saved."
- **Auto-refresh on reconnect**: When network returns, React Query automatically refetches stale data
- **Read-only toggle on reconciliation failure**: If reconciliation fails on reconnect (conflict detected and cannot be automatically resolved), toggle editor to read-only mode with clear message: "Reconciliation failed — editor is read-only. Please resolve conflicts manually."

**Implementation**:
```typescript
// Check cache staleness
const { data: file, dataUpdatedAt, isStale } = useDriveFile(fileId);

// Show staleness warning
{isStale && !isOnline && (
  <div className="stale-cache-warning">
    Using cached data. Last synced: {new Date(dataUpdatedAt).toLocaleTimeString()}
  </div>
)}
```

#### 3. Offline Banner

**When**: `navigator.onLine === false` or network request fails with no retries remaining

**Behavior**:
- **Non-blocking**: Banner appears at top of editor, doesn't block editing
- **Dismissible**: User can dismiss banner (but it reappears if still offline)
- **Auto-dismiss**: Banner disappears when network returns
- **Message**: "Working offline — changes queued" (matches React Query's mutation queue behavior)
- **Visual style**: Subtle background color (e.g., amber/yellow), not red/error

**Implementation**:
```typescript
// src/components/shared/OfflineBanner.tsx
export function OfflineBanner() {
  const { isOnline } = useNetworkStatus();
  const [dismissed, setDismissed] = useState(false);
  
  if (isOnline || dismissed) return null;
  
  return (
    <div className="offline-banner">
      <span>Working offline — changes queued</span>
      <button onClick={() => setDismissed(true)}>Dismiss</button>
    </div>
  );
}
```

#### 4. "Saved at..." Indicator Behavior

**When**: Save operation completes (success or queued)

**Behavior**:
- **Online + successful save**: Show "Saved at X:XX" (current time)
- **Offline + queued**: Show "Queued - will save when online" (no timestamp)
- **Offline + queued with local timestamp**: Show "Saved locally at X:XX" when changes are queued to local cache (bounded retries/backoff)
- **Network error + retrying**: Show "Saving... (retrying)" with retry count
- **Network error + exhausted**: Show "Queued - will save when online" (no timestamp)
- **Stale cache**: Show "Last synced: X:XX" instead of "Saved at X:XX"

**Implementation**:
```typescript
// src/components/editor/SaveStatus.tsx
export function SaveStatus() {
  const { isOnline, saveState, lastSavedAt } = useNetworkStatus();
  const writeMutation = useWriteDriveFile();
  
  if (saveState === 'saving') {
    return <div className="save-status saving">Saving...</div>;
  }
  
  if (saveState === 'queued') {
    // Show "Saved locally at X:XX" when changes are queued to local cache
    if (lastSavedAt) {
      return <div className="save-status queued">Saved locally at {new Date(lastSavedAt).toLocaleTimeString()}</div>;
    }
    return <div className="save-status queued">Queued - will save when online</div>;
  }
  
  if (saveState === 'saved' && lastSavedAt) {
    return <div className="save-status saved">Saved at {new Date(lastSavedAt).toLocaleTimeString()}</div>;
  }
  
  return null;
}
```

#### 5. React Query Integration

**Tie UX to React Query's retry/backoff and cache staleness**:

```typescript
// src/lib/react-query.ts (update existing config)
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh for 5 min
      gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache for 10 min
      retry: retryWithBackoff, // Custom retry with visibility gating
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true, // Auto-refetch when network reconnects
      // Network-aware: Don't retry if offline
      networkMode: 'online', // Only run queries when online
    },
    mutations: {
      retry: (failureCount, error) => {
        // Don't retry if offline
        if (!navigator.onLine) {
          return false; // Queue mutation instead
        }
        
        // Retry once on failure (excluding 4xx errors except 429)
        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          if (status && status >= 400 && status < 500 && status !== 429) {
            return false;
          }
          
          if (status === 429 && failureCount < 1) {
            return true;
          }
        }
        
        return failureCount < 1;
      },
      // Queue mutations when offline (React Query handles this automatically)
      networkMode: 'online', // Only run mutations when online, queue when offline
    },
  },
});
```

### Smoke Tests

Add to smoke test checklist:

**L. Offline/Spotty-Network Semantics**:
- [ ] **Go offline**: Disable network → Edit snippet → Verify editor remains editable
- [ ] **Offline banner**: Verify offline banner appears at top of editor
- [ ] **Queued save**: Verify save status shows "Queued - will save when online"
- [ ] **Reconnect**: Re-enable network → Verify queued saves automatically retry and complete
- [ ] **Save status on reconnect**: Verify "Saved at X:XX" appears after successful save
- [ ] **Stale cache warning**: Go offline → Wait 5+ minutes → Verify "Using cached data" warning appears
- [ ] **Network flapping**: Rapidly toggle network on/off → Verify save queue handles multiple toggles correctly
- [ ] **Retry exhaustion**: Simulate network error with no retries → Verify mutation is queued (not lost)
- [ ] **Multiple queued saves**: Go offline → Make multiple edits → Reconnect → Verify all saves complete in order
- [ ] **Cache staleness**: Load snippet → Go offline → Wait 10+ minutes → Verify "Last synced: X:XX" appears instead of "Saved at X:XX"

### Implementation Timeline

This should be implemented in **Phase 6** (Lazy Loading & Exports) alongside auto-save functionality:
- Create `useNetworkStatus` hook
- Create `OfflineBanner` component
- Update `SaveStatus` component to handle offline/queued states
- Update React Query config with network-aware settings
- Add smoke tests for offline scenarios

**LOE**: 4-6 hours (includes network status hook, offline banner, save status updates, and smoke tests)

---

## Timezone/DST for "Goals that Think" (P2 Priority)

### Overview

**Why**: Daily rollover and "Today" calculations must use the user's actual timezone to prevent confusion for travelers and night-owls. DST boundaries (spring forward/fall back) can cause "Today" to bounce around if not handled correctly.

**What**: Specify that daily rollover uses the user's IANA timezone (`Intl.DateTimeFormat().resolvedOptions().timeZone`) and test DST boundaries explicitly.

### Implementation Strategy

#### 1. Timezone Detection

Use browser's IANA timezone identifier:

```typescript
// src/utils/timezone.ts
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

// Example: "America/New_York", "Europe/London", "Asia/Tokyo"
```

#### 2. Daily Rollover Calculation

Use timezone-aware date calculations for goal rollover:

```typescript
// src/hooks/useGoal.ts
import { getUserTimezone } from '../utils/timezone';

export function useDailyTarget() {
  const timezone = getUserTimezone();
  
  // Get current date in user's timezone
  const getTodayInTimezone = (): Date => {
    const now = new Date();
    // Use Intl.DateTimeFormat to get date string in user's timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(now);
    const year = parseInt(parts.find(p => p.type === 'year')!.value);
    const month = parseInt(parts.find(p => p.type === 'month')!.value) - 1;
    const day = parseInt(parts.find(p => p.type === 'day')!.value);
    
    // Create date at midnight in user's timezone
    return new Date(Date.UTC(year, month, day));
  };
  
  // Calculate if we've crossed midnight in user's timezone
  const hasCrossedMidnight = (lastDate: Date): boolean => {
    const today = getTodayInTimezone();
    const lastDay = new Date(lastDate);
    lastDay.setHours(0, 0, 0, 0);
    
    return today.getTime() !== lastDay.getTime();
  };
}
```

#### 3. DST Boundary Testing

Test DST transitions explicitly:

```typescript
// src/utils/timezone.test.ts
describe('DST Boundary Handling', () => {
  it('handles spring forward (loses hour)', () => {
    // Test date: March 10, 2024 2:00 AM EST → 3:00 AM EDT (spring forward)
    // Verify "Today" doesn't bounce around
  });
  
  it('handles fall back (gains hour)', () => {
    // Test date: November 3, 2024 2:00 AM EDT → 1:00 AM EST (fall back)
    // Verify "Today" doesn't bounce around
  });
  
  it('handles timezone changes for travelers', () => {
    // Simulate user traveling from EST to PST
    // Verify "Today" updates correctly based on new timezone
  });
});
```

### Smoke Tests

Add to smoke test checklist:

**M. Timezone/DST Handling**:
- [ ] **Daily rollover**: Verify "Today" chip updates at midnight in user's timezone (not UTC)
- [ ] **Spring forward**: Test DST spring forward boundary → Verify "Today" doesn't bounce around
- [ ] **Fall back**: Test DST fall back boundary → Verify "Today" doesn't bounce around
- [ ] **Timezone change**: Change system timezone → Verify "Today" updates correctly
- [ ] **Traveler scenario**: Simulate timezone change (EST → PST) → Verify goal calculations update correctly

### Implementation Timeline

This should be implemented in **Phase 5** (Library Features & Goals UI) alongside goal calculation logic:
- Add timezone detection utility
- Update goal calculation hooks to use IANA timezone
- Add DST boundary tests
- Test with various timezones

**LOE**: 2-3 hours (includes timezone detection, DST boundary testing, and smoke tests)

---

## Right-to-Left (RTL) & Mixed-Script Paste (P2 Priority)

### Overview

**Why**: Users may paste content with RTL scripts (Arabic, Hebrew) or mixed-script content. Caret movement, word counting, and paste stripping must behave correctly for RTL content.

**What**: Add one RTL snippet (Arabic/Hebrew) to the test corpus and assert caret movement, word counting, and paste stripping behave correctly. No architecture change—just tests.

### Implementation Strategy

#### 1. Test Corpus Addition

Add RTL test snippet to small project (`test-small`):

**RTL Test Snippet**:
- **Title**: "RTL Test Snippet"
- **Content**: Mix of Arabic/Hebrew text with English
- **Purpose**: Test caret movement, word counting, paste stripping

Example content:
```
This is English text. هذا نص عربي. This is more English. זה טקסט בעברית.
```

#### 2. Test Assertions

**Caret Movement**:
- Verify caret moves correctly in RTL text (right-to-left direction)
- Verify caret moves correctly when switching between LTR and RTL text
- Verify selection works correctly in RTL text

**Word Counting**:
- Verify word count includes RTL words correctly
- Verify word boundaries are detected correctly in RTL text
- Verify mixed-script content (English + Arabic + Hebrew) counts words correctly

**Paste Stripping**:
- Verify rich text paste with RTL content is stripped to plain text
- Verify RTL formatting (bold, italic) is removed but text content is preserved
- Verify mixed-script paste (LTR + RTL) is handled correctly

### Smoke Tests

Add to smoke test checklist:

**N. RTL & Mixed-Script Handling**:
- [ ] **RTL caret movement**: Type in Arabic/Hebrew snippet → Verify caret moves right-to-left correctly
- [ ] **Mixed-script caret**: Type in mixed English/Arabic/Hebrew snippet → Verify caret switches direction correctly
- [ ] **RTL word counting**: Verify word count includes RTL words correctly in test snippet
- [ ] **RTL paste stripping**: Paste rich text with RTL content → Verify formatting stripped, text preserved
- [ ] **Mixed-script paste**: Paste mixed LTR/RTL content → Verify handled correctly

### Implementation Timeline

This should be implemented in **Phase 4** (Editor - Tri-Pane Shell & Plain Text Round-Trip) alongside round-trip testing:
- Add RTL test snippet to test corpus
- Add RTL assertions to smoke tests
- Test caret movement, word counting, paste stripping

**LOE**: 1-2 hours (includes adding RTL snippet to corpus and smoke test assertions)

---

## Memory Budget & Long Sessions (P2 Priority)

### Overview

**Why**: All-day sessions on large projects can cause memory to balloon if cached snippet bodies are never evicted. We need a simple memory guard to cap cached snippet bodies.

**What**: Cap cached snippet bodies to N most-recent, evict the rest. This prevents memory bloat during long sessions.

### Implementation Strategy

#### 1. Memory Guard Configuration

Create memory budget configuration:

```typescript
// src/config/memory.ts
const DEFAULT_MAX_CACHED_SNIPPETS = 50; // Keep 50 most-recent snippet bodies in memory

interface MemoryConfig {
  maxCachedSnippets: number; // Maximum number of snippet bodies to keep in memory
}

const STORAGE_KEY = 'yarny-memory-config';

export function getMemoryConfig(): MemoryConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        maxCachedSnippets: parsed.maxCachedSnippets ?? DEFAULT_MAX_CACHED_SNIPPETS,
      };
    }
  } catch (err) {
    console.warn('Failed to load memory config from localStorage', err);
  }
  
  return {
    maxCachedSnippets: DEFAULT_MAX_CACHED_SNIPPETS,
  };
}
```

#### 2. LRU Eviction for Snippet Bodies

Implement LRU (Least Recently Used) eviction in React Query cache:

```typescript
// src/lib/react-query.ts (update existing config)
import { QueryClient } from '@tanstack/react-query';
import { getMemoryConfig } from '../config/memory';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      // Memory guard: Evict oldest snippet bodies when cache exceeds limit
      gcTime: (query) => {
        const config = getMemoryConfig();
        // Count snippet body queries
        const snippetQueries = queryClient.getQueryCache().getAll().filter(
          (q) => q.queryKey[0] === 'drive' && q.queryKey[1] === 'file'
        );
        
        if (snippetQueries.length > config.maxCachedSnippets) {
          // Evict oldest (least recently used) queries
          const sorted = snippetQueries.sort((a, b) => 
            (a.state.dataUpdatedAt || 0) - (b.state.dataUpdatedAt || 0)
          );
          const toEvict = sorted.slice(0, snippetQueries.length - config.maxCachedSnippets);
          toEvict.forEach((q) => queryClient.removeQueries({ queryKey: q.queryKey }));
        }
        
        return 10 * 60 * 1000; // Default gcTime
      },
    },
  },
});
```

#### 3. Active Snippet Protection

Always keep active snippet in memory (never evict):

```typescript
// In eviction logic, exclude active snippet
const activeSnippetId = useStore.getState().project.activeSnippetId;
const toEvict = sorted
  .filter((q) => {
    // Don't evict active snippet
    const fileId = q.queryKey[2] as string;
    const snippet = Object.values(useStore.getState().snippets).find(
      (s) => s.driveFileId === fileId
    );
    return snippet?.id !== activeSnippetId;
  })
  .slice(0, snippetQueries.length - config.maxCachedSnippets);
```

### Smoke Tests

Add to smoke test checklist:

**O. Memory Budget & Long Sessions**:
- [ ] **Memory guard**: Open large project (test-large) → Make 100+ snippet switches → Verify memory doesn't balloon
- [ ] **LRU eviction**: Verify oldest snippet bodies are evicted when cache exceeds limit
- [ ] **Active snippet protection**: Verify active snippet is never evicted, even if cache is full
- [ ] **Long session**: Keep app open for 4+ hours, make many edits → Verify memory stays bounded

### Implementation Timeline

This should be implemented in **Phase 6** (Lazy Loading & Exports) alongside lazy loading:
- Add memory budget configuration
- Implement LRU eviction for snippet bodies
- Protect active snippet from eviction
- Add smoke tests

**LOE**: 2-3 hours (includes memory guard implementation and smoke tests)

---

## Unload Safety (P2 Priority)

### Overview

**Why**: With optimistic saves/mutations, we need a clear rule for window/tab close while `isSaving`. Users need predictable behavior when closing the app during saves.

**What**: Define the rule for window/tab close while `isSaving`: allow close after queueing to cache, or prompt. Tie to "Saved/Saving" indicator so it's predictable.

### Implementation Strategy

#### 1. Unload Handler

Create unload safety handler:

```typescript
// src/hooks/useUnloadSafety.ts
import { useEffect, useRef } from 'react';
import { useIsMutating } from '@tanstack/react-query';
import { useStore } from '../store/store';

export function useUnloadSafety() {
  const isMutating = useIsMutating() > 0;
  const savingState = useStore((state) => state.editing.savingState);
  const hasPendingMutations = useRef(false);
  
  useEffect(() => {
    hasPendingMutations.current = isMutating || savingState === 'saving';
  }, [isMutating, savingState]);
  
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // If mutations are queued to cache, allow close (React Query will retry on next open)
      if (hasPendingMutations.current && savingState === 'queued') {
        // Queued saves are safe to close - they're in React Query's mutation queue
        return; // Allow close
      }
      
      // If actively saving, prompt user
      if (hasPendingMutations.current && savingState === 'saving') {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [savingState]);
}
```

#### 2. Save Status Indicator Integration

Tie unload behavior to save status indicator:

```typescript
// src/components/editor/SaveStatus.tsx
export function SaveStatus() {
  const { saveState, lastSavedAt } = useNetworkStatus();
  useUnloadSafety(); // Integrate unload safety
  
  // Save status indicator shows current state
  // Unload handler uses same state to determine behavior
  if (saveState === 'saving') {
    return <div className="save-status saving">Saving... (don't close yet)</div>;
  }
  
  if (saveState === 'queued') {
    return <div className="save-status queued">Saved locally at {new Date(lastSavedAt).toLocaleTimeString()} (safe to close)</div>;
  }
  
  // ... rest of component
}
```

#### 3. React Query Mutation Queue Persistence

Ensure React Query's mutation queue persists to cache:

```typescript
// src/lib/react-query.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    mutations: {
      // Persist mutation queue to localStorage for unload safety
      onMutate: async (variables) => {
        // Queue mutation to localStorage cache
        const queue = JSON.parse(localStorage.getItem('yarny-mutation-queue') || '[]');
        queue.push({
          type: 'write',
          variables,
          timestamp: Date.now(),
        });
        localStorage.setItem('yarny-mutation-queue', JSON.stringify(queue));
      },
      onSuccess: () => {
        // Remove from queue on success
        const queue = JSON.parse(localStorage.getItem('yarny-mutation-queue') || '[]');
        // Remove completed mutation
        // ...
      },
    },
  },
});
```

### Behavior Rules

1. **Queued saves (offline/cached)**: Allow close without prompt - mutations are queued to cache and will retry on next open
2. **Active saves (in-flight)**: Prompt user before close - "You have unsaved changes. Are you sure you want to leave?"
3. **Saved state**: Allow close without prompt - all changes are saved

### Smoke Tests

Add to smoke test checklist:

**P. Unload Safety**:
- [ ] **Queued save close**: Go offline → Make edits → Close tab → Verify no prompt, changes queued
- [ ] **Active save close**: Make edits → Close tab while saving → Verify prompt appears
- [ ] **Saved state close**: Make edits → Wait for save → Close tab → Verify no prompt
- [ ] **Mutation queue persistence**: Go offline → Make edits → Close tab → Reopen → Verify queued mutations retry

### Implementation Timeline

This should be implemented in **Phase 6** (Lazy Loading & Exports) alongside auto-save functionality:
- Create `useUnloadSafety` hook
- Integrate with save status indicator
- Add mutation queue persistence
- Add smoke tests

**LOE**: 2-3 hours (includes unload handler, mutation queue persistence, and smoke tests)

---

## Observability Light (P2 Priority)

### Overview

**Why**: During migration, we need visibility into migration risks (save latency, conflict hits, retry counts) to validate the performance budgets we've written down. A tiny, privacy-respecting heartbeat helps catch issues early.

**What**: Consider a tiny, privacy-respecting heartbeat for only migration risks (save latency, conflict hits, retry counts) behind a debug flag. It'll help validate the budgets you wrote down.

### Implementation Strategy

#### 1. Debug Flag Configuration

Create debug flag for observability:

```typescript
// src/config/debug.ts
const DEBUG_FLAG = 'yarny-debug-observability';

export function isObservabilityEnabled(): boolean {
  // Enable via localStorage: localStorage.setItem('yarny-debug-observability', 'true')
  return localStorage.getItem(DEBUG_FLAG) === 'true';
}
```

#### 2. Observability Metrics

Track only migration risks:

```typescript
// src/utils/observability.ts
interface ObservabilityMetrics {
  saveLatency: number[]; // Array of save latencies (ms)
  conflictHits: number; // Count of conflict detections
  retryCounts: number[]; // Array of retry counts per request
  timestamp: number; // Last update timestamp
}

const METRICS_KEY = 'yarny-observability-metrics';
const MAX_METRICS = 100; // Keep last 100 data points

export function recordSaveLatency(latency: number): void {
  if (!isObservabilityEnabled()) return;
  
  const metrics = getMetrics();
  metrics.saveLatency.push(latency);
  if (metrics.saveLatency.length > MAX_METRICS) {
    metrics.saveLatency.shift(); // Remove oldest
  }
  metrics.timestamp = Date.now();
  localStorage.setItem(METRICS_KEY, JSON.stringify(metrics));
}

export function recordConflictHit(): void {
  if (!isObservabilityEnabled()) return;
  
  const metrics = getMetrics();
  metrics.conflictHits++;
  metrics.timestamp = Date.now();
  localStorage.setItem(METRICS_KEY, JSON.stringify(metrics));
}

export function recordRetryCount(retryCount: number): void {
  if (!isObservabilityEnabled()) return;
  
  const metrics = getMetrics();
  metrics.retryCounts.push(retryCount);
  if (metrics.retryCounts.length > MAX_METRICS) {
    metrics.retryCounts.shift(); // Remove oldest
  }
  metrics.timestamp = Date.now();
  localStorage.setItem(METRICS_KEY, JSON.stringify(metrics));
}

function getMetrics(): ObservabilityMetrics {
  try {
    const stored = localStorage.getItem(METRICS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (err) {
    console.warn('Failed to load observability metrics', err);
  }
  
  return {
    saveLatency: [],
    conflictHits: 0,
    retryCounts: [],
    timestamp: Date.now(),
  };
}

export function getMetricsSummary(): {
  avgSaveLatency: number;
  maxSaveLatency: number;
  conflictHits: number;
  avgRetryCount: number;
} {
  const metrics = getMetrics();
  
  return {
    avgSaveLatency: metrics.saveLatency.length > 0
      ? metrics.saveLatency.reduce((a, b) => a + b, 0) / metrics.saveLatency.length
      : 0,
    maxSaveLatency: metrics.saveLatency.length > 0
      ? Math.max(...metrics.saveLatency)
      : 0,
    conflictHits: metrics.conflictHits,
    avgRetryCount: metrics.retryCounts.length > 0
      ? metrics.retryCounts.reduce((a, b) => a + b, 0) / metrics.retryCounts.length
      : 0,
  };
}
```

#### 3. Integration Points

Integrate observability into key operations:

```typescript
// In save hook
const startTime = Date.now();
await writeMutation.mutateAsync(data);
const latency = Date.now() - startTime;
recordSaveLatency(latency);

// In conflict detection
if (conflict) {
  recordConflictHit();
}

// In React Query retry handler
recordRetryCount(failureCount);
```

#### 4. Debug View

Add debug view (only when flag enabled):

```typescript
// src/components/debug/ObservabilityPanel.tsx
export function ObservabilityPanel() {
  if (!isObservabilityEnabled()) return null;
  
  const summary = getMetricsSummary();
  
  return (
    <div className="observability-panel">
      <h3>Migration Risk Metrics</h3>
      <div>Avg Save Latency: {summary.avgSaveLatency.toFixed(0)}ms</div>
      <div>Max Save Latency: {summary.maxSaveLatency}ms</div>
      <div>Conflict Hits: {summary.conflictHits}</div>
      <div>Avg Retry Count: {summary.avgRetryCount.toFixed(1)}</div>
      <button onClick={() => {
        localStorage.removeItem(METRICS_KEY);
        window.location.reload();
      }}>Clear Metrics</button>
    </div>
  );
}
```

### Privacy Considerations

- **Local-only**: All metrics stored in localStorage, never sent to server
- **Opt-in**: Only enabled via debug flag (not enabled by default)
- **No PII**: No user data, only performance metrics
- **Clearable**: User can clear metrics at any time

### Smoke Tests

Add to smoke test checklist:

**Q. Observability**:
- [ ] **Debug flag**: Enable observability flag → Make edits → Verify metrics recorded
- [ ] **Save latency**: Verify save latency metrics are recorded correctly
- [ ] **Conflict hits**: Trigger conflict → Verify conflict hit recorded
- [ ] **Retry counts**: Trigger retry → Verify retry count recorded
- [ ] **Metrics summary**: Verify metrics summary displays correctly
- [ ] **Privacy**: Verify metrics never sent to server, only stored locally

### Implementation Timeline

This should be implemented in **Phase 7** (Accessibility, Performance & Polish) alongside performance testing:
- Create observability utilities
- Integrate into save, conflict, retry operations
- Add debug panel (optional)
- Add smoke tests

**LOE**: 2-3 hours (includes observability utilities, integration, and smoke tests)

---

## API Contract Formalization (P1 Priority)

### Overview

**Why**: TypeScript on the client is only half the story. We need a typed boundary with runtime validation so Drive/Docs responses don't surprise us during the migration. This reduces "works in dev, breaks in prod" bugs during the cut-over.

**What**: Define a minimal "API contract" (types + runtime validation) for every endpoint we hit (auth, Drive metadata, snapshot list). Keep it central and use it consistently.

### Implementation Strategy

#### 1. Centralized API Contract Module

Create `src/api/contract.ts` that defines:
- **TypeScript types** for all request/response shapes
- **Zod schemas** for runtime validation
- **Single source of truth** for all API contracts

**Why Zod?**
- TypeScript-first schema validation
- Automatic type inference from schemas
- Small bundle size (~8KB)
- Excellent error messages
- Can generate TypeScript types from schemas

#### 2. API Client Wrapper

Create `src/api/client.ts` that:
- Provides typed functions for each endpoint
- Automatically validates requests and responses using Zod
- Handles errors consistently
- Provides type-safe API calls throughout the app

#### 3. File Structure

```
src/api/
├── contract.ts      # Type definitions + Zod schemas for all endpoints
├── client.ts       # Typed API client functions
└── types.ts        # Shared TypeScript types (if needed)
```

### Endpoints to Cover

#### Authentication Endpoints
- `POST /.netlify/functions/verify-google` - Verify Google ID token
- `POST /.netlify/functions/logout` - Clear session
- `GET /.netlify/functions/config` - Get Google Client ID

#### Drive Integration Endpoints
- `GET /.netlify/functions/drive-list` - List files/folders
- `POST /.netlify/functions/drive-read` - Read file content
- `POST /.netlify/functions/drive-write` - Write/update file
- `POST /.netlify/functions/drive-check-comments` - Check for comments/tracked changes
- `POST /.netlify/functions/drive-create-folder` - Create folder
- `POST /.netlify/functions/drive-delete-story` - Delete story folder
- `GET /.netlify/functions/drive-get-or-create-yarny-stories` - Get or create Yarny Stories folder
- `POST /.netlify/functions/drive-delete-file` - Delete file
- `POST /.netlify/functions/drive-rename-file` - Rename file
- `GET /.netlify/functions/drive-auth` - Initiate Drive OAuth (redirect)
- `GET /.netlify/functions/drive-auth-callback` - OAuth callback (redirect)

#### Status Endpoints
- `GET /.netlify/functions/uptime-status` - Get uptime status

### Example Implementation

```typescript
// src/api/contract.ts
import { z } from 'zod';

// Request/Response schemas using Zod
export const VerifyGoogleRequestSchema = z.object({
  token: z.string().min(1),
});

export const VerifyGoogleResponseSchema = z.object({
  verified: z.boolean(),
  user: z.string().email(),
  name: z.string().optional(),
  picture: z.string().url().optional(),
  token: z.string(),
});

// Infer TypeScript types from schemas
export type VerifyGoogleRequest = z.infer<typeof VerifyGoogleRequestSchema>;
export type VerifyGoogleResponse = z.infer<typeof VerifyGoogleResponseSchema>;

// Drive file metadata schema
export const DriveFileSchema = z.object({
  id: z.string(),
  name: z.string(),
  mimeType: z.string(),
  modifiedTime: z.string().optional(),
  size: z.string().optional(),
  trashed: z.boolean().optional(),
});

export const DriveListResponseSchema = z.object({
  files: z.array(DriveFileSchema),
  nextPageToken: z.string().optional(),
});

export type DriveFile = z.infer<typeof DriveFileSchema>;
export type DriveListResponse = z.infer<typeof DriveListResponseSchema>;

// Drive read request/response
export const DriveReadRequestSchema = z.object({
  fileId: z.string().min(1),
});

export const DriveReadResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  mimeType: z.string(),
  modifiedTime: z.string().optional(),
  content: z.string(),
});

export type DriveReadRequest = z.infer<typeof DriveReadRequestSchema>;
export type DriveReadResponse = z.infer<typeof DriveReadResponseSchema>;

// Drive write request/response
export const DriveWriteRequestSchema = z.object({
  fileId: z.string().optional(),
  fileName: z.string().min(1),
  content: z.string(),
  parentFolderId: z.string().optional(),
  mimeType: z.string().default('text/plain'),
});

export const DriveWriteResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  modifiedTime: z.string().optional(),
});

export type DriveWriteRequest = z.infer<typeof DriveWriteRequestSchema>;
export type DriveWriteResponse = z.infer<typeof DriveWriteResponseSchema>;

// Error response schema (common across all endpoints)
export const ApiErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  requiresReauth: z.boolean().optional(),
});

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;
```

```typescript
// src/api/client.ts
import axios from 'axios';
import { z } from 'zod';
import {
  VerifyGoogleRequestSchema,
  VerifyGoogleResponseSchema,
  DriveListResponseSchema,
  DriveReadRequestSchema,
  DriveReadResponseSchema,
  DriveWriteRequestSchema,
  DriveWriteResponseSchema,
  ApiErrorResponseSchema,
  type VerifyGoogleRequest,
  type VerifyGoogleResponse,
  type DriveListResponse,
  type DriveReadRequest,
  type DriveReadResponse,
  type DriveWriteRequest,
  type DriveWriteResponse,
} from './contract';

const API_BASE = '/.netlify/functions';

// Configure axios defaults
axios.defaults.withCredentials = true;

// Generic API call helper with validation
async function apiCall<TRequest, TResponse>(
  endpoint: string,
  request: TRequest,
  requestSchema: z.ZodSchema<TRequest>,
  responseSchema: z.ZodSchema<TResponse>,
  method: 'GET' | 'POST' = 'POST'
): Promise<TResponse> {
  // Validate request
  const validatedRequest = requestSchema.parse(request);

  try {
    const response = await (method === 'GET'
      ? axios.get(`${API_BASE}${endpoint}`, { params: validatedRequest })
      : axios.post(`${API_BASE}${endpoint}`, validatedRequest));

    // Validate response
    const validatedResponse = responseSchema.parse(response.data);
    return validatedResponse;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      // Try to parse error response
      const errorData = ApiErrorResponseSchema.safeParse(error.response.data);
      if (errorData.success) {
        throw new Error(errorData.data.error);
      }
      throw new Error(error.response.data?.error || 'API request failed');
    }
    if (error instanceof z.ZodError) {
      // Validation error - this is a contract violation
      console.error('API contract violation:', error.errors);
      throw new Error(`Invalid API response: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
}

// Typed API functions
export async function verifyGoogle(
  request: VerifyGoogleRequest
): Promise<VerifyGoogleResponse> {
  return apiCall(
    '/verify-google',
    request,
    VerifyGoogleRequestSchema,
    VerifyGoogleResponseSchema
  );
}

export async function listDriveFiles(
  folderId?: string,
  pageToken?: string
): Promise<DriveListResponse> {
  const params = { folderId, pageToken };
  // For GET requests, we'll handle validation differently
  const response = await axios.get(`${API_BASE}/drive-list`, { params });
  return DriveListResponseSchema.parse(response.data);
}

export async function readDriveFile(
  request: DriveReadRequest
): Promise<DriveReadResponse> {
  return apiCall(
    '/drive-read',
    request,
    DriveReadRequestSchema,
    DriveReadResponseSchema
  );
}

export async function writeDriveFile(
  request: DriveWriteRequest
): Promise<DriveWriteResponse> {
  return apiCall(
    '/drive-write',
    request,
    DriveWriteRequestSchema,
    DriveWriteResponseSchema
  );
}

// ... additional endpoint functions
```

### Benefits

1. **Type Safety**: Compile-time checking ensures we use correct request/response shapes
2. **Runtime Validation**: Zod catches shape mismatches at runtime, preventing "works in dev, breaks in prod" issues
3. **Centralized Contracts**: Single source of truth makes it easy to update when endpoints change
4. **Better Error Messages**: Zod provides clear validation error messages
5. **Self-Documenting**: Types serve as inline documentation
6. **Migration Safety**: During cut-over, validation ensures backend changes don't break the frontend silently

### Implementation Timeline

This should be implemented in **Phase 1** (Setup & Infrastructure) as it's foundational:
- Create `src/api/contract.ts` with all endpoint schemas
- Create `src/api/client.ts` with typed API functions
- Update hooks (`useDrive`, `useAuth`) to use the typed client
- Add `zod` to dependencies

**LOE**: 4-6 hours (adds time but saves debugging during migration)

### Dependencies

Add to `package.json`:
```json
{
  "dependencies": {
    "zod": "^3.x"
  }
}
```

---

## Editor Truth and Google Docs Round-Tripping (P1 Priority)

### Overview

**Why**: TipTap is a great editor, but Google Docs is the storage of record. The Google Docs API doesn't speak arbitrary HTML; even if you keep content plain-text, small mismatches can creep in during round-tripping between the editor and Google Docs.

**What**: For v1 React migration, constrain TipTap formatting to Yarny's minimalist model (plain paragraphs, soft line-breaks) and establish clear rules for editor authority and reconciliation.

### Design Decisions

#### 1. Format Constraint: Plain Text Only

**Decision**: TipTap will be configured to support **only plain text** - no rich formatting (bold, italic, colors, etc.).

**Why**:
- Google Docs API doesn't handle arbitrary HTML well
- Current Yarny model is minimalist (plain text with line breaks)
- Reduces round-tripping issues and format mismatches
- Simpler implementation for v1

**Implementation**:
- Use TipTap's `Document` extension (required)
- Use `Paragraph` extension for paragraph breaks (`\n\n`)
- Use `HardBreak` extension for soft line breaks (`\n`)
- **Disable** all formatting extensions (Bold, Italic, Heading, etc.)
- Configure TipTap to extract plain text that matches Google Docs API output

#### 2. Editor as Truth While Open

**Decision**: While Yarny is open and a snippet is being edited, **the editor is authoritative**. Changes made in Google Docs while Yarny is open are ignored until the user switches snippets or closes Yarny.

**Why**:
- Prevents conflicts while actively editing
- Better UX - user's current edits take precedence
- Matches current behavior (editor content is saved to Drive, overwriting Drive version)

**Implementation**:
- When snippet is loaded into editor, mark it as "active" in state
- While active, all saves write to Drive (overwriting Drive version)
- Don't check for conflicts while snippet is active in editor
- Only check conflicts when:
  - Switching to a different snippet
  - Opening Yarny (initial load)
  - Window regains focus (reconciliation check)

#### 3. Reconciliation on Window Focus

**Decision**: When the window regains focus, check if any open snippets were modified externally in Google Docs. If so, reconcile the changes.

**Why**:
- User might have edited in Google Docs in another tab/window
- Need to detect and handle external changes
- Better than only checking on snippet switch (catches changes sooner)

**Implementation**:
- Listen to `window.addEventListener('focus', ...)` event
- For each snippet that's loaded but not currently active in editor:
  - Check if Drive `modifiedTime` > `lastKnownDriveModifiedTime`
  - If changed, fetch Drive content and compare with local content
  - If different, show reconciliation UI (not full conflict modal - just notification)
  - Allow user to:
    - Keep local version (overwrite Drive)
    - Use Drive version (replace local)
    - View diff and decide later

#### 4. Conflict Detection

**Decision**: Set up conflict detection infrastructure early (Phase 1), implement hooks and UI in Phase 5 (not later).

**Why**:
- Conflict detection infrastructure (text extraction utilities) is foundational
- Need to test round-tripping early (Phase 4)
- **Conflict resolution modal must be in Phase 5** to catch Editor/Docs mismatch issues early before they compound
- Testing cross-edits (opening Doc in Google Docs while Yarny is idle) requires conflict modal to be functional

**Implementation**:
- Phase 1: Create text extraction utilities matching Google Docs format
- Phase 4: Test round-tripping with TipTap editor
- Phase 5: Implement conflict detection hooks and conflict resolution UI (moved from Phase 6)
- Use React Query to check file metadata
- Compare timestamps and content
- Show conflict resolution modal (reuse existing UI patterns)
- Test cross-edits: Open Doc in Google Docs while Yarny is idle, make edits, return to Yarny and verify conflict detection

### Implementation Strategy

#### 1. TipTap Configuration (Plain Text Only)

Create `src/components/editor/TipTapEditor.tsx`:

```typescript
import { useEditor, EditorContent } from '@tiptap/react';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import HardBreak from '@tiptap/extension-hard-break';
import History from '@tiptap/extension-history';
import { useCallback, useEffect, useRef } from 'react';
import { extractPlainText } from '../../utils/textExtraction';

interface TipTapEditorProps {
  content: string;
  onChange: (content: string) => void;
  onWordCountChange?: (words: number, chars: number) => void;
  placeholder?: string;
  isReadOnly?: boolean;
}

export function TipTapEditor({ 
  content, 
  onChange, 
  onWordCountChange,
  placeholder,
  isReadOnly = false 
}: TipTapEditorProps) {
  const isComposingRef = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const editor = useEditor({
    extensions: [
      Document,
      Paragraph,
      Text,
      HardBreak, // Shift+Enter for soft line breaks
      History, // Undo/redo support
      // NOTE: Intentionally NOT including:
      // - Bold, Italic, Heading, etc. (no rich formatting)
      // - Lists, Blockquote, etc. (keep it minimal)
    ],
    content: content || '',
    editable: !isReadOnly,
    onUpdate: ({ editor }) => {
      // Don't update during IME composition
      if (isComposingRef.current) return;
      
      // Extract plain text and notify parent
      const plainText = extractPlainText(editor);
      onChange(plainText);
      
      // Update word count (debounced)
      if (onWordCountChange) {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
          const text = plainText;
          const words = text.trim() ? text.trim().split(/\s+/).length : 0;
          const chars = text.length;
          onWordCountChange(words, chars);
        }, 100);
      }
    },
    editorProps: {
      attributes: {
        class: 'tiptap-editor',
        'data-placeholder': placeholder || 'Start writing...',
      },
      handleDOMEvents: {
        // Handle IME composition events
        compositionstart: () => {
          isComposingRef.current = true;
          return false;
        },
        compositionend: () => {
          isComposingRef.current = false;
          // Trigger update after composition ends
          if (editor) {
            const plainText = extractPlainText(editor);
            onChange(plainText);
            if (onWordCountChange) {
              const text = plainText;
              const words = text.trim() ? text.trim().split(/\s+/).length : 0;
              const chars = text.length;
              onWordCountChange(words, chars);
            }
          }
          return false;
        },
      },
    },
  });

  // Update editor content when prop changes (but not on every render)
  useEffect(() => {
    if (editor && content !== extractPlainText(editor) && !isComposingRef.current) {
      // Only update if content actually changed (prevents loops)
      // Don't update during IME composition
      editor.commands.setContent(content || '');
    }
  }, [content, editor]);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return <EditorContent editor={editor} />;
}
```

#### 2. Editor Authority State

Add to Zustand store (`src/store/store.ts`):

```typescript
interface EditorState {
  activeSnippetId: string | null;
  activeSnippetLoadedAt: string | null; // Timestamp when snippet was loaded
  // ... other state
}

// When snippet is loaded into editor
function setActiveSnippet(snippetId: string) {
  set((state) => ({
    project: {
      ...state.project,
      activeSnippetId: snippetId,
      activeSnippetLoadedAt: new Date().toISOString(),
    },
  }));
}

// Check if snippet is currently active (authoritative)
function isSnippetActive(snippetId: string): boolean {
  return useStore.getState().project.activeSnippetId === snippetId;
}
```

#### 3. Reconciliation on Window Focus

Create `src/hooks/useWindowFocusReconciliation.ts`:

```typescript
import { useEffect } from 'react';
import { useStore } from '../store/store';
import { useDriveFile } from './useDriveQueries';

export function useWindowFocusReconciliation() {
  const snippets = useStore((state) => state.snippets);
  const activeSnippetId = useStore((state) => state.project.activeSnippetId);

  useEffect(() => {
    const handleFocus = async () => {
      // Check all loaded snippets (except active one - editor is truth)
      const loadedSnippets = Object.values(snippets).filter(
        (s) => s._contentLoaded && s.driveFileId && s.id !== activeSnippetId
      );

      for (const snippet of loadedSnippets) {
        // Use React Query to check file metadata
        const { data: driveFile } = useDriveFile(snippet.driveFileId);
        
        if (!driveFile || !snippet.lastKnownDriveModifiedTime) continue;

        const driveTime = new Date(driveFile.modifiedTime).getTime();
        const lastKnownTime = new Date(snippet.lastKnownDriveModifiedTime).getTime();

        // If Drive version is newer, check content
        if (driveTime > lastKnownTime) {
          const driveContent = (driveFile.content || '').trim();
          const localContent = (snippet.body || '').trim();

          if (driveContent !== localContent) {
            // Show reconciliation notification (not full modal)
            // User can choose to reconcile now or later
            showReconciliationNotification(snippet, driveContent, driveFile.modifiedTime);
          }
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [snippets, activeSnippetId]);
}
```

#### 4. Cross-Tab Coordination Hook

Create `src/hooks/useCrossTabCoordination.ts`:

```typescript
import { useEffect, useRef } from 'react';
import { useStore } from '../store/store';

const CHANNEL_NAME = 'yarny-tab-coordination';
const HEARTBEAT_INTERVAL = 1000; // 1 second
const TAB_TIMEOUT = 3000; // 3 seconds - tab considered inactive if no heartbeat

interface TabState {
  tabId: string;
  activeSnippetId: string | null;
  timestamp: number;
}

export function useCrossTabCoordination() {
  const activeSnippetId = useStore((state) => state.project.activeSnippetId);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const tabIdRef = useRef<string>(`tab-${Date.now()}-${Math.random()}`);
  const otherTabsRef = useRef<Map<string, TabState>>(new Map());
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Try BroadcastChannel first, fall back to localStorage events
    if (typeof BroadcastChannel !== 'undefined') {
      channelRef.current = new BroadcastChannel(CHANNEL_NAME);
      
      channelRef.current.onmessage = (event) => {
        const { type, tabId, activeSnippetId: snippetId, timestamp } = event.data;
        
        if (type === 'heartbeat' && tabId !== tabIdRef.current) {
          // Update other tab's state
          otherTabsRef.current.set(tabId, {
            tabId,
            activeSnippetId: snippetId,
            timestamp,
          });
          
          // Remove stale tabs (no heartbeat for 3 seconds)
          const now = Date.now();
          for (const [id, state] of otherTabsRef.current.entries()) {
            if (now - state.timestamp > TAB_TIMEOUT) {
              otherTabsRef.current.delete(id);
            }
          }
        }
      };
    } else {
      // Fallback to localStorage events
      const handleStorage = (e: StorageEvent) => {
        if (e.key === 'yarny-tab-heartbeat' && e.newValue) {
          try {
            const data = JSON.parse(e.newValue);
            if (data.tabId !== tabIdRef.current) {
              otherTabsRef.current.set(data.tabId, {
                tabId: data.tabId,
                activeSnippetId: data.activeSnippetId,
                timestamp: data.timestamp,
              });
            }
          } catch (err) {
            console.error('Failed to parse tab heartbeat', err);
          }
        }
      };
      
      window.addEventListener('storage', handleStorage);
      return () => window.removeEventListener('storage', handleStorage);
    }

    // Send heartbeat periodically
    const sendHeartbeat = () => {
      const message = {
        type: 'heartbeat',
        tabId: tabIdRef.current,
        activeSnippetId,
        timestamp: Date.now(),
      };
      
      if (channelRef.current) {
        channelRef.current.postMessage(message);
      } else {
        // Fallback to localStorage
        localStorage.setItem('yarny-tab-heartbeat', JSON.stringify(message));
        localStorage.removeItem('yarny-tab-heartbeat'); // Trigger storage event
      }
    };

    heartbeatIntervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
    sendHeartbeat(); // Send immediately

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (channelRef.current) {
        channelRef.current.close();
      }
    };
  }, [activeSnippetId]);

  // Check if snippet is being edited in another tab
  const isSnippetLockedInOtherTab = (snippetId: string | null): boolean => {
    if (!snippetId) return false;
    
    const now = Date.now();
    for (const state of otherTabsRef.current.values()) {
      // Check if another tab is editing this snippet and is still active
      if (state.activeSnippetId === snippetId && (now - state.timestamp) < TAB_TIMEOUT) {
        return true;
      }
    }
    
    return false;
  };

  return {
    isSnippetLockedInOtherTab,
    otherTabsCount: otherTabsRef.current.size,
    // Get active tab info for warning message
    getActiveTabInfo: (snippetId: string | null) => {
      if (!snippetId) return null;
      const now = Date.now();
      for (const state of otherTabsRef.current.values()) {
        if (state.activeSnippetId === snippetId && (now - state.timestamp) < TAB_TIMEOUT) {
          return state;
        }
      }
      return null;
    },
  };
}
```

**Usage in Editor Component**:
```typescript
// In Editor component
import { useCrossTabCoordination } from '../hooks/useCrossTabCoordination';

function Editor({ snippetId }: { snippetId: string }) {
  const { isSnippetLockedInOtherTab, getActiveTabInfo } = useCrossTabCoordination();
  const isLocked = isSnippetLockedInOtherTab(snippetId);
  const activeTabInfo = getActiveTabInfo(snippetId);
  
  // Show warning/lock UI when snippet is being edited in another tab
  if (isLocked) {
    return (
      <div className="editor-locked">
        <div className="lock-warning">
          <LockIcon />
          <span>This snippet is being edited in another tab. Changes are read-only here.</span>
        </div>
        <TipTapEditor 
          content={content} 
          isReadOnly={true} // Lock editor
          placeholder="Editing in another tab..."
        />
      </div>
    );
  }
  
  // Normal editable editor
  return <TipTapEditor content={content} isReadOnly={false} />;
}
```

#### 5. Conflict Detection Hook

Create `src/hooks/useConflictDetection.ts`:

```typescript
import { useCallback } from 'react';
import { useStore } from '../store/store';
import { useDriveFile } from './useDriveQueries';

export interface Conflict {
  snippetId: string;
  localContent: string;
  driveContent: string;
  localModifiedTime: string;
  driveModifiedTime: string;
}

export function useConflictDetection() {
  const snippets = useStore((state) => state.snippets);
  const activeSnippetId = useStore((state) => state.project.activeSnippetId);

  const checkConflict = useCallback(async (snippetId: string): Promise<Conflict | null> => {
    const snippet = snippets[snippetId];
    if (!snippet || !snippet.driveFileId) return null;

    // Don't check conflicts for active snippet (editor is truth)
    if (snippetId === activeSnippetId) return null;

    // Use React Query to get Drive file
    const { data: driveFile } = useDriveFile(snippet.driveFileId);
    if (!driveFile || !snippet.lastKnownDriveModifiedTime) return null;

    const driveTime = new Date(driveFile.modifiedTime).getTime();
    const lastKnownTime = new Date(snippet.lastKnownDriveModifiedTime).getTime();

    // If Drive version is newer, check content
    if (driveTime > lastKnownTime) {
      const driveContent = (driveFile.content || '').trim();
      const localContent = (snippet.body || '').trim();

      if (driveContent !== localContent) {
        return {
          snippetId,
          localContent,
          driveContent,
          localModifiedTime: snippet.updatedAt || snippet.lastKnownDriveModifiedTime,
          driveModifiedTime: driveFile.modifiedTime,
        };
      }
    }

    return null;
  }, [snippets, activeSnippetId]);

  return { checkConflict };
}
```

#### 5. Text Extraction Matching Google Docs Format

Create `src/utils/textExtraction.ts`:

```typescript
/**
 * Extract plain text from TipTap editor that matches Google Docs API output format.
 * 
 * Google Docs API returns plain text with:
 * - Paragraph breaks as \n\n
 * - Soft line breaks as \n
 * - Normalized line endings (CRLF -> LF, CR -> LF)
 * - Trailing spaces may be collapsed
 * - Non-breaking spaces (NBSP) may be normalized to regular spaces
 * 
 * This function normalizes text to match Google Docs' normalization behavior.
 */
export function extractPlainText(editor: any): string {
  // TipTap's getText() with blockSeparator handles this correctly
  let text = editor.getText({ blockSeparator: '\n\n' });
  
  // Normalize line endings (CRLF -> LF, CR -> LF) - matches Google Docs behavior
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Normalize non-breaking spaces (NBSP) to regular spaces - Google Docs may normalize these
  text = text.replace(/\u00A0/g, ' ');
  
  // Clean up excessive newlines (more than 2 consecutive)
  text = text.replace(/\n{3,}/g, '\n\n');
  
  // Normalize trailing spaces per line (Google Docs may collapse these)
  // Keep paragraph structure but normalize trailing whitespace
  text = text.split('\n').map(line => {
    // Preserve intentional paragraph breaks (empty lines)
    if (line.trim() === '') return '';
    // Remove trailing spaces (Google Docs may collapse these)
    return line.replace(/\s+$/, '');
  }).join('\n');
  
  // Remove leading/trailing whitespace from entire text
  text = text.trim();
  
  return text;
}

/**
 * Compare two plain text strings, accounting for whitespace differences and Google Docs normalization.
 * 
 * This function normalizes both texts using the same rules as extractPlainText() before comparison.
 */
export function comparePlainText(text1: string, text2: string): boolean {
  const normalize = (t: string): string => {
    // Apply same normalization as extractPlainText
    let normalized = t.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    normalized = normalized.replace(/\u00A0/g, ' '); // NBSP -> space
    normalized = normalized.split('\n').map(line => {
      if (line.trim() === '') return '';
      return line.replace(/\s+$/, ''); // Remove trailing spaces
    }).join('\n');
    return normalized.trim();
  };
  
  return normalize(text1) === normalize(text2);
}
```

### Round-Tripping Flow

1. **Load from Drive**: Google Docs content → Plain text → TipTap editor
2. **Edit in TipTap**: User edits → TipTap onChange → Plain text → State update
3. **Save to Drive**: Plain text → Google Docs API → Google Docs updated
4. **Reconciliation**: On focus/switch, check if Drive changed → Compare plain text → Resolve if different

### Testing Strategy

1. **Round-Trip Test**: Edit in Yarny → Save → Edit in Google Docs → Check Yarny → Verify no format loss
2. **Cross-Edit Test (Critical)**: 
   - Open Yarny and load a snippet (make it idle, not actively editing)
   - Open the same Google Doc in Google Docs in another tab/window
   - Make edits in Google Docs
   - Return to Yarny (switch snippets or refocus window)
   - Verify conflict detection works correctly and conflict modal appears
3. **Conflict Test**: Edit in Yarny → Edit in Google Docs → Switch snippets → Verify conflict detection
4. **Reconciliation Test**: Edit in Google Docs (other tab) → Focus Yarny window → Verify reconciliation notification
5. **Format Test**: Paste rich text → Verify it's stripped to plain text
6. **Line Break Test**: Test paragraph breaks (`\n\n`) and soft breaks (`\n`)

### Implementation Timeline

This spans multiple phases:
- **Phase 1**: Set up TipTap with plain text configuration, create text extraction utilities with newline normalization
- **Phase 2**: Implement reconciliation on window focus, add cross-tab coordination hook with warning/lock UI
- **Phase 4**: Integrate TipTap editor with IME composition handling, round-trip testing with format normalization tests
- **Phase 5**: Create conflict detection hooks, conflict resolution UI and modal (moved from Phase 6 to catch Editor/Docs mismatch issues early)
- **Phase 5**: Test cross-edits (open Doc in Google Docs while Yarny is idle, make edits, return to Yarny)
- **Phase 5**: Test cross-tab conflicts (two Yarny tabs editing same snippet)
- **Phase 4/5**: Add CJK and emoji test snippets to test corpus

**LOE**: 12-18 hours (includes TipTap configuration with IME handling, conflict detection, reconciliation, cross-tab coordination, format normalization, and comprehensive testing)

### Dependencies

Already included in recommended stack:
- `@tiptap/react` - Editor framework
- Individual TipTap extensions (Document, Paragraph, Text, HardBreak, History) - configured separately

**Note**: Individual extensions are used instead of starter-kit to maintain strict plain text configuration and exclude all formatting capabilities.

---

## Migration Phases

### Phase 1: Setup & Infrastructure (Week 1)
- [ ] Set up React + TypeScript + Vite build system
- [ ] Configure TypeScript (tsconfig.json)
- [ ] Set up type definitions for all libraries
- [ ] Set up Netlify build configuration
- [ ] Install and configure all libraries
- [ ] **Set up TanStack Query (React Query) with QueryClient and QueryClientProvider**
- [ ] **Create React Query hooks for ALL Drive I/O operations (`src/hooks/useDriveQueries.ts`)**
- [ ] **Configure TipTap for plain text only (no rich formatting)**
- [ ] **Create text extraction utilities matching Google Docs format**
- [ ] Create base component structure with TypeScript
- [ ] **Set up normalized state management (Zustand) with TypeScript types**
- [ ] **Create normalized state structure in `src/store/types.ts` (all entities keyed by id)**
- [ ] **Create selectors in `src/store/selectors.ts` to derive views (e.g., left-rail lists)**
- [ ] **Set up MUI theme customization (`src/theme/theme.ts`) with brand color mappings**
- [ ] **Customize MUI component defaults to match existing design**
- [ ] **Set up ThemeProvider in app root**
- [ ] **Create test corpus folder structure (`Yarny Test Corpus` in Drive)**
- [ ] **Populate small project with sample data**
- [ ] **Document smoke test checklist**

**LOE**: 30-42 hours (includes TypeScript setup, type definitions, React Query setup, TipTap plain text configuration, state normalization, MUI theming, and test corpus setup)

**Phase 1 Risk Checkpoint**: Re-rate risks for Editor/Docs round-trip, Drive quotas, performance at large scale. Verify React Query and Zod are fully implemented per definition of done.

### Phase 2: Authentication, Router & API Contract (Week 1-2)
- [ ] Configure React Router with TypeScript
- [ ] Set up routing structure
- [ ] **Create API contract module (`src/api/contract.ts`) with Zod schemas**
- [ ] **Create typed API client (`src/api/client.ts`)**
- [ ] Convert login page to React
- [ ] Integrate Google Sign-In SDK
- [ ] Create Auth context/provider
- [ ] Handle auth state and redirects
- [ ] **Implement reconciliation on window focus (`src/hooks/useWindowFocusReconciliation.ts`)**
- [ ] Test authentication flow

**LOE**: 12-18 hours (includes router setup, API contract formalization, and reconciliation hook implementation)

**Phase 2 Risk Checkpoint**: Re-rate risks for Editor/Docs round-trip, Drive quotas, performance at large scale. Verify API contract formalization is complete.

### Phase 3: Stories Page with Virtualization Stub (Week 2)
- [ ] Convert stories list to React components
- [ ] Implement search/filtering
- [ ] Add modals (new story, delete confirmation)
- [ ] Integrate with Drive API hooks
- [ ] **Stub virtualized list capability (set up `@tanstack/react-virtual` infrastructure, even if not used yet)**
- [ ] Test story management

**LOE**: 10-14 hours (includes virtualization infrastructure setup)

**Phase 3 Risk Checkpoint**: Re-rate risks for Editor/Docs round-trip, Drive quotas, performance at large scale.

### Phase 4: Editor - Tri-Pane Shell & Plain Text Round-Trip (Week 2-3)
- [ ] Set up three-column layout (Story/Editor/Notes)
- [ ] Convert story list sidebar
- [ ] Convert notes sidebar with tabs
- [ ] **Implement footer word/character counts first**
- [ ] **Implement save status display**
- [ ] **Set up TipTap editor with plain text configuration**
- [ ] **Integrate TipTap with conflict detection**
- [ ] **Implement editor as truth (authoritative while open)**
- [ ] Basic editor functionality
- [ ] **Test round-tripping with Google Docs**
- [ ] **Run smoke tests on small project (test-small) after TipTap integration**
- [ ] **Validate round-tripping with small project**
- [ ] **Populate medium project (test-medium)**
- [ ] **Classic UX anchors visual parity check**: Perform pixel-diff or side-by-side visual comparison for goal meter, "Today" chip, and footer counts before closing phase

**LOE**: 24-33 hours (includes TipTap integration, conflict detection integration, round-trip testing, smoke test execution, and footer/save status implementation)

**Phase 4 Risk Checkpoint**: Re-rate risks for Editor/Docs round-trip, Drive quotas, performance at large scale. Verify classic UX anchors pass visual parity check (pixel-diff or side-by-side comparison).

### Phase 5: Library Features & Goals UI (Week 3-4)
- [ ] Implement drag & drop with @dnd-kit
- [ ] Color picker integration
- [ ] Context menus
- [ ] All modals (story info, rename, delete, etc.) using Material UI Dialog
- [ ] Tabs implementation using Material UI Tabs
- [ ] **Implement Goals UI: Goal Meter (left-rail) and Goal Panel modal at parity with alpha plan**
- [ ] **Implement "Today • N" chip with progress bar and "ahead/behind by N words" indicator**
- [ ] Word count updates
- [ ] **Create conflict detection hooks (`src/hooks/useConflictDetection.ts`)**
- [ ] **Conflict resolution UI and modal (moved from Phase 6 to catch Editor/Docs mismatch issues early)**
- [ ] **Test cross-edits: Open Doc in Google Docs while Yarny is idle, make edits, return to Yarny and verify conflict detection works**

**LOE**: 25-35 hours (includes Goals UI implementation with chip and panel, plus conflict resolution modal)

**Phase 5 Risk Checkpoint**: Re-rate risks for Editor/Docs round-trip, Drive quotas, performance at large scale. Verify conflict resolution modal is functional and cross-edit testing passes.

### Phase 6: Lazy Loading & Exports (Week 4)
- [ ] Lazy loading logic using React Query prefetching and `useQueries` (visibility-gated)
- [ ] Auto-save functionality using React Query mutations (visibility-gated)
- [ ] **Offline/spotty-network semantics**: Network status hook, offline banner, queued saves, save status updates
- [ ] Export functionality with chunked writes for large chapters
- [ ] **Implement chunked export logic for chapters exceeding batchUpdate body limits**
- [ ] **Add progress indication for chunked exports**
- [ ] **Run full smoke test suite on small and medium projects**
- [ ] **Validate all operations work correctly (including conflict resolution from Phase 5)**
- [ ] **Populate large project (test-large) with very large chapter (50+ snippets)**
- [ ] **Test export of very large chapter to validate chunking**

**LOE**: 16-23 hours (Note: Conflict resolution moved to Phase 5; lazy loading is simplified with React Query's built-in prefetching; includes offline/spotty-network semantics and smoke test execution)

**Phase 6 Risk Checkpoint**: Re-rate risks for Editor/Docs round-trip, Drive quotas, performance at large scale. Verify export chunking works correctly for large chapters.

### Phase 7: Accessibility, Performance & Polish (Week 4-5)
- [ ] **Accessibility audit and fixes**:
  - [ ] Verify minimum contrast ratios (4.5:1 for text, 3:1 for UI chrome) against soft chips and dark surfaces
  - [ ] **Contrast checks on every chip color**: Test all 12 accent colors (base, soft, dark variants) meet contrast requirements
  - [ ] Verify visible focus rings on all actionable items (especially left rail and modal footers)
  - [ ] Implement keyboard-only flows for reordering lists (dnd-kit keyboard navigation)
  - [ ] **Keyboard-only completion of core tasks**: Verify create/rename/reorder/export operations completable via keyboard only
  - [ ] Test with screen readers
  - [ ] Verify keyboard navigation works throughout app
- [ ] **Visual parity validation**:
  - [ ] Side-by-side `/react` vs. root comparison for: goal meter, Today chip, footer counts, story cards, modal spacing
  - [ ] Document "diff" screenshots as artifacts (save comparison screenshots for reference)
  - [ ] Verify pixel-perfect match for classic UX anchors
- [ ] Cross-browser testing
- [ ] **Run full smoke test suite on all three project sizes (test-small, test-medium, test-large)**
- [ ] **Performance testing with large project (test-large)**:
  - [ ] Verify time-to-first-keystroke after editor mount ≤ 800 ms
  - [ ] Verify snippet switch to interactive ≤ 300 ms (medium corpus, hot path)
  - [ ] Verify background load never blocks typing (no jank > 16 ms frames)
  - [ ] Profile with React DevTools
- [ ] Performance optimization (virtualization activation if needed, memoization review)
- [ ] **Regression testing before production deployment**
- [ ] Bug fixes
- [ ] Mobile responsiveness check
- [ ] Documentation updates

**LOE**: 25-38 hours (includes accessibility polish beyond MUI defaults, visual parity validation with diff screenshots, performance budget validation, bundle size validation, smoke test execution on all test corpus projects)

**Phase 7 Risk Checkpoint**: Final risk assessment before production deployment. Re-rate all risks and verify mitigation strategies are effective.

### Phase 8: Test Automation (Week 5-6)

**Goal**: Automate as many tests from the testing workbook as possible to reduce manual testing burden and enable continuous regression testing.

**Strategy**: Use Playwright for end-to-end testing with mocked Google Drive API, plus React Testing Library for component-level tests. Focus on automating functional tests that don't require subjective human judgment.

#### Test Categorization

Based on analysis of the testing workbook (`public/migration-plan/testing-workbook.html`), tests fall into three categories:

**1. Fully Automatable (60-70% of tests)**:
- API contract validation (can use Zod schemas)
- State management operations (CRUD operations)
- Data persistence and round-trips
- Word count calculations
- Goal calculations (elastic/strict modes)
- Search functionality
- Export operations (verify file creation, content structure)
- Conflict detection logic
- Format normalization (line endings, NBSPs)
- Session persistence
- Error handling and edge cases
- Performance metrics (time to first edit, time to switch snippet)

**2. Partially Automatable (20-25% of tests)**:
- UI rendering and layout (can automate visual regression with pixel-diff)
- Modal open/close behavior
- Drag & drop operations
- Keyboard navigation
- Focus management
- Loading states
- Error message display

**3. Requires Human Testing (10-15% of tests)**:
- Subjective UX evaluation ("looks and behaves identically to original")
- Visual design parity (colors, spacing, typography - though pixel-diff can help)
- Accessibility with screen readers (requires human verification)
- Mobile device warning (requires actual device or emulator)
- Cross-browser visual consistency
- IME composition (Japanese/Chinese/Korean) - can be partially automated but needs human verification

#### Implementation Plan

**A. Set Up Testing Infrastructure**:
- [ ] Install Playwright (`@playwright/test`)
- [ ] Install React Testing Library (`@testing-library/react`, `@testing-library/jest-dom`)
- [ ] Install Vitest for unit tests (`vitest`)
- [ ] Set up test configuration files
- [ ] Create test utilities and helpers
- [ ] Set up mock Google Drive API server (using MSW - Mock Service Worker)
- [ ] Create test data fixtures matching test corpus structure

**B. Component-Level Tests (React Testing Library)**:
- [ ] Test all modal components (open, close, form submission)
- [ ] Test context menus (open, select options)
- [ ] Test color picker (select colors, verify state)
- [ ] Test goal meter calculations (elastic/strict modes)
- [ ] Test word count calculations
- [ ] Test search functionality (filtering, highlighting)
- [ ] Test drag & drop operations (using `@testing-library/user-event`)
- [ ] Test keyboard shortcuts
- [ ] Test form validations

**C. Integration Tests (React Testing Library + MSW)**:
- [ ] Test API contract validation (Zod schemas)
- [ ] Test state management operations (create, read, update, delete stories/chapters/snippets/notes)
- [ ] Test Google Drive sync (mocked API calls)
- [ ] Test conflict detection logic
- [ ] Test format normalization
- [ ] Test session persistence (localStorage/cookies)
- [ ] Test error handling (network errors, API errors, rate limiting)

**D. End-to-End Tests (Playwright)**:
- [ ] Test authentication flow (mocked Google Sign-In)
- [ ] Test story management (create, edit, delete, refresh)
- [ ] Test editor operations (open snippet, edit, save, auto-save)
- [ ] Test chapter/snippet management (create, rename, delete, reorder)
- [ ] Test color coding (assign colors to chapters/snippets)
- [ ] Test search (chapters, snippets, content)
- [ ] Test goals (set goal, verify calculations, elastic/strict modes)
- [ ] Test notes (People/Places/Things CRUD operations)
- [ ] Test export operations (verify file creation, content structure)
- [ ] Test conflict resolution (simulate external edits, verify conflict modal)
- [ ] Test round-tripping (edit in Yarny → verify in Drive → edit in Drive → verify in Yarny)
- [ ] Test performance budgets (time to first edit ≤300ms hot path, ≤1.5s cold path)
- [ ] Test visibility-based request gating (hidden tabs don't make requests)
- [ ] Test rate limiting handling (simulate 429 errors, verify exponential backoff)

**E. Visual Regression Tests (Playwright + Pixel-Diff)**:
- [ ] Set up visual regression testing with `@playwright/test` screenshot comparison
- [ ] Test classic UX anchors (goal meter, "Today • N" chip, footer counts) - compare against reference screenshots
- [ ] Test modal layouts
- [ ] Test responsive layouts
- [ ] Test color coding display
- [ ] Test loading states
- [ ] Test error states

**F. Performance Tests (Playwright)**:
- [ ] Test time-to-first-keystroke after editor mount (target: ≤800ms)
- [ ] Test time to first edit (hot path: ≤300ms, cold path: ≤1.5s)
- [ ] Test snippet switch to interactive (medium corpus, hot path: ≤300ms)
- [ ] Test time to switch snippet (hot path: ≤300ms, cold path: ≤1.5s)
- [ ] Test large story performance (25+ chapters, 200+ snippets)
- [ ] Test lazy loading behavior
- [ ] Test virtualization thresholds (verify virtualization activates at configured thresholds)
- [ ] Test frame jank during background loads (verify no jank > 16ms frames while typing)

**G. Test Data Management**:
- [ ] Create test corpus fixtures (small, medium, large projects)
- [ ] Create test data generators for edge cases
- [ ] Set up test data reset utilities
- [ ] Document test data structure

**H. CI/CD Integration**:
- [ ] Set up GitHub Actions workflow for test execution
- [ ] Configure test execution on PR and main branch
- [ ] Set up test result reporting
- [ ] Configure visual regression test failure notifications

#### Test Coverage Goals

- **Component Tests**: 80%+ coverage of UI components
- **Integration Tests**: 90%+ coverage of business logic (hooks, utilities, state management)
- **E2E Tests**: 70%+ coverage of user workflows (automated tests from workbook)
- **Visual Regression**: 100% coverage of classic UX anchors and critical UI elements

#### Mock Strategy

**Google Drive API Mocking**:
- Use MSW (Mock Service Worker) to intercept Drive API calls
- Create mock handlers for all Drive operations (list, read, write, delete, rename, create folder, check comments)
- Support test scenarios: success, errors, rate limiting, conflicts
- Enable test data manipulation without real Drive API calls

**Google Sign-In Mocking**:
- Mock Google Identity Services (GSI) authentication flow
- Simulate successful sign-in, token refresh, sign-out
- Support test scenarios: valid tokens, expired tokens, invalid tokens

#### Test Execution Strategy

**Local Development**:
- Run component and integration tests during development (`npm run test:watch`)
- Run E2E tests before committing (`npm run test:e2e`)
- Run visual regression tests before release (`npm run test:visual`)

**CI/CD Pipeline**:
- Run all tests on PR creation/update
- Run full test suite on merge to main
- Block PR merge if tests fail
- Generate test coverage reports

**Pre-Release**:
- Run full test suite (component + integration + E2E + visual)
- Run performance tests
- Compare against baseline metrics
- Generate test report

#### Manual Testing Remaining

After automation, manual testing focuses on:
- **Subjective UX evaluation**: Does it "feel" like the original app?
- **Visual design parity**: Side-by-side comparison with original app
- **Accessibility**: Screen reader testing, keyboard-only navigation
- **Cross-browser**: Visual consistency across Chrome, Firefox, Safari, Edge
- **IME composition**: Japanese/Chinese/Korean input (can be partially automated but needs human verification)
- **Mobile device warning**: Actual device testing
- **Edge cases**: Unusual user behaviors, error recovery

#### Benefits

1. **Faster Feedback**: Automated tests run in minutes vs. hours of manual testing
2. **Regression Prevention**: Catch bugs before they reach production
3. **Confidence in Refactoring**: Automated tests enable safe code changes
4. **Documentation**: Tests serve as living documentation of expected behavior
5. **Continuous Testing**: Tests run on every PR and deployment
6. **Reduced Manual Burden**: 60-70% of tests automated, freeing human testers for subjective evaluation

#### LOE Breakdown

- **Infrastructure Setup**: 8-12 hours (Playwright, React Testing Library, MSW, test configuration)
- **Component Tests**: 12-18 hours (modal, context menu, color picker, goal meter, word count, search, drag & drop)
- **Integration Tests**: 10-15 hours (API contract, state management, Drive sync, conflict detection, format normalization)
- **E2E Tests**: 20-30 hours (authentication, story management, editor, chapters/snippets, goals, notes, export, conflict resolution, round-tripping, performance)
- **Visual Regression Tests**: 6-10 hours (classic UX anchors, modals, responsive layouts, loading/error states)
- **Test Data Management**: 4-6 hours (fixtures, generators, reset utilities)
- **CI/CD Integration**: 4-6 hours (GitHub Actions, reporting, notifications)

**Total LOE**: 64-97 hours (8-12 days)

#### Timeline

- **Week 5**: Infrastructure setup, component tests, integration tests
- **Week 6**: E2E tests, visual regression tests, CI/CD integration, documentation

#### Success Criteria

- [ ] 60%+ of testing workbook tests are automated
- [ ] All critical user workflows have E2E test coverage
- [ ] All classic UX anchors have visual regression tests
- [ ] Performance budgets are validated automatically
- [ ] Tests run in CI/CD pipeline on every PR
- [ ] Test coverage reports are generated and tracked
- [ ] Manual testing checklist is updated to reflect automated tests

**Phase 8 Risk Checkpoint**: Verify test automation coverage meets goals, CI/CD integration works correctly, and manual testing burden is reduced.

---

## Risk Factors

### Risk Register Cadence

**Process**: At the end of each migration phase, conduct a risk checkpoint to re-rate the following critical risks:

1. **Editor/Docs Mismatch & Round-Tripping** - Verify round-trip testing passes, conflict detection works, format normalization is correct
2. **Drive Quotas** - Verify visibility-based gating prevents request storms, rate limit handling works correctly
3. **Performance at Large Scale** - Verify performance with large projects (test-large), virtualization thresholds are appropriate, memoization is effective

**Checkpoint Activities**:
- Review risk mitigation strategies implemented in the phase
- Test critical paths with test corpus (small, medium, large projects)
- Re-rate risk level (High/Medium/Low) based on current status
- Update mitigation strategies if needed
- Document any new risks discovered
- Verify definition of done criteria are met

**Checkpoint Schedule**:
- **Phase 1**: Verify React Query and Zod are fully implemented (definition of done)
- **Phase 2**: Verify API contract formalization is complete
- **Phase 3**: Baseline risk assessment before editor work begins
- **Phase 4**: Critical checkpoint - verify classic UX anchors pass visual parity check (pixel-diff or side-by-side comparison)
- **Phase 5**: Verify conflict resolution modal is functional and cross-edit testing passes
- **Phase 6**: Verify export chunking works correctly for large chapters
- **Phase 7**: Final risk assessment before production deployment

---

### High Risk
1. **Editor/Docs Mismatch & Round-Tripping**
   - Risk: Plain text editor integration and Google Docs round-tripping may have edge cases, format mismatches, or conflicts
   - **Mitigation Strategies**:
     - **Lock down formatting scope for v1**: TipTap configured for plain text only (no rich formatting) - Document, Paragraph, Text, HardBreak, History extensions only
     - **Test cross-edits early**: Test by opening a Doc in Google Docs while Yarny is idle, making edits, then returning to Yarny to verify conflict detection works correctly
     - **Conflict modal in Phase 5**: Ensure conflict resolution modal is implemented in Phase 5 (not later) to catch issues early
     - **Round-trip testing**: Test editing in Yarny → saving → editing in Google Docs → switching snippets in Yarny → verify no format loss
     - **Google Docs newline semantics**: Google Docs API normalizes carriage returns (`\r\n` → `\n`) and may collapse trailing spaces. Test with mixed `\n`/`\r\n`, non-breaking spaces (NBSPs), and trailing spaces. Normalize text extraction to match Docs' behavior.
     - **IME composition handling**: Japanese/Chinese/Korean IME composition fires change events differently. Respect `compositionstart`/`compositionend` events to prevent premature word count updates and save debouncing during composition.
   - Contingency: Allow extra 5-10 hours for editor edge cases, round-trip testing, and conflict resolution refinement

2. **State Churn Causing Re-renders**
   - Risk: React re-renders may be slower than vanilla JS, especially with frequent state updates during typing
   - **Mitigation Strategies**:
     - **Normalized store + memoized selectors**: All entities keyed by id in Zustand store; use memoized selectors to derive views (prevents unnecessary re-renders when unrelated entities change)
     - **Treat editor viewport as "pure" component**: Editor component should only subscribe to the active snippet's slice of state, not the entire state tree
     - **Memoize list rows**: Use `React.memo` for expensive list components (GroupRow, SnippetRow) with custom comparison functions
     - **Memoize callbacks**: Use `useCallback` for event handlers passed to child components to prevent re-render cascades
   - Contingency: Profile with React DevTools, add additional memoization if needed

3. **State Management Migration**
   - Risk: Complex state object with many interdependencies
   - Mitigation: Use Zustand for simpler migration path than Redux, normalize state structure from the start
   - Contingency: Incremental migration, test thoroughly

4. **Performance with Large Stories**
   - Risk: React re-renders may be slower than vanilla JS
   - Mitigation: Use React.memo, useMemo, useCallback strategically, virtualize long lists when needed
   - Contingency: Profile and optimize as needed

### Medium Risk
1. **Cross-Tab Yarny Conflicts**
   - Risk: Two Yarny tabs editing the same snippet simultaneously can cause data loss or conflicts
   - **Mitigation Strategies**:
     - **Cross-tab detection**: Use `BroadcastChannel` API or `localStorage` heartbeat to detect when multiple Yarny tabs are open
     - **Read-only mode for inactive tabs**: When a snippet is being edited in one tab, mark it as read-only in other tabs with a visual indicator (lock icon, disabled state)
     - **Immediate warning/lock**: When a snippet is opened in Tab 2 while Tab 1 is editing, Tab 2 immediately shows warning/lock (not just after attempting to edit)
     - **Tab coordination**: Broadcast snippet edit state across tabs; inactive tabs show "Editing in another tab" message
     - **Storage heartbeat**: Each tab broadcasts its active snippet ID and timestamp; tabs detect conflicts and coordinate access
     - **Tab timeout**: Lock is released if editing tab becomes inactive (no heartbeat for 3+ seconds)
   - Implementation: Add `src/hooks/useCrossTabCoordination.ts` hook using BroadcastChannel API with warning/lock UI
   - Contingency: Fall back to localStorage events if BroadcastChannel is unavailable
   - Status: Medium risk - requires careful coordination but prevents data loss

2. **Google Drive API Integration**
   - Risk: React hooks may need different error handling
   - Mitigation: Backend already works, just needs React wrapper
   - Status: Low risk, mostly wrapping existing code

3. **Feature Parity**
   - Risk: Missing features during migration
   - Mitigation: Create feature checklist, test each feature
   - Contingency: Keep old code until new version is complete

4. **Design Drift with MUI**
   - Risk: MUI's default styling may cause visual drift from existing brand design
   - **Mitigation Strategies**:
     - **Start theme with palette tokens and gradient from Phase 1**: Create `src/theme/theme.ts` with all 12-color accent palette and gradient tokens mapped to MUI's theme system from the very start
     - **Brand as source of truth**: Existing 12-color categorical accent system and gradient aesthetic are the design foundation - MUI components will be customized to match this palette, not the other way around
     - **Theme provider in app root**: Set up ThemeProvider in Phase 1 so all components inherit the brand feel from day one
     - **Customize component defaults early**: Match MUI component defaults (Dialog, Button, Menu, Tabs, etc.) to existing design in Phase 1, before building components
   - Contingency: Can adjust theme customization incrementally, but starting early prevents drift

5. **CSS/Styling Migration**
   - Risk: Styling may break during migration
   - Mitigation: Use CSS modules or styled-components for isolation, start with brand palette in MUI theme from Phase 1
   - Contingency: Can reuse existing CSS with minor updates

### Low Risk
1. **Build Configuration**
   - Risk: Netlify build may need adjustments
   - Mitigation: Netlify has good React support, standard config
   - Status: Well-documented, low risk

2. **Third-Party Library Issues**
   - Risk: Libraries may have bugs or incompatibilities
   - Mitigation: Use well-maintained, popular libraries
   - Status: All recommended libraries are stable

---

## Benefits of Migration

### Development Benefits
1. **Reduced Code**: ~3,300-4,200 lines replaced by libraries
2. **Better Maintainability**: React's component model is easier to maintain
3. **Type Safety**: TypeScript provides compile-time error checking and better IDE support
4. **Developer Experience**: Hot reload, better tooling, autocomplete, refactoring support
5. **Easier Testing**: React Testing Library makes testing easier, TypeScript catches errors before runtime
6. **Better Documentation**: TypeScript types serve as inline documentation
7. **Safer Refactoring**: TypeScript ensures changes don't break existing code

### User Benefits
1. **Better Accessibility**: Material UI components are fully accessible
2. **Improved Performance**: React optimizations (memoization, etc.)
3. **Better UX**: Polished interactions from proven libraries
4. **Future Features**: Easier to add new features in React

### Business Benefits
1. **Faster Development**: Future features will be faster to build
2. **Easier Hiring**: More developers know React than vanilla JS
3. **Ecosystem**: Access to React ecosystem of tools and libraries
4. **Long-term Maintainability**: React is a stable, long-term choice

---

## Netlify Configuration

### Current Setup
- ✅ Netlify Functions already configured
- ✅ Build settings in `netlify.toml`
- ✅ Redirects configured
- ✅ Existing app served from `public/` directory

### Deployment Strategy: Parallel Paths

The React app will be deployed to `/react` path while keeping the existing app at root:

```
yarny.lindsaybrunner.com/          → Existing vanilla JS app (public/)
yarny.lindsaybrunner.com/react/*   → New React app (dist/)
```

### Required Changes

#### Option 1: Separate Build Directory (Recommended)

Create a new `netlify-react.toml` for React app deployment:

```toml
# netlify-react.toml (for React app at /react path)

[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "20"

# Serve React app at /react path
[[redirects]]
  from = "/react/*"
  to = "/react/index.html"
  status = 200

# Ensure React app assets are accessible
[[redirects]]
  from = "/react/assets/*"
  to = "/react/assets/:splat"
  status = 200
```

#### Option 2: Combined Configuration

Update existing `netlify.toml` to handle both:

```toml
[build]
  command = "npm run build"
  publish = "dist"  # React app builds to dist/

[build.environment]
  NODE_VERSION = "20"

# Serve existing app at root (from public/ directory)
# Note: This requires keeping public/ as static files
# or using a different build process

# Serve React app at /react path
[[redirects]]
  from = "/react/*"
  to = "/react/index.html"
  status = 200

# Existing app routes (unchanged)
[[redirects]]
  from = "/editor.html"
  to = "/editor.html"
  status = 200

[[redirects]]
  from = "/stories.html"
  to = "/stories.html"
  status = 200

# Catch-all for React Router (only for /react path)
[[redirects]]
  from = "/react/*"
  to = "/react/index.html"
  status = 200
```

#### Vite Configuration for Base Path

Update `vite.config.ts` to set base path (TypeScript configuration):

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/react/',  // Important: Set base path for /react deployment
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  resolve: {
    alias: {
      '@': '/src',  // TypeScript path alias for cleaner imports
    },
  },
})
```

#### TypeScript Configuration

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

#### React Router Configuration

Update React Router to work with `/react` base path (TypeScript):

```typescript
// In your router setup (App.tsx)
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LoginPage } from './components/auth/LoginPage';
import { StoriesPage } from './components/stories/StoriesPage';
import { EditorPage } from './components/editor/EditorPage';

export function App(): JSX.Element {
  return (
    <BrowserRouter basename="/react">
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/stories" element={<StoriesPage />} />
        <Route path="/editor" element={<EditorPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### Build Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "netlify:dev": "netlify dev"
  }
}
```

---

## File Structure (Proposed)

```
yarny-app/
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   └── AuthProvider.tsx
│   │   ├── editor/
│   │   │   ├── Editor.tsx
│   │   │   ├── StorySidebar.tsx
│   │   │   ├── NotesSidebar.tsx
│   │   │   ├── TipTapEditor.tsx        # Plain text only configuration
│   │   │   ├── GoalMeter.tsx           # Left-rail goal meter (preserved UX anchor)
│   │   │   ├── TodayChip.tsx           # "Today • N" chip (preserved UX anchor)
│   │   │   └── ...
│   │   ├── stories/
│   │   │   ├── StoriesList.tsx
│   │   │   ├── StoryCard.tsx
│   │   │   └── ...
│   │   ├── ui/
│   │   │   ├── Modal.tsx
│   │   │   ├── ColorPicker.tsx
│   │   │   ├── ContextMenu.tsx
│   │   │   └── ...
│   │   └── shared/
│   │       ├── Header.tsx
│   │       └── Footer.tsx               # Footer with word/character counts (preserved UX anchor)
│   ├── hooks/
│   │   ├── useDriveQueries.ts              # React Query hooks for ALL Drive I/O
│   │   ├── useConflictDetection.ts         # Conflict detection between Yarny and Drive
│   │   ├── useWindowFocusReconciliation.ts # Reconciliation on window focus
│   │   ├── useAuth.ts
│   │   ├── useStory.ts
│   │   ├── useGoal.ts
│   │   └── ...
│   ├── lib/
│   │   └── react-query.ts        # React Query QueryClient configuration
│   ├── theme/
│   │   └── theme.ts               # MUI theme customization with brand color mappings
│   ├── utils/
│   │   ├── wordCount.ts
│   │   ├── export.ts
│   │   ├── goalCalculation.ts
│   │   ├── textExtraction.ts     # Plain text extraction matching Google Docs format
│   │   └── ...
│   ├── store/
│   │   ├── store.ts (Zustand)
│   │   ├── types.ts (Normalized state types)
│   │   └── selectors.ts (Selectors for derived views - see example below)
│   │       # Example: useGroupsList() derives array from normalized groups Record
│   │       # Convention: "derive, don't duplicate" - views computed via selectors, not stored in state
│   ├── api/
│   │   ├── contract.ts      # API contract definitions (types + Zod schemas)
│   │   ├── client.ts        # Typed API client functions
│   │   └── types.ts         # Shared API types (if needed)
│   ├── App.tsx
│   ├── main.tsx
│   └── routes.tsx
├── public/
│   └── (static assets)
├── netlify/
│   └── functions/ (unchanged)
├── package.json
├── vite.config.ts
├── tsconfig.json
└── netlify.toml
```

---

## Decision Points

### State Management: Context API vs Zustand vs Redux

**Recommendation: Zustand**
- ✅ Simpler than Redux, more powerful than Context
- ✅ Easy migration from global state object
- ✅ Good TypeScript support
- ✅ Small bundle size
- **Alternative**: Context API (if team prefers built-in solution)
- **Trigger for change**: If Zustand's API becomes too limiting for complex state updates or if React Context performance becomes acceptable for our use case

### Text Editor: TipTap vs Slate vs Draft.js

**Recommendation: TipTap (Plain Text Only)**
- ✅ Modern, React-first
- ✅ Excellent documentation
- ✅ Active development
- ✅ Good performance
- ✅ **Configured for plain text only** - matches Yarny's minimalist model and Google Docs round-tripping requirements
- **Alternative**: Slate (if need more customization, but plain text constraint still applies)
- **Trigger for change**: If TipTap's plain text extraction diverges from Google Docs API format and cannot be normalized, or if TipTap introduces breaking changes that conflict with our plain text constraint

### Build Tool: Vite vs Create React App vs Webpack

**Recommendation: Vite**
- ✅ Fastest development experience
- ✅ Modern, simple configuration
- ✅ Great TypeScript support
- ✅ Smaller bundle sizes
- **Alternative**: CRA (if team prefers familiarity)
- **Trigger for change**: If Vite's build output has compatibility issues with Netlify deployment or if Vite's plugin ecosystem becomes insufficient for our needs

### TypeScript: Required

**Decision: TypeScript from the start** ✅
- ✅ Better developer experience with autocomplete and IntelliSense
- ✅ Catch errors at compile-time, not runtime
- ✅ Better IDE support (refactoring, navigation, find references)
- ✅ Type safety prevents common bugs
- ✅ Self-documenting code through types
- ✅ Easier to maintain and refactor large codebases
- ✅ All recommended libraries have excellent TypeScript support
- ✅ TypeScript is now the industry standard for React projects
- **Trigger for change**: None - TypeScript is a hard requirement for this migration

---

## Success Criteria

### Must Have (MVP)
- [ ] All existing features work
- [ ] No regression in functionality
- [ ] **Performance budgets met**:
  - [ ] Time-to-first-keystroke after editor mount ≤ 800 ms
  - [ ] Snippet switch to interactive ≤ 300 ms (medium corpus, hot path)
  - [ ] Background load never blocks typing (no jank > 16 ms frames)
  - [ ] Budgets met on medium corpus; virtualization kicks in automatically for large corpus
- [ ] Authentication works
- [ ] Google Drive sync works
- [ ] Editor saves correctly
- [ ] Export functionality works
- [ ] **Classic UX anchors preserved**: Goal meter, Today chip, footer word/character counts look and behave identically
- [ ] **Phase 1 Definition of Done**: TanStack Query (React Query) fully configured and used for ALL Drive I/O operations
- [ ] **Phase 1 Definition of Done**: API contract formalization with Zod schemas and runtime validation implemented
- [ ] **Visual parity**: Side-by-side `/react` vs. root checks pass for: goal meter, Today chip, footer counts, story cards, and modal spacing. Document "diff" screenshots as artifacts.
- [ ] **Concurrency safety**: Conflicts surfaced for Docs edits and second Yarny tabs; no silent last-writer-wins. (Verified in test checklist.)
- [ ] **Round-trip integrity**: Paragraphs and soft line breaks round-trip without collapse/duplication; rich-text paste is stripped, special characters preserved.
- [ ] **Bundle discipline**: Starter-kit removed; only the TipTap extensions actually used are shipped (Document, Paragraph, Text, HardBreak, History).

### Should Have
- [ ] **Accessibility polish beyond MUI defaults**:
  - [ ] Minimum contrast ratios: 4.5:1 for text, 3:1 for UI chrome (tested against soft chips and dark surfaces)
  - [ ] Visible focus rings on all actionable items (especially left rail and modal footers)
  - [ ] Keyboard-only flows for reordering lists (dnd-kit keyboard navigation intentionally wired)
  - [ ] **Keyboard-only completion of core tasks**: Create/rename/reorder/export operations completable via keyboard only
  - [ ] **Contrast checks on every chip color**: All 12 accent colors (base, soft, dark variants) meet contrast requirements
- [ ] Improved error handling
- [ ] Better loading states
- [ ] Complete TypeScript type coverage (all components, hooks, utilities)
- [ ] Type-safe API calls and state management
- [ ] **Editor truth and Google Docs round-tripping: plain text only, editor authoritative while open, reconciliation on focus**
- [ ] **Configurable virtualization thresholds**: Virtualization thresholds (50+ chapters, 200+ snippets) exposed as settings for tuning without redeployment
- [ ] **Chunked export writes**: Large chapter exports handle batchUpdate body limits with chunked writes
- [ ] **Order persistence**: Order (groupIds/snippetIds) is persisted in Drive metadata as first-class field, survives concurrent edits and background loads

### Nice to Have
- [ ] Performance improvements
- [ ] Better mobile experience
- [ ] Additional features enabled by React
- [ ] Advanced TypeScript features (discriminated unions, branded types)
- [ ] TypeScript strict mode enabled
- [ ] Generated API types from OpenAPI/Swagger (if applicable)

---

## Next Steps

1. **Review & Approve Plan** - Get stakeholder buy-in
2. **Set Up Development Environment** - Install dependencies, configure build
3. **Configure Netlify for Parallel Deployment** - Set up `/react` path routing
4. **Create Proof of Concept** - Migrate one small component to validate approach
5. **Deploy to `/react` Path** - Test deployment and routing
6. **Begin Phase 1** - Set up infrastructure
7. **Iterate** - Follow migration phases

### Testing Strategy with Parallel Deployment

- **Development**: Test React app locally at `localhost:5173/react`
- **Staging**: Deploy React app to `yarny.lindsaybrunner.com/react`
- **Comparison**: Side-by-side testing with existing app
- **User Testing**: Invite users to test React version at `/react` path
- **Migration**: Once validated, can switch root to React app or keep both

---

## Notes & Considerations

### Keeping Old Code
- Keep existing `public/` files until migration is complete
- Deploy React app to `/react` path for parallel testing
- Existing app remains at root (`yarny.lindsaybrunner.com`)
- Can run both versions side-by-side during migration
- Switch over when new version is feature-complete
- Option to keep both versions permanently or gradually migrate users

### Testing Strategy
- Manual testing for each feature
- Test with real Google Drive data
- Test edge cases (large stories, many snippets, etc.)
- Cross-browser testing (Chrome, Firefox, Safari, Edge)

### Test Strategy Specific to Drive/Docs (P2 Priority)

**Why**: Google Drive and Google Docs integration is critical to Yarny's functionality. Round-tripping between Yarny's editor and Google Docs can introduce subtle bugs that only appear with real Drive data. A structured test corpus ensures regressions are obvious and all critical paths are validated.

**What**: Create a dedicated test corpus in a separate Google Drive folder with three project sizes (small, medium, large) and document smoke tests that validate all Drive/Docs operations.

#### 1. Test Corpus Setup

Create a dedicated Google Drive folder: **`Yarny Test Corpus`** (separate from production `Yarny Stories` folder)

**Small Project** (`test-small`):
- 1 story
- 3 chapters
- 5 snippets per chapter (15 total snippets)
- 2 People, 2 Places, 2 Things notes
- ~5,000 words total
- **Special test snippets**:
  - One snippet with mixed line endings (`\n`, `\r\n`, `\r`)
  - One snippet with NBSPs and trailing spaces
  - One snippet with CJK text (Japanese, Chinese, Korean)
  - One snippet with emoji and Unicode characters
  - One snippet with long-press accents (é, è, ê, ë, ñ, ü, etc.)
  - One snippet with RTL text (Arabic/Hebrew mixed with English) - tests caret movement, word counting, paste stripping
- **Purpose**: Fast smoke tests, basic operations, format normalization, IME composition, RTL handling

**Medium Project** (`test-medium`):
- 1 story
- 10 chapters
- 8 snippets per chapter (80 total snippets)
- 10 People, 10 Places, 10 Things notes
- ~25,000 words total
- **Purpose**: Realistic project size, performance testing

**Large Project** (`test-large`):
- 1 story
- 25 chapters
- 15 snippets per chapter (375 total snippets)
- **1 very large chapter**: 1 chapter with 50+ snippets (tests export chunking and batchUpdate body limits)
- 25 People, 25 Places, 25 Things notes
- ~100,000 words total
- **Purpose**: Stress testing, virtualization validation, lazy loading, export chunking validation

**Test Corpus Structure**:
```
Yarny Test Corpus/
├── test-small/
│   ├── Chapters/
│   │   ├── Chapter 1/
│   │   │   ├── snippet-1.json (metadata)
│   │   │   └── snippet-1.gdoc (Google Doc)
│   │   ├── Chapter 2/
│   │   └── Chapter 3/
│   ├── People/
│   ├── Places/
│   ├── Things/
│   ├── story.json
│   └── goal.json
├── test-medium/
│   └── (same structure, more content)
└── test-large/
    └── (same structure, much more content)
```

#### 2. Smoke Tests

Document and execute these smoke tests for each project size to validate critical paths:

**A. Create Operations**
- [ ] Create new story → Verify folder structure in Drive
- [ ] Create new chapter → Verify chapter folder created
- [ ] Create new snippet → Verify Google Doc created in correct chapter folder
- [ ] Create People/Places/Things note → Verify text file created in correct folder
- [ ] Create story with goal → Verify `goal.json` created and loaded correctly

**B. Rename Operations**
- [ ] Rename story → Verify folder renamed in Drive, story list updates
- [ ] Rename chapter → Verify chapter folder renamed, metadata updated
- [ ] Rename snippet → Verify Google Doc renamed, metadata updated
- [ ] Rename People/Places/Things note → Verify file renamed, metadata updated

**C. Reorder Operations**
- [ ] Reorder chapters (drag & drop) → Verify order persisted in Drive, UI reflects order
- [ ] Reorder snippets within chapter → Verify order persisted in Drive, UI reflects order
- [ ] Reorder across chapters → Verify snippets moved to correct chapter folders

**D. Edit Operations**
- [ ] Edit snippet content → Verify changes saved to Google Doc
- [ ] Edit snippet title/description → Verify metadata updated in Drive
- [ ] Edit chapter title/description → Verify metadata updated in Drive
- [ ] Edit story title/genre/description → Verify metadata updated in Drive
- [ ] Edit goal settings → Verify `goal.json` updated and loaded correctly
- [ ] Edit People/Places/Things note → Verify text file updated

**E. Export Operations**
- [ ] Export all chapters → Verify combined Google Doc created with all snippets in order
- [ ] Export outline → Verify outline document created with titles and descriptions
- [ ] Export all People → Verify combined document created
- [ ] Export all Places → Verify combined document created
- [ ] Export all Things → Verify combined document created
- [ ] Verify export filenames match user input
- [ ] Verify exports appear in story folder in Drive
- [ ] **Export very large chapter (50+ snippets)**: 
  - [ ] Verify export handles batchUpdate body limits correctly
  - [ ] Verify chunked writes are used when chapter exceeds batchUpdate size limit
  - [ ] Verify all snippets are included in export (no truncation)
  - [ ] Verify export completes successfully without errors
  - [ ] Verify export order is preserved across chunks
  - [ ] Verify progress indication during chunked export
- [ ] **Export All at scale (large story: 25+ chapters, 200+ snippets)**:
  - [ ] Verify server-side batching is used (Netlify Function handles batching)
  - [ ] Verify progress toast appears with Drive links as exports complete
  - [ ] Verify no client-side rate limit errors occur
  - [ ] Verify all exports complete successfully
  - [ ] Verify order is preserved across all exports

**F. Conflict Resolution (Concurrency Safety)**
- [ ] Edit snippet in Yarny → Edit same snippet in Google Docs (other tab) → Switch snippets → Verify conflict detected (no silent last-writer-wins)
- [ ] Edit snippet in Google Docs → Focus Yarny window → Verify reconciliation notification appears (conflict surfaced, not silently overwritten)
- [ ] Resolve conflict: Keep Yarny version → Verify Yarny version overwrites Drive
- [ ] Resolve conflict: Use Drive version → Verify Drive version replaces Yarny content
- [ ] Edit snippet in Yarny → Add comments in Google Docs → Save in Yarny → Verify comments warning appears
- [ ] Edit snippet in Yarny → Add tracked changes in Google Docs → Save in Yarny → Verify tracked changes warning appears
- [ ] **Second Yarny tab conflict**: Open snippet in Tab 1 → Edit same snippet in Tab 2 → Verify conflict surfaced (warning/lock shown, no silent overwrite)
- [ ] **Concurrent edits**: Make edits in Tab 1 and Tab 2 simultaneously → Verify both tabs surface conflict, no silent last-writer-wins

**G. Round-Trip Testing (Round-Trip Integrity)**
- [ ] Edit snippet in Yarny → Save → Edit in Google Docs → Switch snippets → Verify no format loss
- [ ] Edit snippet in Google Docs → Load in Yarny → Verify content matches (plain text only)
- [ ] **Rich-text paste stripping**: Paste rich text in Yarny → Verify stripped to plain text (no formatting preserved)
- [ ] **Paragraph breaks**: Test paragraph breaks (`\n\n`) → Verify preserved in round-trip without collapse or duplication
- [ ] **Soft line breaks**: Test soft line breaks (`\n`) → Verify preserved in round-trip without collapse or duplication
- [ ] **Special characters**: Test special characters (quotes, em dashes, etc.) → Verify preserved in round-trip
- [ ] **Format/Line Break Tests**: Paste content with mixed `\n`/`\r\n` line endings → Round-trip through Docs → Verify normalized correctly
- [ ] **NBSP and Trailing Spaces**: Paste content with non-breaking spaces (NBSP) and trailing spaces → Round-trip through Docs → Verify normalized correctly (NBSP → space, trailing spaces may be collapsed)
- [ ] **Mixed Line Endings**: Test content with `\n`, `\r\n`, and `\r` → Round-trip → Verify all normalized to `\n`
- [ ] **No collapse/duplication**: Test content with multiple paragraph breaks → Round-trip → Verify no collapse (single `\n\n` doesn't become `\n`) and no duplication (double `\n\n` doesn't become `\n\n\n\n`)

**H. Performance & Loading**
- [ ] Load large project (test-large) → Verify initial load time acceptable (< 5 seconds)
- [ ] **Time-to-first-edit (hot path)**: Open snippet already in cache → Start typing → Verify latency ≤300 ms from click to first character appearing
- [ ] **Time-to-first-edit (cold path)**: Open snippet not yet loaded → Start typing → Verify latency ≤1.5 s from click to first character appearing (includes Drive fetch)
- [ ] **Time-to-switch-snippet (hot path)**: Switch to snippet already in cache → Verify latency ≤300 ms from click to editor ready
- [ ] **Time-to-switch-snippet (cold path)**: Switch to snippet not yet loaded → Verify latency ≤1.5 s from click to editor ready (includes Drive fetch)
- [ ] Scroll through chapter list in large project → Verify smooth scrolling (virtualized)
- [ ] Background loading → Verify non-active snippets load in background without blocking UI
- [ ] Lazy loading → Verify snippet content only loads when needed

**J. IME Composition & Internationalization**
- [ ] Type in Japanese (IME composition) → Verify word count updates only after `compositionend` event
- [ ] Type in Chinese (IME composition) → Verify save debouncing respects `compositionstart`/`compositionend`
- [ ] Type in Korean (IME composition) → Verify no premature updates during composition
- [ ] **Long-press accents**: Type character with long-press accent menu (e.g., hold 'e' for é, è, ê, ë) → Verify word count and save behavior correct, no premature updates during accent selection
- [ ] **Emoji composition**: Type emoji via Unicode composition (e.g., :smile: → 😊) → Verify word count and save behavior correct
- [ ] **Emoji picker**: Insert emoji via OS emoji picker → Verify word count and save behavior correct
- [ ] Test CJK text in test corpus → Verify round-trip preserves content correctly
- [ ] Test emoji in test corpus → Verify round-trip preserves content correctly
- [ ] Test long-press accents in test corpus → Verify round-trip preserves content correctly (é, è, ê, ë, ñ, etc.)

**K. Cross-Tab Conflicts (Yarny vs. Yarny)**
- [ ] Open Yarny in two tabs → Edit same snippet in Tab 1 → Verify Tab 2 shows "Editing in another tab" warning message
- [ ] Edit snippet in Tab 1 → Try to edit in Tab 2 → Verify Tab 2 is read-only with visual indicator (lock icon or disabled state)
- [ ] Open same snippet in Tab 2 while Tab 1 is editing → Verify Tab 2 immediately shows warning/lock (not just after attempting to edit)
- [ ] Save in Tab 1 → Switch to Tab 2 → Verify Tab 2 updates with latest content automatically
- [ ] Close Tab 1 → Verify Tab 2 regains edit capability and warning/lock is removed
- [ ] Test BroadcastChannel fallback → Verify localStorage heartbeat works if BroadcastChannel unavailable
- [ ] Test tab timeout → Verify lock is released if Tab 1 becomes inactive (no heartbeat for 3+ seconds)
- [ ] Test multiple tabs → Open 3+ tabs, edit snippet in Tab 1 → Verify all other tabs show warning/lock

**I. Error Handling & Rate Limiting**
- [ ] Network error during save → Verify error message displayed, retry works
- [ ] Invalid Drive permissions → Verify clear error message
- [ ] **Drive API rate limit (429)**: 
  - [ ] Trigger rate limit (rapid requests) → Verify exponential backoff with jitter is applied
  - [ ] Verify retry happens only when tab is visible (background tabs don't retry)
  - [ ] Verify error message displayed to user with clear explanation
  - [ ] Verify automatic retry after backoff delay completes
  - [ ] Verify no infinite retry loops (max 3 retries)
- [ ] Corrupted metadata file → Verify error handling, recovery option

**L. Visibility-Based Request Gating**
- [ ] Open Yarny in multiple tabs → Verify only visible tab makes background prefetch requests
- [ ] Switch between tabs → Verify background prefetching pauses in hidden tab, resumes in visible tab
- [ ] Verify no request storms when tab is in background (prevents Drive quota exhaustion)
- [ ] Verify mutations (save, delete, rename) also respect visibility gating

#### 3. Linking to Success Criteria

Map smoke tests to success criteria to ensure regressions are obvious:

| Success Criterion | Smoke Tests | Test Corpus |
|------------------|-------------|-------------|
| **Google Drive sync works** | Create, Edit, Rename, Reorder (all) | Small, Medium, Large |
| **Editor saves correctly** | Edit Operations (all) | Small, Medium, Large |
| **Export functionality works** | Export Operations (all) | Small, Medium |
| **Conflict resolution works** | Conflict Resolution (all) | Small, Medium |
| **Round-tripping works** | Round-Trip Testing (all) | Small, Medium |
| **Performance is equal or better** | Performance & Loading (all) | Large (especially) |
| **No regression in functionality** | All smoke tests | All sizes |

#### 4. Test Execution Plan

**Phase 1 (Setup & Infrastructure)**:
- Create test corpus folder structure
- Populate small project with sample data
- Document smoke test checklist

**Phase 4 (Editor - Tri-Pane Shell & Plain Text Round-Trip)**:
- Run smoke tests on small project after TipTap integration
- Validate round-tripping with small project
- Populate medium project

**Phase 6 (Lazy Loading, Conflict Resolution & Exports)**:
- Run full smoke test suite on small and medium projects
- Validate all operations work correctly
- Populate large project

**Phase 7 (Accessibility, Performance & Polish)**:
- Run full smoke test suite on all three project sizes
- Performance testing with large project
- Regression testing before production deployment

#### 5. Test Corpus Maintenance

- **Version Control**: Document test corpus structure and expected state
- **Reset Script**: Create script to reset test corpus to known good state
- **Validation**: Periodically verify test corpus integrity (files exist, metadata correct)
- **Updates**: Update test corpus when new features are added (e.g., new export types)

#### 6. Benefits

1. **Obvious Regressions**: Test corpus provides baseline for comparison - if something breaks, it's immediately obvious
2. **Comprehensive Coverage**: Smoke tests ensure all critical paths are validated
3. **Performance Validation**: Large project validates performance optimizations (virtualization, lazy loading)
4. **Round-Trip Confidence**: Structured tests ensure Google Docs integration works correctly
5. **Documentation**: Test corpus serves as living documentation of expected behavior

#### Implementation Timeline

This should be implemented in **Phase 1** (Setup & Infrastructure):
- Create test corpus folder structure
- Populate small project
- Document smoke test checklist
- Integrate smoke tests into Phase 4, 6, and 7 testing workflow

**LOE**: 4-6 hours (includes creating test corpus structure, populating small/medium projects, documenting smoke tests, and setting up test execution workflow)

### Performance Considerations
- Use React.memo for expensive components
- Lazy load routes with React.lazy
- Optimize re-renders with useMemo/useCallback
- Consider virtual scrolling for long lists

### Performance Guardrails for Big Projects (P2 Priority)

**Why**: Large stories with many chapters and snippets can cause performance issues. The vanilla app already handles this with lazy loading; we need to carry forward these optimizations and add React-specific performance patterns.

**What**: Implement three key performance optimizations to ensure the React app performs well with large projects:

#### 1. Virtualize Long Lists in the Left Rail

**Problem**: When stories grow to 50+ chapters or 200+ snippets, rendering all list items at once causes:
- Slow initial render
- Laggy scrolling
- High memory usage
- Poor performance on lower-end devices

**Solution**: Use `@tanstack/react-virtual` (or similar) to virtualize the left rail lists with **configurable thresholds**.

**Implementation**:
- Virtualize the chapter/group list in the left sidebar
- Virtualize the snippet list within each chapter
- Only render visible items + small buffer (e.g., 5 items above/below viewport)
- Works seamlessly with normalized state structure (already planned)
- **Expose virtualization thresholds as configurable settings** (stored in localStorage) so they can be tuned without redeploying

**Configuration**:
Create `src/config/virtualization.ts` with configurable thresholds:

```typescript
// src/config/virtualization.ts
const DEFAULT_CHAPTER_THRESHOLD = 50;
const DEFAULT_SNIPPET_THRESHOLD = 200;

interface VirtualizationConfig {
  chapterThreshold: number; // Enable virtualization when chapters >= this number
  snippetThreshold: number; // Enable virtualization when snippets >= this number
}

const STORAGE_KEY = 'yarny-virtualization-config';

export function getVirtualizationConfig(): VirtualizationConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        chapterThreshold: parsed.chapterThreshold ?? DEFAULT_CHAPTER_THRESHOLD,
        snippetThreshold: parsed.snippetThreshold ?? DEFAULT_SNIPPET_THRESHOLD,
      };
    }
  } catch (err) {
    console.warn('Failed to load virtualization config from localStorage', err);
  }
  
  return {
    chapterThreshold: DEFAULT_CHAPTER_THRESHOLD,
    snippetThreshold: DEFAULT_SNIPPET_THRESHOLD,
  };
}

export function setVirtualizationConfig(config: Partial<VirtualizationConfig>): void {
  try {
    const current = getVirtualizationConfig();
    const updated = { ...current, ...config };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to save virtualization config to localStorage', err);
  }
}

export function shouldVirtualizeChapters(chapterCount: number): boolean {
  const config = getVirtualizationConfig();
  return chapterCount >= config.chapterThreshold;
}

export function shouldVirtualizeSnippets(snippetCount: number): boolean {
  const config = getVirtualizationConfig();
  return snippetCount >= config.snippetThreshold;
}
```

**Code Example**:
```typescript
// src/components/editor/StorySidebar.tsx
import { useVirtualizer } from '@tanstack/react-virtual';
import { useGroupsList } from '../../store/selectors';
import { shouldVirtualizeChapters } from '../../config/virtualization';

export function StorySidebar() {
  const groups = useGroupsList();
  const parentRef = useRef<HTMLDivElement>(null);
  
  // Check if virtualization should be enabled (configurable threshold)
  const shouldVirtualize = shouldVirtualizeChapters(groups.length);
  
  const virtualizer = useVirtualizer({
    count: groups.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60, // Estimated row height
    overscan: 5, // Render 5 extra items above/below viewport
    enabled: shouldVirtualize, // Only enable if threshold is met
  });
  
  // If virtualization is disabled, render normally
  if (!shouldVirtualize) {
    return (
      <div style={{ height: '100%', overflow: 'auto' }}>
        {groups.map((group) => (
          <GroupRow key={group.id} group={group} />
        ))}
      </div>
    );
  }
  
  // Virtualized rendering
  return (
    <div ref={parentRef} style={{ height: '100%', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const group = groups[virtualRow.index];
          return (
            <div
              key={group.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <GroupRow group={group} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**When to Implement**: 
- Phase 4 (Editor - Tri-Pane Shell) or Phase 5 (Library Features & Goals UI)
- Add when testing with large stories (50+ chapters, 200+ snippets)
- Can be deferred if initial performance is acceptable, but should be in place before production

**LOE**: 4-6 hours (includes virtualizing both chapter and snippet lists, testing with large datasets)

#### 2. Memoize Expensive List Rows and Editor Shell

**Problem**: Passing anonymous callbacks and inline objects causes unnecessary re-renders:
- List rows re-render when parent re-renders (even if their data hasn't changed)
- Editor shell re-renders on every state update
- Anonymous callbacks create new function references on every render
- Deep prop drilling causes cascading re-renders

**Solution**: Use `React.memo`, `useMemo`, and `useCallback` strategically to prevent unnecessary re-renders.

**Implementation Strategy**:

**A. Memoize List Row Components**:
```typescript
// src/components/editor/GroupRow.tsx
import React, { memo } from 'react';
import { Group } from '../../store/types';

interface GroupRowProps {
  group: Group;
  onSelect: (groupId: string) => void;
  onRename: (groupId: string, newTitle: string) => void;
  isActive: boolean;
  isCollapsed: boolean;
}

// Memoize the row component - only re-renders if props change
export const GroupRow = memo(function GroupRow({
  group,
  onSelect,
  onRename,
  isActive,
  isCollapsed,
}: GroupRowProps) {
  // Component implementation
}, (prevProps, nextProps) => {
  // Custom comparison function for better control
  return (
    prevProps.group.id === nextProps.group.id &&
    prevProps.group.title === nextProps.group.title &&
    prevProps.group.snippetIds.length === nextProps.group.snippetIds.length &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.isCollapsed === nextProps.isCollapsed
  );
});
```

**B. Memoize Editor Shell**:
```typescript
// src/components/editor/Editor.tsx
import React, { memo, useCallback, useMemo } from 'react';
import { useStore } from '../../store/store';

export const Editor = memo(function Editor({ storyId }: { storyId: string }) {
  const activeSnippetId = useStore((state) => state.project.activeSnippetId);
  const snippet = useStore((state) => 
    activeSnippetId ? state.snippets[activeSnippetId] : null
  );
  
  // Memoize callbacks to prevent child re-renders
  const handleSave = useCallback((content: string) => {
    // Save logic
  }, []);
  
  const handleSnippetChange = useCallback((snippetId: string) => {
    // Change snippet logic
  }, []);
  
  // Memoize expensive computations
  const wordCount = useMemo(() => {
    return snippet ? countWords(snippet.body) : 0;
  }, [snippet?.body]);
  
  return (
    <div className="editor-shell">
      {/* Editor content */}
    </div>
  );
});
```

**C. Avoid Anonymous Callbacks in Deep Trees**:
```typescript
// ❌ DON'T DO THIS - creates new function on every render
<GroupRow 
  group={group}
  onSelect={(id) => handleSelect(id)}  // Anonymous callback
  onClick={() => handleClick(group.id)} // Anonymous callback
/>

// ✅ DO THIS - memoized callback
const handleSelect = useCallback((id: string) => {
  // Selection logic
}, []);

const handleGroupClick = useCallback((groupId: string) => {
  handleClick(groupId);
}, [handleClick]);

<GroupRow 
  group={group}
  onSelect={handleSelect}  // Stable reference
  onClick={() => handleGroupClick(group.id)} // Still anonymous, but acceptable if group.id is stable
/>

// ✅ EVEN BETTER - pass groupId directly
const handleGroupClick = useCallback((groupId: string) => {
  handleClick(groupId);
}, [handleClick]);

<GroupRow 
  group={group}
  onSelect={handleSelect}
  onClick={handleGroupClick}  // Stable reference, groupId passed via closure
  groupId={group.id}  // Or pass as prop if needed
/>
```

**When to Implement**: 
- Phase 4 (Editor - Tri-Pane Shell) - implement memoization from the start
- Review and optimize during Phase 7 (Accessibility, Performance & Polish)

**LOE**: 3-4 hours (includes memoizing list rows, editor shell, and reviewing callback patterns)

#### 3. Defer Non-Active Snippet Loads

**Problem**: Loading all snippet content at once causes:
- Slow initial load
- High memory usage
- Unnecessary network requests
- Poor UX for large stories

**Current Vanilla App Behavior**: 
- Loads active snippet immediately
- Background loads remaining snippets with throttling
- Uses `_contentLoaded` flag to track loaded state

**Solution**: Carry forward this pattern using React Query's prefetching and lazy loading capabilities.

**Implementation**:
- Use React Query's `useQuery` with `enabled: false` for non-active snippets
- Prefetch snippets in background using `prefetchQuery` (already planned in React Query section)
- Only load snippet content when:
  - Snippet becomes active (user clicks on it)
  - Snippet is scrolled into view (for virtualized lists)
  - Background prefetching (throttled, batched)

**Code Example**:
```typescript
// src/hooks/useSnippetContent.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useStore } from '../store/store';
import { useDriveFile } from './useDriveQueries';

export function useSnippetContent(snippetId: string | null, loadImmediately = false) {
  const snippet = useStore((state) => 
    snippetId ? state.snippets[snippetId] : null
  );
  const activeSnippetId = useStore((state) => state.project.activeSnippetId);
  
  // Only load if:
  // 1. Load immediately (active snippet)
  // 2. Content already loaded (cached)
  // 3. Explicitly requested
  const shouldLoad = loadImmediately || 
                     snippet?._contentLoaded || 
                     snippetId === activeSnippetId;
  
  const { data, isLoading } = useDriveFile(
    shouldLoad && snippet?.driveFileId ? snippet.driveFileId : null
  );
  
  return {
    content: data?.content || snippet?.body || '',
    isLoading: !snippet?._contentLoaded && isLoading,
    isLoaded: !!snippet?._contentLoaded,
  };
}

// Background prefetching (throttled)
export function usePrefetchSnippets(snippetIds: string[], batchSize = 5, delay = 500) {
  const queryClient = useQueryClient();
  const snippets = useStore((state) => state.snippets);
  
  useEffect(() => {
    // Only prefetch snippets that haven't been loaded
    const unloadedSnippets = snippetIds.filter(
      (id) => !snippets[id]?._contentLoaded
    );
    
    // Prefetch in batches with delay
    unloadedSnippets.forEach((snippetId, index) => {
      const snippet = snippets[snippetId];
      if (!snippet?.driveFileId) return;
      
      setTimeout(() => {
        queryClient.prefetchQuery({
          queryKey: driveKeys.file(snippet.driveFileId),
          queryFn: () => readDriveFile({ fileId: snippet.driveFileId! }),
          staleTime: 5 * 60 * 1000,
        });
      }, Math.floor(index / batchSize) * delay);
    });
  }, [snippetIds, snippets, queryClient]);
}
```

**When to Implement**: 
- Phase 1 (Setup & Infrastructure) - React Query setup already includes this
- Phase 6 (Lazy Loading, Conflict Resolution & Exports) - integrate with editor component

**LOE**: Already included in React Query setup (Phase 1) and lazy loading (Phase 6)

#### Summary

| Optimization | Priority | Phase | LOE | Status |
|-------------|----------|-------|-----|--------|
| Virtualize long lists | P2 | Phase 4 or 5 | 4-6 hrs | Deferred until needed |
| Memoize list rows & editor | P2 | Phase 4 | 3-4 hrs | Implement from start |
| Defer non-active loads | P2 | Phase 1 & 6 | Included | Already planned |

**Total Additional LOE**: 7-10 hours (virtualization + memoization)

**Benefits**:
1. **Scalability**: App performs well with 100+ chapters and 500+ snippets
2. **Better UX**: Faster initial load, smoother scrolling
3. **Lower Memory**: Only render visible items, load content on demand
4. **Future-Proof**: Normalized state + virtualization enables even larger projects

### Accessibility
- All Material UI components are accessible by default
- Test with screen readers
- Ensure keyboard navigation works
- Check color contrast

---

## Questions to Resolve

- [x] TypeScript from start or add later? ✅ **TypeScript from the start**
- [ ] State management choice (Zustand vs Context)? **Recommendation: Zustand**
- [x] Should we keep old code as reference? ✅ **Yes - parallel deployment at /react**
- [ ] Timeline constraints?
- [ ] Team size and availability?
- [ ] Testing requirements?
- [ ] When to migrate users from root to /react? (or keep both?)
- [ ] How to handle shared Netlify Functions? (should work for both)
- [ ] TypeScript strict mode level? (recommend: strict)
- [ ] ESLint + TypeScript ESLint configuration preferences?

---

## Resources

### Documentation
- [TipTap Documentation](https://tiptap.dev/)
- [Material UI Documentation](https://mui.com/)
- [@dnd-kit Documentation](https://docs.dndkit.com/)
- [React Router Documentation](https://reactrouter.com/)
- [Zustand Documentation](https://github.com/pmndrs/zustand)

### Migration Guides
- [React Migration Guide](https://react.dev/learn/start-a-new-react-project)
- [Vite Migration Guide](https://vitejs.dev/guide/)

---

## Additional Technical Details

### State Structure

The current global `state` object will be converted to **normalized** TypeScript interfaces. All entities are keyed by id, and selectors derive views:

```typescript
// src/store/types.ts
export interface Group {
  id: string;
  title: string;
  description?: string;
  color: string;
  snippetIds: string[]; // References to snippet ids
  position?: number;
}

export interface Snippet {
  id: string;
  title: string;
  body: string;
  description?: string;
  groupId?: string; // Reference to group id
  kind?: 'person' | 'place' | 'thing';
  color?: string;
  words: number;
  chars: number;
  driveFileId?: string;
  updatedAt?: string;
  lastKnownDriveModifiedTime?: string;
  _contentLoaded?: boolean;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  description?: string;
  kind: 'person' | 'place' | 'thing';
  color?: string;
  words: number;
  chars: number;
  driveFileId?: string;
  updatedAt?: string;
}

export interface Story {
  id: string;
  title: string;
  description?: string;
  genre?: string;
  driveFolderId: string;
  goalId?: string; // Reference to goal id
  createdAt: string;
  updatedAt: string;
}

export interface Goal {
  id: string;
  target: number | null;
  deadline: string | null;
  mode: 'elastic' | 'strict';
  writingDays: number[];
  daysOff: string[];
}

export interface Project {
  storyId: string | null;
  groupIds: string[]; // Ordered list of group ids
  snippetIds: string[]; // Ordered list of snippet ids
  activeSnippetId: string | null;
  activeRightTab: 'people' | 'places' | 'things';
  filters: {
    search: string;
  };
}

// Normalized state structure - all entities keyed by id
export interface AppState {
  // Normalized entities - keyed by id
  stories: Record<string, Story>;
  groups: Record<string, Group>;
  snippets: Record<string, Snippet>;
  notes: Record<string, Note>; // People, Places, Things
  goals: Record<string, Goal>;
  
  // Denormalized views - derived via selectors (see src/store/selectors.ts)
  project: Project;
  
  // Drive state
  drive: {
    storyFolderId: string | null;
  };
  
  // UI state
  collapsedGroups: Set<string>;
  editing: {
    savingState: 'idle' | 'saving' | 'saved';
    lastSavedAt: string | null;
  };
}
```

**Note**: Views (e.g., left-rail lists) are derived using selectors in `src/store/selectors.ts`, not stored directly in state. This keeps renders cheap and enables virtualized lists later.

**Example Selector Pattern** (from `src/store/selectors.ts`):
```typescript
// src/store/selectors.ts
// Convention: "derive, don't duplicate" - views computed via selectors, not stored in state

import { useStore } from './store';
import { useMemo } from 'react';

// Get groups as array (for left-rail list) - MEMOIZED
export function useGroupsList() {
  const groupIds = useStore((state) => state.project.groupIds);
  const groups = useStore((state) => state.groups);
  
  return useMemo(() => {
    return groupIds
      .map((id) => groups[id])
      .filter(Boolean); // Filter out any missing groups
  }, [groupIds, groups]);
}
```

This pattern ensures:
- **Single source of truth**: Groups exist once in `state.groups` Record
- **Cheap renders**: Only re-renders when `groupIds` or `groups` change, not on unrelated updates
- **Memoization**: Prevents unnecessary recalculations

### Key Algorithms
1. **Word Counting**: Custom function handling various text formats
2. **Goal Calculation**: Complex date/word math for daily targets
3. **Conflict Detection**: Compares local vs Drive modified times
4. **Lazy Loading**: Loads active snippet first, then batches remaining
5. **Midnight Rollover**: Detects day changes and recalculates goals

### Performance Optimizations
- Throttled updates during background loading
- Lazy content loading (only load when snippet is active)
- Batch background loading with delays
- Preserved order from saved data (no unnecessary sorting)
- Word count caching in snippet objects

### Browser Compatibility
- Current: Works in modern browsers (Chrome, Firefox, Safari, Edge)
- React: Same browser support expected
- Mobile: Currently shows warning, not fully supported

---

## Changelog

- **2025-01-XX**: Addressed feedback on offline semantics, timezone/DST, persisted ordering, RTL handling, memory budget, unload safety, and observability
  - **Offline & Flaky-Network Semantics Enhanced**: Updated offline banner message to "Working offline — changes queued"; added "Saved locally at X:XX" variant for queued saves; added read-only toggle only if reconciliation fails on reconnect; tied all UX to React Query's retry/backoff and cache staleness
  - **Timezone/DST for "Goals that Think"**: Added new section specifying daily rollover uses user's IANA timezone (`Intl.DateTimeFormat().resolvedOptions().timeZone`); added DST boundary testing (spring forward/fall back); added timezone-aware date calculations; added smoke tests for timezone handling
  - **Persisted Ordering as First-Class Metadata**: Enhanced order persistence section to make mechanism explicit (Drive file appProperties or structure.json file); documented atomic updates and concurrent load safety; added implementation details for both approaches
  - **Right-to-Left (RTL) & Mixed-Script Paste**: Added new section for RTL handling; added RTL test snippet (Arabic/Hebrew mixed with English) to test corpus; added smoke tests for RTL caret movement, word counting, and paste stripping
  - **Memory Budget & Long Sessions**: Added new section for memory guard; implemented LRU eviction for cached snippet bodies (cap to N most-recent); added active snippet protection (never evict active snippet); added configurable memory budget via localStorage
  - **Unload Safety**: Added new section defining rules for window/tab close during saves; queued saves allow close without prompt; active saves prompt user; tied to "Saved/Saving" indicator for predictability; added mutation queue persistence to localStorage
  - **Observability Light**: Added new section for privacy-respecting metrics (save latency, conflict hits, retry counts); debug flag enabled (opt-in); local-only storage (never sent to server); added debug panel for metrics summary
  - Updated test corpus to include RTL test snippet
  - Updated smoke tests to include timezone/DST, RTL, memory budget, unload safety, and observability tests
  - Updated Phase 4 to include RTL handling (1-2 hours)
  - Updated Phase 5 to include timezone/DST handling (2-3 hours)
  - Updated Phase 6 to include memory budget and unload safety (4-6 hours total)
  - Updated Phase 7 to include observability (2-3 hours)
  - **Total Additional LOE**: 9-14 hours for all new gotchas

- **2025-01-XX**: Added explicit success criteria for visual parity, concurrency safety, round-trip integrity, performance, accessibility, and bundle discipline
  - **Visual parity**: Added side-by-side `/react` vs. root checks for goal meter, Today chip, footer counts, story cards, and modal spacing with "diff" screenshots as artifacts
  - **Concurrency safety**: Added requirement that conflicts are surfaced for Docs edits and second Yarny tabs (no silent last-writer-wins), verified in test checklist
  - **Round-trip integrity**: Added requirement that paragraphs and soft line breaks round-trip without collapse/duplication, rich-text paste is stripped, special characters preserved
  - **Performance**: Added requirement that budgets are met on medium corpus and virtualization kicks in automatically for large corpus
  - **Accessibility**: Added keyboard-only completion of core tasks (create/rename/reorder/export) and contrast checks on every chip color
  - **Bundle discipline**: Added requirement that starter-kit is removed and only TipTap extensions actually used are shipped
  - Updated Phase 7 to include visual parity validation with diff screenshots, bundle size validation, and expanded accessibility checks
  - Updated smoke tests to include concurrency safety verification (no silent last-writer-wins)
  - Updated round-trip tests to explicitly verify no collapse/duplication of paragraph and soft line breaks
  - Updated LOE estimate for Phase 7 (25-38 hours, up from 22-35 hours)

- **2025-01-XX**: Addressed feedback on TipTap dependencies, cross-tab conflicts, IME composition, and offline semantics
  - **TipTap Dependency Consistency**: Added explicit note excluding `@tiptap/starter-kit` from dependencies to avoid accidental imports and extra bundle weight (individual extensions only)
  - **Cross-Tab Yarny Conflicts**: Enhanced cross-tab coordination hook with immediate warning/lock UI when snippet is opened in another tab; added comprehensive smoke tests for cross-tab scenarios (warning/lock, tab timeout, multiple tabs)
  - **IME/Composition Edge Cases**: Added explicit test coverage for long-press accents (é, è, ê, ë, ñ, etc.), emoji composition, and emoji picker to test corpus and smoke tests; expanded IME composition tests beyond CJK
  - **Offline/Spotty-Network Semantics**: Added new section defining UX for network states (queued saves, read-only mode, offline banners, "Saved at..." indicator behavior) tied to React Query's retry/backoff and cache staleness; added `useNetworkStatus` hook, `OfflineBanner` component, and comprehensive smoke tests for offline scenarios
  - Updated Phase 6 to include offline/spotty-network semantics implementation
  - Updated LOE estimates to reflect offline semantics work (Phase 6: 16-23 hours)

- **2025-01-XX**: Addressed feedback on performance budgets, decision point triggers, and selector examples
  - **Performance Budgets**: Added time-to-first-edit and time-to-switch-snippet budgets (≤300 ms hot path, ≤1.5 s cold path) to large project smoke tests to catch performance regressions early
  - **Decision Point Triggers**: Added one-liners to each decision point stating what would trigger a change (e.g., if TipTap plain text extraction diverges from Docs, consider Slate)
  - **Selector Examples**: Added concrete selector example near store definition in file structure and State Structure sections to model "derive, don't duplicate" convention for discoverability

- **2025-01-XX**: Addressed feedback on Drive quota, virtualization, focus rings, and export chunking
  - **Drive Quota & Request Storms**: Added visibility-based gating to React Query (only refetch/prefetch when tab is visible), exponential backoff with jitter for rate limit (429) responses, explicit "Drive rate limit" test with behavior validation
  - **Virtualization Threshold**: Made virtualization thresholds (50+ chapters, 200+ snippets) configurable via localStorage settings, allowing tuning without redeployment
  - **MUI Focus Rings**: Added accessible focus ring customization to theme (visible against dark cards and pale chips), added "accessible focus rings" to success criteria
  - **Export Request Size**: Added "very large chapter" (50+ snippets) to large test corpus, added chunked write logic for exports exceeding batchUpdate body limits, added chunked export tests to smoke test checklist
  - Updated React Query setup to include visibility gating and rate limit handling
  - Updated export functionality section to include chunking logic and progress indication
  - Updated test corpus section to include very large chapter for export validation
  - Updated Phase 6 to include chunked export implementation and testing

- **2025-01-XX**: Added new gotchas and edge cases
  - **Google Docs Newline Semantics**: Added normalization for mixed `\n`/`\r\n` line endings, NBSPs, and trailing spaces in text extraction utilities
  - **IME Composition Handling**: Added `compositionstart`/`compositionend` event handling in TipTap editor to prevent premature word count updates and save debouncing during CJK/emoji input
  - **Cross-Tab Conflict Detection**: Added `useCrossTabCoordination` hook using BroadcastChannel API (with localStorage fallback) to detect and prevent simultaneous editing of same snippet in multiple Yarny tabs
  - **Enhanced Test Corpus**: Added special test snippets for format normalization (mixed line endings, NBSPs, trailing spaces) and IME composition (CJK text, emoji)
  - **Expanded Smoke Tests**: Added format/line break tests, IME composition tests, and cross-tab conflict tests to smoke test checklist
  - Updated text extraction utilities to match Google Docs normalization behavior
  - Updated TipTap editor to handle IME composition events
  - Updated LOE estimates to include new edge case handling (12-18 hours for editor truth section)

- **2025-01-XX**: Addressed risk mitigation feedback
  - **Risk Factors Section Enhanced**:
    - Added detailed mitigation strategies for Editor/Docs mismatch risk: lock down formatting scope for v1, test cross-edits, ensure conflict modal is in Phase 5 (not later)
    - Added detailed mitigation strategies for State churn causing re-renders: normalized store + memoized selectors, treat editor viewport as "pure" component
    - Added Design drift with MUI risk: start theme with palette tokens and gradient from Phase 1
  - **Conflict Modal Moved to Phase 5**: Moved conflict resolution modal from Phase 6 to Phase 5 to catch Editor/Docs mismatch issues early
  - **MUI Theming Strategy Enhanced**: Emphasized starting with ALL palette tokens and gradient from Phase 1, before building any components
  - **State Normalization Enhanced**: Added memoized selectors and pure editor component pattern to prevent state churn
  - **Testing Strategy Enhanced**: Added cross-edit testing (open Doc in Google Docs while Yarny is idle) to catch conflict detection issues early
  - Updated Phase 5 LOE to 25-35 hours (includes conflict resolution modal)
  - Updated Phase 6 LOE to 12-17 hours (conflict resolution removed)

- **2025-01-XX**: Reorganized migration phases based on priority feedback
  - **Phase 1** (unchanged): Setup + typed store skeleton + data-fetch layer baseline
  - **Phase 2**: Moved API contract formalization here; added router setup; auth + router + typed API contract
  - **Phase 3**: Added virtualization stub capability (set up infrastructure even if not used yet)
  - **Phase 4**: Reordered priorities - footer counts and save status first; tri-pane editor shell; TipTap constrained to plain text round-trip
  - **Phase 5**: Library features (drag/drop, dialogs, tabs), Goals UI (chip + panel) at parity with alpha plan, **conflict resolution modal (moved from Phase 6 to catch Editor/Docs mismatch issues early)**
  - **Phase 6**: Lazy loading, exports (conflict resolution moved to Phase 5)
  - **Phase 7**: Accessibility pass, performance touches, and polish
  - Updated all phase references throughout document (test strategy, performance guardrails, conflict detection timeline)
  - Updated LOE estimates to reflect phase reorganization

- **2025-01-XX**: Added "Test Strategy Specific to Drive/Docs" section (P2 Priority)
  - Created test corpus structure with three project sizes (small, medium, large) in separate Drive folder
  - Documented comprehensive smoke tests for all Drive/Docs operations (create, rename, reorder, edit, export, conflict resolution)
  - Linked smoke tests to success criteria to ensure regressions are obvious
  - Added test execution plan integrated into migration phases
  - Updated Phase 1 to include test corpus setup
  - Updated Phase 4 to include smoke test execution on small project
  - Updated Phase 6 to include smoke test execution on small and medium projects
  - Updated Phase 7 to include full smoke test suite execution on all project sizes
  - Added test corpus maintenance guidelines
  - **Total LOE**: 4-6 hours for test corpus setup and documentation

- **2025-01-XX**: Added "Preserve Classic UX Anchors" section (P1/P2 Priority)
  - Documented preservation requirements for left-rail goal meter and "Today • N" chip
  - Documented preservation requirements for footer word/character counts
  - Documented version slider affordance as historical core feature (investigation needed, documented for future restoration)
  - Added implementation strategy for preserving these elements
  - Updated Phase 4 to include classic UX anchor implementation
  - Updated Success Criteria to include preservation requirements
  - Updated file structure to show preserved component locations
  - Added visual parity testing requirements
  - **Total LOE**: 9-14 hours for preservation work

- **2025-01-XX**: Initial plan created
  - Added implementation details section
  - Added modal list (8 total)
  - Added color system details
  - Added export types breakdown
  - Added goal system features
  - Added code statistics
  - Added technical details section
  - **Added parallel deployment strategy**: React app at `/react` path, existing app at root
  - Added Netlify configuration for `/react` path deployment
  - Added Vite and React Router base path configuration
  - Added testing strategy for parallel deployment
  - **Updated to require TypeScript**: Changed from optional to required
  - Added TypeScript configuration examples
  - Updated file structure to show all `.tsx` and `.ts` files
  - Added TypeScript type definitions for state structure
  - Updated LOE estimates to include TypeScript setup time
  - Updated decision points to make TypeScript mandatory
  - **Added API Contract Formalization section (P1 Priority)**: 
    - Defined centralized API contract module with Zod schemas
    - Created typed API client wrapper with runtime validation
    - Documented all endpoints to be covered (auth, Drive, status)
    - Added example implementation code
    - Updated Phase 1 to include API contract setup
    - Added `zod` to dependencies
    - Updated file structure to show API contract files
    - Added API contract formalization to success criteria
  - **Added Fetch/Caching Layer with TanStack Query section (P1 Priority)**:
    - Adopted TanStack Query (React Query) as the fetch/caching layer for ALL Drive I/O
    - Replaced ad-hoc useEffect hooks with React Query hooks
    - Documented all Drive operations that must use React Query (read, write, list, delete, rename, check comments, create folder, etc.)
    - Added React Query setup and configuration
    - Created `useDriveQueries.ts` hook structure with examples
    - Updated lazy loading to use React Query prefetching and `useQueries`
    - Added `@tanstack/react-query` to dependencies
    - Updated Phase 1 to include React Query setup
    - Updated Phase 6 to use React Query for lazy loading
    - Added React Query to success criteria
    - **Key change**: ALL Drive I/O operations now use React Query, not just background loads
  - **Added Editor Truth and Google Docs Round-Tripping section (P1 Priority)**:
    - Constrained TipTap to plain text only (no rich formatting) to match Yarny's minimalist model
    - Established editor as authoritative while Yarny is open
    - Added reconciliation on window focus to detect external changes
    - Brought conflict detection forward to Phase 1/2 (early in migration)
    - Created text extraction utilities matching Google Docs API format
    - Updated TipTap configuration to use only Document, Paragraph, Text, HardBreak, History extensions
    - Added conflict detection and reconciliation hooks
    - Updated Phase 1 to include TipTap plain text configuration and early conflict detection
    - Updated Phase 2 to include reconciliation on window focus
    - Updated Phase 4 to integrate TipTap with conflict detection and test round-tripping
    - Added TipTap extension dependencies (individual extensions only - starter-kit explicitly excluded to prevent accidental import drift)
    - Added editor truth and round-tripping to success criteria
  - **Added State Normalization section (P1 Priority)**:
    - Normalize all entities (stories, groups, snippets, notes, tags, goals) keyed by id in Zustand store
    - Use selectors to derive views (e.g., left-rail lists) instead of storing nested objects
    - Keeps renders cheap and enables virtualized lists later
    - Updated state structure to show normalized form with entity references
    - Created selectors examples for derived views
    - Updated Phase 1 to include state normalization setup
    - Updated file structure to include `selectors.ts`
    - Updated State Management Architecture section to explicitly call out normalization
  - **Added Performance Guardrails for Big Projects section (P2 Priority)**:
    - Virtualize long lists in the left rail using `@tanstack/react-virtual` when stories grow large (50+ chapters, 200+ snippets)
    - Memoize expensive list rows and editor shell using `React.memo`, `useMemo`, and `useCallback`
    - Avoid passing anonymous callbacks into deep trees to prevent unnecessary re-renders
    - Defer non-active snippet loads using React Query's prefetching (carries forward vanilla app's lazy loading pattern)
    - Added code examples for virtualization, memoization, and lazy loading
    - Added `@tanstack/react-virtual` to dependencies
    - Updated Performance Considerations section with detailed implementation strategies
    - Total additional LOE: 7-10 hours (virtualization + memoization)
  - **Added Phase 8: Test Automation (Week 5-6)**:
    - Comprehensive test automation strategy using Playwright (E2E), React Testing Library (component), and MSW (API mocking)
    - Categorized testing workbook tests: 60-70% fully automatable, 20-25% partially automatable, 10-15% requires human testing
    - Detailed implementation plan covering infrastructure setup, component tests, integration tests, E2E tests, visual regression tests, performance tests, test data management, and CI/CD integration
    - Test coverage goals: 80%+ component tests, 90%+ integration tests, 70%+ E2E tests, 100% visual regression for classic UX anchors
    - Mock strategy for Google Drive API and Google Sign-In using MSW
    - Total LOE: 64-97 hours (8-12 days)
    - Enables continuous regression testing and reduces manual testing burden by 60-70%
- Document all major decisions and changes here

---

## Contact & Support

For questions or updates to this plan, please document changes here and update the changelog.

