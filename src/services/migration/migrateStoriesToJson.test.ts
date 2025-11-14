import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiClient } from "../../api/client";
import { listAllDriveFiles } from "../../api/listAllDriveFiles";
import { readSnippetJson, writeSnippetJson } from "../jsonStorage";
import { migrateStoriesToJson, isMigrationComplete, getMigrationDate } from "./migrateStoriesToJson";

// Mock dependencies
vi.mock("../../api/client", () => ({
  apiClient: {
    getOrCreateYarnyStories: vi.fn(),
    readDriveFile: vi.fn(),
    listDriveFiles: vi.fn()
  }
}));

vi.mock("../../api/listAllDriveFiles", () => ({
  listAllDriveFiles: vi.fn()
}));

vi.mock("../jsonStorage", () => ({
  readSnippetJson: vi.fn(),
  writeSnippetJson: vi.fn()
}));

describe("migrateStoriesToJson", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Reset listAllDriveFiles mock implementation
    vi.mocked(listAllDriveFiles).mockReset();
  });

  it("should mark migration as complete after successful migration", async () => {
    vi.mocked(apiClient.getOrCreateYarnyStories).mockResolvedValue({
      id: "yarny-folder"
    });

    vi.mocked(listAllDriveFiles).mockResolvedValue([
      {
        id: "story-1",
        name: "Story 1",
        mimeType: "application/vnd.google-apps.folder",
        trashed: false
      }
    ]);

    vi.mocked(listAllDriveFiles).mockResolvedValueOnce([
      {
        id: "story-1",
        name: "Story 1",
        mimeType: "application/vnd.google-apps.folder",
        trashed: false
      }
    ]);

    vi.mocked(listAllDriveFiles).mockResolvedValueOnce([
      {
        id: "story-1",
        name: "Story 1",
        mimeType: "application/vnd.google-apps.folder",
        trashed: false
      }
    ]);

    vi.mocked(listAllDriveFiles).mockResolvedValueOnce([
      {
        id: "data.json",
        name: "data.json",
        mimeType: "application/json"
      }
    ]);

    vi.mocked(apiClient.readDriveFile).mockResolvedValue({
      content: JSON.stringify({
        snippets: {
          "snippet-1": {
            driveFileId: "gdoc-1",
            groupId: "group-1"
          }
        },
        groups: {
          "group-1": {
            driveFolderId: "chapter-1"
          }
        }
      }),
      fileId: "data.json"
    });

    vi.mocked(apiClient.listDriveFiles).mockResolvedValue({
      files: [
        {
          id: "gdoc-1",
          name: "snippet.doc",
          modifiedTime: "2025-01-15T10:00:00Z"
        }
      ]
    });

    vi.mocked(readSnippetJson).mockResolvedValue(null); // Not migrated yet
    vi.mocked(apiClient.readDriveFile).mockResolvedValueOnce({
      content: JSON.stringify({
        snippets: {
          "snippet-1": {
            driveFileId: "gdoc-1",
            groupId: "group-1"
          }
        },
        groups: {
          "group-1": {
            driveFolderId: "chapter-1"
          }
        }
      }),
      fileId: "data.json"
    }).mockResolvedValueOnce({
      content: "Snippet content",
      fileId: "gdoc-1"
    });

    vi.mocked(writeSnippetJson).mockResolvedValue({
      fileId: "json-1",
      modifiedTime: "2025-01-15T10:00:00Z"
    });

    await migrateStoriesToJson();

    expect(isMigrationComplete()).toBe(true);
    expect(getMigrationDate()).toBeTruthy();
  });

  it("should skip already migrated snippets", async () => {
    vi.mocked(apiClient.getOrCreateYarnyStories).mockResolvedValue({
      id: "yarny-folder"
    });

    vi.mocked(listAllDriveFiles)
      .mockResolvedValueOnce([
        {
          id: "story-1",
          name: "Story 1",
          mimeType: "application/vnd.google-apps.folder",
          trashed: false
        }
      ])
      .mockResolvedValueOnce([
        {
          id: "data.json",
          name: "data.json",
          mimeType: "application/json"
        }
      ]);

    vi.mocked(apiClient.readDriveFile).mockResolvedValue({
      content: JSON.stringify({
        snippets: {
          "snippet-1": {
            driveFileId: "gdoc-1",
            groupId: "group-1"
          }
        },
        groups: {
          "group-1": {
            driveFolderId: "chapter-1"
          }
        }
      }),
      fileId: "data.json"
    });

    // Snippet already migrated
    vi.mocked(readSnippetJson).mockResolvedValue({
      content: "Existing content",
      modifiedTime: "2025-01-15T10:00:00Z",
      version: 1
    });

    await migrateStoriesToJson();

    // Should not call writeSnippetJson for already migrated snippet
    expect(writeSnippetJson).not.toHaveBeenCalled();
  });

  it("should handle migration errors gracefully", async () => {
    vi.clearAllMocks();
    
    vi.mocked(apiClient.getOrCreateYarnyStories).mockResolvedValue({
      id: "yarny-folder"
    });

    // Mock listAllDriveFiles to return story folders first
    vi.mocked(listAllDriveFiles).mockImplementation(async (folderId: string) => {
      if (folderId === "yarny-folder") {
        return [
          {
            id: "story-1",
            name: "Story 1",
            mimeType: "application/vnd.google-apps.folder",
            trashed: false
          }
        ];
      }
      // When called for story-1 folder, throw error
      if (folderId === "story-1") {
        throw new Error("Failed to read story folder");
      }
      return [];
    });

    const progress = await migrateStoriesToJson();

    // Verify error was caught and recorded
    expect(progress.errors.length).toBeGreaterThan(0);
    expect(progress.errors[0].storyId).toBe("story-1");
    expect(progress.errors[0].error).toContain("Failed to read story folder");
    // Verify migration still completed (marked as done despite errors)
    expect(localStorage.getItem("yarny_json_migration_complete")).toBe("true");
  });
});

describe("isMigrationComplete", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should return false when migration not complete", () => {
    expect(isMigrationComplete()).toBe(false);
  });

  it("should return true when migration complete", () => {
    localStorage.setItem("yarny_json_migration_complete", "true");
    expect(isMigrationComplete()).toBe(true);
  });
});

describe("getMigrationDate", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should return null when no migration date", () => {
    expect(getMigrationDate()).toBeNull();
  });

  it("should return migration date when set", () => {
    const date = new Date().toISOString();
    localStorage.setItem("yarny_json_migration_date", date);
    expect(getMigrationDate()).toBe(date);
  });
});

