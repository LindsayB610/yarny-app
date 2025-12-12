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
  const projects = useYarnyStore((state) => state.entities.projects);
  const snippetFileName = useMemo(
    () => getSnippetFileName(activeSnippet, editorContent),
    [activeSnippet, editorContent]
  );

  // Check if this is a local project
  const isLocalProject = story ? projects[story.projectId]?.storageType === "local" : false;

  // Enable auto-save if we have snippetId and:
  // - For Drive projects: need parentFolderId (driveFolderId)
  // - For local projects: just need snippetId (parentFolderId not needed)
  const enabled = Boolean(
    activeSnippet?.id && 
    (isLocalProject || activeChapter?.driveFolderId)
  );

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

