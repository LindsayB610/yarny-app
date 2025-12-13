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

See the following directories for reference:
- `src/components/story/`:
  - `StoryEditor/` - Main editor with hooks for sync, content, conflict detection
  - `NotesSidebar/` - Notes sidebar with list management and reordering
  - `StorySidebarContent/` - Complex sidebar with chapters, snippets, dialogs
  - `NoteEditor/` - Note editing with auto-save and header management
- `src/components/docs/DocsPage/` - Documentation page with sections, sidebar, and content
- `src/components/layout/AppLayout/` - Main app layout with drawers and editor area

### Key Principles

1. **Single Responsibility**: Each file should have one clear purpose
2. **Co-location**: Related files stay together in the same directory
3. **Public API**: Use `index.ts` to control what's exported publicly
4. **Separation of Concerns**: Split logic (hooks), types, and presentation (view)
5. **Maintainability**: Keep files focused and readable (target < 300 lines for views)

## Local Projects

Yarny supports both Google Drive projects and local-first projects. Local projects:
- Edit files directly on the user's computer using the File System Access API
- Store metadata in `yarny-project.json` and `yarny-story.json` files
- Save snippet content as markdown files in `drafts/chapter-*/` folders
- Support `.yarnyignore` patterns for excluding files/folders
- Persist directory handles in IndexedDB using `idb-keyval`

### Key Files for Local Projects

- `src/services/localFileStorage/` - Local file system integration
  - `localFileStorage.ts` - Service for reading/writing local files
  - `importLocalProject.ts` - Import logic for scanning and importing local projects
  - `loadLocalProject.ts` - Loading persisted local projects on startup
  - `loadChaptersAndSnippets.ts` - Loading chapters and snippets from file system
  - `yarnyIgnore.ts` - `.yarnyignore` parsing and filtering
- `src/services/localFs/` - Local backup mirroring (separate from local-first projects)
- Components detect local projects via `project.storageType === "local"` and adjust UI accordingly

### Testing Local Projects

- Mock `FileSystemDirectoryHandle` and `FileSystemFileHandle` in tests
- Use `getPersistedDirectoryHandle()` and `persistDirectoryHandle()` for directory access
- Test files: `importLocalProject.test.ts`, `loadLocalProject.test.ts`, `yarnyIgnore.test.ts`

## TypeScript Production Standards

**IMPORTANT**: All TypeScript code in this repository must follow production-grade type safety standards. These rules prevent expensive runtime bugs while keeping the codebase maintainable.

### Non-Negotiable Standards

1. **Strictness Enabled**: `strict: true` must be enabled in all tsconfig files
2. **Critical Compiler Options** (must be enabled):
   - `noUncheckedIndexedAccess: true` - Index access types include `undefined` unless proven otherwise
   - `exactOptionalPropertyTypes: true` - Optional means "may be absent", not "present with value undefined"
   - `useUnknownInCatchVariables: true` - Caught errors are `unknown` and must be narrowed
   - `verbatimModuleSyntax: true` - Forces correct type-only imports/exports
   - `isolatedModules: true` - Warns about patterns that break under single-file transpilers
   - `moduleDetection: "force"` - Treats every file as a module
   - `noUncheckedSideEffectImports: true` - Makes `import "some-module"` fail if it can't be resolved
   - `forceConsistentCasingInFileNames: true` - Avoids import casing issues across platforms

3. **Type Safety Rules**:
   - **No `any` in app code** (except isolated, documented interop shims)
   - **Treat boundaries as `unknown`** - All external inputs (fetch, localStorage, user input, third-party libs) must be validated before use
   - **Use `satisfies` for config objects/maps** - Validates shape without losing inference
   - **Prefer discriminated unions** for state machines and API responses
   - **Index access must handle `undefined`** - With `noUncheckedIndexedAccess`, always check for undefined

4. **Import Standards**:
   - **Use `import type` for types** - Do not rely on import elision
   - **Runtime imports**: `import { x } from "y"`
   - **Type imports**: `import type { X } from "y"`

5. **Async/Promise Rules**:
   - **No floating promises** - Always `await`, `return`, `.catch`, or `void`
   - **Intentional fire-and-forget**: `void telemetry.send(event);` (with comment explaining why)

6. **Error Handling**:
   - **Catch blocks use `unknown`** - Must narrow before use (enforced by `useUnknownInCatchVariables`)
   - **Normalize errors early** - Convert `unknown` errors at boundaries into consistent `Error` shapes
   - **Don't throw strings** - Use `Error` instances

7. **ESLint Typed Rules** (required):
   - Use `typescript-eslint` typed linting (`recommendedTypeChecked` + `projectService: true`)
   - Enforce:
     - `@typescript-eslint/consistent-type-imports` - Enforces `import type` usage
     - `@typescript-eslint/no-floating-promises` - Flags unhandled promises
     - `@typescript-eslint/no-misused-promises` - Catches async mistakes
     - `@typescript-eslint/switch-exhaustiveness-check` - Ensures exhaustive union handling

### TSConfig Structure

The project uses a multi-config structure:
- `tsconfig.base.json` - Shared compiler options (strictness, module rules, safety flags)
- `tsconfig.json` - Root config with project references
- `tsconfig.app.json` - App code (type-check only, `noEmit: true`)
- `tsconfig.node.json` - Node tooling (vite.config, vitest.config, etc.)
- `tsconfig.functions.json` - Netlify functions (emits JS)
- `tsconfig.eslint.json` - Includes all files ESLint should type-check (src + tests + configs)

### Coding Patterns

#### Boundary Validation Pattern
```typescript
// Boundary: unknown input
function handlePayload(payload: unknown) {
  // Validate / narrow here (schema validation or custom guards)
  const data = parsePayload(payload);
  
  // Domain logic only sees validated types
  return doDomainWork(data);
}
```

#### Discriminated Union Pattern
```typescript
type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: User }
  | { status: "error"; error: AppError };

function render(state: LoadState) {
  switch (state.status) {
    case "idle":
      return null;
    case "loading":
      return "Loading...";
    case "success":
      return state.data.name;
    case "error":
      return state.error.message;
  }
}
```

#### Index Access Pattern (with noUncheckedIndexedAccess)
```typescript
const value = map[key];
if (value === undefined) {
  // handle missing
  return;
}
// value is now proven to be defined
```

#### Satisfies Pattern for Config Objects
```typescript
type Route = "/home" | "/settings";

const routes = {
  "/home": { auth: false },
  "/settings": { auth: true }
} satisfies Record<Route, { auth: boolean }>;
```

### PR Review Checklist

When reviewing TypeScript code, verify:
- ✅ `strict: true` stays enabled
- ✅ `verbatimModuleSyntax: true` + type-only imports where appropriate
- ✅ `noUncheckedIndexedAccess` isn't bypassed with `!` unless there's a proof comment
- ✅ No `any` at boundaries - Use `unknown` + validation/narrowing
- ✅ `satisfies` used for config/maps where it improves safety
- ✅ Optional properties aren't assigned `undefined` accidentally
- ✅ No floating promises - intentional fire-and-forget uses `void`
- ✅ Switches over unions stay exhaustive
- ✅ Catch blocks treat errors as `unknown` and normalize

## Additional Notes

- Vitest tests are configured in `vite.config.ts` under the `test` section
- Playwright tests are configured in `playwright.config.ts`
- E2E tests automatically start the dev server (`npm run dev`) before running
- Test files are located in `tests/` directory (unit/integration) and `tests/e2e/` (Playwright)

