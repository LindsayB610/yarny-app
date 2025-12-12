import { describe, it, expect, vi, beforeEach } from "vitest";
import { importLocalProject } from "./importLocalProject";

type MockFileSystemDirectoryHandle = {
  kind: "directory";
  name: string;
  values: () => IterableIterator<unknown>;
  getFileHandle: (fileName: string, options?: { create?: boolean }) => Promise<unknown>;
  getDirectoryHandle: (dirName: string, options?: { create?: boolean }) => Promise<unknown>;
};

// Mock File System Access API
const createMockFileHandle = (name: string, content: string) => {
  const writable = {
    write: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined)
  };
  return {
    kind: "file" as const,
    name,
    getFile: vi.fn().mockResolvedValue({
      text: vi.fn().mockResolvedValue(content)
    }),
    createWritable: vi.fn().mockResolvedValue(writable)
  };
};

const createMockDirectoryHandle = (
  name: string,
  entries: Array<{ name: string; handle: unknown }>
): MockFileSystemDirectoryHandle => {
  const entryMap = new Map(entries.map((e) => [e.name, e.handle]));
  const handle: MockFileSystemDirectoryHandle = {
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
  return handle;
};

describe("importLocalProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should import project with chapters and snippets", async () => {
    const snippet1 = createMockFileHandle("01-opening.md", "The morning sun filtered through...");
    const snippet2 = createMockFileHandle("02-discovery.md", "The symbols on the map glowed...");
    const chapter1 = createMockDirectoryHandle("chapter-1", [
      { name: "01-opening.md", handle: snippet1 },
      { name: "02-discovery.md", handle: snippet2 }
    ]);

    const snippet3 = createMockFileHandle("01-new-day.md", "The next morning...");
    const chapter2 = createMockDirectoryHandle("chapter-2", [
      { name: "01-new-day.md", handle: snippet3 }
    ]);

    const drafts = createMockDirectoryHandle("drafts", [
      { name: "chapter-1", handle: chapter1 },
      { name: "chapter-2", handle: chapter2 }
    ]);

    const readme = createMockFileHandle("README.md", "# Test Novel\n\nA test project");
    const rootHandle = createMockDirectoryHandle("test-novel", [
      { name: "drafts", handle: drafts },
      { name: "README.md", handle: readme }
    ]);

    const result = await importLocalProject(rootHandle as unknown as FileSystemDirectoryHandle);

    expect(result.projects).toHaveLength(1);
    expect(result.stories).toHaveLength(1);
    expect(result.chapters).toHaveLength(2);
    expect(result.snippets).toHaveLength(3);

    const project = result.projects![0];
    expect(project.name).toBe("test-novel");
    expect(project.storageType).toBe("local");
    expect(project.localPath).toBe("test-novel");

    const story = result.stories![0];
    expect(story.title).toBe("Test Novel");

    const chapters = result.chapters!.sort((a, b) => a.order - b.order);
    expect(chapters[0].title).toBe("Chapter 1");
    expect(chapters[0].snippetIds).toHaveLength(2);
    expect(chapters[1].title).toBe("Chapter 2");
    expect(chapters[1].snippetIds).toHaveLength(1);

    const snippets = result.snippets!;
    expect(snippets[0].content).toContain("morning sun");
    expect(snippets[1].content).toContain("symbols on the map");
    expect(snippets[2].content).toContain("next morning");
  });

  it("should handle project without drafts directory", async () => {
    const rootHandle = createMockDirectoryHandle("empty-project", []);

    // Mock getDirectoryHandle to throw NotFoundError for drafts
    rootHandle.getDirectoryHandle = vi.fn().mockRejectedValue(
      new DOMException("Directory not found", "NotFoundError")
    );

    const result = await importLocalProject(rootHandle as unknown as FileSystemDirectoryHandle);

    expect(result.projects).toHaveLength(1);
    expect(result.stories).toHaveLength(1);
    expect(result.chapters).toHaveLength(0);
    expect(result.snippets).toHaveLength(0);

    const project = result.projects![0];
    expect(project.name).toBe("empty-project");
  });

  it("should sort chapters by number", async () => {
    const chapter3 = createMockDirectoryHandle("chapter-3", []);
    const chapter1 = createMockDirectoryHandle("chapter-1", []);
    const chapter2 = createMockDirectoryHandle("chapter-2", []);

    const drafts = createMockDirectoryHandle("drafts", [
      { name: "chapter-3", handle: chapter3 },
      { name: "chapter-1", handle: chapter1 },
      { name: "chapter-2", handle: chapter2 }
    ]);

    const rootHandle = createMockDirectoryHandle("test", [
      { name: "drafts", handle: drafts }
    ]);

    const result = await importLocalProject(rootHandle as unknown as FileSystemDirectoryHandle);

    const chapters = result.chapters!.sort((a, b) => a.order - b.order);
    expect(chapters[0].title).toBe("Chapter 1");
    expect(chapters[1].title).toBe("Chapter 2");
    expect(chapters[2].title).toBe("Chapter 3");
  });

  it("should sort snippets by filename", async () => {
    const snippet2 = createMockFileHandle("02-second.md", "Second snippet");
    const snippet1 = createMockFileHandle("01-first.md", "First snippet");
    const snippet3 = createMockFileHandle("03-third.md", "Third snippet");

    const chapter = createMockDirectoryHandle("chapter-1", [
      { name: "02-second.md", handle: snippet2 },
      { name: "01-first.md", handle: snippet1 },
      { name: "03-third.md", handle: snippet3 }
    ]);

    const drafts = createMockDirectoryHandle("drafts", [
      { name: "chapter-1", handle: chapter }
    ]);

    const rootHandle = createMockDirectoryHandle("test", [
      { name: "drafts", handle: drafts }
    ]);

    const result = await importLocalProject(rootHandle as unknown as FileSystemDirectoryHandle);

    const snippets = result.snippets!.sort((a, b) => a.order - b.order);
    expect(snippets[0].content).toContain("First snippet");
    expect(snippets[1].content).toContain("Second snippet");
    expect(snippets[2].content).toContain("Third snippet");
  });

  it("should extract story title from README", async () => {
    const readme = createMockFileHandle("README.md", "# My Awesome Novel\n\nDescription here");
    const drafts = createMockDirectoryHandle("drafts", []);
    const rootHandle = createMockDirectoryHandle("test", [
      { name: "drafts", handle: drafts },
      { name: "README.md", handle: readme }
    ]);

    const result = await importLocalProject(rootHandle as unknown as FileSystemDirectoryHandle);

    expect(result.stories![0].title).toBe("My Awesome Novel");
  });

  it("should use project name as story title if no README", async () => {
    const drafts = createMockDirectoryHandle("drafts", []);
    const rootHandle = createMockDirectoryHandle("my-novel", [
      { name: "drafts", handle: drafts }
    ]);

    // Override getFileHandle to throw for README but work for JSON files
    const originalGetFileHandle = rootHandle.getFileHandle;
    rootHandle.getFileHandle = vi.fn((fileName: string, options?: { create?: boolean }) => {
      if (fileName === "README.md") {
        return Promise.reject(new DOMException("File not found", "NotFoundError"));
      }
      return originalGetFileHandle.call(rootHandle, fileName, options);
    });

    const result = await importLocalProject(rootHandle as unknown as FileSystemDirectoryHandle);

    expect(result.stories![0].title).toBe("my-novel");
  });

  it("should respect .yarnyignore patterns", async () => {
    const snippet1 = createMockFileHandle("01-opening.md", "The morning sun...");
    const snippet2 = createMockFileHandle("02-notes.txt", "Some notes"); // Should be ignored
    const chapter1 = createMockDirectoryHandle("chapter-1", [
      { name: "01-opening.md", handle: snippet1 },
      { name: "02-notes.txt", handle: snippet2 }
    ]);

    const drafts = createMockDirectoryHandle("drafts", [
      { name: "chapter-1", handle: chapter1 }
    ]);

    const ignoreFile = createMockFileHandle(".yarnyignore", "*.txt\nnotes/");
    const rootHandle = createMockDirectoryHandle("test", [
      { name: "drafts", handle: drafts },
      { name: ".yarnyignore", handle: ignoreFile }
    ]);

    const result = await importLocalProject(rootHandle as unknown as FileSystemDirectoryHandle);

    // Should only import .md files, not .txt
    expect(result.snippets).toHaveLength(1);
    expect(result.snippets![0].content).toContain("morning sun");
  });

  it("should ignore chapters matching .yarnyignore patterns", async () => {
    const chapter1 = createMockDirectoryHandle("chapter-1", [
      { name: "01-opening.md", handle: createMockFileHandle("01-opening.md", "Content") }
    ]);
    const chapter2 = createMockDirectoryHandle("chapter-draft", [
      { name: "01-draft.md", handle: createMockFileHandle("01-draft.md", "Draft") }
    ]);

    const drafts = createMockDirectoryHandle("drafts", [
      { name: "chapter-1", handle: chapter1 },
      { name: "chapter-draft", handle: chapter2 }
    ]);

    const ignoreFile = createMockFileHandle(".yarnyignore", "drafts/chapter-draft");
    const rootHandle = createMockDirectoryHandle("test", [
      { name: "drafts", handle: drafts },
      { name: ".yarnyignore", handle: ignoreFile }
    ]);

    const result = await importLocalProject(rootHandle as unknown as FileSystemDirectoryHandle);

    // Should only import chapter-1, not chapter-draft
    expect(result.chapters).toHaveLength(1);
    expect(result.chapters![0].id).toBe("chapter-1");
  });
});

