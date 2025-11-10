import {
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
  useTheme
} from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { EditorContent } from "@tiptap/react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type JSX
} from "react";

import { apiClient } from "../../api/client";
import { usePlainTextEditor } from "../../editor/plainTextEditor";
import {
  buildPlainTextDocument,
  extractPlainTextFromDocument,
  normalizePlainText
} from "../../editor/textExtraction";
import { useNotesQuery, type Note } from "../../hooks/useNotesQuery";
import { mirrorNoteWrite } from "../../services/localFs/localBackupMirror";
import { useYarnyStore } from "../../store/provider";
import { selectActiveNote, selectActiveStory } from "../../store/selectors";

type SavePayload = {
  storyId: string;
  noteId: string;
  noteType: "people" | "places" | "things";
  content: string;
};

type SaveResult = {
  content: string;
  modifiedTime: string;
};

export function NoteEditor(): JSX.Element {
  const theme = useTheme();
  const story = useYarnyStore(selectActiveStory);
  const activeNote = useYarnyStore(selectActiveNote);
  const queryClient = useQueryClient();

  const noteType = activeNote?.type ?? "people";
  const notesQuery = useNotesQuery(
    story?.id,
    noteType,
    Boolean(story?.id && activeNote)
  );

  const note = useMemo(() => {
    if (!activeNote) {
      return undefined;
    }
    return notesQuery.data?.find((item) => item.id === activeNote.id);
  }, [activeNote, notesQuery.data]);

  const initialDocument = useMemo(
    () => buildPlainTextDocument(note?.content ?? ""),
    [note?.content]
  );

  const editor = usePlainTextEditor({
    content: initialDocument
  });

  const [editorContent, setEditorContent] = useState(note?.content ?? "");
  const [lastSavedAt, setLastSavedAt] = useState<string | undefined>(
    note?.modifiedTime
  );
  const lastSavedContentRef = useRef<string>(note?.content ?? "");
  const lastAppliedDocumentRef = useRef<string>("");
  const debounceRef = useRef<number | undefined>(undefined);
  const previousNoteIdRef = useRef<string | undefined>(undefined);
  const editorContentRef = useRef(editorContent);
  const activeNoteRef = useRef(activeNote ?? undefined);
  const storyIdRef = useRef(story?.id);
  const previousActiveNoteRef = useRef<typeof activeNote>(undefined);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!note) {
      setEditorContent("");
      lastSavedContentRef.current = "";
      setLastSavedAt(undefined);
      return;
    }

    lastSavedContentRef.current = note.content ?? "";
    setEditorContent(note.content ?? "");
    setLastSavedAt(note.modifiedTime);
  }, [note]);

  useEffect(() => {
    editorContentRef.current = editorContent;
  }, [editorContent]);

  useEffect(() => {
    activeNoteRef.current = activeNote ?? undefined;
  }, [activeNote]);

  useEffect(() => {
    storyIdRef.current = story?.id;
  }, [story?.id]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const serializedDocument = JSON.stringify(initialDocument);
    if (lastAppliedDocumentRef.current === serializedDocument) {
      return;
    }

    editor.commands.setContent(initialDocument, false, {
      preserveWhitespace: true
    });
    lastAppliedDocumentRef.current = serializedDocument;

    if (note?.id && previousNoteIdRef.current !== note.id) {
      previousNoteIdRef.current = note.id;
      setTimeout(() => {
        editor.commands.focus("end");
      }, 0);
    }
  }, [editor, initialDocument, note?.id]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const handleUpdate = () => {
      const text = extractPlainTextFromDocument(editor.getJSON());
      setEditorContent(text);
    };

    editor.on("update", handleUpdate);
    return () => {
      editor.off("update", handleUpdate);
    };
  }, [editor]);

  const saveMutation = useMutation<SaveResult, unknown, SavePayload>({
    mutationFn: async ({ storyId, noteId, noteType, content }) => {
      const normalized = normalizePlainText(content);
      const response = await apiClient.writeDriveFile({
        fileId: noteId,
        content: normalized
      });
      await mirrorNoteWrite(storyId, noteType, noteId, normalized);
      return {
        content: normalized,
        modifiedTime: response.modifiedTime ?? new Date().toISOString()
      };
    },
    onSuccess: (result, variables) => {
      lastSavedContentRef.current = result.content;
      if (isMountedRef.current) {
        setLastSavedAt(result.modifiedTime);
      }

      queryClient.setQueryData<Note[]>(
        ["notes", variables.storyId, variables.noteType],
        (previous) => {
          if (!previous) {
            return previous;
          }
          return previous.map((item) =>
            item.id === variables.noteId
              ? {
                  ...item,
                  content: result.content,
                  modifiedTime: result.modifiedTime
                }
              : item
          );
        }
      );
    },
    onError: (error) => {
      console.error("Failed to save note:", error);
    }
  });

  const hasUnsavedChanges =
    Boolean(note) && editorContent !== lastSavedContentRef.current;

  const scheduleSave = useCallback(
    (overrideContent?: string) => {
      if (!story || !activeNote) {
        return;
      }

      const contentToSave =
        overrideContent !== undefined ? overrideContent : editorContent;

      if (contentToSave === lastSavedContentRef.current) {
        return;
      }

      saveMutation.mutate({
        storyId: story.id,
        noteId: activeNote.id,
        noteType: activeNote.type,
        content: contentToSave
      });
    },
    [activeNote, editorContent, saveMutation, story]
  );

  useEffect(() => {
    if (!story || !activeNote || !note) {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = undefined;
      }
      return;
    }

    if (editorContent === lastSavedContentRef.current) {
      return;
    }

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    debounceRef.current = window.setTimeout(() => {
      scheduleSave();
    }, 2000);

    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = undefined;
      }
    };
  }, [activeNote, editorContent, note, scheduleSave, story]);

  useEffect(() => {
    if (!story || !activeNote) {
      return;
    }

    const handleBeforeUnload = () => {
      if (editorContent !== lastSavedContentRef.current) {
        scheduleSave();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [activeNote, editorContent, scheduleSave, story]);

  useEffect(() => {
    const previous = previousActiveNoteRef.current;

    if (
      previous &&
      story?.id &&
      editorContentRef.current !== lastSavedContentRef.current
    ) {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = undefined;
      }
      saveMutation.mutate({
        storyId: story.id,
        noteId: previous.id,
        noteType: previous.type,
        content: editorContentRef.current
      });
    }

    previousActiveNoteRef.current = activeNote ?? undefined;
  }, [activeNote, saveMutation, story?.id]);

  useEffect(() => {
    return () => {
      const currentStoryId = storyIdRef.current;
      const currentActiveNote = activeNoteRef.current;
      if (
        currentStoryId &&
        currentActiveNote &&
        editorContentRef.current !== lastSavedContentRef.current
      ) {
        if (debounceRef.current) {
          window.clearTimeout(debounceRef.current);
          debounceRef.current = undefined;
        }
        saveMutation.mutate({
          storyId: currentStoryId,
          noteId: currentActiveNote.id,
          noteType: currentActiveNote.type,
          content: editorContentRef.current
        });
      }
    };
  }, [saveMutation]);

  const handleManualSave = () => {
    if (!story || !activeNote || !note) {
      return;
    }

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = undefined;
    }

    scheduleSave();
  };

  if (!story || !activeNote) {
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
        <Typography variant="h5">Select a note to start writing</Typography>
        <Typography variant="body2">
          Choose a person, place, or thing from the notes sidebar to edit it.
        </Typography>
      </Stack>
    );
  }

  if (notesQuery.isLoading || notesQuery.isFetching) {
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
          <Typography variant="h6">Loading note…</Typography>
          <Typography variant="body2" color="text.secondary">
            Fetching content from Google Drive
          </Typography>
        </Box>
      </Stack>
    );
  }

  if (!note) {
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
        <Typography variant="h5">Note not found</Typography>
        <Typography variant="body2">
          The selected note is no longer available. Choose another entry from the notes sidebar.
        </Typography>
      </Stack>
    );
  }

  const saving = saveMutation.isPending;
  const statusText = saving
    ? "Saving…"
    : hasUnsavedChanges
      ? "Unsaved changes"
      : lastSavedAt
        ? `Last saved ${new Date(lastSavedAt).toLocaleString()}`
        : "Not yet saved";

  return (
    <Stack spacing={3} sx={{ height: "100%" }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
      >
        <Box>
          <Typography variant="h3">{note.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {statusText}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            onClick={handleManualSave}
            variant="contained"
            disabled={saving || !hasUnsavedChanges}
          >
            {saving ? "Saving…" : "Save"}
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
    </Stack>
  );
}


