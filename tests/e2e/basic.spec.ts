import { test, expect } from "@playwright/test";

/**
 * Basic smoke tests for the React app
 * These tests verify the app loads and basic functionality works
 * 
 * NOTE: Start dev server manually before running: npm run dev
 */
test.describe("Basic App Functionality", () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      Object.defineProperty(document, "cookie", {
        writable: true,
        value: "yarny_session=test-session"
      });
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

    // Mock empty stories list
    await page.route("**/.netlify/functions/drive-list*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          files: [],
          nextPageToken: undefined
        })
      });
    });
  });

  test("should load stories page", async ({ page }) => {
    await page.goto("/stories", { waitUntil: "domcontentloaded", timeout: 5000 });
    await expect(page).toHaveURL(/\/stories/, { timeout: 5000 });
  });

  test("should load editor page", async ({ page }) => {
    await page.goto("/editor", { waitUntil: "domcontentloaded", timeout: 5000 });
    await expect(page).toHaveURL(/\/editor/, { timeout: 5000 });
  });
});
