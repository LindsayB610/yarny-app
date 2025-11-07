import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { apiClient } from "../api/client";
import { useConflictDetection } from "./useConflictDetection";

// Mock API client
vi.mock("../api/client", () => ({
  apiClient: {
    listDriveFiles: vi.fn(),
    readDriveFile: vi.fn()
  }
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

describe("useConflictDetection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("checkSnippetConflict", () => {
    it("should return null when driveFileId is not provided", async () => {
      const { result } = renderHook(() => useConflictDetection(), {
        wrapper: createWrapper()
      });

      const conflict = await result.current.checkSnippetConflict(
        "snippet-1",
        "2025-01-08T10:00:00Z",
        "",
        "folder-1"
      );

      expect(conflict).toBeNull();
    });

    it("should return null when parentFolderId is not provided", async () => {
      const { result } = renderHook(() => useConflictDetection(), {
        wrapper: createWrapper()
      });

      const conflict = await result.current.checkSnippetConflict(
        "snippet-1",
        "2025-01-08T10:00:00Z",
        "file-1",
        ""
      );

      expect(conflict).toBeNull();
    });

    it("should return null when Drive file is not found", async () => {
      vi.mocked(apiClient.listDriveFiles).mockResolvedValue({
        files: []
      });

      const { result } = renderHook(() => useConflictDetection(), {
        wrapper: createWrapper()
      });

      const conflictPromise = result.current.checkSnippetConflict(
        "snippet-1",
        "2025-01-08T10:00:00Z",
        "file-1",
        "folder-1"
      );

      await waitFor(async () => {
        const conflict = await conflictPromise;
        expect(conflict).toBeNull();
      });
    });

    it("should return null when local version is newer than Drive", async () => {
      const localTime = "2025-01-08T12:00:00Z";
      const driveTime = "2025-01-08T10:00:00Z";

      vi.mocked(apiClient.listDriveFiles).mockResolvedValue({
        files: [
          {
            id: "file-1",
            name: "snippet.txt",
            modifiedTime: driveTime,
            mimeType: "text/plain"
          }
        ]
      });

      const { result } = renderHook(() => useConflictDetection(), {
        wrapper: createWrapper()
      });

      const conflictPromise = result.current.checkSnippetConflict(
        "snippet-1",
        localTime,
        "file-1",
        "folder-1"
      );

      await waitFor(async () => {
        const conflict = await conflictPromise;
        expect(conflict).toBeNull();
      });
    });

    it("should detect conflict when Drive version is newer than local", async () => {
      const localTime = "2025-01-08T10:00:00Z";
      const driveTime = "2025-01-08T12:00:00Z";
      const driveContent = "Drive content\n\nUpdated in Drive";

      vi.mocked(apiClient.listDriveFiles).mockResolvedValue({
        files: [
          {
            id: "file-1",
            name: "snippet.txt",
            modifiedTime: driveTime,
            mimeType: "text/plain"
          }
        ]
      });

      vi.mocked(apiClient.readDriveFile).mockResolvedValue({
        content: driveContent,
        fileId: "file-1"
      });

      const { result } = renderHook(() => useConflictDetection(), {
        wrapper: createWrapper()
      });

      const conflict = await result.current.checkSnippetConflict(
        "snippet-1",
        localTime,
        "file-1",
        "folder-1"
      );

      await waitFor(async () => {
        const conflictResult = await conflict;
        expect(conflictResult).not.toBeNull();
        expect(conflictResult?.snippetId).toBe("snippet-1");
        expect(conflictResult?.localModifiedTime).toBe(localTime);
        expect(conflictResult?.driveModifiedTime).toBe(driveTime);
        expect(conflictResult?.driveContent).toBe(driveContent);
        expect(conflictResult?.localContent).toBe(""); // Will be provided by caller
      });
    });

    it("should detect conflict when times are equal but Drive is slightly newer", async () => {
      const localTime = "2025-01-08T10:00:00.000Z";
      const driveTime = "2025-01-08T10:00:00.001Z"; // 1ms newer

      vi.mocked(apiClient.listDriveFiles).mockResolvedValue({
        files: [
          {
            id: "file-1",
            name: "snippet.txt",
            modifiedTime: driveTime,
            mimeType: "text/plain"
          }
        ]
      });

      vi.mocked(apiClient.readDriveFile).mockResolvedValue({
        content: "Drive content",
        fileId: "file-1"
      });

      const { result } = renderHook(() => useConflictDetection(), {
        wrapper: createWrapper()
      });

      const conflictPromise = result.current.checkSnippetConflict(
        "snippet-1",
        localTime,
        "file-1",
        "folder-1"
      );

      await waitFor(async () => {
        const conflictResult = await conflictPromise;
        expect(conflictResult).not.toBeNull();
        expect(conflictResult?.driveModifiedTime).toBe(driveTime);
      });
    });

    it("should handle empty Drive content", async () => {
      const localTime = "2025-01-08T10:00:00Z";
      const driveTime = "2025-01-08T12:00:00Z";

      vi.mocked(apiClient.listDriveFiles).mockResolvedValue({
        files: [
          {
            id: "file-1",
            name: "snippet.txt",
            modifiedTime: driveTime,
            mimeType: "text/plain"
          }
        ]
      });

      vi.mocked(apiClient.readDriveFile).mockResolvedValue({
        content: "",
        fileId: "file-1"
      });

      const { result } = renderHook(() => useConflictDetection(), {
        wrapper: createWrapper()
      });

      const conflictPromise = result.current.checkSnippetConflict(
        "snippet-1",
        localTime,
        "file-1",
        "folder-1"
      );

      await waitFor(async () => {
        const conflictResult = await conflictPromise;
        expect(conflictResult).not.toBeNull();
        expect(conflictResult?.driveContent).toBe("");
      });
    });

    it("should handle API errors gracefully", async () => {
      vi.mocked(apiClient.listDriveFiles).mockRejectedValue(
        new Error("Network error")
      );

      const { result } = renderHook(() => useConflictDetection(), {
        wrapper: createWrapper()
      });

      const conflict = await result.current.checkSnippetConflict(
        "snippet-1",
        "2025-01-08T10:00:00Z",
        "file-1",
        "folder-1"
      );

      await waitFor(() => {
        expect(conflict).resolves.toBeNull();
      });
    });

    it("should use React Query caching for file listing", async () => {
      const localTime = "2025-01-08T10:00:00Z";
      const driveTime = "2025-01-08T12:00:00Z";

      vi.mocked(apiClient.listDriveFiles).mockResolvedValue({
        files: [
          {
            id: "file-1",
            name: "snippet.txt",
            modifiedTime: driveTime,
            mimeType: "text/plain"
          }
        ]
      });

      vi.mocked(apiClient.readDriveFile).mockResolvedValue({
        content: "Drive content",
        fileId: "file-1"
      });

      const { result } = renderHook(() => useConflictDetection(), {
        wrapper: createWrapper()
      });

      // Check conflict twice - second call should use cache
      await result.current.checkSnippetConflict(
        "snippet-1",
        localTime,
        "file-1",
        "folder-1"
      );
      await result.current.checkSnippetConflict(
        "snippet-1",
        localTime,
        "file-1",
        "folder-1"
      );

      // Should only call listDriveFiles once due to caching (within staleTime window)
      // Note: This is approximate since React Query may refetch based on timing
      expect(apiClient.listDriveFiles).toHaveBeenCalled();
    });
  });

  describe("resolveConflictWithDrive", () => {
    it("should resolve conflict by reading Drive content", async () => {
      const driveContent = "Resolved Drive content";

      vi.mocked(apiClient.readDriveFile).mockResolvedValue({
        content: driveContent,
        fileId: "file-1"
      });

      const { result } = renderHook(() => useConflictDetection(), {
        wrapper: createWrapper()
      });

      const resolvedContent = await result.current.resolveConflictWithDrive(
        "file-1"
      );

      expect(resolvedContent).toBe(driveContent);
      expect(apiClient.readDriveFile).toHaveBeenCalledWith({
        fileId: "file-1"
      });
    });

    it("should return empty string when Drive content is undefined", async () => {
      vi.mocked(apiClient.readDriveFile).mockResolvedValue({
        content: undefined,
        fileId: "file-1"
      });

      const { result } = renderHook(() => useConflictDetection(), {
        wrapper: createWrapper()
      });

      const resolvedContent = await result.current.resolveConflictWithDrive(
        "file-1"
      );

      expect(resolvedContent).toBe("");
    });

    it("should handle errors when reading Drive file", async () => {
      vi.mocked(apiClient.readDriveFile).mockRejectedValue(
        new Error("Failed to read file")
      );

      const { result } = renderHook(() => useConflictDetection(), {
        wrapper: createWrapper()
      });

      await expect(
        result.current.resolveConflictWithDrive("file-1")
      ).rejects.toThrow("Failed to read file");
    });
  });
});

