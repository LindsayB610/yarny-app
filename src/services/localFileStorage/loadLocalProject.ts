import { loadNotesFromLocal } from "./loadNotesFromLocal";
import type { NormalizedPayload, Project, Story } from "../../store/types";
import { getPersistedDirectoryHandle } from "../localFs/LocalFsCapability";

/**
 * Loads a local project from a directory handle by reading yarny-project.json and yarny-story.json
 */
export async function loadLocalProjectFromHandle(
  rootHandle: FileSystemDirectoryHandle
): Promise<NormalizedPayload | null> {
  try {
    // Read yarny-project.json
    let projectFile: File;
    try {
      const projectHandle = await rootHandle.getFileHandle("yarny-project.json");
      projectFile = await projectHandle.getFile();
    } catch (error) {
      if ((error as DOMException).name === "NotFoundError") {
        // No project metadata - not a Yarny project
        return null;
      }
      throw error;
    }

    const projectData = JSON.parse(await projectFile.text()) as {
      id: string;
      name: string;
      updatedAt: string;
      storageType: "local";
      localPath: string;
    };

    // Read yarny-story.json
    let storyFile: File;
    try {
      const storyHandle = await rootHandle.getFileHandle("yarny-story.json");
      storyFile = await storyHandle.getFile();
    } catch (error) {
      if ((error as DOMException).name === "NotFoundError") {
        // No story metadata - return project only
        const project: Project = {
          id: projectData.id,
          name: projectData.name,
          driveFolderId: "",
          storyIds: [],
          updatedAt: projectData.updatedAt,
          storageType: "local",
          localPath: projectData.localPath
        };
        return {
          projects: [project],
          stories: [],
          chapters: [],
          snippets: [],
          notes: []
        };
      }
      throw error;
    }

    const storyData = JSON.parse(await storyFile.text()) as {
      id: string;
      title: string;
      chapterIds: string[];
      updatedAt: string;
      chapters: Array<{
        id: string;
        title: string;
        order: number;
        snippetIds: string[];
      }>;
    };

    // Load actual chapter and snippet data from files
    const { loadChaptersAndSnippets } = await import("./loadChaptersAndSnippets");
    const { chapters, snippets } = await loadChaptersAndSnippets(
      rootHandle,
      storyData.chapters,
      storyData.id
    );

    // Load notes from Characters/ and Worldbuilding/ folders
    const charactersNotes = await loadNotesFromLocal(rootHandle, "characters");
    const worldbuildingNotes = await loadNotesFromLocal(rootHandle, "worldbuilding");
    
    // Set storyId on all notes
    const allNotes = [
      ...charactersNotes.map(note => ({ ...note, storyId: storyData.id })),
      ...worldbuildingNotes.map(note => ({ ...note, storyId: storyData.id }))
    ];

    const project: Project = {
      id: projectData.id,
      name: projectData.name,
      driveFolderId: "",
      storyIds: [storyData.id],
      updatedAt: projectData.updatedAt,
      storageType: "local",
      localPath: projectData.localPath
    };

    const story: Story = {
      id: storyData.id,
      projectId: projectData.id,
      title: storyData.title,
      driveFileId: "",
      chapterIds: storyData.chapterIds,
      updatedAt: storyData.updatedAt
    };

    return {
      projects: [project],
      stories: [story],
      chapters,
      snippets,
      notes: allNotes
    };
  } catch (error) {
    console.error("[loadLocalProject] Failed to load local project:", error);
    return null;
  }
}

/**
 * Loads all local projects from persisted directory handles
 * Currently supports one directory handle (the "yarny-local-backups" one)
 * Future: could support multiple handles stored separately
 */
export async function loadAllLocalProjects(): Promise<NormalizedPayload> {
  console.log("[loadAllLocalProjects] Starting to load local projects...");
  const handle = await getPersistedDirectoryHandle();
  if (!handle) {
    console.log("[loadAllLocalProjects] No persisted directory handle found");
    return {
      projects: [],
      stories: [],
      chapters: [],
      snippets: []
    };
  }

  console.log("[loadAllLocalProjects] Found persisted directory handle:", handle.name);

  // Check if this directory has a yarny-project.json
  // If it does, it's a project root
  const project = await loadLocalProjectFromHandle(handle);
  if (project) {
    console.log("[loadAllLocalProjects] Loaded project:", project.projects[0]?.name, "with", project.stories.length, "stories");
    return project;
  }

  console.log("[loadAllLocalProjects] No yarny-project.json found in directory");
  // Otherwise, scan for subdirectories that might be projects
  // (For now, we only support one project per directory handle)
  // Future: could scan subdirectories for yarny-project.json files
  return {
    projects: [],
    stories: [],
    chapters: [],
    snippets: [],
    notes: []
  };
}

