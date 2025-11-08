import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  cacheStoryProgress,
  clearAllStoryProgress,
  clearStoryProgress,
  getCachedStoryProgress,
  STORY_PROGRESS_CACHE_DURATION_MS
} from "./storyProgressCache";

interface MockProgress {
  totalWords: number;
}

describe("storyProgressCache", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it("returns cached progress within the TTL", () => {
    const progress: MockProgress = { totalWords: 1234 };
    cacheStoryProgress("story-1", progress);

    expect(getCachedStoryProgress<MockProgress>("story-1")).toEqual(progress);
  });

  it("expires cached progress after the TTL", () => {
    cacheStoryProgress("story-1", { totalWords: 9876 });

    vi.advanceTimersByTime(STORY_PROGRESS_CACHE_DURATION_MS + 1);

    expect(getCachedStoryProgress<MockProgress>("story-1")).toBeNull();
  });

  it("clears a single story's progress", () => {
    cacheStoryProgress("story-1", { totalWords: 50 });
    cacheStoryProgress("story-2", { totalWords: 75 });

    clearStoryProgress("story-1");

    expect(getCachedStoryProgress<MockProgress>("story-1")).toBeNull();
    expect(getCachedStoryProgress<MockProgress>("story-2")).toEqual({ totalWords: 75 });
  });

  it("clears all cached progress entries", () => {
    cacheStoryProgress("story-1", { totalWords: 10 });
    cacheStoryProgress("story-2", { totalWords: 20 });

    clearAllStoryProgress();

    expect(getCachedStoryProgress<MockProgress>("story-1")).toBeNull();
    expect(getCachedStoryProgress<MockProgress>("story-2")).toBeNull();
  });
});
