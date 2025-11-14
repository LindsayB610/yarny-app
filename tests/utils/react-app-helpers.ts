import type { Page } from "@playwright/test";

/**
 * Helper utilities for testing the React app
 */

export interface MockStoryData {
  projectId: string;
  storyId: string;
  storyTitle: string;
  chapters: Array<{
    id: string;
    title: string;
    color?: string;
    snippets: Array<{
      id: string;
      title: string;
      content: string;
      modifiedTime?: string;
    }>;
  }>;
}

/**
 * Sets up API mocks for React app testing
 * Mocks the normalized payload structure that the React app expects
 */
export async function setupReactAppMocks(
  page: Page,
  mockData: MockStoryData
): Promise<void> {
  // Mock authentication
  await page.addInitScript(() => {
    Object.defineProperty(document, "cookie", {
      writable: true,
      value: "yarny_session=test-session"
    });
    try {
      localStorage.setItem("yarny_auth", "test-token");
      localStorage.setItem(
        "yarny_user",
        JSON.stringify({
          email: "test@yarny.app",
          name: "Test User",
          token: "test-token"
        })
      );
    } catch (error) {
      console.warn("Failed to seed auth storage", error);
    }
  });

  // Mock getOrCreateYarnyStories
  await page.route("**/.netlify/functions/drive-get-or-create-yarny-stories", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "yarny-stories-folder-id",
        name: "Yarny Stories",
        created: false
      })
    });
  });

  // Helper function to create normalized payload for a story
  const createStoryPayload = () => ({
    projects: [{
      id: mockData.projectId,
      name: "Test Project",
      driveFolderId: "project-folder-id",
      storyIds: [mockData.storyId],
      updatedAt: "2025-01-01T00:00:00.000Z"
    }],
    stories: [{
      id: mockData.storyId,
      projectId: mockData.projectId,
      title: mockData.storyTitle,
      driveFileId: `${mockData.storyId}-file`,
      chapterIds: mockData.chapters.map((c) => c.id),
      updatedAt: "2025-01-01T00:00:00.000Z"
    }],
    chapters: mockData.chapters.map((chapter, idx) => ({
      id: chapter.id,
      storyId: mockData.storyId,
      title: chapter.title,
      color: chapter.color,
      order: idx,
      snippetIds: chapter.snippets.map((s) => s.id),
      driveFolderId: `${chapter.id}-folder`,
      updatedAt: "2025-01-01T00:00:00.000Z"
    })),
    snippets: mockData.chapters.flatMap((chapter) =>
      chapter.snippets.map((snippet, snippetIdx) => ({
        id: snippet.id,
        storyId: mockData.storyId,
        chapterId: chapter.id,
        order: snippetIdx,
        content: snippet.content,
        driveRevisionId: snippet.modifiedTime,
        driveFileId: `${snippet.id}-file`,
        updatedAt: snippet.modifiedTime || "2025-01-01T00:00:00.000Z"
      }))
    )
  });

  // Mock listProjects (GET /drive-list) - returns normalized payload
  await page.route("**/.netlify/functions/drive-list*", (route) => {
    const url = new URL(route.request().url());
    
    // Check if this is a storyId query (for getStory)
    const storyId = url.searchParams.get("storyId");
    if (storyId && storyId === mockData.storyId) {
      // This is a getStory call - return normalized payload with full story data
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(createStoryPayload())
      });
      return;
    }

    // Default: return projects list (normalized payload without full story data)
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(createStoryPayload())
    });
  });

  // Mock drive-read for individual file reads (used by classic app structure)
  // The React app primarily uses drive-list with storyId, but we keep this for compatibility
  await page.route("**/.netlify/functions/drive-read*", (route) => {
    const request = route.request();
    const method = request.method();

    if (method === "GET") {
      const url = new URL(request.url());
      const storyId = url.searchParams.get("storyId");
      if (storyId && storyId === mockData.storyId) {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(createStoryPayload())
        });
        return;
      }
    }

    if (method === "POST") {
      // POST body contains fileId
      const body = request.postDataJSON();
      const fileId = body.fileId;
      
      // Find snippet by fileId
      for (const chapter of mockData.chapters) {
        const snippet = chapter.snippets.find((s) => s.id === fileId);
        if (snippet) {
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              id: snippet.id,
              name: snippet.title,
              content: snippet.content,
              modifiedTime: snippet.modifiedTime || "2025-01-01T00:00:00.000Z",
              mimeType: "application/vnd.google-apps.document"
            })
          });
          return;
        }
      }
    }
    
    route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ error: "Not Found" })
    });
  });

  // Mock drive-write
  await page.route("**/.netlify/functions/drive-write", (route) => {
    const body = route.request().postDataJSON();
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: body.storyId || body.fileId || "new-file-id",
        name: body.fileName || "New File",
        modifiedTime: new Date().toISOString()
      })
    });
  });
}

/**
 * Navigates to React app editor and selects a story
 */
export async function navigateToReactEditor(
  page: Page,
  storyId: string,
  storyName: string
): Promise<void> {
  // Navigate to story editor - loader will redirect to first snippet
  await page.goto(`/stories/${storyId}/snippets`);
  
  // Wait for React app to load and redirect to first snippet
  await page.waitForLoadState("networkidle");
  
  // Wait for story to be selected (look for story title or editor content)
  // The editor should show the story once it's loaded
  await page.waitForTimeout(1000); // Give React time to hydrate and load story
}

/**
 * Waits for a story to be loaded in the React editor
 */
export async function waitForStoryLoad(
  page: Page,
  storyTitle: string
): Promise<void> {
  // Wait for story title to appear (Material UI Typography)
  await page.waitForSelector(`text=${storyTitle}`, { timeout: 10000 });
}

/**
 * Gets the editor contenteditable element in React app
 */
export async function getReactEditor(page: Page) {
  // React app uses TipTap editor with contenteditable
  return page.locator('[contenteditable="true"]').first();
}

/**
 * Clicks on a story card in the stories list
 */
export async function clickStoryCard(page: Page, storyTitle: string): Promise<void> {
  await page.goto("/stories");
  await page.waitForLoadState("networkidle");
  
  // Find and click the story card
  const storyCard = page.getByText(storyTitle).first();
  await storyCard.click();
  
  // Wait for navigation to story editor (will redirect to first snippet)
  await page.waitForURL("**/stories/*/snippets/*", { timeout: 10000 });
}

