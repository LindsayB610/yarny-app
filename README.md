# Yarny – Modern Writing Workspace

> ⚠️ **Alpha status**: The React rewrite is actively evolving. Expect rapid iteration, occasional rough edges, and breaking changes while we finish the migration.

Yarny is a distraction-free writing environment that keeps your projects organized in Google Drive. Authors sign in with Google, manage stories, chapters, and snippets, and take advantage of inline goals, exports, and automated backups that mirror Drive content to the local filesystem.

**Access**: Yarny is invite-only. Email [lb@lindsaybrunner.com](mailto:lb@lindsaybrunner.com) with the Google account you plan to use.

## Highlights

- **Secure authentication** powered by Google Identity Services with multi-user allow-list support.
- **Google Drive + Docs integration** for automatic cloud persistence, export jobs, and conflict checks.
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

**Status**: ✅ Complete - All features implemented including migration system, conflict detection, sync status indicators, and manual sync controls. See `react-migration/JSON_PRIMARY_ARCHITECTURE.md` for technical details.

## Legacy Application Reference

The original vanilla HTML/JS implementation has been preserved for parity, audits, and regression reference:

- `archive/` contains the full legacy UI (docs, editor, stories) plus migration planning artifacts.
- `archive/vanilla-app/index.html` serves the historic single-page experience that once lived at `/vanilla-app/`.

During the migration phase these assets are published alongside the React app so internal testers can reference the legacy documentation (for example `/migration-plan/testing-workbook.html`). The source of truth still lives in `archive/`, which Vite now copies into the production bundle at build time.

## Prerequisites

- Node.js **>= 20** and npm **>= 8** (see `package.json` `engines` entry).
- Netlify account with a Personal Access Token (for local functions + production deploys).
- Google Cloud project with Drive and Docs APIs enabled and two OAuth clients (Sign-In + Drive server).
- Chromium-based browser (Chrome/Edge) recommended for enabling local filesystem backups.

## Quick Start

```bash
git clone https://github.com/YOUR_ORG/yarny-app.git
cd yarny-app
npm install
```

Configure environment variables (local `.env` or Netlify UI):

- `GOOGLE_CLIENT_ID` – Google Sign-In web OAuth client ID.
- `GDRIVE_CLIENT_ID` / `GDRIVE_CLIENT_SECRET` – Drive OAuth web client credentials for Netlify Functions.
- `ALLOWED_EMAIL` – Comma-separated list of Google accounts allowed to sign in.
- `NETLIFY_SITE_ID` / `NETLIFY_AUTH_TOKEN` – Required for Netlify Blobs access outside of the production context.
- Optional helpers: `GDRIVE_REDIRECT_URI`, `GOOGLE_REDIRECT_URI`, `SITE_ID`, `UPTIME_ROBOT_API_KEY`.

See `GOOGLE_DRIVE_SETUP.md` for a step-by-step walkthrough and `SETUP.md` for the older vanilla guidance (still useful for user education).

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

- `npm run test` – unit + integration suites (Vitest).
- `npm run test:watch` – watch mode.
- `npm run test:coverage` – HTML + text coverage reports.
- `npm run test:e2e` – Playwright tests (requires seeded Google credentials or MSW mocks).
- `npm run lint` / `npm run format` – ESLint and Prettier automation.

### Building & Deploying

```bash
npm run build            # tsc for functions + Vite SPA output in ./dist
netlify deploy --build   # manual deploy (requires NETLIFY_AUTH_TOKEN / NETLIFY_SITE_ID)
```

Production builds publish the React SPA to `/` and continue to serve the vanilla rollout at `/vanilla-app/` for parity checks.

## Directory Guide

- `src/` – React application (Routing, hooks, Zustand stores, TipTap editor, Material UI composition).
  - `src/services/jsonStorage/` – JSON file save/read utilities for snippet content.
  - `src/services/serviceWorker/` – Service Worker registration for background sync.
- `netlify/functions/` – TypeScript + JS handlers wrapping Drive/Docs APIs, auth, logout, uptime integrations.
  - `sync-json-to-gdoc-background.ts` – Background function for syncing JSON files to Google Docs.
- `public/service-worker.js` – Service Worker for background sync (runs independently of page).
- `tests/` – Vitest suites (unit, integration), Playwright specs, shared testing utilities.
- `archive/` – Legacy app, documentation snapshots, migration plan, and the original vanilla assets.
- `react-migration/` – Planning docs and audits that detail each phase of the React rewrite.
  - `JSON_PRIMARY_ARCHITECTURE.md` – Architecture documentation for JSON primary system.
  - `JSON_PRIMARY_TESTING.md` – Testing guide for JSON primary features.
- `scripts/` – Developer utilities (data seeding, corpus generation, etc.).
- `reference-docs/` – Screenshots and PDFs used during UX validation.

## Helpful Documentation

- `GOOGLE_DRIVE_SETUP.md` – Comprehensive OAuth credential setup guide.
- `DEPLOY.md` – Netlify deployment checklist and environment configuration tips.
- `react-migration/` folder – Phase-by-phase notes, testing matrices, and deployment handoffs.
  - `JSON_PRIMARY_ARCHITECTURE.md` – JSON primary architecture design and implementation status.
  - `JSON_PRIMARY_TESTING.md` – Testing guide for JSON primary features.
- `tests/README.md` – Notes on automated test structure and how to extend coverage.
- `SETUP.md` – Legacy onboarding steps for user-facing communication (kept for history).

## Support & Troubleshooting

- Drive calls fail? Re-authorize in Settings → Storage → “Reconnect”.
- Local backups disabled? Ensure the browser supports the File System Access API and grant folder access again.
- Need to inspect errors? Run `viewYarnyErrors()` in the browser console to review the persisted error log; `clearYarnyErrors()` wipes it.
- Adding a user? Update `ALLOWED_EMAIL` in Netlify, redeploy, and have the new user sign in.

## License

MIT

