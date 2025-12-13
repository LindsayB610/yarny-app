import { useCallback, useEffect, useRef } from "react";

import type { SavePayload } from "./types";

export function useNoteAutoSave(
  storyId: string | undefined,
  activeNote: { id: string; type: "characters" | "worldbuilding" } | undefined,
  note: { id: string; content: string } | undefined,
  editorContent: string,
  lastSavedContentRef: React.MutableRefObject<string>,
  saveMutation: { mutate: (payload: SavePayload) => void }
) {
  const debounceRef = useRef<number | undefined>(undefined);
  const editorContentRef = useRef(editorContent);
  const activeNoteRef = useRef(activeNote ?? undefined);
  const storyIdRef = useRef(storyId);
  const previousActiveNoteRef = useRef<typeof activeNote>(undefined);

  useEffect(() => {
    editorContentRef.current = editorContent;
  }, [editorContent]);

  useEffect(() => {
    activeNoteRef.current = activeNote ?? undefined;
  }, [activeNote]);

  useEffect(() => {
    storyIdRef.current = storyId;
  }, [storyId]);

  const scheduleSave = useCallback(
    (overrideContent?: string) => {
      if (!storyId || !activeNote) {
        return;
      }

      const contentToSave =
        overrideContent !== undefined ? overrideContent : editorContent;

      if (contentToSave === lastSavedContentRef.current) {
        return;
      }

      saveMutation.mutate({
        storyId,
        noteId: activeNote.id,
        noteType: activeNote.type,
        content: contentToSave
      });
    },
    [activeNote, editorContent, saveMutation, storyId, lastSavedContentRef]
  );

  useEffect(() => {
    if (!storyId || !activeNote || !note) {
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
  }, [activeNote, editorContent, note, scheduleSave, storyId]);

  useEffect(() => {
    if (!storyId || !activeNote) {
      return;
    }

    const handleBeforeUnload = () => {
      if (editorContentRef.current !== lastSavedContentRef.current) {
        scheduleSave();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [activeNote, scheduleSave, storyId]);

  useEffect(() => {
    const previous = previousActiveNoteRef.current;

    if (
      previous &&
      storyId &&
      editorContentRef.current !== lastSavedContentRef.current
    ) {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = undefined;
      }
      saveMutation.mutate({
        storyId,
        noteId: previous.id,
        noteType: previous.type,
        content: editorContentRef.current
      });
    }

    previousActiveNoteRef.current = activeNote ?? undefined;
  }, [activeNote, saveMutation, storyId]);

  useEffect(() => {
    return () => {
      const currentStoryId = storyIdRef.current;
      const currentActiveNote = activeNoteRef.current;
      const currentContent = editorContentRef.current;
      const lastSaved = lastSavedContentRef.current;
      if (
        currentStoryId &&
        currentActiveNote &&
        currentContent !== lastSaved
      ) {
        if (debounceRef.current) {
          window.clearTimeout(debounceRef.current);
          debounceRef.current = undefined;
        }
        saveMutation.mutate({
          storyId: currentStoryId,
          noteId: currentActiveNote.id,
          noteType: currentActiveNote.type,
          content: currentContent
        });
      }
    };
  }, [saveMutation]);

  return { scheduleSave };
}

