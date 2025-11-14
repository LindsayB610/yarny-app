import { apiClient } from "../../api/client";
import { listAllDriveFiles } from "../../api/listAllDriveFiles";
import { writeSnippetJson, readSnippetJson } from "../jsonStorage";

export interface MigrationProgress {
  totalStories: number;
  completedStories: number;
  currentStory: string | null;
  errors: Array<{ storyId: string; error: string }>;
}

export interface MigrationOptions {
  onProgress?: (progress: MigrationProgress) => void;
}

/**
 * Migrate all stories from Google Docs to JSON files
 * One-time migration that runs on first app load
 */
export async function migrateStoriesToJson(
  options: MigrationOptions = {}
): Promise<MigrationProgress> {
  const progress: MigrationProgress = {
    totalStories: 0,
    completedStories: 0,
    currentStory: null,
    errors: []
  };

  try {
    // Get Yarny Stories folder
    const yarnyFolder = await apiClient.getOrCreateYarnyStories();
    
    // List all story folders
    const storiesResponse = await listAllDriveFiles(yarnyFolder.id);
    const storyFolders = storiesResponse.filter(
      (file) => file.mimeType === "application/vnd.google-apps.folder" && !file.trashed
    );

    progress.totalStories = storyFolders.length;
    options.onProgress?.(progress);

    // Migrate each story
    for (const storyFolder of storyFolders) {
      const storyId = storyFolder.id;
      progress.currentStory = storyFolder.name || storyId;
      
      try {
        await migrateStoryToJson(storyId);
        progress.completedStories++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        progress.errors.push({
          storyId,
          error: errorMessage
        });
        console.error(`Failed to migrate story ${storyId}:`, error);
      }
      
      options.onProgress?.(progress);
    }

    // Mark migration as complete
    localStorage.setItem("yarny_json_migration_complete", "true");
    localStorage.setItem("yarny_json_migration_date", new Date().toISOString());

    return progress;
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

/**
 * Migrate a single story from Google Docs to JSON files
 */
async function migrateStoryToJson(storyId: string): Promise<void> {
  // Get all files in story folder
  const files = await listAllDriveFiles(storyId);
  const fileMap = new Map<string, (typeof files)[number]>();
  for (const file of files) {
    if (file.name) {
      fileMap.set(file.name, file);
    }
  }

  // Read data.json to get snippet structure
  const dataFile = fileMap.get("data.json");
  if (!dataFile?.id) {
    console.warn(`Story ${storyId} has no data.json, skipping migration`);
    return;
  }

  const dataContent = await apiClient.readDriveFile({ fileId: dataFile.id });
  if (!dataContent.content) {
    console.warn(`Story ${storyId} data.json is empty, skipping migration`);
    return;
  }

  const parsedData = JSON.parse(dataContent.content) as {
    groups?: Record<string, { driveFolderId?: string }>;
    snippets?: Record<string, { driveFileId?: string; groupId?: string; chapterId?: string }>;
  };

  const groups = parsedData.groups || {};
  const snippets = parsedData.snippets || {};

  // Migrate each snippet
  for (const [snippetId, snippet] of Object.entries(snippets)) {
    if (!snippet.driveFileId) {
      continue; // Skip snippets without Google Docs
    }

    // Check if JSON file already exists
    const chapterId = snippet.groupId || snippet.chapterId;
    const chapter = chapterId ? groups[chapterId] : null;
    const parentFolderId = chapter?.driveFolderId || storyId;

    const existingJson = await readSnippetJson(snippetId, parentFolderId);
    if (existingJson) {
      continue; // Already migrated
    }

    // Read content from Google Doc
    try {
      const gdocContent = await apiClient.readDriveFile({
        fileId: snippet.driveFileId
      });

      if (gdocContent.content) {
        // Get Google Doc modifiedTime
        const gdocFiles = await apiClient.listDriveFiles({ folderId: parentFolderId });
        const gdocFile = gdocFiles.files?.find((f) => f.id === snippet.driveFileId);
        const gdocModifiedTime = gdocFile?.modifiedTime;

        // Write to JSON file
        await writeSnippetJson(
          snippetId,
          gdocContent.content,
          parentFolderId,
          snippet.driveFileId,
          gdocModifiedTime
        );
      }
    } catch (error) {
      console.warn(`Failed to migrate snippet ${snippetId}:`, error);
      // Continue with other snippets
    }
  }
}

/**
 * Check if migration has been completed
 */
export function isMigrationComplete(): boolean {
  return localStorage.getItem("yarny_json_migration_complete") === "true";
}

/**
 * Get migration date
 */
export function getMigrationDate(): string | null {
  return localStorage.getItem("yarny_json_migration_date");
}



