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
  /**
   * Check if a snippet has been modified in Drive since we last loaded it
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
        // List files in parent folder to get current metadata
        const filesResponse = await apiClient.listDriveFiles({
          folderId: parentFolderId
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
          // Read Drive content to compare
          const driveContentResponse = await apiClient.readDriveFile({
            fileId: driveFileId
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
    []
  );

  /**
   * Resolve conflict by using Drive content
   */
  const resolveConflictWithDrive = useCallback(
    async (driveFileId: string): Promise<string> => {
      const response = await apiClient.readDriveFile({ fileId: driveFileId });
      return response.content || "";
    },
    []
  );

  return {
    checkSnippetConflict,
    resolveConflictWithDrive
  };
}

