import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import type { StoryProgress } from "./useStoriesQuery";
import { apiClient } from "../api/client";
import { listAllDriveFiles } from "../api/listAllDriveFiles";
import {
  cacheStoryProgress,
  getCachedStoryProgress,
  STORY_PROGRESS_CACHE_DURATION_MS
} from "../utils/storyProgressCache";

/**
 * Get current date in US Pacific time (same as legacy code)
 */
export function getPacificDate(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  const parts = formatter.formatToParts(now);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

/**
 * Check if a date is a writing day for goal calculations
 */
export function isWritingDayForGoal(
  dateString: string,
  goal: { writingDays?: boolean[]; daysOff?: string[] }
): boolean {
  if (!goal.writingDays) return false;
  const date = new Date(dateString + "T12:00:00");
  const dayOfWeek = date.getDay();
  const writingDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  if (goal.daysOff?.includes(dateString)) {
    return false;
  }

  return goal.writingDays[writingDayIndex] === true;
}

/**
 * Count effective writing days between two dates
 */
export function countWritingDaysForGoal(
  startDate: string,
  endDate: string,
  goal: { writingDays?: boolean[]; daysOff?: string[] }
): number {
  if (!goal.writingDays) return 0;
  let count = 0;
  const start = new Date(startDate + "T12:00:00");
  const end = new Date(endDate + "T12:00:00");

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];
    if (isWritingDayForGoal(dateStr, goal)) {
      count++;
    }
  }

  return count;
}

/**
 * Calculate word count from snippets and groups
 */
function calculateStoryWordCount(
  snippets: Record<string, { body?: string; words?: number }>,
  groups: Record<string, { snippetIds?: string[] }>
): number {
  let totalWords = 0;

  for (const group of Object.values(groups)) {
    if (group.snippetIds) {
      for (const snippetId of group.snippetIds) {
        const snippet = snippets[snippetId];
        if (snippet) {
          if (snippet.words !== undefined) {
            totalWords += snippet.words;
          } else if (snippet.body) {
            // Fallback: count words from body text
            totalWords += snippet.body.split(/\s+/).filter((w) => w.length > 0).length;
          }
        }
      }
    }
  }

  return totalWords;
}

/**
 * Calculate daily goal info for a story
 */
export function calculateDailyGoalInfo(
  goal: {
    target: number;
    deadline: string;
    mode?: string;
    startDate?: string;
    lastCalculatedDate?: string;
    ledger?: Record<string, number>;
    writingDays?: boolean[];
    daysOff?: string[];
  },
  totalWords: number
): StoryProgress["dailyInfo"] | null {
  if (!goal.target || !goal.deadline) {
    return null;
  }

  const today = getPacificDate();
  const deadline = goal.deadline.split("T")[0];

  // Calculate words already in ledger (excluding today)
  let ledgerWords = 0;
  if (goal.ledger) {
    Object.keys(goal.ledger).forEach((date) => {
      if (date !== today) {
        ledgerWords += goal.ledger[date] ?? 0;
      }
    });
  }

  // Calculate today's words
  const todayWords = totalWords - ledgerWords;

  // Count remaining writing days
  const remainingDays = countWritingDaysForGoal(today, deadline, goal);

  if (remainingDays <= 0) {
    return {
      todayWords: Math.max(0, todayWords),
      remaining: 0,
      target: 0,
      wordsRemaining: Math.max(0, goal.target - totalWords)
    };
  }

  // Calculate remaining words needed
  const wordsRemaining = Math.max(0, goal.target - totalWords);

  if (goal.mode === "elastic") {
    // Elastic: recalculate daily target based on remaining words and days
    const dailyTarget = Math.ceil(wordsRemaining / remainingDays);
    return {
      target: dailyTarget,
      todayWords: Math.max(0, todayWords),
      remaining: remainingDays,
      wordsRemaining,
      isAhead: todayWords > dailyTarget,
      isBehind: todayWords < dailyTarget
    };
  } else {
    // Strict: fixed daily target (calculate from original target and total days)
    const startDate = goal.startDate ?? goal.lastCalculatedDate ?? today;
    const totalWritingDays = countWritingDaysForGoal(
      startDate.split("T")[0],
      deadline,
      goal
    );
    const fixedDailyTarget =
      totalWritingDays > 0 ? Math.ceil(goal.target / totalWritingDays) : 0;

    return {
      target: fixedDailyTarget,
      todayWords: Math.max(0, todayWords),
      remaining: remainingDays,
      wordsRemaining,
      isAhead: todayWords > fixedDailyTarget,
      isBehind: todayWords < fixedDailyTarget
    };
  }
}

/**
 * Hook to fetch story progress data
 */
export function useStoryProgress(storyFolderId: string | undefined) {
  const cachedProgress = useMemo(() => {
    if (!storyFolderId) {
      return null;
    }

    return getCachedStoryProgress<StoryProgress>(storyFolderId);
  }, [storyFolderId]);

  return useQuery({
    queryKey: ["drive", "story-progress", storyFolderId],
    enabled: Boolean(storyFolderId),
    initialData: cachedProgress ?? undefined,
    initialDataUpdatedAt:
      cachedProgress != null
        ? Date.now() - STORY_PROGRESS_CACHE_DURATION_MS - 1
        : undefined,
    queryFn: async (): Promise<StoryProgress | null> => {
      if (!storyFolderId) {
        return null;
      }

      try {
        // List files in the story folder
        const files = await listAllDriveFiles(storyFolderId);
        const fileMap: Record<string, string> = {};
        files.forEach((file) => {
          fileMap[file.name] = file.id;
        });

        let wordGoal = 3000; // Default goal
        let totalWords = 0;
        let goal: StoryProgress["goal"] = undefined;
        let updatedAt: string | undefined = undefined;

        // Read project.json, goal.json, and data.json in parallel
        const readPromises: Promise<void>[] = [];

        if (fileMap["project.json"]) {
          readPromises.push(
            apiClient
              .readDriveFile({ fileId: fileMap["project.json"] })
              .then((projectData) => {
                if (projectData.content) {
                  const project = JSON.parse(projectData.content);
                  wordGoal = project.wordGoal ?? 3000;
                  updatedAt = project.updatedAt;
                }
              })
              .catch((error) => {
                console.warn(
                  `Failed to read project.json for story ${storyFolderId}:`,
                  error
                );
              })
          );
        }

        if (fileMap["goal.json"]) {
          readPromises.push(
            apiClient
              .readDriveFile({ fileId: fileMap["goal.json"] })
              .then((goalData) => {
                if (goalData.content) {
                  goal = JSON.parse(goalData.content);
                }
              })
              .catch((error) => {
                console.warn(
                  `Failed to read goal.json for story ${storyFolderId}:`,
                  error
                );
              })
          );
        }

        if (fileMap["data.json"]) {
          readPromises.push(
            apiClient
              .readDriveFile({ fileId: fileMap["data.json"] })
              .then((dataContent) => {
                if (dataContent.content) {
                  const data = JSON.parse(dataContent.content);

                  // Calculate word count from snippets and groups
                  if (data.snippets && data.groups) {
                    totalWords = calculateStoryWordCount(data.snippets, data.groups);
                  }
                }
              })
              .catch((error) => {
                console.warn(
                  `Failed to read data.json for story ${storyFolderId}:`,
                  error
                );
              })
          );
        }

        // Wait for all reads to complete
        await Promise.all(readPromises);

        const percentage =
          wordGoal > 0 ? Math.min(100, Math.round((totalWords / wordGoal) * 100)) : 0;

        // Calculate daily goal info if goal exists
        const dailyInfo = goal ? calculateDailyGoalInfo(goal, totalWords) : undefined;

        const progress: StoryProgress = {
          wordGoal,
          totalWords,
          percentage,
          goal,
          dailyInfo,
          updatedAt
        };

        cacheStoryProgress(storyFolderId, progress);

        return progress;
      } catch (error) {
        console.warn(`Failed to fetch progress for story ${storyFolderId}:`, error);
        return null;
      }
    },
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
}

