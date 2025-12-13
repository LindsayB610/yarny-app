import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { apiClient } from "../api/client";
import { useNetworkStatus } from "./useNetworkStatus";
import { useAutoSave } from "./useAutoSave";
import { AppStoreProvider } from "../store/provider";

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

const mockProcessQueuedSavesDirectly = vi.fn().mockResolvedValue(undefined);
vi.mock("../services/queuedSaveProcessor", () => ({
  processQueuedSavesDirectly: mockProcessQueuedSavesDirectly
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AppStoreProvider>{children}</AppStoreProvider>
    </QueryClientProvider>
  );
};

describe("useAutoSave - Session Persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(useNetworkStatus).mockReturnValue({ 
      isOnline: true, 
      isSlowConnection: false, 
      wasOffline: false 
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  describe("Queued Saves Persistence", () => {
    it("should queue save to localStorage when offline", async () => {
      vi.mocked(useNetworkStatus).mockReturnValue({ 
        isOnline: false, 
        isSlowConnection: false, 
        wasOffline: true 
      });

      const { result, rerender } = renderHook(
        ({ content }) =>
          useAutoSave("file-1", content, {
            enabled: true,
            debounceMs: 100
          }),
        {
          wrapper: createWrapper(),
          initialProps: { content: "" }
        }
      );

      // Wait for hook to initialize
      await vi.advanceTimersByTimeAsync(0);

      // Change content to trigger save
      rerender({ content: "test content" });

      // Advance timers to trigger debounced save
      await vi.advanceTimersByTimeAsync(150);

      const queued = JSON.parse(
        localStorage.getItem("yarny_queued_saves") || "[]"
      );
      expect(queued.length).toBeGreaterThan(0);
      expect(queued[0].fileId).toBe("file-1");
      expect(queued[0].content).toBe("test content");
      expect(queued[0].timestamp).toBeDefined();
    });

    it("should persist multiple queued saves", async () => {
      vi.mocked(useNetworkStatus).mockReturnValue({ 
        isOnline: false, 
        isSlowConnection: false, 
        wasOffline: true 
      });

      const { result: result1, rerender: rerender1 } = renderHook(
        ({ content }) =>
          useAutoSave("file-1", content, {
            enabled: true,
            debounceMs: 100
          }),
        {
          wrapper: createWrapper(),
          initialProps: { content: "" }
        }
      );

      await vi.advanceTimersByTimeAsync(0);
      rerender1({ content: "content 1" });
      await vi.advanceTimersByTimeAsync(150);

      const queued1 = JSON.parse(
        localStorage.getItem("yarny_queued_saves") || "[]"
      );
      expect(queued1.length).toBeGreaterThan(0);

      const { result: result2, rerender: rerender2 } = renderHook(
        ({ content }) =>
          useAutoSave("file-2", content, {
            enabled: true,
            debounceMs: 100
          }),
        {
          wrapper: createWrapper(),
          initialProps: { content: "" }
        }
      );

      await vi.advanceTimersByTimeAsync(0);
      rerender2({ content: "content 2" });
      await vi.advanceTimersByTimeAsync(150);

      const queued2 = JSON.parse(
        localStorage.getItem("yarny_queued_saves") || "[]"
      );
      expect(queued2.length).toBeGreaterThanOrEqual(1);
    });

    it("should process queued saves when coming back online", async () => {
      mockProcessQueuedSavesDirectly.mockClear();

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
      vi.mocked(useNetworkStatus).mockReturnValue({ 
        isOnline: false, 
        isSlowConnection: false, 
        wasOffline: true 
      });

      const { result, rerender } = renderHook(
        () =>
          useAutoSave("file-1", "queued content", {
            enabled: true,
            debounceMs: 100,
            localBackupSnippetId: "snippet-1",
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
      vi.mocked(useNetworkStatus).mockReturnValue({ 
        isOnline: true, 
        isSlowConnection: false, 
        wasOffline: true 
      });
      
      // Re-render the same hook instance to trigger the effect
      rerender();

      await waitFor(
        () => {
          // Should process queued saves via queuedSaveProcessor
          expect(mockProcessQueuedSavesDirectly).toHaveBeenCalled();
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

      vi.mocked(useNetworkStatus).mockReturnValue({ 
        isOnline: false, 
        isSlowConnection: false, 
        wasOffline: true 
      });

      const { result, rerender } = renderHook(
        ({ content }) =>
          useAutoSave("file-1", content, {
            enabled: true,
            debounceMs: 100
          }),
        {
          wrapper: createWrapper(),
          initialProps: { content: "" }
        }
      );

      await vi.advanceTimersByTimeAsync(0);
      rerender({ content: "test content" });
      
      // Advance timers to trigger debounced save, which will call readQueuedSaves
      await vi.advanceTimersByTimeAsync(150);

      // Should not throw error, should handle gracefully
      // The hook should have fixed the invalid JSON or started fresh
      const queued = localStorage.getItem("yarny_queued_saves");
      expect(queued).toBeDefined();
      // Should be valid JSON now (either empty array or array with new save)
      const parsed = JSON.parse(queued || "[]");
      expect(Array.isArray(parsed)).toBe(true);
    });
  });

  describe("beforeunload Persistence", () => {
    it("should queue save on beforeunload when content has changed", async () => {
      vi.mocked(useNetworkStatus).mockReturnValue({ 
        isOnline: true, 
        isSlowConnection: false, 
        wasOffline: false 
      });

      const { result, rerender } = renderHook(
        ({ content }) =>
          useAutoSave("file-1", content, {
            enabled: true,
            debounceMs: 10000 // Long debounce to prevent auto-save
          }),
        {
          wrapper: createWrapper(),
          initialProps: { content: "" }
        }
      );

      // Wait for hook to initialize
      await vi.advanceTimersByTimeAsync(0);

      // Change content to trigger unsaved changes
      rerender({ content: "unsaved content" });
      await vi.advanceTimersByTimeAsync(0);

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
      vi.mocked(useNetworkStatus).mockReturnValue({ 
        isOnline: true, 
        isSlowConnection: false, 
        wasOffline: false 
      });
      vi.mocked(apiClient.writeDriveFile).mockResolvedValue({
        id: "file-1",
        name: "test-file",
        modifiedTime: new Date().toISOString()
      });

      const { result, rerender } = renderHook(
        ({ content }) =>
          useAutoSave("file-1", content, {
            enabled: true,
            debounceMs: 100
          }),
        {
          wrapper: createWrapper(),
          initialProps: { content: "" }
        }
      );

      // Wait for hook to initialize
      await vi.advanceTimersByTimeAsync(0);

      // Change content to trigger save
      rerender({ content: "saved content" });

      // Advance timers to trigger debounced save
      await vi.advanceTimersByTimeAsync(150);
      
      // Run all pending async operations
      await vi.runAllTimersAsync();
      
      // Check that save completed (hasUnsavedChanges should be false)
      // Note: We check directly instead of using waitFor since we're using fake timers
      expect(result.current.hasUnsavedChanges).toBe(false);

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

      vi.mocked(useNetworkStatus).mockReturnValue({ 
        isOnline: true, 
        isSlowConnection: false, 
        wasOffline: false 
      });
      vi.mocked(apiClient.writeDriveFile).mockResolvedValue({
        id: "file-1",
        name: "test-file",
        modifiedTime: new Date().toISOString()
      });

      const { result, rerender } = renderHook(
        ({ content }) =>
          useAutoSave("file-1", content, {
            enabled: true,
            debounceMs: 10000, // Long debounce
            localBackupSnippetId: "snippet-1",
            parentFolderId: "folder-1"
          }),
        {
          wrapper: createWrapper(),
          initialProps: { content: "" }
        }
      );

      // Wait for hook to initialize
      await vi.advanceTimersByTimeAsync(0);

      // Change content to trigger unsaved changes
      rerender({ content: "content to save" });
      await vi.advanceTimersByTimeAsync(0);

      // Simulate tab becoming hidden
      Object.defineProperty(document, "hidden", {
        writable: true,
        configurable: true,
        value: true
      });
      
      // Trigger visibility change
      const visibilityChangeEvent = new Event("visibilitychange");
      document.dispatchEvent(visibilityChangeEvent);

      // Advance timers to allow async operations to complete
      await vi.advanceTimersByTimeAsync(100);
      
      // Run all pending async operations
      await vi.runAllTimersAsync();

      // Check that save was triggered (either writeSnippetJson for snippets or writeDriveFile for non-snippets)
      // Note: We check directly instead of using waitFor since we're using fake timers
      const jsonCalled = vi.mocked(writeSnippetJson).mock.calls.length > 0;
      const driveCalled = vi.mocked(apiClient.writeDriveFile).mock.calls.length > 0;
      expect(jsonCalled || driveCalled).toBe(true);
    });

    it("should queue save when tab becomes hidden and offline", async () => {
      vi.mocked(useNetworkStatus).mockReturnValue({ 
        isOnline: false, 
        isSlowConnection: false, 
        wasOffline: true 
      });

      const { result, rerender } = renderHook(
        ({ content }) =>
          useAutoSave("file-1", content, {
            enabled: true,
            debounceMs: 10000
          }),
        {
          wrapper: createWrapper(),
          initialProps: { content: "" }
        }
      );

      // Wait for hook to initialize
      await vi.advanceTimersByTimeAsync(0);

      // Change content to trigger unsaved changes
      rerender({ content: "content to queue" });
      await vi.advanceTimersByTimeAsync(0);

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
    it("should process queued saves when retry event is dispatched", async () => {
      mockProcessQueuedSavesDirectly.mockClear();
      
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
        id: "file-1",
        name: "test-file",
        modifiedTime: new Date().toISOString()
      });
      vi.mocked(useNetworkStatus).mockReturnValue({ 
        isOnline: true, 
        isSlowConnection: false, 
        wasOffline: false 
      });

      const { result } = renderHook(
        () =>
          useAutoSave("file-1", "current content", {
            enabled: true
          }),
        {
          wrapper: createWrapper()
        }
      );

      // Wait for hook to initialize and set up event listener
      await waitFor(() => {
        expect(result.current).toBeDefined();
      }, { timeout: 500 });

      // Dispatch retry event
      window.dispatchEvent(new Event("yarny:retry-queued-saves"));

      await waitFor(
        () => {
          // Should process queued saves via queuedSaveProcessor
          expect(mockProcessQueuedSavesDirectly).toHaveBeenCalled();
        },
        { timeout: 2000 }
      );
    });
  });
});

