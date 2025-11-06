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
    "@tiptap/starter-kit": "^2.x",
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

#### 1. MUI Theme Customization

Create `src/theme/theme.ts` that maps the brand palette to MUI's theme:

```typescript
import { createTheme } from '@mui/material/styles';

// Import the 12-color palette from the Color System section
const brandColors = {
  primary: '#10B981', // Emerald (matches existing primary)
  primaryLight: '#D1FAE5',
  primaryDark: '#059669',
  // ... all 12 accent colors with their variants
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
  },
  // Customize component defaults to match brand
  components: {
    MuiDialog: {
      styleOverrides: {
        paper: {
          // Match existing modal styling
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          // Match existing button styling
        },
      },
    },
    // ... customize all MUI components used
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

#### 2. Selectors for Derived Views

Create selectors to derive views from normalized state:

```typescript
// src/store/selectors.ts
import { useStore } from './store';

// Get groups as array (for left-rail list)
export function useGroupsList() {
  return useStore((state) => {
    const { project, groups } = state;
    return project.groupIds
      .map((id) => groups[id])
      .filter(Boolean); // Filter out any missing groups
  });
}

// Get snippets for a specific group
export function useGroupSnippets(groupId: string) {
  return useStore((state) => {
    const group = state.groups[groupId];
    if (!group) return [];
    return group.snippetIds
      .map((id) => state.snippets[id])
      .filter(Boolean);
  });
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

#### 3. Benefits of Normalization

1. **Cheap Renders**: Components only re-render when their specific entities change, not when unrelated entities update
2. **Virtualized Lists**: Normalized structure makes it easy to implement virtual scrolling for long lists later
3. **Single Source of Truth**: Each entity exists once in the store, eliminating duplication
4. **Efficient Updates**: Updating a single entity doesn't require re-rendering entire lists
5. **Type Safety**: TypeScript ensures we access entities correctly via selectors

#### 4. Migration from Current Structure

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
- **Complexity**: Medium
- **Lines**: ~200-300 lines
- **Details**: 
  - Exports to Google Docs format
  - Supports 5 export types (chapters, outline, people, places, things)
  - Optional snippet name inclusion
  - User-provided filenames

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

Create `src/lib/react-query.ts` to configure React Query:

```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh for 5 min
      gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache for 10 min (formerly cacheTime)
      retry: 3, // Retry failed requests 3 times
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
      refetchOnWindowFocus: false, // Don't refetch on window focus (Drive data doesn't change that often)
      refetchOnReconnect: true, // Refetch when network reconnects
    },
    mutations: {
      retry: 1, // Retry mutations once on failure
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

#### 3. Prefetching for Lazy Loading

For background loading of snippet content, use React Query's prefetching:

```typescript
// In Editor component or hook
import { queryClient } from '../lib/react-query';
import { driveKeys } from '../hooks/useDriveQueries';

// Prefetch snippet content in background
function prefetchSnippetContent(fileId: string) {
  queryClient.prefetchQuery({
    queryKey: driveKeys.file(fileId),
    queryFn: () => readDriveFile({ fileId }),
    staleTime: 5 * 60 * 1000,
  });
}

// Prefetch multiple snippets in background (throttled)
function prefetchSnippetsBatch(fileIds: string[], batchSize = 5, delay = 500) {
  fileIds.forEach((fileId, index) => {
    setTimeout(() => {
      prefetchSnippetContent(fileId);
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

#### 4. Early Conflict Detection

**Decision**: Bring conflict detection forward to **Phase 1/2** (early in migration), not wait until Phase 6.

**Why**:
- Conflict detection is foundational - affects how editor works
- Need to test round-tripping early
- Better to catch issues during migration than after

**Implementation**:
- Implement conflict detection hooks in Phase 1/2
- Use React Query to check file metadata
- Compare timestamps and content
- Show conflict resolution modal (reuse existing UI patterns)

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
import { useCallback } from 'react';

interface TipTapEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export function TipTapEditor({ content, onChange, placeholder }: TipTapEditorProps) {
  // Extract plain text from TipTap editor state
  const extractPlainText = useCallback((editor: any): string => {
    // TipTap's getText() returns plain text with line breaks
    // Paragraph breaks are represented as \n\n
    // Soft line breaks (Shift+Enter) are represented as \n
    return editor.getText({ blockSeparator: '\n\n' });
  }, []);

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
    onUpdate: ({ editor }) => {
      // Extract plain text and notify parent
      const plainText = extractPlainText(editor);
      onChange(plainText);
    },
    editorProps: {
      attributes: {
        class: 'tiptap-editor',
        'data-placeholder': placeholder || 'Start writing...',
      },
    },
  });

  // Update editor content when prop changes (but not on every render)
  React.useEffect(() => {
    if (editor && content !== extractPlainText(editor)) {
      // Only update if content actually changed (prevents loops)
      editor.commands.setContent(content || '');
    }
  }, [content, editor, extractPlainText]);

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

#### 4. Conflict Detection Hook

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
 * - No other formatting
 */
export function extractPlainText(editor: any): string {
  // TipTap's getText() with blockSeparator handles this correctly
  let text = editor.getText({ blockSeparator: '\n\n' });
  
  // Normalize line endings (CRLF -> LF, CR -> LF)
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Clean up excessive newlines (more than 2 consecutive)
  text = text.replace(/\n{3,}/g, '\n\n');
  
  // Remove leading/trailing whitespace
  text = text.trim();
  
  return text;
}

/**
 * Compare two plain text strings, accounting for whitespace differences.
 */
export function comparePlainText(text1: string, text2: string): boolean {
  // Normalize both texts
  const normalize = (t: string) => t.trim().replace(/\s+/g, ' ');
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
2. **Conflict Test**: Edit in Yarny → Edit in Google Docs → Switch snippets → Verify conflict detection
3. **Reconciliation Test**: Edit in Google Docs (other tab) → Focus Yarny window → Verify reconciliation
4. **Format Test**: Paste rich text → Verify it's stripped to plain text
5. **Line Break Test**: Test paragraph breaks (`\n\n`) and soft breaks (`\n`)

### Implementation Timeline

This should be implemented in **Phase 1/2** (early in migration):
- **Phase 1**: Set up TipTap with plain text configuration
- **Phase 2**: Implement conflict detection hooks
- **Phase 2**: Implement reconciliation on window focus
- **Phase 4**: Integrate TipTap editor with conflict detection
- **Phase 6**: Test and refine round-tripping

**LOE**: 8-12 hours (includes TipTap configuration, conflict detection, reconciliation, and testing)

### Dependencies

Already included in recommended stack:
- `@tiptap/react` - Editor framework
- `@tiptap/starter-kit` - Can use selectively (Document, Paragraph, Text, HardBreak, History only)

**Note**: Do NOT use full starter-kit - configure extensions individually to exclude formatting.

---

## Migration Phases

### Phase 1: Setup & Infrastructure (Week 1)
- [ ] Set up React + TypeScript + Vite build system
- [ ] Configure TypeScript (tsconfig.json)
- [ ] Set up type definitions for all libraries
- [ ] Configure React Router with TypeScript
- [ ] Set up Netlify build configuration
- [ ] Install and configure all libraries
- [ ] **Create API contract module (`src/api/contract.ts`) with Zod schemas**
- [ ] **Create typed API client (`src/api/client.ts`)**
- [ ] **Set up TanStack Query (React Query) with QueryClient and QueryClientProvider**
- [ ] **Create React Query hooks for ALL Drive I/O operations (`src/hooks/useDriveQueries.ts`)**
- [ ] **Configure TipTap for plain text only (no rich formatting)**
- [ ] **Create conflict detection hooks (`src/hooks/useConflictDetection.ts`)**
- [ ] **Create text extraction utilities matching Google Docs format**
- [ ] Create base component structure with TypeScript
- [ ] **Set up normalized state management (Zustand) with TypeScript types**
- [ ] **Create normalized state structure in `src/store/types.ts` (all entities keyed by id)**
- [ ] **Create selectors in `src/store/selectors.ts` to derive views (e.g., left-rail lists)**
- [ ] **Update all components to use selectors instead of direct state access**
- [ ] **Replace all ad-hoc Drive API calls with React Query hooks**
- [ ] **Set up MUI theme customization (`src/theme/theme.ts`) with brand color mappings**
- [ ] **Customize MUI component defaults to match existing design**
- [ ] **Set up ThemeProvider in app root**

**LOE**: 34-48 hours (includes TypeScript setup, type definitions, API contract formalization, React Query setup, TipTap plain text configuration, early conflict detection, state normalization, and MUI theming)

### Phase 2: Authentication (Week 1-2)
- [ ] Convert login page to React
- [ ] Integrate Google Sign-In SDK
- [ ] Create Auth context/provider
- [ ] Handle auth state and redirects
- [ ] **Implement reconciliation on window focus (`src/hooks/useWindowFocusReconciliation.ts`)**
- [ ] Test authentication flow

**LOE**: 8-12 hours (includes reconciliation hook implementation)

### Phase 3: Stories Page (Week 2)
- [ ] Convert stories list to React components
- [ ] Implement search/filtering
- [ ] Add modals (new story, delete confirmation)
- [ ] Integrate with Drive API hooks
- [ ] Test story management

**LOE**: 8-12 hours

### Phase 4: Editor - Core Structure (Week 2-3)
- [ ] Set up three-column layout (Story/Editor/Notes)
- [ ] Convert story list sidebar
- [ ] Convert notes sidebar with tabs
- [ ] **Set up TipTap editor with plain text configuration**
- [ ] **Integrate TipTap with conflict detection**
- [ ] **Implement editor as truth (authoritative while open)**
- [ ] Basic editor functionality
- [ ] **Test round-tripping with Google Docs**

**LOE**: 18-25 hours (includes TipTap integration, conflict detection integration, and round-trip testing)

### Phase 5: Editor - Advanced Features (Week 3-4)
- [ ] Implement drag & drop with @dnd-kit
- [ ] Color picker integration
- [ ] Context menus
- [ ] All modals (story info, rename, delete, etc.)
- [ ] Goal tracking UI
- [ ] Word count updates

**LOE**: 20-30 hours

### Phase 6: Editor - State & Sync (Week 4)
- [ ] Implement state management for groups/snippets
- [ ] Lazy loading logic using React Query prefetching and `useQueries`
- [ ] Auto-save functionality using React Query mutations
- [ ] Conflict resolution
- [ ] Export functionality

**LOE**: 15-20 hours (Note: Lazy loading is simplified with React Query's built-in prefetching)

### Phase 7: Testing & Polish (Week 4-5)
- [ ] Cross-browser testing
- [ ] Performance optimization
- [ ] Bug fixes
- [ ] Accessibility audit
- [ ] Mobile responsiveness check
- [ ] Documentation updates

**LOE**: 15-25 hours

---

## Risk Factors

### High Risk
1. **ContentEditable Complexity & Round-Tripping**
   - Risk: Plain text editor integration and Google Docs round-tripping may have edge cases
   - Mitigation: Use TipTap (proven library) configured for plain text only, test round-tripping early
   - Contingency: Allow extra 5-10 hours for editor edge cases and round-trip testing

2. **State Management Migration**
   - Risk: Complex state object with many interdependencies
   - Mitigation: Use Zustand for simpler migration path than Redux
   - Contingency: Incremental migration, test thoroughly

3. **Performance with Large Stories**
   - Risk: React re-renders may be slower than vanilla JS
   - Mitigation: Use React.memo, useMemo, useCallback strategically
   - Contingency: Profile and optimize as needed

### Medium Risk
1. **Google Drive API Integration**
   - Risk: React hooks may need different error handling
   - Mitigation: Backend already works, just needs React wrapper
   - Status: Low risk, mostly wrapping existing code

2. **Feature Parity**
   - Risk: Missing features during migration
   - Mitigation: Create feature checklist, test each feature
   - Contingency: Keep old code until new version is complete

3. **CSS/Styling Migration**
   - Risk: Styling may break during migration
   - Mitigation: Use CSS modules or styled-components for isolation
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
│   │       └── Footer.tsx
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
│   │   └── selectors.ts (Selectors for derived views)
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

### Text Editor: TipTap vs Slate vs Draft.js

**Recommendation: TipTap (Plain Text Only)**
- ✅ Modern, React-first
- ✅ Excellent documentation
- ✅ Active development
- ✅ Good performance
- ✅ **Configured for plain text only** - matches Yarny's minimalist model and Google Docs round-tripping requirements
- **Alternative**: Slate (if need more customization, but plain text constraint still applies)

### Build Tool: Vite vs Create React App vs Webpack

**Recommendation: Vite**
- ✅ Fastest development experience
- ✅ Modern, simple configuration
- ✅ Great TypeScript support
- ✅ Smaller bundle sizes
- **Alternative**: CRA (if team prefers familiarity)

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

---

## Success Criteria

### Must Have (MVP)
- [ ] All existing features work
- [ ] No regression in functionality
- [ ] Performance is equal or better
- [ ] Authentication works
- [ ] Google Drive sync works
- [ ] Editor saves correctly
- [ ] Export functionality works

### Should Have
- [ ] Better accessibility (ARIA attributes)
- [ ] Improved error handling
- [ ] Better loading states
- [ ] Complete TypeScript type coverage (all components, hooks, utilities)
- [ ] Type-safe API calls and state management
- [ ] **API contract formalization with runtime validation (Zod schemas)**
- [ ] **TanStack Query (React Query) for ALL Drive I/O operations with deduplication, retries, and stale-while-revalidate**
- [ ] **Editor truth and Google Docs round-tripping: plain text only, editor authoritative while open, reconciliation on focus**

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

**Solution**: Use `@tanstack/react-virtual` (or similar) to virtualize the left rail lists.

**Implementation**:
- Virtualize the chapter/group list in the left sidebar
- Virtualize the snippet list within each chapter
- Only render visible items + small buffer (e.g., 5 items above/below viewport)
- Works seamlessly with normalized state structure (already planned)

**Code Example**:
```typescript
// src/components/editor/StorySidebar.tsx
import { useVirtualizer } from '@tanstack/react-virtual';
import { useGroupsList } from '../../store/selectors';

export function StorySidebar() {
  const groups = useGroupsList();
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: groups.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60, // Estimated row height
    overscan: 5, // Render 5 extra items above/below viewport
  });
  
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
- Phase 4 (Editor - Core Structure) or Phase 5 (Editor - Advanced Features)
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
- Phase 4 (Editor - Core Structure) - implement memoization from the start
- Review and optimize during Phase 7 (Testing & Polish)

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
- Phase 6 (Editor - State & Sync) - integrate with editor component

**LOE**: Already included in React Query setup (Phase 1) and lazy loading (Phase 6)

#### Summary

| Optimization | Priority | Phase | LOE | Status |
|-------------|----------|-------|-----|--------|
| Virtualize long lists | P2 | Phase 4/5 | 4-6 hrs | Deferred until needed |
| Memoize list rows & editor | P2 | Phase 4 | 3-4 hrs | Implement from start |
| Defer non-active loads | P2 | Phase 1/6 | Included | Already planned |

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
    - Added TipTap extension dependencies (individual extensions, not full starter-kit)
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
- Document all major decisions and changes here

---

## Contact & Support

For questions or updates to this plan, please document changes here and update the changelog.

