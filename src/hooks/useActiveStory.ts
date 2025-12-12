import { useMemo } from "react";
import { useParams } from "react-router-dom";

import { useYarnyStore } from "../store/provider";
import type { Story } from "../store/types";

/**
 * Hook to get the active story from route params
 * Route params are the source of truth for active story
 */
export function useActiveStory(): Story | undefined {
  const { storyId } = useParams<{ storyId: string }>();
  const stories = useYarnyStore((state) => state.entities.stories);

  return useMemo(() => {
    if (!storyId) {
      return undefined;
    }
    return stories[storyId];
  }, [storyId, stories]);
}

