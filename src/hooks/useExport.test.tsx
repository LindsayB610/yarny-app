import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useExport } from "./useExport";
import { apiClient } from "../api/client";
import { localBackupStore } from "../store/localBackupStore";

// Mock fetch for background sync
global.fetch = vi.fn();

// Mock the API client
vi.mock("../api/client", () => ({
  apiClient: {
    writeDriveFile: vi.fn()
  }
}));

// Mock local backup store
vi.mock("../store/localBackupStore", () => ({
  localBackupStore: {
    getState: vi.fn()
  }
}));

describe("useExport", () => {
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

  it("exports single snippet to Drive", async () => {
    const mockResponse = {
      id: "doc-id",
      name: "Test Export.doc",
      modifiedTime: new Date().toISOString()
    };
    vi.mocked(apiClient.writeDriveFile).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useExport(), { wrapper });

    const snippets = [
      {
        id: "snippet-1",
        title: "Chapter 1",
        content: "This is test content."
      }
    ];

    await act(async () => {
      await result.current.exportSnippets({
        fileName: "Test Export",
        snippets,
        parentFolderId: "folder-id",
        destination: "drive"
      });
    });

    await waitFor(() => {
      expect(result.current.isExporting).toBe(false);
    });

    expect(apiClient.writeDriveFile).toHaveBeenCalledWith({
      fileName: "Test Export",
      content: "# Chapter 1\n\nThis is test content.",
      parentFolderId: "folder-id",
      mimeType: "application/vnd.google-apps.document"
    });
  });

  it("exports multiple snippets to Drive", async () => {
    const mockResponse = {
      id: "doc-id",
      name: "Test Export.doc",
      modifiedTime: new Date().toISOString()
    };
    vi.mocked(apiClient.writeDriveFile).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useExport(), { wrapper });

    const snippets = [
      {
        id: "snippet-1",
        title: "Chapter 1",
        content: "Content 1"
      },
      {
        id: "snippet-2",
        title: "Chapter 2",
        content: "Content 2"
      }
    ];

    await act(async () => {
      await result.current.exportSnippets({
        fileName: "Test Export",
        snippets,
        parentFolderId: "folder-id",
        destination: "drive"
      });
    });

    expect(apiClient.writeDriveFile).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("# Chapter 1")
      })
    );
    expect(apiClient.writeDriveFile).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("# Chapter 2")
      })
    );
  });

  it("chunks large exports", async () => {
    const mockResponse = {
      id: "doc-id",
      name: "Test Export.doc",
      modifiedTime: new Date().toISOString()
    };
    vi.mocked(apiClient.writeDriveFile).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useExport(), { wrapper });

    // Create content larger than chunk limit (500k chars)
    const largeContent = "a".repeat(600_000);
    const snippets = [
      {
        id: "snippet-1",
        title: "Large Chapter",
        content: largeContent
      }
    ];

    await act(async () => {
      await result.current.exportSnippets({
        fileName: "Large Export",
        snippets,
        parentFolderId: "folder-id",
        destination: "drive"
      });
    });

    // Should be called multiple times for chunking
    expect(apiClient.writeDriveFile).toHaveBeenCalledTimes(2);
  });

  it("tracks export progress", async () => {
    const mockResponse = {
      id: "doc-id",
      name: "Test Export.doc",
      modifiedTime: new Date().toISOString()
    };
    vi.mocked(apiClient.writeDriveFile).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useExport(), { wrapper });

    const onProgress = vi.fn();
    const snippets = [
      {
        id: "snippet-1",
        title: "Chapter 1",
        content: "Content"
      }
    ];

    await act(async () => {
      await result.current.exportSnippets({
        fileName: "Test Export",
        snippets,
        parentFolderId: "folder-id",
        destination: "drive",
        onProgress
      });
    });

    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "creating"
      })
    );
    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "completed"
      })
    );
  });

  it("sanitizes file names", async () => {
    const mockResponse = {
      id: "doc-id",
      name: "Test Export.doc",
      modifiedTime: new Date().toISOString()
    };
    vi.mocked(apiClient.writeDriveFile).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useExport(), { wrapper });

    const snippets = [
      {
        id: "snippet-1",
        title: "Chapter 1",
        content: "Content"
      }
    ];

    await act(async () => {
      await result.current.exportSnippets({
        fileName: "Test<>Export|File",
        snippets,
        parentFolderId: "folder-id",
        destination: "drive"
      });
    });

    expect(apiClient.writeDriveFile).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: expect.not.stringContaining("<")
      })
    );
  });

  it("exports to local filesystem when enabled", async () => {
    const mockRepository = {
      writeExportFile: vi.fn().mockResolvedValue(undefined)
    };

    vi.mocked(localBackupStore.getState).mockReturnValue({
      enabled: true,
      permission: "granted",
      repository: mockRepository as any
    });

    const { result } = renderHook(() => useExport(), { wrapper });

    const snippets = [
      {
        id: "snippet-1",
        title: "Chapter 1",
        content: "Content"
      }
    ];

    await act(async () => {
      await result.current.exportSnippets({
        fileName: "Test Export",
        snippets,
        destination: "local",
        fileExtension: ".md"
      });
    });

    expect(mockRepository.writeExportFile).toHaveBeenCalledWith(
      "Test Export.md",
      expect.stringContaining("# Chapter 1")
    );
    expect(apiClient.writeDriveFile).not.toHaveBeenCalled();
  });

  it("throws error when local export is not enabled", async () => {
    vi.mocked(localBackupStore.getState).mockReturnValue({
      enabled: false,
      permission: "denied",
      repository: null
    });

    const { result } = renderHook(() => useExport(), { wrapper });

    const snippets = [
      {
        id: "snippet-1",
        title: "Chapter 1",
        content: "Content"
      }
    ];

    await act(async () => {
      await expect(
        result.current.exportSnippets({
          fileName: "Test Export",
          snippets,
          destination: "local"
        })
      ).rejects.toThrow("Local backups must be enabled");
    });
  });

  it("handles export errors", async () => {
    const error = new Error("Export failed");
    vi.mocked(apiClient.writeDriveFile).mockRejectedValue(error);

    const { result } = renderHook(() => useExport(), { wrapper });

    const snippets = [
      {
        id: "snippet-1",
        title: "Chapter 1",
        content: "Content"
      }
    ];

    await act(async () => {
      await expect(
        result.current.exportSnippets({
          fileName: "Test Export",
          snippets,
          parentFolderId: "folder-id",
          destination: "drive"
        })
      ).rejects.toThrow("Export failed");
    });

    await waitFor(() => {
      expect(result.current.progress.status).toBe("error");
    });
  });

  it("handles snippets without titles", async () => {
    const mockResponse = {
      id: "doc-id",
      name: "Test Export.doc",
      modifiedTime: new Date().toISOString()
    };
    vi.mocked(apiClient.writeDriveFile).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useExport(), { wrapper });

    const snippets = [
      {
        id: "snippet-1",
        title: "",
        content: "Content without title"
      }
    ];

    await act(async () => {
      await result.current.exportSnippets({
        fileName: "Test Export",
        snippets,
        parentFolderId: "folder-id",
        destination: "drive"
      });
    });

    expect(apiClient.writeDriveFile).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("Content without title")
      })
    );
  });
});

