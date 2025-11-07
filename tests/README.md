# Yarny Test Suite

This directory contains the comprehensive test suite for the Yarny React migration project, implementing Phase 8: Test Automation.

## Test Structure

```
tests/
├── setup/              # Test setup and configuration
│   ├── msw-handlers.ts # MSW request handlers for API mocking
│   └── msw-server.ts   # MSW server setup
├── utils/              # Test utilities and helpers
│   ├── test-utils.tsx  # Custom render function with providers
│   └── test-fixtures.ts # Test data generators
├── integration/        # Integration tests
│   ├── api-contract.test.ts
│   ├── api-client.test.ts
│   └── state-management.test.ts
└── e2e/                # End-to-end tests (Playwright)
    ├── auth.spec.ts
    ├── stories.spec.ts
    ├── editor.spec.ts
    ├── performance.spec.ts
    └── visual-regression.spec.ts
```

## Running Tests

### Unit & Integration Tests (Vitest)

```bash
# Run all tests
npm run test

# Run in watch mode
npm run test:watch

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage
```

### End-to-End Tests (Playwright)

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Run all tests (unit + E2E)
npm run test:all
```

## Test Types

### Component Tests

Component tests use React Testing Library and Vitest to test individual React components in isolation. Located alongside components (e.g., `src/components/story/GoalMeter.test.tsx`).

**Coverage:**
- Modal interactions (open, close, submit)
- Context menu interactions
- Color picker selections
- Goal meter calculations
- Word count calculations
- Form validation flows

### Integration Tests

Integration tests verify that multiple parts of the system work together correctly, using MSW to mock API calls.

**Coverage:**
- API contract validation (Zod schemas)
- State management CRUD operations
- Google Drive sync flows
- Error handling scenarios

### End-to-End Tests

E2E tests use Playwright to test complete user workflows in a real browser environment.

**Coverage:**
- Authentication flow
- Story management workflows
- Editor operations
- Chapter/snippet management
- Color coding flows
- Search functionality
- Goals setup and validation
- Export workflows
- Conflict resolution scenarios

### Visual Regression Tests

Visual regression tests capture screenshots and compare them against baselines to detect unintended visual changes.

**Coverage:**
- Classic UX anchors (goal meter, Today chip, footer counts)
- Modal layouts
- Responsive layouts
- Color coding displays
- Loading states
- Error states

### Performance Tests

Performance tests validate that the application meets performance budgets.

**Budgets:**
- Time-to-first-keystroke after editor mount: ≤ 800ms
- Time to first edit (hot path): ≤ 300ms
- Snippet switch latency (hot): ≤ 300ms
- Frame jank monitoring: < 16ms while typing

## Test Data & Fixtures

Test fixtures are located in `tests/utils/test-fixtures.ts` and provide:
- Mock projects, stories, and snippets
- Large data generators for performance testing
- Utilities for creating test state

The test corpus in `test-corpus/` provides real-world data structures for more comprehensive testing.

## Mocking

### MSW (Mock Service Worker)

MSW is used to mock Google Drive API calls in both unit and integration tests. Handlers are defined in `tests/setup/msw-handlers.ts`.

**Mocked Endpoints:**
- `/config` - Google Client ID
- `/verify-google` - Google authentication
- `/drive-list` - List Drive files
- `/drive-read` - Read file content
- `/drive-write` - Write file content
- `/drive-create-folder` - Create folders
- `/drive-delete-file` - Delete files
- `/drive-delete-story` - Delete stories
- And more...

### Playwright Route Mocking

E2E tests use Playwright's route interception to mock API calls at the network level.

## CI/CD Integration

Tests run automatically on:
- Every push to `main`
- Every pull request

The GitHub Actions workflow (`.github/workflows/test.yml`) runs:
1. Unit & Integration Tests
2. E2E Tests
3. Visual Regression Tests
4. Performance Tests

Test results and coverage reports are uploaded as artifacts.

## Writing New Tests

### Component Test Example

```tsx
import { describe, expect, it } from "vitest";
import { renderWithProviders, screen } from "../../../tests/utils/test-utils";
import { MyComponent } from "./MyComponent";

describe("MyComponent", () => {
  it("renders correctly", () => {
    renderWithProviders(<MyComponent />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });
});
```

### Integration Test Example

```tsx
import { describe, expect, it } from "vitest";
import { apiClient } from "../../src/api/client";
import { server } from "../setup/msw-server";
import { http, HttpResponse } from "msw";

describe("MyIntegration", () => {
  it("calls API correctly", async () => {
    server.use(
      http.get("/.netlify/functions/my-endpoint", () => {
        return HttpResponse.json({ data: "test" });
      })
    );

    const result = await apiClient.myMethod();
    expect(result.data).toBe("test");
  });
});
```

### E2E Test Example

```tsx
import { test, expect } from "@playwright/test";

test("user can complete workflow", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Click me" }).click();
  await expect(page.getByText("Success")).toBeVisible();
});
```

## Best Practices

1. **Test Behavior, Not Implementation**: Focus on what users see and do, not internal implementation details.

2. **Use Semantic Queries**: Prefer `getByRole`, `getByLabelText`, etc. over `getByTestId`.

3. **Keep Tests Isolated**: Each test should be independent and not rely on other tests.

4. **Mock External Dependencies**: Use MSW for API calls, avoid real network requests in tests.

5. **Test Edge Cases**: Include tests for error states, empty states, and boundary conditions.

6. **Maintain Test Data**: Keep fixtures up to date with actual data structures.

7. **Performance Budgets**: Update performance tests if budgets change, document the rationale.

## Troubleshooting

### Tests failing with MSW errors
- Ensure MSW server is properly set up in `vitest.setup.ts`
- Check that handlers match actual API endpoints

### Playwright tests timing out
- Increase timeout in `playwright.config.ts` if needed
- Check that dev server is running on correct port
- Verify network mocking is working correctly

### Visual regression failures
- Review screenshot diffs in Playwright report
- Update baselines if changes are intentional: `npm run test:e2e -- --update-snapshots`

### Performance test failures
- Check if performance budgets are realistic
- Profile the application to identify bottlenecks
- Consider if budgets need adjustment based on real-world usage

