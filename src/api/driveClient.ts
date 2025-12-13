import axios from "axios";
import { z } from "zod";

import { apiClient } from "./client";
import { listAllDriveFiles } from "./listAllDriveFiles";
import { env } from "../config/env";
import { normalizePlainText } from "../editor/textExtraction";
import { readSnippetJson } from "../services/jsonStorage";
import type { Chapter, NormalizedPayload, Note, NoteKind, Project, Snippet, Story } from "../store/types";
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
      const files = await listAllDriveFiles(storyId);
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

        let jsonGdocFileId: string | undefined = undefined;
        try {
          const jsonData = await readSnippetJson(snippetId, parentFolderId);
          if (jsonData) {
            snippetContent = jsonData.content;
            snippetUpdatedAt = jsonData.modifiedTime;
            // Use gdocFileId from JSON file if available (JSON is source of truth)
            jsonGdocFileId = jsonData.gdocFileId;
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

        // Use gdocFileId from JSON file if available, otherwise fall back to data.json
        const effectiveDriveFileId = jsonGdocFileId || 
          (typeof snippet.driveFileId === "string" ? snippet.driveFileId : undefined);

        snippets.push({
          id: snippetId,
          storyId,
          chapterId,
          order: snippetOrder,
          content: snippetContent,
          driveRevisionId: typeof snippet.driveRevisionId === "string" ? snippet.driveRevisionId : undefined,
          driveFileId: effectiveDriveFileId,
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

      // Load notes from Characters/Worldbuilding folders
      // Also support legacy People/Places/Things folders and map them accordingly
      const notes: Note[] = [];
      const noteFolders = [
        { name: "Characters", kind: "character" as NoteKind },
        { name: "Worldbuilding", kind: "worldbuilding" as NoteKind },
        // Legacy support: map old folders to new structure
        { name: "People", kind: "character" as NoteKind },
        { name: "Places", kind: "worldbuilding" as NoteKind },
        { name: "Things", kind: "worldbuilding" as NoteKind }
      ];
      const noteKindMap: Record<string, NoteKind> = {
        Characters: "character",
        Worldbuilding: "worldbuilding",
        People: "character", // Legacy: map People to characters
        Places: "worldbuilding", // Legacy: map Places to worldbuilding
        Things: "worldbuilding" // Legacy: map Things to worldbuilding
      };

      // Track which folders we've processed to avoid duplicates when legacy folders exist
      const processedFolders = new Set<string>();
      
      for (const { name: folderName, kind: defaultKind } of noteFolders) {
        const notesFolder = fileMap.get(folderName);
        if (!notesFolder?.id || notesFolder.mimeType !== "application/vnd.google-apps.folder") {
          continue;
        }
        
        // Skip if we've already processed a newer version of this folder
        // (e.g., skip "People" if "Characters" exists)
        if (processedFolders.has(defaultKind)) {
          continue;
        }
        
        processedFolders.add(defaultKind);

        try {
          const notesFiles = await listAllDriveFiles(notesFolder.id);
          const noteFiles = notesFiles.filter(
            (f) => (f.mimeType === "text/plain" || f.mimeType === "text/markdown") && !f.trashed
          );

          // Load ordering metadata
          let noteOrder: string[] = [];
          const orderFile = notesFiles.find((f) => f.name === "_order.json" && f.id);
          if (orderFile?.id) {
            try {
              const orderResponse = await apiClient.readDriveFile({ fileId: orderFile.id });
              const parsed = JSON.parse(orderResponse.content || "{}") as { order?: unknown };
              if (Array.isArray(parsed.order)) {
                noteOrder = parsed.order.filter((id): id is string => typeof id === "string");
              }
            } catch (error) {
              console.warn(`Failed to read notes order for ${folderName}:`, error);
            }
          }

          // Load note content for this folder
          const folderNotes: Note[] = [];
          for (const file of noteFiles) {
            if (!file.id || !file.name) continue;

            try {
              const contentResponse = await apiClient.readDriveFile({ fileId: file.id });
              // noteName extracted but not currently used - kept for potential future use
              const _noteName = file.name.replace(/\.txt$/, "").replace(/\.md$/, "");
              const kind = noteKindMap[folderName] ?? defaultKind;

              // Determine order
              const orderIndex = noteOrder.indexOf(file.id);
              const noteOrderValue = orderIndex !== -1 ? orderIndex : folderNotes.length;

              folderNotes.push({
                id: file.id,
                storyId,
                kind,
                order: noteOrderValue,
                content: contentResponse.content || "",
                driveFileId: file.id,
                updatedAt: file.modifiedTime || nowIso
              });
            } catch (error) {
              console.error(`Error reading note file ${file.id}:`, error);
            }
          }

          // Sort notes by order within this folder
          if (noteOrder.length > 0) {
            const orderMap = new Map<string, number>();
            noteOrder.forEach((id, index) => {
              orderMap.set(id, index);
            });
            folderNotes.sort((a, b) => {
              const indexA = orderMap.has(a.id) ? orderMap.get(a.id)! : Number.MAX_SAFE_INTEGER;
              const indexB = orderMap.has(b.id) ? orderMap.get(b.id)! : Number.MAX_SAFE_INTEGER;
              if (indexA !== indexB) {
                return indexA - indexB;
              }
              return a.order - b.order;
            });
          } else {
            // Sort by name if no order file
            folderNotes.sort((a, b) => {
              const nameA = a.content.split("\n")[0] || a.id;
              const nameB = b.content.split("\n")[0] || b.id;
              return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
            });
          }

          notes.push(...folderNotes);
        } catch (error) {
          console.warn(`Failed to load notes from ${folderName} folder:`, error);
        }
      }

      return {
        stories: [story],
        chapters,
        snippets: snippetsSorted,
        notes
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

