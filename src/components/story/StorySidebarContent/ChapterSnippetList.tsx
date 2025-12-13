import { useMemo, type JSX, type MouseEvent } from "react";

import { useYarnyStore } from "../../../store/provider";
import { selectSnippetsForChapter } from "../../../store/selectors";
import { SortableSnippetList, type Snippet as SortableSnippet } from "../SortableSnippetList";
import { SnippetItem } from "./SnippetItem";

interface ChapterSnippetListProps {
  chapterId: string;
  chapterColor: string;
  onReorder: (newOrder: string[]) => void;
  onMoveToChapter?: (snippetId: string, targetChapterId: string) => void;
  onSnippetClick?: (snippetId: string) => void;
  activeSnippetId?: string;
  registerElement: (snippetId: string, element: HTMLElement | null) => void;
  visibleSnippetIds?: string[];
  onSnippetMenuOpen?: (snippetId: string, event: MouseEvent<HTMLElement>) => void;
}

export function ChapterSnippetList({
  chapterId,
  chapterColor,
  onReorder,
  onMoveToChapter,
  onSnippetClick,
  activeSnippetId,
  registerElement,
  visibleSnippetIds,
  onSnippetMenuOpen
}: ChapterSnippetListProps): JSX.Element {
  const snippets = useYarnyStore((state) => selectSnippetsForChapter(state, chapterId));

  const filteredSnippets = useMemo(() => {
    if (!visibleSnippetIds || visibleSnippetIds.length === 0) {
      return snippets;
    }
    const snippetMap = new Map(snippets.map((snippet) => [snippet.id, snippet]));
    return visibleSnippetIds
      .map((id) => snippetMap.get(id))
      .filter((snippet): snippet is typeof snippets[number] => Boolean(snippet));
  }, [snippets, visibleSnippetIds]);

  const sortableSnippets: SortableSnippet[] = filteredSnippets.map((snippet) => {
    const content = snippet.content ?? "";
    const lines = content.split("\n");
    const firstLine = lines[0] || "";
    const title = firstLine.trim() || "Untitled";
    
    // Extract description: match original 2013 behavior
    // Get preview text from content, prioritizing continuation of first line or next line
    let description = "";
    
    // If first line has more content after the title portion, use that
    const firstLineAfterTitle = firstLine.slice(title.length).trim();
    if (firstLineAfterTitle.length > 0) {
      description = firstLineAfterTitle;
    } else if (lines.length > 1) {
      // Otherwise, use the first non-empty line after the title line
      const nextLine = lines.slice(1).find(line => line.trim().length > 0);
      if (nextLine) {
        description = nextLine.trim();
      }
    }
    
    // Truncate to ~35-40 characters to match original design (with ellipsis)
    if (description.length > 35) {
      description = description.slice(0, 32).trim() + "...";
    }
    
    return {
      id: snippet.id,
      title,
      description: description || undefined,
      wordCount: content.split(/\s+/).filter((w) => w.length > 0).length
    };
  });

  return (
    <SortableSnippetList
      snippets={sortableSnippets}
      onReorder={onReorder}
      onMoveToChapter={onMoveToChapter}
      renderSnippet={(snippet) => (
        <SnippetItem
          key={snippet.id}
          snippetId={snippet.id}
          title={snippet.title}
          description={snippet.description}
          wordCount={snippet.wordCount}
          isActive={activeSnippetId === snippet.id}
          onClick={() => onSnippetClick?.(snippet.id)}
          registerElement={registerElement}
          chapterColor={chapterColor}
          onMenuOpen={(event) => onSnippetMenuOpen?.(snippet.id, event)}
        />
      )}
    />
  );
}

