import { Box, Typography } from "@mui/material";
import { type JSX } from "react";

import { useYarnyStore } from "../../store/provider";
import { selectActiveStorySnippets } from "../../store/selectors";
import { countCharacters, countWords } from "../../utils/wordCount";

export function EditorFooter(): JSX.Element {
  const snippets = useYarnyStore(selectActiveStorySnippets);

  // Calculate total word and character counts from all snippets
  const totalWords = snippets.reduce(
    (sum, snippet) => sum + countWords(snippet.content),
    0
  );
  const totalCharacters = snippets.reduce(
    (sum, snippet) => sum + countCharacters(snippet.content),
    0
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
}

