import { Box, Typography } from "@mui/material";
import { memo, useMemo, type JSX } from "react";

import { useYarnyStore } from "../../store/provider";
import { selectActiveStorySnippets } from "../../store/selectors";
import { countCharacters, countWords } from "../../utils/wordCount";

export const EditorFooter = memo(function EditorFooter(): JSX.Element {
  const snippets = useYarnyStore(selectActiveStorySnippets);

  // Calculate total word and character counts from all snippets
  const totalWords = useMemo(
    () => snippets.reduce(
      (sum, snippet) => sum + countWords(snippet.content),
      0
    ),
    [snippets]
  );
  const totalCharacters = useMemo(
    () => snippets.reduce(
      (sum, snippet) => sum + countCharacters(snippet.content),
      0
    ),
    [snippets]
  );

  return (
    <Box
      sx={{
        px: 3,
        py: 1.5,
        borderTop: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {totalWords.toLocaleString()} {totalWords === 1 ? "word" : "words"}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {totalCharacters.toLocaleString()}{" "}
        {totalCharacters === 1 ? "character" : "characters"}
      </Typography>
    </Box>
  );
});

