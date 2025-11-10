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
  const chaptersById = useYarnyStore((state) => state.entities.chapters);
  const setSyncing = useYarnyStore((state) => state.setSyncing);
  const setLastSyncedAtAction = useYarnyStore((state) => state.setLastSyncedAt);
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

  // Track editor content for auto-save (per snippet)
  const [editorContent, setEditorContent] = useState(activeSnippet?.content ?? "");

  useEffect(() => {
    setEditorContent(activeSnippet?.content ?? "");
  }, [activeSnippet?.id, activeSnippet?.content]);

  const activeChapter = activeSnippet ? chaptersById[activeSnippet.chapterId] : undefined;

  const snippetFileName = useMemo(() => {
    if (!activeSnippet) {
      return "Snippet.doc";
    }

    const lines = editorContent.split(/\r?\n/);
    const firstNonEmptyLine =
      lines.map((line) => line.trim()).find((line) => line.length > 0) ??
      `Snippet ${activeSnippet.order + 1}`;

    const sanitized = firstNonEmptyLine.replace(/[\\/:*?"<>|]+/g, "").slice(0, 60).trim();
    const baseName =
      sanitized.length > 0 ? sanitized : `Snippet-${activeSnippet.order + 1}`;

    return baseName.toLowerCase().endsWith(".doc") ? baseName : `${baseName}.doc`;
  }, [activeSnippet, editorContent]);

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

  // Auto-save hook - saves the active snippet's Google Doc
  const {
    save: saveSnippet,
    isSaving: isAutoSaving,
    hasUnsavedChanges,
    markAsSaved: markContentAsSaved
  } = useAutoSave(
    activeSnippet?.driveFileId,
    editorContent,
    {
      enabled: Boolean(activeSnippet?.driveFileId),
      debounceMs: 2000,
      onSaveStart: () => {
        setSyncing(true);
      },
      onSaveSuccess: () => {
        setSyncing(false);
        setLastSyncedAtAction(new Date().toISOString());
      },
      onSaveError: (error) => {
        console.error("Auto-save failed:", error);
        setSyncing(false);
      },
      localBackupStoryId: story?.id,
      localBackupSnippetId: activeSnippet?.id,
      fileName: snippetFileName,
      mimeType: "application/vnd.google-apps.document",
      parentFolderId: activeChapter?.driveFolderId
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
    if (!story || !editor || !isEditorOpen || !activeSnippet || !activeSnippet.driveFileId) {
      return;
    }

    const checkConflicts = async () => {
      try {
        const localContent = editorContent;

        const conflict = await checkSnippetConflict(
          activeSnippet.id,
          activeSnippet.updatedAt,
          activeSnippet.driveFileId,
          activeChapter?.driveFolderId ?? story.driveFileId
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
  }, [
    story,
    activeSnippet,
    activeChapter,
    checkSnippetConflict,
    editor,
    isEditorOpen,
    editorContent
  ]);

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
      setEditorContent(plainText);
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
    if (!activeSnippet?.driveFileId) {
      return;
    }

    try {
      await saveSnippet();
      markContentAsSaved(editorContent);
    } catch (error) {
      console.error("Manual save failed:", error);
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
          <Typography variant="h3">{storyMetadata?.title ?? story.title}</Typography>
          <Typography variant="body2" color="text.secondary">
            {isAutoSaving || isSyncing
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
            disabled={isAutoSaving || isSyncing || !activeSnippet?.driveFileId}
          >
            {isSyncing || isAutoSaving ? "Saving..." : "Save to Drive"}
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
              setEditorContent(driveContent);
              markContentAsSaved(driveContent);
            }
          } else if (action === "useLocal") {
            // Keep local version (editor content is already authoritative)
            // Save local content to Drive
            if (activeSnippet?.driveFileId) {
              try {
                await saveSnippet();
                markContentAsSaved(editorContent);
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

