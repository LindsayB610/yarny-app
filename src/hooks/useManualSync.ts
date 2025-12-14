import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { useActiveStory } from "./useActiveStory";
import { apiClient } from "../api/client";
import { listAllDriveFiles } from "../api/listAllDriveFiles";
import { readSnippetJson, writeSnippetJson } from "../services/jsonStorage";
import { useYarnyStore } from "../store/provider";
import { selectStorySnippets } from "../store/selectors";

/**
 * Hook for manual story-level sync
 * Syncs all snippets in the active story from JSON to Google Docs
 */
export function useManualSync() {
  const queryClient = useQueryClient();
  const story = useActiveStory();
  const projects = useYarnyStore((state) => state.entities.projects);
  const snippets = useYarnyStore((state) => 
    story ? selectStorySnippets(state, story.id) : []
  );

  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!story) {
        throw new Error("No active story");
      }

      // Check if this is a local project - sync only works for Drive projects
      const project = projects[story.projectId];
      if (project?.storageType === "local") {
        throw new Error("Sync is not available for local projects. Local projects save automatically.");
      }

      const storyId = story.id;
      const files = await listAllDriveFiles(storyId);
      const fileMap = new Map<string, (typeof files)[number]>();
      for (const file of files) {
        if (file.name) {
          fileMap.set(file.name, file);
        }
      }

      // Read data.json to get snippet structure
      const dataFile = fileMap.get("data.json");
      if (!dataFile?.id) {
        throw new Error("Story data.json not found");
      }

      const dataContent = await apiClient.readDriveFile({ fileId: dataFile.id });
      if (!dataContent.content) {
        throw new Error("Story data.json is empty");
      }

      const parsedData = JSON.parse(dataContent.content) as {
        groups?: Record<string, { driveFolderId?: string }>;
        snippets?: Record<string, { driveFileId?: string; groupId?: string; chapterId?: string }>;
      };

      const groups = parsedData.groups ?? {};
      const snippetsData = parsedData.snippets ?? {};

      // Sync each snippet
      const syncPromises: Promise<void>[] = [];

      for (const snippet of snippets) {
        const snippetData = snippetsData[snippet.id];
        if (!snippetData?.driveFileId) {
          continue;
        }

        const chapterId = snippetData.groupId ?? snippetData.chapterId;
        const chapter = chapterId ? groups[chapterId] : null;
        const parentFolderId = chapter?.driveFolderId ?? storyId;

        // Read JSON file
        const jsonData = await readSnippetJson(snippet.id, parentFolderId);
        if (!jsonData) {
          continue; // Skip if JSON doesn't exist
        }

        // Sync to Google Doc via background function
        syncPromises.push(
          fetch("/.netlify/functions/sync-json-to-gdoc-background", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              snippetId: snippet.id,
              content: jsonData.content,
              gdocFileId: snippetData.driveFileId,
              parentFolderId
            }),
            credentials: "include"
          })
            .then((response) => {
              if (!response.ok) {
                throw new Error(`Sync failed: ${response.statusText}`);
              }
              return response.json();
            })
            .then((result) => {
              // Update JSON file with new GDoc modifiedTime
              if (result.modifiedTime) {
                return writeSnippetJson(
                  snippet.id,
                  jsonData.content,
                  parentFolderId,
                  snippetData.driveFileId,
                  result.modifiedTime
                );
              }
            })
        );
      }

      await Promise.allSettled(syncPromises);

      // Invalidate queries to refresh UI
      void queryClient.invalidateQueries({ queryKey: ["snippet"] });
      void queryClient.invalidateQueries({ queryKey: ["drive", "file"] });
      void queryClient.invalidateQueries({ queryKey: ["snippet-json"] });

      // Update sync status
      localStorage.setItem("yarny_last_sync_time", new Date().toISOString());
      localStorage.removeItem("yarny_sync_error");
      window.dispatchEvent(new CustomEvent("yarny:sync-success"));
    }
  });

  const sync = useCallback(async () => {
    try {
      window.dispatchEvent(new CustomEvent("yarny:sync-start"));
      await syncMutation.mutateAsync();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      window.dispatchEvent(
        new CustomEvent("yarny:sync-error", {
          detail: { error: errorMessage }
        })
      );
      throw error;
    }
  }, [syncMutation]);

  return {
    sync,
    isSyncing: syncMutation.isPending,
    error: syncMutation.error
  };
}




