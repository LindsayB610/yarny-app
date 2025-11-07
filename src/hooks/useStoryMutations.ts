import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { apiClient } from "../api/client";
import type { DriveDeleteStoryRequest } from "../api/contract";
import type { StoryMetadata } from "../utils/storyCreation";
import { initializeStoryStructure } from "../utils/storyCreation";

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

