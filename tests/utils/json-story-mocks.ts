import type { Page } from "@playwright/test";

/**
 * Helper function to mock a story with JSON-based structure (project.json and data.json)
 * This matches what the React app expects
 */
export async function mockJsonBasedStory(
  page: Page,
  storyId: string,
  storyName: string,
  chapters: Array<{
    id: string;
    title: string;
    color?: string;
    snippets: Array<{
      id: string;
      content: string;
    }>;
  }>
): Promise<void> {
  // Mock drive-list to return project.json and data.json when listing the story folder
  await page.route("**/.netlify/functions/drive-list*", (route) => {
    const url = new URL(route.request().url());
    const folderId = url.searchParams.get("folderId");

    if (folderId === storyId) {
      // Story folder contains project.json and data.json
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          files: [
            {
              id: `${storyId}-project-json`,
              name: "project.json",
              mimeType: "application/json",
              modifiedTime: "2025-01-01T00:00:00.000Z"
            },
            {
              id: `${storyId}-data-json`,
              name: "data.json",
              mimeType: "application/json",
              modifiedTime: "2025-01-01T00:00:00.000Z"
            }
          ]
        })
      });
    } else if (folderId === "yarny-folder-id") {
      // Yarny folder contains story folders
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          files: [
            {
              id: storyId,
              name: storyName,
              mimeType: "application/vnd.google-apps.folder",
              modifiedTime: "2025-01-01T00:00:00.000Z"
            }
          ]
        })
      });
    } else {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ files: [] })
      });
    }
  });

  // Mock drive-read to return JSON content
  await page.route("**/.netlify/functions/drive-read", (route) => {
    const body = route.request().postDataJSON();
    const fileId = body.fileId;

    if (fileId === `${storyId}-project-json`) {
      const groupOrder = chapters.map((c) => c.id);
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: fileId,
          name: "project.json",
          content: JSON.stringify({
            name: storyName,
            groupOrder
          }),
          modifiedTime: "2025-01-01T00:00:00.000Z",
          mimeType: "application/json"
        })
      });
    } else if (fileId === `${storyId}-data-json`) {
      const groups: Record<string, any> = {};
      const snippets: Record<string, any> = {};

      chapters.forEach((chapter, chapterIdx) => {
        groups[chapter.id] = {
          id: chapter.id,
          title: chapter.title,
          snippetIds: chapter.snippets.map((s) => s.id),
          order: chapterIdx,
          ...(chapter.color && { color: chapter.color })
        };

        chapter.snippets.forEach((snippet, snippetIdx) => {
          snippets[snippet.id] = {
            id: snippet.id,
            chapterId: chapter.id,
            content: snippet.content,
            order: snippetIdx,
            updatedAt: "2025-01-01T00:00:00.000Z"
          };
        });
      });

      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: fileId,
          name: "data.json",
          content: JSON.stringify({
            groups,
            snippets
          }),
          modifiedTime: "2025-01-01T00:00:00.000Z",
          mimeType: "application/json"
        })
      });
    } else {
      // Default snippet content (for individual snippet reads)
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: fileId,
          name: "Snippet",
          content: "Initial snippet content",
          modifiedTime: "2025-01-01T00:00:00.000Z",
          mimeType: "application/vnd.google-apps.document"
        })
      });
    }
  });
}


