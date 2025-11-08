import { CloudUpload, MoreVert } from "@mui/icons-material";
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Typography,
  useTheme
} from "@mui/material";
import { EditorContent } from "@tiptap/react";
import { useEffect, useMemo, useRef, useState, type JSX, type MouseEvent } from "react";

import { ConflictResolutionModal } from "./ConflictResolutionModal";
import { EditorFooter } from "./EditorFooter";
import { ExportProgressDialog } from "./ExportProgressDialog";
import { usePlainTextEditor } from "../../editor/plainTextEditor";
import {
  buildPlainTextDocument,
  extractPlainTextFromDocument
} from "../../editor/textExtraction";
import { useAutoSave } from "../../hooks/useAutoSave";
import { useConflictDetection, type ConflictInfo } from "../../hooks/useConflictDetection";
import { useDriveSaveStoryMutation } from "../../hooks/useDriveQueries";
import { useExport } from "../../hooks/useExport";
import { usePerformanceMetrics } from "../../hooks/usePerformanceMetrics";
import { useYarnyStore } from "../../store/provider";
import {
  selectActiveStory,
  selectActiveStorySnippets,
  selectIsSyncing,
  selectLastSyncedAt
} from "../../store/selectors";

type StoryEditorProps = {
  isLoading: boolean;
};

export function StoryEditor({ isLoading }: StoryEditorProps): JSX.Element {
  const theme = useTheme();
  const story = useYarnyStore(selectActiveStory);
  const snippets = useYarnyStore(selectActiveStorySnippets);
  const isSyncing = useYarnyStore(selectIsSyncing);
  const lastSyncedAt = useYarnyStore(selectLastSyncedAt);

  const showLoadingState = isLoading;

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
  const {
    exportSnippets: exportSnippetsFromHook,
    isExporting,
    progress: exportProgressState
  } = useExport();

  // Note: Visibility gating for snippet loading is now handled in StorySidebarContent
  // where the snippet list DOM elements exist

  // Performance metrics tracking
  const { recordFirstKeystroke, startSnippetSwitch, endSnippetSwitch } = usePerformanceMetrics();

  // Conflict detection
  const { checkSnippetConflict } = useConflictDetection();
  type ConflictModalState = {
    open: boolean;
    conflict: (ConflictInfo & { localContent: string }) | null;
  };
  const [conflictModal, setConflictModal] = useState<ConflictModalState>({
    open: false,
    conflict: null
  });

  // Track if editor is open (authoritative)
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const previousStoryIdRef = useRef<string | undefined>(story?.id);
  const previousSnippetsKeyRef = useRef<string>("");
  const lastAppliedDocumentRef = useRef<string>("");

  // Track story/snippet switches for performance metrics
  useEffect(() => {
    const currentSnippetsKey = snippets.map((s) => s.id).join(",");
    const storyChanged = story?.id !== previousStoryIdRef.current;
    const snippetsChanged = currentSnippetsKey !== previousSnippetsKeyRef.current;

    if (storyChanged || (snippetsChanged && previousSnippetsKeyRef.current !== "")) {
      // Story or snippets changed - start tracking switch
      startSnippetSwitch();
    }

    previousStoryIdRef.current = story?.id;
    previousSnippetsKeyRef.current = currentSnippetsKey;
  }, [story?.id, snippets, startSnippetSwitch]);

  useEffect(() => {
    lastAppliedDocumentRef.current = "";
  }, [story?.id]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    // Only update editor content if it's not open (not authoritative)
    // When editor is open, it is the source of truth
    const serializedDocument = JSON.stringify(initialDocument);
    if (lastAppliedDocumentRef.current === serializedDocument) {
      return;
    }

    if (isEditorOpen || hasUnsavedChanges) {
      return;
    }

    editor.commands.setContent(initialDocument, false, {
      preserveWhitespace: true
    });
    lastAppliedDocumentRef.current = serializedDocument;
    // Editor content is set - snippet switch is complete
    // Use a small delay to ensure editor is ready for interaction
    setTimeout(() => {
      endSnippetSwitch();
    }, 0);
  }, [editor, initialDocument, isEditorOpen, hasUnsavedChanges, endSnippetSwitch]);

  // Check for conflicts when story changes
  useEffect(() => {
    if (!story || !editor || !isEditorOpen) {
      return;
    }

    const checkConflicts = async () => {
      try {
        // Get current editor content as local content
        const localContent = extractPlainTextFromDocument(editor.getJSON());

        // Check if there's a conflict with Drive
        const conflict = await checkSnippetConflict(
          story.id,
          story.updatedAt,
          story.driveFileId,
          story.driveFileId // Using driveFileId as parent folder ID for now
        );

        if (conflict) {
          // Add local content to conflict info
          const conflictWithLocalContent = {
            ...conflict,
            localContent
          };
          setConflictModal({ open: true, conflict: conflictWithLocalContent });
        }
      } catch (error) {
        console.error("Error checking conflicts:", error);
      }
    };

    // Check conflicts after a short delay to avoid race conditions
    const timeoutId = setTimeout(checkConflicts, 1000);
    return () => clearTimeout(timeoutId);
  }, [story, checkSnippetConflict, editor, isEditorOpen]);

  // Watch for editor changes to trigger auto-save
  // Editor is authoritative while open - changes here take precedence
  useEffect(() => {
    if (!editor) return;

    let hasRecordedFirstKeystroke = false;

    const handleUpdate = () => {
      const plainText = extractPlainTextFromDocument(editor.getJSON());
      setEditorContent(plainText);
      const isFocused = editor.isFocused();

      // Record first keystroke for performance metrics only when user is actively typing
      if (!hasRecordedFirstKeystroke && isFocused) {
        recordFirstKeystroke();
        hasRecordedFirstKeystroke = true;
      }
    };

    // Set initial content
    const initialText = extractPlainTextFromDocument(editor.getJSON());
    setEditorContent(initialText);

    editor.on("update", handleUpdate);
    editor.on("focus", () => setIsEditorOpen(true));
    editor.on("blur", () => {
      // Keep editor authoritative for a short time after blur
      setTimeout(() => setIsEditorOpen(false), 5000);
    });

    return () => {
      editor.off("update", handleUpdate);
      editor.off("focus", () => setIsEditorOpen(true));
      editor.off("blur", () => {});
    };
  }, [editor, recordFirstKeystroke]);

  if (showLoadingState) {
    return (
      <Stack spacing={3} sx={{ height: "100%" }}>
        <Box
          sx={{
            flex: 1,
            borderRadius: 3,
            border: `1px solid ${theme.palette.divider}`,
            backgroundColor: "background.paper",
            boxShadow: "inset 0 2px 6px rgba(15, 23, 42, 0.04)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            py: 8
          }}
        >
          <CircularProgress size={32} />
          <Typography variant="h6">Loading story…</Typography>
          <Typography variant="body2" color="text.secondary">
            Fetching your project from Google Drive
          </Typography>
        </Box>
      </Stack>
    );
  }

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

  const handleExportClick = (event: MouseEvent<HTMLElement>) => {
    setExportMenuAnchor(event.currentTarget);
  };

  const handleExportClose = () => {
    setExportMenuAnchor(null);
  };

  const handleExportChapters = async () => {
    handleExportClose();
    
    // Get chapter snippets (all snippets for now, since we're combining them)
    const snippetsForExport = snippets.map((snippet, index) => ({
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

      await exportSnippetsFromHook({
        fileName,
        parentFolderId,
        snippets: snippetsForExport,
        onProgress: (_progress) => {
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

  const bottomScrollExtension = 720;

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
          backgroundColor:
            theme.palette.mode === "dark"
              ? theme.palette.background.default
              : theme.palette.grey[200],
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          position: "relative"
        }}
      >
        <Box
          sx={{
            flex: 1,
            overflow: "auto",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            px: { xs: 2, md: 6 },
            pt: { xs: 3, md: 6 },
            pb: { xs: 3, md: 6 }
          }}
        >
          <Box
            sx={{
              width: "100%",
              maxWidth: 960,
              backgroundColor: "background.paper",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              boxShadow:
                theme.palette.mode === "dark"
                  ? "0 18px 48px rgba(2, 6, 23, 0.6)"
                  : "0 32px 48px -12px rgba(15, 23, 42, 0.25)",
              px: { xs: 3, md: 6 },
              pt: { xs: 4, md: 6 },
              pb: (theme) => `calc(${theme.spacing(6)} + ${bottomScrollExtension}px)`,
              minHeight: `calc(100vh + ${bottomScrollExtension}px)`,
              position: "relative",
              transition: "box-shadow 160ms ease",
              "&::after": {
                content: '""',
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                height: { xs: 96, md: 140 },
                background: (theme) =>
                  `linear-gradient(to bottom, transparent 0%, ${theme.palette.background.paper} 75%)`,
                pointerEvents: "none"
              }
            }}
          >
            <EditorContent editor={editor} />
          </Box>
        </Box>
        <EditorFooter />
      </Box>

      <ConflictResolutionModal
        open={conflictModal.open}
        conflict={conflictModal.conflict}
        onResolve={async (action) => {
          if (action === "useDrive" && conflictModal.conflict) {
            // Use Drive content - it's already in the conflict object
            const driveContent = conflictModal.conflict.driveContent;
            if (editor && driveContent) {
              const driveDocument = buildPlainTextDocument(driveContent);
              editor.commands.setContent(driveDocument);
              // Update editor content state
              setEditorContent(driveContent);
            }
          } else if (action === "useLocal") {
            // Keep local version (editor content is already authoritative)
            // Save local content to Drive
            if (editor && story) {
              try {
                const localContent = extractPlainTextFromDocument(editor.getJSON());
                await saveStory(localContent);
              } catch (error) {
                console.error("Failed to save local content:", error);
              }
            }
          } else if (action === "cancel") {
            // User canceled - do nothing
          }
          setConflictModal({ open: false, conflict: null });
        }}
      />

      <ExportProgressDialog
        open={exportProgress.open}
        progress={exportProgressState}
        fileName={exportProgress.fileName}
      />
    </Stack>
  );
}

