import { Box, Button, IconButton, Menu, MenuItem, Stack, Typography, useTheme } from "@mui/material";
import { EditorContent } from "@tiptap/react";
import { CloudUpload, MoreVert } from "@mui/icons-material";
import { useEffect, useMemo, useState, type JSX } from "react";

import { usePlainTextEditor } from "../../editor/plainTextEditor";
import {
  buildPlainTextDocument,
  extractPlainTextFromDocument
} from "../../editor/textExtraction";
import { useAutoSave } from "../../hooks/useAutoSave";
import { useExport } from "../../hooks/useExport";
import { useDriveSaveStoryMutation } from "../../hooks/useDriveQueries";
import { useYarnyStore } from "../../store/provider";
import {
  selectActiveStory,
  selectActiveStorySnippets,
  selectIsSyncing,
  selectLastSyncedAt
} from "../../store/selectors";
import { ExportProgressDialog } from "./ExportProgressDialog";

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
  const [exportMenuAnchor, setExportMenuAnchor] = useState<HTMLElement | null>(null);
  const [exportProgress, setExportProgress] = useState<{
    open: boolean;
    fileName: string;
  }>({ open: false, fileName: "" });

  // Track editor content for auto-save
  const [editorContent, setEditorContent] = useState("");

  // Auto-save hook - saves to story's drive file
  const { isSaving: isAutoSaving, hasUnsavedChanges } = useAutoSave(
    story?.driveFileId,
    editorContent,
    {
      enabled: Boolean(story?.driveFileId),
      debounceMs: 2000,
      onSaveStart: () => {
        // Update syncing state
      },
      onSaveSuccess: () => {
        // Save successful
      },
      onSaveError: (error) => {
        console.error("Auto-save failed:", error);
      }
    }
  );

  // Export hook
  const { exportSnippets, isExporting, progress: exportProgressState } = useExport();

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.commands.setContent(initialDocument, false, {
      preserveWhitespace: true
    });
  }, [editor, initialDocument]);

  // Watch for editor changes to trigger auto-save
  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      const plainText = extractPlainTextFromDocument(editor.getJSON());
      setEditorContent(plainText);
    };

    // Set initial content
    const initialText = extractPlainTextFromDocument(editor.getJSON());
    setEditorContent(initialText);

    editor.on("update", handleUpdate);
    return () => {
      editor.off("update", handleUpdate);
    };
  }, [editor]);

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

  const handleExportClick = (event: React.MouseEvent<HTMLElement>) => {
    setExportMenuAnchor(event.currentTarget);
  };

  const handleExportClose = () => {
    setExportMenuAnchor(null);
  };

  const handleExportChapters = async () => {
    handleExportClose();
    
    // Get chapter snippets (all snippets for now, since we're combining them)
    const exportSnippets = snippets.map((snippet, index) => ({
      id: snippet.id,
      title: `Snippet ${index + 1}`,
      content: snippet.content
    }));

    const fileName = prompt("Enter filename for export:", `${story.title} - Chapters`);
    if (!fileName) return;

    setExportProgress({ open: true, fileName });

    try {
      // Get story folder ID - we'll need to get this from the story structure
      // For now, using the story's driveFileId as parent (may need adjustment)
      const parentFolderId = story.driveFileId; // This might need to be the story folder, not the file

      await exportSnippets({
        fileName,
        parentFolderId,
        snippets: exportSnippets,
        onProgress: (progress) => {
          setExportProgress((prev) => ({ ...prev }));
        }
      });

      // Close progress dialog after a short delay
      setTimeout(() => {
        setExportProgress((prev) => ({ ...prev, open: false }));
      }, 1500);
    } catch (error) {
      console.error("Export failed:", error);
      // Progress dialog will show error state
    }
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
            {isAutoSaving || isPending || isSyncing
              ? "Syncing with Google Drive..."
              : hasUnsavedChanges
              ? "Unsaved changes"
              : lastSyncedAt
              ? `Last synced ${new Date(lastSyncedAt).toLocaleString()}`
              : "Not yet synced"}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={isPending || isSyncing || isAutoSaving}
          >
            {isPending || isSyncing || isAutoSaving ? "Saving..." : "Save to Drive"}
          </Button>
          <IconButton
            onClick={handleExportClick}
            disabled={isExporting || snippets.length === 0}
            aria-label="Export options"
          >
            <MoreVert />
          </IconButton>
          <Menu
            anchorEl={exportMenuAnchor}
            open={Boolean(exportMenuAnchor)}
            onClose={handleExportClose}
          >
            <MenuItem onClick={handleExportChapters} disabled={isExporting}>
              <CloudUpload sx={{ mr: 1 }} />
              Export Chapters
            </MenuItem>
          </Menu>
        </Stack>
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

      <ExportProgressDialog
        open={exportProgress.open}
        progress={exportProgressState}
        fileName={exportProgress.fileName}
      />
    </Stack>
  );
}

