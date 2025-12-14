import { useMemo } from "react";
import { useParams } from "react-router-dom";

import { useYarnyStore } from "../store/provider";
import { selectActiveContent } from "../store/selectors";
import type { Content } from "../store/types";

/**
 * Hook to get the active content (snippet or note) from route params
 * Route params are the source of truth for active content
 */
export function useActiveContent(): Content | undefined {
  const { snippetId, noteId } = useParams<{
    storyId?: string;
    snippetId?: string;
    noteId?: string;
  }>();
  
  const storeContent = useYarnyStore(selectActiveContent);
  const snippets = useYarnyStore((state) => state.entities.snippets);
  const notes = useYarnyStore((state) => state.entities.notes);

  return useMemo(() => {
    // URL params take precedence
    if (snippetId) {
      return snippets[snippetId];
    }
    
    if (noteId) {
      return notes[noteId];
    }
    
    // Fallback to store state
    return storeContent;
  }, [snippetId, noteId, snippets, notes, storeContent]);
}

