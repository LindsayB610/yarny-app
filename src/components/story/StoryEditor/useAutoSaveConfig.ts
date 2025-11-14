import { useMemo } from "react";

import { getSnippetFileName } from "./utils";
import { useAutoSave } from "../../../hooks/useAutoSave";
import { useYarnyStore } from "../../../store/provider";
import type { selectActiveSnippet, selectActiveStory } from "../../../store/selectors";

type SnippetType = ReturnType<typeof useYarnyStore<typeof selectActiveSnippet>>;
type StoryType = ReturnType<typeof useYarnyStore<typeof selectActiveStory>>;
type ChapterType = { driveFolderId?: string };

export function useAutoSaveConfig(
  activeSnippet: SnippetType,
  editorContent: string,
  story: StoryType,
  activeChapter: ChapterType
) {
  const setSyncing = useYarnyStore((state) => state.setSyncing);
  const setLastSyncedAtAction = useYarnyStore((state) => state.setLastSyncedAt);
  const snippetFileName = useMemo(
    () => getSnippetFileName(activeSnippet, editorContent),
    [activeSnippet, editorContent]
  );

  return useAutoSave(
    activeSnippet?.driveFileId,
    editorContent,
    {
      enabled: Boolean(activeSnippet?.driveFileId),
      debounceMs: 2000,
      onSaveStart: () => setSyncing(true),
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
}

