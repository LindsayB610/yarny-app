import { test, expect } from "@playwright/test";

test.describe("Visual Regression", () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      Object.defineProperty(document, "cookie", {
        writable: true,
        value: "yarny_session=test-session"
      });
    });

    // Mock story data
    await page.route("**/.netlify/functions/drive-list*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          files: [
            {
              id: "story-1",
              name: "Test Story",
              mimeType: "application/vnd.google-apps.folder",
              modifiedTime: "2025-01-01T00:00:00.000Z"
            }
          ]
        })
      });
    });

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

  test("should match stories page baseline", async ({ page }) => {
    await page.goto("/stories");
    await page.waitForLoadState("networkidle");

    // Take screenshot and compare
    await expect(page).toHaveScreenshot("stories-page.png", {
      maxDiffPixels: 100
    });
  });

  test("should match goal meter visual", async ({ page }) => {
    await page.goto("/editor");
    await page.waitForSelector('[contenteditable="true"]');

    // Find goal meter
    const goalMeter = page.locator('[role="progressbar"]').first();
    if (await goalMeter.isVisible()) {
      await expect(goalMeter).toHaveScreenshot("goal-meter.png", {
        maxDiffPixels: 50
      });
    }
  });

  test("should match modal layouts", async ({ page }) => {
    await page.goto("/stories");
    await page.getByRole("button", { name: /new story/i }).click();

    const modal = page.getByText("Create New Story");
    await expect(modal).toBeVisible();

    // Screenshot the modal
    await expect(page.locator('[role="dialog"]')).toHaveScreenshot(
      "new-story-modal.png",
      {
        maxDiffPixels: 100
      }
    );
  });

  test("should match color picker visual", async ({ page }) => {
    await page.goto("/editor");
    await page.waitForSelector('[contenteditable="true"]');

    // Open color picker if available
    const colorChip = page.locator('[aria-label*="color"]').first();
    if (await colorChip.isVisible()) {
      await colorChip.click();
      await page.waitForTimeout(100);

      const colorPicker = page.locator('[role="presentation"]').last();
      if (await colorPicker.isVisible()) {
        await expect(colorPicker).toHaveScreenshot("color-picker.png", {
          maxDiffPixels: 50
        });
      }
    }
  });

  test("should match loading states", async ({ page }) => {
    // Delay response to capture loading state
    await page.route("**/.netlify/functions/drive-list*", (route) => {
      setTimeout(() => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ files: [] })
        });
      }, 500);
    });

    await page.goto("/stories");

    // Try to capture loading state (may need adjustment based on actual loading UI)
    await page.waitForTimeout(100);
    await expect(page).toHaveScreenshot("loading-state.png", {
      maxDiffPixels: 100
    });
  });
});

