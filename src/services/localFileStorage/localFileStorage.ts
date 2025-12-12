import { markdownToPlainText } from "../../editor/textExtraction";
import type { Chapter, NormalizedPayload, Project, Snippet, Story } from "../../store/types";

export interface LocalFileStorage {
  listProjects(): Promise<NormalizedPayload>;
  getStory(storyId: string, rootHandle: FileSystemDirectoryHandle): Promise<NormalizedPayload>;
  saveSnippet(
    rootHandle: FileSystemDirectoryHandle,
    storyId: string,
    chapterId: string,
    snippetId: string,
    content: string
  ): Promise<void>;
  createChapter(
    rootHandle: FileSystemDirectoryHandle,
    storyId: string,
    title?: string
  ): Promise<{ id: string; title: string; order: number }>;
  createSnippet(
    rootHandle: FileSystemDirectoryHandle,
    storyId: string,
    chapterId: string,
    title?: string
  ): Promise<{ id: string; title: string; order: number; fileName: string }>;
}

/**
 * Reads a markdown file from a directory handle
 */
async function readMarkdownFile(
  dirHandle: FileSystemDirectoryHandle,
  fileName: string
): Promise<string> {
  try {
    const fileHandle = await dirHandle.getFileHandle(fileName);
    const file = await fileHandle.getFile();
    return await file.text();
  } catch (error) {
    if ((error as DOMException).name === "NotFoundError") {
      return "";
    }
    throw error;
  }
}

/**
 * Writes a markdown file to a directory handle
 */
async function writeMarkdownFile(
  dirHandle: FileSystemDirectoryHandle,
  fileName: string,
  content: string
): Promise<void> {
  const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

/**
 * Reads a JSON file from a directory handle
 */
async function readJsonFile<T>(
  dirHandle: FileSystemDirectoryHandle,
  fileName: string
): Promise<T | null> {
  try {
    const content = await readMarkdownFile(dirHandle, fileName);
    if (!content) return null;
    return JSON.parse(content) as T;
  } catch (error) {
    console.warn(`Failed to read JSON file ${fileName}:`, error);
    return null;
  }
}

/**
 * Writes a JSON file to a directory handle
 */
async function writeJsonFile(
  dirHandle: FileSystemDirectoryHandle,
  fileName: string,
  data: unknown
): Promise<void> {
  const content = JSON.stringify(data, null, 2);
  await writeMarkdownFile(dirHandle, fileName, content);
}

/**
 * Gets or creates a subdirectory
 */
async function getOrCreateDirectory(
  parentHandle: FileSystemDirectoryHandle,
  dirName: string
): Promise<FileSystemDirectoryHandle> {
  try {
    return await parentHandle.getDirectoryHandle(dirName);
  } catch (error) {
    if ((error as DOMException).name === "NotFoundError") {
      return await parentHandle.getDirectoryHandle(dirName, { create: true });
    }
    throw error;
  }
}

/**
 * Extracts snippet name from filename (removes leading numbers and .md extension)
 * Example: "01-opening-scene.md" -> "opening-scene"
 */
function extractSnippetName(fileName: string): string {
  const withoutExt = fileName.replace(/\.md$/, "");
  // Remove leading numbers and dashes: "01-opening-scene" -> "opening-scene"
  const match = withoutExt.match(/^\d+-(.+)$/);
  return match ? match[1] : withoutExt;
}

/**
 * Generates a numbered filename for a snippet
 * Example: order=0, name="opening-scene" -> "01-opening-scene.md"
 */
function generateSnippetFileName(order: number, name: string): string {
  const paddedOrder = String(order + 1).padStart(2, "0");
  const sanitizedName = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${paddedOrder}-${sanitizedName}.md`;
}

/**
 * Scans a directory for markdown files and returns them sorted by filename
 */
async function scanMarkdownFiles(
  dirHandle: FileSystemDirectoryHandle
): Promise<Array<{ name: string; content: string }>> {
  const files: Array<{ name: string; content: string }> = [];
  
  for await (const entry of dirHandle.values()) {
    if (entry.kind === "file" && entry.name.endsWith(".md")) {
      const content = await readMarkdownFile(dirHandle, entry.name);
      files.push({ name: entry.name, content });
    }
  }
  
  // Sort by filename (which includes leading numbers for ordering)
  files.sort((a, b) => a.name.localeCompare(b.name));
  return files;
}

/**
 * Scans drafts/ directory for chapter folders
 */
async function scanChapters(
  rootHandle: FileSystemDirectoryHandle
): Promise<Array<{ name: string; handle: FileSystemDirectoryHandle }>> {
  const draftsHandle = await getOrCreateDirectory(rootHandle, "drafts");
  const chapters: Array<{ name: string; handle: FileSystemDirectoryHandle }> = [];
  
  for await (const entry of draftsHandle.values()) {
    if (entry.kind === "directory" && entry.name.startsWith("chapter-")) {
      chapters.push({ name: entry.name, handle: entry });
    }
  }
  
  // Sort by chapter number
  chapters.sort((a, b) => {
    const numA = parseInt(a.name.replace("chapter-", ""), 10) || 0;
    const numB = parseInt(b.name.replace("chapter-", ""), 10) || 0;
    return numA - numB;
  });
  
  return chapters;
}

export const createLocalFileStorage = (): LocalFileStorage => ({
  async listProjects() {
    // For local projects, we'll need the root handle passed in
    // This will be called after import, so we return empty for now
    return { projects: [], stories: [], chapters: [], snippets: [] };
  },

  async getStory(storyId: string, rootHandle: FileSystemDirectoryHandle) {
    const nowIso = new Date().toISOString();

    // Read project metadata
    const projectData = await readJsonFile<{
      id?: string;
      name?: string;
      updatedAt?: string;
    }>(rootHandle, "yarny-project.json");

    // Read story metadata
    const storyData = await readJsonFile<{
      id?: string;
      title?: string;
      chapterIds?: string[];
      updatedAt?: string;
    }>(rootHandle, "yarny-story.json");

    const projectId = projectData?.id || storyId;
    const projectName = projectData?.name || rootHandle.name;
    const storyTitle = storyData?.title || rootHandle.name;

    // Scan chapters from drafts/ directory
    const chapterEntries = await scanChapters(rootHandle);
    const chapters: Chapter[] = [];
    const snippets: Snippet[] = [];

    for (let chapterIndex = 0; chapterIndex < chapterEntries.length; chapterIndex++) {
      const { name: chapterFolderName, handle: chapterHandle } = chapterEntries[chapterIndex];
      
      // Extract chapter number from folder name (e.g., "chapter-1" -> 1)
      const chapterNumber = parseInt(chapterFolderName.replace("chapter-", ""), 10) || chapterIndex + 1;
      
      // Generate chapter ID (use folder name as ID for consistency)
      const chapterId = chapterFolderName;

      // Scan markdown files in this chapter folder
      const snippetFiles = await scanMarkdownFiles(chapterHandle);
      const snippetIds: string[] = [];

      for (let snippetIndex = 0; snippetIndex < snippetFiles.length; snippetIndex++) {
        const { name: fileName, content } = snippetFiles[snippetIndex];
        
        // Generate snippet ID from filename (remove .md extension)
        const snippetId = fileName.replace(/\.md$/, "");
        snippetIds.push(snippetId);

        // Extract snippet name for display
        const snippetName = extractSnippetName(fileName);

        snippets.push({
          id: snippetId,
          storyId,
          chapterId,
          order: snippetIndex,
          content: markdownToPlainText(content),
          updatedAt: storyData?.updatedAt || nowIso
        });
      }

      chapters.push({
        id: chapterId,
        storyId,
        title: `Chapter ${chapterNumber}`,
        order: chapterIndex,
        snippetIds,
        driveFolderId: "", // Not used for local projects
        updatedAt: storyData?.updatedAt || nowIso
      });
    }

    // Sort snippets by order within each chapter
    snippets.sort((a, b) => {
      if (a.chapterId !== b.chapterId) {
        return 0; // Keep chapter order
      }
      return a.order - b.order;
    });

    const chapterIds = chapters.map((ch) => ch.id);

    const project: Project = {
      id: projectId,
      name: projectName,
      driveFolderId: "", // Not used for local projects
      storyIds: [storyId],
      updatedAt: projectData?.updatedAt || nowIso,
      storageType: "local",
      localPath: rootHandle.name
    };

    const story: Story = {
      id: storyId,
      projectId,
      title: storyTitle,
      driveFileId: "", // Not used for local projects
      chapterIds,
      updatedAt: storyData?.updatedAt || nowIso
    };

    return {
      projects: [project],
      stories: [story],
      chapters,
      snippets
    };
  },

  async saveSnippet(
    rootHandle: FileSystemDirectoryHandle,
    storyId: string,
    chapterId: string,
    snippetId: string,
    content: string
  ) {
    // Get drafts directory
    const draftsHandle = await getOrCreateDirectory(rootHandle, "drafts");
    
    // Get chapter directory (chapterId is the folder name like "chapter-1")
    const chapterHandle = await getOrCreateDirectory(draftsHandle, chapterId);
    
    // Find the snippet file - snippetId should be the filename (e.g., "01-opening-scene.md")
    // If it doesn't have .md extension, add it
    const fileName = snippetId.endsWith(".md") ? snippetId : `${snippetId}.md`;
    
    // Write the content
    await writeMarkdownFile(chapterHandle, fileName, content);
    
    // Update story metadata with new updatedAt
    const storyData = await readJsonFile<{
      id?: string;
      title?: string;
      chapterIds?: string[];
      updatedAt?: string;
    }>(rootHandle, "yarny-story.json");
    
    await writeJsonFile(rootHandle, "yarny-story.json", {
      ...storyData,
      id: storyId,
      updatedAt: new Date().toISOString()
    });
  },

  async createChapter(
    rootHandle: FileSystemDirectoryHandle,
    storyId: string,
    title?: string
  ) {
    // Read story metadata
    const storyData = await readJsonFile<{
      id?: string;
      title?: string;
      chapterIds?: string[];
      updatedAt?: string;
      chapters?: Array<{
        id: string;
        title: string;
        order: number;
        snippetIds: string[];
      }>;
    }>(rootHandle, "yarny-story.json");

    if (!storyData) {
      throw new Error("Story metadata not found");
    }

    const existingChapters = storyData.chapters || [];
    const chapterNumber = existingChapters.length + 1;
    const chapterTitle = title?.trim() || `Chapter ${chapterNumber}`;
    const chapterId = `chapter-${chapterNumber}`;

    // Create chapter folder
    const draftsHandle = await getOrCreateDirectory(rootHandle, "drafts");
    await getOrCreateDirectory(draftsHandle, chapterId);

    // Update metadata
    const updatedChapters = [
      ...existingChapters,
      {
        id: chapterId,
        title: chapterTitle,
        order: existingChapters.length,
        snippetIds: []
      }
    ];

    await writeJsonFile(rootHandle, "yarny-story.json", {
      ...storyData,
      id: storyId,
      chapterIds: updatedChapters.map((ch) => ch.id),
      chapters: updatedChapters,
      updatedAt: new Date().toISOString()
    });

    return {
      id: chapterId,
      title: chapterTitle,
      order: existingChapters.length
    };
  },

  async createSnippet(
    rootHandle: FileSystemDirectoryHandle,
    storyId: string,
    chapterId: string,
    title?: string
  ) {
    // Read story metadata
    const storyData = await readJsonFile<{
      id?: string;
      title?: string;
      chapterIds?: string[];
      updatedAt?: string;
      chapters?: Array<{
        id: string;
        title: string;
        order: number;
        snippetIds: string[];
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

    const existingSnippetCount = chapter.snippetIds.length;
    const snippetTitle = title?.trim() || `Snippet ${existingSnippetCount + 1}`;
    const snippetOrder = existingSnippetCount;
    
    // Generate filename
    const fileName = generateSnippetFileName(snippetOrder, snippetTitle);
    const snippetId = fileName.replace(/\.md$/, ""); // Use filename (without .md) as snippet ID

    // Create snippet file
    const draftsHandle = await getOrCreateDirectory(rootHandle, "drafts");
    const chapterHandle = await getOrCreateDirectory(draftsHandle, chapterId);
    await writeMarkdownFile(chapterHandle, fileName, ""); // Empty content for new snippet

    // Update metadata
    const updatedChapters = chapters.map((ch) =>
      ch.id === chapterId
        ? {
            ...ch,
            snippetIds: [...ch.snippetIds, snippetId]
          }
        : ch
    );

    await writeJsonFile(rootHandle, "yarny-story.json", {
      ...storyData,
      id: storyId,
      chapters: updatedChapters,
      updatedAt: new Date().toISOString()
    });

    return {
      id: snippetId,
      title: snippetTitle,
      order: snippetOrder,
      fileName
    };
  }
});

