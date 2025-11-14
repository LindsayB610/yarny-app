/* eslint-disable no-restricted-globals */
// Service Worker for background sync of JSON files to Google Docs

const CACHE_NAME = "yarny-sync-v1";
const SYNC_TAG = "sync-json-to-gdoc";
const BATCH_SIZE = 10;
const BATCH_WINDOW_MS = 5000; // 5 seconds

// Install event - cache resources
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Background sync event - sync JSON to Google Docs
self.addEventListener("sync", (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(syncJsonToGoogleDocs());
  }
});

// Read queued syncs from main thread via message (Service Workers can't access localStorage directly)
async function getQueuedSyncs() {
  return new Promise((resolve) => {
    // Request queued syncs from main thread
    self.clients.matchAll().then((clients) => {
      if (clients.length === 0) {
        resolve([]);
        return;
      }

      // Send request to main thread
      clients[0].postMessage({ type: "GET_QUEUED_SYNCS" });

      // Wait for response
      const handler = (event) => {
        if (event.data?.type === "QUEUED_SYNCS_RESPONSE") {
          self.removeEventListener("message", handler);
          resolve(event.data.syncs || []);
        }
      };

      self.addEventListener("message", handler);

      // Timeout after 5 seconds
      setTimeout(() => {
        self.removeEventListener("message", handler);
        resolve([]);
      }, 5000);
    });
  });
}

// Process syncs in batches
async function syncJsonToGoogleDocs() {
  try {
    const queuedSyncs = await getQueuedSyncs();
    if (queuedSyncs.length === 0) {
      return;
    }

    // Group syncs by timestamp (within 5s window) and process in batches of 10
    const batches = createBatches(queuedSyncs, BATCH_SIZE, BATCH_WINDOW_MS);

    for (const batch of batches) {
      const results = await Promise.allSettled(
        batch.map((sync) => syncSingleJsonToGdoc(sync))
      );

      // Track successful syncs
      const successfulSyncs = [];
      for (let i = 0; i < results.length; i++) {
        if (results[i].status === "fulfilled") {
          successfulSyncs.push(batch[i].id || batch[i].timestamp);
        }
      }

      // Clear only successful syncs
      if (successfulSyncs.length > 0) {
        await clearQueuedSyncs(successfulSyncs);
      }
    }

    // Notify main thread that all syncs completed
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ type: "SYNC_BATCH_COMPLETE" });
      });
    });
  } catch (error) {
    console.error("Background sync failed:", error);
    // Don't throw - let browser retry
  }
}

// Create batches from queued syncs
function createBatches(syncs, batchSize, windowMs) {
  if (syncs.length === 0) return [];

  // Sort by timestamp
  const sorted = [...syncs].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const batches = [];
  let currentBatch = [];
  let batchStartTime = null;

  for (const sync of sorted) {
    const syncTime = new Date(sync.timestamp).getTime();

    // Start new batch if:
    // - Current batch is empty
    // - Current batch is full (10 items)
    // - Sync is outside the 5s window
    if (
      currentBatch.length === 0 ||
      currentBatch.length >= batchSize ||
      (batchStartTime !== null &&
        syncTime - batchStartTime > windowMs)
    ) {
      if (currentBatch.length > 0) {
        batches.push(currentBatch);
      }
      currentBatch = [sync];
      batchStartTime = syncTime;
    } else {
      currentBatch.push(sync);
    }
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
}

// Sync a single JSON file to Google Doc
async function syncSingleJsonToGdoc(sync) {
  try {
    // Notify main thread that sync started
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ type: "SYNC_START", snippetId: sync.snippetId });
      });
    });

    // Call Netlify function to sync JSON to Google Doc
    const response = await fetch("/.netlify/functions/sync-json-to-gdoc-background", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        snippetId: sync.snippetId,
        content: sync.content,
        gdocFileId: sync.gdocFileId,
        parentFolderId: sync.parentFolderId
      }),
      credentials: "include"
    });

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.statusText}`);
    }

    const result = await response.json();

    // Notify main thread that sync succeeded
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ type: "SYNC_SUCCESS", snippetId: sync.snippetId });
      });
    });

    return result;
  } catch (error) {
    console.error(`Failed to sync snippet ${sync.snippetId}:`, error);
    
    // Notify main thread that sync failed
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: "SYNC_ERROR",
          snippetId: sync.snippetId,
          error: error.message || String(error)
        });
      });
    });

    throw error;
  }
}

// Clear processed syncs by requesting main thread to remove them
async function clearQueuedSyncs(ids) {
  return new Promise((resolve) => {
    self.clients.matchAll().then((clients) => {
      if (clients.length > 0) {
        clients[0].postMessage({
          type: "CLEAR_QUEUED_SYNCS",
          ids: ids
        });
      }
      resolve(); // Don't wait for response
    });
  });
}

// Handle messages from main thread
self.addEventListener("message", (event) => {
  if (event.data?.type === "GET_QUEUED_SYNCS") {
    // Request will be handled by main thread via postMessage
    // Service Worker can't access localStorage directly
  }
});

