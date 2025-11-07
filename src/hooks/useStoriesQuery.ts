import { useQuery } from "@tanstack/react-query";

import { apiClient } from "../api/client";
import type { DriveFile } from "../api/contract";

export interface StoryFolder extends DriveFile {
  // Story folders are Drive folders
  progress?: StoryProgress;
}

export interface StoryProgress {
  wordGoal: number;
  totalWords: number;
  percentage: number;
  goal?: {
    target: number;
    deadline: string;
    writingDays: boolean[];
    daysOff: string[];
    mode: "elastic" | "strict";
    ledger?: Record<string, number>;
  };
  dailyInfo?: {
    target: number;
    todayWords: number;
    remaining: number;
    wordsRemaining: number;
    isAhead?: boolean;
    isBehind?: boolean;
  };
  updatedAt?: string;
}

/**
 * Hook to fetch story folders from the Yarny Stories folder
 */
export function useStoriesQuery() {
  return useQuery({
    queryKey: ["drive", "stories"],
    queryFn: async (): Promise<StoryFolder[]> => {
      // Get or create Yarny Stories folder
      const yarnyFolder = await apiClient.getOrCreateYarnyStories();

      // List folders (stories) in Yarny Stories directory
      const response = await apiClient.listDriveFiles({
        folderId: yarnyFolder.id
      });

      // Filter to only show folders (stories are directories) and exclude trashed items
      const storyFolders =
        response.files?.filter(
          (file) =>
            file.mimeType === "application/vnd.google-apps.folder" &&
            !file.trashed
        ) || [];

      // Sort by modifiedTime (most recent first)
      storyFolders.sort((a, b) => {
        const timeA = new Date(a.modifiedTime || 0).getTime();
        const timeB = new Date(b.modifiedTime || 0).getTime();
        return timeB - timeA; // Descending order (most recent first)
      });

      return storyFolders as StoryFolder[];
    },
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
}

