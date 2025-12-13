import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "../api/client";
import { mirrorSnippetDelete, mirrorSnippetWrite } from "../services/localFs/localBackupMirror";
import { getPersistedDirectoryHandle } from "../services/localFs/LocalFsCapability";
import { createLocalFileStorage } from "../services/localFileStorage/localFileStorage";
import { useYarnyStore, useYarnyStoreApi } from "../store/provider";
import { selectActiveStory } from "../store/selectors";
import type {
  Chapter as ChapterEntity,
  Snippet as SnippetEntity
} from "../store/types";
import {
  countWords,
  createSnippetFileName,
  generateId,
  getChaptersFolderId,
  readDataJson,
  type StorySnippetData,
  writeDataJson
} from "./useStoryMutations.helpers";

/**
 * Hook for reordering snippets within a chapter
 * Updates the snippet order in data.json groups
 */
export function useReorderSnippetsMutation() {
  const queryClient = useQueryClient();
  const activeStory = useYarnyStore(selectActiveStory);
  const upsertEntities = useYarnyStore((state) => state.upsertEntities);

  return useMutation({
    mutationFn: async ({
      chapterId,
      newOrder
    }: {
      chapterId: string;
      newOrder: string[];
    }) => {
      if (!activeStory) {
        throw new Error("No active story selected");
      }

      // Read current data.json
      const { data, fileId } = await readDataJson(activeStory.driveFileId);

      // Update snippet order in the group
      const chapter = data.groups?.[chapterId];
      if (!chapter) {
        throw new Error("Chapter not found in data.json");
      }

      chapter.snippetIds = newOrder;

      // Update snippet order numbers
      if (data.snippets) {
        newOrder.forEach((snippetId, index) => {
          const snippet = data.snippets?.[snippetId];
          if (snippet) {
            // Note: The order field might not exist in data.json format
            // We'll update it if it exists, otherwise rely on snippetIds array order
            if (snippet.order !== undefined) {
              snippet.order = index;
            }
          }
        });
      }

      // Write updated data.json
      await writeDataJson(activeStory.driveFileId, data, fileId);

      // Update store
      const updatedChapter = data.groups?.[chapterId];
      if (updatedChapter) {
        upsertEntities({
          chapters: [
            {
              id: updatedChapter.id ?? chapterId,
              storyId: activeStory.id,
              title: updatedChapter.title ?? "Untitled",
              color: updatedChapter.color,
              order: updatedChapter.position || 0,
              snippetIds: newOrder,
              driveFolderId: updatedChapter.driveFolderId ?? "",
              updatedAt: new Date().toISOString()
            }
          ]
        });
      }
    },
    onSuccess: () => {
      // Invalidate story queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["drive", "story", activeStory?.id] });
      queryClient.invalidateQueries({ queryKey: ["drive", "story-progress", activeStory?.driveFileId] });
    }
  });
}

interface CreateSnippetParams {
  chapterId: string;
  title?: string;
}

export function useCreateSnippetMutation() {
  const queryClient = useQueryClient();
  const activeStory = useYarnyStore(selectActiveStory);
  const chaptersById = useYarnyStore((state) => state.entities.chapters);
  const upsertEntities = useYarnyStore((state) => state.upsertEntities);
  const selectSnippet = useYarnyStore((state) => state.selectSnippet);
  const projects = useYarnyStore((state) => state.entities.projects);

  return useMutation({
    mutationFn: async ({ chapterId, title }: CreateSnippetParams) => {
      if (!activeStory) {
        throw new Error("No active story selected");
      }

      // Check if this is a local project
      const project = projects[activeStory.projectId];
      const isLocalProject = project?.storageType === "local";

      const now = new Date().toISOString();

      // Handle local projects
      if (isLocalProject) {
        const rootHandle = await getPersistedDirectoryHandle();
        if (!rootHandle) {
          throw new Error("No persisted directory handle found for local project");
        }

        const localStorage = createLocalFileStorage();
        const result = await localStorage.createSnippet(
          rootHandle,
          activeStory.id,
          chapterId,
          title
        );

        const chapter = chaptersById[chapterId];
        if (!chapter) {
          throw new Error(`Chapter ${chapterId} not found`);
        }

        const newSnippet: SnippetEntity = {
          id: result.id,
          storyId: activeStory.id,
          chapterId,
          order: result.order,
          content: "",
          driveFileId: "",
          updatedAt: now
        };

        const updatedChapter: ChapterEntity = {
          ...chapter,
          snippetIds: [...chapter.snippetIds, result.id],
          updatedAt: now
        };

        upsertEntities({
          chapters: [updatedChapter],
          snippets: [newSnippet]
        });

        selectSnippet(result.id);

        return newSnippet;
      }

      // Handle Drive projects (existing logic)
      const { data, fileId } = await readDataJson(activeStory.driveFileId);

      if (!data.groups || !data.groups[chapterId]) {
        throw new Error("Chapter not found in data.json");
      }

      if (!data.snippets) {
        data.snippets = {};
      }

      const chapter = data.groups[chapterId];
      const existingSnippetCount = chapter.snippetIds?.length ?? 0;

      const snippetId = generateId("snippet");
      const snippetTitle = title?.trim() || `Snippet ${existingSnippetCount + 1}`;
      const snippetOrder = existingSnippetCount;

      let driveFileId: string | undefined;
      let driveModifiedTime: string | undefined;
      
      // Create JSON file first (JSON-primary storage)
      let jsonFileId: string | undefined;
      try {
        if (chapter.driveFolderId) {
          const { writeSnippetJson } = await import("../services/jsonStorage");
          const jsonResult = await writeSnippetJson(
            snippetId,
            "", // Empty content for new snippet
            chapter.driveFolderId,
            undefined // No Google Doc fileId yet - will be updated after Google Doc creation
          );
          jsonFileId = jsonResult.fileId;
        }
      } catch (error) {
        console.warn("Failed to create JSON file for snippet (non-fatal):", error);
      }
      
      // Optionally create Google Doc (non-blocking, can be created later via sync)
      try {
        if (chapter.driveFolderId) {
          const driveFile = await apiClient.writeDriveFile({
            fileName: `${snippetTitle}.doc`,
            content: "",
            parentFolderId: chapter.driveFolderId,
            mimeType: "application/vnd.google-apps.document"
          });
          driveFileId = driveFile.id;
          driveModifiedTime = driveFile.modifiedTime;
          
          // Update JSON file with Google Doc fileId if both were created
          if (jsonFileId && driveFileId && chapter.driveFolderId) {
            try {
              const { writeSnippetJson } = await import("../services/jsonStorage");
              await writeSnippetJson(
                snippetId,
                "", // Still empty content
                chapter.driveFolderId,
                driveFileId, // Now we have the Google Doc fileId
                driveModifiedTime
              );
            } catch (error) {
              console.warn("Failed to update JSON file with Google Doc fileId (non-fatal):", error);
            }
          }
        }
      } catch (error) {
        console.warn("Failed to create Drive document for snippet (non-fatal):", error);
      }

      const effectiveUpdatedAt = driveModifiedTime ?? now;

      data.snippets[snippetId] = {
        id: snippetId,
        groupId: chapterId,
        title: snippetTitle,
        body: "",
        words: 0,
        chars: 0,
        order: snippetOrder,
        driveFileId,
        updatedAt: effectiveUpdatedAt
      };

      chapter.snippetIds = [...(chapter.snippetIds ?? []), snippetId];

      await writeDataJson(activeStory.driveFileId, data, fileId);
      await mirrorSnippetWrite(activeStory.id, snippetId, "");

      const existingChapterEntity = chaptersById[chapter.id ?? chapterId];
      const chapterColor = chapter.color ?? existingChapterEntity?.color;

      const updatedChapter: ChapterEntity = {
        id: chapter.id ?? chapterId,
        storyId: activeStory.id,
        title: chapter.title ?? "Untitled",
        color: chapterColor,
        order: chapter.position ?? 0,
        snippetIds: chapter.snippetIds ?? [],
        driveFolderId: chapter.driveFolderId ?? "",
        updatedAt: effectiveUpdatedAt
      };

      const newSnippet: SnippetEntity = {
        id: snippetId,
        storyId: activeStory.id,
        chapterId,
        order: snippetOrder,
        content: "",
        driveFileId,
        updatedAt: effectiveUpdatedAt
      };

      upsertEntities({
        chapters: [updatedChapter],
        snippets: [newSnippet]
      });

      selectSnippet(snippetId);

      return newSnippet;
    },
    onSuccess: () => {
      if (activeStory) {
        const project = projects[activeStory.projectId];
        const isLocalProject = project?.storageType === "local";
        
        // Only invalidate Drive queries for Drive projects
        if (!isLocalProject) {
          queryClient.invalidateQueries({ queryKey: ["drive", "story", activeStory.id] });
          queryClient.invalidateQueries({
            queryKey: ["drive", "story-progress", activeStory.driveFileId]
          });
        }
      }
    }
  });
}

interface DuplicateSnippetParams {
  snippetId: string;
}

export function useDuplicateSnippetMutation() {
  const queryClient = useQueryClient();
  const activeStory = useYarnyStore(selectActiveStory);
  const upsertEntities = useYarnyStore((state) => state.upsertEntities);
  const storeApi = useYarnyStoreApi();
  const selectSnippet = useYarnyStore((state) => state.selectSnippet);

  return useMutation({
    mutationFn: async ({ snippetId }: DuplicateSnippetParams) => {
      if (!activeStory) {
        throw new Error("No active story selected");
      }

      const storeState = storeApi.getState();
      const snippetEntity = storeState.entities.snippets[snippetId];

      const { data, fileId } = await readDataJson(activeStory.driveFileId);
      if (!data.snippets || !data.groups) {
        throw new Error("Story data is missing groups or snippets");
      }

      const sourceSnippet = data.snippets[snippetId];
      const chapterId =
        sourceSnippet?.groupId ?? sourceSnippet?.chapterId ?? snippetEntity?.chapterId;
      if (!chapterId) {
        throw new Error("Snippet chapter could not be determined");
      }

      const chapter = data.groups[chapterId];
      if (!chapter) {
        throw new Error("Chapter not found in data.json");
      }

      const now = new Date().toISOString();
      const newSnippetId = generateId("snippet");
      const snippetBody = sourceSnippet?.body ?? snippetEntity?.content ?? "";

      let driveFileId: string | undefined;
      if (chapter.driveFolderId) {
        const snippetFirstLine = snippetBody.split("\n")[0] || "Snippet";
        try {
          const driveFile = await apiClient.writeDriveFile({
            fileName: `${snippetFirstLine} (Copy).doc`,
            content: snippetBody,
            parentFolderId: chapter.driveFolderId,
            mimeType: "application/vnd.google-apps.document"
          });
          driveFileId = driveFile.id;
        } catch (error) {
          console.warn("Failed to duplicate snippet document (non-fatal):", error);
        }
      }

      const insertionIndex = chapter.snippetIds?.indexOf(snippetId) ?? -1;
      const targetIndex = insertionIndex >= 0 ? insertionIndex + 1 : (chapter.snippetIds?.length ?? 0);
      const updatedSnippetIds = [...(chapter.snippetIds ?? [])];
      updatedSnippetIds.splice(targetIndex, 0, newSnippetId);
      chapter.snippetIds = updatedSnippetIds;

      const newSnippetEntry: StorySnippetData = sourceSnippet ? { ...sourceSnippet } : {};
      newSnippetEntry.id = newSnippetId;
      newSnippetEntry.groupId = chapterId;
      newSnippetEntry.chapterId = chapterId;
      newSnippetEntry.body = snippetBody;
      newSnippetEntry.content = snippetBody;
      newSnippetEntry.order = targetIndex;
      newSnippetEntry.driveFileId = driveFileId;
      newSnippetEntry.driveRevisionId = undefined;
      newSnippetEntry.updatedAt = now;
      newSnippetEntry.words = countWords(snippetBody);
      newSnippetEntry.chars = snippetBody.length;

      data.snippets[newSnippetId] = newSnippetEntry;

      updatedSnippetIds.forEach((id, index) => {
        const snippet = data.snippets?.[id];
        if (snippet) {
          snippet.order = index;
        }
      });

      await writeDataJson(activeStory.driveFileId, data, fileId);

      const updatedChapter: ChapterEntity = {
        id: chapter.id ?? chapterId,
        storyId: activeStory.id,
        title: chapter.title ?? "Untitled",
        color: chapter.color,
        order: chapter.position ?? 0,
        snippetIds: updatedSnippetIds,
        driveFolderId: chapter.driveFolderId ?? "",
        updatedAt: now
      };

      const newSnippetEntity: SnippetEntity = {
        id: newSnippetId,
        storyId: activeStory.id,
        chapterId,
        order: targetIndex,
        content: snippetBody,
        driveFileId,
        updatedAt: now
      };

      const snippetsToUpdate: SnippetEntity[] = [newSnippetEntity];
      updatedSnippetIds.forEach((id, index) => {
        if (id === newSnippetId) {
          return;
        }
        const existing = storeState.entities.snippets[id];
        if (existing && existing.order !== index) {
          snippetsToUpdate.push({
            ...existing,
            order: index
          });
        }
      });

      await mirrorSnippetWrite(activeStory.id, newSnippetId, snippetBody);

      upsertEntities({
        chapters: [updatedChapter],
        snippets: snippetsToUpdate
      });

      selectSnippet(newSnippetId);

      return newSnippetId;
    },
    onSuccess: () => {
      if (activeStory) {
        queryClient.invalidateQueries({ queryKey: ["drive", "story", activeStory.id] });
        queryClient.invalidateQueries({
          queryKey: ["drive", "story-progress", activeStory.driveFileId]
        });
      }
    }
  });
}

export function useDeleteSnippetMutation() {
  const queryClient = useQueryClient();
  const activeStory = useYarnyStore(selectActiveStory);
  const removeSnippet = useYarnyStore((state) => state.removeSnippet);

  return useMutation({
    mutationFn: async (snippetId: string) => {
      if (!activeStory) {
        throw new Error("No active story selected");
      }

      const { data, fileId } = await readDataJson(activeStory.driveFileId);
      if (!data.snippets || !data.groups) {
        throw new Error("Story data is missing groups or snippets");
      }

      const snippet = data.snippets[snippetId];
      const chapterId = snippet?.groupId ?? snippet?.chapterId;

      if (snippet?.driveFileId) {
        try {
          await apiClient.deleteDriveFile({ fileId: snippet.driveFileId });
        } catch (error) {
          console.warn("Failed to delete snippet file (non-fatal):", error);
        }
      }

      delete data.snippets[snippetId];

      if (chapterId) {
        const chapter = data.groups[chapterId];
        if (chapter?.snippetIds) {
          chapter.snippetIds = chapter.snippetIds.filter((id) => id !== snippetId);
          chapter.snippetIds.forEach((id, index) => {
            const entry = data.snippets?.[id];
            if (entry) {
              entry.order = index;
            }
          });
        }
      }

      await writeDataJson(activeStory.driveFileId, data, fileId);
      await mirrorSnippetDelete(activeStory.id, snippetId);

      removeSnippet(snippetId);
    },
    onSuccess: () => {
      if (activeStory) {
        queryClient.invalidateQueries({ queryKey: ["drive", "story", activeStory.id] });
        queryClient.invalidateQueries({
          queryKey: ["drive", "story-progress", activeStory.driveFileId]
        });
      }
    }
  });
}

interface RenameSnippetParams {
  snippetId: string;
  chapterId: string;
  title: string;
}

export function useRenameSnippetMutation() {
  const queryClient = useQueryClient();
  const activeStory = useYarnyStore(selectActiveStory);
  const upsertEntities = useYarnyStore((state) => state.upsertEntities);

  return useMutation({
    mutationFn: async ({ snippetId, chapterId, title }: RenameSnippetParams) => {
      if (!activeStory) {
        throw new Error("No active story selected");
      }

      const trimmedTitle = title.trim();
      if (!trimmedTitle) {
        throw new Error("Snippet title cannot be empty");
      }

      const { data, fileId } = await readDataJson(activeStory.driveFileId);

      if (!data.snippets?.[snippetId]) {
        throw new Error("Snippet not found in data.json");
      }

      const snippet = data.snippets[snippetId];
      snippet.title = trimmedTitle;
      snippet.updatedAt = new Date().toISOString();

      if (snippet.driveFileId) {
        try {
          await apiClient.renameDriveFile({
            fileId: snippet.driveFileId,
            newName: `${trimmedTitle}.doc`
          });
        } catch (error) {
          console.warn("Failed to rename Drive document for snippet (non-fatal):", error);
        }
      }

      await writeDataJson(activeStory.driveFileId, data, fileId);

      const chapter = data.groups?.[chapterId];
      if (chapter) {
        const updatedChapter: ChapterEntity = {
          id: chapter.id ?? chapterId,
          storyId: activeStory.id,
          title: chapter.title ?? "Untitled",
          color: chapter.color,
          order: chapter.position ?? 0,
          snippetIds: chapter.snippetIds ?? [],
          driveFolderId: chapter.driveFolderId ?? "",
          updatedAt: new Date().toISOString()
        };
        const updatedSnippet: SnippetEntity = {
          id: snippetId,
          storyId: activeStory.id,
          chapterId,
          order: snippet.order ?? 0,
          content: snippet.body ?? snippet.content ?? "",
          driveFileId: snippet.driveFileId,
          updatedAt: snippet.updatedAt ?? new Date().toISOString()
        };

        upsertEntities({
          chapters: [updatedChapter],
          snippets: [updatedSnippet]
        });
      }

      return {
        snippetId,
        title: trimmedTitle
      };
    },
    onSuccess: () => {
      if (activeStory) {
        queryClient.invalidateQueries({ queryKey: ["drive", "story", activeStory.id] });
        queryClient.invalidateQueries({
          queryKey: ["drive", "story-progress", activeStory.driveFileId]
        });
      }
    }
  });
}

/**
 * Hook for moving a snippet from one chapter to another
 * Updates both chapters' snippetIds and the snippet's groupId
 */
export function useMoveSnippetToChapterMutation() {
  const queryClient = useQueryClient();
  const activeStory = useYarnyStore(selectActiveStory);
  const upsertEntities = useYarnyStore((state) => state.upsertEntities);

  return useMutation({
    mutationFn: async ({
      snippetId,
      targetChapterId
    }: {
      snippetId: string;
      targetChapterId: string;
    }) => {
      if (!activeStory) {
        throw new Error("No active story selected");
      }

      // Read current data.json
      const { data, fileId } = await readDataJson(activeStory.driveFileId);

      if (!data.groups || !data.snippets) {
        throw new Error("Invalid data.json structure");
      }

      // Find source chapter (the one currently containing this snippet)
      let sourceChapterId: string | null = null;
      for (const [groupId, group] of Object.entries(data.groups)) {
        if (group.snippetIds && group.snippetIds.includes(snippetId)) {
          sourceChapterId = groupId;
          break;
        }
      }

      if (!sourceChapterId) {
        throw new Error("Snippet not found in any chapter");
      }

      const targetChapter = data.groups[targetChapterId];
      if (!targetChapter) {
        throw new Error("Target chapter not found");
      }

      // Remove snippet from source chapter
      const sourceChapter = data.groups[sourceChapterId];
      if (sourceChapter?.snippetIds) {
        sourceChapter.snippetIds = sourceChapter.snippetIds.filter(
          (id: string) => id !== snippetId
        );
      }

      // Add snippet to target chapter (at the end)
      if (!targetChapter.snippetIds) {
        targetChapter.snippetIds = [];
      }
      targetChapter.snippetIds.push(snippetId);

      // Update snippet's groupId
      const snippet = data.snippets[snippetId];
      if (snippet) {
        snippet.groupId = targetChapterId;
      }

      // Move the snippet file in Drive if it has a driveFileId
      if (snippet?.driveFileId) {
        try {
          let targetFolderId = targetChapter.driveFolderId;

          if (!targetFolderId) {
            const chaptersFolderId = await getChaptersFolderId(activeStory.driveFileId);
            if (chaptersFolderId) {
              try {
                const createdFolder = await apiClient.createDriveFolder({
                  name: targetChapter.title ?? "Untitled Chapter",
                  parentFolderId: chaptersFolderId
                });
                targetFolderId = createdFolder.id;
                targetChapter.driveFolderId = createdFolder.id;
              } catch (folderError) {
                console.warn(
                  "Failed to create target chapter folder while moving snippet:",
                  folderError
                );
              }
            }
          }

          if (targetFolderId) {
            const snippetContent = snippet.body ?? snippet.content ?? "";
            const fallbackName = `Snippet-${snippetId.slice(0, 8) || "moved"}`;
            const fileName = createSnippetFileName(snippetContent, fallbackName);

            const createdFile = await apiClient.writeDriveFile({
              fileName,
              content: snippetContent,
              parentFolderId: targetFolderId,
              mimeType: "application/vnd.google-apps.document"
            });

            await apiClient.deleteDriveFile({ fileId: snippet.driveFileId });

            snippet.driveFileId = createdFile.id;
            snippet.driveRevisionId = undefined;

            await mirrorSnippetWrite(activeStory.id, snippetId, snippetContent);
          }
        } catch (error) {
          console.warn("Failed to relocate snippet document in Drive:", error);
        }
      }

      // Write updated data.json
      await writeDataJson(activeStory.driveFileId, data, fileId);

      // Update store
      upsertEntities({
        chapters: [
          sourceChapter && {
            id: sourceChapter.id ?? sourceChapterId,
            storyId: activeStory.id,
            title: sourceChapter.title ?? "Untitled",
            color: sourceChapter.color,
            order: sourceChapter.position || 0,
            snippetIds: sourceChapter.snippetIds || [],
            driveFolderId: sourceChapter.driveFolderId ?? "",
            updatedAt: new Date().toISOString()
          },
          targetChapter && {
            id: targetChapter.id ?? targetChapterId,
            storyId: activeStory.id,
            title: targetChapter.title ?? "Untitled",
            color: targetChapter.color,
            order: targetChapter.position || 0,
            snippetIds: targetChapter.snippetIds || [],
            driveFolderId: targetChapter.driveFolderId ?? "",
            updatedAt: new Date().toISOString()
          }
        ].filter((chapter): chapter is NonNullable<typeof chapter> => Boolean(chapter)),
        snippets: snippet
          ? [
              {
                id: snippetId,
                storyId: activeStory.id,
                chapterId: targetChapterId,
                order: (targetChapter.snippetIds?.length || 1) - 1,
                content: snippet.body ?? snippet.content ?? "",
                driveFileId: snippet.driveFileId,
                driveRevisionId: snippet.driveRevisionId,
                updatedAt: new Date().toISOString()
              }
            ]
          : []
      });
    },
    onSuccess: () => {
      // Invalidate story queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["drive", "story", activeStory?.id] });
      queryClient.invalidateQueries({ queryKey: ["drive", "story-progress", activeStory?.driveFileId] });
    }
  });
}

