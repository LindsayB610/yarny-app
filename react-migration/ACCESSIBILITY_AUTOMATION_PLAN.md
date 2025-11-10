## Accessibility Automation Plan

### Goals
- Provide automated accessibility coverage for high-risk UI (modals, dialogs, navigation flows).
- Catch color/contrast regressions like the modal button issue before release.
- Establish a repeatable workflow that scales to Playwright E2E and component tests.

### Scope (Phase 1)
- Modal components in `src/components/story` and `src/components/stories`.
- Smoke-level checks: no critical `axe-core` violations; contrast rules verified for primary/disabled states.
- Runs in CI alongside existing Vitest/Jest suites.

### Prerequisites
- ✅ App modal stories render correctly under React Testing Library.
- ✅ Stable test fixtures for Drive-backed data (MSW handlers + fixtures provide deterministic Drive responses; keep in sync with future model updates).
- ✅ Node-based test runner (Vitest) already configured.

### Implementation Steps
1. **Tooling Setup**
   - Install `axe-core` + `vitest-axe` (ships `toHaveNoViolations` matcher with Vitest-native typings).
   - Add shared utility `tests/utils/a11y-test-utils.ts` to wrap `axe()` with recommended rules.
   - Configure Vitest globals by extending Vitest's `expect` with `toHaveNoViolations` inside `vitest.setup.ts`.
2. **Component Accessibility Smoke Tests**
   - For each modal, write a test that renders the component in default + disabled-state variants.
   - Run `axe()` and assert no violations.
   - Snapshot rendered color styles for disabled buttons (optional guard for contrast tweaks).
3. **Playwright Integration (Optional Phase 1 Stretch)**
   - Add `@axe-core/playwright`.
   - Create `tests/e2e/accessibility.modals.spec.ts` that opens each modal and runs `axeBuilder.analyze()` using the actual app shell.
   - Gate on `violations.length === 0`.
4. **CI Integration**
   - Wire component tests into existing `npm run test` workflow (same script already used locally).
   - Add Playwright test tag (`--grep @a11y`) so suite can run independently or per-push.
5. **Documentation**
   - Update `react-migration/MIGRATION_GAP_ANALYSIS.md` and `MANUAL_TESTING_CHECKLIST.md` with the new automated coverage and manual fallback steps.

### Timeline & Effort
- Component smoke tests: ~0.5 day initial setup, ~0.5 day to cover current modals.
- Playwright axe pass: additional ~0.5 day once fixtures/Drive mocks stabilized.
- Total: ~1–1.5 days depending on fixture readiness.

### Risks & Mitigation
- **Fixture drift**: Blockers due to missing Drive payloads. → Plan to guard tests with utility helpers that skip if fixture unavailable; fill once model data ready.
- **Flaky color assertions**: Use computed styles via `getComputedStyle` rather than brittle snapshots.
- **CI runtime impact**: Axe adds ~1–2s per page; mitigate by tagging tests and running in parallel.

### Follow-Up Enhancements
- Extend coverage to navigation, story list, and editor key flows.
- Add keyboard navigation tests (focus order, escape handling) via `@testing-library/user-event`.
- Run periodic manual screen reader audit with updated checklist.




