import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useMemo } from "react";

import { useNetworkStatus } from "./useNetworkStatus";
import { apiClient } from "../api/client";
import { writeSnippetJson } from "../services/jsonStorage";
import { createLocalFileStorage } from "../services/localFileStorage/localFileStorage";
import {
  mirrorSnippetWrite,
  mirrorStoryDocument
} from "../services/localFs/localBackupMirror";
import { getPersistedDirectoryHandle } from "../services/localFs/LocalFsCapability";
import { useYarnyStore } from "../store/provider";

interface QueuedSave {
  fileId: string; // Empty string for JSON-only saves (snippets without Google Doc)
  content: string;
  timestamp: string;
  storyId?: string;
  snippetId?: string;
  fileName?: string;
  mimeType?: string;
  parentFolderId?: string;
  jsonFileId?: string; // JSON file ID for background sync
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
    const allSaves = parsed
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
    
    // Deduplicate: for snippet saves, keep only the most recent one
    const deduplicated: QueuedSave[] = [];
    const snippetSaves = new Map<string, QueuedSave>();
    
    for (const save of allSaves) {
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
    
    // Clean up localStorage if we removed duplicates
    if (deduplicated.length < allSaves.length) {
      localStorage.setItem("yarny_queued_saves", JSON.stringify(deduplicated));
    }
    
    return deduplicated;
  } catch (error) {
    console.error("Failed to parse queued saves:", error);
    return [];
  }
};

export interface AutoSaveOptions {
  enabled?: boolean;
  debounceMs?: number;
  onSaveStart?: () => void;
  onSaveSuccess?: () => void;
  onSaveError?: (error: Error) => void;
  localBackupStoryId?: string;
  localBackupSnippetId?: string;
  fileName?: string;
  mimeType?: string;
  parentFolderId?: string;
}

/**
 * Hook for visibility-gated auto-save functionality
 * Saves content when:
 * - User stops typing (debounced)
 * - Tab becomes hidden (visibility change)
 * - Window is about to close (beforeunload)
 * - Manual trigger
 */
export function useAutoSave(
  fileId: string | undefined,
  content: string,
  options: AutoSaveOptions = {}
) {
  const {
    enabled = true,
    debounceMs = 2000,
    onSaveStart,
    onSaveSuccess,
    onSaveError,
    localBackupStoryId,
    localBackupSnippetId,
    fileName: providedFileName,
    mimeType,
    parentFolderId
  } = options;

  const queryClient = useQueryClient();
  const { isOnline } = useNetworkStatus();
  // Access store selectors for local project detection (will be used in mutation function)
  const getProjects = useYarnyStore((state) => state.entities.projects);
  const getStories = useYarnyStore((state) => state.entities.stories);
  const getSnippets = useYarnyStore((state) => state.entities.snippets);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedContentRef = useRef<string>("");
  const queuedSaveRef = useRef<QueuedSave | null>(null);
  const pendingContentRef = useRef<string | null>(null);
  const currentItemIdRef = useRef<string>(""); // Track which item we're editing
  
  // Initialize lastSavedContentRef with initial content when switching to a new item
  // This ensures hasUnsavedChanges is false when content matches what was loaded
  // We track the item ID (fileId or snippetId) to detect when we switch items
  const currentItemId = fileId || localBackupSnippetId || "";
  useEffect(() => {
    // If we switched to a different item, initialize lastSavedContentRef with its content
    if (currentItemId && currentItemId !== currentItemIdRef.current) {
      lastSavedContentRef.current = content;
      currentItemIdRef.current = currentItemId;
    }
    // If this is the first time and we have content but no itemId yet, still initialize
    else if (!currentItemIdRef.current && content) {
      lastSavedContentRef.current = content;
    }
  }, [currentItemId, content, fileId, localBackupSnippetId]);

  const resolvedFileName = providedFileName ?? "Yarny Auto Save";
  const writeLocalBackup = useCallback(
    async (contentToPersist: string, storyId?: string, snippetId?: string) => {
      const targetStoryId = storyId ?? localBackupStoryId;
      const targetSnippetId = snippetId ?? localBackupSnippetId;
      if (targetStoryId && targetSnippetId) {
        await mirrorSnippetWrite(targetStoryId, targetSnippetId, contentToPersist);
      } else if (targetStoryId) {
        await mirrorStoryDocument(targetStoryId, contentToPersist);
      }
    },
    [localBackupStoryId, localBackupSnippetId]
  );

  type SavePayload = {
    fileId: string; // Empty string for JSON-only saves (snippets without Google Doc)
    content: string;
    storyId?: string;
    snippetId?: string;
    fileName?: string;
    mimeType?: string;
    parentFolderId?: string;
  };

  const buildPayload = useCallback(
    (contentValue: string, explicitFileId?: string): SavePayload | null => {
      const effectiveFileId = explicitFileId ?? fileId;
      
      // Check if this is a local project
      let isLocalProject = false;
      if (localBackupStoryId) {
        const story = getStories[localBackupStoryId];
        if (story) {
          const project = getProjects[story.projectId];
          isLocalProject = project?.storageType === "local" ?? false;
        }
      }
      
      // For local projects: just need snippetId and storyId
      // For Drive projects (JSON-primary storage): allow saving if we have snippetId and parentFolderId, even without fileId
      // For non-snippet saves: still require fileId
      if (isLocalProject) {
        if (!localBackupSnippetId || !localBackupStoryId) {
          return null;
        }
      } else if (!effectiveFileId && !(localBackupSnippetId && parentFolderId)) {
        return null;
      }
      
      return {
        fileId: effectiveFileId ?? "", // Empty string if no fileId (for JSON-only saves)
        content: contentValue,
        storyId: localBackupStoryId,
        snippetId: localBackupSnippetId,
        fileName: providedFileName,
        mimeType,
        parentFolderId: isLocalProject ? undefined : parentFolderId // Don't need parentFolderId for local projects
      };
    },
    [fileId, localBackupSnippetId, localBackupStoryId, parentFolderId, providedFileName, mimeType, getProjects, getStories]
  );

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
      }
      
      return valid;
    } catch (error) {
      console.error("Failed to parse queued syncs:", error);
      return [];
    }
  };

  // Queue Google Doc sync for background processing
  const queueGoogleDocSync = useCallback(
    (sync: QueuedSync) => {
      try {
        const queued = readQueuedSyncs();
        
        // Deduplicate: check if we already have a sync for this snippet
        // Keep only the most recent one (by timestamp)
        const existingIndex = queued.findIndex(
          (q) => q.snippetId === sync.snippetId && q.gdocFileId === sync.gdocFileId
        );
        
        if (existingIndex >= 0) {
          // Replace existing sync with newer one if this one is newer
          const existing = queued[existingIndex];
          if (sync.timestamp > existing.timestamp) {
            queued[existingIndex] = sync;
          } else {
            return; // Don't add duplicate
          }
        } else {
        queued.push(sync);
        }
        
        localStorage.setItem("yarny_queued_syncs", JSON.stringify(queued));
        
        // Register background sync if Service Worker is available
        if ("serviceWorker" in navigator && "sync" in ServiceWorkerRegistration.prototype) {
          navigator.serviceWorker.ready.then((registration) => {
            registration.sync.register("sync-json-to-gdoc").catch((error) => {
              console.warn("Failed to register background sync:", error);
            });
          });
        }
      } catch (error) {
        console.error("Failed to queue Google Doc sync:", error);
      }
    },
    []
  );

  // Note: Queued saves are now processed by queuedSaveProcessor.ts
  // which bypasses all hooks to prevent side effects and loops

  // Queue save for later when offline
  const queueSave = useCallback(
    (payload: SavePayload) => {
      try {
        const queued = readQueuedSaves();
        const queuedEntry: QueuedSave = {
          ...payload,
          timestamp: new Date().toISOString()
        };
        
        // Deduplicate: for snippet saves, keep only the most recent one
        if (payload.snippetId) {
          const existingIndex = queued.findIndex(
            (q) => q.snippetId === payload.snippetId && q.storyId === payload.storyId
          );
          
          if (existingIndex >= 0) {
            // Replace existing save with newer one
            queued[existingIndex] = queuedEntry;
          } else {
            queued.push(queuedEntry);
          }
        } else {
          // For non-snippet saves, just add (less common)
        queued.push(queuedEntry);
        }
        
        localStorage.setItem("yarny_queued_saves", JSON.stringify(queued));
        queuedSaveRef.current = queuedEntry;
        if (payload.storyId || localBackupStoryId) {
          void writeLocalBackup(
            payload.content,
            payload.storyId ?? localBackupStoryId,
            payload.snippetId ?? localBackupSnippetId
          );
        }
      } catch (error) {
        console.error("Failed to queue save:", error);
      }
    },
    [localBackupStoryId, localBackupSnippetId, writeLocalBackup]
  );

  // Process queued saves when coming back online (using direct processor to bypass hooks)
  useEffect(() => {
    if (!isOnline) {
      return;
    }

    // Use the direct processor to avoid hook side effects
    const processQueuedSaves = async () => {
      try {
        const { processQueuedSavesDirectly } = await import("../services/queuedSaveProcessor");
        await processQueuedSavesDirectly();
      } catch (error) {
        console.error("[useAutoSave] Failed to process queued saves:", error);
      }
    };

    processQueuedSaves();

    // Listen for manual retry event
    const handleRetry = () => {
      void processQueuedSaves();
    };
    window.addEventListener("yarny:retry-queued-saves", handleRetry);

    return () => {
      window.removeEventListener("yarny:retry-queued-saves", handleRetry);
    };
  }, [isOnline]);

  const saveMutation = useMutation({
    mutationFn: async (payload: SavePayload) => {
      // Guard: Don't save if content matches what we last saved
      // This prevents duplicate saves from multiple timers or race conditions
      if (payload.content === lastSavedContentRef.current) {
        // Throw a special error to indicate we skipped (onError won't be called for this)
        // We'll handle this in onSuccess by checking if content matches
        throw new Error("SKIP_SAVE_CONTENT_UNCHANGED");
      }
      
      // Check if this is a local project
      let isLocalProject = false;
      if (payload.storyId) {
        const story = getStories[payload.storyId];
        if (story) {
          const project = getProjects[story.projectId];
          isLocalProject = project?.storageType === "local" ?? false;
        }
      }
      
      // For local projects, save directly to local files
      if (isLocalProject && payload.snippetId && payload.storyId) {
        const snippet = getSnippets[payload.snippetId];
        if (!snippet) {
          throw new Error(`Snippet ${payload.snippetId} not found`);
        }
        
        const rootHandle = await getPersistedDirectoryHandle();
        if (!rootHandle) {
          throw new Error("No persisted directory handle found for local project");
        }
        
        const localStorage = createLocalFileStorage();
        await localStorage.saveSnippet(
          rootHandle,
          payload.storyId,
          snippet.chapterId,
          payload.snippetId,
          payload.content
        );
        
        // Return a mock response for consistency with Drive saves
        return {
          id: payload.snippetId,
          name: payload.fileName ?? resolvedFileName,
          modifiedTime: new Date().toISOString()
        };
      }
      
      // If this is a snippet save, save to JSON file (fast, primary storage)
      if (payload.snippetId && payload.parentFolderId) {
        const result = await writeSnippetJson(
          payload.snippetId,
          payload.content,
          payload.parentFolderId,
          payload.fileId || undefined, // gdocFileId (optional - can be empty string)
          undefined // gdocModifiedTime - will be updated after sync
        );
        
        // Queue Google Doc sync for background processing (only if we have a fileId)
        if (payload.fileId) {
        queueGoogleDocSync({
          snippetId: payload.snippetId,
          content: payload.content,
          gdocFileId: payload.fileId,
          parentFolderId: payload.parentFolderId,
          timestamp: new Date().toISOString()
        });
        }
        
        return {
          id: result.fileId,
          name: payload.fileName ?? resolvedFileName,
          modifiedTime: result.modifiedTime
        };
      }
      
      // Fallback for non-snippet saves (story documents, etc.) - requires fileId
      if (!payload.fileId) {
        throw new Error("fileId is required for non-snippet saves");
      }
      
      return apiClient.writeDriveFile({
        fileId: payload.fileId,
        fileName: payload.fileName ?? resolvedFileName,
        content: payload.content,
        parentFolderId: payload.parentFolderId ?? parentFolderId,
        mimeType: payload.mimeType ?? mimeType
      });
    },
    onMutate: () => {
      // Cancel any pending debounced saves - we're saving now
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      pendingContentRef.current = null;
      onSaveStart?.();
    },
    onSuccess: async (_result, variables) => {
      lastSavedContentRef.current = variables.content;
      pendingContentRef.current = null;
      onSaveSuccess?.();
      
      // Don't invalidate any queries - we just wrote the data, so we know what's in it
      // Invalidating queries causes unnecessary refetches which can trigger save loops
      // The JSON file cache is already updated via setQueryData in writeSnippetJson
      // For non-snippet saves, we also don't need to invalidate since we just wrote it
      
      await writeLocalBackup(variables.content, variables.storyId, variables.snippetId);
    },
    onError: (error: Error, variables) => {
      // Skip handling if this was a "skip save" error (content unchanged)
      if (error.message === "SKIP_SAVE_CONTENT_UNCHANGED") {
        return;
      }
      
      // Don't update lastSavedContentRef on error - the save failed
      // This allows retry logic to work correctly
      pendingContentRef.current = null;
      onSaveError?.(error);
      // Queue save if offline
      if (!isOnline && variables) {
        queueSave(variables);
      }
    }
  });

  // Auto-save when content changes (debounced)
  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Don't schedule a new save if one is already in progress
    if (saveMutation.isPending) {
      // Store the latest content to save after current save completes
      if (content !== lastSavedContentRef.current) {
        pendingContentRef.current = content;
      }
      return;
    }

    // If content matches what we last saved, no need to save
    if (content === lastSavedContentRef.current) {
      pendingContentRef.current = null;
      return;
    }

    const payload = buildPayload(content);
    if (!payload) {
      return;
    }

    // For JSON-primary storage, we can save even without fileId if we have snippetId and parentFolderId
    if (!payload.fileId && !payload.snippetId && !payload.parentFolderId) {
      return;
    }

    // Clear existing timer - collapse multiple pending saves into one
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    // Capture current content in closure for the timer
    const contentToSave = content;
    const timestampWhenScheduled = Date.now();

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      // Double-check that save is not in progress
      if (saveMutation.isPending) {
        debounceTimerRef.current = null;
        return;
      }
      
      // Check if content still differs (might have been saved by another mechanism)
      // Use strict comparison to ensure we're not saving the same content
      if (contentToSave === lastSavedContentRef.current) {
        debounceTimerRef.current = null;
        return;
      }
      
      // Additional check: if current content prop differs from what we're about to save,
      // it means content changed during debounce - don't save stale content
      if (content !== contentToSave) {
        debounceTimerRef.current = null;
        return;
      }
      
      const finalPayload = buildPayload(contentToSave);
      if (!finalPayload) {
        debounceTimerRef.current = null;
        return;
      }
      
      debounceTimerRef.current = null;
      
      if (isOnline) {
        saveMutation.mutate(finalPayload);
      } else {
        queueSave(finalPayload);
      }
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [enabled, content, debounceMs, isOnline, queueSave, buildPayload]);

  // Note: Removed the useEffect that checked for pending content after save
  // This was causing save loops. The main useEffect will handle content changes naturally.

  // Save when tab becomes hidden (visibility change)
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.hidden && content !== lastSavedContentRef.current) {
        const payload = buildPayload(content);
        if (!payload) {
          return;
        }
        if (isOnline) {
          saveMutation.mutate(payload);
        } else {
          queueSave(payload);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, content, isOnline, saveMutation, queueSave, buildPayload]);

  // Save before page unload
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleBeforeUnload = () => {
      if (content !== lastSavedContentRef.current) {
        const payload = buildPayload(content);
        if (!payload) {
          return;
        }
        // Queue save for when page reloads or user comes back
        // sendBeacon doesn't work well with POST requests that need authentication
        queueSave(payload);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [enabled, content, buildPayload, queueSave]);

  // Manual save function
  const save = useCallback(async () => {
    const payload = buildPayload(content);
    if (!payload) {
      return;
    }
    if (isOnline) {
      await saveMutation.mutateAsync(payload);
    } else {
      queueSave(payload);
    }
  }, [buildPayload, content, isOnline, queueSave, saveMutation]);

  const markAsSaved = useCallback(
    (savedContent?: string) => {
      lastSavedContentRef.current = savedContent ?? content;
    },
    [content]
  );

  return {
    save,
    isSaving: saveMutation.isPending,
    lastSavedContent: lastSavedContentRef.current,
    hasUnsavedChanges: content !== lastSavedContentRef.current,
    markAsSaved
  };
}

