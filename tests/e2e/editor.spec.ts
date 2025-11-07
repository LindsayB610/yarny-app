import { test, expect } from "@playwright/test";

test.describe("Editor Operations", () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      Object.defineProperty(document, "cookie", {
        writable: true,
        value: "yarny_session=test-session"
      });
    });

    // Mock story data
    await page.route("**/.netlify/functions/drive-read*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "snippet-1",
          name: "Chapter 1",
          content: "Initial content",
          modifiedTime: "2025-01-01T00:00:00.000Z",
          mimeType: "application/vnd.google-apps.document"
        })
      });
    });
  });

  test("should load editor with story", async ({ page }) => {
    await page.goto("/editor");

    // Editor should be visible
    await expect(page.locator('[contenteditable="true"]')).toBeVisible();
  });

  test("should edit and save content", async ({ page }) => {
    let writeCalled = false;
    let writeContent = "";

    await page.route("**/.netlify/functions/drive-write", (route) => {
      writeCalled = true;
      const request = route.request();
      request.postDataJSON().then((data) => {
        writeContent = data.content;
      });
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "snippet-1",
          name: "Chapter 1",
          modifiedTime: new Date().toISOString()
        })
      });
    });

    await page.goto("/editor");

    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    await editor.fill("New content");

    // Wait for auto-save (if implemented) or trigger save
    await page.waitForTimeout(1000);

    // Verify save was called
    expect(writeCalled).toBe(true);
  });

  test("should display goal meter", async ({ page }) => {
    await page.goto("/editor");

    // Goal meter should be visible
    await expect(page.getByText(/\d+\s*\/\s*\d+/)).toBeVisible();
  });

  test("should open color picker", async ({ page }) => {
    await page.goto("/editor");

    // Find and click color chip
    const colorChip = page.locator('[aria-label*="color"]').first();
    if (await colorChip.isVisible()) {
      await colorChip.click();
      await expect(page.getByText("Select")).toBeVisible();
    }
  });
});

