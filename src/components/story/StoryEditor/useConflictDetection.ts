import type { Editor } from "@tiptap/react";
import { useEffect, useState } from "react";

import type { ConflictModalState } from "./types";
import { useConflictDetection } from "../../../hooks/useConflictDetection";
import type { useYarnyStore } from "../../../store/provider";
import type { selectActiveSnippet, selectActiveStory } from "../../../store/selectors";

type StoryType = ReturnType<typeof useYarnyStore<typeof selectActiveStory>>;
type SnippetType = ReturnType<typeof useYarnyStore<typeof selectActiveSnippet>>;
type ChapterType = { driveFolderId?: string };

export function useConflictDetectionHook(
  story: StoryType,
  editor: Editor | null,
  isEditorOpen: boolean,
  activeSnippet: SnippetType,
  activeChapter: ChapterType,
  editorContent: string
) {
  const { checkSnippetConflict } = useConflictDetection();
  const [conflictModal, setConflictModal] = useState<ConflictModalState>({
    open: false,
    conflict: null
  });

  useEffect(() => {
    if (!story || !editor || !isEditorOpen || !activeSnippet) return;

    const driveFileId = activeSnippet.driveFileId;
    if (!driveFileId) return;

    const checkConflicts = async () => {
      try {
        const localContent = editorContent;
        const parentFolderId = activeChapter?.driveFolderId ?? story.driveFileId;
        if (typeof parentFolderId !== "string" || parentFolderId.length === 0) return;

        const conflict = await checkSnippetConflict(
          activeSnippet.id,
          activeSnippet.updatedAt,
          driveFileId,
          parentFolderId,
          localContent
        );

        if (conflict) {
          setConflictModal({ open: true, conflict });
        }
      } catch (error) {
        console.error("Error checking conflicts:", error);
      }
    };

    const timeoutId = setTimeout(checkConflicts, 1000);
    const handleVisibilityChange = () => {
      if (!document.hidden && isEditorOpen) {
        setTimeout(checkConflicts, 500);
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [story, activeSnippet, activeChapter, checkSnippetConflict, editor, isEditorOpen, editorContent]);

  return { conflictModal, setConflictModal };
}

