import type { QueryClient } from "@tanstack/react-query";

import { apiClient } from "../api/client";
import { createDriveClient } from "../api/driveClient";

/**
 * Route loader for stories page - prefetches Yarny Stories folder and stories list
 */
export async function storiesLoader(queryClient: QueryClient) {
  // Prefetch Yarny Stories folder
  const yarnyStoriesPromise = queryClient.fetchQuery({
    queryKey: ["drive", "yarny-stories-folder"],
    queryFn: () => apiClient.getOrCreateYarnyStories()
  });

  // Prefetch stories list (will need folder ID from above)
  // For now, we'll use the drive client which handles the folder lookup internally
  const driveClient = createDriveClient();
  const projectsPromise = queryClient.fetchQuery({
    queryKey: ["drive", "projects"],
    queryFn: async () => {
      const normalized = await driveClient.listProjects();
      // The driveClient already handles upserting into the store via hooks
      // But in loaders, we need to manually update if needed
      return normalized;
    }
  });

  // Wait for both to complete
  await Promise.all([yarnyStoriesPromise, projectsPromise]);

  return {
    yarnyStoriesFolder: await yarnyStoriesPromise,
    projects: await projectsPromise
  };
}

/**
 * Route loader for editor page - prefetches Yarny Stories folder and project data
 */
export async function editorLoader(queryClient: QueryClient) {
  // Prefetch Yarny Stories folder
  const yarnyStoriesPromise = queryClient.fetchQuery({
    queryKey: ["drive", "yarny-stories-folder"],
    queryFn: () => apiClient.getOrCreateYarnyStories()
  });

  // Prefetch projects list
  const driveClient = createDriveClient();
  const projectsPromise = queryClient.fetchQuery({
    queryKey: ["drive", "projects"],
    queryFn: async () => {
      const normalized = await driveClient.listProjects();
      return normalized;
    }
  });

  await Promise.all([yarnyStoriesPromise, projectsPromise]);

  return {
    yarnyStoriesFolder: await yarnyStoriesPromise,
    projects: await projectsPromise
  };
}

