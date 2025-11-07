import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { apiClient } from "../api/client";
import type { DriveDeleteStoryRequest } from "../api/contract";
import { useYarnyStore } from "../store/provider";
import { selectActiveStory } from "../store/selectors";
import type { StoryMetadata } from "../utils/storyCreation";
import { initializeStoryStructure } from "../utils/storyCreation";

/**
 * Helper function to read data.json from a story folder
 */
async function readDataJson(storyFolderId: string): Promise<{
  data: any;
  fileId: string;
}> {
  // List files in the story folder
  const filesResponse = await apiClient.listDriveFiles({
    folderId: storyFolderId
  });

  const dataJsonFile = filesResponse.files?.find((file) => file.name === "data.json");
  if (!dataJsonFile) {
    throw new Error("data.json not found in story folder");
  }

  // Read data.json
  const dataContent = await apiClient.readDriveFile({ fileId: dataJsonFile.id });
  if (!dataContent.content) {
    throw new Error("data.json is empty");
  }

  const data = JSON.parse(dataContent.content);
  return { data, fileId: dataJsonFile.id };
}

/**
 * Helper function to write data.json to a story folder
 */
async function writeDataJson(
  storyFolderId: string,
  data: any,
  fileId?: string
): Promise<void> {
  const content = JSON.stringify(data, null, 2);

  if (fileId) {
    // Update existing file
    await apiClient.writeDriveFile({
      fileId,
      fileName: "data.json",
      content,
      parentFolderId: storyFolderId
    });
  } else {
    // Create new file
    await apiClient.writeDriveFile({
      fileName: "data.json",
      content,
      parentFolderId: storyFolderId
    });
  }
}

/**
 * Hook for creating a new story
 * This orchestrates multiple Drive API calls to create the story structure
 */
export function useCreateStory() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (params: {
      storyName: string;
      metadata?: StoryMetadata;
    }) => {
      // Get or create Yarny Stories folder
      const yarnyFolder = await apiClient.getOrCreateYarnyStories();

      // Create story folder
      const storyFolder = await apiClient.createDriveFolder({
        name: params.storyName,
        parentFolderId: yarnyFolder.id
      });

      // Initialize story structure (project.json, data.json, goal.json, folders)
      try {
        await initializeStoryStructure(storyFolder.id, params.metadata);
      } catch (error) {
        // Check if this is a scope issue that requires re-authorization
        if (
          error instanceof Error &&
          ((error as any).code === "MISSING_DOCS_SCOPE" ||
            (error as any).requiresReauth ||
            error.message.includes("MISSING_DOCS_SCOPE"))
        ) {
          // Redirect to Drive auth
          window.location.href = "/.netlify/functions/drive-auth";
          // Return null to indicate the operation was cancelled
          return null;
        }
        // For other errors, throw them
        throw error;
      }

      return storyFolder;
    },
    onSuccess: (data, variables) => {
      // If storyFolder is null, it means we redirected for re-auth
      if (data === null) {
        return;
      }

      // Invalidate stories query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["drive", "stories"] });
      queryClient.invalidateQueries({ queryKey: ["drive", "yarny-stories-folder"] });

      // Navigate to editor with the new story
      // Store story info for editor to use
      localStorage.setItem(
        "yarny_current_story",
        JSON.stringify({
          id: data.id,
          name: variables.storyName
        })
      );
      localStorage.setItem("yarny_newly_created_story", "true");
      navigate("/editor");
    }
  });
}

/**
 * Hook for deleting a story
 */
export function useDeleteStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: DriveDeleteStoryRequest) => {
      return apiClient.deleteStory(request);
    },
    onSuccess: () => {
      // Invalidate queries to refresh the stories list
      queryClient.invalidateQueries({ queryKey: ["drive", "stories"] });
      queryClient.invalidateQueries({ queryKey: ["drive", "yarny-stories-folder"] });
      // Also invalidate progress queries for all stories
      queryClient.invalidateQueries({ queryKey: ["drive", "story-progress"] });
    }
  });
}

/**
 * Hook for refreshing stories list
 */
export function useRefreshStories() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Invalidate all story-related queries to force refetch
      await queryClient.invalidateQueries({ queryKey: ["drive", "stories"] });
      await queryClient.invalidateQueries({ queryKey: ["drive", "yarny-stories-folder"] });
      await queryClient.invalidateQueries({ queryKey: ["drive", "story-progress"] });
      // Refetch immediately
      await queryClient.refetchQueries({ queryKey: ["drive", "stories"] });
    }
  });
}

/**
 * Hook for reordering chapters
 * Updates the position field in data.json groups
 */
export function useReorderChaptersMutation() {
  const queryClient = useQueryClient();
  const activeStory = useYarnyStore(selectActiveStory);
  const upsertEntities = useYarnyStore((state) => state.upsertEntities);

  return useMutation({
    mutationFn: async (newOrder: string[]) => {
      if (!activeStory) {
        throw new Error("No active story selected");
      }

      // Read current data.json
      const { data, fileId } = await readDataJson(activeStory.driveFileId);

      // Update group positions based on new order
      if (!data.groups) {
        throw new Error("No groups found in data.json");
      }

      newOrder.forEach((groupId, index) => {
        if (data.groups[groupId]) {
          data.groups[groupId].position = index;
        }
      });

      // Update project.json groupIds order
      // Read project.json to update groupIds
      const filesResponse = await apiClient.listDriveFiles({
        folderId: activeStory.driveFileId
      });
      const projectJsonFile = filesResponse.files?.find((file) => file.name === "project.json");
      if (projectJsonFile) {
        const projectContent = await apiClient.readDriveFile({ fileId: projectJsonFile.id });
        if (projectContent.content) {
          const project = JSON.parse(projectContent.content);
          project.groupIds = newOrder;
          project.updatedAt = new Date().toISOString();

          await apiClient.writeDriveFile({
            fileId: projectJsonFile.id,
            fileName: "project.json",
            content: JSON.stringify(project, null, 2),
            parentFolderId: activeStory.driveFileId
          });
        }
      }

      // Write updated data.json
      await writeDataJson(activeStory.driveFileId, data, fileId);

      // Update store with new chapter order
      const chapters = newOrder
        .map((id) => {
          const group = data.groups[id];
          if (!group) return null;
          return {
            id: group.id,
            storyId: activeStory.id,
            title: group.title,
            color: group.color,
            order: group.position,
            snippetIds: group.snippetIds || [],
            driveFolderId: group.driveFolderId,
            updatedAt: new Date().toISOString()
          };
        })
        .filter((c) => c !== null);

      upsertEntities({ chapters });
    },
    onSuccess: () => {
      // Invalidate story queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["drive", "story", activeStory?.id] });
      queryClient.invalidateQueries({ queryKey: ["drive", "story-progress", activeStory?.driveFileId] });
    }
  });
}

/**
 * Hook for reordering snippets within a chapter
 * Updates the snippet order in data.json groups
 */
export function useReorderSnippetsMutation() {
  const queryClient = useQueryClient();
  const activeStory = useYarnyStore(selectActiveStory);
  const upsertEntities = useYarnyStore((state) => state.upsertEntities);

  return useMutation({
    mutationFn: async ({
      chapterId,
      newOrder
    }: {
      chapterId: string;
      newOrder: string[];
    }) => {
      if (!activeStory) {
        throw new Error("No active story selected");
      }

      // Read current data.json
      const { data, fileId } = await readDataJson(activeStory.driveFileId);

      // Update snippet order in the group
      if (!data.groups || !data.groups[chapterId]) {
        throw new Error("Chapter not found in data.json");
      }

      data.groups[chapterId].snippetIds = newOrder;

      // Update snippet order numbers
      if (data.snippets) {
        newOrder.forEach((snippetId, index) => {
          if (data.snippets[snippetId]) {
            // Note: The order field might not exist in data.json format
            // We'll update it if it exists, otherwise rely on snippetIds array order
            if (data.snippets[snippetId].order !== undefined) {
              data.snippets[snippetId].order = index;
            }
          }
        });
      }

      // Write updated data.json
      await writeDataJson(activeStory.driveFileId, data, fileId);

      // Update store
      const chapter = data.groups[chapterId];
      if (chapter) {
        upsertEntities({
          chapters: [
            {
              id: chapter.id,
              storyId: activeStory.id,
              title: chapter.title,
              color: chapter.color,
              order: chapter.position || 0,
              snippetIds: newOrder,
              driveFolderId: chapter.driveFolderId,
              updatedAt: new Date().toISOString()
            }
          ]
        });
      }
    },
    onSuccess: () => {
      // Invalidate story queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["drive", "story", activeStory?.id] });
      queryClient.invalidateQueries({ queryKey: ["drive", "story-progress", activeStory?.driveFileId] });
    }
  });
}

/**
 * Hook for moving a snippet from one chapter to another
 * Updates both chapters' snippetIds and the snippet's groupId
 */
export function useMoveSnippetToChapterMutation() {
  const queryClient = useQueryClient();
  const activeStory = useYarnyStore(selectActiveStory);
  const upsertEntities = useYarnyStore((state) => state.upsertEntities);

  return useMutation({
    mutationFn: async ({
      snippetId,
      targetChapterId
    }: {
      snippetId: string;
      targetChapterId: string;
    }) => {
      if (!activeStory) {
        throw new Error("No active story selected");
      }

      // Read current data.json
      const { data, fileId } = await readDataJson(activeStory.driveFileId);

      if (!data.groups || !data.snippets) {
        throw new Error("Invalid data.json structure");
      }

      // Find source chapter (the one currently containing this snippet)
      let sourceChapterId: string | null = null;
      for (const [groupId, group] of Object.entries(data.groups)) {
        if (group.snippetIds && group.snippetIds.includes(snippetId)) {
          sourceChapterId = groupId;
          break;
        }
      }

      if (!sourceChapterId) {
        throw new Error("Snippet not found in any chapter");
      }

      if (!data.groups[targetChapterId]) {
        throw new Error("Target chapter not found");
      }

      // Remove snippet from source chapter
      if (data.groups[sourceChapterId].snippetIds) {
        data.groups[sourceChapterId].snippetIds = data.groups[sourceChapterId].snippetIds.filter(
          (id: string) => id !== snippetId
        );
      }

      // Add snippet to target chapter (at the end)
      if (!data.groups[targetChapterId].snippetIds) {
        data.groups[targetChapterId].snippetIds = [];
      }
      data.groups[targetChapterId].snippetIds.push(snippetId);

      // Update snippet's groupId
      if (data.snippets[snippetId]) {
        data.snippets[snippetId].groupId = targetChapterId;
      }

      // Move the snippet file in Drive if it has a driveFileId
      if (data.snippets[snippetId]?.driveFileId) {
        const snippetFileId = data.snippets[snippetId].driveFileId;
        const targetChapterFolderId = data.groups[targetChapterId].driveFolderId;

        // Use Drive API to move the file
        // Note: This requires a Drive API call to update the file's parent
        // For now, we'll update data.json and the file will be moved on next sync
        // TODO: Implement actual file move in Drive
      }

      // Write updated data.json
      await writeDataJson(activeStory.driveFileId, data, fileId);

      // Update store
      const sourceChapter = data.groups[sourceChapterId];
      const targetChapter = data.groups[targetChapterId];

      upsertEntities({
        chapters: [
          {
            id: sourceChapter.id,
            storyId: activeStory.id,
            title: sourceChapter.title,
            color: sourceChapter.color,
            order: sourceChapter.position || 0,
            snippetIds: sourceChapter.snippetIds || [],
            driveFolderId: sourceChapter.driveFolderId,
            updatedAt: new Date().toISOString()
          },
          {
            id: targetChapter.id,
            storyId: activeStory.id,
            title: targetChapter.title,
            color: targetChapter.color,
            order: targetChapter.position || 0,
            snippetIds: targetChapter.snippetIds || [],
            driveFolderId: targetChapter.driveFolderId,
            updatedAt: new Date().toISOString()
          }
        ],
        snippets: data.snippets[snippetId]
          ? [
              {
                id: snippetId,
                storyId: activeStory.id,
                chapterId: targetChapterId,
                order: (targetChapter.snippetIds?.length || 1) - 1,
                content: data.snippets[snippetId].body || "",
                driveFileId: data.snippets[snippetId].driveFileId,
                driveRevisionId: data.snippets[snippetId].driveRevisionId,
                updatedAt: new Date().toISOString()
              }
            ]
          : []
      });
    },
    onSuccess: () => {
      // Invalidate story queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["drive", "story", activeStory?.id] });
      queryClient.invalidateQueries({ queryKey: ["drive", "story-progress", activeStory?.driveFileId] });
    }
  });
}
