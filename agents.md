# Agent Guidelines for Yarny Repository

This document provides guidelines for AI agents and automated tools working in this repository.

## Running Tests (Non-Watch Mode)

**IMPORTANT**: When running tests programmatically or in automated contexts, always use commands that run tests once and exit. Do not use watch mode.

### Unit/Integration Tests (Vitest)

✅ **Correct - Runs once and exits:**
```bash
npm run test
```
This uses `vitest run` which executes all tests once and exits.

❌ **Incorrect - Watch mode (DO NOT USE):**
```bash
npm run test:watch
# or
vitest
# or
vitest --watch
```
These commands start watch mode and will not exit, blocking automated workflows.

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
| `test:watch` | `vitest` | ❌ Watch mode, does not exit |
| `test:ui` | `vitest --ui` | ❌ Interactive UI, does not exit |
| `test:coverage` | `vitest --coverage` | ⚠️ Runs once but generates coverage report |
| `test:e2e` | `playwright test` | ✅ Runs once, exits |
| `test:e2e:ui` | `playwright test --ui` | ❌ Interactive UI, does not exit |
| `test:e2e:headed` | `playwright test --headed` | ⚠️ Runs once but opens browser windows |
| `test:all` | `npm run test && npm run test:e2e` | ✅ Runs all tests once, exits |

## Key Principles

1. **Always use `npm run test`** for Vitest tests (not `vitest` directly)
2. **Always use `npm run test:e2e`** for Playwright tests
3. **Never use watch mode** (`test:watch`, `vitest` without `run`)
4. **Never use interactive UIs** (`test:ui`, `test:e2e:ui`) in automated contexts
5. **Use `test:all`** when you need to run the full test suite

## Environment Detection

The test configuration automatically detects CI environments:
- **CI mode**: Tests run with retries, single worker, and GitHub reporter
- **Local mode**: Tests run in parallel with multiple workers

When running in CI or automated contexts, ensure `CI=true` is set in the environment for optimal test behavior.

## Additional Notes

- Vitest tests are configured in `vite.config.ts` under the `test` section
- Playwright tests are configured in `playwright.config.ts`
- E2E tests automatically start the dev server (`npm run dev`) before running
- Test files are located in `tests/` directory (unit/integration) and `tests/e2e/` (Playwright)

