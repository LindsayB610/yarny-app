import axios from "axios";
import { z } from "zod";

import { apiClient } from "./client";
import { listAllDriveFiles } from "./listAllDriveFiles";
import { env } from "../config/env";
import { normalizePlainText } from "../editor/textExtraction";
import { readSnippetJson } from "../services/jsonStorage";
import type { Chapter, NormalizedPayload, Project, Snippet, Story } from "../store/types";
import { extractGroupOrderFromMetadata, extractStoryTitleFromMetadata } from "../utils/storyMetadata";

const SaveStoryInputSchema = z.object({
  storyId: z.string(),
  content: z.string(),
  revisionId: z.string().optional()
});

export type SaveStoryInput = z.infer<typeof SaveStoryInputSchema>;

export interface DriveClient {
  listProjects(): Promise<NormalizedPayload>;
  getStory(storyId: string): Promise<NormalizedPayload>;
  saveStory(input: SaveStoryInput): Promise<void>;
}

const http = axios.create({
  baseURL: env.driveFunctionBase,
  timeout: 10_000,
  withCredentials: true
});

const fallbackProject: Project = {
  id: "placeholder-project",
  name: "Sample Project",
  driveFolderId: "drive-folder-placeholder",
  storyIds: ["placeholder-story"],
  updatedAt: new Date().toISOString()
};

const fallbackStory: Story = {
  id: "placeholder-story",
  projectId: fallbackProject.id,
  title: "Welcome to Yarny React",
  driveFileId: "drive-file-placeholder",
  chapterIds: ["placeholder-chapter"],
  updatedAt: new Date().toISOString()
};

const fallbackChapter: Chapter = {
  id: "placeholder-chapter",
  storyId: fallbackStory.id,
  title: "Chapter 1",
  order: 0,
  snippetIds: ["placeholder-snippet"],
  driveFolderId: "drive-folder-placeholder",
  updatedAt: new Date().toISOString()
};

const fallbackSnippet: Snippet = {
  id: "placeholder-snippet",
  storyId: fallbackStory.id,
  chapterId: fallbackChapter.id,
  order: 1,
  content: normalizePlainText(
    [
      "This is a local-only placeholder story.",
      "Once the Google Drive integration is connected, the content here will reflect live data."
    ].join("\n\n")
  ),
  updatedAt: new Date().toISOString()
};

const fallbackData: NormalizedPayload = {
  projects: [fallbackProject],
  stories: [fallbackStory],
  chapters: [fallbackChapter],
  snippets: [fallbackSnippet]
};

export const createDriveClient = (): DriveClient => ({
  async listProjects() {
    try {
      const yarnyFolder = await apiClient.getOrCreateYarnyStories();
      const storiesResponse = await listAllDriveFiles(yarnyFolder.id);
      const storyFolders = storiesResponse.filter(
        (file) => file.mimeType === "application/vnd.google-apps.folder" && !file.trashed
      );

      const projectId = yarnyFolder.id || "yarny-stories";
      const stories: Story[] = storyFolders.map((folder) => {
        const updatedAt = folder.modifiedTime ?? new Date().toISOString();
        return {
          id: folder.id,
          projectId,
          title: folder.name ?? "Untitled Story",
          driveFileId: folder.id,
          chapterIds: [],
          updatedAt
        };
      });

      const project: Project = {
        id: projectId,
        name: yarnyFolder.name ?? "Yarny Stories",
        driveFolderId: yarnyFolder.id,
        storyIds: stories.map((story) => story.id),
        updatedAt: new Date().toISOString()
      };

      return { projects: [project], stories, chapters: [], snippets: [] };
    } catch (error) {
      console.warn("[DriveClient] Falling back to local sample data for projects.", error);
      return fallbackData;
    }
  },
  async getStory(storyId: string) {
    try {
      console.log("[DriveClient.getStory] Starting fetch for story:", storyId);
      const files = await listAllDriveFiles(storyId);
      console.log("[DriveClient.getStory] Listed", files.length, "files for story:", storyId);
      const fileMap = new Map<string, (typeof files)[number]>();
      for (const file of files) {
        if (file.name) {
          fileMap.set(file.name, file);
        }
      }

      // Load project metadata
      const projectFile = fileMap.get("project.json");
      let projectMetadata: Record<string, unknown> = {};
      let groupOrder: string[] | undefined;
      let storyTitle: string | undefined;
      if (projectFile?.id) {
        try {
          const projectContent = await apiClient.readDriveFile({ fileId: projectFile.id });
          if (projectContent.content) {
            projectMetadata = JSON.parse(projectContent.content) as Record<string, unknown>;
            const name = extractStoryTitleFromMetadata(projectMetadata);
            storyTitle = name || storyTitle;
            groupOrder = extractGroupOrderFromMetadata(projectMetadata) ?? groupOrder;
          }
        } catch (projectError) {
          console.warn(`[DriveClient] Failed to read project.json for story ${storyId}`, projectError);
        }
      }

      // Load data.json for groups/snippets
      const dataFile = fileMap.get("data.json");
      interface RawGroup {
        id?: string;
        title?: string;
        color?: string;
        snippetIds?: string[];
        position?: number;
        order?: number;
        driveFolderId?: string;
        updatedAt?: string;
      }

      interface RawSnippet {
        groupId?: string;
        chapterId?: string;
        order?: number;
        body?: string;
        content?: string;
        driveRevisionId?: string;
        driveFileId?: string;
        updatedAt?: string;
      }

      let rawGroups: Record<string, RawGroup> = {};
      let rawSnippets: Record<string, RawSnippet> = {};
      if (dataFile?.id) {
        try {
          const dataContent = await apiClient.readDriveFile({ fileId: dataFile.id });
          if (dataContent.content) {
            const parsedData = JSON.parse(dataContent.content) as {
              groups?: Record<string, RawGroup>;
              snippets?: Record<string, RawSnippet>;
            };
            rawGroups = parsedData.groups ?? {};
            rawSnippets = parsedData.snippets ?? {};
          }
        } catch (dataError) {
          console.warn(`[DriveClient] Failed to read data.json for story ${storyId}`, dataError);
        }
      }

      // Derive chapter order
      const discoveredGroupIds = Object.keys(rawGroups);
      const chapterOrder = groupOrder
        ? [...groupOrder, ...discoveredGroupIds.filter((id) => !groupOrder?.includes(id))]
        : discoveredGroupIds;

      const nowIso = new Date().toISOString();
      // Construct chapters
      const chapters: Chapter[] = chapterOrder
        .map((groupId, index) => {
          const group = rawGroups[groupId];
          if (!group) {
            return null;
          }
          const snippetIds = Array.isArray(group.snippetIds) ? group.snippetIds : [];
          const order =
            typeof group.position === "number"
              ? group.position
              : typeof group.order === "number"
                ? group.order
                : index;
          return {
            id: groupId,
            storyId,
            title: typeof group.title === "string" ? group.title : `Chapter ${index + 1}`,
            color: typeof group.color === "string" ? group.color : undefined,
            order,
            snippetIds,
            driveFolderId: typeof group.driveFolderId === "string" ? group.driveFolderId : "",
            updatedAt:
              typeof group.updatedAt === "string"
                ? group.updatedAt
                : (projectMetadata.updatedAt as string | undefined) ?? nowIso
          };
        })
        .filter((chapter): chapter is Chapter => chapter !== null)
        .sort((a, b) => a.order - b.order);

      const chapterIds = chapters.map((chapter) => chapter.id);

      // Construct snippets - read from JSON files first (JSON primary architecture)
      const snippets: Snippet[] = [];
      for (const [snippetId, snippet] of Object.entries(rawSnippets)) {
        if (!snippet) continue;
        const chapterId =
          typeof snippet.groupId === "string"
            ? snippet.groupId
            : typeof snippet.chapterId === "string"
              ? snippet.chapterId
              : undefined;
        if (!chapterId || !chapterIds.includes(chapterId)) {
          continue;
        }
        const chapter = chapters.find((ch) => ch.id === chapterId);
        const snippetOrder =
          typeof snippet.order === "number"
            ? snippet.order
            : chapter?.snippetIds?.indexOf(snippetId) ?? 0;

        // Determine parent folder for JSON file lookup
        const parentFolderId = chapter?.driveFolderId || storyId;

        // Try to read from JSON file first (JSON primary)
        let snippetContent = "";
        let snippetUpdatedAt = 
          typeof snippet.updatedAt === "string"
            ? snippet.updatedAt
            : chapter?.updatedAt ?? nowIso;

        try {
          const jsonData = await readSnippetJson(snippetId, parentFolderId);
          if (jsonData) {
            snippetContent = jsonData.content;
            snippetUpdatedAt = jsonData.modifiedTime;
          } else {
            // Fallback to data.json content if JSON file doesn't exist
            snippetContent =
              typeof snippet.body === "string"
                ? snippet.body
                : typeof snippet.content === "string"
                  ? snippet.content
                  : "";
          }
        } catch (error) {
          // If JSON read fails, fall back to data.json content
          console.warn(`Failed to read JSON for snippet ${snippetId}, using data.json fallback:`, error);
          snippetContent =
            typeof snippet.body === "string"
              ? snippet.body
              : typeof snippet.content === "string"
                ? snippet.content
                : "";
        }

        snippets.push({
          id: snippetId,
          storyId,
          chapterId,
          order: snippetOrder,
          content: snippetContent,
          driveRevisionId: typeof snippet.driveRevisionId === "string" ? snippet.driveRevisionId : undefined,
          driveFileId: typeof snippet.driveFileId === "string" ? snippet.driveFileId : undefined,
          updatedAt: snippetUpdatedAt
        });
      }

      const storyUpdatedAt =
        (typeof projectMetadata.updatedAt === "string" && projectMetadata.updatedAt) ??
        dataFile?.modifiedTime ??
        nowIso;

      const projectId =
        (typeof projectMetadata.projectId === "string" && projectMetadata.projectId) ||
        `project-${storyId}`;

      const story: Story = {
        id: storyId,
        projectId,
        title: storyTitle ?? "Untitled Story",
        driveFileId: storyId,
        chapterIds,
        updatedAt: storyUpdatedAt
      };

      // Ensure snippets sorted within chapters
      const snippetsSorted = snippets.sort((a, b) => a.order - b.order);

      return {
        stories: [story],
        chapters,
        snippets: snippetsSorted
      };
    } catch (error) {
      console.warn(`[DriveClient] Falling back to local sample story for ${storyId}.`, error);
      return fallbackData;
    }
  },
  async saveStory(input: SaveStoryInput) {
    const parsed = SaveStoryInputSchema.parse(input);
    try {
      await http.post("/drive-write", {
        storyId: parsed.storyId,
        content: normalizePlainText(parsed.content),
        revisionId: parsed.revisionId
      });
    } catch (error) {
      console.warn("[DriveClient] Save story call failed. Changes are not persisted.", error);
      throw error;
    }
  }
});

