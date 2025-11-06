# Phase 2: Authentication, Router & API Contract (Week 1–2)

## Checklist
- [ ] Configure React Router with TypeScript
- [ ] Set up routing structure with loaders
- [ ] Implement route loaders that prefetch Drive API data using React Query
  - [ ] Stories route loader: prefetch Yarny Stories folder and stories list
  - [ ] Editor route loader: prefetch Yarny Stories folder and `project.json`
  - [ ] Add route-level loading states and error boundaries
- [ ] Create API contract module (`src/api/contract.ts`) with Zod schemas
- [ ] Create typed API client (`src/api/client.ts`)
- [ ] Convert Netlify Functions to TypeScript
  - [ ] Set up TypeScript configuration for Netlify Functions
  - [ ] Create shared types module (`netlify/functions/types.ts`)
  - [ ] Convert authentication functions (`auth/*.ts`, `verify-google.ts`, `logout.ts`)
  - [ ] Convert Drive functions (`drive-*.ts`, `drive-client.ts`)
  - [ ] Convert utility functions (`config.ts`, `uptime-status.ts`)
  - [ ] Add type annotations to all function handlers
  - [ ] Update function exports to use TypeScript types
  - [ ] Test all functions with TypeScript compilation
- [ ] Convert login page to React
- [ ] Integrate Google Sign-In SDK
- [ ] Create Auth context/provider
- [ ] Handle auth state and redirects
- [ ] Implement reconciliation on window focus (`src/hooks/useWindowFocusReconciliation.ts`)
- [ ] Test authentication flow

## Deliverables
- Routed React application with loader-based data prefetching and typed API contract shared across frontend and Netlify Functions.
- Fully typed serverless function suite with shared request/response types and passing TypeScript builds.
- Authenticated login flow in React, including Google Sign-In integration and reconciliation hook.

## Level of Effort
- Estimated 20–28 hours for router setup, API contract formalization, Netlify Functions conversion, and reconciliation implementation.

## Risk Checkpoint Focus
- Re-rate editor/Docs round-tripping, Drive quotas, and large-scale performance risks.
- Confirm API contract definitions are complete and enforced in both frontend and serverless layers.

## Notes & References
- Leverage Drive hooks and type definitions established in Phase 1 to avoid duplication.
- Coordinate with tiptap/plain text utilities to ensure reconciliation respects normalization rules.

