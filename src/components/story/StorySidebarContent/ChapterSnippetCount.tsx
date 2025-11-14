import { Typography } from "@mui/material";
import type { JSX } from "react";

import { useYarnyStore } from "../../../store/provider";
import { selectSnippetsForChapter } from "../../../store/selectors";

interface ChapterSnippetCountProps {
  chapterId: string;
  textColor?: string;
}

export function ChapterSnippetCount({ chapterId, textColor }: ChapterSnippetCountProps): JSX.Element {
  const snippets = useYarnyStore((state) => selectSnippetsForChapter(state, chapterId));
  return (
    <Typography variant="caption" sx={{ color: textColor ?? "text.secondary" }}>
      {snippets.length} {snippets.length === 1 ? "snippet" : "snippets"}
    </Typography>
  );
}

