import { describe, it, expect, afterEach, vi } from "vitest";

import type { LocalFsRepository } from "./LocalFsRepository";
import { refreshAllStoriesToLocal } from "./localBackupMirror";
import { localBackupStore } from "../../store/localBackupStore";
import type { YarnyState } from "../../store/types";

const createYarnyState = (): YarnyState => {
  const now = new Date().toISOString();
  return {
    entities: {
      projects: {
        ["project-1"]: {
          id: "project-1",
          name: "Project",
          driveFolderId: "drive-project",
          storyIds: ["story-1"],
          updatedAt: now
        }
      },
      projectOrder: ["project-1"],
      stories: {
        ["story-1"]: {
          id: "story-1",
          projectId: "project-1",
          title: "Story",
          driveFileId: "drive-story",
          chapterIds: ["chapter-1"],
          updatedAt: now
        }
      },
      storyOrder: ["story-1"],
      chapters: {
        ["chapter-1"]: {
          id: "chapter-1",
          storyId: "story-1",
          title: "Chapter",
          order: 0,
          snippetIds: ["snippet-1"],
          driveFolderId: "drive-chapter",
          updatedAt: now
        }
      },
      snippets: {
        ["snippet-1"]: {
          id: "snippet-1",
          storyId: "story-1",
          chapterId: "chapter-1",
          order: 0,
          content: "Snippet content",
          updatedAt: now
        }
      }
    },
    ui: {
      isSyncing: false
    }
  };
};

const setupStoreWithRepository = (repository: LocalFsRepository) => {
  const store = localBackupStore.getState();
  store.reset();
  store.setSupported(true);
  store.setInitializing(false);
  store.setEnabled(true);
  store.setPermission("granted" as PermissionState);
  store.setRepository(repository);
  store.setRefreshStatus("idle");
};

describe("refreshAllStoriesToLocal", () => {
  afterEach(() => {
    localBackupStore.getState().reset();
    vi.restoreAllMocks();
  });

  it("returns failure and sets error status when a mirror operation fails", async () => {
    const error = new Error("write failed");
    const repository = {
      ensureStoryStructure: vi.fn().mockResolvedValue(undefined),
      writeProjectJson: vi.fn().mockRejectedValue(error),
      writeDataJson: vi.fn(),
      writeStoryDocument: vi.fn(),
      writeSnippet: vi.fn()
    } as unknown as LocalFsRepository;

    setupStoreWithRepository(repository);

    const result = await refreshAllStoriesToLocal(createYarnyState());

    expect(result.success).toBe(false);
    expect(result.error).toBe(error);

    const storeState = localBackupStore.getState();
    expect(storeState.refreshStatus).toBe("error");
    expect(storeState.refreshMessage).toContain("write failed");
  });

  it("completes successfully when all mirror operations succeed", async () => {
    const repository = {
      ensureStoryStructure: vi.fn().mockResolvedValue(undefined),
      writeProjectJson: vi.fn().mockResolvedValue(undefined),
      writeDataJson: vi.fn().mockResolvedValue(undefined),
      writeStoryDocument: vi.fn().mockResolvedValue(undefined),
      writeSnippet: vi.fn().mockResolvedValue(undefined)
    } as unknown as LocalFsRepository;

    setupStoreWithRepository(repository);

    const result = await refreshAllStoriesToLocal(createYarnyState());

    expect(result.success).toBe(true);
    const storeState = localBackupStore.getState();
    expect(storeState.refreshStatus).toBe("success");
    expect(storeState.refreshMessage).toBe("Local backups refreshed successfully.");
  });
});


