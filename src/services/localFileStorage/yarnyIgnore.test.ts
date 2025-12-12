import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseYarnyIgnore, shouldIgnore } from "./yarnyIgnore";

type MockFileSystemDirectoryHandle = {
  kind: "directory";
  name: string;
  getFileHandle: (fileName: string) => Promise<unknown>;
};

const createMockDirectoryHandle = (
  name: string,
  files: Array<{ name: string; content: string }>
): MockFileSystemDirectoryHandle => {
  const fileMap = new Map(
    files.map((f) => [
      f.name,
      {
        kind: "file" as const,
        name: f.name,
        getFile: vi.fn().mockResolvedValue({
          text: vi.fn().mockResolvedValue(f.content)
        })
      }
    ])
  );

  return {
    kind: "directory" as const,
    name,
    getFileHandle: vi.fn((fileName: string) => {
      const file = fileMap.get(fileName);
      if (file) {
        return Promise.resolve(file);
      }
      throw new DOMException("File not found", "NotFoundError");
    })
  } as MockFileSystemDirectoryHandle;
};

describe("yarnyIgnore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("parseYarnyIgnore", () => {
    it("should return function that never ignores when .yarnyignore doesn't exist", async () => {
      const rootHandle = createMockDirectoryHandle("test", []);
      rootHandle.getFileHandle = vi.fn().mockRejectedValue(
        new DOMException("File not found", "NotFoundError")
      );

      const isIgnored = await parseYarnyIgnore(
        rootHandle as unknown as FileSystemDirectoryHandle
      );

      expect(isIgnored("drafts/chapter-1/01-opening.md")).toBe(false);
      expect(isIgnored("any/path/file.md")).toBe(false);
    });

    it("should ignore files matching patterns", async () => {
      const ignoreContent = "*.txt\n*.docx\nimages/";
      const rootHandle = createMockDirectoryHandle("test", [
        { name: ".yarnyignore", content: ignoreContent }
      ]);

      const isIgnored = await parseYarnyIgnore(
        rootHandle as unknown as FileSystemDirectoryHandle
      );

      expect(isIgnored("drafts/chapter-1/file.txt")).toBe(true);
      expect(isIgnored("drafts/chapter-1/file.docx")).toBe(true);
      expect(isIgnored("images/photo.jpg")).toBe(true);
      expect(isIgnored("drafts/chapter-1/file.md")).toBe(false);
    });

    it("should ignore comments and empty lines", async () => {
      const ignoreContent = "# This is a comment\n\n*.txt\n# Another comment\n*.docx";
      const rootHandle = createMockDirectoryHandle("test", [
        { name: ".yarnyignore", content: ignoreContent }
      ]);

      const isIgnored = await parseYarnyIgnore(
        rootHandle as unknown as FileSystemDirectoryHandle
      );

      expect(isIgnored("file.txt")).toBe(true);
      expect(isIgnored("file.docx")).toBe(true);
      expect(isIgnored("file.md")).toBe(false);
    });

    it("should support wildcards", async () => {
      const ignoreContent = "*.tmp\nbackup-*\n**/cache/";
      const rootHandle = createMockDirectoryHandle("test", [
        { name: ".yarnyignore", content: ignoreContent }
      ]);

      const isIgnored = await parseYarnyIgnore(
        rootHandle as unknown as FileSystemDirectoryHandle
      );

      expect(isIgnored("file.tmp")).toBe(true);
      expect(isIgnored("backup-2024.md")).toBe(true);
      expect(isIgnored("drafts/chapter-1/cache/data.json")).toBe(true);
      expect(isIgnored("drafts/chapter-1/file.md")).toBe(false);
    });

    it("should support directory patterns", async () => {
      const ignoreContent = "notes/\nworldbuilding/\ncharacters/";
      const rootHandle = createMockDirectoryHandle("test", [
        { name: ".yarnyignore", content: ignoreContent }
      ]);

      const isIgnored = await parseYarnyIgnore(
        rootHandle as unknown as FileSystemDirectoryHandle
      );

      expect(isIgnored("notes/character.md")).toBe(true);
      expect(isIgnored("worldbuilding/setting.md")).toBe(true);
      expect(isIgnored("characters/protagonist.md")).toBe(true);
      expect(isIgnored("drafts/chapter-1/file.md")).toBe(false);
    });

    it("should handle paths with different separators", async () => {
      const ignoreContent = "*.txt";
      const rootHandle = createMockDirectoryHandle("test", [
        { name: ".yarnyignore", content: ignoreContent }
      ]);

      const isIgnored = await parseYarnyIgnore(
        rootHandle as unknown as FileSystemDirectoryHandle
      );

      // Should work with both forward and backslashes
      expect(isIgnored("drafts/chapter-1/file.txt")).toBe(true);
      expect(isIgnored("drafts\\chapter-1\\file.txt")).toBe(true);
    });
  });

  describe("shouldIgnore", () => {
    it("should check if a path should be ignored", async () => {
      const ignoreContent = "*.txt";
      const rootHandle = createMockDirectoryHandle("test", [
        { name: ".yarnyignore", content: ignoreContent }
      ]);

      expect(await shouldIgnore(rootHandle as unknown as FileSystemDirectoryHandle, "file.txt")).toBe(
        true
      );
      expect(
        await shouldIgnore(rootHandle as unknown as FileSystemDirectoryHandle, "file.md")
      ).toBe(false);
    });

    it("should return false when .yarnyignore doesn't exist", async () => {
      const rootHandle = createMockDirectoryHandle("test", []);
      rootHandle.getFileHandle = vi.fn().mockRejectedValue(
        new DOMException("File not found", "NotFoundError")
      );

      expect(
        await shouldIgnore(rootHandle as unknown as FileSystemDirectoryHandle, "file.txt")
      ).toBe(false);
    });
  });
});

