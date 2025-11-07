# Open To-Dos Checklist

This checklist contains all open to-dos that are NOT manual testing items. These are development tasks, test execution, documentation, and other non-manual items.

## Phase 1: Setup & Infrastructure

### Test Execution
- [x] **Execute smoke test checklist** - Run automated smoke tests from `SMOKE_TEST_EXECUTION.md` (Completed: lint and test commands executed)
- [x] **Fix lint warnings** - Address any lint warnings from smoke test execution (Completed: Fixed unused imports, variables, React imports, try/catch wrappers, and other critical lint errors)
- [x] **Fix test failures** - Address any test failures from smoke test execution (Completed: Fixed parsing errors by renaming .test.ts files with JSX to .tsx and fixing mock syntax)

### Test Corpus
- [ ] **Upload test-medium to Google Drive** - Follow upload guide in `testing-workbook.html` Section 0.4 (Guide completed and integrated)
- [ ] **Upload test-large to Google Drive** - Follow upload guide in `testing-workbook.html` Section 0.5 (Guide completed and integrated)
- [ ] **Update metadata.json files** - Replace `REPLACE_WITH_DRIVE_FOLDER_ID` placeholders with actual Drive folder IDs (Manual task - requires Drive upload first)

## Phase 4: Editor – Tri-Pane Shell & Plain Text Round-Trip

### Test Execution
- [ ] **Execute round-trip tests** - Run `tests/integration/round-trip.test.tsx`
- [ ] **Execute enhanced round-trip tests** - Run `tests/integration/round-trip-enhanced.test.tsx`
- [ ] **Fix any test failures** - Address failures in round-trip tests

### Deployment
- [ ] **Deploy React app to `/react` path** - Deploy to production/staging for visual parity testing
- [ ] **Verify deployment** - Confirm React app is accessible at `/react` path

### Visual Parity
- [ ] **Execute visual regression tests** - Run `tests/e2e/visual-regression.spec.ts`
- [ ] **Review visual regression test results** - Check pixel-diff percentages
- [ ] **Fix visual differences** - Address any differences that exceed 5% threshold
- [ ] **Update visual regression baselines** - If intentional changes, update baselines

## Phase 5: Library Features & Goals UI

### Test Execution
- [ ] **Execute conflict resolution tests** - Run `tests/e2e/conflict-resolution.spec.ts`
- [ ] **Fix any test failures** - Address failures in conflict resolution tests
- [ ] **Execute chapter/snippet management tests** - Run `tests/e2e/chapter-snippet-management.spec.ts`
- [ ] **Execute color coding tests** - Run `tests/e2e/color-coding.spec.ts`
- [ ] **Execute goals tests** - Run `tests/e2e/goals.spec.ts`

## Phase 6: Lazy Loading & Exports

### Test Execution
- [ ] **Execute export workflow tests** - Run `tests/e2e/export-workflows.spec.ts`
- [ ] **Execute visibility gating tests** - Run `tests/e2e/visibility-gating.spec.ts`
- [ ] **Execute search tests** - Run `tests/e2e/search.spec.ts`
- [ ] **Execute notes CRUD tests** - Run `tests/e2e/notes-crud.spec.ts`

### Test Corpus
- [ ] **Create upload guide for test-large** - Document upload process for test-large project
- [ ] **Test export chunking with test-large** - Verify chunking works with Chapter 13 (55 snippets)

## Phase 7: Accessibility, Performance & Polish

### Test Execution
- [ ] **Execute performance tests** - Run `tests/e2e/performance.spec.ts`
- [ ] **Review performance test results** - Verify all budgets are met
- [ ] **Fix performance regressions** - Address any budget violations

### Component Tests
- [ ] **Create search filtering and highlighting tests** - Add component tests for search functionality
- [ ] **Create drag & drop operation tests** - Add tests using `@testing-library/user-event`

### Integration Tests
- [ ] **Create session persistence tests** - Add tests for session state persistence

### Performance Tests
- [ ] **Create large story performance test** - Test with 25+ chapters, 200+ snippets
- [ ] **Create lazy loading behavior test** - Verify lazy loading works correctly
- [ ] **Create virtualization threshold test** - Verify virtualization activates at correct threshold

### E2E Tests
- [ ] **Create rate limiting handling test** - Test 429 backoff behavior

### Documentation
- [ ] **Document accessibility improvements** - Create documentation of accessibility features
- [ ] **Document performance metrics and budgets** - Document performance tracking and budgets
- [ ] **Create accessibility testing checklist** - Document accessibility testing procedures

### Code Quality
- [ ] **Run contrast checker against actual UI** - Execute contrast checker utility on real UI backgrounds
- [ ] **Fix contrast issues** - Address any contrast violations found

## Phase 8: Test Automation

### Test Execution
- [ ] **Execute all E2E tests** - Run full E2E test suite
- [ ] **Execute all integration tests** - Run full integration test suite
- [ ] **Execute all component tests** - Run full component test suite
- [ ] **Fix any test failures** - Address all test failures

### Test Coverage
- [ ] **Review test coverage report** - Check coverage percentages
- [ ] **Increase test coverage** - Add tests for uncovered code paths

### CI/CD
- [ ] **Verify CI/CD integration** - Ensure tests run in CI/CD pipeline
- [ ] **Fix CI/CD issues** - Address any CI/CD failures

### Documentation
- [ ] **Update manual testing checklist** - Update checklist post-automation completion

## Overall Success Criteria

### Must Have (MVP)
- [ ] **Comprehensive feature testing** - Test all existing features work correctly
- [ ] **Regression test suite execution** - Run full regression test suite
- [ ] **Background load jank testing** - Verify background loads never block typing (no jank > 16ms)
- [ ] **Medium corpus performance testing** - Test performance budgets with test-medium project
- [ ] **Visual parity execution** - Execute and validate visual parity tests

### Ship Checklist
- [ ] **Offline UX testing** - Test offline → reconnect flow
- [ ] **Timezone correctness testing** - Test midnight rollover and DST boundaries
- [ ] **Order persistence verification** - Verify order persisted in Drive metadata
- [ ] **Multi-tab reorder test** - Test order persistence across tabs
- [ ] **Concurrent edit order test** - Test order survives concurrent edits
- [ ] **Background load order test** - Test order survives background loads
- [ ] **RTL test snippet creation** - Add RTL snippet to test corpus
- [ ] **RTL testing** - Test caret movement, word counting, paste normalization
- [ ] **Memory bound verification** - Verify cache size limits and LRU eviction
- [ ] **Long session memory test** - Test cache doesn't grow beyond target

### Should Have
- [ ] **Accessibility verification** - Complete all accessibility verification tasks
- [ ] **Chunked export validation** - Validate chunked export with large chapters
- [ ] **Order persistence verification** - Verify order persistence works correctly

## Code Quality & Maintenance

### Linting & Formatting
- [ ] **Fix all lint errors** - Address all ESLint errors
- [ ] **Fix all lint warnings** - Address all ESLint warnings
- [ ] **Run Prettier** - Format all code with Prettier

### Type Safety
- [ ] **Fix all TypeScript errors** - Address all TypeScript compilation errors
- [ ] **Fix all TypeScript warnings** - Address all TypeScript warnings
- [ ] **Improve type coverage** - Add types for any `any` types

### Code Review
- [ ] **Review component integration** - Verify all components are properly integrated
- [ ] **Review hook usage** - Verify all hooks are used correctly
- [ ] **Review state management** - Verify Zustand store usage is correct

## Documentation

### Migration Documentation
- [ ] **Update migration plan** - Update `REACT_MIGRATION_PLAN.md` with completed items
- [ ] **Update gap analysis** - Keep `MIGRATION_GAP_ANALYSIS.md` up to date
- [ ] **Create migration completion report** - Document completed migration

### User Documentation
- [ ] **Update user guide** - Update documentation for React app
- [ ] **Create migration guide** - Guide for users migrating from classic to React app

### Developer Documentation
- [ ] **Update README** - Update project README with React app information
- [ ] **Create component documentation** - Document all React components
- [ ] **Create hook documentation** - Document all React hooks
- [ ] **Create API documentation** - Document API contracts and usage

## Deployment

### Pre-Deployment
- [ ] **Final code review** - Complete code review of all changes
- [ ] **Final test execution** - Run all tests one final time
- [ ] **Performance validation** - Validate all performance budgets
- [ ] **Security review** - Review security implications

### Deployment
- [ ] **Deploy to staging** - Deploy React app to staging environment
- [ ] **Staging validation** - Validate staging deployment
- [ ] **Deploy to production** - Deploy React app to production
- [ ] **Production validation** - Validate production deployment

### Post-Deployment
- [ ] **Monitor error logs** - Monitor for errors in production
- [ ] **Monitor performance** - Monitor performance metrics
- [ ] **User feedback collection** - Collect user feedback on React app
- [ ] **Bug fixes** - Address any production bugs

## Future Enhancements

### Performance
- [ ] **Optimize bundle size** - Reduce bundle size if needed
- [ ] **Optimize load times** - Further optimize initial load time
- [ ] **Optimize runtime performance** - Further optimize runtime performance

### Features
- [ ] **Virtualization for chapter/snippet lists** - Add virtualization if needed for large projects
- [ ] **Additional test coverage** - Add more test coverage for edge cases

### Infrastructure
- [ ] **CI/CD improvements** - Enhance CI/CD pipeline
- [ ] **Monitoring improvements** - Add better monitoring and alerting
- [ ] **Error tracking** - Set up error tracking (e.g., Sentry)

