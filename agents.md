# Agent Guidelines for Yarny Repository

This document provides guidelines for AI agents and automated tools working in this repository.

## Quick Reference

- ✅ `npm run test` - Run unit/integration tests once
- ✅ `npm run test:e2e` - Run e2e tests once
- ✅ `npm run test:all` - Run all tests once

## Running Tests

**IMPORTANT**: All test commands run once and exit. Watch mode has been disabled to prevent CPU issues.

### Unit/Integration Tests (Vitest)

✅ **Correct - Runs once and exits:**
```bash
npm run test
```
This uses `vitest run` which executes all tests once and exits.

✅ **UI Mode (runs once and exits):**
```bash
npm run test:ui
```
Opens the Vitest UI but still runs once and exits (no watch mode).

### End-to-End Tests (Playwright)

✅ **Correct - Runs once and exits:**
```bash
npm run test:e2e
```
This runs all Playwright tests once and exits.

❌ **Incorrect - Interactive modes (DO NOT USE for automation):**
```bash
npm run test:e2e:ui      # Opens Playwright UI
npm run test:e2e:headed  # Runs in headed mode
playwright test --ui     # Opens interactive UI
```

### Running All Tests

✅ **Correct - Runs all tests once:**
```bash
npm run test:all
```
This runs both unit/integration tests and e2e tests sequentially, then exits.

## Test Scripts Reference

| Script | Command | Behavior |
|--------|---------|----------|
| `test` | `vitest run` | ✅ Runs once, exits |
| `test:ui` | `vitest run --ui` | ✅ Runs once, exits (opens UI) |
| `test:coverage` | `vitest run --coverage` | ✅ Runs once, exits (generates coverage) |
| `test:kill` | `pkill -f vitest` | 🔧 Kills any stuck Vitest processes |
| `test:e2e` | `playwright test` | ✅ Runs once, exits |
| `test:e2e:ui` | `playwright test --ui` | ⚠️ Interactive UI (for manual use) |
| `test:e2e:headed` | `playwright test --headed` | ⚠️ Runs once but opens browser windows |
| `test:all` | `npm run test && npm run test:e2e` | ✅ Runs all tests once, exits |

## Key Principles

1. **Always use `npm run test`** for Vitest tests (not `vitest` directly)
2. **Always use `npm run test:e2e`** for Playwright tests
3. **Watch mode is disabled** - all tests run once and exit
4. **Use `test:kill`** if Vitest processes get stuck
5. **Use `test:all`** when you need to run the full test suite

## Environment Detection

The test configuration automatically detects CI environments:
- **CI mode**: Tests run with retries, single worker, and GitHub reporter
- **Local mode**: Tests run in parallel with multiple workers

When running in CI or automated contexts, ensure `CI=true` is set in the environment for optimal test behavior.

## Import Path Guidelines

**IMPORTANT**: Use the `@` alias for imports from the `src` directory when navigating more than one directory level up.

### Path Alias Configuration

The `@` alias is configured to point to the `src` directory:
- Configured in `vite.config.ts` for runtime resolution
- TypeScript resolves it automatically via module resolution

### Import Path Rules

✅ **Correct - Use `@` alias for deep imports:**
```typescript
import { useYarnyStore } from "@/store/provider";
import { selectActiveStory } from "@/store/selectors";
import { useNotesQuery } from "@/hooks/useNotesQuery";
```

✅ **Correct - Use relative paths for same-level or immediate parent:**
```typescript
import { NotesList } from "./NotesList";
import { StoryTabs } from "../StoryTabs";
```

❌ **Incorrect - Avoid multiple `../` levels:**
```typescript
import { useYarnyStore } from "../../../store/provider";  // Use @/store/provider instead
import { selectActiveStory } from "../../../store/selectors";  // Use @/store/selectors instead
```

### Guidelines

1. **Use `@` alias** when importing from `src` and the path requires more than one `../` level
2. **Use relative paths** (`./` or `../`) for imports within the same component directory or immediate parent
3. **Prefer `@` over deep relative paths** (`../../../`) for better readability and maintainability

## Component Structure Guidelines

Follow the component organization pattern established in `src/components/story/`:

### Directory Structure

Complex components should be organized as directories with the following structure:

```
ComponentName/
  ├── index.ts              # Public exports (2-5 lines)
  ├── view.tsx              # Main component view (200-300 lines target)
  ├── types.ts              # TypeScript types/interfaces (5-30 lines)
  ├── use*.ts               # Custom hooks (50-150 lines each)
  ├── SubComponent.tsx      # Sub-components (50-200 lines)
  └── *.test.tsx            # Test files
```

### File Length Guidelines

- **Index files (`index.ts`)**: 2-5 lines - Export public API only
- **Type files (`types.ts`)**: 5-30 lines - Type definitions and interfaces
- **Hooks (`use*.ts`)**: 50-150 lines - Focused, single-responsibility hooks
- **Sub-components**: 50-200 lines - Reusable UI components
- **Main view (`view.tsx`)**: 200-300 lines target, max 400 lines
- **Complex handlers**: 200-400 lines max - Extract to separate files if larger

### When to Split Components

Split a component into a directory structure when:
- The component file exceeds **300 lines**
- The component has **multiple related hooks** (3+ custom hooks)
- The component has **sub-components** that are only used within it
- The component manages **complex state** that benefits from separation

### Example Structure

See `src/components/story/` for reference:
- `StoryEditor/` - Main editor with hooks for sync, content, conflict detection
- `NotesSidebar/` - Notes sidebar with list management and reordering
- `StorySidebarContent/` - Complex sidebar with chapters, snippets, dialogs
- `NoteEditor/` - Note editing with auto-save and header management

### Key Principles

1. **Single Responsibility**: Each file should have one clear purpose
2. **Co-location**: Related files stay together in the same directory
3. **Public API**: Use `index.ts` to control what's exported publicly
4. **Separation of Concerns**: Split logic (hooks), types, and presentation (view)
5. **Maintainability**: Keep files focused and readable (target < 300 lines for views)

## Additional Notes

- Vitest tests are configured in `vite.config.ts` under the `test` section
- Playwright tests are configured in `playwright.config.ts`
- E2E tests automatically start the dev server (`npm run dev`) before running
- Test files are located in `tests/` directory (unit/integration) and `tests/e2e/` (Playwright)

