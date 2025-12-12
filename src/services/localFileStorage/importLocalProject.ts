import { parseYarnyIgnore } from "./yarnyIgnore";
import { normalizePlainText } from "../../editor/textExtraction";
import type { Chapter, NormalizedPayload, Project, Snippet, Story } from "../../store/types";

function generateId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
}

/**
 * Scans a local directory and creates Yarny project/story structure
 */
export async function importLocalProject(
  rootHandle: FileSystemDirectoryHandle
): Promise<NormalizedPayload> {
  const nowIso = new Date().toISOString();
  const projectId = generateId("local-project");
  const storyId = generateId("local-story");

  // Get project name from directory name
  const projectName = rootHandle.name;

  // Check if drafts directory exists
  let draftsHandle: FileSystemDirectoryHandle | null = null;
  try {
    draftsHandle = await rootHandle.getDirectoryHandle("drafts");
  } catch (error) {
    if ((error as DOMException).name === "NotFoundError") {
      // No drafts directory - create empty project
      return createEmptyProject(projectId, storyId, projectName, nowIso);
    }
    throw error;
  }

  // Parse .yarnyignore if it exists
  const isIgnored = await parseYarnyIgnore(rootHandle);

  // Scan chapter folders
  const chapterEntries: Array<{ name: string; handle: FileSystemDirectoryHandle }> = [];
  for await (const entry of draftsHandle.values()) {
    if (entry.kind === "directory" && entry.name.startsWith("chapter-")) {
      const relativePath = `drafts/${entry.name}`;
      if (!isIgnored(relativePath)) {
        chapterEntries.push({ name: entry.name, handle: entry });
      }
    }
  }

  // Sort chapters by number
  chapterEntries.sort((a, b) => {
    const numA = parseInt(a.name.replace("chapter-", ""), 10) || 0;
    const numB = parseInt(b.name.replace("chapter-", ""), 10) || 0;
    return numA - numB;
  });

  // Build chapters and snippets
  const chapters: Chapter[] = [];
  const snippets: Snippet[] = [];

  for (let chapterIndex = 0; chapterIndex < chapterEntries.length; chapterIndex++) {
    const { name: chapterFolderName, handle: chapterHandle } = chapterEntries[chapterIndex];
    const chapterNumber = parseInt(chapterFolderName.replace("chapter-", ""), 10) || chapterIndex + 1;
    // Use folder name as chapter ID for consistency (e.g., "chapter-1")
    const chapterId = chapterFolderName;

    // Scan markdown files in chapter folder
    const snippetFiles: Array<{ name: string; content: string }> = [];
    for await (const entry of chapterHandle.values()) {
      if (entry.kind === "file" && entry.name.endsWith(".md")) {
        const relativePath = `drafts/${chapterFolderName}/${entry.name}`;
        if (!isIgnored(relativePath)) {
          const fileHandle = await chapterHandle.getFileHandle(entry.name);
          const file = await fileHandle.getFile();
          const content = await file.text();
          snippetFiles.push({ name: entry.name, content });
        }
      }
    }

    // Sort snippets by filename (which includes leading numbers)
    snippetFiles.sort((a, b) => a.name.localeCompare(b.name));

    const snippetIds: string[] = [];
    for (let snippetIndex = 0; snippetIndex < snippetFiles.length; snippetIndex++) {
      const { name: fileName, content } = snippetFiles[snippetIndex];
      
      // Use filename (without .md) as snippet ID for consistency
      const snippetId = fileName.replace(/\.md$/, "");
      snippetIds.push(snippetId);

      snippets.push({
        id: snippetId,
        storyId,
        chapterId,
        order: snippetIndex,
        content: normalizePlainText(content),
        updatedAt: nowIso
      });
    }

    chapters.push({
      id: chapterId,
      storyId,
      title: `Chapter ${chapterNumber}`,
      order: chapterIndex,
      snippetIds,
      driveFolderId: "", // Not used for local projects
      updatedAt: nowIso
    });
  }

  // Create story title from README or use project name
  let storyTitle = projectName;
  try {
    const readmeHandle = await rootHandle.getFileHandle("README.md");
    const readmeFile = await readmeHandle.getFile();
    const readmeContent = await readmeFile.text();
    // Try to extract title from first line (e.g., "# Title")
    const titleMatch = readmeContent.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      storyTitle = titleMatch[1].trim();
    }
  } catch (error) {
    // README doesn't exist or can't be read - use project name
  }

  const chapterIds = chapters.map((ch) => ch.id);

  const project: Project = {
    id: projectId,
    name: projectName,
    driveFolderId: "", // Not used for local projects
    storyIds: [storyId],
    updatedAt: nowIso,
    storageType: "local",
    localPath: rootHandle.name
  };

  const story: Story = {
    id: storyId,
    projectId,
    title: storyTitle,
    driveFileId: "", // Not used for local projects
    chapterIds,
    updatedAt: nowIso
  };

  // Write metadata files
  await writeProjectMetadata(rootHandle, project);
  await writeStoryMetadata(rootHandle, story, chapters);

  return {
    projects: [project],
    stories: [story],
    chapters,
    snippets
  };
}

/**
 * Creates an empty project structure
 */
function createEmptyProject(
  projectId: string,
  storyId: string,
  projectName: string,
  nowIso: string
): NormalizedPayload {
  const project: Project = {
    id: projectId,
    name: projectName,
    driveFolderId: "",
    storyIds: [storyId],
    updatedAt: nowIso,
    storageType: "local",
    localPath: projectName
  };

  const story: Story = {
    id: storyId,
    projectId,
    title: projectName,
    driveFileId: "",
    chapterIds: [],
    updatedAt: nowIso
  };

  return {
    projects: [project],
    stories: [story],
    chapters: [],
    snippets: []
  };
}

/**
 * Writes project metadata to yarny-project.json
 */
async function writeProjectMetadata(
  rootHandle: FileSystemDirectoryHandle,
  project: Project
): Promise<void> {
  const data = {
    id: project.id,
    name: project.name,
    updatedAt: project.updatedAt,
    storageType: project.storageType,
    localPath: project.localPath
  };

  const fileHandle = await rootHandle.getFileHandle("yarny-project.json", { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(data, null, 2));
  await writable.close();
}

/**
 * Writes story metadata to yarny-story.json
 */
async function writeStoryMetadata(
  rootHandle: FileSystemDirectoryHandle,
  story: Story,
  chapters: Chapter[]
): Promise<void> {
  const data = {
    id: story.id,
    title: story.title,
    chapterIds: story.chapterIds,
    updatedAt: story.updatedAt,
    chapters: chapters.map((ch) => ({
      id: ch.id,
      title: ch.title,
      order: ch.order,
      snippetIds: ch.snippetIds
    }))
  };

  const fileHandle = await rootHandle.getFileHandle("yarny-story.json", { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(data, null, 2));
  await writable.close();
}

