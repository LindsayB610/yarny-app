import { useMemo } from "react";

import { getSnippetFileName } from "./utils";
import { useAutoSave } from "../../../hooks/useAutoSave";
import { useYarnyStore } from "../../../store/provider";
import type { Snippet, Story } from "../../../store/types";

type ChapterType = { driveFolderId?: string } | undefined;

export function useAutoSaveConfig(
  activeSnippet: Snippet | undefined,
  editorContent: string,
  story: Story | undefined,
  activeChapter: ChapterType
) {
  const setSyncing = useYarnyStore((state) => state.setSyncing);
  const setLastSyncedAtAction = useYarnyStore((state) => state.setLastSyncedAt);
  const snippetFileName = useMemo(
    () => getSnippetFileName(activeSnippet, editorContent),
    [activeSnippet, editorContent]
  );

  // Enable auto-save if we have snippetId and parentFolderId (JSON-primary storage)
  // driveFileId is optional - we can save to JSON even without a Google Doc
  const enabled = Boolean(activeSnippet?.id && activeChapter?.driveFolderId);

  return useAutoSave(
    activeSnippet?.driveFileId, // Optional - can be undefined for JSON-only saves
    editorContent,
    {
      enabled,
      debounceMs: 2000,
      onSaveStart: () => {
        setSyncing(true);
      },
      onSaveSuccess: () => {
        setSyncing(false);
        setLastSyncedAtAction(new Date().toISOString());
      },
      onSaveError: (error) => {
        console.error("[AutoSaveConfig] Auto-save failed:", error);
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

