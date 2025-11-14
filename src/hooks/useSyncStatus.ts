import { useEffect, useState, useCallback } from "react";

import type { SyncStatus } from "../components/story/SyncStatusIndicator";

interface QueuedSync {
  snippetId: string;
  content: string;
  gdocFileId: string;
  parentFolderId: string;
  timestamp: string;
}

/**
 * Hook to track sync status for background JSON → GDoc syncs
 */
export function useSyncStatus(): {
  status: SyncStatus;
  lastSyncedAt: string | undefined;
  errorMessage: string | undefined;
  retry: () => void;
} {
  const [status, setStatus] = useState<SyncStatus>("synced");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const readQueuedSyncs = useCallback((): QueuedSync[] => {
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
  }, []);

  const updateStatus = useCallback(() => {
    const queued = readQueuedSyncs();
    const lastSyncTime = localStorage.getItem("yarny_last_sync_time");
    const syncError = localStorage.getItem("yarny_sync_error");

    if (syncError) {
      setStatus("failed");
      setErrorMessage(syncError);
      setLastSyncedAt(lastSyncTime || undefined);
    } else if (queued.length > 0) {
      setStatus("pending");
      setErrorMessage(undefined);
      setLastSyncedAt(lastSyncTime || undefined);
    } else if (lastSyncTime) {
      setStatus("synced");
      setErrorMessage(undefined);
      setLastSyncedAt(lastSyncTime);
    } else {
      setStatus("synced");
      setErrorMessage(undefined);
      setLastSyncedAt(undefined);
    }
  }, [readQueuedSyncs]);

  useEffect(() => {
    updateStatus();

    // Listen for sync events from Service Worker
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === "SYNC_START") {
        setStatus("syncing");
      } else if (event.data?.type === "SYNC_SUCCESS") {
        setLastSyncedAt(new Date().toISOString());
        localStorage.setItem("yarny_last_sync_time", new Date().toISOString());
        localStorage.removeItem("yarny_sync_error");
        updateStatus();
      } else if (event.data?.type === "SYNC_ERROR") {
        setStatus("failed");
        setErrorMessage(event.data.error);
        localStorage.setItem("yarny_sync_error", event.data.error);
        updateStatus();
      } else if (event.data?.type === "SYNC_BATCH_COMPLETE") {
        updateStatus();
      }
    };

    // Listen for custom events (for manual sync)
    const handleSyncStart = () => {
      setStatus("syncing");
    };

    const handleSyncSuccess = () => {
      setLastSyncedAt(new Date().toISOString());
      localStorage.setItem("yarny_last_sync_time", new Date().toISOString());
      localStorage.removeItem("yarny_sync_error");
      updateStatus();
    };

    const handleSyncError = (event: CustomEvent<{ error: string }>) => {
      setStatus("failed");
      setErrorMessage(event.detail.error);
      localStorage.setItem("yarny_sync_error", event.detail.error);
      updateStatus();
    };

    navigator.serviceWorker?.addEventListener("message", handleServiceWorkerMessage);
    window.addEventListener("yarny:sync-start", handleSyncStart as EventListener);
    window.addEventListener("yarny:sync-success", handleSyncSuccess);
    window.addEventListener("yarny:sync-error", handleSyncError as EventListener);

    // Poll for status changes (fallback if events don't fire)
    const intervalId = setInterval(updateStatus, 5000);

    return () => {
      navigator.serviceWorker?.removeEventListener("message", handleServiceWorkerMessage);
      window.removeEventListener("yarny:sync-start", handleSyncStart as EventListener);
      window.removeEventListener("yarny:sync-success", handleSyncSuccess);
      window.removeEventListener("yarny:sync-error", handleSyncError as EventListener);
      clearInterval(intervalId);
    };
  }, [updateStatus]);

  const retry = useCallback(() => {
    localStorage.removeItem("yarny_sync_error");
    window.dispatchEvent(new CustomEvent("yarny:retry-queued-saves"));
    updateStatus();
  }, [updateStatus]);

  return {
    status,
    lastSyncedAt,
    errorMessage,
    retry
  };
}

