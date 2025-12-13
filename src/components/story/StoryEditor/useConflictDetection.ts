import type { Editor } from "@tiptap/react";
import { useEffect, useState } from "react";

import type { ConflictModalState } from "./types";
import { useConflictDetection } from "../../../hooks/useConflictDetection";
import type { Snippet, Story } from "../../../store/types";

type ChapterType = { driveFolderId?: string } | undefined;

export function useConflictDetectionHook(
  story: Story | undefined,
  editor: Editor | null,
  isEditorOpen: boolean,
  activeSnippet: Snippet | undefined,
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

    const timeoutId = setTimeout(() => {
      void checkConflicts();
    }, 1000);
    const handleVisibilityChange = () => {
      if (!document.hidden && isEditorOpen) {
        setTimeout(() => {
          void checkConflicts();
        }, 500);
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

