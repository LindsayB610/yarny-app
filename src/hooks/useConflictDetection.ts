import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { apiClient } from "../api/client";
import { readSnippetJson, compareContent } from "../services/jsonStorage";

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
   * Check if a snippet has been modified in Drive since we last saved it to JSON
   * JSON Primary Architecture: Compares JSON file vs Google Doc modifiedTime and content
   */
  const checkSnippetConflict = useCallback(
    async (
      snippetId: string,
      localModifiedTime: string,
      driveFileId: string,
      parentFolderId: string,
      localContent?: string
    ): Promise<ConflictInfo | null> => {
      if (!driveFileId || !parentFolderId) {
        return null;
      }

      try {
        // Read JSON file (primary source)
        const jsonData = await readSnippetJson(snippetId, parentFolderId);
        const jsonModifiedTime = jsonData?.modifiedTime || localModifiedTime;
        const jsonContent = jsonData?.content || localContent || "";

        // Get Google Doc metadata
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
        const jsonTime = new Date(jsonModifiedTime).getTime();
        const driveTime = new Date(driveModifiedTime).getTime();

        // If Google Doc is newer, check if content differs
        if (driveTime > jsonTime) {
          // Read Google Doc content
          const driveContentResponse = await queryClient.fetchQuery({
            queryKey: ["drive", "file", driveFileId],
            queryFn: () =>
              apiClient.readDriveFile({
                fileId: driveFileId
              }),
            staleTime: 30 * 1000 // 30 seconds - conflict checks need fresh data
          });

          const driveContent = driveContentResponse.content || "";

          // Compare content (normalized) - only show conflict if content actually differs
          if (compareContent(jsonContent, driveContent)) {
            return {
              snippetId,
              localModifiedTime: jsonModifiedTime,
              driveModifiedTime,
              localContent: jsonContent,
              driveContent
            };
          }
        }

        return null;
      } catch (error) {
        if (process.env.NODE_ENV !== "test") {
          console.error("Error checking conflict:", error);
        }
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

