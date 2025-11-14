# JSON Primary Architecture - Testing Guide

## What's Been Implemented

### ✅ Core Components
1. **JSON Storage Service** (`src/services/jsonStorage/`)
   - `writeSnippetJson()` - Save snippet content to JSON files
   - `readSnippetJson()` - Read snippet content from JSON files
   - `compareContent()` - Compare JSON vs GDoc content (normalized)
   - File naming: `.{snippetId}.yarny.json`

2. **Updated Auto-Save** (`src/hooks/useAutoSave.ts`)
   - Saves to JSON files first (fast, <50ms)
   - Queues Google Doc sync for background processing
   - Maintains backward compatibility for non-snippet saves

3. **Service Worker** (`public/service-worker.js`)
   - Background Sync API integration
   - Smart batching (5s window, 10 files per batch)
   - Processes queued syncs independently of page

4. **Netlify Background Function** (`netlify/functions/sync-json-to-gdoc-background.ts`)
   - Syncs JSON content to Google Docs
   - Runs for up to 15 minutes (independent of client)
   - Creates Google Docs if they don't exist

5. **Service Worker Registration** (`src/services/serviceWorker/`)
   - Auto-registers on app load
   - Checks for Background Sync API support

## Testing Checklist

### Unit Tests ✅
- [x] JSON storage utilities (`jsonStorage.test.ts`) - **6 tests passing**
- [x] Auto-save persistence (`useAutoSave.persistence.test.tsx`) - **10 tests passing**

### Manual Testing Steps

#### 1. Basic Save Flow
1. Open the app in browser
2. Open a story and start editing a snippet
3. Type some content
4. Wait 2 seconds (debounce)
5. **Expected**: Content saves to JSON file (check Network tab for `drive-write` with JSON mimeType)
6. **Expected**: Google Doc sync is queued (check localStorage for `yarny_queued_syncs`)

#### 2. Service Worker Registration
1. Open DevTools → Application → Service Workers
2. **Expected**: Service Worker registered at `/service-worker.js`
3. **Expected**: Status shows "activated and is running"

#### 3. Background Sync
1. Make edits to multiple snippets quickly (within 5 seconds)
2. Close the browser tab
3. Wait a few seconds
4. **Expected**: Service Worker processes queued syncs (check Network tab or console)
5. **Expected**: Google Docs are updated with JSON content

#### 4. Offline Behavior
1. Go offline (DevTools → Network → Offline)
2. Make edits to a snippet
3. **Expected**: Changes are queued in localStorage (`yarny_queued_saves`)
4. Go back online
5. **Expected**: Queued saves are processed automatically

#### 5. Browser Compatibility
- **Chrome/Edge**: Full support (Service Worker + Background Sync)
- **Firefox/Safari**: Falls back to Netlify Background Function
- **Expected**: Both paths work correctly

### Integration Testing

#### Test JSON File Creation
```bash
# After saving a snippet, verify JSON file exists in Drive
# File should be named: .{snippetId}.yarny.json
# Location: Same folder as snippet's Google Doc (chapter folder or story folder)
```

#### Test Background Sync
1. Make edits to snippet
2. Check localStorage: `yarny_queued_syncs` should contain sync entry
3. Wait for background sync (or trigger manually via DevTools)
4. Verify Google Doc is updated with JSON content

### Known Issues / TODO

1. **Snippet Loading**: Currently still loads from `data.json` - needs update to read from JSON files first
2. **Conflict Detection**: Not yet updated for JSON primary architecture
3. **Migration System**: Not yet implemented
4. **UI Components**: Sync status indicator and manual sync button not yet added
5. **Service Worker IndexedDB**: Currently falls back to localStorage - should use IndexedDB for better reliability

## Next Steps for Full Implementation

1. Update snippet loading to read from JSON files first
2. Add conflict detection with GDoc comparison
3. Implement migration system
4. Add UI components (sync status, manual sync button)
5. Update all tests for JSON primary architecture

## Debugging

### Check Service Worker Status
```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => console.log('SW:', reg.scope, reg.active?.state));
});
```

### Check Queued Syncs
```javascript
// In browser console
JSON.parse(localStorage.getItem('yarny_queued_syncs') || '[]')
```

### Manually Trigger Background Sync
```javascript
// In browser console (after Service Worker is registered)
navigator.serviceWorker.ready.then(reg => {
  reg.sync.register('sync-json-to-gdoc');
});
```

### Check Netlify Function Logs
```bash
# In Netlify dashboard or via CLI
netlify functions:log sync-json-to-gdoc-background
```

