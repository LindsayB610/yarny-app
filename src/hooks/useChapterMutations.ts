import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  countWords,
  generateId,
  getChaptersFolderId,
  readDataJson,
  readProjectJson,
  type ProjectJson,
  type StorySnippetData,
  writeDataJson,
  writeProjectJson
} from "./useStoryMutations.helpers";
import { apiClient } from "../api/client";
import { listAllDriveFiles } from "../api/listAllDriveFiles";
import { createLocalFileStorage } from "../services/localFileStorage/localFileStorage";
import {
  mirrorProjectJsonWrite,
  mirrorSnippetDelete,
  mirrorSnippetWrite
} from "../services/localFs/localBackupMirror";
import { getPersistedDirectoryHandle } from "../services/localFs/LocalFsCapability";
import { useYarnyStore, useYarnyStoreApi } from "../store/provider";
import { selectActiveStory } from "../store/selectors";
import type {
  Chapter as ChapterEntity,
  NormalizedPayload,
  Snippet as SnippetEntity,
  Story as StoryEntity
} from "../store/types";
import { ACCENT_COLORS } from "../utils/contrastChecker";

/**
 * Hook for updating a chapter's color
 */
export function useUpdateChapterColorMutation() {
  const queryClient = useQueryClient();
  const activeStory = useYarnyStore(selectActiveStory);
  const upsertEntities = useYarnyStore((state) => state.upsertEntities);
  const activeStoryId = activeStory?.id;
  const storeApi = useYarnyStoreApi();
  const projects = useYarnyStore((state) => state.entities.projects);

  return useMutation({
    mutationFn: async ({
      chapterId,
      color
    }: {
      chapterId: string;
      color: string;
    }) => {
      if (!activeStory) {
        throw new Error("No active story selected");
      }

      // Check if this is a local project
      const project = projects[activeStory.projectId];
      const isLocalProject = project?.storageType === "local";

      // Handle local projects
      if (isLocalProject) {
        const rootHandle = await getPersistedDirectoryHandle();
        if (!rootHandle) {
          throw new Error("No persisted directory handle found for local project");
        }

        // Read yarny-story.json
        let storyDataFile: File;
        try {
          const storyHandle = await rootHandle.getFileHandle("yarny-story.json");
          storyDataFile = await storyHandle.getFile();
        } catch (error) {
          if ((error as DOMException).name === "NotFoundError") {
            throw new Error("yarny-story.json not found");
          }
          throw error;
        }
        
        const storyDataContent = await storyDataFile.text();
        const storyData: {
          id?: string;
          title?: string;
          chapterIds?: string[];
          updatedAt?: string;
          chapters?: Array<{
            id: string;
            title: string;
            order: number;
            snippetIds: string[];
            color?: string;
          }>;
        } = JSON.parse(storyDataContent);

        if (!storyData) {
          throw new Error("Story metadata not found");
        }

        const chapters = storyData.chapters ?? [];
        const chapter = chapters.find((ch) => ch.id === chapterId);
        if (!chapter) {
          throw new Error(`Chapter ${chapterId} not found`);
        }

        // Update chapter color
        const updatedChapters = chapters.map((ch) =>
          ch.id === chapterId ? { ...ch, color } : ch
        );

        // Write updated metadata
        const updatedStoryData = {
          ...storyData,
          chapters: updatedChapters,
          updatedAt: new Date().toISOString()
        };
        
        const storyHandle = await rootHandle.getFileHandle("yarny-story.json", { create: true });
        const writable = await storyHandle.createWritable();
        await writable.write(JSON.stringify(updatedStoryData, null, 2));
        await writable.close();

        const updatedAt = new Date().toISOString();
        return {
          id: chapterId,
          storyId: activeStory.id,
          title: chapter.title,
          color,
          order: chapter.order,
          snippetIds: chapter.snippetIds,
          driveFolderId: "",
          updatedAt
        };
      }

      // Handle Drive projects (existing logic)
      const { data, fileId } = await readDataJson(activeStory.driveFileId);

      if (!data.groups?.[chapterId]) {
        throw new Error("Chapter not found in data.json");
      }

      const chapter = data.groups[chapterId];
      const updatedAt = new Date().toISOString();

      chapter.color = color;
      chapter.updatedAt = updatedAt;

      await writeDataJson(activeStory.driveFileId, data, fileId);

      return {
        id: chapter.id ?? chapterId,
        storyId: activeStory.id,
        title: chapter.title ?? "Untitled",
        color: chapter.color,
        order: chapter.position ?? 0,
        snippetIds: chapter.snippetIds ?? [],
        driveFolderId: chapter.driveFolderId ?? "",
        updatedAt
      };
    },
    onMutate: async ({ chapterId, color }) => {
      if (!activeStoryId) {
        return null;
      }

      await queryClient.cancelQueries({ queryKey: ["drive", "story", activeStoryId] });

      const previousStoryData = queryClient.getQueryData<NormalizedPayload | null | undefined>([
        "drive",
        "story",
        activeStoryId
      ]);

      const storeState = storeApi.getState();
      const previousChapter = storeState.entities.chapters[chapterId];

      if (previousChapter) {
        const optimisticChapter = {
          ...previousChapter,
          color,
          updatedAt: new Date().toISOString()
        };

        upsertEntities({ chapters: [optimisticChapter] });
      }

      return {
        previousChapter,
        previousStoryData
      };
    },
    onSuccess: (chapter) => {
      upsertEntities({ chapters: [chapter] });
      
      // Check if it's a local project
      const project = projects[activeStory?.projectId ?? ""];
      const isLocalProject = project?.storageType === "local";
      
      if (activeStoryId) {
        if (!isLocalProject) {
          // Only update Drive query cache for Drive projects
          queryClient.setQueryData<NormalizedPayload | null | undefined>(
            ["drive", "story", activeStoryId],
            (previous) => {
              if (!previous?.chapters) {
                return previous;
              }

              const nextChapters = previous.chapters.map((existingChapter) =>
                existingChapter.id === chapter.id
                  ? {
                      ...existingChapter,
                      color: chapter.color,
                      updatedAt: chapter.updatedAt
                    }
                  : existingChapter
              );

              return {
                ...previous,
                chapters: nextChapters
              };
            }
          );

          setTimeout(() => {
            void queryClient.invalidateQueries({ queryKey: ["drive", "story", activeStoryId] });
          }, 750);
        } else {
          // For local projects, invalidate local projects query
          void queryClient.invalidateQueries({ queryKey: ["local", "projects"] });
        }
      }
    },
    onError: (_error, _variables, context) => {
      if (!context) {
        return;
      }

      if (context.previousChapter) {
        upsertEntities({ chapters: [context.previousChapter] });
      }

      if (context.previousStoryData && activeStoryId) {
        queryClient.setQueryData(["drive", "story", activeStoryId], context.previousStoryData);
      }
    }
  });
}

/**
 * Hook for reordering chapters
 * Updates the position field in data.json groups
 */
export function useReorderChaptersMutation() {
  const queryClient = useQueryClient();
  const activeStory = useYarnyStore(selectActiveStory);
  const upsertEntities = useYarnyStore((state) => state.upsertEntities);

  return useMutation({
    mutationFn: async (newOrder: string[]) => {
      if (!activeStory) {
        throw new Error("No active story selected");
      }

      // Read current data.json
      const { data, fileId } = await readDataJson(activeStory.driveFileId);

      // Update group positions based on new order
      if (!data.groups) {
        throw new Error("No groups found in data.json");
      }

      newOrder.forEach((groupId, index) => {
        const group = data.groups?.[groupId];
        if (group) {
          group.position = index;
        }
      });

      // Update project.json groupIds order
      // Read project.json to update groupIds
      const files = await listAllDriveFiles(activeStory.driveFileId);
      const projectJsonFile = files.find((file) => file.name === "project.json");
      if (projectJsonFile) {
        const projectContent = await apiClient.readDriveFile({ fileId: projectJsonFile.id });
        if (projectContent.content) {
          const project = JSON.parse(projectContent.content) as {
            groupIds?: string[];
            updatedAt?: string;
          };
          project.groupIds = newOrder;
          project.updatedAt = new Date().toISOString();

          const serializedProject = JSON.stringify(project, null, 2);

          await apiClient.writeDriveFile({
            fileId: projectJsonFile.id,
            fileName: "project.json",
            content: serializedProject,
            parentFolderId: activeStory.driveFileId
          });

          await mirrorProjectJsonWrite(activeStory.driveFileId, serializedProject);
        }
      }

      // Write updated data.json
      await writeDataJson(activeStory.driveFileId, data, fileId);

      // Update store with new chapter order
      const chapters = newOrder
        .map((id) => {
          const group = data.groups?.[id];
          if (!group) return null;
          return {
            id: group.id ?? id,
            storyId: activeStory.id,
            title: group.title ?? "Untitled",
            color: group.color,
            order: group.position ?? 0,
            snippetIds: group.snippetIds ?? [],
            driveFolderId: group.driveFolderId ?? "",
            updatedAt: new Date().toISOString()
          };
        })
        .filter((c): c is NonNullable<typeof c> => c !== null);

      upsertEntities({ chapters });
    },
    onSuccess: () => {
      // Invalidate story queries to refresh data
      void queryClient.invalidateQueries({ queryKey: ["drive", "story", activeStory?.id] });
      void queryClient.invalidateQueries({ queryKey: ["drive", "story-progress", activeStory?.driveFileId] });
    }
  });
}

/**
 * Hook for creating a new chapter in the active story
 */
export function useCreateChapterMutation() {
  const queryClient = useQueryClient();
  const activeStory = useYarnyStore(selectActiveStory);
  const upsertEntities = useYarnyStore((state) => state.upsertEntities);
  const storeApi = useYarnyStoreApi();
  const projects = useYarnyStore((state) => state.entities.projects);

  return useMutation({
    mutationFn: async ({ title }: { title?: string } = {}) => {
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
        const result = await localStorage.createChapter(rootHandle, activeStory.id, title);

        const defaultColor =
          ACCENT_COLORS[result.order % ACCENT_COLORS.length]?.value ?? "#3B82F6";

        const newChapter: ChapterEntity = {
          id: result.id,
          storyId: activeStory.id,
          title: result.title,
          color: defaultColor,
          order: result.order,
          snippetIds: [],
          driveFolderId: "",
          updatedAt: now
        };

        const storeState = storeApi.getState();
        const currentStory = storeState.entities.stories[activeStory.id];
        if (currentStory) {
          const storyUpdate: StoryEntity = {
            ...currentStory,
            chapterIds: [...currentStory.chapterIds, result.id],
            updatedAt: now
          };
          upsertEntities({
            chapters: [newChapter],
            stories: [storyUpdate]
          });
        } else {
          upsertEntities({
            chapters: [newChapter]
          });
        }

        return newChapter;
      }

      // Handle Drive projects (existing logic)
      const { data, fileId } = await readDataJson(activeStory.driveFileId);
      const { project: projectData, fileId: projectFileId } = await readProjectJson(activeStory.driveFileId);

      if (!data.groups) {
        data.groups = {};
      }

      const existingChapterCount = Object.keys(data.groups).length;
      const groupId = generateId("group");
      const defaultColor =
        ACCENT_COLORS[existingChapterCount % ACCENT_COLORS.length]?.value ?? "#3B82F6";
      const chapterTitle = title?.trim() ?? `Chapter ${existingChapterCount + 1}`;

      let driveFolderId = "";
      const chaptersFolderId = await getChaptersFolderId(activeStory.driveFileId);
      if (chaptersFolderId) {
        try {
          const createdFolder = await apiClient.createDriveFolder({
            name: chapterTitle,
            parentFolderId: chaptersFolderId
          });
          driveFolderId = createdFolder.id;
        } catch (error) {
          console.warn("Failed to create chapter folder in Drive (non-fatal):", error);
        }
      }

      data.groups[groupId] = {
        id: groupId,
        title: chapterTitle,
        color: defaultColor,
        position: existingChapterCount,
        snippetIds: [],
        driveFolderId,
        updatedAt: now
      };

      if (!data.snippets) {
        data.snippets = {};
      }

      const updatedProject: ProjectJson = {
        ...projectData,
        groupIds: [...(projectData.groupIds ?? []), groupId],
        updatedAt: now
      };

      await writeDataJson(activeStory.driveFileId, data, fileId);
      await writeProjectJson(activeStory.driveFileId, updatedProject, projectFileId);

      const newChapter: ChapterEntity = {
        id: groupId,
        storyId: activeStory.id,
        title: chapterTitle,
        color: defaultColor,
        order: existingChapterCount,
        snippetIds: [],
        driveFolderId,
        updatedAt: now
      };

      const storeState = storeApi.getState();
      const currentStory = storeState.entities.stories[activeStory.id];
      if (currentStory) {
        const storyUpdate: StoryEntity = {
          ...currentStory,
          chapterIds: [...currentStory.chapterIds, groupId],
          updatedAt: now
        };
        upsertEntities({
          chapters: [newChapter],
          stories: [storyUpdate]
        });
      } else {
        upsertEntities({
          chapters: [newChapter]
        });
      }

      return newChapter;
    },
    onSuccess: () => {
      if (activeStory) {
        const project = projects[activeStory.projectId];
        const isLocalProject = project?.storageType === "local";
        
        // Only invalidate Drive queries for Drive projects
        if (!isLocalProject) {
          void queryClient.invalidateQueries({ queryKey: ["drive", "story", activeStory.id] });
          void queryClient.invalidateQueries({
            queryKey: ["drive", "story-progress", activeStory.driveFileId]
          });
          void queryClient.invalidateQueries({
            queryKey: ["drive", "story-metadata", activeStory.driveFileId]
          });
        }
      }
    }
  });
}

interface DuplicateChapterParams {
  chapterId: string;
}

export function useDuplicateChapterMutation() {
  const queryClient = useQueryClient();
  const activeStory = useYarnyStore(selectActiveStory);
  const upsertEntities = useYarnyStore((state) => state.upsertEntities);
  const storeApi = useYarnyStoreApi();

  return useMutation({
    mutationFn: async ({ chapterId }: DuplicateChapterParams) => {
      if (!activeStory) {
        throw new Error("No active story selected");
      }

      const storeState = storeApi.getState();
      const chapterEntity = storeState.entities.chapters[chapterId];
      if (!chapterEntity) {
        throw new Error("Chapter not found");
      }

      const { data, fileId } = await readDataJson(activeStory.driveFileId);
      const { project, fileId: projectFileId } = await readProjectJson(activeStory.driveFileId);

      if (!data.groups || !data.snippets) {
        throw new Error("Story data is missing groups or snippets");
      }

      const sourceChapter = data.groups[chapterId];
      if (!sourceChapter) {
        throw new Error("Chapter not found in data.json");
      }

      const now = new Date().toISOString();
      const newChapterId = generateId("group");
      const existingTitles = new Set(
        Object.values(data.groups)
          .map((group) => group?.title?.toLowerCase())
          .filter((title): title is string => Boolean(title))
      );
      const baseTitle = sourceChapter.title ?? chapterEntity.title ?? "Untitled Chapter";
      let duplicateTitle = `${baseTitle} Copy`;
      let suffix = 2;
      while (existingTitles.has(duplicateTitle.toLowerCase())) {
        duplicateTitle = `${baseTitle} Copy ${suffix++}`;
      }

      let driveFolderId = "";
      const chaptersFolderId = await getChaptersFolderId(activeStory.driveFileId);
      if (chaptersFolderId) {
        try {
          const createdFolder = await apiClient.createDriveFolder({
            name: duplicateTitle,
            parentFolderId: chaptersFolderId
          });
          driveFolderId = createdFolder.id;
        } catch (error) {
          console.warn("Failed to create duplicate chapter folder (non-fatal):", error);
        }
      }

      const sourceSnippetIds = [...(sourceChapter.snippetIds ?? [])];
      const newSnippetIds: string[] = [];
      const newSnippetEntities: SnippetEntity[] = [];

      for (let index = 0; index < sourceSnippetIds.length; index += 1) {
        const snippetId = sourceSnippetIds[index];
        const rawSnippet = data.snippets?.[snippetId];
        const snippetEntity = storeState.entities.snippets[snippetId];
        const snippetBody = rawSnippet?.body ?? snippetEntity?.content ?? "";
        const newSnippetId = generateId("snippet");
        let newDriveFileId: string | undefined;

        if (driveFolderId) {
          const snippetFirstLine = snippetBody.split("\n")[0] ?? "Snippet";
          try {
            const driveFile = await apiClient.writeDriveFile({
              fileName: `${snippetFirstLine} (Copy).doc`,
              content: snippetBody,
              parentFolderId: driveFolderId,
              mimeType: "application/vnd.google-apps.document"
            });
            newDriveFileId = driveFile.id;
          } catch (error) {
            console.warn("Failed to duplicate snippet document (non-fatal):", error);
          }
        }

        const newSnippetEntry: StorySnippetData = rawSnippet ? { ...rawSnippet } : {};
        newSnippetEntry.id = newSnippetId;
        newSnippetEntry.groupId = newChapterId;
        newSnippetEntry.chapterId = newChapterId;
        newSnippetEntry.body = snippetBody;
        newSnippetEntry.content = snippetBody;
        newSnippetEntry.order = index;
        newSnippetEntry.driveFileId = newDriveFileId;
        newSnippetEntry.driveRevisionId = undefined;
        newSnippetEntry.updatedAt = now;
        newSnippetEntry.words = countWords(snippetBody);
        newSnippetEntry.chars = snippetBody.length;

        data.snippets[newSnippetId] = newSnippetEntry;
        newSnippetIds.push(newSnippetId);

        newSnippetEntities.push({
          id: newSnippetId,
          storyId: activeStory.id,
          chapterId: newChapterId,
          order: index,
          content: snippetBody,
          driveFileId: newDriveFileId,
          updatedAt: now
        });

        await mirrorSnippetWrite(activeStory.id, newSnippetId, snippetBody);
      }

      data.groups[newChapterId] = {
        ...sourceChapter,
        id: newChapterId,
        title: duplicateTitle,
        snippetIds: newSnippetIds,
        driveFolderId,
        position: (sourceChapter.position ?? chapterEntity.order) + 1,
        updatedAt: now
      };

      const groupIds = [...(project.groupIds ?? [])];
      const sourceIndex = groupIds.indexOf(chapterId);
      const insertIndex = sourceIndex === -1 ? groupIds.length : sourceIndex + 1;
      groupIds.splice(insertIndex, 0, newChapterId);
      project.groupIds = groupIds;
      project.updatedAt = now;

      groupIds.forEach((id, index) => {
        const group = data.groups?.[id];
        if (group) {
          group.position = index;
        }
      });

      await writeProjectJson(activeStory.driveFileId, project, projectFileId);
      await writeDataJson(activeStory.driveFileId, data, fileId);

      const newChapterEntity: ChapterEntity = {
        id: newChapterId,
        storyId: activeStory.id,
        title: duplicateTitle,
        color: sourceChapter.color,
        order: insertIndex,
        snippetIds: newSnippetIds,
        driveFolderId: driveFolderId ?? "",
        updatedAt: now
      };

      const story = storeState.entities.stories[activeStory.id];
      const storyUpdate: StoryEntity | undefined = story
        ? {
            ...story,
            chapterIds: (() => {
              const ids = [...story.chapterIds];
              const idx = ids.indexOf(chapterId);
              ids.splice(idx === -1 ? ids.length : idx + 1, 0, newChapterId);
              return ids;
            })(),
            updatedAt: now
          }
        : undefined;

      upsertEntities({
        chapters: [newChapterEntity],
        snippets: newSnippetEntities,
        stories: storyUpdate ? [storyUpdate] : undefined
      });

      return newChapterId;
    },
    onSuccess: () => {
      if (activeStory) {
        void queryClient.invalidateQueries({ queryKey: ["drive", "story", activeStory.id] });
        void queryClient.invalidateQueries({
          queryKey: ["drive", "story-progress", activeStory.driveFileId]
        });
        void queryClient.invalidateQueries({
          queryKey: ["drive", "story-metadata", activeStory.driveFileId]
        });
      }
    }
  });
}

export function useDeleteChapterMutation() {
  const queryClient = useQueryClient();
  const activeStory = useYarnyStore(selectActiveStory);
  const removeChapter = useYarnyStore((state) => state.removeChapter);

  return useMutation({
    mutationFn: async (chapterId: string) => {
      if (!activeStory) {
        throw new Error("No active story selected");
      }

      const { data, fileId } = await readDataJson(activeStory.driveFileId);
      const { project, fileId: projectFileId } = await readProjectJson(activeStory.driveFileId);

      if (!data.groups) {
        throw new Error("Story data is missing groups");
      }

      const chapter = data.groups[chapterId];
      if (!chapter) {
        throw new Error("Chapter not found in data.json");
      }

      const snippetIds = [...(chapter.snippetIds ?? [])];

      for (const snippetId of snippetIds) {
        const snippet = data.snippets?.[snippetId];
        if (snippet?.driveFileId) {
          try {
            await apiClient.deleteDriveFile({ fileId: snippet.driveFileId });
          } catch (error) {
            console.warn("Failed to delete snippet file (non-fatal):", error);
          }
        }
        if (data.snippets) {
          delete data.snippets[snippetId];
        }

        await mirrorSnippetDelete(activeStory.id, snippetId);
      }

      delete data.groups[chapterId];

      if (project.groupIds) {
        project.groupIds = project.groupIds.filter((id) => id !== chapterId);
        project.updatedAt = new Date().toISOString();
      }

      await writeProjectJson(activeStory.driveFileId, project, projectFileId);
      await writeDataJson(activeStory.driveFileId, data, fileId);

      removeChapter(chapterId);
    },
    onSuccess: () => {
      if (activeStory) {
        void queryClient.invalidateQueries({ queryKey: ["drive", "story", activeStory.id] });
        void queryClient.invalidateQueries({
          queryKey: ["drive", "story-progress", activeStory.driveFileId]
        });
        void queryClient.invalidateQueries({
          queryKey: ["drive", "story-metadata", activeStory.driveFileId]
        });
      }
    }
  });
}

interface RenameChapterParams {
  chapterId: string;
  title: string;
}

export function useRenameChapterMutation() {
  const queryClient = useQueryClient();
  const activeStory = useYarnyStore(selectActiveStory);
  const upsertEntities = useYarnyStore((state) => state.upsertEntities);

  return useMutation({
    mutationFn: async ({ chapterId, title }: RenameChapterParams) => {
      if (!activeStory) {
        throw new Error("No active story selected");
      }

      const trimmedTitle = title.trim();
      if (!trimmedTitle) {
        throw new Error("Chapter title cannot be empty");
      }

      const { data, fileId } = await readDataJson(activeStory.driveFileId);
      const chapter = data.groups?.[chapterId];

      if (!chapter) {
        throw new Error("Chapter not found in data.json");
      }

      chapter.title = trimmedTitle;
      chapter.updatedAt = new Date().toISOString();

      await writeDataJson(activeStory.driveFileId, data, fileId);

      const updatedChapter: ChapterEntity = {
        id: chapter.id ?? chapterId,
        storyId: activeStory.id,
        title: trimmedTitle,
        color: chapter.color,
        order: chapter.position ?? 0,
        snippetIds: chapter.snippetIds ?? [],
        driveFolderId: chapter.driveFolderId ?? "",
        updatedAt: chapter.updatedAt ?? new Date().toISOString()
      };

      upsertEntities({ chapters: [updatedChapter] });

      return updatedChapter;
    },
    onSuccess: () => {
      if (activeStory) {
        void queryClient.invalidateQueries({ queryKey: ["drive", "story", activeStory.id] });
        void queryClient.invalidateQueries({
          queryKey: ["drive", "story-progress", activeStory.driveFileId]
        });
      }
    }
  });
}

