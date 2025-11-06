# Phase 8: Test Automation (Week 5–6)

## Checklist
- [ ] Set up testing infrastructure
  - [ ] Install Playwright (`@playwright/test`)
  - [ ] Install React Testing Library (`@testing-library/react`, `@testing-library/jest-dom`)
  - [ ] Install Vitest
  - [ ] Configure test tooling and shared utilities
  - [ ] Stand up mock Google Drive API server with MSW
  - [ ] Create test data fixtures aligned with test corpus
- [ ] Build component-level test coverage (React Testing Library)
  - [ ] Modal interactions (open, close, submit)
  - [ ] Context menu interactions
  - [ ] Color picker selections
  - [ ] Goal meter calculations (elastic/strict)
  - [ ] Word count calculations
  - [ ] Search filtering and highlighting
  - [ ] Drag & drop operations (`@testing-library/user-event`)
  - [ ] Keyboard shortcut handling
  - [ ] Form validation flows
- [ ] Build integration tests (React Testing Library + MSW)
  - [ ] API contract validation (Zod schemas)
  - [ ] State management CRUD operations
  - [ ] Google Drive sync flows
  - [ ] Conflict detection logic
  - [ ] Format normalization
  - [ ] Session persistence
  - [ ] Error handling scenarios (network/API/rate limiting)
- [ ] Build end-to-end tests (Playwright)
  - [ ] Authentication flow with mocked Google Sign-In
  - [ ] Story management workflows
  - [ ] Editor operations (edit, save, auto-save)
  - [ ] Chapter/snippet management
  - [ ] Color coding flows
  - [ ] Search across chapters/snippets/content
  - [ ] Goals setup and validation (elastic/strict)
  - [ ] Notes CRUD (People/Places/Things)
  - [ ] Export workflows (content structure validation)
  - [ ] Conflict resolution scenarios
  - [ ] Round-tripping validation
  - [ ] Performance budget checks (hot/cold paths)
  - [ ] Visibility-based request gating
  - [ ] Rate limiting handling (429 backoff)
- [ ] Implement visual regression tests (Playwright + pixel diff)
  - [ ] Classic UX anchors (goal meter, Today chip, footer counts)
  - [ ] Modal layouts
  - [ ] Responsive layouts
  - [ ] Color coding displays
  - [ ] Loading states
  - [ ] Error states
- [ ] Implement performance tests (Playwright)
  - [ ] Time-to-first-keystroke after editor mount (≤ 800 ms)
  - [ ] Time to first edit (hot ≤ 300 ms, cold ≤ 1.5 s)
  - [ ] Snippet switch latency (hot ≤ 300 ms)
  - [ ] Large story performance (25+ chapters, 200+ snippets)
  - [ ] Lazy loading behavior
  - [ ] Virtualization thresholds
  - [ ] Frame jank monitoring (< 16 ms while typing)
- [ ] Manage test data
  - [ ] Create fixtures for small, medium, large projects
  - [ ] Add data generators for edge cases
  - [ ] Provide reset utilities
  - [ ] Document data structures
- [ ] Integrate with CI/CD
  - [ ] Configure GitHub Actions workflows
  - [ ] Run tests on PRs and main branch
  - [ ] Publish test reports
  - [ ] Notify on visual regression failures
- [ ] Track success criteria
  - [ ] Automate 60%+ of testing workbook coverage
  - [ ] Cover all critical user workflows with E2E tests
  - [ ] Include classic UX anchors in visual regression suite
  - [ ] Automate performance budget validation
  - [ ] Run entire suite in CI/CD and expose coverage dashboards
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

