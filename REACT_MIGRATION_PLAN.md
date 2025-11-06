# React + TypeScript Migration Plan - Yarny App

## Executive Summary

This document outlines the plan and effort estimation for converting the Yarny writing application from vanilla JavaScript to **React with TypeScript**, while maintaining the existing Netlify Functions backend.

**Key Finding**: Using third-party React libraries can reduce the Level of Effort (LOE) by **40-50%**, making the migration significantly more feasible.

**Technology Stack**: React 18 + TypeScript 5 + Vite

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
- ✅ Rich text editor (contentEditable)
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
| Rich Text Editor | ~1,500-2,000 | TipTap/Slate | ~1,500-2,000 lines | All contentEditable handling, text extraction, formatting logic |
| Modals (8 total) | ~500-800 | Radix UI Dialog | ~500-800 lines | Story Info, Export, Description Edit, Goal Panel, Rename, Delete, Conflict Resolution, Comments Warning |
| Drag & Drop | ~300-400 | @dnd-kit | ~300-400 lines | All drag event handlers, drop zones, reordering logic for chapters/snippets |
| Color Picker | ~150 | react-colorful | ~150 lines | Custom color picker UI, color selection logic, positioning |
| Tabs | ~100 | Radix UI Tabs | ~100 lines | People/Places/Things tab switching, tab state management |
| Context Menu | ~150 | Radix UI Context Menu | ~150 lines | Right-click menu for rename/delete, menu positioning |
| Dropdown Menus | ~100 | Radix UI Dropdown | ~100 lines | Export dropdown menu, positioning, open/close logic |
| Forms | ~200 | React Hook Form | ~200 lines | Form validation, form state, error handling for all modals |
| Date Picker | ~50 | react-datepicker | ~50 lines | Goal deadline date input, date validation |
| Tooltips | ~50 | Radix UI Tooltip | ~50 lines | All title attributes and custom tooltip implementations |
| Toast Notifications | ~100 | react-hot-toast | ~100 lines | Save status updates, error notifications, success messages |
| Collapsible/Accordion | ~100 | Radix UI Accordion | ~100 lines | Chapter collapse/expand functionality |
| **TOTAL** | **~3,300-4,200** | | **~3,300-4,200 lines** | **40-50% of codebase** |

### Detailed Component Mapping

#### 1. Rich Text Editor → TipTap
**Current Implementation:**
- `editor.js`: `getEditorTextContent()`, `setEditorTextContent()`, contentEditable event handlers
- Complex text extraction logic handling `<br>`, `<div>`, `<p>` tags
- Line break normalization
- Cursor position management
- Content synchronization with state

**Replacement:**
- TipTap provides all contentEditable functionality out of the box
- Built-in text extraction and formatting
- Type-safe editor API
- Extensible with plugins
- Handles all edge cases we currently manage manually

**Code Locations:**
- `editor.js` lines ~590-670 (text content extraction)
- `editor.js` lines ~669-738 (editor rendering and content management)
- All contentEditable event listeners throughout `editor.js`

#### 2. Modals → Radix UI Dialog
**Current Implementation:**
- 8 separate modal implementations with custom show/hide logic
- Modal overlay management
- Focus trapping
- Escape key handling
- Click-outside-to-close logic

**Replacement:**
- Radix UI Dialog component handles all modal behavior
- Accessible by default (ARIA, focus management)
- Keyboard navigation built-in
- Can style to match existing design

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

#### 5. Tabs → Radix UI Tabs
**Current Implementation:**
- Custom tab switching for People/Places/Things
- Tab state management
- Active tab styling

**Replacement:**
- Radix UI Tabs handles all tab functionality
- Accessible keyboard navigation
- Built-in active state management

**Code Locations:**
- `editor.html` lines 115-139 (tabs HTML)
- `editor.js` tab switching logic

#### 6. Context Menu → Radix UI Context Menu
**Current Implementation:**
- Right-click event handling
- Menu positioning
- Rename/Delete menu items

**Replacement:**
- Radix UI Context Menu provides full context menu functionality
- Accessible, keyboard navigable
- Proper positioning

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

#### 8. Date Picker → react-datepicker
**Current Implementation:**
- Native HTML5 date input
- Date validation
- Used in Goal Panel for deadline selection

**Replacement:**
- react-datepicker provides better UX
- Date range selection
- Customizable styling

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

#### 10. Collapsible/Accordion → Radix UI Accordion
**Current Implementation:**
- Custom collapse/expand for chapters
- Collapse state management (localStorage)
- Icon toggling (arrow up/down)

**Replacement:**
- Radix UI Accordion handles collapse functionality
- Accessible, keyboard navigable
- Built-in state management

**Code Locations:**
- `editor.js` lines 217-262 (collapse state management)
- `editor.js` lines 303-316 (collapse button rendering)
- `editor.js` lines 254-262 (`toggleGroupCollapse` function)

### Benefits of Using Third-Party Libraries

1. **Massive Code Reduction**: ~3,300-4,200 lines of custom code replaced by battle-tested libraries
2. **Accessibility Built-In**: All Radix UI components are fully accessible (ARIA, keyboard nav)
3. **Type Safety**: All recommended libraries have excellent TypeScript support
4. **Maintenance**: Libraries are maintained by teams, reducing our maintenance burden
5. **Performance**: Optimized libraries often perform better than custom implementations
6. **Documentation**: Well-documented libraries with examples and community support
7. **Bug Fixes**: Libraries fix edge cases we haven't encountered yet
8. **Future-Proof**: Libraries evolve with React ecosystem

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
    "@radix-ui/react-dialog": "^1.x",
    "@radix-ui/react-dropdown-menu": "^2.x",
    "@radix-ui/react-context-menu": "^2.x",
    "@radix-ui/react-tabs": "^1.x",
    "@radix-ui/react-tooltip": "^1.x",
    "@radix-ui/react-accordion": "^1.x",
    "@dnd-kit/core": "^6.x",
    "@dnd-kit/sortable": "^8.x",
    "@dnd-kit/utilities": "^3.x",
    "react-colorful": "^5.x",
    "react-hook-form": "^7.x",
    "react-datepicker": "^4.x",
    "react-hot-toast": "^2.x",
    "axios": "^1.x",
    "zustand": "^4.x"
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

#### Rich Text Editor: **TipTap** (Recommended)
- ✅ Modern, extensible, built for React
- ✅ **Excellent TypeScript support** - Full type definitions included
- ✅ Active community and maintenance
- ✅ Handles contentEditable complexity
- ✅ Type-safe editor extensions and commands
- ✅ Replaces ~1,500-2,000 lines of custom contentEditable code
- ✅ Handles all text extraction, formatting, and cursor management we currently do manually
- **Alternative**: Slate.js (more complex but powerful, also has TypeScript support)

#### UI Components: **Radix UI** (Recommended)
- ✅ Unstyled, accessible components - perfect for matching existing design
- ✅ Full keyboard navigation built-in
- ✅ ARIA attributes automatically handled
- ✅ Can match existing design system exactly
- ✅ **Full TypeScript support** - All components are typed
- ✅ Replaces ~1,000+ lines of modal, menu, tab, tooltip code
- ✅ Provides: Dialog (modals), Dropdown Menu, Context Menu, Tabs, Tooltip, Accordion
- **Alternative**: Headless UI (similar, different API, also TypeScript)

#### Drag & Drop: **@dnd-kit** (Recommended)
- ✅ Modern, performant library
- ✅ Better than react-beautiful-dnd (which is unmaintained)
- ✅ Supports sortable lists out of the box
- ✅ Touch device support for tablets
- ✅ Replaces ~300-400 lines of native drag event handling
- ✅ Handles all the drag/drop logic for chapters and snippets
- ✅ Better visual feedback and drop zone detection than native events

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
| Rich Text Editor (TipTap) | 15-25 | 25-35 hrs |
| UI Components (Radix UI) | 10-15 | 20-25 hrs |
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
- **12 Accent Colors** for chapter/snippet color coding:
  - Red (#EF4444), Orange (#F97316), Amber (#F59E0B), Yellow (#EAB308)
  - Lime (#84CC16), Emerald (#10B981), Teal (#14B8A6), Cyan (#06B6D4)
  - Blue (#3B82F6), Indigo (#6366F1), Violet (#8B5CF6), Fuchsia (#D946EF)

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

## What Needs Custom Implementation

These areas cannot be replaced with libraries and require custom React code:

### 1. State Management Architecture
- **Current**: Global `state` object with direct mutations
- **React + TypeScript**: Zustand with TypeScript interfaces
- **Complexity**: High
- **Lines**: ~500-800 lines of state logic + type definitions
- **TypeScript**: Will create interfaces for all state structures (Group, Snippet, Project, Goal, etc.)

### 2. Google Drive Integration
- **Current**: API calls in `drive.js`
- **React + TypeScript**: Convert to custom hooks (`useDrive`, `useAuth`) with TypeScript types
- **Complexity**: Medium
- **Status**: Backend already works, just needs React wrapper
- **TypeScript**: Will create interfaces for API responses and request parameters

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
- **React**: Convert to React Query or custom hooks
- **Complexity**: Medium
- **Lines**: ~300-400 lines
- **Details**: 
  - Loads active snippet first, then background loads remaining
  - Throttled updates during background loading
  - Prevents UI blocking

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

## Migration Phases

### Phase 1: Setup & Infrastructure (Week 1)
- [ ] Set up React + TypeScript + Vite build system
- [ ] Configure TypeScript (tsconfig.json)
- [ ] Set up type definitions for all libraries
- [ ] Configure React Router with TypeScript
- [ ] Set up Netlify build configuration
- [ ] Install and configure all libraries
- [ ] Create base component structure with TypeScript
- [ ] Set up state management (Zustand) with TypeScript types
- [ ] Create TypeScript interfaces/types for state structure
- [ ] Create custom hooks for Drive API with TypeScript

**LOE**: 8-12 hours (includes TypeScript setup and type definitions)

### Phase 2: Authentication (Week 1-2)
- [ ] Convert login page to React
- [ ] Integrate Google Sign-In SDK
- [ ] Create Auth context/provider
- [ ] Handle auth state and redirects
- [ ] Test authentication flow

**LOE**: 6-8 hours

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
- [ ] Set up TipTap editor
- [ ] Basic editor functionality

**LOE**: 15-20 hours

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
- [ ] Lazy loading logic
- [ ] Auto-save functionality
- [ ] Conflict resolution
- [ ] Export functionality

**LOE**: 15-20 hours

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
1. **ContentEditable Complexity**
   - Risk: Rich text editor integration may have edge cases
   - Mitigation: Use TipTap (proven library) instead of custom solution
   - Contingency: Allow extra 5-10 hours for editor edge cases

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
1. **Better Accessibility**: Radix UI components are fully accessible
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
│   │   │   ├── TipTapEditor.tsx
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
│   │   ├── useDrive.ts
│   │   ├── useAuth.ts
│   │   ├── useStory.ts
│   │   ├── useGoal.ts
│   │   └── ...
│   ├── utils/
│   │   ├── wordCount.ts
│   │   ├── export.ts
│   │   ├── goalCalculation.ts
│   │   └── ...
│   ├── store/
│   │   ├── store.ts (Zustand)
│   │   └── types.ts
│   ├── api/
│   │   └── drive.ts
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

### Rich Text Editor: TipTap vs Slate vs Draft.js

**Recommendation: TipTap**
- ✅ Modern, React-first
- ✅ Excellent documentation
- ✅ Active development
- ✅ Good performance
- **Alternative**: Slate (if need more customization)

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

### Accessibility
- All Radix UI components are accessible by default
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
- [Radix UI Documentation](https://www.radix-ui.com/)
- [@dnd-kit Documentation](https://docs.dndkit.com/)
- [React Router Documentation](https://reactrouter.com/)
- [Zustand Documentation](https://github.com/pmndrs/zustand)

### Migration Guides
- [React Migration Guide](https://react.dev/learn/start-a-new-react-project)
- [Vite Migration Guide](https://vitejs.dev/guide/)

---

## Additional Technical Details

### State Structure

The current global `state` object will be converted to TypeScript interfaces:

```typescript
// types/state.ts
export interface Group {
  id: string;
  title: string;
  description?: string;
  color: string;
  snippetIds: string[];
  position?: number;
}

export interface Snippet {
  id: string;
  title: string;
  body: string;
  description?: string;
  groupId?: string;
  kind?: 'person' | 'place' | 'thing';
  color?: string;
  words: number;
  chars: number;
  driveFileId?: string;
  updatedAt?: string;
  lastKnownDriveModifiedTime?: string;
  _contentLoaded?: boolean;
}

export interface Project {
  groupIds: string[];
  snippetIds: string[];
  activeSnippetId: string | null;
  activeRightTab: 'people' | 'places' | 'things';
  filters: {
    search: string;
  };
}

export interface Goal {
  target: number | null;
  deadline: string | null;
  mode: 'elastic' | 'strict';
  writingDays: number[];
  daysOff: string[];
}

export interface AppState {
  groups: Record<string, Group>;
  snippets: Record<string, Snippet>;
  project: Project;
  drive: {
    storyFolderId: string | null;
  };
  goal: Goal;
  collapsedGroups: Set<string>;
  editing: {
    savingState: 'idle' | 'saving' | 'saved';
    lastSavedAt: string | null;
  };
}
```

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
- Document all major decisions and changes here

---

## Contact & Support

For questions or updates to this plan, please document changes here and update the changelog.

