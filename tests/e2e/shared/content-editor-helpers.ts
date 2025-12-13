import type { Page} from "@playwright/test";
import { expect } from "@playwright/test";

export interface ContentTestConfig {
  storyId: string;
  storyFolderId: string;
  contentId: string;
  contentType: "snippet" | "note";
  contentName: string;
  initialContent: string;
  routePath: string; // e.g., "/stories/story-1/people/note-1" or "/stories/story-1/snippets/snippet-1"
  folderName: string; // "People", "Places", "Things", or chapter folder name
  folderId: string; // folder ID for the content
  mimeType: string; // "text/plain" for notes, "application/vnd.google-apps.document" for snippets
}

/**
 * Sets up API mocks for content editor tests
 */
export async function setupContentEditorMocks(
  page: Page,
  config: ContentTestConfig
): Promise<void> {
  // Mock authentication using localStorage (as used by useAuth hook)
  await page.addInitScript(() => {
    window.localStorage.setItem("yarny_auth", "test-session-token");
    window.localStorage.setItem(
      "yarny_user",
      JSON.stringify({
        email: "test@example.com",
        token: "test-session-token",
        name: "Test User"
      })
    );
  });

  // Mock Yarny Stories folder
  await page.route("**/.netlify/functions/drive-get-or-create-yarny-stories", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "yarny-folder-id",
        name: "Yarny Stories",
        created: false
      })
    });
  });

  // Mock story folder structure
  await page.route(`**/.netlify/functions/drive-list*`, (route) => {
    const url = route.request().url();
    const request = route.request();
    const method = request.method();
    
    // Handle POST requests (some endpoints use POST)
    let folderId: string | undefined;
    if (method === "POST") {
      try {
        const postData = request.postDataJSON();
        folderId = postData?.folderId;
      } catch {
        // Not JSON, try query params
      }
    }
    
    // Also check query params
    if (!folderId) {
      const urlObj = new URL(url);
      folderId = urlObj.searchParams.get("folderId") || undefined;
    }
    
    // Return test story when listing stories (yarny folder)
    if (folderId === "yarny-folder-id" || url.includes("folderId=yarny-folder-id")) {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          files: [
            {
              id: config.storyId,
              name: "Test Story",
              mimeType: "application/vnd.google-apps.folder",
              modifiedTime: "2024-01-01T00:00:00Z"
            }
          ],
          nextPageToken: undefined
        })
      });
      return;
    }

    // Return story folder contents
    if (folderId === config.storyId || url.includes(`folderId=${config.storyId}`)) {
      const files: Array<{
        id: string;
        name: string;
        mimeType: string;
        modifiedTime: string;
      }> = [
        {
          id: "project-json-id",
          name: "project.json",
          mimeType: "application/json",
          modifiedTime: "2024-01-01T00:00:00Z"
        },
        {
          id: "data-json-id",
          name: "data.json",
          mimeType: "application/json",
          modifiedTime: "2024-01-01T00:00:00Z"
        }
      ];

      // Add folder based on content type
      if (config.contentType === "note") {
        files.unshift({
          id: config.folderId,
          name: config.folderName,
          mimeType: "application/vnd.google-apps.folder",
          modifiedTime: "2024-01-01T00:00:00Z"
        });
      } else {
        // For snippets, add chapter folder
        files.unshift({
          id: config.folderId,
          name: config.folderName,
          mimeType: "application/vnd.google-apps.folder",
          modifiedTime: "2024-01-01T00:00:00Z"
        });
      }

      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          files,
          nextPageToken: undefined
        })
      });
      return;
    }

    // Return content when listing folder (People/Places/Things for notes, chapter for snippets)
    if (folderId === config.folderId || url.includes(`folderId=${config.folderId}`)) {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          files: [
            {
              id: config.contentId,
              name: config.contentType === "note" 
                ? `${config.contentName}.txt`
                : `${config.contentName}.doc`,
              mimeType: config.mimeType,
              modifiedTime: "2024-01-01T00:00:00Z"
            }
          ],
          nextPageToken: undefined
        })
      });
      return;
    }

    // Default: empty list
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        files: [],
        nextPageToken: undefined
      })
    });
  });

  // Mock reading file content
  await page.route("**/.netlify/functions/drive-read*", (route) => {
    const request = route.request();
    const method = request.method();
    let fileId: string | undefined;
    
    if (method === "POST") {
      try {
        const postData = request.postDataJSON();
        fileId = postData?.fileId;
      } catch {
        // Not JSON
      }
    }
    
    if (!fileId) {
      const url = request.url();
      const urlObj = new URL(url);
      fileId = urlObj.searchParams.get("fileId") || undefined;
    }
    
    // Return content
    if (fileId === config.contentId) {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: config.contentId,
          name: config.contentType === "note"
            ? `${config.contentName}.txt`
            : `${config.contentName}.doc`,
          content: config.initialContent,
          modifiedTime: "2024-01-01T00:00:00Z",
          mimeType: config.mimeType
        })
      });
      return;
    }

    // Return project.json content
    if (fileId === "project-json-id") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "project-json-id",
          name: "project.json",
          content: JSON.stringify({
            title: "Test Story",
            updatedAt: "2024-01-01T00:00:00Z"
          }),
          modifiedTime: "2024-01-01T00:00:00Z",
          mimeType: "application/json"
        })
      });
      return;
    }

    // Return data.json content
    if (fileId === "data-json-id") {
      const dataContent: any = {
        groups: {},
        snippets: {},
        notes: {}
      };

      if (config.contentType === "note") {
        const noteKind = config.folderName.toLowerCase().slice(0, -1); // "People" -> "person"
        dataContent.notes[config.contentId] = {
          id: config.contentId,
          kind: noteKind,
          name: config.contentName,
          driveFileId: config.contentId,
          updatedAt: "2024-01-01T00:00:00Z"
        };
      } else {
        // For snippets, we need both the group (chapter) and the snippet
        // The chapter's driveFolderId must match the folderId for saving to work
        dataContent.groups[config.folderId] = {
          id: config.folderId,
          title: config.folderName,
          snippetIds: [config.contentId],
          driveFolderId: config.folderId, // Chapter needs driveFolderId for saving - must match folderId
          order: 0,
          updatedAt: "2024-01-01T00:00:00Z"
        };
        dataContent.snippets[config.contentId] = {
          id: config.contentId,
          chapterId: config.folderId, // Link snippet to chapter
          groupId: config.folderId, // Also support groupId for compatibility
          order: 0,
          content: config.initialContent,
          driveFileId: config.contentId,
          updatedAt: "2024-01-01T00:00:00Z"
        };
      }

      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "data-json-id",
          name: "data.json",
          content: JSON.stringify(dataContent),
          modifiedTime: "2024-01-01T00:00:00Z",
          mimeType: "application/json"
        })
      });
      return;
    }

    // Default: empty content
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: fileId || "unknown",
        name: "unknown.txt",
        content: "",
        modifiedTime: new Date().toISOString(),
        mimeType: "text/plain"
      })
    });
  });

  // Mock write requests
  await page.route("**/.netlify/functions/drive-write*", async (route) => {
    const request = route.request();
    const postData = request.postDataJSON();

    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: postData?.fileId || config.contentId,
        name: config.contentName,
        modifiedTime: new Date().toISOString()
      })
    });
  });
}

/**
 * Navigates to the content editor page
 */
export async function navigateToContentEditor(
  page: Page,
  config: ContentTestConfig
): Promise<void> {
  await page.goto(config.routePath, { waitUntil: "networkidle", timeout: 30000 });
  
  // Wait a bit for any redirects
  await page.waitForTimeout(2000);
  
  // Debug: Log current URL to see if we're on the right page
  const currentUrl = page.url();
  console.log(`Current URL after navigation: ${currentUrl}`);
  
  // If we're redirected to /stories, the loader likely failed
  if (currentUrl.includes("/stories") && !currentUrl.includes(config.contentType === "note" ? "/people" : "/snippets")) {
    console.log("Page redirected to stories page - loader may have failed");
  }
}

/**
 * Waits for the editor to be ready and contains initial content
 */
export async function waitForEditorContent(
  page: Page,
  expectedContent: string,
  timeout = 10000
): Promise<void> {
  // Wait for story title to appear
  await expect(page.locator(`text=Test Story`).first()).toBeVisible({ timeout });

  // Wait for TipTap editor to initialize
  const editor = page.locator('[contenteditable="true"]').first();
  await expect(editor).toBeVisible({ timeout });

  // Wait for content to load into editor
  await expect(editor).toContainText(expectedContent, { timeout });
}

