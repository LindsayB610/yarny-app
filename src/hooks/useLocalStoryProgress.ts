import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import type { StoryProgress } from "./useStoriesQuery";
import {
  calculateDailyGoalInfo,
  getPacificDate,
  countWritingDaysForGoal
} from "./useStoryProgress";
import { getPersistedDirectoryHandle } from "../services/localFs/LocalFsCapability";
import { LocalFsPathResolver } from "../services/localFs/LocalFsPathResolver";
import { useYarnyStore } from "../store/provider";
import { selectStorySnippets } from "../store/selectors";
import { countWords } from "../utils/wordCount";

/**
 * Calculate word count from story snippets in the store
 */
function calculateLocalStoryWordCount(snippets: Array<{ content: string }>): number {
  return snippets.reduce((total, snippet) => {
    return total + countWords(snippet.content || "");
  }, 0);
}

/**
 * Read a JSON file from local file system (backup mirror structure)
 */
async function readLocalJsonFile(
  storyId: string,
  fileName: "project.json" | "goal.json"
): Promise<any> {
  try {
    const handle = await getPersistedDirectoryHandle();
    if (!handle) {
      return undefined;
    }

    const pathSegments =
      fileName === "project.json"
        ? LocalFsPathResolver.projectFile(storyId)
        : LocalFsPathResolver.goalFile(storyId);
    let current = handle;

    // Navigate to the directory
    for (let i = 0; i < pathSegments.length - 1; i++) {
      current = await current.getDirectoryHandle(pathSegments[i]);
    }

    // Read the file
    const file = pathSegments[pathSegments.length - 1];
    const fileHandle = await current.getFileHandle(file);
    const fileContent = await fileHandle.getFile();
    const content = await fileContent.text();

    if (content) {
      return JSON.parse(content);
    }
  } catch (error) {
    // File doesn't exist or can't be read - that's okay, these files are optional
    if ((error as DOMException).name !== "NotFoundError") {
      console.warn(`Failed to read ${fileName} for local story ${storyId}:`, error);
    }
  }

  return undefined;
}

/**
 * Hook to calculate story progress for local stories from store data
 */
export function useLocalStoryProgress(storyId: string | undefined) {
  const story = useYarnyStore((state) =>
    storyId ? state.entities.stories[storyId] : undefined
  );
  const project = useYarnyStore((state) =>
    story ? state.entities.projects[story.projectId] : undefined
  );
  const snippets = useYarnyStore((state) =>
    storyId ? selectStorySnippets(state, storyId) : []
  );

  // Calculate word count from snippets
  const totalWords = useMemo(() => {
    if (!snippets.length) {
      return 0;
    }
    return calculateLocalStoryWordCount(snippets);
  }, [snippets]);

  // Read project.json and goal.json from local file system
  const projectJsonQuery = useQuery({
    queryKey: ["local", "story-project", storyId],
    enabled: Boolean(storyId),
    queryFn: () => (storyId ? readLocalJsonFile(storyId, "project.json") : undefined),
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  const goalQuery = useQuery({
    queryKey: ["local", "story-goal", storyId],
    enabled: Boolean(storyId),
    queryFn: () => (storyId ? readLocalJsonFile(storyId, "goal.json") : undefined),
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Get word goal from project.json or default to 3000
  const wordGoal = projectJsonQuery.data?.wordGoal ?? 3000;
  const goal = goalQuery.data;

  // Calculate progress
  const progress = useMemo((): StoryProgress | null => {
    if (!storyId || !story) {
      return null;
    }

    const percentage = wordGoal > 0 ? Math.min(100, Math.round((totalWords / wordGoal) * 100)) : 0;

    // Calculate daily goal info if goal exists
    const dailyInfo = goal ? calculateDailyGoalInfo(goal, totalWords) : undefined;

    return {
      wordGoal,
      totalWords,
      percentage,
      goal,
      dailyInfo,
      updatedAt: story.updatedAt
    };
  }, [storyId, story, wordGoal, totalWords, goal]);

  return {
    data: progress,
    isLoading: projectJsonQuery.isLoading || goalQuery.isLoading,
    isError: projectJsonQuery.isError || goalQuery.isError
  };
}

