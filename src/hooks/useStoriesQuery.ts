import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryClient, QueryKey } from "@tanstack/react-query";

import { apiClient } from "../api/client";
import type { DriveFile } from "../api/contract";
import { listAllDriveFiles } from "../api/listAllDriveFiles";
import { useAuth } from "./useAuth";

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

const YARNY_FOLDER_QUERY_KEY = ["drive", "yarny-stories-folder"] as const satisfies QueryKey;
export const STORIES_QUERY_KEY = ["drive", "stories"] as const satisfies QueryKey;

const fetchYarnyStoriesFolder = () => apiClient.getOrCreateYarnyStories();

export async function fetchStories(queryClient: QueryClient): Promise<StoryFolder[]> {
  const yarnyFolder = await queryClient.ensureQueryData({
    queryKey: YARNY_FOLDER_QUERY_KEY,
    queryFn: fetchYarnyStoriesFolder
  });

  const response = await listAllDriveFiles(yarnyFolder.id);

  const storyFolders =
    response.filter(
      (file) =>
        file.mimeType === "application/vnd.google-apps.folder" &&
        !file.trashed
    ) ?? [];

  storyFolders.sort((a, b) => {
    const timeA = new Date(a.modifiedTime ?? 0).getTime();
    const timeB = new Date(b.modifiedTime ?? 0).getTime();
    return timeB - timeA;
  });

  return storyFolders as StoryFolder[];
}

/**
 * Hook to fetch story folders from the Yarny Stories folder
 */
export function useStoriesQuery() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: STORIES_QUERY_KEY,
    queryFn: () => fetchStories(queryClient),
    staleTime: 5 * 60 * 1000,
    enabled: isAuthenticated // Only fetch when authenticated
  });
}

