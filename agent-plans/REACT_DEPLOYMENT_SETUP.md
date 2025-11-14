# React App Deployment at Root - Setup Guide

**Date**: 2025-01-XX  
**Purpose**: Document the configuration for serving the React app from the root path (`/`) while keeping the legacy vanilla experience available at `/vanilla-app/`.

## Problem

Moving the React build from the `/react` prefix to the root requires:
1. Root-relative asset URLs so the React bundle can live at `/`.
2. Removing the `/react`-specific build plumbing (Vite `base`, React Router `basename`, post-build move script).
3. Preserving the legacy vanilla app for reference without letting it overwrite the React build output.

## Solution

### 1. Vite Configuration (`vite.config.ts`)

```typescript
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist"
  },
  // ...
});
```

**What this does:**
- Builds the React app to `dist/`.
- Emits asset URLs that work from the site root (no `/react` prefix required).

### 2. Build Script (`package.json`)

```json
{
  "scripts": {
    "build": "npm run build:functions && vite build"
  }
}
```

**Build process:**
1. Compile Netlify Functions.
2. Build the React bundle with Vite (outputs to `dist/` with `index.html` at the root).

### 3. Netlify Configuration (`netlify.toml`)

```toml
[build]
  command = "npm run build"
  publish = "dist"
  functions = "netlify/functions"

[[redirects]]
  from = "/vanilla-app"
  to = "/vanilla-app/index.html"
  status = 200

[[redirects]]
  from = "/vanilla-app/*"
  to = "/vanilla-app/:splat"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**What this does:**
- Publishes the React bundle at the root (`/`).
- Keeps the legacy login shell accessible at `/vanilla-app/`.
- Retains the SPA fallback so React Router can handle client-side navigation.

### 4. React Router Configuration (`src/app/routes.tsx`)

```typescript
export const router = createBrowserRouter([
  // ... routes
]);
```

**What this does:**
- Removes the `/react` basename so routes like `/editor` and `/stories` resolve directly from the root.

## Final Directory Structure

After `npm run build`, `dist/` contains:

```
dist/
├── assets/               # React app assets
├── index.html            # React entry point
├── vanilla-app/
│   └── index.html        # Legacy login shell (reference archive)
├── app.js                # Legacy app JS (reference only)
├── editor.html           # Legacy editor shell
├── stories.html          # Legacy stories shell
└── ... (other legacy assets kept for archival parity)
```

## URL Mapping

| File Path                    | URL                              | Purpose  |
|-----------------------------|----------------------------------|----------|
| `dist/index.html`           | `/`                              | React    |
| `dist/index.html`           | `/editor`, `/stories`, etc.      | React    |
| `dist/assets/index.js`      | `/assets/index.js`               | React    |
| `dist/vanilla-app/index.html` | `/vanilla-app/`                | Legacy   |
| `dist/editor.html`          | `/editor.html` (optional)        | Legacy   |

## Verification

After deployment, verify:

1. **React app works:**
   - ✅ `https://yarny.lindsaybrunner.com/` loads the React login.
   - ✅ `/stories` and `/editor` load React routes with no 404s.
   - ✅ React assets load from `/assets/*`.

2. **Legacy bundle is quarantined:**
   - ✅ `/vanilla-app/` renders the classic login shell.
   - ✅ Direct legacy HTML endpoints (e.g., `/editor.html`) still load if kept for parity/rollback.

3. **Redirect hygiene:**
   - ✅ Visiting `/react/*` (if bookmarked) redirects to the new canonical routes.
   - ✅ SPA fallback still returns `index.html` for unknown routes.

## Troubleshooting

### React app serves blank page
- **Cause:** Cached assets built with `/react` base.
- **Fix:** Clear the CDN/browser cache and redeploy with the new build configuration.

### Legacy login overwrote React index
- **Cause:** `public/index.html` wasn't moved to `public/vanilla-app/index.html`.
- **Fix:** Ensure the legacy login lives under `public/vanilla-app/` before building.

### `/vanilla-app/` shows 404
- **Cause:** Redirect missing or legacy files excluded from `dist`.
- **Fix:** Double-check Netlify redirect rules and confirm the legacy files exist inside `dist/vanilla-app/`.

## Testing Locally

```bash
npm run build
cd dist
python3 -m http.server 8000
```

Visit:
- `http://localhost:8000/` → React app
- `http://localhost:8000/vanilla-app/` → Legacy login
- `http://localhost:8000/editor.html` → Legacy editor (if retained)

## References

- Vite Deployment Guide: https://vitejs.dev/guide/static-deploy.html
- React Router `createBrowserRouter`: https://reactrouter.com/en/main/routers/create-browser-router
- Netlify Redirects: https://docs.netlify.com/routing/redirects/




