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
    return {
      id: snippet.id,
      title: content.split("\n")[0] || "Untitled",
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

