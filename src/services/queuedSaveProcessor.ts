import PQueue from "p-queue";

import { writeSnippetJson } from "./jsonStorage/jsonStorage";
import { apiClient } from "../api/client";
import { mirrorSnippetWrite, mirrorStoryDocument } from "./localFs/localBackupMirror";

interface QueuedSave {
  fileId: string;
  content: string;
  timestamp: string;
  storyId?: string;
  snippetId?: string;
  fileName?: string;
  mimeType?: string;
  parentFolderId?: string;
}

interface QueuedSync {
  snippetId: string;
  content: string;
  gdocFileId: string;
  parentFolderId: string;
  timestamp: string;
}

const readQueuedSaves = (): QueuedSave[] => {
  try {
    const raw = localStorage.getItem("yarny_queued_saves");
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((entry) => {
        if (
          entry &&
          typeof entry === "object" &&
          "fileId" in entry &&
          "content" in entry &&
          "timestamp" in entry
        ) {
          const { fileId, content, timestamp, storyId, snippetId, fileName, mimeType, parentFolderId } = entry as {
            fileId: unknown;
            content: unknown;
            timestamp: unknown;
            storyId?: unknown;
            snippetId?: unknown;
            fileName?: unknown;
            mimeType?: unknown;
            parentFolderId?: unknown;
          };
          if (
            typeof fileId === "string" &&
            typeof content === "string" &&
            typeof timestamp === "string"
          ) {
            return {
              fileId,
              content,
              timestamp,
              storyId: typeof storyId === "string" ? storyId : undefined,
              snippetId: typeof snippetId === "string" ? snippetId : undefined,
              fileName: typeof fileName === "string" ? fileName : undefined,
              mimeType: typeof mimeType === "string" ? mimeType : undefined,
              parentFolderId:
                typeof parentFolderId === "string" ? parentFolderId : undefined
            };
          }
        }
        return null;
      })
      .filter((entry): entry is QueuedSave => entry !== null);
  } catch (error) {
    console.error("Failed to parse queued saves:", error);
    return [];
  }
};

const readQueuedSyncs = (): QueuedSync[] => {
  try {
    const raw = localStorage.getItem("yarny_queued_syncs");
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const valid = parsed.filter((entry): entry is QueuedSync => {
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
        typeof entry.parentFolderId === "string" &&
        entry.gdocFileId !== "" // Filter out syncs with empty gdocFileId
      );
    });
    
    // Clean up invalid entries if we filtered any out
    if (valid.length < parsed.length) {
      localStorage.setItem("yarny_queued_syncs", JSON.stringify(valid));
      console.log("[queuedSaveProcessor] Cleaned up invalid sync entries:", {
        removed: parsed.length - valid.length,
        remaining: valid.length
      });
    }
    
    return valid;
  } catch (error) {
    console.error("Failed to parse queued syncs:", error);
    return [];
  }
};

// Create a queue instance for processing saves (concurrency: 1 to process one at a time)
const saveQueue = new PQueue({ concurrency: 1 });

/**
 * Process queued saves directly, bypassing all React hooks
 * This prevents side effects and loops
 */
export async function processQueuedSavesDirectly(): Promise<void> {
  const queued = readQueuedSaves();
  if (queued.length === 0) {
    return;
  }

  console.log("[queuedSaveProcessor] Processing queued saves:", queued.length);

  // Deduplicate: for snippet saves, keep only the most recent one
  const deduplicated: QueuedSave[] = [];
  const snippetSaves = new Map<string, QueuedSave>();
  
  for (const save of queued) {
    if (save.snippetId && save.storyId) {
      const key = `${save.storyId}:${save.snippetId}`;
      const existing = snippetSaves.get(key);
      if (!existing || save.timestamp > existing.timestamp) {
        snippetSaves.set(key, save);
      }
    } else {
      // Non-snippet saves: keep all (less common, don't deduplicate)
      deduplicated.push(save);
    }
  }
  
  // Add deduplicated snippet saves
  deduplicated.push(...Array.from(snippetSaves.values()));

  // Filter out invalid saves
  const validSaves = deduplicated.filter((save) => {
    if (!save.snippetId && (!save.fileId || save.fileId === "")) {
      console.log("[queuedSaveProcessor] Skipping queued save - no fileId for non-snippet save");
      return false;
    }
    return true;
  });

  if (validSaves.length === 0) {
    // Clear queue if no valid saves
    localStorage.removeItem("yarny_queued_saves");
    return;
  }

  console.log("[queuedSaveProcessor] Processing", validSaves.length, "valid saves");

  // Process saves one at a time using p-queue
  for (const save of validSaves) {
    await saveQueue.add(async () => {
      try {
        // Save to JSON file (fast, primary storage)
        if (save.snippetId && save.parentFolderId) {
          await writeSnippetJson(
            save.snippetId,
            save.content,
            save.parentFolderId,
            save.fileId || undefined, // gdocFileId (optional)
            undefined // gdocModifiedTime
          );

          // Queue Google Doc sync for background processing (only if we have a fileId)
          if (save.fileId) {
            const queuedSyncs = readQueuedSyncs();
            const sync: QueuedSync = {
              snippetId: save.snippetId,
              content: save.content,
              gdocFileId: save.fileId,
              parentFolderId: save.parentFolderId,
              timestamp: new Date().toISOString()
            };
            
            // Deduplicate syncs
            const existingIndex = queuedSyncs.findIndex(
              (q) => q.snippetId === sync.snippetId && q.gdocFileId === sync.gdocFileId
            );
            
            if (existingIndex >= 0) {
              const existing = queuedSyncs[existingIndex];
              if (sync.timestamp > existing.timestamp) {
                queuedSyncs[existingIndex] = sync;
              }
            } else {
              queuedSyncs.push(sync);
            }
            
            localStorage.setItem("yarny_queued_syncs", JSON.stringify(queuedSyncs));
            
            // Register background sync if Service Worker is available
            if ("serviceWorker" in navigator && "sync" in ServiceWorkerRegistration.prototype) {
              void navigator.serviceWorker.ready.then((registration) => {
                registration.sync.register("sync-json-to-gdoc").catch((error) => {
                  console.warn("Failed to register background sync:", error);
                });
              });
            }
          }
        } else {
          // Fallback for non-snippet saves (story documents, etc.) - requires fileId
          if (!save.fileId) {
            throw new Error("fileId is required for non-snippet saves");
          }
          
          await apiClient.writeDriveFile({
            fileId: save.fileId,
            fileName: save.fileName ?? "Yarny Auto Save",
            content: save.content,
            parentFolderId: save.parentFolderId,
            mimeType: save.mimeType ?? "application/vnd.google-apps.document"
          });
        }

        // Write local backup
        if (save.storyId && save.snippetId) {
          await mirrorSnippetWrite(save.storyId, save.snippetId, save.content);
        } else if (save.storyId) {
          await mirrorStoryDocument(save.storyId, save.content);
        }

        console.log("[queuedSaveProcessor] Processed save:", {
          snippetId: save.snippetId,
          contentLength: save.content.length
        });
      } catch (error) {
        console.error("[queuedSaveProcessor] Failed to process queued save:", error);
        throw error; // Re-throw to keep save in queue
      }
    });
  }

  // Clear queue after successful processing
  localStorage.removeItem("yarny_queued_saves");
  console.log("[queuedSaveProcessor] Cleared queued saves");
}

