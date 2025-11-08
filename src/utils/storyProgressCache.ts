const CACHE_KEY = "yarny_story_progress";
export const STORY_PROGRESS_CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

interface CachedEntry<T> {
  data: T;
  timestamp: number;
}

function isBrowserEnvironment(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readCache<T>(): Record<string, CachedEntry<T>> {
  if (!isBrowserEnvironment()) {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return {};
    }

    return parsed as Record<string, CachedEntry<T>>;
  } catch (error) {
    console.warn("Failed to read story progress cache", error);
    return {};
  }
}

function writeCache<T>(cache: Record<string, CachedEntry<T>>): void {
  if (!isBrowserEnvironment()) {
    return;
  }

  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.warn("Failed to write story progress cache", error);
  }
}

export function getCachedStoryProgress<T>(storyId: string): T | null {
  if (!storyId) {
    return null;
  }

  const cache = readCache<T>();
  const entry = cache[storyId];

  if (!entry) {
    return null;
  }

  if (Date.now() - entry.timestamp > STORY_PROGRESS_CACHE_DURATION_MS) {
    // Cache expired – remove it eagerly so subsequent lookups stay fast
    delete cache[storyId];
    writeCache(cache);
    return null;
  }

  return entry.data;
}

export function cacheStoryProgress<T>(storyId: string, progress: T | null): void {
  if (!storyId || progress === null) {
    return;
  }

  const cache = readCache<T>();
  cache[storyId] = {
    data: progress,
    timestamp: Date.now()
  };
  writeCache(cache);
}

export function clearStoryProgress(storyId: string): void {
  if (!storyId) {
    return;
  }

  const cache = readCache<unknown>();
  if (!(storyId in cache)) {
    return;
  }

  delete cache[storyId];
  writeCache(cache);
}

export function clearAllStoryProgress(): void {
  if (!isBrowserEnvironment()) {
    return;
  }

  try {
    window.localStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.warn("Failed to clear story progress cache", error);
  }
}
