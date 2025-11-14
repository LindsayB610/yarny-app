import { useMemo } from "react";

import type { Chapter as SortableChapter } from "../SortableChapterList";

export function useSearchFilter(
  chapters: Array<{ id: string; title: string; snippetIds: string[] }>,
  allSnippets: Array<{ id: string; chapterId: string; content: string }>,
  searchTerm: string,
  lastCreatedChapterId: string | null
) {
  const sortableChapters: SortableChapter[] = useMemo(
    () => chapters.map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      color: chapter.color,
      snippetIds: chapter.snippetIds
    })),
    [chapters]
  );

  const snippetsByChapter = useMemo(() => {
    const map = new Map<string, typeof allSnippets>();
    allSnippets.forEach((snippet) => {
      const existing = map.get(snippet.chapterId);
      if (existing) {
        existing.push(snippet);
      } else {
        map.set(snippet.chapterId, [snippet]);
      }
    });
    return map;
  }, [allSnippets]);

  const searchValue = searchTerm.trim().toLowerCase();
  const visibleSnippetMap = useMemo(() => {
    const map = new Map<string, string[]>();

    chapters.forEach((chapter) => {
      const snippetList = snippetsByChapter.get(chapter.id) ?? [];

      if (!searchValue) {
        map.set(chapter.id, [...chapter.snippetIds]);
        return;
      }

      const chapterTitleMatch = chapter.title.toLowerCase().includes(searchValue);
      const matchingSnippetIds = snippetList
        .filter((snippet) => {
          const content = snippet.content ?? "";
          const firstLine = content.split("\n")[0] || "";
          const lowerContent = content.toLowerCase();
          return (
            firstLine.toLowerCase().includes(searchValue) || lowerContent.includes(searchValue)
          );
        })
        .map((snippet) => snippet.id);

      if (chapterTitleMatch) {
        map.set(chapter.id, [...chapter.snippetIds]);
      } else if (matchingSnippetIds.length > 0) {
        map.set(chapter.id, matchingSnippetIds);
      }
    });

    return map;
  }, [chapters, snippetsByChapter, searchValue]);

  const filteredChapters: SortableChapter[] = useMemo(() => {
    if (!searchValue) {
      return sortableChapters;
    }
    return sortableChapters.filter((chapter) => {
      if (lastCreatedChapterId && chapter.id === lastCreatedChapterId) {
        return true;
      }
      return visibleSnippetMap.has(chapter.id);
    });
  }, [lastCreatedChapterId, searchValue, sortableChapters, visibleSnippetMap]);

  return { filteredChapters, visibleSnippetMap };
}

