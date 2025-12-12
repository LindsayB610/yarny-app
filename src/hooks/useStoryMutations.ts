import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { apiClient } from "../api/client";
import type { DriveDeleteStoryRequest } from "../api/contract";
import { listAllDriveFiles } from "../api/listAllDriveFiles";
import {
  mirrorDataJsonWrite,
  mirrorGoalJsonWrite,
  mirrorProjectJsonWrite,
  mirrorSnippetDelete,
  mirrorSnippetWrite
} from "../services/localFs/localBackupMirror";
import { useYarnyStore, useYarnyStoreApi } from "../store/provider";
import { selectActiveStory } from "../store/selectors";
import { getPersistedDirectoryHandle } from "../services/localFs/LocalFsCapability";
import { createLocalFileStorage } from "../services/localFileStorage/localFileStorage";
import type {
  Chapter as ChapterEntity,
  NormalizedPayload,
  Snippet as SnippetEntity,
  Story as StoryEntity
} from "../store/types";
import { ACCENT_COLORS } from "../utils/contrastChecker";
import type { StoryMetadata } from "../utils/storyCreation";
import { initializeStoryStructure } from "../utils/storyCreation";
import { clearStoryProgress } from "../utils/storyProgressCache";

interface StoryDataJson {
  groups?: Record<string, StoryGroupData>;
  snippets?: Record<string, StorySnippetData>;
}

interface StoryGroupData {
  id?: string;
  title?: string;
  color?: string;
  snippetIds?: string[];
  position?: number;
  driveFolderId?: string;
  updatedAt?: string;
}

interface StorySnippetData {
  id?: string;
  chapterId?: string;
  groupId?: string;
  order?: number;
  body?: string;
  content?: string;
  driveFileId?: string;
  driveRevisionId?: string;
  updatedAt?: string;
}

/**
 * Helper function to read data.json from a story folder
 */
async function readDataJson(storyFolderId: string): Promise<{
  data: StoryDataJson;
  fileId: string;
}> {
  // List files in the story folder
  const files = await listAllDriveFiles(storyFolderId);

  const dataJsonFile = files.find((file) => file.name === "data.json");
  if (!dataJsonFile) {
    throw new Error("data.json not found in story folder");
  }

  // Read data.json
  const dataContent = await apiClient.readDriveFile({ fileId: dataJsonFile.id });
  if (!dataContent.content) {
    throw new Error("data.json is empty");
  }

  const data = JSON.parse(dataContent.content) as StoryDataJson;
  return { data, fileId: dataJsonFile.id };
}

/**
 * Helper function to write data.json to a story folder
 */
async function writeDataJson(
  storyFolderId: string,
  data: StoryDataJson,
  fileId?: string
): Promise<void> {
  const content = JSON.stringify(data, null, 2);

  if (fileId) {
    // Update existing file
    await apiClient.writeDriveFile({
      fileId,
      fileName: "data.json",
      content,
      parentFolderId: storyFolderId
    });
  } else {
    // Create new file
    await apiClient.writeDriveFile({
      fileName: "data.json",
      content,
      parentFolderId: storyFolderId
    });
  }

  await mirrorDataJsonWrite(storyFolderId, content);

  clearStoryProgress(storyFolderId);
}

function generateId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
}

const countWords = (text: string): number => {
  if (!text) {
    return 0;
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return 0;
  }

  return trimmed.split(/\s+/).length;
};

const createSnippetFileName = (content: string, fallback: string): string => {
  const firstLine = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  const sanitized = (firstLine ?? fallback).replace(/[\\/:*?"<>|]+/g, "").slice(0, 60).trim();
  const baseName = sanitized.length > 0 ? sanitized : fallback;

  return baseName.toLowerCase().endsWith(".doc") ? baseName : `${baseName}.doc`;
};

interface ProjectJson {
  name?: string;
  projectId?: string;
  description?: string;
  genre?: string;
  wordGoal?: number;
  groupIds?: string[];
  activeSnippetId?: string;
  updatedAt?: string;
}

async function readProjectJson(storyFolderId: string): Promise<{
  project: ProjectJson;
  fileId: string | undefined;
}> {
  const files = await listAllDriveFiles(storyFolderId);

  const projectJsonFile = files.find((file) => file.name === "project.json");

  if (!projectJsonFile?.id) {
    return {
      project: {},
      fileId: undefined
    };
  }

  const projectContent = await apiClient.readDriveFile({ fileId: projectJsonFile.id });
  if (!projectContent.content) {
    return {
      project: {},
      fileId: projectJsonFile.id
    };
  }

  try {
    return {
      project: JSON.parse(projectContent.content) as ProjectJson,
      fileId: projectJsonFile.id
    };
  } catch (error) {
    console.warn("Failed to parse project.json", error);
    return {
      project: {},
      fileId: projectJsonFile.id
    };
  }
}

async function writeProjectJson(
  storyFolderId: string,
  project: ProjectJson,
  fileId?: string
): Promise<void> {
  const updatedProject = {
    ...project,
    updatedAt: new Date().toISOString()
  };

  const content = JSON.stringify(updatedProject, null, 2);

  await apiClient.writeDriveFile({
    fileId,
    fileName: "project.json",
    content,
    parentFolderId: storyFolderId
  });

  await mirrorProjectJsonWrite(storyFolderId, content);

  clearStoryProgress(storyFolderId);
}

async function getChaptersFolderId(storyFolderId: string): Promise<string | undefined> {
  try {
    const files = await listAllDriveFiles(storyFolderId);

    const chaptersFolder = files.find(
      (file) =>
        file.mimeType === "application/vnd.google-apps.folder" && file.name === "Chapters"
    );

    return chaptersFolder?.id;
  } catch (error) {
    console.warn("Failed to locate Chapters folder", error);
    return undefined;
  }
}
/**
 * Hook for creating a new story
 * This orchestrates multiple Drive API calls to create the story structure
 */
export function useCreateStory() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (params: {
      storyName: string;
      metadata?: StoryMetadata;
    }) => {
      // Get or create Yarny Stories folder
      const yarnyFolder = await apiClient.getOrCreateYarnyStories();

      // Create story folder
      const storyFolder = await apiClient.createDriveFolder({
        name: params.storyName,
        parentFolderId: yarnyFolder.id
      });

      // Initialize story structure (project.json, data.json, goal.json, folders)
      try {
        await initializeStoryStructure(storyFolder.id, params.metadata);
      } catch (error) {
        // Check if this is a scope issue that requires re-authorization
        if (error instanceof Error) {
          const scopedError = error as Error & { code?: string; requiresReauth?: boolean };
          const requiresReauth =
            scopedError.code === "MISSING_DOCS_SCOPE" ||
            scopedError.requiresReauth ||
            scopedError.message.includes("MISSING_DOCS_SCOPE");
          if (requiresReauth) {
            // Redirect to Drive auth
            window.location.href = "/.netlify/functions/drive-auth";
            // Return null to indicate the operation was cancelled
            return null;
          }
        }
        // For other errors, throw them
        throw error;
      }

      return storyFolder;
    },
    onSuccess: (data, variables) => {
      // If storyFolder is null, it means we redirected for re-auth
      if (data === null) {
        return;
      }

      // Invalidate stories query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["drive", "stories"] });
      queryClient.invalidateQueries({ queryKey: ["drive", "yarny-stories-folder"] });

      // Navigate to story editor - loader will redirect to first snippet
      navigate(`/stories/${data.id}/snippets`);
    }
  });
}

/**
 * Hook for deleting a story
 */
export function useDeleteStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: DriveDeleteStoryRequest) => {
      return apiClient.deleteStory(request);
    },
    onSuccess: () => {
      // Invalidate queries to refresh the stories list
      queryClient.invalidateQueries({ queryKey: ["drive", "stories"] });
      queryClient.invalidateQueries({ queryKey: ["drive", "yarny-stories-folder"] });
      // Also invalidate progress queries for all stories
      queryClient.invalidateQueries({ queryKey: ["drive", "story-progress"] });
    }
  });
}

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
        }>(rootHandle, "yarny-story.json");

        if (!storyData) {
          throw new Error("Story metadata not found");
        }

        const chapters = storyData.chapters || [];
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

      if (!data.groups || !data.groups[chapterId]) {
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
            queryClient.invalidateQueries({ queryKey: ["drive", "story", activeStoryId] });
          }, 750);
        } else {
          // For local projects, invalidate local projects query
          queryClient.invalidateQueries({ queryKey: ["local", "projects"] });
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
 * Hook for refreshing stories list
 */
export function useRefreshStories() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Invalidate all story-related queries to force refetch
      await queryClient.invalidateQueries({ queryKey: ["drive", "stories"] });
      await queryClient.invalidateQueries({ queryKey: ["drive", "yarny-stories-folder"] });
      await queryClient.invalidateQueries({ queryKey: ["drive", "story-progress"] });
      // Refetch immediately
      await queryClient.refetchQueries({ queryKey: ["drive", "stories"] });
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
      queryClient.invalidateQueries({ queryKey: ["drive", "story", activeStory?.id] });
      queryClient.invalidateQueries({ queryKey: ["drive", "story-progress", activeStory?.driveFileId] });
    }
  });
}

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
      const chapterTitle = title?.trim() || `Chapter ${existingChapterCount + 1}`;

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
          queryClient.invalidateQueries({ queryKey: ["drive", "story", activeStory.id] });
          queryClient.invalidateQueries({
            queryKey: ["drive", "story-progress", activeStory.driveFileId]
          });
          queryClient.invalidateQueries({
            queryKey: ["drive", "story-metadata", activeStory.driveFileId]
          });
        }
      }
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
          const snippetFirstLine = snippetBody.split("\n")[0] || "Snippet";
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

        data.snippets![newSnippetId] = newSnippetEntry;
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
        queryClient.invalidateQueries({ queryKey: ["drive", "story", activeStory.id] });
        queryClient.invalidateQueries({
          queryKey: ["drive", "story-progress", activeStory.driveFileId]
        });
        queryClient.invalidateQueries({
          queryKey: ["drive", "story-metadata", activeStory.driveFileId]
        });
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
        queryClient.invalidateQueries({ queryKey: ["drive", "story", activeStory.id] });
        queryClient.invalidateQueries({
          queryKey: ["drive", "story-progress", activeStory.driveFileId]
        });
        queryClient.invalidateQueries({
          queryKey: ["drive", "story-metadata", activeStory.driveFileId]
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

interface StoryMetadataUpdate {
  genre?: string;
  description?: string;
}

export function useUpdateStoryMetadataMutation() {
  const queryClient = useQueryClient();
  const activeStory = useYarnyStore(selectActiveStory);

  return useMutation({
    mutationFn: async (updates: StoryMetadataUpdate) => {
      if (!activeStory) {
        throw new Error("No active story selected");
      }

      const { project, fileId } = await readProjectJson(activeStory.driveFileId);

      const updatedProject: ProjectJson = {
        ...project,
        genre: updates.genre ?? "",
        description: updates.description ?? "",
        updatedAt: new Date().toISOString()
      };

      await writeProjectJson(activeStory.driveFileId, updatedProject, fileId);
    },
    onSuccess: () => {
      if (activeStory) {
        queryClient.invalidateQueries({
          queryKey: ["drive", "story-metadata", activeStory.driveFileId]
        });
      }
    }
  });
}

interface GoalMetadata {
  target: number;
  deadline: string;
  writingDays?: boolean[];
  daysOff?: string[];
  mode?: "elastic" | "strict";
}

export function useUpdateStoryGoalsMutation() {
  const queryClient = useQueryClient();
  const activeStory = useYarnyStore(selectActiveStory);

  return useMutation({
    mutationFn: async ({
      wordGoal,
      goal
    }: {
      wordGoal: number;
      goal?: GoalMetadata;
    }) => {
      if (!activeStory) {
        throw new Error("No active story selected");
      }

      const { project, fileId } = await readProjectJson(activeStory.driveFileId);
      const updatedProject: ProjectJson = {
        ...project,
        wordGoal,
        updatedAt: new Date().toISOString()
      };

      await writeProjectJson(activeStory.driveFileId, updatedProject, fileId);

      try {
        const goalContent = goal ? JSON.stringify(goal, null, 2) : "{}";
        await apiClient.writeDriveFile({
          fileName: "goal.json",
          content: goalContent,
          parentFolderId: activeStory.driveFileId
        });
        await mirrorGoalJsonWrite(activeStory.id, goalContent);
      } catch (error) {
        console.warn("Failed to write goal.json (non-fatal):", error);
      } finally {
        clearStoryProgress(activeStory.driveFileId);
      }
    },
    onSuccess: () => {
      if (activeStory) {
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
