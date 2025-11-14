import { useParams } from "react-router-dom";
import { useMemo } from "react";

import { useYarnyStore } from "../store/provider";
import type { Snippet } from "../store/types";

/**
 * Hook to get the active snippet from route params
 * Route params are the source of truth for active snippet
 */
export function useActiveSnippet(): Snippet | undefined {
  const { snippetId } = useParams<{ snippetId: string }>();
  const snippets = useYarnyStore((state) => state.entities.snippets);

  return useMemo(() => {
    if (!snippetId) {
      return undefined;
    }
    return snippets[snippetId];
  }, [snippetId, snippets]);
}

