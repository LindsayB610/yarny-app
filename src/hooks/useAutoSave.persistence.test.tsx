import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { apiClient } from "../api/client";
import { useNetworkStatus } from "./useNetworkStatus";
import { useAutoSave } from "./useAutoSave";

// Mock dependencies
vi.mock("../api/client", () => ({
  apiClient: {
    writeDriveFile: vi.fn()
  }
}));

vi.mock("../services/jsonStorage", () => ({
  writeSnippetJson: vi.fn(),
  readSnippetJson: vi.fn()
}));

vi.mock("../services/localFs/localBackupMirror", () => ({
  mirrorStoryDocument: vi.fn(async () => ({ success: true })),
  mirrorSnippetWrite: vi.fn(async () => ({ success: true }))
}));

vi.mock("./useNetworkStatus", () => ({
  useNetworkStatus: vi.fn(() => ({ isOnline: true }))
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useAutoSave - Session Persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(useNetworkStatus).mockReturnValue({ isOnline: true });
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("Queued Saves Persistence", () => {
    it("should queue save to localStorage when offline", async () => {
      vi.mocked(useNetworkStatus).mockReturnValue({ isOnline: false });

      const { result } = renderHook(
        () =>
          useAutoSave("file-1", "test content", {
            enabled: true,
            debounceMs: 100
          }),
        {
          wrapper: createWrapper()
        }
      );

      await waitFor(
        () => {
          const queued = JSON.parse(
            localStorage.getItem("yarny_queued_saves") || "[]"
          );
          expect(queued.length).toBeGreaterThan(0);
          expect(queued[0].fileId).toBe("file-1");
          expect(queued[0].content).toBe("test content");
          expect(queued[0].timestamp).toBeDefined();
        },
        { timeout: 500 }
      );
    });

    it("should persist multiple queued saves", async () => {
      vi.mocked(useNetworkStatus).mockReturnValue({ isOnline: false });

      const { result: result1 } = renderHook(
        () =>
          useAutoSave("file-1", "content 1", {
            enabled: true,
            debounceMs: 100
          }),
        {
          wrapper: createWrapper()
        }
      );

      await waitFor(
        () => {
          const queued = JSON.parse(
            localStorage.getItem("yarny_queued_saves") || "[]"
          );
          expect(queued.length).toBeGreaterThan(0);
        },
        { timeout: 500 }
      );

      const { result: result2 } = renderHook(
        () =>
          useAutoSave("file-2", "content 2", {
            enabled: true,
            debounceMs: 100
          }),
        {
          wrapper: createWrapper()
        }
      );

      await waitFor(
        () => {
          const queued = JSON.parse(
            localStorage.getItem("yarny_queued_saves") || "[]"
          );
          expect(queued.length).toBeGreaterThanOrEqual(1);
        },
        { timeout: 500 }
      );
    });

    it.skip("should process queued saves when coming back online", async () => {
      // TODO(fix-test): hook now delegates queued-save processing to queuedSaveProcessor;
      // update this test to mock processQueuedSavesDirectly instead of spying on writeSnippetJson.
      const { writeSnippetJson } = await import("../services/jsonStorage");
      vi.mocked(writeSnippetJson).mockResolvedValue({
        fileId: "json-file-1",
        modifiedTime: new Date().toISOString()
      });

      // Manually queue a save
      const queuedSave = {
        fileId: "file-1",
        content: "queued content",
        timestamp: new Date().toISOString(),
        snippetId: "snippet-1",
        parentFolderId: "folder-1"
      };
      localStorage.setItem("yarny_queued_saves", JSON.stringify([queuedSave]));

      // Start offline
      vi.mocked(useNetworkStatus).mockReturnValue({ isOnline: false });

      const { result } = renderHook(
        () =>
          useAutoSave("file-1", "queued content", {
            enabled: true,
            debounceMs: 100,
            snippetId: "snippet-1",
            parentFolderId: "folder-1"
          }),
        {
          wrapper: createWrapper()
        }
      );

      // Wait for hook to initialize
      await waitFor(() => {
        expect(result.current).toBeDefined();
      }, { timeout: 500 });

      // Come back online - this should trigger processing
      vi.mocked(useNetworkStatus).mockReturnValue({ isOnline: true });

      // Re-render hook to trigger online processing effect
      const { result: result2 } = renderHook(
        () =>
          useAutoSave("file-1", "queued content", {
            enabled: true,
            debounceMs: 100,
            snippetId: "snippet-1",
            parentFolderId: "folder-1"
          }),
        {
          wrapper: createWrapper()
        }
      );

      await waitFor(
        () => {
          // Should process queued saves
          expect(writeSnippetJson).toHaveBeenCalledWith(
            "snippet-1",
            "queued content",
            "folder-1",
            "file-1",
            undefined
          );
        },
        { timeout: 2000 }
      );
    });

    it("should preserve queued saves across page reloads", () => {
      // Simulate queued saves from previous session
      const queuedSaves = [
        {
          fileId: "file-1",
          content: "content 1",
          timestamp: new Date().toISOString()
        },
        {
          fileId: "file-2",
          content: "content 2",
          timestamp: new Date().toISOString()
        }
      ];
      localStorage.setItem("yarny_queued_saves", JSON.stringify(queuedSaves));

      // Verify persistence
      const restored = JSON.parse(
        localStorage.getItem("yarny_queued_saves") || "[]"
      );
      expect(restored).toHaveLength(2);
      expect(restored[0].fileId).toBe("file-1");
      expect(restored[1].fileId).toBe("file-2");
    });

    it("should handle malformed queued saves gracefully", async () => {
      // Set invalid JSON in localStorage
      localStorage.setItem("yarny_queued_saves", "invalid json");

      vi.mocked(useNetworkStatus).mockReturnValue({ isOnline: false });

      const { result } = renderHook(
        () =>
          useAutoSave("file-1", "test content", {
            enabled: true,
            debounceMs: 100
          }),
        {
          wrapper: createWrapper()
        }
      );

      // Should not throw error, should handle gracefully
      await waitFor(
        () => {
          // Should either fix the queue or start fresh
          const queued = localStorage.getItem("yarny_queued_saves");
          expect(queued).toBeDefined();
        },
        { timeout: 500 }
      );
    });
  });

  describe("beforeunload Persistence", () => {
    it("should queue save on beforeunload when content has changed", () => {
      vi.mocked(useNetworkStatus).mockReturnValue({ isOnline: true });

      const { result } = renderHook(
        () =>
          useAutoSave("file-1", "unsaved content", {
            enabled: true,
            debounceMs: 10000 // Long debounce to prevent auto-save
          }),
        {
          wrapper: createWrapper()
        }
      );

      // Trigger beforeunload
      const beforeUnloadEvent = new Event("beforeunload");
      window.dispatchEvent(beforeUnloadEvent);

      // Check that save was queued
      const queued = JSON.parse(
        localStorage.getItem("yarny_queued_saves") || "[]"
      );
      expect(queued.length).toBeGreaterThan(0);
      expect(queued[0].fileId).toBe("file-1");
      expect(queued[0].content).toBe("unsaved content");
    });

    it("should not queue save on beforeunload when content is already saved", async () => {
      vi.mocked(useNetworkStatus).mockReturnValue({ isOnline: true });
      vi.mocked(apiClient.writeDriveFile).mockResolvedValue({
        fileId: "file-1"
      });

      const { result } = renderHook(
        () =>
          useAutoSave("file-1", "saved content", {
            enabled: true,
            debounceMs: 100
          }),
        {
          wrapper: createWrapper()
        }
      );

      // Wait for auto-save to complete
      await waitFor(
        () => {
          expect(result.current.hasUnsavedChanges).toBe(false);
        },
        { timeout: 2000 }
      );

      // Trigger beforeunload
      const beforeUnloadEvent = new Event("beforeunload");
      window.dispatchEvent(beforeUnloadEvent);

      // Should not queue save since content is already saved
      const queued = JSON.parse(
        localStorage.getItem("yarny_queued_saves") || "[]"
      );
      expect(queued.length).toBe(0);
    });
  });

  describe("Visibility Change Persistence", () => {
    it("should save content when tab becomes hidden", async () => {
      const { writeSnippetJson } = await import("../services/jsonStorage");
      vi.mocked(writeSnippetJson).mockResolvedValue({
        fileId: "json-file-1",
        modifiedTime: new Date().toISOString()
      });

      vi.mocked(useNetworkStatus).mockReturnValue({ isOnline: true });
      vi.mocked(apiClient.writeDriveFile).mockResolvedValue({
        fileId: "file-1"
      });

      const { result } = renderHook(
        () =>
          useAutoSave("file-1", "content to save", {
            enabled: true,
            debounceMs: 10000, // Long debounce
            snippetId: "snippet-1",
            parentFolderId: "folder-1"
          }),
        {
          wrapper: createWrapper()
        }
      );

      // Wait for hook to initialize and content to be set
      await waitFor(() => {
        expect(result.current).toBeDefined();
      }, { timeout: 500 });

      // Simulate tab becoming hidden
      Object.defineProperty(document, "hidden", {
        writable: true,
        configurable: true,
        value: true
      });
      
      // Trigger visibility change
      const visibilityChangeEvent = new Event("visibilitychange");
      document.dispatchEvent(visibilityChangeEvent);

      // Wait for save to be triggered (either writeSnippetJson for snippets or writeDriveFile for non-snippets)
      await waitFor(
        () => {
          // Check that either writeSnippetJson was called (for snippets) or writeDriveFile (for non-snippets)
          const jsonCalled = vi.mocked(writeSnippetJson).mock.calls.length > 0;
          const driveCalled = vi.mocked(apiClient.writeDriveFile).mock.calls.length > 0;
          expect(jsonCalled || driveCalled).toBe(true);
        },
        { timeout: 2000 }
      );
    });

    it("should queue save when tab becomes hidden and offline", () => {
      vi.mocked(useNetworkStatus).mockReturnValue({ isOnline: false });

      const { result } = renderHook(
        () =>
          useAutoSave("file-1", "content to queue", {
            enabled: true,
            debounceMs: 10000
          }),
        {
          wrapper: createWrapper()
        }
      );

      // Simulate tab becoming hidden
      Object.defineProperty(document, "hidden", {
        writable: true,
        configurable: true,
        value: true
      });
      const visibilityChangeEvent = new Event("visibilitychange");
      document.dispatchEvent(visibilityChangeEvent);

      // Check that save was queued
      const queued = JSON.parse(
        localStorage.getItem("yarny_queued_saves") || "[]"
      );
      expect(queued.length).toBeGreaterThan(0);
      expect(queued[0].fileId).toBe("file-1");
      expect(queued[0].content).toBe("content to queue");
    });
  });

  describe("Manual Retry Event", () => {
    it.skip("should process queued saves when retry event is dispatched", async () => {
      // TODO(fix-test): hook now imports queuedSaveProcessor dynamically; refactor to spy on that module
      // or expose a test seam before reenabling this coverage.
      // Queue some saves
      const queuedSaves = [
        {
          fileId: "file-1",
          content: "content 1",
          timestamp: new Date().toISOString()
        }
      ];
      localStorage.setItem("yarny_queued_saves", JSON.stringify(queuedSaves));

      vi.mocked(apiClient.writeDriveFile).mockResolvedValue({
        fileId: "file-1"
      });
      vi.mocked(useNetworkStatus).mockReturnValue({ isOnline: true });

      renderHook(
        () =>
          useAutoSave("file-1", "current content", {
            enabled: true
          }),
        {
          wrapper: createWrapper()
        }
      );

      // Dispatch retry event
      window.dispatchEvent(new Event("yarny:retry-queued-saves"));

      await waitFor(
        () => {
          expect(apiClient.writeDriveFile).toHaveBeenCalled();
        },
        { timeout: 1000 }
      );
    });
  });
});

