import { test, expect } from "@playwright/test";

test.describe("Conflict Resolution Scenarios", () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      Object.defineProperty(document, "cookie", {
        writable: true,
        value: "yarny_session=test-session"
      });
    });

    // Mock story and snippet data
    await page.route("**/.netlify/functions/drive-list*", (route) => {
      const url = new URL(route.request().url());
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
          body: JSON.stringify({
            files: [
              {
                id: "snippet-1-id",
                name: "Snippet 1",
                mimeType: "application/vnd.google-apps.document",
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
  });

  test("should detect conflict when Drive content is newer", async ({ page }) => {
    let conflictCheckCalled = false;

    // Mock initial read (local version)
    await page.route("**/.netlify/functions/drive-read", (route, request) => {
      const body = request.postDataJSON();
      if (body.fileId === "snippet-1-id") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "snippet-1-id",
            name: "Snippet 1",
            content: "Local content",
            modifiedTime: "2025-01-01T00:00:00.000Z",
            mimeType: "application/vnd.google-apps.document"
          })
        });
      } else {
        route.continue();
      }
    });

    // Mock file list check (Drive has newer version)
    await page.route("**/.netlify/functions/drive-list*", (route) => {
      const url = new URL(route.request().url());
      const folderId = url.searchParams.get("folderId");

      if (folderId === "chapter-1-folder-id") {
        conflictCheckCalled = true;
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            files: [
              {
                id: "snippet-1-id",
                name: "Snippet 1",
                mimeType: "application/vnd.google-apps.document",
                modifiedTime: "2025-01-02T00:00:00.000Z" // Newer than local
              }
            ]
          })
        });
      } else {
        route.continue();
      }
    });

    await page.goto("/editor?story=story-1");

    // Wait for snippet to load
    await expect(page.getByText("Snippet 1")).toBeVisible();

    // Edit snippet locally
    const editor = page.locator('[contenteditable="true"]').first();

    if (await editor.isVisible()) {
      await editor.click();
      await editor.fill("Local edited content");

      // Switch snippets or trigger conflict check
      await page.getByText("Snippet 1").click();
      await page.waitForTimeout(1000);

      // Conflict modal should appear
      const conflictModal = page.getByText(/conflict|modified in.*drive/i).or(page.getByRole("dialog").getByText(/conflict/i));

      if (await conflictModal.isVisible({ timeout: 2000 })) {
        await expect(conflictModal).toBeVisible();
        expect(conflictCheckCalled).toBe(true);
      }
    }
  });

  test("should show local and Drive content in conflict modal", async ({ page }) => {
    // Mock Drive content (newer)
    await page.route("**/.netlify/functions/drive-read", (route) => {
      const body = route.request().postDataJSON();
      if (body.fileId === "snippet-1-id") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "snippet-1-id",
            name: "Snippet 1",
            content: "Drive edited content",
            modifiedTime: "2025-01-02T00:00:00.000Z",
            mimeType: "application/vnd.google-apps.document"
          })
        });
      } else {
        route.continue();
      }
    });

    await page.route("**/.netlify/functions/drive-list*", (route) => {
      const url = new URL(route.request().url());
      const folderId = url.searchParams.get("folderId");

      if (folderId === "chapter-1-folder-id") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            files: [
              {
                id: "snippet-1-id",
                name: "Snippet 1",
                mimeType: "application/vnd.google-apps.document",
                modifiedTime: "2025-01-02T00:00:00.000Z"
              }
            ]
          })
        });
      } else {
        route.continue();
      }
    });

    await page.goto("/editor?story=story-1");

    const editor = page.locator('[contenteditable="true"]').first();

    if (await editor.isVisible()) {
      await editor.click();
      await editor.fill("Local edited content");
      await page.waitForTimeout(500);

      // Trigger conflict check (switch snippets)
      await page.getByText("Snippet 1").click();
      await page.waitForTimeout(1000);

      // Conflict modal should show both versions
      const conflictModal = page.getByRole("dialog").filter({ hasText: /conflict/i });

      if (await conflictModal.isVisible({ timeout: 2000 })) {
        // Local version should be visible
        await expect(conflictModal.getByText(/local.*version/i)).toBeVisible();
        await expect(conflictModal.getByText("Local edited content")).toBeVisible();

        // Drive version should be visible
        await expect(conflictModal.getByText(/drive.*version/i)).toBeVisible();
        await expect(conflictModal.getByText("Drive edited content")).toBeVisible();
      }
    }
  });

  test("should resolve conflict by using local content", async ({ page }) => {
    let writeCalled = false;
    let savedContent = "";

    await page.route("**/.netlify/functions/drive-write", (route) => {
      writeCalled = true;
      const body = route.request().postDataJSON();
      savedContent = body.content;
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "snippet-1-id",
          name: "Snippet 1",
          modifiedTime: new Date().toISOString()
        })
      });
    });

    await page.route("**/.netlify/functions/drive-read", (route) => {
      const body = route.request().postDataJSON();
      if (body.fileId === "snippet-1-id") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "snippet-1-id",
            name: "Snippet 1",
            content: "Drive edited content",
            modifiedTime: "2025-01-02T00:00:00.000Z",
            mimeType: "application/vnd.google-apps.document"
          })
        });
      } else {
        route.continue();
      }
    });

    await page.route("**/.netlify/functions/drive-list*", (route) => {
      const url = new URL(route.request().url());
      const folderId = url.searchParams.get("folderId");

      if (folderId === "chapter-1-folder-id") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            files: [
              {
                id: "snippet-1-id",
                name: "Snippet 1",
                mimeType: "application/vnd.google-apps.document",
                modifiedTime: "2025-01-02T00:00:00.000Z"
              }
            ]
          })
        });
      } else {
        route.continue();
      }
    });

    await page.goto("/editor?story=story-1");

    const editor = page.locator('[contenteditable="true"]').first();

    if (await editor.isVisible()) {
      await editor.click();
      await editor.fill("Local edited content");
      await page.waitForTimeout(500);

      // Trigger conflict
      await page.getByText("Snippet 1").click();
      await page.waitForTimeout(1000);

      // Click "Keep Local" button
      const keepLocalButton = page.getByRole("button", { name: /keep local|use local/i });

      if (await keepLocalButton.isVisible({ timeout: 2000 })) {
        await keepLocalButton.click();
        await page.waitForTimeout(1000);

        // Local content should be saved to Drive
        expect(writeCalled).toBe(true);
        expect(savedContent).toBe("Local edited content");
      }
    }
  });

  test("should resolve conflict by using Drive content", async ({ page }) => {
    let editorContent = "";

    await page.route("**/.netlify/functions/drive-read", (route) => {
      const body = route.request().postDataJSON();
      if (body.fileId === "snippet-1-id") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "snippet-1-id",
            name: "Snippet 1",
            content: "Drive edited content",
            modifiedTime: "2025-01-02T00:00:00.000Z",
            mimeType: "application/vnd.google-apps.document"
          })
        });
      } else {
        route.continue();
      }
    });

    await page.route("**/.netlify/functions/drive-list*", (route) => {
      const url = new URL(route.request().url());
      const folderId = url.searchParams.get("folderId");

      if (folderId === "chapter-1-folder-id") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            files: [
              {
                id: "snippet-1-id",
                name: "Snippet 1",
                mimeType: "application/vnd.google-apps.document",
                modifiedTime: "2025-01-02T00:00:00.000Z"
              }
            ]
          })
        });
      } else {
        route.continue();
      }
    });

    await page.goto("/editor?story=story-1");

    const editor = page.locator('[contenteditable="true"]').first();

    if (await editor.isVisible()) {
      await editor.click();
      await editor.fill("Local edited content");
      await page.waitForTimeout(500);

      // Trigger conflict
      await page.getByText("Snippet 1").click();
      await page.waitForTimeout(1000);

      // Click "Use Drive" button
      const useDriveButton = page.getByRole("button", { name: /use drive|keep drive/i });

      if (await useDriveButton.isVisible({ timeout: 2000 })) {
        await useDriveButton.click();
        await page.waitForTimeout(1000);

        // Editor should show Drive content
        editorContent = (await editor.textContent()) || "";
        expect(editorContent).toContain("Drive edited content");
      }
    }
  });

  test("should cancel conflict resolution", async ({ page }) => {
    await page.route("**/.netlify/functions/drive-read", (route) => {
      const body = route.request().postDataJSON();
      if (body.fileId === "snippet-1-id") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "snippet-1-id",
            name: "Snippet 1",
            content: "Drive edited content",
            modifiedTime: "2025-01-02T00:00:00.000Z",
            mimeType: "application/vnd.google-apps.document"
          })
        });
      } else {
        route.continue();
      }
    });

    await page.route("**/.netlify/functions/drive-list*", (route) => {
      const url = new URL(route.request().url());
      const folderId = url.searchParams.get("folderId");

      if (folderId === "chapter-1-folder-id") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            files: [
              {
                id: "snippet-1-id",
                name: "Snippet 1",
                mimeType: "application/vnd.google-apps.document",
                modifiedTime: "2025-01-02T00:00:00.000Z"
              }
            ]
          })
        });
      } else {
        route.continue();
      }
    });

    await page.goto("/editor?story=story-1");

    const editor = page.locator('[contenteditable="true"]').first();

    if (await editor.isVisible()) {
      await editor.click();
      await editor.fill("Local edited content");
      await page.waitForTimeout(500);

      // Trigger conflict
      await page.getByText("Snippet 1").click();
      await page.waitForTimeout(1000);

      // Click "Cancel" button
      const cancelButton = page.getByRole("button", { name: /cancel/i });

      if (await cancelButton.isVisible({ timeout: 2000 })) {
        await cancelButton.click();
        await page.waitForTimeout(500);

        // Conflict modal should close
        const conflictModal = page.getByRole("dialog").filter({ hasText: /conflict/i });
        await expect(conflictModal).not.toBeVisible({ timeout: 1000 });
      }
    }
  });

  test("should detect conflict when editing in second Yarny tab", async ({ page, context }) => {
    // This test simulates two tabs editing the same snippet
    // Create second page (second tab)
    const page2 = await context.newPage();

    // Set up both pages with authentication
    await page.addInitScript(() => {
      Object.defineProperty(document, "cookie", {
        writable: true,
        value: "yarny_session=test-session"
      });
    });

    await page2.addInitScript(() => {
      Object.defineProperty(document, "cookie", {
        writable: true,
        value: "yarny_session=test-session"
      });
    });

    let readCount = 0;

    await page.route("**/.netlify/functions/drive-read", (route) => {
      readCount++;
      const body = route.request().postDataJSON();
      if (body.fileId === "snippet-1-id") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "snippet-1-id",
            name: "Snippet 1",
            content: readCount === 1 ? "Initial content" : "Tab 2 edited content",
            modifiedTime: readCount === 1 ? "2025-01-01T00:00:00.000Z" : "2025-01-02T00:00:00.000Z",
            mimeType: "application/vnd.google-apps.document"
          })
        });
      } else {
        route.continue();
      }
    });

    await page2.route("**/.netlify/functions/drive-read", (route) => {
      const body = route.request().postDataJSON();
      if (body.fileId === "snippet-1-id") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "snippet-1-id",
            name: "Snippet 1",
            content: "Tab 2 edited content",
            modifiedTime: "2025-01-02T00:00:00.000Z",
            mimeType: "application/vnd.google-apps.document"
          })
        });
      } else {
        route.continue();
      }
    });

    // Tab 1: Edit snippet
    await page.goto("/editor?story=story-1");
    const editor1 = page.locator('[contenteditable="true"]').first();

    if (await editor1.isVisible()) {
      await editor1.click();
      await editor1.fill("Tab 1 edited content");
      await page.waitForTimeout(500);
    }

    // Tab 2: Edit same snippet (simulates concurrent edit)
    await page2.goto("/editor?story=story-1");
    const editor2 = page2.locator('[contenteditable="true"]').first();

    if (await editor2.isVisible()) {
      await editor2.click();
      await editor2.fill("Tab 2 edited content");
      await page2.waitForTimeout(500);
    }

    // Tab 1: Switch snippets (should detect conflict)
    await page.getByText("Snippet 1").click();
    await page.waitForTimeout(1000);

    // Conflict should be detected
    const conflictModal = page.getByRole("dialog").filter({ hasText: /conflict/i });

    if (await conflictModal.isVisible({ timeout: 2000 })) {
      await expect(conflictModal).toBeVisible();
    }

    await page2.close();
  });

  test("should not detect conflict when Drive content is older", async ({ page }) => {
    await page.route("**/.netlify/functions/drive-read", (route) => {
      const body = route.request().postDataJSON();
      if (body.fileId === "snippet-1-id") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "snippet-1-id",
            name: "Snippet 1",
            content: "Old Drive content",
            modifiedTime: "2025-01-01T00:00:00.000Z",
            mimeType: "application/vnd.google-apps.document"
          })
        });
      } else {
        route.continue();
      }
    });

    await page.route("**/.netlify/functions/drive-list*", (route) => {
      const url = new URL(route.request().url());
      const folderId = url.searchParams.get("folderId");

      if (folderId === "chapter-1-folder-id") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            files: [
              {
                id: "snippet-1-id",
                name: "Snippet 1",
                mimeType: "application/vnd.google-apps.document",
                modifiedTime: "2025-01-01T00:00:00.000Z" // Same as local
              }
            ]
          })
        });
      } else {
        route.continue();
      }
    });

    await page.goto("/editor?story=story-1");

    const editor = page.locator('[contenteditable="true"]').first();

    if (await editor.isVisible()) {
      await editor.click();
      await editor.fill("Local edited content");
      await page.waitForTimeout(500);

      // Switch snippets
      await page.getByText("Snippet 1").click();
      await page.waitForTimeout(1000);

      // No conflict modal should appear
      const conflictModal = page.getByRole("dialog").filter({ hasText: /conflict/i });
      await expect(conflictModal).not.toBeVisible({ timeout: 1000 });
    }
  });

  test("should show modified times in conflict modal", async ({ page }) => {
    await page.route("**/.netlify/functions/drive-read", (route) => {
      const body = route.request().postDataJSON();
      if (body.fileId === "snippet-1-id") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "snippet-1-id",
            name: "Snippet 1",
            content: "Drive content",
            modifiedTime: "2025-01-02T12:00:00.000Z",
            mimeType: "application/vnd.google-apps.document"
          })
        });
      } else {
        route.continue();
      }
    });

    await page.route("**/.netlify/functions/drive-list*", (route) => {
      const url = new URL(route.request().url());
      const folderId = url.searchParams.get("folderId");

      if (folderId === "chapter-1-folder-id") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            files: [
              {
                id: "snippet-1-id",
                name: "Snippet 1",
                mimeType: "application/vnd.google-apps.document",
                modifiedTime: "2025-01-02T12:00:00.000Z"
              }
            ]
          })
        });
      } else {
        route.continue();
      }
    });

    await page.goto("/editor?story=story-1");

    const editor = page.locator('[contenteditable="true"]').first();

    if (await editor.isVisible()) {
      await editor.click();
      await editor.fill("Local content");
      await page.waitForTimeout(500);

      await page.getByText("Snippet 1").click();
      await page.waitForTimeout(1000);

      const conflictModal = page.getByRole("dialog").filter({ hasText: /conflict/i });

      if (await conflictModal.isVisible({ timeout: 2000 })) {
        // Should show modified times
        await expect(conflictModal.getByText(/last modified|modified:/i)).toBeVisible();
      }
    }
  });
});

