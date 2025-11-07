import { describe, expect, it, beforeEach } from "vitest";
import { apiClient } from "../../src/api/client";
import { server } from "../setup/msw-server";
import { http, HttpResponse } from "msw";

describe("API Client Integration", () => {
  beforeEach(() => {
    // Reset handlers to defaults before each test
    server.resetHandlers();
  });

  describe("Authentication APIs", () => {
    it("gets config", async () => {
      const config = await apiClient.getConfig();
      expect(config.clientId).toBe("test-client-id");
    });

    it("verifies Google token", async () => {
      const response = await apiClient.verifyGoogle({ token: "test-token" });
      expect(response.verified).toBe(true);
      expect(response.user).toBe("test@example.com");
    });

    it("logs out", async () => {
      const response = await apiClient.logout();
      expect(response.success).toBe(true);
    });
  });

  describe("Drive APIs", () => {
    it("lists drive files", async () => {
      const response = await apiClient.listDriveFiles({ folderId: "test-folder-id" });
      expect(response.files).toBeDefined();
    });

    it("reads drive file", async () => {
      const response = await apiClient.readDriveFile({ fileId: "test-file-id" });
      expect(response.id).toBe("test-file-id");
      expect(response.content).toBe("Test content");
    });

    it("writes drive file", async () => {
      const response = await apiClient.writeDriveFile({
        fileName: "test.txt",
        content: "test content",
        parentFolderId: "parent-id"
      });
      expect(response.id).toBeDefined();
      expect(response.name).toBe("test.txt");
    });

    it("creates drive folder", async () => {
      const response = await apiClient.createDriveFolder({
        name: "New Folder",
        parentFolderId: "parent-id"
      });
      expect(response.id).toBeDefined();
      expect(response.name).toBe("New Folder");
      expect(response.created).toBe(true);
    });

    it("gets or creates Yarny Stories folder", async () => {
      const response = await apiClient.getOrCreateYarnyStories();
      expect(response.id).toBe("test-yarny-folder-id");
      expect(response.name).toBe("Yarny Stories");
    });

    it("deletes drive file", async () => {
      const response = await apiClient.deleteDriveFile({ fileId: "test-file-id" });
      expect(response.success).toBe(true);
    });

    it("renames drive file", async () => {
      const response = await apiClient.renameDriveFile({
        fileId: "test-file-id",
        newName: "New Name"
      });
      expect(response.id).toBe("test-file-id");
      expect(response.name).toBe("New Name");
    });

    it("checks drive comments", async () => {
      const response = await apiClient.checkDriveComments({ fileId: "test-file-id" });
      expect(response.hasComments).toBe(false);
      expect(response.hasTrackedChanges).toBe(false);
    });

    it("deletes story", async () => {
      const response = await apiClient.deleteStory({
        storyFolderId: "test-story-id",
        deleteFromDrive: false
      });
      expect(response.success).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("handles API errors correctly", async () => {
      server.use(
        http.get("/.netlify/functions/config", () => {
          return HttpResponse.json(
            { error: "Unauthorized", message: "Invalid credentials" },
            { status: 401 }
          );
        })
      );

      await expect(apiClient.getConfig()).rejects.toThrow();
    });

    it("handles network errors", async () => {
      server.use(
        http.get("/.netlify/functions/config", () => {
          return HttpResponse.error();
        })
      );

      await expect(apiClient.getConfig()).rejects.toThrow();
    });
  });
});

