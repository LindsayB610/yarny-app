import { describe, expect, it, vi, beforeEach } from "vitest";
import { listAllDriveFiles } from "./listAllDriveFiles";
import { apiClient } from "./client";

// Mock the API client
vi.mock("./client", () => ({
  apiClient: {
    listDriveFiles: vi.fn()
  }
}));

describe("listAllDriveFiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty array when folderId is undefined", async () => {
    const result = await listAllDriveFiles(undefined);

    expect(result).toEqual([]);
    expect(apiClient.listDriveFiles).not.toHaveBeenCalled();
  });

  it("returns files from single page", async () => {
    const mockFiles = [
      { id: "file-1", name: "File 1", mimeType: "text/plain" },
      { id: "file-2", name: "File 2", mimeType: "text/plain" }
    ];

    vi.mocked(apiClient.listDriveFiles).mockResolvedValue({
      files: mockFiles,
      nextPageToken: undefined
    });

    const result = await listAllDriveFiles("folder-id");

    expect(result).toEqual(mockFiles);
    expect(apiClient.listDriveFiles).toHaveBeenCalledTimes(1);
    expect(apiClient.listDriveFiles).toHaveBeenCalledWith({
      folderId: "folder-id",
      pageToken: undefined
    });
  });

  it("paginates through multiple pages", async () => {
    const page1Files = [
      { id: "file-1", name: "File 1", mimeType: "text/plain" },
      { id: "file-2", name: "File 2", mimeType: "text/plain" }
    ];
    const page2Files = [
      { id: "file-3", name: "File 3", mimeType: "text/plain" },
      { id: "file-4", name: "File 4", mimeType: "text/plain" }
    ];

    vi.mocked(apiClient.listDriveFiles)
      .mockResolvedValueOnce({
        files: page1Files,
        nextPageToken: "page-token-1"
      })
      .mockResolvedValueOnce({
        files: page2Files,
        nextPageToken: undefined
      });

    const result = await listAllDriveFiles("folder-id");

    expect(result).toEqual([...page1Files, ...page2Files]);
    expect(apiClient.listDriveFiles).toHaveBeenCalledTimes(2);
    expect(apiClient.listDriveFiles).toHaveBeenNthCalledWith(1, {
      folderId: "folder-id",
      pageToken: undefined
    });
    expect(apiClient.listDriveFiles).toHaveBeenNthCalledWith(2, {
      folderId: "folder-id",
      pageToken: "page-token-1"
    });
  });

  it("stops at max pages limit", async () => {
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Create responses that always have a nextPageToken
    const mockResponse = {
      files: [{ id: "file-1", name: "File 1", mimeType: "text/plain" }],
      nextPageToken: "next-token"
    };

    vi.mocked(apiClient.listDriveFiles).mockResolvedValue(mockResponse);

    const result = await listAllDriveFiles("folder-id");

    // Should stop at MAX_PAGES (1000)
    expect(apiClient.listDriveFiles).toHaveBeenCalledTimes(1000);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Reached page limit")
    );

    consoleWarnSpy.mockRestore();
  });

  it("handles empty file arrays", async () => {
    vi.mocked(apiClient.listDriveFiles).mockResolvedValue({
      files: [],
      nextPageToken: undefined
    });

    const result = await listAllDriveFiles("folder-id");

    expect(result).toEqual([]);
  });

  it("handles missing files property", async () => {
    vi.mocked(apiClient.listDriveFiles).mockResolvedValue({
      nextPageToken: undefined
    } as any);

    const result = await listAllDriveFiles("folder-id");

    expect(result).toEqual([]);
  });

  it("handles API errors gracefully", async () => {
    const error = new Error("API Error");
    vi.mocked(apiClient.listDriveFiles).mockRejectedValue(error);

    await expect(listAllDriveFiles("folder-id")).rejects.toThrow("API Error");
  });
});


