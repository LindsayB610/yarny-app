import { Stack } from "@mui/material";
import { useMemo, useEffect, type JSX } from "react";

import { usePlainTextEditor } from "../../../editor/plainTextEditor";
import { buildPlainTextDocument } from "../../../editor/textExtraction";
import { useStoryMetadata } from "../../../hooks/useStoryMetadata";
import { useYarnyStore } from "../../../store/provider";
import {
  selectActiveNote,
  selectActiveSnippet,
  selectActiveSnippetId,
  selectActiveStory,
  selectActiveStorySnippets,
  selectIsSyncing,
  selectLastSyncedAt
} from "../../../store/selectors";
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

export function StoryEditorView({ isLoading }: StoryEditorProps): JSX.Element {
  const story = useYarnyStore(selectActiveStory);
  const snippets = useYarnyStore(selectActiveStorySnippets);
  const activeSnippet = useYarnyStore(selectActiveSnippet);
  const activeSnippetId = useYarnyStore(selectActiveSnippetId);
  const activeNote = useYarnyStore(selectActiveNote);
  const selectSnippet = useYarnyStore((state) => state.selectSnippet);
  const upsertEntities = useYarnyStore((state) => state.upsertEntities);
  const chaptersById = useYarnyStore((state) => state.entities.chapters);
  const isSyncing = useYarnyStore(selectIsSyncing);
  const lastSyncedAt = useYarnyStore(selectLastSyncedAt);
  const { data: storyMetadata } = useStoryMetadata(story?.driveFileId);

  const initialDocument = useMemo(
    () => buildPlainTextDocument(activeSnippet?.content ?? ""),
    [activeSnippet?.content]
  );

  const editor = usePlainTextEditor({
    content: initialDocument
  });

  const [editorContent, setEditorContent] = useEditorContent(activeSnippet);
  const activeChapter = activeSnippet ? chaptersById[activeSnippet.chapterId] : undefined;

  const displayTitle = useMemo(
    () => getDisplayTitle(story?.title, storyMetadata?.title),
    [story?.title, storyMetadata?.title]
  );

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
  }, [story, snippets, activeSnippetId, selectSnippet, activeNote]);

  const {
    save: saveSnippet,
    isSaving: isAutoSaving,
    hasUnsavedChanges,
    markAsSaved: markContentAsSaved
  } = useAutoSaveConfig(activeSnippet, editorContent, story, activeChapter);

  const { isEditorOpen, isSettingContentRef } = useEditorSync(
    editor,
    activeSnippet,
    activeSnippetId,
    editorContent,
    hasUnsavedChanges,
    upsertEntities
  );

  useEditorContentSync(
    editor,
    activeSnippet,
    activeSnippetId,
    isEditorOpen,
    hasUnsavedChanges,
    isSettingContentRef
  );

  const { conflictModal, setConflictModal } = useConflictDetectionHook(
    story,
    editor,
    isEditorOpen,
    activeSnippet,
    activeChapter,
    editorContent
  );

  if (isLoading) {
    return <EmptyState variant="loading" />;
  }

  if (!story) {
    return <EmptyState variant="no-story" />;
  }

  if (activeNote) {
    return <EmptyState variant="note-active" />;
  }

  if (!activeSnippet) {
    return <EmptyState variant="no-snippet" />;
  }

  const handleSave = async () => {
    if (!activeSnippet?.driveFileId) return;
    try {
      await saveSnippet();
      markContentAsSaved(editorContent);
    } catch (error) {
      console.error("Manual save failed:", error);
    }
  };

  const handleConflictResolve = async (action: "useLocal" | "useDrive" | "cancel") => {
    if (action === "useDrive" && conflictModal.conflict) {
      const driveContent = conflictModal.conflict.driveContent;
      if (editor && driveContent && activeSnippet) {
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
      if (activeSnippet?.driveFileId) {
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
        canSave={Boolean(activeSnippet?.driveFileId)}
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
