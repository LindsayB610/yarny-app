import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import {
  useCreateStory,
  useDeleteStory,
  useRefreshStories,
  useUpdateStoryMetadataMutation,
  useUpdateStoryGoalsMutation
} from "./useStoryMutations";
import { apiClient } from "../api/client";
import { initializeStoryStructure } from "../utils/storyCreation";
import { readProjectJson, writeProjectJson } from "./useStoryMutations.helpers";
import { useYarnyStore } from "../store/provider";
import { useLocalBackupStore } from "../store/localBackupProvider";

// Mock dependencies
vi.mock("../api/client");
vi.mock("../utils/storyCreation");
vi.mock("./useStoryMutations.helpers");
vi.mock("../store/provider");
vi.mock("../store/localBackupProvider");
vi.mock("../services/localFs/LocalFsCapability");
vi.mock("../services/localFs/localBackupMirror");
vi.mock("../utils/storyProgressCache");

describe("useStoryMutations", () => {
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
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </MemoryRouter>
    );
    vi.clearAllMocks();
  });

  describe("useCreateStory", () => {
    it("creates a story successfully", async () => {
      const mockYarnyFolder = { id: "yarny-folder-id" };
      const mockStoryFolder = { id: "story-folder-id", name: "Test Story" };
      vi.mocked(apiClient.getOrCreateYarnyStories).mockResolvedValue(mockYarnyFolder as any);
      vi.mocked(apiClient.createDriveFolder).mockResolvedValue(mockStoryFolder as any);
      vi.mocked(initializeStoryStructure).mockResolvedValue();

      const { result } = renderHook(() => useCreateStory(), { wrapper });

      result.current.mutate({
        storyName: "Test Story",
        metadata: { genre: "Fantasy", description: "A test story" }
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiClient.getOrCreateYarnyStories).toHaveBeenCalled();
      expect(apiClient.createDriveFolder).toHaveBeenCalledWith({
        name: "Test Story",
        parentFolderId: "yarny-folder-id"
      });
      expect(initializeStoryStructure).toHaveBeenCalledWith(
        "story-folder-id",
        { genre: "Fantasy", description: "A test story" }
      );
    });

    it("handles re-auth requirement", async () => {
      const mockYarnyFolder = { id: "yarny-folder-id" };
      const mockStoryFolder = { id: "story-folder-id", name: "Test Story" };
      vi.mocked(apiClient.getOrCreateYarnyStories).mockResolvedValue(mockYarnyFolder as any);
      vi.mocked(apiClient.createDriveFolder).mockResolvedValue(mockStoryFolder as any);
      
      const error = new Error("MISSING_DOCS_SCOPE");
      vi.mocked(initializeStoryStructure).mockRejectedValue(error);

      // Mock window.location
      const originalLocation = window.location;
      delete (window as any).location;
      (window as any).location = { href: "" };

      const { result } = renderHook(() => useCreateStory(), { wrapper });

      result.current.mutate({ storyName: "Test Story" });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect((window as any).location.href).toBe("/.netlify/functions/drive-auth");

      // Restore original location
      Object.defineProperty(window, "location", {
        value: originalLocation,
        writable: true,
        configurable: true
      });
    });
  });

  describe("useDeleteStory", () => {
    it("deletes a story successfully", async () => {
      vi.mocked(apiClient.deleteStory).mockResolvedValue({} as any);

      const { result } = renderHook(() => useDeleteStory(), { wrapper });

      result.current.mutate({
        storyFolderId: "story-folder-id"
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiClient.deleteStory).toHaveBeenCalledWith({
        storyFolderId: "story-folder-id"
      });
    });

    it("invalidates queries on success", async () => {
      // Set up initial query data
      queryClient.setQueryData(["drive", "stories"], [{ id: "story-1" }]);

      vi.mocked(apiClient.deleteStory).mockResolvedValue({} as any);

      const { result } = renderHook(() => useDeleteStory(), { wrapper });

      result.current.mutate({
        storyFolderId: "story-folder-id"
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Check that queries were invalidated
      await waitFor(() => {
        const queryState = queryClient.getQueryState(["drive", "stories"]);
        expect(queryState?.isInvalidated).toBe(true);
      });
    });
  });

  describe("useRefreshStories", () => {
    it("refreshes stories list", async () => {
      // Set up some initial query data
      queryClient.setQueryData(["drive", "stories"], [{ id: "story-1" }]);

      const { result } = renderHook(() => useRefreshStories(), { wrapper });

      result.current.mutate();

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify queries were invalidated and refetched
      expect(queryClient.getQueryState(["drive", "stories"])?.isInvalidated).toBe(true);
    });
  });

  describe("useUpdateStoryMetadataMutation", () => {
    it("updates story metadata successfully", async () => {
      vi.mocked(useYarnyStore).mockReturnValue({
        id: "story-1",
        driveFileId: "drive-folder-1",
        projectId: "project-1",
        chapterIds: [],
        updatedAt: new Date().toISOString()
      } as any);

      vi.mocked(readProjectJson).mockResolvedValue({
        project: { name: "Test Story" },
        fileId: "project-file-id"
      });
      vi.mocked(writeProjectJson).mockResolvedValue();

      const { result } = renderHook(() => useUpdateStoryMetadataMutation(), { wrapper });

      result.current.mutate({
        genre: "Fantasy",
        description: "Updated description"
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(writeProjectJson).toHaveBeenCalledWith(
        "drive-folder-1",
        expect.objectContaining({
          genre: "Fantasy",
          description: "Updated description"
        }),
        "project-file-id"
      );
    });

    it("handles missing active story", async () => {
      vi.mocked(useYarnyStore).mockReturnValue(null);

      const { result } = renderHook(() => useUpdateStoryMetadataMutation(), { wrapper });

      result.current.mutate({ genre: "Fantasy" });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe("No active story selected");
    });
  });

  describe("useUpdateStoryGoalsMutation", () => {
    it("updates story goals for Drive project", async () => {
      vi.mocked(useYarnyStore).mockReturnValue({
        id: "story-1",
        driveFileId: "drive-folder-1",
        projectId: "project-1",
        chapterIds: [],
        updatedAt: new Date().toISOString()
      } as any);

      vi.mocked(useLocalBackupStore).mockReturnValue(null);
      vi.mocked(readProjectJson).mockResolvedValue({
        project: { name: "Test Story" },
        fileId: "project-file-id"
      });
      vi.mocked(writeProjectJson).mockResolvedValue();
      vi.mocked(apiClient.writeDriveFile).mockResolvedValue({} as any);

      const { result } = renderHook(() => useUpdateStoryGoalsMutation(), { wrapper });

      result.current.mutate({
        wordGoal: 50000,
        goal: {
          target: 1000,
          deadline: "2024-12-31",
          mode: "elastic"
        }
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(writeProjectJson).toHaveBeenCalled();
      expect(apiClient.writeDriveFile).toHaveBeenCalledWith(
        expect.objectContaining({
          fileName: "goal.json",
          parentFolderId: "drive-folder-1"
        })
      );
    });

    it("handles missing active story", async () => {
      vi.mocked(useYarnyStore).mockReturnValue(null);

      const { result } = renderHook(() => useUpdateStoryGoalsMutation(), { wrapper });

      result.current.mutate({ wordGoal: 50000 });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe("No active story selected");
    });
  });
});

