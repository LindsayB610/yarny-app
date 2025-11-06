# Phase 6: Lazy Loading & Exports (Week 4)

## Checklist
- [ ] Implement lazy loading using React Query prefetching and `useQueries` (visibility-gated)
- [ ] Implement auto-save functionality using React Query mutations (visibility-gated)
- [ ] Build offline/spotty-network semantics: network status hook, offline banner, queued saves, save status updates
- [ ] Implement export functionality with chunked writes for large chapters
- [ ] Implement chunked export logic for chapters exceeding `batchUpdate` body limits
- [ ] Add progress indication for chunked exports
- [ ] Run full smoke test suite on small and medium projects
- [ ] Validate all operations work correctly (including conflict resolution from Phase 5)
- [ ] Populate large project (`test-large`) with very large chapter (50+ snippets)
- [ ] Test export of very large chapter to validate chunking

## Deliverables
- Visibility-aware loading and saving behaviors with resilient offline handling.
- Chunked export system validated against large project corpus and instrumented with user feedback.
- Smoke test evidence across small, medium, and large corpora demonstrating stability.

## Level of Effort
- Estimated 16–23 hours covering lazy loading, offline semantics, export chunking, and smoke test execution.

## Risk Checkpoint Focus
- Re-rate editor/Docs round-tripping, Drive quotas, and large-scale performance risks.
- Verify export chunking succeeds for large chapters and conflict resolution remains stable under network variability.

## Notes & References
- Reuse conflict detection hooks from Phase 5 within offline queuing paths.
- Capture metrics from smoke tests to feed Phase 7 performance and regression baselines.

