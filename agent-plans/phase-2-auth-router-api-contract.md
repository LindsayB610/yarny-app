# Phase 2: Authentication, Router & API Contract (Week 1–2)

## Checklist
- [x] Configure React Router with TypeScript
- [x] Set up routing structure with loaders
- [x] Implement route loaders that prefetch Drive API data using React Query
  - [x] Stories route loader: prefetch Yarny Stories folder and stories list
  - [x] Editor route loader: prefetch Yarny Stories folder and `project.json`
  - [x] Add route-level loading states and error boundaries
- [x] Create API contract module (`src/api/contract.ts`) with Zod schemas
- [x] Create typed API client (`src/api/client.ts`)
- [x] Convert Netlify Functions to TypeScript
  - [x] Set up TypeScript configuration for Netlify Functions
  - [x] Create shared types module (`netlify/functions/types.ts`)
  - [x] Convert authentication functions (`auth/*.ts`, `verify-google.ts`, `logout.ts`)
  - [x] Convert Drive functions (`drive-*.ts`, `drive-client.ts`)
  - [x] Convert utility functions (`config.ts`, `uptime-status.ts`)
  - [x] Add type annotations to all function handlers
  - [x] Update function exports to use TypeScript types
  - [x] Test all functions with TypeScript compilation
- [x] Convert login page to React
- [x] Integrate Google Sign-In SDK
- [x] Create Auth context/provider
- [x] Handle auth state and redirects
- [x] Implement reconciliation on window focus (`src/hooks/useWindowFocusReconciliation.ts`)
- [x] Test authentication flow

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
- **Note on `auth/*.js` files**: The `netlify/functions/auth/` folder contains WebAuthn-based authentication functions (login.js, register.js, etc.) that are legacy/unused code. Neither the legacy vanilla JS app nor the React migration uses these functions. Both implementations use Google Sign-In via `verify-google.ts` and `logout.ts`. The `auth/*.js` files are kept in the repo for historical reference but are not part of the active authentication flow and do not need TypeScript conversion.

