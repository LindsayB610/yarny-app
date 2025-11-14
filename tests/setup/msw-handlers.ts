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

  // List files (enhanced with rate limiting and folder structure support)
  http.get("/.netlify/functions/drive-list", ({ request }) => {
    const url = new URL(request.url);
    const folderId = url.searchParams.get("folderId");
    const rateLimitHeader = request.headers.get("x-test-rate-limit");

    // Simulate rate limiting if header is present
    if (rateLimitHeader === "true") {
      return HttpResponse.json(
        {
          error: "Rate limit exceeded",
          retryAfter: 2
        },
        {
          status: 429,
          headers: {
            "Retry-After": "2"
          }
        }
      );
    }

    // Original handler logic
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

    // Support for chapters folder structure
    if (folderId === "chapters-folder-id" || folderId === "story-folder-id") {
      return HttpResponse.json({
        files: [
          {
            id: "chapters-folder-id",
            name: "Chapters",
            mimeType: "application/vnd.google-apps.folder",
            modifiedTime: "2025-01-01T00:00:00.000Z"
          },
          {
            id: "people-folder-id",
            name: "People",
            mimeType: "application/vnd.google-apps.folder",
            modifiedTime: "2025-01-01T00:00:00.000Z"
          },
          {
            id: "places-folder-id",
            name: "Places",
            mimeType: "application/vnd.google-apps.folder",
            modifiedTime: "2025-01-01T00:00:00.000Z"
          },
          {
            id: "things-folder-id",
            name: "Things",
            mimeType: "application/vnd.google-apps.folder",
            modifiedTime: "2025-01-01T00:00:00.000Z"
          }
        ]
      });
    }

    // Support for chapters folder structure
    if (folderId === "chapters-folder-id") {
      return HttpResponse.json({
        files: [
          {
            id: "chapter-1-folder-id",
            name: "Chapter 1",
            mimeType: "application/vnd.google-apps.folder",
            modifiedTime: "2025-01-01T00:00:00.000Z"
          },
          {
            id: "chapter-2-folder-id",
            name: "Chapter 2",
            mimeType: "application/vnd.google-apps.folder",
            modifiedTime: "2025-01-01T00:00:00.000Z"
          }
        ]
      });
    }

    // Support for chapter folders with snippets
    if (folderId === "chapter-1-folder-id") {
      return HttpResponse.json({
        files: [
          {
            id: "snippet-1-id",
            name: "Snippet 1",
            mimeType: "application/vnd.google-apps.document",
            modifiedTime: "2025-01-01T00:00:00.000Z"
          },
          {
            id: "snippet-2-id",
            name: "Snippet 2",
            mimeType: "application/vnd.google-apps.document",
            modifiedTime: "2025-01-01T00:00:00.000Z"
          }
        ]
      });
    }

    // Support for People/Places/Things folders
    if (folderId === "people-folder-id") {
      return HttpResponse.json({
        files: [
          {
            id: "person-1-id",
            name: "Alice",
            mimeType: "text/plain",
            modifiedTime: "2025-01-01T00:00:00.000Z"
          }
        ]
      });
    }

    if (folderId === "places-folder-id") {
      return HttpResponse.json({
        files: [
          {
            id: "place-1-id",
            name: "The Castle",
            mimeType: "text/plain",
            modifiedTime: "2025-01-01T00:00:00.000Z"
          }
        ]
      });
    }

    if (folderId === "things-folder-id") {
      return HttpResponse.json({
        files: [
          {
            id: "thing-1-id",
            name: "The Sword",
            mimeType: "text/plain",
            modifiedTime: "2025-01-01T00:00:00.000Z"
          }
        ]
      });
    }

    return HttpResponse.json({
      files: []
    });
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


  // Delete story
  http.post("/.netlify/functions/drive-delete-story", () => {
    return HttpResponse.json({
      success: true,
      message: "Story deleted",
      deletedFromDrive: false
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
  }),

  // Enhanced read handler with content variations for testing
  http.post("/.netlify/functions/drive-read", async ({ request }) => {
    const body = await request.json();
    const { fileId } = body as { fileId: string };

    // Content variations for testing
    const contentMap: Record<string, string> = {
      "snippet-1-id": "First paragraph of Chapter 1.\n\nSecond paragraph of Chapter 1.",
      "snippet-2-id": "Third paragraph of Chapter 1.\n\nFourth paragraph of Chapter 1.",
      "snippet-3-id": "First paragraph of Chapter 2.\n\nSecond paragraph of Chapter 2.",
      "person-1-id": "Alice is a brave explorer with red hair and a curious nature.",
      "place-1-id": "The Castle is an ancient fortress on the hill overlooking the village.",
      "thing-1-id": "The Sword is a legendary weapon passed down through generations.",
      "goal-json-id": JSON.stringify({
        target: 50000,
        deadline: "2025-12-31T23:59:59.000Z",
        mode: "elastic",
        writingDays: [true, true, true, true, true, false, false],
        daysOff: []
      })
    };

    const content = contentMap[fileId] || "Test content";

    const response: DriveReadResponse = {
      id: fileId,
      name: fileId.includes("person") ? "Alice" : fileId.includes("place") ? "The Castle" : fileId.includes("thing") ? "The Sword" : fileId.includes("goal") ? "goal.json" : "Test Document",
      content,
      modifiedTime: "2025-01-01T00:00:00.000Z",
      mimeType: fileId.includes("goal") ? "application/json" : fileId.includes("person") || fileId.includes("place") || fileId.includes("thing") ? "text/plain" : "application/vnd.google-apps.document"
    };

    return HttpResponse.json(response);
  }),

  // Enhanced write handler to track writes and metadata
  http.post("/.netlify/functions/drive-write", async ({ request }) => {
    const body = await request.json();
    const { fileName, fileId, content } = body as { fileName: string; fileId?: string; content?: string };

    const response: DriveWriteResponse = {
      id: fileId || `new-file-${Date.now()}`,
      name: fileName,
      modifiedTime: new Date().toISOString()
    };

    return HttpResponse.json(response);
  }),

  // Enhanced delete handler
  http.post("/.netlify/functions/drive-delete-file", async ({ request }) => {
    const body = await request.json();
    const { fileId } = body as { fileId: string };

    return HttpResponse.json({
      success: true,
      deletedFileId: fileId
    });
  }),

  // Enhanced rename handler
  http.post("/.netlify/functions/drive-rename-file", async ({ request }) => {
    const body = await request.json();
    const { fileId, newName } = body as { fileId: string; newName: string };

    return HttpResponse.json({
      id: fileId,
      name: newName,
      modifiedTime: new Date().toISOString()
    });
  }),

  // Uptime status endpoint
  http.get("/.netlify/functions/uptime-status", () => {
    return HttpResponse.json({
      status: "up",
      label: "All Systems Operational",
      color: "green"
    });
  })
];

