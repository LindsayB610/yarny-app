# React Migration Overview

## Objective
- Deliver a React 18 + TypeScript 5 rewrite of Yarny while preserving the classic UX anchors and Google Drive round-tripping fidelity.
- Replace the vanilla JavaScript frontend and Netlify Functions with fully typed implementations, keeping feature parity and performance budgets intact.
- Stage the work across eight execution phases to de-risk editor migration, Drive I/O, and regression coverage.

## Technology Stack
- Frontend: React 18, TypeScript 5, Vite, Zustand, TanStack Query, Material UI, TipTap (plain text configuration), @tanstack/react-virtual.
- Testing: Vitest, React Testing Library, Playwright, Mock Service Worker, pixel-diff tooling for visual regression.
- Backend: TypeScript Netlify Functions with shared request/response schemas (Zod), Google Drive API integrations.

## Cross-Phase Foundations
- Shared Type System: Establish `src/store/types.ts`, `src/api/contract.ts`, and `netlify/functions/types.ts` early; update incrementally but keep definitions authoritative.
- State Normalization: Maintain normalized entities keyed by id with selector-driven derivations to prevent render churn across all UI surfaces.
- Plain Text Discipline: Keep TipTap limited to Document, Paragraph, Text, HardBreak, History extensions. Enforce plain text extraction utilities consistently for every data flow touching Drive.
- Classic UX Anchors: Preserve goal meter, “Today • N” chip, footer counts, and other legacy visuals with side-by-side parity checks before closing phases 4, 5, and 7.
- Test Corpus: Maintain Google Drive fixtures for small, medium, and large projects to validate smoke tests, performance, and export chunking across phases.
- Cross-Tab Coordination: Build BroadcastChannel or localStorage heartbeat coordination in tandem with conflict detection so tab locking is available once the editor ships.

## Risk Management
- Critical Risks: Editor/Drive round-tripping correctness, Google Drive quota/rate limiting, and performance at large scale (virtualization readiness).
- Checkpoint Rhythm: Close each phase with a risk review, validating mitigation steps (React Query adoption, API contract completion, conflict modal readiness, export chunking, accessibility/performance budgets).
- Contingencies: Reserve buffer for TipTap edge cases, Drive API changes, and memoization/perf tuning identified via React DevTools profiling.

## Testing Strategy
- Automation Ladder: Progress from component/unit tests through MSW-backed integration suites to Playwright end-to-end flows, mirroring the testing workbook.
- Visual Regression: Capture baseline screenshots for classic UX anchors and regress frequently from Phase 4 onward.
- Performance Budgets: Track time-to-first-keystroke, snippet switch latency, and background load jank against documented targets using Playwright performance hooks.
- Manual Focus: Reserve human verification for subjective UX, accessibility with screen readers, IME composition, mobile warnings, and cross-browser visual polish even after automation is in place.

## Dependencies & Assumptions
- Google Drive API credentials and quotas remain stable; rate limiting handled via exponential backoff utilities.
- Netlify build pipeline upgraded to support TypeScript compilation for frontend and serverless functions.
- Team aligns on weekly cadence for phase demos, risk checkpoints, and artifact reviews (screenshots, test reports, coverage dashboards).
- No scope creep into rich text editing or new feature development before React parity is achieved.

## Phase Artifacts
- Each phase has a dedicated planning file (`phase-*.md`) with definition-of-done tasks, deliverables, and risk checkpoints.
- Centralized documentation (this file) captures shared context, stack decisions, testing frameworks, and cross-phase work items that must remain active throughout the migration.

