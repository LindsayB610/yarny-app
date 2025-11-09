# React App Deployment to `/react` Path - Setup Guide

**Date**: 2025-01-XX  
**Purpose**: Document the configuration for deploying the React app to `/react` path alongside the classic app

## Problem

When configuring the React app to be served at `/react`, we need to:
1. Build the React app with assets referenced as `/react/assets/...`
2. Place the React app files at `/react/index.html` in the published directory
3. Keep classic app files at the root (`/editor.html`, `/stories.html`, etc.)

## Solution

### 1. Vite Configuration (`vite.config.ts`)

```typescript
export default defineConfig({
  plugins: [react()],
  base: "/react/",  // All asset references will use /react/ prefix
  build: {
    outDir: "dist",  // Build to dist/, then post-build script moves React files
  },
  // ...
});
```

**What this does:**
- Builds React app to `dist/` directory
- All asset references in HTML use `/react/` prefix (e.g., `/react/assets/index.js`)
- HTML file is created at `dist/index.html`

### 2. Post-Build Script (`scripts/move-react-build.js`)

After Vite builds, this script:
1. Creates `dist/react/` directory
2. Moves `dist/index.html` → `dist/react/index.html`
3. Moves `dist/assets/` → `dist/react/assets/`
4. Leaves classic app files in `dist/` (editor.html, stories.html, etc.)

**Why this is needed:**
- Vite builds to `dist/` but we need React files at `dist/react/`
- Classic app files must remain at root level
- Netlify serves from `dist/` as root, so `dist/react/index.html` becomes `/react/index.html`

### 3. Build Script (`package.json`)

```json
{
  "scripts": {
    "build": "npm run build:functions && vite build && node scripts/move-react-build.js"
  }
}
```

**Build process:**
1. Build Netlify Functions
2. Build React app with Vite (outputs to `dist/`)
3. Run post-build script (moves React files to `dist/react/`)

### 4. Netlify Configuration (`netlify.toml`)

```toml
[build]
  command = "npm run build"
  publish = "dist"  # Netlify serves from dist/ as root

[[redirects]]
  from = "/react/*"
  to = "/react/index.html"
  status = 200
```

**What this does:**
- Netlify publishes `dist/` as the site root
- Redirects `/react/*` to `/react/index.html` (SPA routing)
- Classic app files remain accessible at root paths

### 5. React Router Configuration (`src/app/routes.tsx`)

```typescript
export const router = createBrowserRouter(
  [
    // ... routes
  ],
  {
    basename: "/react"  // All routes are relative to /react
  }
);
```

**What this does:**
- All React Router routes are prefixed with `/react`
- `/` becomes `/react/`
- `/editor` becomes `/react/editor`
- `/stories` becomes `/react/stories`

---

## Final Directory Structure

After build, `dist/` contains:

```
dist/
├── editor.html          # Classic app
├── stories.html         # Classic app
├── editor.css           # Classic app
├── editor.js            # Classic app
├── stories.css          # Classic app
├── stories.js           # Classic app
├── global.css           # Classic app
├── ... (other classic app files)
└── react/               # React app
    ├── index.html       # React app entry point
    └── assets/          # React app assets
        ├── index-*.js
        └── index-*.css
```

---

## URL Mapping

| File Path | URL | App |
|-----------|-----|-----|
| `dist/editor.html` | `/editor.html` | Classic |
| `dist/stories.html` | `/stories.html` | Classic |
| `dist/react/index.html` | `/react/` | React |
| `dist/react/index.html` | `/react/editor` | React |
| `dist/react/index.html` | `/react/stories` | React |
| `dist/react/assets/index.js` | `/react/assets/index.js` | React |

---

## Verification

After deployment, verify:

1. **Classic app works:**
   - ✅ `https://yarny.lindsaybrunner.com/editor.html` loads classic app
   - ✅ `https://yarny.lindsaybrunner.com/stories.html` loads classic app

2. **React app works:**
   - ✅ `https://yarny.lindsaybrunner.com/react/` loads React app
   - ✅ `https://yarny.lindsaybrunner.com/react/editor` loads React editor
   - ✅ `https://yarny.lindsaybrunner.com/react/stories` loads React stories page
   - ✅ Assets load correctly (check Network tab for `/react/assets/...`)

3. **No conflicts:**
   - ✅ Classic app files don't interfere with React app
   - ✅ React app doesn't interfere with classic app
   - ✅ Both apps can run simultaneously

---

## Troubleshooting

### Issue: React app assets return 404

**Cause**: Assets not moved to `dist/react/assets/`  
**Solution**: Check that post-build script ran successfully. Verify `dist/react/assets/` exists.

### Issue: React app shows blank page

**Cause**: React Router basename not configured  
**Solution**: Verify `basename: "/react"` is set in `createBrowserRouter`.

### Issue: Classic app broken after build

**Cause**: Post-build script moved wrong files  
**Solution**: Check script only moves `index.html` and `assets/`, not classic app files.

### Issue: Netlify redirect not working

**Cause**: Redirect rule order or path mismatch  
**Solution**: Ensure `/react/*` redirect comes before catch-all `/*` rule in `netlify.toml`.

---

## Testing Locally

To test the build locally:

```bash
# Build
npm run build

# Verify structure
ls -la dist/
ls -la dist/react/

# Test with local server
cd dist
python3 -m http.server 8000
# Or use: npx serve dist

# Visit:
# - http://localhost:8000/editor.html (classic)
# - http://localhost:8000/react/ (React)
```

---

## References

- Vite Base Path: https://vitejs.dev/config/shared-options.html#base
- React Router Basename: https://reactrouter.com/en/main/routers/create-browser-router
- Netlify Redirects: https://docs.netlify.com/routing/redirects/
- Post-Build Script: `scripts/move-react-build.js`




