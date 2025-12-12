import { describe, it, expect, vi, beforeEach } from "vitest";
import { loadLocalProjectFromHandle, loadAllLocalProjects } from "./loadLocalProject";
import { getPersistedDirectoryHandle } from "../localFs/LocalFsCapability";

vi.mock("../localFs/LocalFsCapability", () => ({
  getPersistedDirectoryHandle: vi.fn()
}));

type MockFileSystemDirectoryHandle = {
  kind: "directory";
  name: string;
  values: () => IterableIterator<unknown>;
  getFileHandle: (fileName: string, options?: { create?: boolean }) => Promise<unknown>;
  getDirectoryHandle: (dirName: string, options?: { create?: boolean }) => Promise<unknown>;
};

const createMockFileHandle = (name: string, content: string) => {
  return {
    kind: "file" as const,
    name,
    getFile: vi.fn().mockResolvedValue({
      text: vi.fn().mockResolvedValue(content),
      lastModified: Date.now()
    })
  };
};

const createMockDirectoryHandle = (
  name: string,
  entries: Array<{ name: string; handle: unknown }>
): MockFileSystemDirectoryHandle => {
  const entryMap = new Map(entries.map((e) => [e.name, e.handle]));
  return {
    kind: "directory" as const,
    name,
    values: vi.fn().mockReturnValue(entryMap.values()),
    getFileHandle: vi.fn((fileName: string, options?: { create?: boolean }) => {
      const entry = entryMap.get(fileName);
      if (entry) {
        return Promise.resolve(entry);
      }
      if (options?.create) {
        const newHandle = createMockFileHandle(fileName, "");
        entryMap.set(fileName, newHandle);
        return Promise.resolve(newHandle);
      }
      throw new DOMException("File not found", "NotFoundError");
    }),
    getDirectoryHandle: vi.fn((dirName: string, options?: { create?: boolean }) => {
      const entry = entryMap.get(dirName);
      if (entry) {
        return Promise.resolve(entry);
      }
      if (options?.create) {
        const newHandle = createMockDirectoryHandle(dirName, []);
        entryMap.set(dirName, newHandle);
        return Promise.resolve(newHandle);
      }
      throw new DOMException("Directory not found", "NotFoundError");
    })
  } as MockFileSystemDirectoryHandle;
};

describe("loadLocalProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loadLocalProjectFromHandle", () => {
    it("should return null when yarny-project.json doesn't exist", async () => {
      const rootHandle = createMockDirectoryHandle("test", []);
      rootHandle.getFileHandle = vi.fn().mockRejectedValue(
        new DOMException("File not found", "NotFoundError")
      );

      const result = await loadLocalProjectFromHandle(
        rootHandle as unknown as FileSystemDirectoryHandle
      );

      expect(result).toBeNull();
    });

    it("should load project with story metadata", async () => {
      const projectJson = JSON.stringify({
        id: "local-project_123",
        name: "test-novel",
        updatedAt: "2025-12-12T00:00:00.000Z",
        storageType: "local",
        localPath: "test-novel"
      });

      const storyJson = JSON.stringify({
        id: "local-story_456",
        title: "Test Novel",
        chapterIds: ["chapter-1"],
        updatedAt: "2025-12-12T00:00:00.000Z",
        chapters: [
          {
            id: "chapter-1",
            title: "Chapter 1",
            order: 0,
            snippetIds: ["01-opening"]
          }
        ]
      });

      const snippetFile = createMockFileHandle("01-opening.md", "The morning sun...");
      const chapterHandle = createMockDirectoryHandle("chapter-1", [
        { name: "01-opening.md", handle: snippetFile }
      ]);
      const draftsHandle = createMockDirectoryHandle("drafts", [
        { name: "chapter-1", handle: chapterHandle }
      ]);

      const rootHandle = createMockDirectoryHandle("test-novel", [
        { name: "yarny-project.json", handle: createMockFileHandle("yarny-project.json", projectJson) },
        { name: "yarny-story.json", handle: createMockFileHandle("yarny-story.json", storyJson) },
        { name: "drafts", handle: draftsHandle }
      ]);

      const result = await loadLocalProjectFromHandle(
        rootHandle as unknown as FileSystemDirectoryHandle
      );

      expect(result).not.toBeNull();
      expect(result!.projects).toHaveLength(1);
      expect(result!.stories).toHaveLength(1);
      expect(result!.chapters).toHaveLength(1);
      expect(result!.snippets).toHaveLength(1);

      expect(result!.projects[0].id).toBe("local-project_123");
      expect(result!.projects[0].name).toBe("test-novel");
      expect(result!.stories[0].id).toBe("local-story_456");
      expect(result!.stories[0].title).toBe("Test Novel");
      expect(result!.snippets[0].content).toContain("morning sun");
    });

    it("should return project only when yarny-story.json doesn't exist", async () => {
      const projectJson = JSON.stringify({
        id: "local-project_123",
        name: "test-novel",
        updatedAt: "2025-12-12T00:00:00.000Z",
        storageType: "local",
        localPath: "test-novel"
      });

      const rootHandle = createMockDirectoryHandle("test-novel", [
        { name: "yarny-project.json", handle: createMockFileHandle("yarny-project.json", projectJson) }
      ]);

      rootHandle.getFileHandle = vi.fn((fileName: string) => {
        if (fileName === "yarny-project.json") {
          return Promise.resolve(createMockFileHandle("yarny-project.json", projectJson));
        }
        throw new DOMException("File not found", "NotFoundError");
      });

      const result = await loadLocalProjectFromHandle(
        rootHandle as unknown as FileSystemDirectoryHandle
      );

      expect(result).not.toBeNull();
      expect(result!.projects).toHaveLength(1);
      expect(result!.stories).toHaveLength(0);
      expect(result!.chapters).toHaveLength(0);
      expect(result!.snippets).toHaveLength(0);
    });

    it("should handle missing chapter folders gracefully", async () => {
      const projectJson = JSON.stringify({
        id: "local-project_123",
        name: "test-novel",
        updatedAt: "2025-12-12T00:00:00.000Z",
        storageType: "local",
        localPath: "test-novel"
      });

      const storyJson = JSON.stringify({
        id: "local-story_456",
        title: "Test Novel",
        chapterIds: ["chapter-1", "chapter-missing"],
        updatedAt: "2025-12-12T00:00:00.000Z",
        chapters: [
          {
            id: "chapter-1",
            title: "Chapter 1",
            order: 0,
            snippetIds: ["01-opening"]
          },
          {
            id: "chapter-missing",
            title: "Chapter Missing",
            order: 1,
            snippetIds: []
          }
        ]
      });

      const snippetFile = createMockFileHandle("01-opening.md", "Content");
      const chapterHandle = createMockDirectoryHandle("chapter-1", [
        { name: "01-opening.md", handle: snippetFile }
      ]);
      const draftsHandle = createMockDirectoryHandle("drafts", [
        { name: "chapter-1", handle: chapterHandle }
      ]);

      const rootHandle = createMockDirectoryHandle("test-novel", [
        { name: "yarny-project.json", handle: createMockFileHandle("yarny-project.json", projectJson) },
        { name: "yarny-story.json", handle: createMockFileHandle("yarny-story.json", storyJson) },
        { name: "drafts", handle: draftsHandle }
      ]);

      const result = await loadLocalProjectFromHandle(
        rootHandle as unknown as FileSystemDirectoryHandle
      );

      expect(result).not.toBeNull();
      // Should only load chapter-1, skip chapter-missing
      expect(result!.chapters).toHaveLength(1);
      expect(result!.chapters[0].id).toBe("chapter-1");
    });
  });

  describe("loadAllLocalProjects", () => {
    it("should return empty when no persisted handle exists", async () => {
      vi.mocked(getPersistedDirectoryHandle).mockResolvedValue(null);

      const result = await loadAllLocalProjects();

      expect(result.projects).toHaveLength(0);
      expect(result.stories).toHaveLength(0);
    });

    it("should load project from persisted handle", async () => {
      const projectJson = JSON.stringify({
        id: "local-project_123",
        name: "test-novel",
        updatedAt: "2025-12-12T00:00:00.000Z",
        storageType: "local",
        localPath: "test-novel"
      });

      const storyJson = JSON.stringify({
        id: "local-story_456",
        title: "Test Novel",
        chapterIds: [],
        updatedAt: "2025-12-12T00:00:00.000Z",
        chapters: []
      });

      const rootHandle = createMockDirectoryHandle("test-novel", [
        { name: "yarny-project.json", handle: createMockFileHandle("yarny-project.json", projectJson) },
        { name: "yarny-story.json", handle: createMockFileHandle("yarny-story.json", storyJson) }
      ]);

      vi.mocked(getPersistedDirectoryHandle).mockResolvedValue(
        rootHandle as unknown as FileSystemDirectoryHandle
      );

      const result = await loadAllLocalProjects();

      expect(result.projects).toHaveLength(1);
      expect(result.stories).toHaveLength(1);
    });

    it("should return empty when handle doesn't have yarny-project.json", async () => {
      const rootHandle = createMockDirectoryHandle("test", []);
      rootHandle.getFileHandle = vi.fn().mockRejectedValue(
        new DOMException("File not found", "NotFoundError")
      );

      vi.mocked(getPersistedDirectoryHandle).mockResolvedValue(
        rootHandle as unknown as FileSystemDirectoryHandle
      );

      const result = await loadAllLocalProjects();

      expect(result.projects).toHaveLength(0);
      expect(result.stories).toHaveLength(0);
    });
  });
});

