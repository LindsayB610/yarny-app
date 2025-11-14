# Phase 1 Smoke Test Checklist

These manual checks validate the setup and infrastructure scaffolding before advancing to Phase 2.

## Local Development
- [ ] `npm run dev` launches the Vite dev server and renders the Yarny React shell.
- [ ] Project and story side rails render placeholder Drive data from `createDriveClient` fallback.
- [ ] Selecting a story loads the TipTap plain text editor with sample content.
- [ ] `npm run lint` executes without fatal errors.
- [ ] `npm run test` passes the default Vitest suite.

## Build & Deploy
- [ ] `npm run build` produces a `dist/` folder containing the React bundle.
- [ ] `netlify dev` runs successfully with the new build output.
- [ ] `netlify deploy --build` (or CI equivalent) emits the Vite build using the updated `netlify.toml`.

## Google Drive Integration Prep
- [ ] `test-corpus/README.md` steps completed and folder shared with team.
- [ ] Netlify environment variables include Drive client credentials plus `VITE_TEST_CORPUS_FOLDER_ID`.
- [ ] Drive API quotas reviewed; exponential backoff utilities ready to integrate.

## Editor Plain Text Discipline
- [ ] TipTap toolbar remains hidden; only plain text input is available.
- [ ] Copy/paste from Google Docs keeps paragraph and hard break fidelity.
- [ ] `extractPlainTextFromDocument` returns normalized text with Unix newlines.

## State Management
- [ ] Zustand store initializes without runtime warnings in strict mode.
- [ ] Derived selectors (`selectProjectSummaries`, `selectActiveStorySnippets`) yield expected results for sample data.
- [ ] Query cache invalidation runs after manual save to Drive (visible in React Query DevTools if enabled).

