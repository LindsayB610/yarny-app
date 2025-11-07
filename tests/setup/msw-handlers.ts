import { http, HttpResponse } from "msw";
import type { DriveFile, DriveReadResponse, DriveWriteResponse } from "../../src/api/contract";

// Test data fixtures
export const TEST_USER = {
  email: "test@example.com",
  name: "Test User",
  picture: "https://example.com/avatar.jpg"
};

export const TEST_YARNY_FOLDER_ID = "test-yarny-folder-id";
export const TEST_STORY_FOLDER_ID = "test-story-folder-id";
export const TEST_CHAPTER_FOLDER_ID = "test-chapter-folder-id";
export const TEST_SNIPPET_FILE_ID = "test-snippet-file-id";

// Mock Google Drive files
export const mockDriveFiles: DriveFile[] = [
  {
    id: TEST_STORY_FOLDER_ID,
    name: "Test Story",
    mimeType: "application/vnd.google-apps.folder",
    modifiedTime: "2025-01-01T00:00:00.000Z"
  },
  {
    id: TEST_SNIPPET_FILE_ID,
    name: "Chapter 1",
    mimeType: "application/vnd.google-apps.document",
    modifiedTime: "2025-01-01T00:00:00.000Z"
  }
];

// MSW handlers for Google Drive API
export const handlers = [
  // Config endpoint
  http.get("/.netlify/functions/config", () => {
    return HttpResponse.json({
      clientId: "test-client-id"
    });
  }),

  // Verify Google endpoint
  http.post("/.netlify/functions/verify-google", () => {
    return HttpResponse.json({
      verified: true,
      user: TEST_USER.email,
      name: TEST_USER.name,
      picture: TEST_USER.picture,
      token: "test-session-token"
    });
  }),

  // Get or create Yarny Stories folder
  http.get("/.netlify/functions/drive-get-or-create-yarny-stories", () => {
    return HttpResponse.json({
      id: TEST_YARNY_FOLDER_ID,
      name: "Yarny Stories",
      created: false
    });
  }),

  // List files
  http.get("/.netlify/functions/drive-list", ({ request }) => {
    const url = new URL(request.url);
    const folderId = url.searchParams.get("folderId");

    if (folderId === TEST_YARNY_FOLDER_ID) {
      return HttpResponse.json({
        files: [mockDriveFiles[0]]
      });
    }

    if (folderId === TEST_STORY_FOLDER_ID) {
      return HttpResponse.json({
        files: [mockDriveFiles[1]]
      });
    }

    return HttpResponse.json({
      files: []
    });
  }),

  // Read file
  http.post("/.netlify/functions/drive-read", async ({ request }) => {
    const body = await request.json();
    const { fileId } = body as { fileId: string };

    const response: DriveReadResponse = {
      id: fileId,
      name: "Test Document",
      content: "Test content",
      modifiedTime: "2025-01-01T00:00:00.000Z",
      mimeType: "application/vnd.google-apps.document"
    };

    return HttpResponse.json(response);
  }),

  // Write file
  http.post("/.netlify/functions/drive-write", async ({ request }) => {
    const body = await request.json();
    const { fileName, fileId } = body as { fileName: string; fileId?: string };

    const response: DriveWriteResponse = {
      id: fileId || `new-file-${Date.now()}`,
      name: fileName,
      modifiedTime: new Date().toISOString()
    };

    return HttpResponse.json(response);
  }),

  // Create folder
  http.post("/.netlify/functions/drive-create-folder", async ({ request }) => {
    const body = await request.json();
    const { name } = body as { name: string };

    return HttpResponse.json({
      id: `folder-${Date.now()}`,
      name,
      created: true
    });
  }),

  // Delete file
  http.post("/.netlify/functions/drive-delete-file", () => {
    return HttpResponse.json({
      success: true
    });
  }),

  // Delete story
  http.post("/.netlify/functions/drive-delete-story", () => {
    return HttpResponse.json({
      success: true,
      message: "Story deleted",
      deletedFromDrive: false
    });
  }),

  // Rename file
  http.post("/.netlify/functions/drive-rename-file", async ({ request }) => {
    const body = await request.json();
    const { fileId, newName } = body as { fileId: string; newName: string };

    return HttpResponse.json({
      id: fileId,
      name: newName
    });
  }),

  // Check comments
  http.post("/.netlify/functions/drive-check-comments", () => {
    return HttpResponse.json({
      hasComments: false,
      hasTrackedChanges: false,
      commentCount: 0,
      commentIds: []
    });
  }),

  // Logout
  http.post("/.netlify/functions/logout", () => {
    return HttpResponse.json({
      success: true,
      message: "Logged out"
    });
  })
];

