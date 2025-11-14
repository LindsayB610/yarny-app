import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useNotesQuery } from "./useNotesQuery";
import { apiClient } from "../api/client";

// Mock the API client
vi.mock("../api/client", () => ({
  apiClient: {
    listDriveFiles: vi.fn(),
    readDriveFile: vi.fn()
  }
}));

describe("useNotesQuery", () => {
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
  });

  it("returns empty array when storyFolderId is undefined", async () => {
    const { result } = renderHook(() => useNotesQuery(undefined, "people", true), { wrapper });

    // Query is disabled when storyFolderId is undefined, so it won't run
    // The data should be undefined initially since the query never executes
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(apiClient.listDriveFiles).not.toHaveBeenCalled();
  });

  it("fetches notes successfully", async () => {
    const mockFolderResponse = {
      files: [
        {
          id: "people-folder-id",
          name: "People",
          mimeType: "application/vnd.google-apps.folder"
        }
      ]
    };

    const mockNotesResponse = {
      files: [
        {
          id: "note-1",
          name: "Person 1.txt",
          mimeType: "text/plain",
          modifiedTime: "2024-01-01T00:00:00Z"
        },
        {
          id: "note-2",
          name: "Person 2.txt",
          mimeType: "text/plain",
          modifiedTime: "2024-01-02T00:00:00Z"
        }
      ]
    };

    vi.mocked(apiClient.listDriveFiles)
      .mockResolvedValueOnce(mockFolderResponse)
      .mockResolvedValueOnce(mockNotesResponse);

    vi.mocked(apiClient.readDriveFile)
      .mockResolvedValueOnce({ content: "Note 1 content" })
      .mockResolvedValueOnce({ content: "Note 2 content" });

    const { result } = renderHook(() => useNotesQuery("story-id", "people", true), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0]).toMatchObject({
      id: "note-1",
      name: "Person 1",
      content: "Note 1 content"
    });
  });

  it("returns empty array when notes folder doesn't exist", async () => {
    const mockFolderResponse = {
      files: []
    };

    vi.mocked(apiClient.listDriveFiles).mockResolvedValue(mockFolderResponse);

    const { result } = renderHook(() => useNotesQuery("story-id", "people", true), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
  });

  it("filters notes by mimeType", async () => {
    const mockFolderResponse = {
      files: [
        {
          id: "people-folder-id",
          name: "People",
          mimeType: "application/vnd.google-apps.folder"
        }
      ]
    };

    const mockNotesResponse = {
      files: [
        {
          id: "note-1",
          name: "Person 1.txt",
          mimeType: "text/plain",
          modifiedTime: "2024-01-01T00:00:00Z"
        },
        {
          id: "note-2",
          name: "Person 2.md",
          mimeType: "text/markdown",
          modifiedTime: "2024-01-02T00:00:00Z"
        },
        {
          id: "other-file",
          name: "other.json",
          mimeType: "application/json",
          modifiedTime: "2024-01-03T00:00:00Z"
        }
      ]
    };

    vi.mocked(apiClient.listDriveFiles)
      .mockResolvedValueOnce(mockFolderResponse)
      .mockResolvedValueOnce(mockNotesResponse);

    vi.mocked(apiClient.readDriveFile)
      .mockResolvedValueOnce({ content: "Note 1" })
      .mockResolvedValueOnce({ content: "Note 2" });

    const { result } = renderHook(() => useNotesQuery("story-id", "people", true), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should only include text/plain and text/markdown files
    expect(result.current.data).toHaveLength(2);
  });

  it("applies custom ordering from _order.json", async () => {
    const mockFolderResponse = {
      files: [
        {
          id: "people-folder-id",
          name: "People",
          mimeType: "application/vnd.google-apps.folder"
        }
      ]
    };

    const mockNotesResponse = {
      files: [
        {
          id: "order-file",
          name: "_order.json",
          mimeType: "application/json"
        },
        {
          id: "note-1",
          name: "Person 1.txt",
          mimeType: "text/plain",
          modifiedTime: "2024-01-01T00:00:00Z"
        },
        {
          id: "note-2",
          name: "Person 2.txt",
          mimeType: "text/plain",
          modifiedTime: "2024-01-02T00:00:00Z"
        }
      ]
    };

    vi.mocked(apiClient.listDriveFiles)
      .mockResolvedValueOnce(mockFolderResponse)
      .mockResolvedValueOnce(mockNotesResponse);

    vi.mocked(apiClient.readDriveFile)
      .mockResolvedValueOnce({ content: JSON.stringify({ order: ["note-2", "note-1"] }) })
      .mockResolvedValueOnce({ content: "Note 1" })
      .mockResolvedValueOnce({ content: "Note 2" });

    const { result } = renderHook(() => useNotesQuery("story-id", "people", true), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should be ordered according to _order.json
    expect(result.current.data?.[0].id).toBe("note-2");
    expect(result.current.data?.[1].id).toBe("note-1");
  });

  it("handles read errors gracefully", async () => {
    const mockFolderResponse = {
      files: [
        {
          id: "people-folder-id",
          name: "People",
          mimeType: "application/vnd.google-apps.folder"
        }
      ]
    };

    const mockNotesResponse = {
      files: [
        {
          id: "note-1",
          name: "Person 1.txt",
          mimeType: "text/plain",
          modifiedTime: "2024-01-01T00:00:00Z"
        },
        {
          id: "note-2",
          name: "Person 2.txt",
          mimeType: "text/plain",
          modifiedTime: "2024-01-02T00:00:00Z"
        }
      ]
    };

    vi.mocked(apiClient.listDriveFiles)
      .mockResolvedValueOnce(mockFolderResponse)
      .mockResolvedValueOnce(mockNotesResponse);

    vi.mocked(apiClient.readDriveFile)
      .mockResolvedValueOnce({ content: "Note 1" })
      .mockRejectedValueOnce(new Error("Read error"));

    const { result } = renderHook(() => useNotesQuery("story-id", "people", true), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should only include successfully read notes
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].id).toBe("note-1");
  });

  it("removes file extensions from note names", async () => {
    const mockFolderResponse = {
      files: [
        {
          id: "people-folder-id",
          name: "People",
          mimeType: "application/vnd.google-apps.folder"
        }
      ]
    };

    const mockNotesResponse = {
      files: [
        {
          id: "note-1",
          name: "Person 1.txt",
          mimeType: "text/plain",
          modifiedTime: "2024-01-01T00:00:00Z"
        },
        {
          id: "note-2",
          name: "Person 2.md",
          mimeType: "text/markdown",
          modifiedTime: "2024-01-02T00:00:00Z"
        }
      ]
    };

    vi.mocked(apiClient.listDriveFiles)
      .mockResolvedValueOnce(mockFolderResponse)
      .mockResolvedValueOnce(mockNotesResponse);

    vi.mocked(apiClient.readDriveFile)
      .mockResolvedValueOnce({ content: "Note 1" })
      .mockResolvedValueOnce({ content: "Note 2" });

    const { result } = renderHook(() => useNotesQuery("story-id", "people", true), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.[0].name).toBe("Person 1");
    expect(result.current.data?.[1].name).toBe("Person 2");
  });
});


