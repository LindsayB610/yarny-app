import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { apiClient } from "../api/client";

export interface ConflictInfo {
  snippetId: string;
  localModifiedTime: string;
  driveModifiedTime: string;
  localContent: string;
  driveContent: string;
}

export interface ConflictResolution {
  action: "cancel" | "useLocal" | "useDrive";
}

/**
 * Hook for detecting conflicts between local and Drive content
 */
export function useConflictDetection() {
  const queryClient = useQueryClient();

  /**
   * Check if a snippet has been modified in Drive since we last loaded it
   * Uses React Query's fetchQuery to ensure proper caching and request deduplication
   */
  const checkSnippetConflict = useCallback(
    async (
      snippetId: string,
      localModifiedTime: string,
      driveFileId: string,
      parentFolderId: string
    ): Promise<ConflictInfo | null> => {
      if (!driveFileId || !parentFolderId) {
        return null;
      }

      try {
        // Use React Query's fetchQuery instead of direct API call
        // This ensures proper caching, request deduplication, and retry logic
        const filesResponse = await queryClient.fetchQuery({
          queryKey: ["drive", "files", parentFolderId],
          queryFn: () =>
            apiClient.listDriveFiles({
              folderId: parentFolderId
            }),
          staleTime: 30 * 1000 // 30 seconds - conflict checks need fresh data
        });

        const driveFile = filesResponse.files?.find((f) => f.id === driveFileId);

        if (!driveFile || !driveFile.modifiedTime) {
          return null;
        }

        const driveModifiedTime = driveFile.modifiedTime;
        const localTime = new Date(localModifiedTime).getTime();
        const driveTime = new Date(driveModifiedTime).getTime();

        // If Drive is newer, there's a potential conflict
        if (driveTime > localTime) {
          // Use React Query's fetchQuery to read Drive content
          const driveContentResponse = await queryClient.fetchQuery({
            queryKey: ["drive", "file", driveFileId],
            queryFn: () =>
              apiClient.readDriveFile({
                fileId: driveFileId
              }),
            staleTime: 30 * 1000 // 30 seconds - conflict checks need fresh data
          });

          return {
            snippetId,
            localModifiedTime,
            driveModifiedTime,
            localContent: "", // Will be provided by caller
            driveContent: driveContentResponse.content || ""
          };
        }

        return null;
      } catch (error) {
        console.error("Error checking conflict:", error);
        return null;
      }
    },
    [queryClient]
  );

  /**
   * Mutation for resolving conflict by using Drive content
   * Uses React Query mutation to ensure proper error handling and query invalidation
   */
  const resolveConflictMutation = useMutation({
    mutationFn: async (driveFileId: string) => {
      return apiClient.readDriveFile({ fileId: driveFileId });
    },
    onSuccess: (response, driveFileId) => {
      // Invalidate related queries after resolving conflict
      queryClient.invalidateQueries({ queryKey: ["drive", "file", driveFileId] });
      queryClient.invalidateQueries({ queryKey: ["snippet"] });
    }
  });

  /**
   * Resolve conflict by using Drive content
   */
  const resolveConflictWithDrive = useCallback(
    async (driveFileId: string): Promise<string> => {
      const response = await resolveConflictMutation.mutateAsync(driveFileId);
      return response.content || "";
    },
    [resolveConflictMutation]
  );

  return {
    checkSnippetConflict,
    resolveConflictWithDrive
  };
}

