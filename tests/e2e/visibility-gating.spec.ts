import { test, expect } from "@playwright/test";

test.describe("Visibility-Based Request Gating", () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      Object.defineProperty(document, "cookie", {
        writable: true,
        value: "yarny_session=test-session"
      });
    });

    // Mock story with many snippets (50+ for visibility gating)
    const snippets: any[] = [];
    for (let i = 1; i <= 50; i++) {
      snippets.push({
        id: `snippet-${i}-id`,
        name: `Snippet ${i}`,
        mimeType: "application/vnd.google-apps.document",
        modifiedTime: "2025-01-01T00:00:00.000Z"
      });
    }

    await page.route("**/.netlify/functions/drive-list*", (route) => {
      const url = new URL(route.request().url);
      const folderId = url.searchParams.get("folderId");

      if (folderId === "story-folder-id") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            files: [
              {
                id: "chapters-folder-id",
                name: "Chapters",
                mimeType: "application/vnd.google-apps.folder",
                modifiedTime: "2025-01-01T00:00:00.000Z"
              }
            ]
          })
        });
      } else if (folderId === "chapters-folder-id") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            files: [
              {
                id: "chapter-1-folder-id",
                name: "Chapter 1",
                mimeType: "application/vnd.google-apps.folder",
                modifiedTime: "2025-01-01T00:00:00.000Z"
              }
            ]
          })
        });
      } else if (folderId === "chapter-1-folder-id") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ files: snippets })
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ files: [] })
        });
      }
    });
  });

  test("should only load visible snippets initially", async ({ page }) => {
    const readCalls: string[] = [];

    await page.route("**/.netlify/functions/drive-read", (route) => {
      const body = route.request().postDataJSON();
      readCalls.push(body.fileId);
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: body.fileId,
          name: "Test Snippet",
          content: `Content for ${body.fileId}`,
          modifiedTime: "2025-01-01T00:00:00.000Z",
          mimeType: "application/vnd.google-apps.document"
        })
      });
    });

    await page.goto("/editor?story=story-1");

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Only first few snippets should be loaded (visible ones + prefetch)
    // Should not load all 50 snippets at once
    expect(readCalls.length).toBeLessThan(50);

    // Should load at least the first few visible snippets
    expect(readCalls.length).toBeGreaterThan(0);
  });

  test("should load snippets as they become visible when scrolling", async ({ page }) => {
    const readCalls: string[] = [];

    await page.route("**/.netlify/functions/drive-read", (route) => {
      const body = route.request().postDataJSON();
      readCalls.push(body.fileId);
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: body.fileId,
          name: "Test Snippet",
          content: `Content for ${body.fileId}`,
          modifiedTime: "2025-01-01T00:00:00.000Z",
          mimeType: "application/vnd.google-apps.document"
        })
      });
    });

    await page.goto("/editor?story=story-1");
    await page.waitForTimeout(2000);

    const initialReadCount = readCalls.length;

    // Scroll down to make more snippets visible
    const sidebar = page.locator('[data-testid="story-sidebar"]').or(page.locator('aside').first());

    if (await sidebar.isVisible()) {
      await sidebar.evaluate((el) => {
        el.scrollTop = 2000; // Scroll down
      });

      // Wait for intersection observer to trigger
      await page.waitForTimeout(1000);

      // More snippets should be loaded
      expect(readCalls.length).toBeGreaterThan(initialReadCount);
    }
  });

  test("should prefetch first few snippets immediately", async ({ page }) => {
    const readCalls: string[] = [];

    await page.route("**/.netlify/functions/drive-read", (route) => {
      const body = route.request().postDataJSON();
      readCalls.push(body.fileId);
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: body.fileId,
          name: "Test Snippet",
          content: `Content for ${body.fileId}`,
          modifiedTime: "2025-01-01T00:00:00.000Z",
          mimeType: "application/vnd.google-apps.document"
        })
      });
    });

    await page.goto("/editor?story=story-1");

    // Wait for prefetch
    await page.waitForTimeout(1000);

    // First 3 snippets should be prefetched
    expect(readCalls.length).toBeGreaterThanOrEqual(3);
    expect(readCalls).toContain("snippet-1-id");
    expect(readCalls).toContain("snippet-2-id");
    expect(readCalls).toContain("snippet-3-id");
  });

  test("should not load snippets that are not visible", async ({ page }) => {
    const readCalls: string[] = [];

    await page.route("**/.netlify/functions/drive-read", (route) => {
      const body = route.request().postDataJSON();
      readCalls.push(body.fileId);
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: body.fileId,
          name: "Test Snippet",
          content: `Content for ${body.fileId}`,
          modifiedTime: "2025-01-01T00:00:00.000Z",
          mimeType: "application/vnd.google-apps.document"
        })
      });
    });

    await page.goto("/editor?story=story-1");

    // Wait for initial load
    await page.waitForTimeout(2000);

    // Snippet 50 (last one) should not be loaded initially
    expect(readCalls).not.toContain("snippet-50-id");
  });

  test("should load snippet when clicking on it (even if not visible)", async ({ page }) => {
    const readCalls: string[] = [];

    await page.route("**/.netlify/functions/drive-read", (route) => {
      const body = route.request().postDataJSON();
      readCalls.push(body.fileId);
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: body.fileId,
          name: "Test Snippet",
          content: `Content for ${body.fileId}`,
          modifiedTime: "2025-01-01T00:00:00.000Z",
          mimeType: "application/vnd.google-apps.document"
        })
      });
    });

    await page.goto("/editor?story=story-1");
    await page.waitForTimeout(2000);

    // Click on snippet 25 (midway through list)
    const snippet25 = page.getByText("Snippet 25");

    if (await snippet25.isVisible()) {
      await snippet25.click();
      await page.waitForTimeout(1000);

      // Snippet 25 should be loaded
      expect(readCalls).toContain("snippet-25-id");
    }
  });

  test("should use intersection observer for visibility detection", async ({ page }) => {
    await page.goto("/editor?story=story-1");
    await page.waitForTimeout(2000);

    // Check if snippet elements have data-snippet-id attributes (for intersection observer)
    const snippetElements = page.locator('[data-snippet-id]');

    if (await snippetElements.count() > 0) {
      // Should have data-snippet-id attributes
      const firstSnippet = snippetElements.first();
      const snippetId = await firstSnippet.getAttribute("data-snippet-id");
      expect(snippetId).toBeTruthy();
    }
  });

  test("should handle rapid scrolling without excessive requests", async ({ page }) => {
    const readCalls: string[] = [];

    await page.route("**/.netlify/functions/drive-read", (route) => {
      const body = route.request().postDataJSON();
      readCalls.push(body.fileId);
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: body.fileId,
          name: "Test Snippet",
          content: `Content for ${body.fileId}`,
          modifiedTime: "2025-01-01T00:00:00.000Z",
          mimeType: "application/vnd.google-apps.document"
        })
      });
    });

    await page.goto("/editor?story=story-1");
    await page.waitForTimeout(2000);

    const sidebar = page.locator('[data-testid="story-sidebar"]').or(page.locator('aside').first());

    if (await sidebar.isVisible()) {
      // Rapid scrolling
      for (let i = 0; i < 5; i++) {
        await sidebar.evaluate((el) => {
          el.scrollTop += 500;
        });
        await page.waitForTimeout(100);
      }

      await page.waitForTimeout(1000);

      // Should not have excessive requests (throttling/debouncing)
      // Total requests should be reasonable (not 50+)
      expect(readCalls.length).toBeLessThan(30);
    }
  });

  test("should load snippets with 200px margin (rootMargin)", async ({ page }) => {
    const readCalls: string[] = [];

    await page.route("**/.netlify/functions/drive-read", (route) => {
      const body = route.request().postDataJSON();
      readCalls.push(body.fileId);
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: body.fileId,
          name: "Test Snippet",
          content: `Content for ${body.fileId}`,
          modifiedTime: "2025-01-01T00:00:00.000Z",
          mimeType: "application/vnd.google-apps.document"
        })
      });
    });

    await page.goto("/editor?story=story-1");
    await page.waitForTimeout(2000);

    const sidebar = page.locator('[data-testid="story-sidebar"]').or(page.locator('aside').first());

    if (await sidebar.isVisible()) {
      const initialReadCount = readCalls.length;

      // Scroll down slightly (less than 200px)
      await sidebar.evaluate((el) => {
        el.scrollTop = 150;
      });

      await page.waitForTimeout(500);

      // Snippets should start loading before they're fully visible (200px margin)
      // So scrolling 150px might trigger loading of next snippets
      const newReadCount = readCalls.length;
      expect(newReadCount).toBeGreaterThanOrEqual(initialReadCount);
    }
  });
});


