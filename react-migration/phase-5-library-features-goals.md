# Phase 5: Library Features & Goals UI (Week 3–4)

## Checklist
- [ ] Implement drag & drop with `@dnd-kit`
- [ ] Integrate color picker
- [ ] Build context menus
- [ ] Convert all modals (story info, rename, delete, etc.) using Material UI `Dialog`
- [ ] Implement tabs using Material UI `Tabs`
- [ ] Implement Goals UI: goal meter (left rail) and goal panel modal at parity with alpha plan
- [ ] Implement “Today • N” chip with progress bar and ahead/behind indicator
- [ ] Wire word count updates
- [ ] Create conflict detection hooks (`src/hooks/useConflictDetection.ts`)
- [ ] Deliver conflict resolution UI and modal
- [ ] Test cross-edits: edit in Google Docs while Yarny is idle, return and verify conflict detection works

## Deliverables
- Library feature parity (drag & drop, context menus, color picker, modal flows) aligned with Material UI customization from Phase 1.
- Goals UI and conflict resolution experiences validated against classic UX requirements.
- Documented cross-edit test results ensuring conflict detection resilience.

## Level of Effort
- Estimated 25–35 hours including Goals UI work, conflict resolution tooling, and cross-edit testing.

## Risk Checkpoint Focus
- Re-rate editor/Docs round-tripping, Drive quotas, and large-scale performance risks.
- Confirm conflict resolution modal functions correctly and cross-edit testing passes before closing the phase.

## Notes & References
- Reuse conflict detection utilities in later offline/spotty-network work (Phase 6).
- Capture reference screenshots for goal meter and Today chip to feed Phase 7 visual regression baselines.

