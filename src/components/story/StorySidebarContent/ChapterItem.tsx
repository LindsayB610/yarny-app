import { Add, ExpandMore, ChevronRight, MoreVert } from "@mui/icons-material";
import { Box, Collapse, IconButton, Typography } from "@mui/material";
import type { JSX, MouseEvent } from "react";

import { ChapterSnippetList } from "./ChapterSnippetList";
import { darkenColor, getReadableTextColor } from "../../../utils/contrastChecker";
import type { Chapter as SortableChapter } from "../SortableChapterList";

interface ChapterItemProps {
  chapter: SortableChapter;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onAddSnippet: () => void;
  onMenuOpen: (event: MouseEvent<HTMLElement>) => void;
  onReorder: (newOrder: string[]) => void;
  onMoveToChapter?: (snippetId: string, targetChapterId: string) => void;
  onSnippetClick?: (snippetId: string) => void;
  activeSnippetId?: string;
  registerElement: (snippetId: string, element: HTMLElement | null) => void;
  visibleSnippetIds?: string[];
  onSnippetMenuOpen?: (snippetId: string, event: MouseEvent<HTMLElement>) => void;
  isCreatingSnippet: boolean;
}

export function ChapterItem({
  chapter,
  isCollapsed,
  onToggleCollapse,
  onAddSnippet,
  onMenuOpen,
  onReorder,
  onMoveToChapter,
  onSnippetClick,
  activeSnippetId,
  registerElement,
  visibleSnippetIds,
  onSnippetMenuOpen,
  isCreatingSnippet
}: ChapterItemProps): JSX.Element {
  const baseColor = chapter.color || "#3B82F6";
  const headerTextColor = getReadableTextColor(baseColor);
  const headerHoverColor = darkenColor(baseColor, 0.1);
  const iconHoverColor =
    headerTextColor === "#FFFFFF" ? "rgba(255, 255, 255, 0.16)" : "rgba(15, 23, 42, 0.12)";

  return (
    <Box
      sx={{
        mb: 1,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        overflow: "hidden"
      }}
    >
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
        onClick={onToggleCollapse}
      >
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse();
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
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onAddSnippet();
          }}
          disabled={isCreatingSnippet}
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
          aria-label="Chapter menu"
          onClick={onMenuOpen}
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

      <Collapse in={!isCollapsed}>
        <Box sx={{ p: 0.5 }}>
          <ChapterSnippetList
            chapterId={chapter.id}
            chapterColor={baseColor}
            onReorder={onReorder}
            onMoveToChapter={onMoveToChapter}
            onSnippetClick={onSnippetClick}
            activeSnippetId={activeSnippetId}
            registerElement={registerElement}
            visibleSnippetIds={visibleSnippetIds}
            onSnippetMenuOpen={onSnippetMenuOpen}
          />
        </Box>
      </Collapse>
    </Box>
  );
}

