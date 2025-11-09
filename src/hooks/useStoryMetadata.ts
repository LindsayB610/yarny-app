import { useQuery } from "@tanstack/react-query";

import { apiClient } from "../api/client";

import { extractStoryTitleFromMetadata } from "../utils/storyMetadata";

export interface StoryMetadataResult {
  title?: string;
  wordGoal?: number;
  genre?: string;
  description?: string;
  updatedAt?: string;
}

export function useStoryMetadata(storyFolderId: string | undefined) {
  return useQuery({
    queryKey: ["drive", "story-metadata", storyFolderId],
    enabled: Boolean(storyFolderId),
    queryFn: async (): Promise<StoryMetadataResult | null> => {
      if (!storyFolderId) {
        return null;
      }

      const filesResponse = await apiClient.listDriveFiles({
        folderId: storyFolderId
      });

      const projectFile = filesResponse.files?.find((file) => file.name === "project.json");
      if (!projectFile?.id) {
        return null;
      }

      const projectContent = await apiClient.readDriveFile({ fileId: projectFile.id });
      if (!projectContent.content) {
        return null;
      }

      try {
        const parsed = JSON.parse(projectContent.content) as Record<string, unknown>;
        return {
          title: extractStoryTitleFromMetadata(parsed),
          wordGoal:
            typeof parsed.wordGoal === "number"
              ? parsed.wordGoal
              : typeof parsed.wordGoal === "string"
                ? Number.parseInt(parsed.wordGoal, 10)
                : undefined,
          genre: typeof parsed.genre === "string" ? parsed.genre : undefined,
          description: typeof parsed.description === "string" ? parsed.description : undefined,
          updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : undefined
        };
      } catch (error) {
        console.warn("Failed to parse project.json metadata", error);
        return null;
      }
    },
    staleTime: 5 * 60 * 1000
  });
}


