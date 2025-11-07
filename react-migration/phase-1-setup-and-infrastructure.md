# Phase 1: Setup & Infrastructure (Week 1)

## Checklist
- [x] Set up React + TypeScript + Vite build system
- [x] Configure TypeScript (`tsconfig.json`)
- [x] Set up type definitions for all libraries
- [x] Set up Netlify build configuration
- [x] Install and configure all libraries
- [x] Set up TanStack Query (React Query) with `QueryClient` and `QueryClientProvider`
- [x] Create React Query hooks for all Drive I/O operations (`src/hooks/useDriveQueries.ts`)
- [x] Configure TipTap for plain text only (no rich formatting)
- [x] Create text extraction utilities matching Google Docs format
- [x] Create base component structure with TypeScript
- [x] Set up normalized state management (Zustand) with TypeScript types
- [x] Create normalized state structure in `src/store/types.ts` (all entities keyed by id)
- [x] Create selectors in `src/store/selectors.ts` to derive views (e.g., left-rail lists)
- [x] Set up MUI theme customization (`src/theme/theme.ts`) with brand color mappings
- [x] Customize MUI component defaults to match existing design
- [x] Set up `ThemeProvider` in app root
- [x] Create test corpus folder structure (`Yarny Test Corpus` in Drive)
- [x] Populate small project with sample data
- [x] Document smoke test checklist

## Deliverables
- Vite-based React + TypeScript project scaffold checked into the repo with linting, formatting, and testing commands.
- Shared theme, state, and API scaffolding committed and referenced by subsequent phases.
- TipTap baseline configuration locked to plain text behavior and documented alongside extraction utilities.
- Initial Drive test corpus created and linked for use in later smoke tests.

## Level of Effort
- Estimated 30–42 hours covering TypeScript setup, dependency configuration, state normalization, theming, TipTap plain text enforcement, and test corpus preparation.

## Risk Checkpoint Focus
- Re-rate editor/Docs round-tripping, Drive quotas, and large-scale performance risks.
- Verify React Query and Zod integrations are in place per definition of done criteria.

## Notes & References
- Align with `react-migration/overview.md` for cross-phase standards (type system, plain text constraints, test corpus stewardship).
- Document any deviations in configuration or tooling so downstream phases inherit accurate defaults.

