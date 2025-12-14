import { Box, Stack } from "@mui/material";
import { EditorContent } from "@tiptap/react";
import { useEffect, useMemo, useRef, useState, type JSX } from "react";

import { EmptyState } from "./EmptyState";
import { NoteHeader } from "./NoteHeader";
import { useNoteAutoSave } from "./useNoteAutoSave";
import { useNoteSave } from "./useNoteSave";
import { usePlainTextEditor } from "../../../editor/plainTextEditor";
import { buildPlainTextDocument, extractPlainTextFromDocument } from "../../../editor/textExtraction";
import { useActiveStory } from "../../../hooks/useActiveStory";
import { useNotesQuery } from "../../../hooks/useNotesQuery";
import { useYarnyStore } from "../../../store/provider";
import { selectActiveNote } from "../../../store/selectors";

export function NoteEditorView(): JSX.Element {
  const story = useActiveStory();
  const activeNote = useYarnyStore(selectActiveNote);

  const noteType = activeNote?.type ?? "characters";
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
  const lastAppliedDocumentRef = useRef<string>("");
  const previousNoteIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!note) {
      setEditorContent("");
      setLastSavedAt(undefined);
      return;
    }

    setEditorContent(note.content ?? "");
    setLastSavedAt(note.modifiedTime);
  }, [note]);

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

  const { saveMutation, lastSavedContentRef } = useNoteSave();

  useNoteAutoSave(
    story?.id,
    activeNote,
    note,
    editorContent,
    lastSavedContentRef,
    saveMutation
  );

  useEffect(() => {
    if (saveMutation.isSuccess && saveMutation.data) {
      setLastSavedAt(saveMutation.data.modifiedTime);
    }
  }, [saveMutation.isSuccess, saveMutation.data]);

  if (!story || !activeNote) {
    return <EmptyState variant="no-story" />;
  }

  if (notesQuery.isLoading || notesQuery.isFetching) {
    return <EmptyState variant="loading" />;
  }

  if (!note) {
    return <EmptyState variant="not-found" />;
  }

  const hasUnsavedChanges = Boolean(note) && editorContent !== lastSavedContentRef.current;
  const saving = saveMutation.isPending;
  const statusText = saving
    ? "Saving…"
    : hasUnsavedChanges
      ? "Unsaved changes"
      : lastSavedAt
        ? `Last saved ${new Date(lastSavedAt).toLocaleString()}`
        : note?.updatedAt
          ? `Last saved ${new Date(note.updatedAt).toLocaleString()}`
          : "Not yet saved";

  const handleManualSave = () => {
    if (!story || !activeNote || !note) {
      return;
    }

    saveMutation.mutate({
      storyId: story.id,
      noteId: activeNote.id,
      noteType: activeNote.type,
      content: editorContent
    });
  };

  return (
    <Stack spacing={3} sx={{ height: "100%" }}>
      <NoteHeader
        noteName={note.name}
        statusText={statusText}
        onSave={handleManualSave}
        saving={saving}
        hasUnsavedChanges={hasUnsavedChanges}
      />

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
