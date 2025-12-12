# Yarny – Modern Writing Workspace

> ⚠️ **Alpha status**: The React rewrite is actively evolving. Expect rapid iteration, occasional rough edges, and breaking changes while we finish the migration.

Yarny is a distraction-free writing environment that keeps your projects organized in Google Drive or on your local filesystem. Authors sign in with Google, manage stories, chapters, and snippets, and take advantage of inline goals, exports, and automated backups. Yarny supports both cloud-based projects (Google Drive) and local-first projects (direct file editing).

**Access**: Yarny is invite-only. Email [lb@lindsaybrunner.com](mailto:lb@lindsaybrunner.com) with the Google account you plan to use.

## Highlights

- **Secure authentication** powered by Google Identity Services with multi-user allow-list support.
- **Google Drive + Docs integration** for automatic cloud persistence, export jobs, and conflict checks.
- **Local-first projects** for direct file editing with support for `.yarnyignore` patterns and automatic project detection.
- **Rich story editor** built with TipTap, Material UI, TanStack Query, and Zustand.
- **Daily writing goals** with elastic/strict planning, deadline tracking, and quick progress views.
- **Local mirrored backups** using the File System Access API so Drive saves are duplicated on disk for offline work and regression testing.
- **Extensive automation**: Netlify Functions back the API, Vitest handles unit/integration coverage, and Playwright powers end-to-end scenarios.

## Architecture Overview

- **Frontend**: React 18 + TypeScript (Vite build), featuring Suspense-ready routing, lazy-loaded bundles, and a store-first data layer.
- **Backend**: Netlify Functions (`netlify/functions`) for auth token verification, Drive/Docs API orchestration, and Uptime Robot pings.
- **Persistence**:
  - **JSON Primary Architecture** (✅ Complete): Snippet content is saved to JSON files (`.{snippetId}.yarny.json`) for fast, reliable saves (<50ms). Google Docs are synced in the background via Service Worker + Background Sync API, ensuring changes persist even if the page is closed.
  - Google Drive/Docs APIs (`drive.file` + `documents` scopes) for cloud persistence and exports.
  - Netlify Blobs for encrypted OAuth token storage keyed by user email.
  - Optional local mirror using the File System Access API.
- **Testing & Tooling**: Vitest, Testing Library, Playwright, ESLint, Prettier, PostCSS, and Netlify CLI.

### JSON Primary Architecture

Yarny uses a JSON-primary storage model where snippet content is saved to JSON files first, then synced to Google Docs in the background. This provides:

- **Fast saves**: JSON file writes complete in <50ms vs 500ms-2s+ for direct Google Doc updates
- **Reliable sync**: Background sync continues even if the page is closed (via Service Worker)
- **Better offline support**: Changes are queued locally and sync when online
- **Reduced API quota usage**: Batched background syncs reduce API calls
- **Conflict detection**: Automatically detects when Google Docs are modified externally and prompts for resolution

**How it works**:
1. As you type, changes are saved to hidden JSON files (`.{snippetId}.yarny.json`) in Google Drive
2. A background sync process updates the corresponding Google Docs asynchronously
3. On snippet load, the system checks if Google Docs have been modified externally
4. If conflicts are detected, a modal appears allowing you to choose which version to keep

**Status**: ✅ Complete - All features implemented including migration system, conflict detection, sync status indicators, and manual sync controls. See `plans/JSON_PRIMARY_ARCHITECTURE.md` for technical details.

## Legacy Application Reference

The original vanilla HTML/JS implementation has been preserved for parity, audits, and regression reference:

- `archive/` contains the full legacy UI (docs, editor, stories) plus migration planning artifacts.
- `archive/vanilla-app/index.html` serves the historic single-page experience that once lived at `/vanilla-app/`.

The source of truth lives in `archive/`, which Vite copies into the production bundle at build time.

## Prerequisites

- Node.js **>= 20** and npm **>= 8** (see `package.json` `engines` entry).
- Netlify account with a Personal Access Token (for local functions + production deploys).
- Google Cloud project with Drive and Docs APIs enabled and two OAuth clients (Sign-In + Drive server).
- Chromium-based browser (Chrome/Edge) recommended for enabling local filesystem backups.

## Quick Start

```bash
# Clone the repository (replace with your repository URL)
cd yarny-app
npm install
```

Configure environment variables (local `.env` or Netlify UI):

- `GOOGLE_CLIENT_ID` – Google Sign-In web OAuth client ID.
- `GDRIVE_CLIENT_ID` / `GDRIVE_CLIENT_SECRET` – Drive OAuth web client credentials for Netlify Functions.
- `ALLOWED_EMAIL` – Comma-separated list of Google accounts allowed to sign in.
- `NETLIFY_SITE_ID` / `NETLIFY_AUTH_TOKEN` – Required for Netlify Blobs access outside of the production context.
- Optional helpers: `GDRIVE_REDIRECT_URI`, `GOOGLE_REDIRECT_URI`, `SITE_ID`, `UPTIME_ROBOT_API_KEY`.

See `plans/GOOGLE_DRIVE_SETUP.md` for a step-by-step walkthrough and `plans/SETUP.md` for the older vanilla guidance (still useful for user education).

### Local Sign-In Bypass (localhost only)

Provide the following to skip Google FedCM prompts while developing:

- `LOCAL_DEV_BYPASS_SECRET` – random hex string (the “are you sure?” guard).
- `LOCAL_DEV_BYPASS_EMAIL`, `LOCAL_DEV_BYPASS_NAME`, `LOCAL_DEV_BYPASS_PICTURE` – mocked identity used by the login screen.

Hold **Option/Alt** while clicking “Sign in with Google” to reset cached secrets. The bypass is ignored outside `localhost`/`127.0.0.1`.

## Running the App

```bash
# Launch Vite + Netlify Functions together on port 8888
npm run dev:functions

# Or just the Vite client (API calls hit deployed Netlify functions)
npm run dev
```

Visit `http://localhost:8888`. The Drive auth callback must be registered in Google Cloud as `http://localhost:8888/.netlify/functions/drive-auth-callback`.

### Testing Commands

- `npm run test` – unit + integration suites (Vitest, runs once and exits).
- `npm run test:watch` – watch mode for development.
- `npm run test:coverage` – HTML + text coverage reports.
- `npm run test:e2e` – Playwright end-to-end tests (requires seeded Google credentials or MSW mocks).
- `npm run test:all` – Run all tests (unit/integration + e2e) sequentially.
- `npm run lint` / `npm run format` – ESLint and Prettier automation.

### Building & Deploying

```bash
npm run build            # tsc for functions + Vite SPA output in ./dist
netlify deploy --build   # manual deploy (requires NETLIFY_AUTH_TOKEN / NETLIFY_SITE_ID)
```

Production builds publish the React SPA to `/` and continue to serve the vanilla rollout at `/vanilla-app/` for parity checks. The React docs page is available at `/docs` (redirects from `/docs.html`).

## Directory Guide

- `src/` – React application (Routing, hooks, Zustand stores, TipTap editor, Material UI composition).
  - `src/app/` – Application entry point, routing configuration, and query client setup.
  - `src/components/` – React components organized by feature (auth, docs, editor, stories, settings, etc.).
  - `src/services/jsonStorage/` – JSON file save/read utilities for snippet content.
  - `src/services/localFileStorage/` – Local file system integration for importing and editing local-first projects (direct file editing, `.yarnyignore` support, metadata management).
  - `src/services/localFs/` – Local backup mirroring service for Drive projects (separate from local-first projects).
  - `src/services/serviceWorker/` – Service Worker registration for background sync.
  - `src/hooks/` – Custom React hooks for data fetching, auth, and UI state.
  - `src/store/` – Zustand stores for application state management.
- `netlify/functions/` – TypeScript + JS handlers wrapping Drive/Docs APIs, auth, logout, uptime integrations.
  - `sync-json-to-gdoc-background.ts` – Background function for syncing JSON files to Google Docs.
- `public/service-worker.js` – Service Worker for background sync (runs independently of page).
- `tests/` – Vitest suites (unit, integration), Playwright specs, shared testing utilities.
  - `tests/e2e/` – End-to-end tests using Playwright.
  - `tests/integration/` – Integration tests for services and API interactions.
  - `tests/utils/` – Shared test utilities and mocks.
- `archive/` – Legacy app, documentation snapshots, migration plan, and the original vanilla assets.
- `plans/` – Planning docs, architecture documentation, and ongoing project plans.
  - `JSON_PRIMARY_ARCHITECTURE.md` – Architecture documentation for JSON primary system.
  - `JSON_PRIMARY_TESTING.md` – Testing guide for JSON primary features.
  - `LOCAL_SAVE_FEATURE_PLAN.md` – Local backup feature implementation plan.
- `scripts/` – Developer utilities (data seeding, corpus generation, etc.).
- `reference-docs/` – Screenshots and PDFs used during UX validation.

## Helpful Documentation

- **User Guide**: Visit `/docs` in the running application for the complete user guide (also available at `/docs.html`).
- **Plans Folder** (`plans/`) – Architecture documentation, testing guides, and ongoing project plans:
  - `plans/GOOGLE_DRIVE_SETUP.md` – Step-by-step guide for creating Google Cloud OAuth clients, enabling APIs, configuring consent screens, and setting up credentials for both Sign-In and Drive server authentication.
  - `plans/LOCAL_PROJECT_SETUP.md` – Guide for organizing local novel projects to work with Yarny, including project structure, `.yarnyignore` patterns, and instructions for Cursor/AI assistants.
  - `plans/DEPLOY.md` – Netlify deployment checklist and environment configuration tips (note: some content may be outdated; see main README for current deployment steps).
  - `plans/JSON_PRIMARY_ARCHITECTURE.md` – Complete architecture documentation for the JSON primary storage system, including design decisions, implementation phases, file structure, sync mechanisms, and conflict detection strategies.
  - `plans/JSON_PRIMARY_TESTING.md` – Testing strategies and guidelines specifically for JSON primary features, including unit tests, integration tests, and E2E scenarios.
  - `plans/LOCAL_SAVE_FEATURE_PLAN.md` – Implementation plan for local filesystem backups using the File System Access API, including architecture, user experience flows, and technical specifications.
  - `plans/TEST_COVERAGE_GAPS.md` – Analysis identifying components, hooks, and services that could benefit from additional test coverage, prioritized by importance.
  - `plans/SETUP.md` – Legacy user-facing onboarding documentation (outdated; kept for historical reference).
- `tests/README.md` – Notes on automated test structure and how to extend coverage.
- `agents.md` – Guidelines for AI agents and automated tools working in this repository.

## Support & Troubleshooting

- **Drive connection issues**: Re-authorize in Settings → Storage → "Reconnect".
- **Local backups**: Ensure the browser supports the File System Access API (Chrome/Edge recommended) and grant folder access in Settings → Storage.
- **Sync status**: Check the sync status indicator in the editor footer to see when changes are synced to Google Docs.
- **Conflict detection**: If Google Docs are modified externally, Yarny will prompt you to resolve conflicts when you open the snippet.
- **Error logging**: Run `viewYarnyErrors()` in the browser console to review the persisted error log; `clearYarnyErrors()` wipes it.
- **Adding a user**: Update `ALLOWED_EMAIL` in Netlify environment variables, redeploy, and have the new user sign in.
- **Testing**: See `agents.md` for guidelines on running tests in automated contexts (always use non-watch mode).

## License

MIT

