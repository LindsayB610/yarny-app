import { Add, ExpandMore, ChevronRight, Description } from "@mui/icons-material";
import { Box, Collapse, IconButton, Typography } from "@mui/material";
import { useState, useRef, useEffect, useCallback, useMemo, type JSX } from "react";

import { SortableChapterList, type Chapter as SortableChapter } from "./SortableChapterList";
import { SortableSnippetList, type Snippet as SortableSnippet } from "./SortableSnippetList";
import {
  useMoveSnippetToChapterMutation,
  useReorderChaptersMutation,
  useReorderSnippetsMutation
} from "../../hooks/useStoryMutations";
import { useVisibilityGatedSnippetQueries } from "../../hooks/useVisibilityGatedQueries";
import { useYarnyStore } from "../../store/provider";
import {
  selectActiveStory,
  selectActiveStoryChapters,
  selectActiveStorySnippets,
  selectSnippetsForChapter
} from "../../store/selectors";

interface StorySidebarContentProps {
  onSnippetClick?: (snippetId: string) => void;
  activeSnippetId?: string;
}

export function StorySidebarContent({
  onSnippetClick,
  activeSnippetId
}: StorySidebarContentProps): JSX.Element {
  const story = useYarnyStore(selectActiveStory);
  const chapters = useYarnyStore(selectActiveStoryChapters);
  const allSnippets = useYarnyStore(selectActiveStorySnippets);
  const [collapsedChapters, setCollapsedChapters] = useState<Set<string>>(new Set());

  // Mutations
  const reorderChaptersMutation = useReorderChaptersMutation();
  const reorderSnippetsMutation = useReorderSnippetsMutation();
  const moveSnippetMutation = useMoveSnippetToChapterMutation();

  // Build fileIds map for visibility gating
  const snippetIds = useMemo(() => allSnippets.map((s) => s.id), [allSnippets]);
  const fileIdsMap: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {};
    allSnippets.forEach((snippet) => {
      if (snippet.driveFileId) {
        map[snippet.id] = snippet.driveFileId;
      }
    });
    return map;
  }, [allSnippets]);

  // Visibility gating for snippet loading
  const { registerElement } = useVisibilityGatedSnippetQueries(
    snippetIds,
    fileIdsMap,
    Boolean(story && snippetIds.length > 0)
  );

  if (!story) {
    return <></>;
  }

  const toggleChapterCollapse = useCallback((chapterId: string) => {
    setCollapsedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(chapterId)) {
        next.delete(chapterId);
      } else {
        next.add(chapterId);
      }
      return next;
    });
  }, []);

  const handleChapterReorder = useCallback((newOrder: string[]) => {
    reorderChaptersMutation.mutate(newOrder);
  }, [reorderChaptersMutation]);

  const handleSnippetReorder = useCallback((chapterId: string) => (newOrder: string[]) => {
    reorderSnippetsMutation.mutate({ chapterId, newOrder });
  }, [reorderSnippetsMutation]);

  const handleSnippetMoveToChapter = useCallback((snippetId: string, targetChapterId: string) => {
    moveSnippetMutation.mutate({ snippetId, targetChapterId });
  }, [moveSnippetMutation]);

  // Convert store chapters to SortableChapter format
  const sortableChapters: SortableChapter[] = useMemo(
    () => chapters.map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      color: chapter.color,
      snippetIds: chapter.snippetIds
    })),
    [chapters]
  );

  // Render a single chapter
  const renderChapter = (chapter: SortableChapter, index: number): JSX.Element => {
    const isCollapsed = collapsedChapters.has(chapter.id);

    return (
      <Box
        key={chapter.id}
        sx={{
          mb: 1,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
          overflow: "hidden"
        }}
      >
        {/* Chapter Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            p: 1,
            bgcolor: "background.default",
            cursor: "pointer",
            "&:hover": {
              bgcolor: "action.hover"
            }
          }}
          onClick={() => toggleChapterCollapse(chapter.id)}
        >
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              toggleChapterCollapse(chapter.id);
            }}
            sx={{ p: 0.5 }}
          >
            {isCollapsed ? <ChevronRight fontSize="small" /> : <ExpandMore fontSize="small" />}
          </IconButton>
          <Box
            sx={{
              width: 16,
              height: 16,
              borderRadius: "50%",
              bgcolor: chapter.color || "#3B82F6",
              flexShrink: 0
            }}
          />
          <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>
            {chapter.title}
          </Typography>
          <ChapterSnippetCount chapterId={chapter.id} />
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              // TODO: Open add snippet dialog
              console.log("Add snippet to chapter", chapter.id);
            }}
            sx={{ p: 0.5 }}
          >
            <Add fontSize="small" />
          </IconButton>
        </Box>

        {/* Chapter Snippets */}
        <Collapse in={!isCollapsed}>
          <Box sx={{ p: 0.5 }}>
            <ChapterSnippetList
              chapterId={chapter.id}
              onReorder={handleSnippetReorder(chapter.id)}
              onMoveToChapter={handleSnippetMoveToChapter}
              onSnippetClick={onSnippetClick}
              activeSnippetId={activeSnippetId}
              registerElement={registerElement}
            />
          </Box>
        </Collapse>
      </Box>
    );
  };

  if (chapters.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: "center" }}>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          No chapters yet. Create a chapter to get started.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <SortableChapterList
        chapters={sortableChapters}
        onReorder={handleChapterReorder}
        renderChapter={renderChapter}
      />
    </Box>
  );
}

// Helper component to get snippets for a chapter (needed because hooks can't be called conditionally)
function ChapterSnippetCount({ chapterId }: { chapterId: string }): JSX.Element {
  const snippets = useYarnyStore((state) => selectSnippetsForChapter(state, chapterId));
  return (
    <Typography variant="caption" sx={{ color: "text.secondary" }}>
      {snippets.length} {snippets.length === 1 ? "snippet" : "snippets"}
    </Typography>
  );
}

// Helper component to render snippet list for a chapter
function ChapterSnippetList({
  chapterId,
  onReorder,
  onMoveToChapter,
  onSnippetClick,
  activeSnippetId,
  registerElement
}: {
  chapterId: string;
  onReorder: (newOrder: string[]) => void;
  onMoveToChapter?: (snippetId: string, targetChapterId: string) => void;
  onSnippetClick?: (snippetId: string) => void;
  activeSnippetId?: string;
  registerElement: (snippetId: string, element: HTMLElement | null) => void;
}): JSX.Element {
  const snippets = useYarnyStore((state) => selectSnippetsForChapter(state, chapterId));

  // Convert store snippets to SortableSnippet format
  const sortableSnippets: SortableSnippet[] = snippets.map((snippet) => ({
    id: snippet.id,
    title: snippet.content.split("\n")[0] || "Untitled", // Use first line as title
    wordCount: snippet.content.split(/\s+/).filter((w) => w.length > 0).length
  }));

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
        />
      )}
    />
  );
}

// Individual snippet item component with ref for visibility gating
function SnippetItem({
  snippetId,
  title,
  wordCount,
  isActive,
  onClick,
  registerElement
}: {
  snippetId: string;
  title: string;
  wordCount?: number;
  isActive: boolean;
  onClick: () => void;
  registerElement: (snippetId: string, element: HTMLElement | null) => void;
}): JSX.Element {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (elementRef.current) {
      registerElement(snippetId, elementRef.current);
    }
    return () => {
      registerElement(snippetId, null);
    };
  }, [snippetId, registerElement]);

  return (
    <Box
      ref={elementRef}
      data-snippet-id={snippetId}
      onClick={onClick}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        p: 1,
        borderRadius: 1,
        cursor: "pointer",
        bgcolor: isActive ? "action.selected" : "transparent",
        "&:hover": {
          bgcolor: "action.hover"
        }
      }}
    >
      <Description fontSize="small" sx={{ color: "text.secondary" }} />
      <Typography
        variant="body2"
        sx={{
          flex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap"
        }}
      >
        {title}
      </Typography>
      {wordCount !== undefined && (
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          {wordCount}
        </Typography>
      )}
    </Box>
  );
}
