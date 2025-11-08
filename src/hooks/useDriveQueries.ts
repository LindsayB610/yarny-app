import {
  useMutation,
  useQuery,
  useQueryClient
} from "@tanstack/react-query";
import { useMemo } from "react";

import { createDriveClient } from "../api/driveClient";
import { useYarnyStore } from "../store/provider";
import {
  selectActiveStory,
  selectActiveStorySnippets,
  selectStoriesForSelectedProject
} from "../store/selectors";
import { mirrorStoryDocument } from "../services/localFs/localBackupMirror";

export const useDriveProjectsQuery = () => {
  const upsert = useYarnyStore((state) => state.upsertEntities);

  const driveClient = useMemo(() => createDriveClient(), []);

  return useQuery({
    queryKey: ["drive", "projects"],
    queryFn: async () => {
      const normalized = await driveClient.listProjects();
      upsert(normalized);
      return normalized;
    }
  });
};

export const useDriveStoryQuery = (storyId: string | undefined) => {
  const upsert = useYarnyStore((state) => state.upsertEntities);
  const driveClient = useMemo(() => createDriveClient(), []);

  return useQuery({
    queryKey: ["drive", "story", storyId],
    enabled: Boolean(storyId),
    queryFn: async () => {
      if (!storyId) {
        return null;
      }
      const normalized = await driveClient.getStory(storyId);
      upsert(normalized);
      return normalized;
    }
  });
};

export const useDriveSaveStoryMutation = () => {
  const queryClient = useQueryClient();
  const driveClient = useMemo(() => createDriveClient(), []);
  const activeStory = useYarnyStore(selectActiveStory);
  const activeSnippets = useYarnyStore(selectActiveStorySnippets);
  const setSyncing = useYarnyStore((state) => state.setSyncing);
  const setLastSyncedAt = useYarnyStore((state) => state.setLastSyncedAt);

  return useMutation({
    mutationKey: ["drive", "save-story", activeStory?.id],
    mutationFn: async (content: string) => {
      if (!activeStory) {
        throw new Error("No active story selected");
      }

      // Get the last snippet's revision ID if available
      const lastSnippet = activeSnippets[activeSnippets.length - 1];
      const revisionId = lastSnippet?.driveRevisionId;

      try {
        await driveClient.saveStory({
          storyId: activeStory.id,
          content,
          revisionId
        });
      } finally {
        await mirrorStoryDocument(activeStory.id, content);
      }
    },
    onMutate: () => {
      setSyncing(true);
    },
    onSuccess: async () => {
      setLastSyncedAt(new Date().toISOString());
      await queryClient.invalidateQueries({
        queryKey: ["drive", "story", activeStory?.id]
      });
    },
    onSettled: () => {
      setSyncing(false);
    }
  });
};

export const useSelectedProjectStories = () =>
  useYarnyStore(selectStoriesForSelectedProject);

