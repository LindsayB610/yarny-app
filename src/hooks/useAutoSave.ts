import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";

import { useNetworkStatus } from "./useNetworkStatus";
import { apiClient } from "../api/client";
import {
  mirrorSnippetWrite,
  mirrorStoryDocument
} from "../services/localFs/localBackupMirror";
import {
  writeSnippetJson
} from "../services/jsonStorage";

interface QueuedSave {
  fileId: string;
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
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedContentRef = useRef<string>("");
  const queuedSaveRef = useRef<QueuedSave | null>(null);

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
    fileId: string;
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
      if (!effectiveFileId) {
        return null;
      }
      return {
        fileId: effectiveFileId,
        content: contentValue,
        storyId: localBackupStoryId,
        snippetId: localBackupSnippetId,
        fileName: providedFileName,
        mimeType,
        parentFolderId
      };
    },
    [fileId, localBackupStoryId, localBackupSnippetId, providedFileName, mimeType, parentFolderId]
  );

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
        queued.push(sync);
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

  // Mutation for processing queued saves - now saves to JSON files
  const processQueuedSavesMutation = useMutation({
    mutationFn: async (save: QueuedSave) => {
      // Save to JSON file (fast, primary storage)
      if (save.snippetId && save.parentFolderId) {
        const result = await writeSnippetJson(
          save.snippetId,
          save.content,
          save.parentFolderId,
          save.fileId, // gdocFileId
          undefined // gdocModifiedTime - will be updated after sync
        );
        
        // Queue Google Doc sync for background processing
        queueGoogleDocSync({
          snippetId: save.snippetId,
          content: save.content,
          gdocFileId: save.fileId,
          parentFolderId: save.parentFolderId,
          timestamp: new Date().toISOString()
        });
        
        return {
          id: result.fileId,
          name: save.fileName ?? resolvedFileName,
          modifiedTime: result.modifiedTime
        };
      }
      
      // Fallback for non-snippet saves (story documents, etc.)
      return apiClient.writeDriveFile({
        fileId: save.fileId,
        fileName: save.fileName ?? resolvedFileName,
        content: save.content,
        parentFolderId: save.parentFolderId ?? parentFolderId,
        mimeType: save.mimeType ?? mimeType
      });
    },
    onSuccess: async (_result, save) => {
      // Invalidate relevant queries after successful save
      if (save.snippetId) {
        queryClient.invalidateQueries({ queryKey: ["snippet", save.snippetId] });
        queryClient.invalidateQueries({ queryKey: ["snippet-json", save.snippetId] });
      }
      queryClient.invalidateQueries({ queryKey: ["drive", "file", save.fileId] });
      await writeLocalBackup(save.content, save.storyId, save.snippetId);
    }
  });

  // Queue save for later when offline
  const queueSave = useCallback(
    (payload: SavePayload) => {
      try {
        const queued = readQueuedSaves();
        const queuedEntry: QueuedSave = {
          ...payload,
          timestamp: new Date().toISOString()
        };
        queued.push(queuedEntry);
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

  // Process queued saves when coming back online
  useEffect(() => {
    if (!isOnline) {
      return;
    }

    const processQueuedSaves = async () => {
      try {
        const queued = readQueuedSaves();
        if (queued.length === 0) {
          return;
        }

        // Process saves one at a time using React Query mutation
        for (const save of queued) {
          try {
            await processQueuedSavesMutation.mutateAsync(save);
            await writeLocalBackup(
              save.content,
              save.storyId ?? localBackupStoryId,
              save.snippetId ?? localBackupSnippetId
            );
          } catch (error) {
            console.error("Failed to process queued save:", error);
            // Keep the save in queue if it fails
            continue;
          }
        }

        // Clear queue after successful processing
        localStorage.removeItem("yarny_queued_saves");
        queuedSaveRef.current = null;
      } catch (error) {
        console.error("Failed to process queued saves:", error);
      }
    };

    processQueuedSaves();

    // Listen for manual retry event
    const handleRetry = () => {
      processQueuedSaves();
    };
    window.addEventListener("yarny:retry-queued-saves", handleRetry);

    return () => {
      window.removeEventListener("yarny:retry-queued-saves", handleRetry);
    };
  }, [
    isOnline,
    processQueuedSavesMutation,
    writeLocalBackup,
    localBackupStoryId,
    localBackupSnippetId
  ]);

  const saveMutation = useMutation({
    mutationFn: async (payload: SavePayload) => {
      // If this is a snippet save, save to JSON file (fast, primary storage)
      if (payload.snippetId && payload.parentFolderId) {
        const result = await writeSnippetJson(
          payload.snippetId,
          payload.content,
          payload.parentFolderId,
          payload.fileId, // gdocFileId
          undefined // gdocModifiedTime - will be updated after sync
        );
        
        // Queue Google Doc sync for background processing
        queueGoogleDocSync({
          snippetId: payload.snippetId,
          content: payload.content,
          gdocFileId: payload.fileId,
          parentFolderId: payload.parentFolderId,
          timestamp: new Date().toISOString()
        });
        
        return {
          id: result.fileId,
          name: payload.fileName ?? resolvedFileName,
          modifiedTime: result.modifiedTime
        };
      }
      
      // Fallback for non-snippet saves (story documents, etc.) - keep existing behavior
      return apiClient.writeDriveFile({
        fileId: payload.fileId,
        fileName: payload.fileName ?? resolvedFileName,
        content: payload.content,
        parentFolderId: payload.parentFolderId ?? parentFolderId,
        mimeType: payload.mimeType ?? mimeType
      });
    },
    onMutate: () => {
      onSaveStart?.();
    },
    onSuccess: async (_result, variables) => {
      lastSavedContentRef.current = variables.content;
      onSaveSuccess?.();
      if (variables.snippetId) {
        queryClient.invalidateQueries({ queryKey: ["snippet", variables.snippetId] });
        queryClient.invalidateQueries({ queryKey: ["snippet-json", variables.snippetId] });
      }
      queryClient.invalidateQueries({ queryKey: ["drive", "file", variables.fileId] });
      await writeLocalBackup(variables.content, variables.storyId, variables.snippetId);
    },
    onError: (error: Error, variables) => {
      onSaveError?.(error);
      // Queue save if offline
      if (!isOnline && variables) {
        queueSave(variables);
      }
    }
  });

  // Auto-save when content changes (debounced)
  useEffect(() => {
    if (!enabled || content === lastSavedContentRef.current) {
      return;
    }

    const payload = buildPayload(content);
    if (!payload) {
      return;
    }

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      if (isOnline) {
        saveMutation.mutate(payload);
      } else {
        queueSave(payload);
      }
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [enabled, content, debounceMs, isOnline, saveMutation, queueSave, buildPayload]);

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

