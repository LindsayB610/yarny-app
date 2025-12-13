import { apiClient } from "../api/client";
import { listAllDriveFiles } from "../api/listAllDriveFiles";
import { mirrorDataJsonWrite, mirrorProjectJsonWrite } from "../services/localFs/localBackupMirror";
import { clearStoryProgress } from "../utils/storyProgressCache";

export interface StoryDataJson {
  groups?: Record<string, StoryGroupData>;
  snippets?: Record<string, StorySnippetData>;
}

export interface StoryGroupData {
  id?: string;
  title?: string;
  color?: string;
  snippetIds?: string[];
  position?: number;
  driveFolderId?: string;
  updatedAt?: string;
}

export interface StorySnippetData {
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

export interface ProjectJson {
  name?: string;
  projectId?: string;
  description?: string;
  genre?: string;
  wordGoal?: number;
  groupIds?: string[];
  activeSnippetId?: string;
  updatedAt?: string;
}

/**
 * Helper function to read data.json from a story folder
 */
export async function readDataJson(storyFolderId: string): Promise<{
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
export async function writeDataJson(
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

export function generateId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
}

export const countWords = (text: string): number => {
  if (!text) {
    return 0;
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return 0;
  }

  return trimmed.split(/\s+/).length;
};

export const createSnippetFileName = (content: string, fallback: string): string => {
  const firstLine = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  const sanitized = (firstLine ?? fallback).replace(/[\\/:*?"<>|]+/g, "").slice(0, 60).trim();
  const baseName = sanitized.length > 0 ? sanitized : fallback;

  return baseName.toLowerCase().endsWith(".doc") ? baseName : `${baseName}.doc`;
};

/**
 * Reads a JSON file from a directory handle
 */
export async function readJsonFile<T>(
  dirHandle: FileSystemDirectoryHandle,
  fileName: string
): Promise<T | null> {
  try {
    const fileHandle = await dirHandle.getFileHandle(fileName);
    const file = await fileHandle.getFile();
    const content = await file.text();
    if (!content) return null;
    return JSON.parse(content) as T;
  } catch (error) {
    if ((error as DOMException).name === "NotFoundError") {
      return null;
    }
    console.warn(`Failed to read JSON file ${fileName}:`, error);
    return null;
  }
}

/**
 * Writes a JSON file to a directory handle
 */
export async function writeJsonFile(
  dirHandle: FileSystemDirectoryHandle,
  fileName: string,
  data: unknown
): Promise<void> {
  const content = JSON.stringify(data, null, 2);
  const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

export async function readProjectJson(storyFolderId: string): Promise<{
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

export async function writeProjectJson(
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

export async function getChaptersFolderId(storyFolderId: string): Promise<string | undefined> {
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

