import { test, expect } from "@playwright/test";

test.describe("Performance Budgets", () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      Object.defineProperty(document, "cookie", {
        writable: true,
        value: "yarny_session=test-session"
      });
    });

    // Mock minimal story data for fast loading
    await page.route("**/.netlify/functions/drive-read*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "snippet-1",
          name: "Chapter 1",
          content: "Test content",
          modifiedTime: "2025-01-01T00:00:00.000Z",
          mimeType: "application/vnd.google-apps.document"
        })
      });
    });
  });

  test("time to first keystroke after editor mount should be ≤ 800ms", async ({ page }) => {
    await page.goto("/editor");

    const startTime = Date.now();

    // Wait for editor to be ready
    await page.waitForSelector('[contenteditable="true"]', { state: "visible" });

    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    await editor.type("a");

    const timeToFirstKeystroke = Date.now() - startTime;

    expect(timeToFirstKeystroke).toBeLessThanOrEqual(800);
  });

  test("time to first edit (hot path) should be ≤ 300ms", async ({ page }) => {
    // First load to warm up
    await page.goto("/editor");
    await page.waitForSelector('[contenteditable="true"]');

    // Second load (hot path)
    const startTime = Date.now();
    await page.reload();
    await page.waitForSelector('[contenteditable="true"]');

    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    await editor.type("a");

    const timeToFirstEdit = Date.now() - startTime;

    expect(timeToFirstEdit).toBeLessThanOrEqual(300);
  });

  test("snippet switch latency (hot) should be ≤ 300ms", async ({ page }) => {
    await page.goto("/editor");
    await page.waitForSelector('[contenteditable="true"]');

    // Mock multiple snippets
    await page.route("**/.netlify/functions/drive-read*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "snippet-2",
          name: "Chapter 2",
          content: "Chapter 2 content",
          modifiedTime: "2025-01-01T00:00:00.000Z",
          mimeType: "application/vnd.google-apps.document"
        })
      });
    });

    // Click on second snippet (assuming it's in a sidebar)
    const startTime = Date.now();
    const snippetButton = page.getByText("Chapter 2").first();
    if (await snippetButton.isVisible()) {
      await snippetButton.click();
      await page.waitForSelector('[contenteditable="true"]');

      const switchLatency = Date.now() - startTime;
      expect(switchLatency).toBeLessThanOrEqual(300);
    }
  });

  test("should maintain < 16ms frame time while typing", async ({ page }) => {
    await page.goto("/editor");
    await page.waitForSelector('[contenteditable="true"]');

    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();

    // Monitor frame times
    const frameTimes: number[] = [];
    await page.evaluate(() => {
      let lastFrameTime = performance.now();
      const measureFrame = () => {
        const currentTime = performance.now();
        frameTimes.push(currentTime - lastFrameTime);
        lastFrameTime = currentTime;
        if (frameTimes.length < 10) {
          requestAnimationFrame(measureFrame);
        }
      };
      requestAnimationFrame(measureFrame);
    });

    // Type some characters
    await editor.type("test content for frame timing");

    // Wait a bit for frames to be measured
    await page.waitForTimeout(200);

    // Check that most frames are under 16ms (60fps)
    const avgFrameTime =
      frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
    expect(avgFrameTime).toBeLessThan(16);
  });
});

