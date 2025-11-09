import {
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
  useTheme
} from "@mui/material";
import { EditorContent } from "@tiptap/react";
import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from "react";

import { ConflictResolutionModal } from "./ConflictResolutionModal";
import { usePlainTextEditor } from "../../editor/plainTextEditor";
import {
  buildPlainTextDocument,
  extractPlainTextFromDocument
} from "../../editor/textExtraction";
import { useAutoSave } from "../../hooks/useAutoSave";
import { useConflictDetection, type ConflictInfo } from "../../hooks/useConflictDetection";
import { useDriveSaveStoryMutation } from "../../hooks/useDriveQueries";
import { usePerformanceMetrics } from "../../hooks/usePerformanceMetrics";
import { useStoryMetadata } from "../../hooks/useStoryMetadata";
import { useYarnyStore } from "../../store/provider";
import {
  selectActiveNote,
  selectActiveSnippet,
  selectActiveSnippetId,
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
  const activeSnippet = useYarnyStore(selectActiveSnippet);
  const activeSnippetId = useYarnyStore(selectActiveSnippetId);
  const activeNote = useYarnyStore(selectActiveNote);
  const selectSnippet = useYarnyStore((state) => state.selectSnippet);
  const upsertEntities = useYarnyStore((state) => state.upsertEntities);
  const isSyncing = useYarnyStore(selectIsSyncing);
  const lastSyncedAt = useYarnyStore(selectLastSyncedAt);
  const { data: storyMetadata } = useStoryMetadata(story?.driveFileId);

  const showLoadingState = isLoading;

  const initialDocument = useMemo(
    () => buildPlainTextDocument(activeSnippet?.content ?? ""),
    [activeSnippet?.content]
  );

  const editor = usePlainTextEditor({
    content: initialDocument
  });

  const aggregatedStoryContent = useMemo(
    () => snippets.map((snippet) => snippet.content ?? "").join("\n\n"),
    [snippets]
  );

  const { mutateAsync: saveStory, isPending } = useDriveSaveStoryMutation();

  // Track editor content for auto-save
  const [editorContent, setEditorContent] = useState("");

  useEffect(() => {
    setEditorContent((previous) =>
      previous === aggregatedStoryContent ? previous : aggregatedStoryContent
    );
  }, [aggregatedStoryContent]);

  useEffect(() => {
    if (!story || activeNote) {
      if (activeSnippetId) {
        selectSnippet(undefined);
      }
      return;
    }

    if (snippets.length === 0) {
      if (activeSnippetId) {
        selectSnippet(undefined);
      }
      return;
    }

    const activeExists = activeSnippetId
      ? snippets.some((snippet) => snippet.id === activeSnippetId)
      : false;

    if (!activeExists) {
      selectSnippet(snippets[0].id);
    }
  }, [story, snippets, activeSnippetId, selectSnippet]);

  // Auto-save hook - saves to story's drive file
  const {
    isSaving: isAutoSaving,
    hasUnsavedChanges,
    markAsSaved: markContentAsSaved
  } = useAutoSave(
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
      },
      localBackupStoryId: story?.id
    }
  );

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
  const previousActiveSnippetIdRef = useRef<string | undefined>(activeSnippet?.id);
  const lastLoadedSnippetIdRef = useRef<string | undefined>(activeSnippet?.id);
  const lastAppliedDocumentRef = useRef<string>("");

  // Track story/snippet switches for performance metrics
  useEffect(() => {
    const storyChanged = story?.id !== previousStoryIdRef.current;
    const snippetChanged = activeSnippet?.id !== previousActiveSnippetIdRef.current;

    if (storyChanged || snippetChanged) {
      startSnippetSwitch();
    }

    previousStoryIdRef.current = story?.id;
    previousActiveSnippetIdRef.current = activeSnippet?.id;
  }, [story?.id, activeSnippet?.id, startSnippetSwitch]);

  useEffect(() => {
    lastAppliedDocumentRef.current = "";
    lastLoadedSnippetIdRef.current = undefined;
  }, [story?.id]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const serializedDocument = JSON.stringify(initialDocument);
    const snippetChanged = activeSnippetId !== lastLoadedSnippetIdRef.current;

    if (!snippetChanged) {
      if (lastAppliedDocumentRef.current === serializedDocument) {
        return;
      }

      if (isEditorOpen || hasUnsavedChanges) {
        return;
      }
    }

    editor.commands.setContent(initialDocument, false, {
      preserveWhitespace: true
    });
    lastAppliedDocumentRef.current = serializedDocument;
    lastLoadedSnippetIdRef.current = activeSnippetId;

    setTimeout(() => {
      if (activeSnippetId) {
        editor.commands.focus("end");
      }
      endSnippetSwitch();
    }, 0);
  }, [
    editor,
    initialDocument,
    activeSnippetId,
    isEditorOpen,
    hasUnsavedChanges,
    endSnippetSwitch
  ]);

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

  // Watch for editor changes to trigger snippet updates
  // Editor is authoritative while open - changes here take precedence
  useEffect(() => {
    if (!editor) return;

    let hasRecordedFirstKeystroke = false;

    const handleUpdate = () => {
      if (!activeSnippet) {
        return;
      }

      const plainText = extractPlainTextFromDocument(editor.getJSON());
      if (plainText === activeSnippet.content) {
        return;
      }

      upsertEntities({
        snippets: [
          {
            ...activeSnippet,
            content: plainText,
            updatedAt: new Date().toISOString()
          }
        ]
      });

      const isFocused = editor.isFocused;

      // Record first keystroke for performance metrics only when user is actively typing
      if (!hasRecordedFirstKeystroke && isFocused) {
        recordFirstKeystroke();
        hasRecordedFirstKeystroke = true;
      }
    };

    const handleFocus = () => setIsEditorOpen(true);
    const handleBlur = () => {
      // Keep editor authoritative for a short time after blur
      setTimeout(() => setIsEditorOpen(false), 5000);
    };

    editor.on("update", handleUpdate);
    editor.on("focus", handleFocus);
    editor.on("blur", handleBlur);

    return () => {
      editor.off("update", handleUpdate);
      editor.off("focus", handleFocus);
      editor.off("blur", handleBlur);
    };
  }, [editor, activeSnippet, recordFirstKeystroke, upsertEntities]);

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

  if (activeNote) {
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
        <Typography variant="h5">Select a snippet to start writing</Typography>
        <Typography variant="body2">
          Pick a chapter snippet from the sidebar to edit your story content. People, places, and things
          notes open in the notes editor.
        </Typography>
      </Stack>
    );
  }

  if (!activeSnippet) {
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
        <Typography variant="h5">Create a snippet to start writing</Typography>
        <Typography variant="body2">
          Add a snippet from the sidebar, then select it to begin writing.
        </Typography>
      </Stack>
    );
  }

  const handleSave = async () => {
    if (!story) {
      return;
    }

    await saveStory(editorContent);
    markContentAsSaved(editorContent);
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
          <Typography variant="h3">{storyMetadata?.title ?? story.title}</Typography>
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
        </Stack>
      </Stack>

      <Box
        sx={{
          flex: 1,
          borderRadius: 3,
          backgroundColor: "#E9E9EB",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          boxShadow: "inset 0 2px 6px rgba(15, 23, 42, 0.04)"
        }}
      >
        <Box
          sx={{
            flex: 1,
            overflow: "auto",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            pt: { xs: 3, md: 6 },
            pb: { xs: 3, md: 6 }
          }}
        >
            <EditorContent editor={editor} />
        </Box>
      </Box>

      <ConflictResolutionModal
        open={conflictModal.open}
        conflict={conflictModal.conflict}
        onResolve={async (action) => {
          if (action === "useDrive" && conflictModal.conflict) {
            // Use Drive content - it's already in the conflict object
            const driveContent = conflictModal.conflict.driveContent;
            if (editor && driveContent && activeSnippet) {
              const driveDocument = buildPlainTextDocument(driveContent);
              editor.commands.setContent(driveDocument);
              const now = new Date().toISOString();
              upsertEntities({
                snippets: [
                  {
                    ...activeSnippet,
                    content: driveContent,
                    updatedAt: now
                  }
                ]
              });
              const updatedAggregatedContent = snippets
                .map((snippet) =>
                  snippet.id === activeSnippet.id ? driveContent : snippet.content ?? ""
                )
                .join("\n\n");
              markContentAsSaved(updatedAggregatedContent);
            }
          } else if (action === "useLocal") {
            // Keep local version (editor content is already authoritative)
            // Save local content to Drive
            if (story) {
              try {
                const localContent = editorContent;
                await saveStory(localContent);
                markContentAsSaved(localContent);
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
    </Stack>
  );
}

