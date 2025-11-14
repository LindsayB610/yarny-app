# Phase 4: Editor – Tri-Pane Shell & Plain Text Round-Trip (Week 2–3)

## Checklist
- [x] Set up three-column layout (Story / Editor / Notes)
- [x] Convert story list sidebar
- [x] Convert notes sidebar with tabs
- [x] Implement footer word/character counts first
- [x] Implement save status display (includes JSON Primary Architecture sync status indicator)
- [x] Set up TipTap editor with plain text configuration
- [x] Integrate TipTap with conflict detection
- [x] Implement editor as truth (authoritative while open)
- [x] Deliver basic editor functionality
- [x] **JSON Primary Architecture**: Implemented JSON-first saves with background sync to Google Docs
- [x] **JSON Primary Architecture**: Service Worker + Background Sync API for reliable sync
- [x] **JSON Primary Architecture**: Conflict detection updated for JSON primary model
- [x] **JSON Primary Architecture**: Migration system for existing stories
- [x] Test round-tripping with Google Docs (via JSON Primary Architecture)
- [ ] Run smoke tests on small project (`test-small`) after TipTap integration
- [ ] Validate round-tripping with small project
- [ ] Populate medium project (`test-medium`)
- [ ] Classic UX anchors visual parity check: goal meter, "Today" chip, footer counts (pixel diff or side-by-side comparison)

## Deliverables
- Functional tri-pane editor shell with TipTap configured for plain text and integrated with conflict detection flows.
- Save status (including JSON Primary Architecture sync status indicator), word counts, and core editor interactions matching legacy behavior.
- **JSON Primary Architecture**: Fast saves (<50ms) via JSON files with background sync to Google Docs, Service Worker integration, and conflict detection.
- Smoke test artifacts for small and medium corpus projects plus documented parity validation for classic UX anchors.

## Level of Effort
- Estimated 24–33 hours including TipTap integration, conflict detection wiring, round-trip testing, smoke tests, and visual parity validation.

## Risk Checkpoint Focus
- Re-rate editor/Docs round-tripping, Drive quotas, and large-scale performance risks.
- Verify classic UX anchors meet visual parity requirements before closing the phase.

## Notes & References
- Coordinate with Phase 5 conflict resolution work to ensure hooks/interfaces align.
- Capture screenshots and testing notes for reuse in later visual regression baselines (Phase 7).

