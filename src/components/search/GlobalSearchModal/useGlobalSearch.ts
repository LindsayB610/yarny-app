import { useMemo } from "react";

import type { SearchResult } from "./types";

import { useActiveContent } from "@/hooks/useActiveContent";
import { useActiveStory } from "@/hooks/useActiveStory";
import { useYarnyStore } from "@/store/provider";
import { selectStoryChapters, selectStorySnippets, selectNotesByKind } from "@/store/selectors";


/**
 * Global search hook that searches across chapters, snippets, characters, worldbuilding, and editor content.
 * 
 * Works identically for both local and Google Drive projects:
 * - Both project types store data in the same Zustand store structure
 * - Both use the same selectors (selectStoryChapters, selectStorySnippets, selectNotesByKind)
 * - Both load notes/chapters/snippets into the store via upsert operations
 * 
 * @param searchTerm - The search query string
 * @returns Array of search results grouped by type
 */
export function useGlobalSearch(searchTerm: string): SearchResult[] {
  const story = useActiveStory();
  const activeContent = useActiveContent();
  const chapters = useYarnyStore((state) => 
    story ? selectStoryChapters(state, story.id) : []
  );
  const snippets = useYarnyStore((state) => 
    story ? selectStorySnippets(state, story.id) : []
  );
  const characters = useYarnyStore((state) => 
    story ? selectNotesByKind(state, story.id, "character") : []
  );
  const worldbuilding = useYarnyStore((state) => 
    story ? selectNotesByKind(state, story.id, "worldbuilding") : []
  );

  const results = useMemo(() => {
    if (!story || !searchTerm.trim()) {
      return [];
    }

    const searchValue = searchTerm.trim().toLowerCase();
    const allResults: SearchResult[] = [];

    // Search chapters
    chapters.forEach((chapter) => {
      if (chapter.title.toLowerCase().includes(searchValue)) {
        allResults.push({
          id: chapter.id,
          type: "chapter",
          title: chapter.title,
          storyId: story.id
        });
      }
    });

    // Search snippets
    snippets.forEach((snippet) => {
      const content = snippet.content ?? "";
      const firstLine = content.split("\n")[0] ?? "";
      const lowerContent = content.toLowerCase();
      
      if (
        firstLine.toLowerCase().includes(searchValue) ||
        lowerContent.includes(searchValue)
      ) {
        // Get chapter title
        const chapter = chapters.find((c) => c.id === snippet.chapterId);
        
        // Create preview (first 100 chars of content)
        const preview = content.length > 100 
          ? content.substring(0, 100) + "..." 
          : content;

        allResults.push({
          id: snippet.id,
          type: "snippet",
          title: firstLine || "Untitled Snippet",
          preview,
          chapterId: snippet.chapterId,
          chapterTitle: chapter?.title,
          storyId: story.id
        });
      }
    });

    // Search characters
    characters.forEach((note) => {
      const content = note.content ?? "";
      const firstLine = content.split("\n")[0]?.trim() ?? "";
      const nameWithoutMarkdown = firstLine.replace(/^#+\s*/, "").trim() || "New Character";
      const lowerContent = content.toLowerCase();
      
      if (
        nameWithoutMarkdown.toLowerCase().includes(searchValue) ||
        lowerContent.includes(searchValue)
      ) {
        const preview = content.length > 100 
          ? content.substring(0, 100) + "..." 
          : content;

        allResults.push({
          id: note.id,
          type: "character",
          title: nameWithoutMarkdown,
          preview,
          storyId: story.id,
          noteType: "characters"
        });
      }
    });

    // Search worldbuilding
    worldbuilding.forEach((note) => {
      const content = note.content ?? "";
      const firstLine = content.split("\n")[0]?.trim() ?? "";
      const nameWithoutMarkdown = firstLine.replace(/^#+\s*/, "").trim() || "New Worldbuilding";
      const lowerContent = content.toLowerCase();
      
      if (
        nameWithoutMarkdown.toLowerCase().includes(searchValue) ||
        lowerContent.includes(searchValue)
      ) {
        const preview = content.length > 100 
          ? content.substring(0, 100) + "..." 
          : content;

        allResults.push({
          id: note.id,
          type: "worldbuilding",
          title: nameWithoutMarkdown,
          preview,
          storyId: story.id,
          noteType: "worldbuilding"
        });
      }
    });

    // Search current editor content (if active)
    if (activeContent) {
      const content = activeContent.content ?? "";
      const lowerContent = content.toLowerCase();
      
      if (lowerContent.includes(searchValue)) {
        const isSnippet = "chapterId" in activeContent;
        const isNote = "kind" in activeContent;
        
        if (isSnippet) {
          const chapter = chapters.find((c) => c.id === activeContent.chapterId);
          const firstLine = content.split("\n")[0] ?? "";
          const preview = content.length > 100 
            ? content.substring(0, 100) + "..." 
            : content;

          allResults.push({
            id: activeContent.id,
            type: "editor",
            title: firstLine || "Current Snippet",
            preview,
            chapterId: activeContent.chapterId,
            chapterTitle: chapter?.title,
            storyId: story.id
          });
        } else if (isNote) {
          const firstLine = content.split("\n")[0]?.trim() ?? "";
          const nameWithoutMarkdown = firstLine.replace(/^#+\s*/, "").trim() || "Current Note";
          const preview = content.length > 100 
            ? content.substring(0, 100) + "..." 
            : content;

          allResults.push({
            id: activeContent.id,
            type: "editor",
            title: nameWithoutMarkdown,
            preview,
            storyId: story.id,
            noteType: activeContent.kind
          });
        }
      }
    }

    return allResults;
  }, [story, searchTerm, chapters, snippets, characters, worldbuilding, activeContent]);

  return results;
}

