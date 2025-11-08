import { FileDownload, Logout, MenuBook } from "@mui/icons-material";
import { Box, Button, Typography } from "@mui/material";
import { memo, useMemo, type JSX, type MouseEvent } from "react";

import { useYarnyStore } from "../../store/provider";
import { selectActiveStorySnippets } from "../../store/selectors";
import { countCharacters, countWords } from "../../utils/wordCount";

type EditorFooterProps = {
  onExportClick: (event: MouseEvent<HTMLButtonElement>) => void;
  exportDisabled?: boolean;
  isExporting?: boolean;
  isExportMenuOpen?: boolean;
  onLogout: () => Promise<void> | void;
  isLogoutDisabled?: boolean;
};

export const EditorFooter = memo(function EditorFooter({
  onExportClick,
  exportDisabled = false,
  isExporting = false,
  isExportMenuOpen = false,
  onLogout,
  isLogoutDisabled = false
}: EditorFooterProps): JSX.Element {
  const snippets = useYarnyStore(selectActiveStorySnippets);

  const { totalWords, totalCharacters, lastModified } = useMemo(() => {
    const words = snippets.reduce(
      (sum, snippet) => sum + countWords(snippet.content),
      0
    );
    const chars = snippets.reduce(
      (sum, snippet) => sum + countCharacters(snippet.content),
      0
    );
    const lastUpdatedMs = snippets.reduce((latest, snippet) => {
      const timestamp = new Date(snippet.updatedAt).getTime();
      if (Number.isNaN(timestamp)) {
        return latest;
      }
      return Math.max(latest, timestamp);
    }, 0);

    return {
      totalWords: words,
      totalCharacters: chars,
      lastModified: lastUpdatedMs ? new Date(lastUpdatedMs) : undefined
    };
  }, [snippets]);

  const lastModifiedLabel = lastModified
    ? `Last Modified: ${lastModified.toLocaleDateString()} ${lastModified.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      })}`
    : "Last Modified: —";

  return (
    <Box
      sx={{
        px: { xs: 2, md: 3 },
        py: 1.5,
        borderTop: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
        boxShadow: (theme) =>
          theme.palette.mode === "dark"
            ? "0 -8px 24px rgba(2, 6, 23, 0.4)"
            : "0 -8px 24px rgba(15, 23, 42, 0.08)"
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 2
        }}
      >
        <Button
          id="editor-export-button"
          variant="outlined"
          color="primary"
          size="small"
          startIcon={<FileDownload />}
          onClick={onExportClick}
          disabled={exportDisabled || isExporting}
          aria-controls={isExportMenuOpen ? "editor-export-menu" : undefined}
          aria-expanded={isExportMenuOpen ? "true" : undefined}
          aria-haspopup="menu"
        >
          {isExporting ? "Exporting…" : "Export"}
        </Button>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            flexWrap: "wrap",
            justifyContent: "center",
            flex: 1,
            minWidth: 200
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {totalWords.toLocaleString()} {totalWords === 1 ? "word" : "words"}
          </Typography>
          <Typography variant="body2" color="text.disabled">
            —
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {totalCharacters.toLocaleString()}{" "}
            {totalCharacters === 1 ? "character" : "characters"}
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            flexWrap: "wrap",
            justifyContent: { xs: "center", sm: "flex-end" },
            minWidth: 220
          }}
        >
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              whiteSpace: { xs: "normal", sm: "nowrap" }
            }}
          >
            {lastModifiedLabel}
          </Typography>
          <Button
            component="a"
            href="/docs.html"
            variant="text"
            size="small"
            startIcon={<MenuBook />}
            sx={{
              textTransform: "none"
            }}
          >
            Docs
          </Button>
          <Button
            onClick={() => {
              void onLogout();
            }}
            variant="outlined"
            color="inherit"
            size="small"
            startIcon={<Logout />}
            disabled={isLogoutDisabled}
            sx={{
              textTransform: "none"
            }}
          >
            Sign out
          </Button>
        </Box>
      </Box>
    </Box>
  );
});

