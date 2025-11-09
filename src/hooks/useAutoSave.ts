import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";

import { useNetworkStatus } from "./useNetworkStatus";
import { apiClient } from "../api/client";
import { mirrorStoryDocument } from "../services/localFs/localBackupMirror";

interface QueuedSave {
  fileId: string;
  content: string;
  timestamp: string;
  storyId?: string;
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
          const { fileId, content, timestamp, storyId } = entry as {
            fileId: unknown;
            content: unknown;
            timestamp: unknown;
            storyId?: unknown;
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
              storyId: typeof storyId === "string" ? storyId : undefined
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
    localBackupStoryId
  } = options;

  const queryClient = useQueryClient();
  const { isOnline } = useNetworkStatus();
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedContentRef = useRef<string>("");
  const queuedSaveRef = useRef<QueuedSave | null>(null);

  // Mutation for processing queued saves - uses React Query for proper error handling and retry logic
  const processQueuedSavesMutation = useMutation({
    mutationFn: async (save: QueuedSave) => {
      return apiClient.writeDriveFile({
        fileId: save.fileId,
        fileName: "", // Not needed for existing files
        content: save.content
      });
    },
    onSuccess: (_, save) => {
      // Invalidate relevant queries after successful save
      queryClient.invalidateQueries({ queryKey: ["snippet", save.fileId] });
      queryClient.invalidateQueries({ queryKey: ["drive", "file", save.fileId] });
    }
  });

  // Queue save for later when offline
  const queueSave = useCallback(
    (fileId: string, content: string) => {
      try {
        const queued = readQueuedSaves();
        const storyId = localBackupStoryId ?? fileId;
        queued.push({
          fileId,
          content,
          timestamp: new Date().toISOString(),
          storyId
        });
        localStorage.setItem("yarny_queued_saves", JSON.stringify(queued));
        const queuedEntry: QueuedSave = {
          fileId,
          content,
          timestamp: new Date().toISOString(),
          storyId
        };
        queuedSaveRef.current = queuedEntry;
        if (storyId) {
          void mirrorStoryDocument(storyId, content);
        }
      } catch (error) {
        console.error("Failed to queue save:", error);
      }
    },
    [localBackupStoryId]
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
            const storyId = save.storyId ?? save.fileId;
            if (storyId) {
              await mirrorStoryDocument(storyId, save.content);
            }
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
  }, [isOnline, processQueuedSavesMutation]);

  const saveMutation = useMutation({
    mutationFn: async (data: { fileId: string; content: string; storyId?: string }) => {
      return apiClient.writeDriveFile({
        fileId: data.fileId,
        fileName: "", // Not needed for existing files
        content: data.content
      });
    },
    onMutate: () => {
      onSaveStart?.();
    },
    onSuccess: async (_result, variables) => {
      lastSavedContentRef.current = content;
      onSaveSuccess?.();
      // Invalidate relevant queries
      if (fileId) {
        queryClient.invalidateQueries({ queryKey: ["snippet", fileId] });
      }
      const storyId = variables?.storyId ?? localBackupStoryId ?? fileId;
      if (storyId) {
        await mirrorStoryDocument(storyId, content);
      }
    },
    onError: (error: Error) => {
      onSaveError?.(error);
      // Queue save if offline
      if (!isOnline && fileId) {
        queueSave(fileId, content);
      }
    }
  });

  // Auto-save when content changes (debounced)
  useEffect(() => {
    if (!enabled || !fileId || content === lastSavedContentRef.current) {
      return;
    }

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      if (isOnline) {
        saveMutation.mutate({ fileId, content, storyId: localBackupStoryId ?? fileId });
      } else {
        queueSave(fileId, content);
      }
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [enabled, fileId, content, debounceMs, isOnline, saveMutation, queueSave]);

  // Save when tab becomes hidden (visibility change)
  useEffect(() => {
    if (!enabled || !fileId) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.hidden && content !== lastSavedContentRef.current) {
        if (isOnline) {
          saveMutation.mutate({ fileId, content, storyId: localBackupStoryId ?? fileId });
        } else {
          queueSave(fileId, content);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, fileId, content, isOnline, saveMutation, queueSave]);

  // Save before page unload
  useEffect(() => {
    if (!enabled || !fileId) {
      return;
    }

    const handleBeforeUnload = () => {
      if (content !== lastSavedContentRef.current) {
        // Queue save for when page reloads or user comes back
        // sendBeacon doesn't work well with POST requests that need authentication
        queueSave(fileId, content);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [enabled, fileId, content, isOnline, queueSave]);

  // Manual save function
  const save = useCallback(() => {
    if (!fileId) {
      return;
    }
    if (isOnline) {
      saveMutation.mutate({ fileId, content, storyId: localBackupStoryId ?? fileId });
    } else {
      queueSave(fileId, content);
    }
  }, [fileId, content, isOnline, saveMutation, queueSave]);

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

