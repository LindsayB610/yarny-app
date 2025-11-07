import { test, expect } from "@playwright/test";

test.describe("Stories Management", () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      Object.defineProperty(document, "cookie", {
        writable: true,
        value: "yarny_session=test-session"
      });
    });

    // Mock stories list
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
  });

  test("should display stories list", async ({ page }) => {
    await page.goto("/stories");

    await expect(page.getByText("Test Story")).toBeVisible();
  });

  test("should open new story modal", async ({ page }) => {
    await page.goto("/stories");

    await page.getByRole("button", { name: /new story/i }).click();

    await expect(page.getByText("Create New Story")).toBeVisible();
  });

  test("should create new story", async ({ page }) => {
    let createFolderCalled = false;

    await page.route("**/.netlify/functions/drive-create-folder", (route) => {
      createFolderCalled = true;
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "new-story-id",
          name: "My New Story",
          created: true
        })
      });
    });

    await page.goto("/stories");
    await page.getByRole("button", { name: /new story/i }).click();

    await page.getByLabel("Story Name").fill("My New Story");
    await page.getByRole("button", { name: /create story/i }).click();

    await expect(page).toHaveURL(/\/editor/);
    expect(createFolderCalled).toBe(true);
  });

  test("should delete story", async ({ page }) => {
    let deleteStoryCalled = false;

    await page.route("**/.netlify/functions/drive-delete-story", (route) => {
      deleteStoryCalled = true;
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Story deleted",
          deletedFromDrive: false
        })
      });
    });

    await page.goto("/stories");

    // Find and click delete button (assuming it's in a context menu or card)
    await page.getByRole("button", { name: /delete/i }).first().click();

    // Confirm deletion
    await page.getByPlaceholderText("DELETE").fill("DELETE");
    await page.getByRole("button", { name: /delete story/i }).click();

    await expect(page).toHaveURL(/\/stories/);
    expect(deleteStoryCalled).toBe(true);
  });
});

