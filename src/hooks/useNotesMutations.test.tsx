import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useCreateNoteMutation, useReorderNotesMutation, ensureNotesFolder } from "./useNotesMutations";
import { apiClient } from "../api/client";

// Mock the API client
vi.mock("../api/client", () => ({
  apiClient: {
    listDriveFiles: vi.fn(),
    writeDriveFile: vi.fn(),
    createDriveFolder: vi.fn()
  }
}));

// Mock local backup mirror
vi.mock("../services/localFs/localBackupMirror", () => ({
  mirrorNoteWrite: vi.fn(),
  mirrorNoteOrderWrite: vi.fn()
}));

describe("useNotesMutations", () => {
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

  describe("ensureNotesFolder", () => {
    it("returns existing folder if it exists", async () => {
      vi.mocked(apiClient.listDriveFiles).mockResolvedValue({
        files: [
          {
            id: "existing-folder-id",
            name: "Characters",
            mimeType: "application/vnd.google-apps.folder"
          }
        ]
      });

      const folderId = await ensureNotesFolder("story-id", "characters");

      expect(folderId).toBe("existing-folder-id");
      expect(apiClient.createDriveFolder).not.toHaveBeenCalled();
    });

    it("creates folder if it doesn't exist", async () => {
      vi.mocked(apiClient.listDriveFiles).mockResolvedValue({
        files: []
      });
      vi.mocked(apiClient.createDriveFolder).mockResolvedValue({
        id: "new-folder-id",
        name: "Characters"
      } as any);

      const folderId = await ensureNotesFolder("story-id", "characters");

      expect(folderId).toBe("new-folder-id");
      expect(apiClient.createDriveFolder).toHaveBeenCalledWith({
        name: "Characters",
        parentFolderId: "story-id"
      });
    });
  });

  describe("useCreateNoteMutation", () => {
    it("creates a note successfully", async () => {
      vi.mocked(apiClient.listDriveFiles).mockResolvedValue({
        files: [
          {
            id: "characters-folder-id",
            name: "Characters",
            mimeType: "application/vnd.google-apps.folder"
          }
        ]
      });
      vi.mocked(apiClient.writeDriveFile).mockResolvedValue({
        id: "note-id",
        modifiedTime: "2024-01-01T00:00:00Z"
      } as any);

      const { result } = renderHook(
        () => useCreateNoteMutation("story-id"),
        { wrapper }
      );

      result.current.mutate({ noteType: "characters" });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toMatchObject({
        id: "note-id",
        noteType: "characters",
        name: "Character 1"
      });
    });

    it("generates unique note names", async () => {
      vi.mocked(apiClient.listDriveFiles)
        .mockResolvedValueOnce({
          files: [
            {
              id: "characters-folder-id",
              name: "Characters",
              mimeType: "application/vnd.google-apps.folder"
            }
          ]
        })
        .mockResolvedValueOnce({
          files: [
            { id: "note-1", name: "Character 1.txt" },
            { id: "note-2", name: "Character 2.txt" }
          ]
        });
      vi.mocked(apiClient.writeDriveFile).mockResolvedValue({
        id: "note-id",
        modifiedTime: "2024-01-01T00:00:00Z"
      } as any);

      const { result } = renderHook(
        () => useCreateNoteMutation("story-id"),
        { wrapper }
      );

      result.current.mutate({ noteType: "characters" });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiClient.writeDriveFile).toHaveBeenCalledWith(
        expect.objectContaining({
          fileName: "Character 3.txt"
        })
      );
    });

    it("handles missing story folder", async () => {
      const { result } = renderHook(
        () => useCreateNoteMutation(undefined),
        { wrapper }
      );

      result.current.mutate({ noteType: "characters" });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toMatch(/active story/);
    });
  });

  describe("useReorderNotesMutation", () => {
    it("reorders notes successfully", async () => {
      vi.mocked(apiClient.listDriveFiles).mockResolvedValue({
        files: [
          {
            id: "characters-folder-id",
            name: "Characters",
            mimeType: "application/vnd.google-apps.folder"
          },
          {
            id: "order-file-id",
            name: "_order.json",
            mimeType: "application/json"
          }
        ]
      });
      vi.mocked(apiClient.writeDriveFile).mockResolvedValue({} as any);

      const { result } = renderHook(
        () => useReorderNotesMutation("story-id"),
        { wrapper }
      );

      result.current.mutate({
        noteType: "characters",
        newOrder: ["note-2", "note-1"]
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiClient.writeDriveFile).toHaveBeenCalledWith(
        expect.objectContaining({
          fileName: "_order.json",
          content: expect.stringMatching(/"order"\s*:\s*\[\s*"note-2"\s*,\s*"note-1"\s*\]/s)
        })
      );
    });

    it("creates _order.json if it doesn't exist", async () => {
      vi.mocked(apiClient.listDriveFiles).mockResolvedValue({
        files: [
          {
            id: "characters-folder-id",
            name: "Characters",
            mimeType: "application/vnd.google-apps.folder"
          }
        ]
      });
      vi.mocked(apiClient.writeDriveFile).mockResolvedValue({} as any);

      const { result } = renderHook(
        () => useReorderNotesMutation("story-id"),
        { wrapper }
      );

      result.current.mutate({
        noteType: "characters",
        newOrder: ["note-1", "note-2"]
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiClient.writeDriveFile).toHaveBeenCalledWith(
        expect.objectContaining({
          fileName: "_order.json",
          parentFolderId: "characters-folder-id"
        })
      );
    });

    it("handles missing story folder", async () => {
      const { result } = renderHook(
        () => useReorderNotesMutation(undefined),
        { wrapper }
      );

      result.current.mutate({
        noteType: "characters",
        newOrder: ["note-1"]
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toMatch(/active story/);
    });

    it("performs optimistic update", async () => {
      // Set up query data
      queryClient.setQueryData(["notes", "story-id", "characters"], [
        { id: "note-1", name: "Note 1", content: "Content 1" },
        { id: "note-2", name: "Note 2", content: "Content 2" }
      ]);

      vi.mocked(apiClient.listDriveFiles).mockResolvedValue({
        files: [
          {
            id: "characters-folder-id",
            name: "Characters",
            mimeType: "application/vnd.google-apps.folder"
          }
        ]
      });
      vi.mocked(apiClient.writeDriveFile).mockResolvedValue({} as any);

      const { result } = renderHook(
        () => useReorderNotesMutation("story-id"),
        { wrapper }
      );

      result.current.mutate({
        noteType: "characters",
        newOrder: ["note-2", "note-1"]
      });

      // Wait for optimistic update to be applied (onMutate is async)
      await waitFor(() => {
        const optimisticData = queryClient.getQueryData([
          "notes",
          "story-id",
          "characters"
        ]);
        if (Array.isArray(optimisticData)) {
          return optimisticData[0]?.id === "note-2";
        }
        return false;
      });

      // Verify optimistic update
      const optimisticData = queryClient.getQueryData([
        "notes",
        "story-id",
        "characters"
      ]);
      expect(optimisticData).toBeDefined();
      if (Array.isArray(optimisticData)) {
        expect(optimisticData[0]?.id).toBe("note-2");
        expect(optimisticData[1]?.id).toBe("note-1");
      }

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });
  });
});



