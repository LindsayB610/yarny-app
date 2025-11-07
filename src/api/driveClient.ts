import axios from "axios";
import { z } from "zod";

import { env } from "../config/env";
import { normalizePlainText } from "../editor/textExtraction";
import type { Chapter, NormalizedPayload, Project, Snippet, Story } from "../store/types";

const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  driveFolderId: z.string(),
  storyIds: z.array(z.string()),
  updatedAt: z.string()
});

const StorySchema = z.object({
  id: z.string(),
  projectId: z.string(),
  title: z.string(),
  driveFileId: z.string(),
  snippetIds: z.array(z.string()),
  updatedAt: z.string()
});

const SnippetSchema = z.object({
  id: z.string(),
  storyId: z.string(),
  order: z.number(),
  content: z.string(),
  driveRevisionId: z.string().optional(),
  updatedAt: z.string()
});

const NormalizedSchema = z.object({
  projects: z.array(ProjectSchema).optional(),
  stories: z.array(StorySchema).optional(),
  snippets: z.array(SnippetSchema).optional()
});

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
  timeout: 10_000
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
      const response = await http.get("/drive-list");
      const parsed = NormalizedSchema.parse(response.data);
      return parsed;
    } catch (error) {
      console.warn("[DriveClient] Falling back to local sample data for projects.", error);
      return fallbackData;
    }
  },
  async getStory(storyId: string) {
    try {
      const response = await http.get("/drive-read", { params: { storyId } });
      const parsed = NormalizedSchema.parse(response.data);
      return parsed;
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

