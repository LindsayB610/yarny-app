import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import {
  readJsonFile,
  readProjectJson,
  type ProjectJson,
  writeJsonFile,
  writeProjectJson
} from "./useStoryMutations.helpers";
import { apiClient } from "../api/client";
import type { DriveDeleteStoryRequest } from "../api/contract";
import { mirrorGoalJsonWrite } from "../services/localFs/localBackupMirror";
import { getPersistedDirectoryHandle } from "../services/localFs/LocalFsCapability";
import { useLocalBackupStore } from "../store/localBackupProvider";
import { useYarnyStore } from "../store/provider";
import { selectActiveStory } from "../store/selectors";
import type { StoryMetadata } from "../utils/storyCreation";
import { initializeStoryStructure } from "../utils/storyCreation";
import { clearStoryProgress } from "../utils/storyProgressCache";

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
        if (error instanceof Error) {
          const scopedError = error as Error & { code?: string; requiresReauth?: boolean };
          const requiresReauth =
            scopedError.code === "MISSING_DOCS_SCOPE" ||
            scopedError.requiresReauth ||
            scopedError.message.includes("MISSING_DOCS_SCOPE");
          if (requiresReauth) {
            // Redirect to Drive auth
            window.location.href = "/.netlify/functions/drive-auth";
            // Return null to indicate the operation was cancelled
            return null;
          }
        }
        // For other errors, throw them
        throw error;
      }

      return storyFolder;
    },
    onSuccess: (data, _variables) => {
      // If storyFolder is null, it means we redirected for re-auth
      if (data === null) {
        return;
      }

      // Invalidate stories query to refresh the list
      void queryClient.invalidateQueries({ queryKey: ["drive", "stories"] });
      void queryClient.invalidateQueries({ queryKey: ["drive", "yarny-stories-folder"] });

      // Navigate to story editor - loader will redirect to first snippet
      void navigate(`/stories/${data.id}/snippets`);
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
      void queryClient.invalidateQueries({ queryKey: ["drive", "stories"] });
      void queryClient.invalidateQueries({ queryKey: ["drive", "yarny-stories-folder"] });
      // Also invalidate progress queries for all stories
      void queryClient.invalidateQueries({ queryKey: ["drive", "story-progress"] });
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

interface StoryMetadataUpdate {
  genre?: string;
  description?: string;
}

export function useUpdateStoryMetadataMutation() {
  const queryClient = useQueryClient();
  const activeStory = useYarnyStore(selectActiveStory);

  return useMutation({
    mutationFn: async (updates: StoryMetadataUpdate) => {
      if (!activeStory) {
        throw new Error("No active story selected");
      }

      const { project, fileId } = await readProjectJson(activeStory.driveFileId);

      const updatedProject: ProjectJson = {
        ...project,
        genre: updates.genre ?? "",
        description: updates.description ?? "",
        updatedAt: new Date().toISOString()
      };

      await writeProjectJson(activeStory.driveFileId, updatedProject, fileId);
    },
    onSuccess: () => {
      if (activeStory) {
        void queryClient.invalidateQueries({
          queryKey: ["drive", "story-metadata", activeStory.driveFileId]
        });
      }
    }
  });
}

interface GoalMetadata {
  target: number;
  deadline: string;
  writingDays?: boolean[];
  daysOff?: string[];
  mode?: "elastic" | "strict";
}

export function useUpdateStoryGoalsMutation() {
  const queryClient = useQueryClient();
  const activeStory = useYarnyStore(selectActiveStory);
  const localBackupRootHandle = useLocalBackupStore((state) => state.rootHandle);

  return useMutation({
    mutationFn: async ({
      wordGoal,
      goal
    }: {
      wordGoal: number;
      goal?: GoalMetadata;
    }) => {
      if (!activeStory) {
        throw new Error("No active story selected");
      }

      const isLocalProject = activeStory.id.startsWith("local-story_");
      
      // Handle local projects
      if (isLocalProject) {
        // Try to get root handle from local backup store first, then fall back to persisted handle
        const rootHandle = localBackupRootHandle ?? await getPersistedDirectoryHandle();
        if (!rootHandle) {
          throw new Error("No directory handle found for local project. Please ensure local backups are enabled or re-import the project.");
        }

        // Read yarny-project.json
        const projectData = await readJsonFile<ProjectJson>(rootHandle, "yarny-project.json");
        const updatedProject: ProjectJson = {
          ...(projectData || {}),
          wordGoal,
          updatedAt: new Date().toISOString()
        };

        // Write yarny-project.json
        await writeJsonFile(rootHandle, "yarny-project.json", updatedProject);

        // Write goal.json if goal is provided
        if (goal) {
          await writeJsonFile(rootHandle, "goal.json", goal);
        } else {
          // If no goal, write empty object
          await writeJsonFile(rootHandle, "goal.json", {});
        }

        clearStoryProgress(activeStory.driveFileId);
        return;
      }

      // Handle Drive projects
      const { project, fileId } = await readProjectJson(activeStory.driveFileId);
      const updatedProject: ProjectJson = {
        ...project,
        wordGoal,
        updatedAt: new Date().toISOString()
      };

      await writeProjectJson(activeStory.driveFileId, updatedProject, fileId);

      try {
        const goalContent = goal ? JSON.stringify(goal, null, 2) : "{}";
        await apiClient.writeDriveFile({
          fileName: "goal.json",
          content: goalContent,
          parentFolderId: activeStory.driveFileId
        });
        await mirrorGoalJsonWrite(activeStory.id, goalContent);
      } catch (_error) {
        console.warn("Failed to write goal.json (non-fatal):", _error);
      } finally {
        clearStoryProgress(activeStory.driveFileId);
      }
    },
    onSuccess: () => {
      if (activeStory) {
        void queryClient.invalidateQueries({
          queryKey: ["drive", "story-progress", activeStory.driveFileId]
        });
      }
    }
  });
}

// Re-export chapter mutations for backward compatibility
export {
  useCreateChapterMutation,
  useDeleteChapterMutation,
  useDuplicateChapterMutation,
  useRenameChapterMutation,
  useReorderChaptersMutation,
  useUpdateChapterColorMutation
} from "./useChapterMutations";

// Re-export snippet mutations for backward compatibility
export {
  useCreateSnippetMutation,
  useDeleteSnippetMutation,
  useDuplicateSnippetMutation,
  useMoveSnippetToChapterMutation,
  useRenameSnippetMutation,
  useReorderSnippetsMutation
} from "./useSnippetMutations";
