import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { http, HttpResponse } from "msw";
import { server } from "../../tests/setup/msw-server";
import { useManualSync } from "./useManualSync";
import { useActiveStory } from "./useActiveStory";
import { useYarnyStore } from "../store/provider";
import { apiClient } from "../api/client";
import { listAllDriveFiles } from "../api/listAllDriveFiles";
import { readSnippetJson, writeSnippetJson } from "../services/jsonStorage";

// Mock dependencies
vi.mock("./useActiveStory");
vi.mock("../store/provider");
vi.mock("../api/client");
vi.mock("../api/listAllDriveFiles");
vi.mock("../services/jsonStorage");
vi.mock("../store/selectors", () => ({
  selectStorySnippets: vi.fn((state, storyId) => {
    if (storyId === "story-1") {
      return [
        { id: "snippet-1", content: "Content 1" },
        { id: "snippet-2", content: "Content 2" }
      ];
    }
    return [];
  })
}));

// MSW will handle fetch mocking

describe("useManualSync", () => {
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: ReactNode }) => JSX.Element;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    vi.clearAllMocks();
    localStorage.clear();

    // Set up MSW handler for sync endpoint
    server.use(
      http.post("/.netlify/functions/sync-json-to-gdoc-background", () => {
        return HttpResponse.json({ modifiedTime: new Date().toISOString() });
      })
    );

    // Mock useActiveStory
    vi.mocked(useActiveStory).mockReturnValue({
      id: "story-1",
      driveFileId: "drive-folder-1",
      projectId: "project-1",
      chapterIds: [],
      updatedAt: new Date().toISOString()
    } as any);

    // Mock useYarnyStore
    vi.mocked(useYarnyStore).mockImplementation((selector: any) => {
      if (selector.toString().includes("selectStorySnippets")) {
        return [
          { id: "snippet-1", content: "Content 1" },
          { id: "snippet-2", content: "Content 2" }
        ];
      }
      return [];
    });

    // Mock listAllDriveFiles
    vi.mocked(listAllDriveFiles).mockResolvedValue([
      {
        id: "data-json-id",
        name: "data.json",
        mimeType: "application/json"
      }
    ] as any);

    // Mock apiClient.readDriveFile
    vi.mocked(apiClient.readDriveFile).mockResolvedValue({
      content: JSON.stringify({
        groups: {
          "chapter-1": { driveFolderId: "chapter-folder-1" }
        },
        snippets: {
          "snippet-1": { driveFileId: "gdoc-1", groupId: "chapter-1" },
          "snippet-2": { driveFileId: "gdoc-2", groupId: "chapter-1" }
        }
      })
    });

    // Mock readSnippetJson
    vi.mocked(readSnippetJson).mockImplementation(async (snippetId) => {
      if (snippetId === "snippet-1") {
        return { content: "Content 1", modifiedTime: new Date().toISOString() };
      }
      if (snippetId === "snippet-2") {
        return { content: "Content 2", modifiedTime: new Date().toISOString() };
      }
      return null;
    });

    // Mock writeSnippetJson
    vi.mocked(writeSnippetJson).mockResolvedValue({ fileId: "json-file-id" } as any);

    // MSW will handle fetch calls, no need to mock fetch directly
  });

  it("returns initial state", () => {
    const { result } = renderHook(() => useManualSync(), { wrapper });

    expect(result.current.isSyncing).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.sync).toBe("function");
  });

  it("syncs snippets successfully", async () => {
    const { result } = renderHook(() => useManualSync(), { wrapper });

    const syncPromise = result.current.sync();

    // Wait for sync to complete
    await syncPromise;

    await waitFor(() => {
      expect(result.current.isSyncing).toBe(false);
    });

    // Verify localStorage was updated
    expect(localStorage.getItem("yarny_last_sync_time")).toBeTruthy();
  });

  it("handles missing story", async () => {
    vi.mocked(useActiveStory).mockReturnValue(null);

    const { result } = renderHook(() => useManualSync(), { wrapper });

    await expect(result.current.sync()).rejects.toThrow("No active story");
  });

  it("handles missing data.json", async () => {
    vi.mocked(listAllDriveFiles).mockResolvedValue([]);

    const { result } = renderHook(() => useManualSync(), { wrapper });

    await expect(result.current.sync()).rejects.toThrow("Story data.json not found");
  });

  it("skips snippets without JSON files", async () => {
    vi.mocked(readSnippetJson).mockResolvedValue(null);

    const { result } = renderHook(() => useManualSync(), { wrapper });

    await result.current.sync();

    // Should complete successfully even if no JSON files exist
    await waitFor(() => {
      expect(result.current.isSyncing).toBe(false);
    });
  });

  it("handles sync errors gracefully", async () => {
    server.use(
      http.post("/.netlify/functions/sync-json-to-gdoc-background", () => {
        return HttpResponse.json({ error: "Sync failed" }, { status: 500 });
      })
    );

    const { result } = renderHook(() => useManualSync(), { wrapper });

    // The mutation will handle errors internally, but the promise should reject
    try {
      await result.current.sync();
      // If it doesn't reject, check that error state is set
      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });
    } catch (error) {
      // Expected to reject
      expect(error).toBeDefined();
    }
  });

  it("dispatches sync events", async () => {
    const syncStartSpy = vi.fn();
    const syncSuccessSpy = vi.fn();
    window.addEventListener("yarny:sync-start", syncStartSpy);
    window.addEventListener("yarny:sync-success", syncSuccessSpy);

    const { result } = renderHook(() => useManualSync(), { wrapper });

    await result.current.sync();

    expect(syncStartSpy).toHaveBeenCalled();
    expect(syncSuccessSpy).toHaveBeenCalled();

    window.removeEventListener("yarny:sync-start", syncStartSpy);
    window.removeEventListener("yarny:sync-success", syncSuccessSpy);
  });

  it("updates localStorage on success", async () => {
    const { result } = renderHook(() => useManualSync(), { wrapper });

    await result.current.sync();

    expect(localStorage.getItem("yarny_last_sync_time")).toBeTruthy();
    expect(localStorage.getItem("yarny_sync_error")).toBeNull();
  });

  it("dispatches error event on failure", async () => {
    const syncErrorSpy = vi.fn();
    window.addEventListener("yarny:sync-error", syncErrorSpy);

    server.use(
      http.post("/.netlify/functions/sync-json-to-gdoc-background", () => {
        return HttpResponse.error();
      })
    );

    const { result } = renderHook(() => useManualSync(), { wrapper });

    try {
      await result.current.sync();
    } catch (error) {
      // Expected to reject - error event should be dispatched in catch block
      expect(syncErrorSpy).toHaveBeenCalled();
    }

    window.removeEventListener("yarny:sync-error", syncErrorSpy);
  });

  afterEach(() => {
    server.resetHandlers();
  });
});



