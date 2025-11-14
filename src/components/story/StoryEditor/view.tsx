import { Stack } from "@mui/material";
import { useEffect, useMemo, useRef, type JSX } from "react";
import { useParams } from "react-router-dom";

import { useActiveContent } from "../../../hooks/useActiveContent";
import { useActiveSnippet } from "../../../hooks/useActiveSnippet";
import { useStoryMetadata } from "../../../hooks/useStoryMetadata";
import { useYarnyStore } from "../../../store/provider";
import {
  selectIsSyncing,
  selectLastSyncedAt
} from "../../../store/selectors";
import type { Note, Snippet } from "../../../store/types";
import { ConflictResolutionModal } from "../ConflictResolutionModal";
import { EditorContentArea } from "./EditorContentArea";
import { EditorHeader } from "./EditorHeader";
import { EmptyState } from "./EmptyState";
import type { StoryEditorProps } from "./types";
import { useAutoSaveConfig } from "./useAutoSaveConfig";
import { useConflictDetectionHook } from "./useConflictDetection";
import { useEditorContent } from "./useEditorContent";
import { useEditorContentSync } from "./useEditorContentSync";
import { useEditorSync } from "./useEditorSync";
import { getDisplayTitle } from "./utils";
import { usePlainTextEditor } from "../../../editor/plainTextEditor";
import { buildPlainTextDocument, extractPlainTextFromDocument } from "../../../editor/textExtraction";
import { useActiveStory } from "../../../hooks/useActiveStory";

export function StoryEditorView({ isLoading }: StoryEditorProps): JSX.Element {
  const { snippetId, noteId } = useParams<{
    storyId?: string;
    snippetId?: string;
    noteId?: string;
  }>();
  const story = useActiveStory();
  const activeContent = useActiveContent();
  const activeSnippet = useActiveSnippet(); // Keep for backward compatibility
  const upsertEntities = useYarnyStore((state) => state.upsertEntities);
  const chaptersById = useYarnyStore((state) => state.entities.chapters);
  const isSyncing = useYarnyStore(selectIsSyncing);
  const lastSyncedAt = useYarnyStore(selectLastSyncedAt);
  const { data: storyMetadata } = useStoryMetadata(story?.driveFileId);

  // Determine if we have a snippet or note
  const isSnippet = activeContent && "chapterId" in activeContent;
  const isNote = activeContent && "kind" in activeContent;
  const activeSnippetForEditor = isSnippet ? (activeContent as Snippet) : activeSnippet;
  const activeNoteForEditor = isNote ? (activeContent as Note) : undefined;

  const initialDocument = useMemo(
    () => buildPlainTextDocument(activeContent?.content ?? ""),
    [activeContent?.content]
  );

  const editor = usePlainTextEditor({
    content: initialDocument
  });

  const [editorContent, setEditorContent] = useEditorContent(activeSnippetForEditor);
  const editorContentDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeChapter = activeSnippetForEditor ? chaptersById[activeSnippetForEditor.chapterId] : undefined;

  const displayTitle = useMemo(
    () => getDisplayTitle(story?.title, storyMetadata?.title),
    [story?.title, storyMetadata?.title]
  );

  const {
    save: saveSnippet,
    isSaving: isAutoSaving,
    hasUnsavedChanges,
    markAsSaved: markContentAsSaved
  } = useAutoSaveConfig(activeSnippetForEditor, editorContent, story, activeChapter);

  // Block navigation when saving
  const isSaving = isAutoSaving || isSyncing;
  
  // Warn before page unload/refresh when saving
  useEffect(() => {
    if (!isSaving) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "A save operation is in progress. Are you sure you want to leave?";
      return e.returnValue;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isSaving]);


  const { isEditorOpen, isSettingContentRef } = useEditorSync(
    editor,
    activeContent,
    upsertEntities
  );

  useEditorContentSync(
    editor,
    activeSnippetForEditor,
    snippetId ?? noteId,
    isEditorOpen,
    hasUnsavedChanges,
    isSettingContentRef
  );

  // Update editorContent state when editor changes (debounced)
  useEffect(() => {
    if (!editor) {
      return;
    }

    const handleUpdate = () => {
      if (isSettingContentRef.current) {
        return;
      }

      // Clear existing timer
      if (editorContentDebounceRef.current) {
        clearTimeout(editorContentDebounceRef.current);
      }

      // Debounce state updates (150ms - faster than store updates for UI responsiveness)
      editorContentDebounceRef.current = setTimeout(() => {
        if (!editor || isSettingContentRef.current) {
          return;
        }
        const text = extractPlainTextFromDocument(editor.getJSON());
        setEditorContent(text);
      }, 150);
    };

    editor.on("update", handleUpdate);
    return () => {
      editor.off("update", handleUpdate);
      if (editorContentDebounceRef.current) {
        clearTimeout(editorContentDebounceRef.current);
      }
    };
  }, [editor, isSettingContentRef, setEditorContent]);

  const { conflictModal, setConflictModal } = useConflictDetectionHook(
    story,
    editor,
    isEditorOpen,
    activeSnippetForEditor,
    activeChapter,
    editorContent
  );

  if (isLoading) {
    return <EmptyState variant="loading" />;
  }

  if (!story) {
    return <EmptyState variant="no-story" />;
  }

  if (!activeContent) {
    if (noteId) {
      return <EmptyState variant="no-snippet" />; // TODO: Add note-specific empty state
    }
    return <EmptyState variant="no-snippet" />;
  }

  const handleSave = async () => {
    if (isSnippet && activeSnippetForEditor?.id && activeChapter?.driveFolderId) {
      try {
        await saveSnippet();
        markContentAsSaved(editorContent);
      } catch (error) {
        console.error("Manual save failed:", error);
      }
    } else if (isNote && activeNoteForEditor) {
      // TODO: Implement note save logic
      console.warn("Note save not yet implemented");
    }
  };

  const handleConflictResolve = async (action: "useLocal" | "useDrive" | "cancel") => {
    if (action === "useDrive" && conflictModal.conflict) {
      const driveContent = conflictModal.conflict.driveContent;
      if (editor && driveContent && activeSnippetForEditor) {
        isSettingContentRef.current = true;
        const driveDocument = buildPlainTextDocument(driveContent);
        editor.commands.setContent(driveDocument);
        setTimeout(() => {
          isSettingContentRef.current = false;
        }, 0);
        const now = new Date().toISOString();
        upsertEntities({
          snippets: [
            {
              ...activeSnippetForEditor,
              content: driveContent,
              updatedAt: now
            }
          ]
        });
        setEditorContent(driveContent);
        markContentAsSaved(driveContent);
      }
    } else if (action === "useLocal") {
      if (isSnippet && activeSnippetForEditor?.driveFileId) {
        try {
          await saveSnippet();
          markContentAsSaved(editorContent);
        } catch (error) {
          console.error("Failed to save local content:", error);
        }
      }
    }
    setConflictModal({ open: false, conflict: null });
  };

  const statusText =
    isAutoSaving || isSyncing
      ? "Syncing with Google Drive..."
      : hasUnsavedChanges
        ? "Unsaved changes"
        : lastSyncedAt
          ? `Last synced ${new Date(lastSyncedAt).toLocaleString()}`
          : "Not yet synced";

  return (
    <Stack spacing={3} sx={{ height: "100%" }}>
      <EditorHeader
        title={displayTitle}
        statusText={statusText}
        onSave={handleSave}
        isSaving={isAutoSaving}
        isSyncing={isSyncing}
        hasUnsavedChanges={hasUnsavedChanges}
        canSave={Boolean(
          (isSnippet && activeSnippetForEditor?.id && activeChapter?.driveFolderId) ||
          (isNote && activeNoteForEditor?.id)
        )}
      />
      <EditorContentArea editor={editor} />
      <ConflictResolutionModal
        open={conflictModal.open}
        conflict={conflictModal.conflict}
        onResolve={handleConflictResolve}
      />
    </Stack>
  );
}
