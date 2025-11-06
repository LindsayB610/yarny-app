# Phase 7: Accessibility, Performance & Polish (Week 4–5)

## Checklist
- [ ] Conduct accessibility audit and fixes
  - [ ] Verify minimum contrast ratios (4.5:1 for text, 3:1 for UI chrome) against soft chips and dark surfaces
  - [ ] Perform contrast checks on all 12 accent colors (base, soft, dark variants)
  - [ ] Verify visible focus rings on all actionable items (left rail, modal footers, etc.)
  - [ ] Implement keyboard-only flows for reordering lists (`@dnd-kit` keyboard navigation)
  - [ ] Verify keyboard-only completion of core tasks (create, rename, reorder, export)
  - [ ] Test with screen readers
  - [ ] Verify keyboard navigation works throughout app
- [ ] Execute visual parity validation
  - [ ] Side-by-side `/react` vs root comparison for goal meter, Today chip, footer counts, story cards, modal spacing
  - [ ] Document diff screenshots as artifacts
  - [ ] Verify pixel-perfect match for classic UX anchors
- [ ] Perform cross-browser testing
- [ ] Run full smoke test suite on small, medium, and large projects
- [ ] Execute performance testing with large project (`test-large`)
  - [ ] Verify time-to-first-keystroke after editor mount ≤ 800 ms
  - [ ] Verify snippet switch to interactive ≤ 300 ms (medium corpus, hot path)
  - [ ] Verify background load never blocks typing (no jank > 16 ms frames)
  - [ ] Profile with React DevTools
- [ ] Evaluate performance optimization needs (virtualization activation, memoization review)
- [ ] Run regression testing before production deployment
- [ ] Address remaining bugs
- [ ] Validate mobile responsiveness
- [ ] Update documentation

## Deliverables
- Accessibility, visual parity, and performance reports with documented remediation steps and evidence (screenshots, metrics).
- Regression-safe build validating smoke tests, performance budgets, and cross-browser behavior.
- Updated documentation covering remaining known issues, testing artifacts, and release readiness.

## Level of Effort
- Estimated 25–38 hours including accessibility polish, visual regression validation, performance budget verification, and smoke testing.

## Risk Checkpoint Focus
- Final re-rating of critical risks (round-tripping, Drive quotas, performance) prior to production deployment.
- Ensure classic UX anchors meet parity targets and performance budgets are satisfied.

## Notes & References
- Feed collected screenshots and metrics into Phase 8 visual regression baselines and performance tests.
- Coordinate with manual testing checklist to close remaining subjective UX verifications.

