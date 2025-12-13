import { Description, MoreVert } from "@mui/icons-material";
import { Box, IconButton, Typography } from "@mui/material";
import { useEffect, useRef, type JSX, type MouseEvent } from "react";

import { darkenColor, getReadableTextColor, getSoftVariant } from "../../../utils/contrastChecker";

interface SnippetItemProps {
  snippetId: string;
  title: string;
  description?: string;
  wordCount?: number;
  isActive: boolean;
  onClick: () => void;
  registerElement: (snippetId: string, element: HTMLElement | null) => void;
  chapterColor: string;
  onMenuOpen?: (event: MouseEvent<HTMLElement>) => void;
}

export function SnippetItem({
  snippetId,
  title,
  description,
  wordCount,
  isActive,
  onClick,
  registerElement,
  chapterColor,
  onMenuOpen
}: SnippetItemProps): JSX.Element {
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
        flexDirection: "column",
        gap: 0.5,
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
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Description fontSize="small" sx={{ color: snippetTextColor, opacity: 0.85 }} />
        <Typography
          variant="body2"
          sx={{
            flex: 1,
            fontWeight: "bold",
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
        <IconButton
          size="small"
          onClick={(event) => {
            event.stopPropagation();
            onMenuOpen?.(event);
          }}
          sx={{
            p: 0.5,
            color: snippetTextColor,
            "&:hover": {
              bgcolor: darkenColor(chapterColor, 0.2),
              color: getReadableTextColor(darkenColor(chapterColor, 0.2))
            }
          }}
        >
          <MoreVert fontSize="small" />
        </IconButton>
      </Box>
      {description && (
        <Typography
          variant="caption"
          sx={{
            color: snippetTextColor,
            opacity: 0.75,
            fontSize: "0.75rem",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            pl: 4 // Align with title text (icon + gap)
          }}
        >
          {description}
        </Typography>
      )}
    </Box>
  );
}

