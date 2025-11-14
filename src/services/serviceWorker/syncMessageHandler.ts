/**
 * Handle Service Worker messages for sync operations
 * Service Workers can't access localStorage directly, so we handle it in the main thread
 */

interface QueuedSync {
  snippetId: string;
  content: string;
  gdocFileId: string;
  parentFolderId: string;
  timestamp: string;
}

export function setupSyncMessageHandler() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  const readQueuedSyncs = (): QueuedSync[] => {
    try {
      const raw = localStorage.getItem("yarny_queued_syncs");
      if (!raw) return [];
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((entry): entry is QueuedSync => {
        return (
          entry &&
          typeof entry === "object" &&
          "snippetId" in entry &&
          "content" in entry &&
          "gdocFileId" in entry &&
          "parentFolderId" in entry &&
          typeof entry.snippetId === "string" &&
          typeof entry.content === "string" &&
          typeof entry.gdocFileId === "string" &&
          typeof entry.parentFolderId === "string"
        );
      });
    } catch {
      return [];
    }
  };

  const clearQueuedSyncs = (ids: Array<string | number>) => {
    try {
      const queued = readQueuedSyncs();
      const filtered = queued.filter((sync) => {
        const syncId = sync.timestamp;
        return !ids.includes(syncId);
      });
      localStorage.setItem("yarny_queued_syncs", JSON.stringify(filtered));
    } catch (error) {
      console.error("Failed to clear queued syncs:", error);
    }
  };

  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type === "GET_QUEUED_SYNCS") {
      const syncs = readQueuedSyncs();
      const requestId = event.data.requestId;
      // Respond via postMessage to the service worker
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: "QUEUED_SYNCS_RESPONSE",
          requestId,
          syncs
        });
      }
    } else if (event.data?.type === "CLEAR_QUEUED_SYNCS") {
      clearQueuedSyncs(event.data.ids || []);
    }
  });
}




