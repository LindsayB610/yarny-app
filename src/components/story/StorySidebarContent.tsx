import { Add, ExpandMore, ChevronRight, Description, MoreVert } from "@mui/icons-material";
import { Box, Collapse, IconButton, Typography } from "@mui/material";
import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type JSX,
  type MouseEvent,
  type KeyboardEvent
} from "react";

import { ColorPicker } from "./ColorPicker";
import { SortableChapterList, type Chapter as SortableChapter } from "./SortableChapterList";
import { SortableSnippetList, type Snippet as SortableSnippet } from "./SortableSnippetList";
import {
  useMoveSnippetToChapterMutation,
  useReorderChaptersMutation,
  useReorderSnippetsMutation,
  useUpdateChapterColorMutation
} from "../../hooks/useStoryMutations";
import { useVisibilityGatedSnippetQueries } from "../../hooks/useVisibilityGatedQueries";
import { useYarnyStore } from "../../store/provider";
import {
  selectActiveStory,
  selectActiveStoryChapters,
  selectActiveStorySnippets,
  selectSnippetsForChapter
} from "../../store/selectors";
import {
  darkenColor,
  getReadableTextColor,
  getSoftVariant
} from "../../utils/contrastChecker";

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
  const [colorPickerState, setColorPickerState] = useState<{
    chapterId: string;
    anchorEl: HTMLElement | null;
  } | null>(null);

  // Mutations
  const reorderChaptersMutation = useReorderChaptersMutation();
  const reorderSnippetsMutation = useReorderSnippetsMutation();
  const moveSnippetMutation = useMoveSnippetToChapterMutation();
  const updateChapterColorMutation = useUpdateChapterColorMutation();

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

  const handleOpenColorPicker = useCallback(
    (chapterId: string, event: MouseEvent<HTMLElement>) => {
      event.stopPropagation();
      setColorPickerState({
        chapterId,
        anchorEl: event.currentTarget
      });
    },
    []
  );

  const handleColorPickerKeyDown = useCallback(
    (chapterId: string, event: KeyboardEvent<HTMLElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        event.stopPropagation();
        setColorPickerState({
          chapterId,
          anchorEl: event.currentTarget as HTMLElement
        });
      }
    },
    []
  );

  const handleCloseColorPicker = useCallback(() => {
    setColorPickerState(null);
  }, []);

  const handleColorSelect = useCallback((color: string) => {
    if (!colorPickerState) {
      return;
    }
    updateChapterColorMutation.mutate({
      chapterId: colorPickerState.chapterId,
      color
    });
  }, [colorPickerState, updateChapterColorMutation]);

  const activeChapterForPicker = useMemo(() => {
    if (!colorPickerState) {
      return null;
    }
    return chapters.find((chapter) => chapter.id === colorPickerState.chapterId) ?? null;
  }, [chapters, colorPickerState]);

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
  const renderChapter = (chapter: SortableChapter): JSX.Element => {
    const isCollapsed = collapsedChapters.has(chapter.id);
    const baseColor = chapter.color || "#3B82F6";
    const headerTextColor = getReadableTextColor(baseColor);
    const headerHoverColor = darkenColor(baseColor, 0.1);
    const iconHoverColor =
      headerTextColor === "#FFFFFF" ? "rgba(255, 255, 255, 0.16)" : "rgba(15, 23, 42, 0.12)";

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
            bgcolor: baseColor,
            color: headerTextColor,
            cursor: "pointer",
            "&:hover": {
              bgcolor: headerHoverColor
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
            sx={{
              p: 0.5,
              color: headerTextColor,
              "&:hover": {
                bgcolor: iconHoverColor
              }
            }}
          >
            {isCollapsed ? <ChevronRight fontSize="small" /> : <ExpandMore fontSize="small" />}
          </IconButton>
          <Typography variant="body2" sx={{ flex: 1, fontWeight: 600, color: "inherit" }}>
            {chapter.title}
          </Typography>
          <ChapterSnippetCount chapterId={chapter.id} textColor={headerTextColor} />
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              // TODO: Open add snippet dialog
              console.log("Add snippet to chapter", chapter.id);
            }}
            sx={{
              p: 0.5,
              color: headerTextColor,
              "&:hover": {
                bgcolor: iconHoverColor
              }
            }}
          >
            <Add fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            data-testid={`chapter-color-${chapter.id}`}
            aria-label="Chapter options"
            onClick={(event) => handleOpenColorPicker(chapter.id, event)}
            onKeyDown={(event) => handleColorPickerKeyDown(chapter.id, event)}
            sx={{
              p: 0.5,
              color: headerTextColor,
              "&:hover": {
                bgcolor: iconHoverColor
              }
            }}
          >
            <MoreVert fontSize="small" />
          </IconButton>
        </Box>

        {/* Chapter Snippets */}
        <Collapse in={!isCollapsed}>
          <Box sx={{ p: 0.5 }}>
            <ChapterSnippetList
              chapterId={chapter.id}
              chapterColor={baseColor}
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

  if (!story) {
    return <></>;
  }

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
      <ColorPicker
        open={Boolean(colorPickerState)}
        anchorEl={colorPickerState?.anchorEl ?? null}
        currentColor={activeChapterForPicker?.color}
        onClose={handleCloseColorPicker}
        onColorSelect={handleColorSelect}
      />
    </Box>
  );
}

// Helper component to get snippets for a chapter (needed because hooks can't be called conditionally)
function ChapterSnippetCount({
  chapterId,
  textColor
}: {
  chapterId: string;
  textColor?: string;
}): JSX.Element {
  const snippets = useYarnyStore((state) => selectSnippetsForChapter(state, chapterId));
  return (
    <Typography variant="caption" sx={{ color: textColor ?? "text.secondary" }}>
      {snippets.length} {snippets.length === 1 ? "snippet" : "snippets"}
    </Typography>
  );
}

// Helper component to render snippet list for a chapter
function ChapterSnippetList({
  chapterId,
  chapterColor,
  onReorder,
  onMoveToChapter,
  onSnippetClick,
  activeSnippetId,
  registerElement
}: {
  chapterId: string;
  chapterColor: string;
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
          chapterColor={chapterColor}
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
  registerElement,
  chapterColor
}: {
  snippetId: string;
  title: string;
  wordCount?: number;
  isActive: boolean;
  onClick: () => void;
  registerElement: (snippetId: string, element: HTMLElement | null) => void;
  chapterColor: string;
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

  const softColor = getSoftVariant(chapterColor);
  const snippetHoverColor = darkenColor(softColor, 0.08);
  const snippetActiveColor = darkenColor(softColor, 0.16);
  const snippetBorderColor = darkenColor(softColor, 0.2);
  const snippetTextColor = getReadableTextColor(softColor, { minimumRatio: 4 });

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
        bgcolor: isActive ? snippetActiveColor : softColor,
        color: snippetTextColor,
        border: "1px solid",
        borderColor: isActive ? darkenColor(chapterColor, 0.25) : snippetBorderColor,
        "&:hover": {
          bgcolor: isActive ? snippetActiveColor : snippetHoverColor
        }
      }}
    >
      <Description fontSize="small" sx={{ color: snippetTextColor, opacity: 0.85 }} />
      <Typography
        variant="body2"
        sx={{
          flex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          color: "inherit"
        }}
      >
        {title}
      </Typography>
      {wordCount !== undefined && (
        <Typography variant="caption" sx={{ color: snippetTextColor, opacity: 0.7 }}>
          {wordCount}
        </Typography>
      )}
    </Box>
  );
}
