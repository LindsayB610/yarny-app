import { useState, useEffect, useCallback } from "react";

export function useCollapsedState(storyId: string | undefined) {
  const [collapsedChapters, setCollapsedChapters] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!storyId || typeof window === "undefined") {
      return;
    }

    try {
      const key = `yarny_collapsed_${storyId}`;
      const saved = window.localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        setCollapsedChapters(new Set(parsed));
      } else {
        setCollapsedChapters(new Set());
      }
    } catch (error) {
      console.warn("Failed to load collapsed chapters", error);
    }
  }, [storyId]);

  const persistCollapsedState = useCallback(
    (next: Set<string>) => {
      if (!storyId || typeof window === "undefined") {
        return;
      }

      try {
        const key = `yarny_collapsed_${storyId}`;
        window.localStorage.setItem(key, JSON.stringify(Array.from(next)));
      } catch (error) {
        console.warn("Failed to persist collapsed chapters", error);
      }
    },
    [storyId]
  );

  const toggleChapterCollapse = useCallback(
    (chapterId: string) => {
      setCollapsedChapters((prev) => {
        const next = new Set(prev);
        if (next.has(chapterId)) {
          next.delete(chapterId);
        } else {
          next.add(chapterId);
        }
        persistCollapsedState(next);
        return next;
      });
    },
    [persistCollapsedState]
  );

  return { collapsedChapters, setCollapsedChapters, toggleChapterCollapse };
}

