import { Box, Button, Stack, Typography, useTheme } from "@mui/material";
import { EditorContent } from "@tiptap/react";
import { useEffect, useMemo, type JSX } from "react";

import { usePlainTextEditor } from "../../editor/plainTextEditor";
import {
  buildPlainTextDocument,
  extractPlainTextFromDocument
} from "../../editor/textExtraction";
import { useDriveSaveStoryMutation } from "../../hooks/useDriveQueries";
import { useYarnyStore } from "../../store/provider";
import {
  selectActiveStory,
  selectActiveStorySnippets,
  selectIsSyncing,
  selectLastSyncedAt
} from "../../store/selectors";

export function StoryEditor(): JSX.Element {
  const theme = useTheme();
  const story = useYarnyStore(selectActiveStory);
  const snippets = useYarnyStore(selectActiveStorySnippets);
  const isSyncing = useYarnyStore(selectIsSyncing);
  const lastSyncedAt = useYarnyStore(selectLastSyncedAt);

  const initialDocument = useMemo(
    () => buildPlainTextDocument(snippets.map((snippet) => snippet.content).join("\n\n")),
    [snippets]
  );

  const editor = usePlainTextEditor({
    content: initialDocument
  });

  const { mutateAsync: saveStory, isPending } = useDriveSaveStoryMutation();

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.commands.setContent(initialDocument, false, {
      preserveWhitespace: true
    });
  }, [editor, initialDocument]);

  if (!story) {
    return (
      <Stack
        spacing={2}
        sx={{
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          color: "text.secondary"
        }}
      >
        <Typography variant="h5">Select a story to start writing</Typography>
        <Typography variant="body2">
          Your projects and snippets will appear here once synced from Google Drive.
        </Typography>
      </Stack>
    );
  }

  const handleSave = async () => {
    if (!editor) {
      return;
    }

    const plainText = extractPlainTextFromDocument(editor.getJSON());
    await saveStory(plainText);
  };

  return (
    <Stack spacing={3} sx={{ height: "100%" }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
      >
        <Box>
          <Typography variant="h3">{story.title}</Typography>
          <Typography variant="body2" color="text.secondary">
            {isSyncing
              ? "Syncing with Google Drive..."
              : lastSyncedAt
              ? `Last synced ${new Date(lastSyncedAt).toLocaleString()}`
              : "Not yet synced"}
          </Typography>
        </Box>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={isPending || isSyncing}
        >
          {isPending || isSyncing ? "Saving..." : "Save to Drive"}
        </Button>
      </Stack>

      <Box
        sx={{
          flex: 1,
          borderRadius: 3,
          border: `1px solid ${theme.palette.divider}`,
          backgroundColor: "background.paper",
          boxShadow: "inset 0 2px 6px rgba(15, 23, 42, 0.04)",
          overflow: "hidden"
        }}
      >
        <EditorContent editor={editor} />
      </Box>
    </Stack>
  );
}

