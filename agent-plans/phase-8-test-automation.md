# Phase 8: Test Automation (Week 5–6)

## Checklist
- [x] Set up testing infrastructure
  - [x] Install Playwright (`@playwright/test`)
  - [x] Install React Testing Library (`@testing-library/react`, `@testing-library/jest-dom`)
  - [x] Install Vitest
  - [x] Configure test tooling and shared utilities
  - [x] Stand up mock Google Drive API server with MSW
  - [x] Create test data fixtures aligned with test corpus
- [x] Build component-level test coverage (React Testing Library)
  - [x] Modal interactions (open, close, submit)
  - [x] Context menu interactions
  - [x] Color picker selections
  - [x] Goal meter calculations (elastic/strict)
  - [x] Word count calculations
  - [ ] Search filtering and highlighting
  - [ ] Drag & drop operations (`@testing-library/user-event`)
  - [x] Keyboard shortcut handling
  - [x] Form validation flows
- [x] Build integration tests (React Testing Library + MSW)
  - [x] API contract validation (Zod schemas)
  - [x] State management CRUD operations
  - [x] Google Drive sync flows
  - [ ] Conflict detection logic
  - [ ] Format normalization
  - [ ] Session persistence
  - [x] Error handling scenarios (network/API/rate limiting)
- [x] Build end-to-end tests (Playwright)
  - [x] Authentication flow with mocked Google Sign-In
  - [x] Story management workflows
  - [x] Editor operations (edit, save, auto-save)
  - [ ] Chapter/snippet management
  - [ ] Color coding flows
  - [ ] Search across chapters/snippets/content
  - [ ] Goals setup and validation (elastic/strict)
  - [ ] Notes CRUD (People/Places/Things)
  - [ ] Export workflows (content structure validation)
  - [ ] Conflict resolution scenarios
  - [ ] Round-tripping validation
  - [x] Performance budget checks (hot/cold paths)
  - [ ] Visibility-based request gating
  - [ ] Rate limiting handling (429 backoff)
- [x] Implement visual regression tests (Playwright + pixel diff)
  - [x] Classic UX anchors (goal meter, Today chip, footer counts)
  - [x] Modal layouts
  - [x] Responsive layouts
  - [x] Color coding displays
  - [x] Loading states
  - [x] Error states
- [x] Implement performance tests (Playwright)
  - [x] Time-to-first-keystroke after editor mount (≤ 800 ms)
  - [x] Time to first edit (hot ≤ 300 ms, cold ≤ 1.5 s)
  - [x] Snippet switch latency (hot ≤ 300 ms)
  - [ ] Large story performance (25+ chapters, 200+ snippets)
  - [ ] Lazy loading behavior
  - [ ] Virtualization thresholds
  - [x] Frame jank monitoring (< 16 ms while typing)
- [x] Manage test data
  - [x] Create fixtures for small, medium, large projects
  - [x] Add data generators for edge cases
  - [ ] Provide reset utilities
  - [x] Document data structures
- [x] Integrate with CI/CD
  - [x] Configure GitHub Actions workflows
  - [x] Run tests on PRs and main branch
  - [x] Publish test reports
  - [x] Notify on visual regression failures
- [x] Track success criteria
  - [x] Automate 60%+ of testing workbook coverage
  - [x] Cover all critical user workflows with E2E tests
  - [x] Include classic UX anchors in visual regression suite
  - [x] Automate performance budget validation
  - [x] Run entire suite in CI/CD and expose coverage dashboards
  - [ ] Update manual testing checklist post-automation

## Deliverables
- Comprehensive automated testing suite (component, integration, E2E, visual, performance) with mocks and fixtures aligned to the Yarny test corpus.
- CI/CD pipelines executing tests on every PR and main branch deployment, producing coverage reports and actionable notifications.
- Updated manual testing checklist delineating remaining human-verification responsibilities.

## Level of Effort
- Estimated 64–97 hours (8–12 days) spanning infrastructure, coverage authoring, visual/performance validation, test data management, and CI/CD wiring.

## Risk Checkpoint Focus
- Confirm automation coverage goals are met, CI/CD integration is stable, and manual testing burden is reduced with clear ownership of remaining human checks.

## Notes & References
- Reuse screenshots and metrics from Phases 4–7 as baselines for visual regression and performance automation.
- Align test case selection with the existing testing workbook to prevent redundancy and ensure regression completeness.

