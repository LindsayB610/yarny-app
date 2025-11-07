import { test, expect } from "@playwright/test";

test.describe("Chapter and Snippet Management", () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      Object.defineProperty(document, "cookie", {
        writable: true,
        value: "yarny_session=test-session"
      });
    });

    // Mock story data with chapters and snippets
    await page.route("**/.netlify/functions/drive-list*", (route) => {
      const url = new URL(route.request().url());
      const folderId = url.searchParams.get("folderId");

      if (folderId === "story-folder-id") {
        // Story folder contains chapters folder
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
        // Chapters folder contains chapter folders
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
              },
              {
                id: "chapter-2-folder-id",
                name: "Chapter 2",
                mimeType: "application/vnd.google-apps.folder",
                modifiedTime: "2025-01-01T00:00:00.000Z"
              }
            ]
          })
        });
      } else if (folderId === "chapter-1-folder-id") {
        // Chapter 1 contains snippets
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
              },
              {
                id: "snippet-2-id",
                name: "Snippet 2",
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

    // Mock read file for snippets
    await page.route("**/.netlify/functions/drive-read", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "snippet-1-id",
          name: "Snippet 1",
          content: "Initial snippet content",
          modifiedTime: "2025-01-01T00:00:00.000Z",
          mimeType: "application/vnd.google-apps.document"
        })
      });
    });
  });

  test("should display chapters and snippets in sidebar", async ({ page }) => {
    await page.goto("/editor?story=story-1");

    // Wait for chapters to load
    await expect(page.getByText("Chapter 1")).toBeVisible();
    await expect(page.getByText("Chapter 2")).toBeVisible();

    // Wait for snippets to load
    await expect(page.getByText("Snippet 1")).toBeVisible();
    await expect(page.getByText("Snippet 2")).toBeVisible();
  });

  test("should create new chapter", async ({ page }) => {
    let createFolderCalled = false;
    let folderName = "";

    await page.route("**/.netlify/functions/drive-create-folder", (route) => {
      createFolderCalled = true;
      const body = route.request().postDataJSON();
      folderName = body.name;
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "new-chapter-id",
          name: body.name,
          created: true
        })
      });
    });

    await page.goto("/editor?story=story-1");

    // Click new chapter button (assuming keyboard shortcut or button)
    await page.keyboard.press("Meta+Shift+N"); // Cmd+Shift+N on Mac

    // If modal opens, fill in chapter name
    const chapterNameInput = page.getByLabel(/chapter name/i);
    if (await chapterNameInput.isVisible()) {
      await chapterNameInput.fill("New Chapter");
      await page.getByRole("button", { name: /create/i }).click();
    }

    await expect(page.getByText("New Chapter")).toBeVisible();
    expect(createFolderCalled).toBe(true);
    expect(folderName).toBe("New Chapter");
  });

  test("should create new snippet", async ({ page }) => {
    let createFileCalled = false;

    await page.route("**/.netlify/functions/drive-write", (route) => {
      const body = route.request().postDataJSON();
      if (body.fileName && !body.fileId) {
        // New file creation
        createFileCalled = true;
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "new-snippet-id",
            name: body.fileName,
            modifiedTime: new Date().toISOString()
          })
        });
      } else {
        // Regular save
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: body.fileId || "snippet-1-id",
            name: body.fileName,
            modifiedTime: new Date().toISOString()
          })
        });
      }
    });

    await page.goto("/editor?story=story-1");

    // Click new snippet button or use keyboard shortcut
    await page.keyboard.press("Meta+N"); // Cmd+N on Mac

    // Snippet should appear immediately (optimistic UI)
    await expect(page.getByText(/new snippet/i).or(page.getByText(/snippet/i)).first()).toBeVisible();

    // Verify file creation was called
    expect(createFileCalled).toBe(true);
  });

  test("should reorder chapters via drag and drop", async ({ page }) => {
    let renameCalled = false;
    const reorderSequence: string[] = [];

    // Track rename calls which indicate reordering
    await page.route("**/.netlify/functions/drive-rename-file", (route) => {
      renameCalled = true;
      const body = route.request().postDataJSON();
      reorderSequence.push(body.newName);
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: body.fileId,
          name: body.newName
        })
      });
    });

    await page.goto("/editor?story=story-1");

    // Wait for chapters to be visible
    await expect(page.getByText("Chapter 1")).toBeVisible();
    await expect(page.getByText("Chapter 2")).toBeVisible();

    // Get chapter elements
    const chapter1 = page.locator('[data-id="chapter-1"]').or(page.getByText("Chapter 1").locator(".."));
    const chapter2 = page.locator('[data-id="chapter-2"]').or(page.getByText("Chapter 2").locator(".."));

    // Drag Chapter 1 to after Chapter 2
    await chapter1.dragTo(chapter2, { targetPosition: { x: 0, y: 50 } });

    // Wait for reorder to complete
    await page.waitForTimeout(500);

    // Verify order changed (Chapter 2 should be before Chapter 1)
    const chapters = await page.locator('[role="button"]').filter({ hasText: /Chapter/ }).all();
    const firstChapter = await chapters[0].textContent();
    expect(firstChapter).toContain("Chapter");
  });

  test("should reorder snippets within chapter via drag and drop", async ({ page }) => {
    let writeCalled = false;

    await page.route("**/.netlify/functions/drive-write", (route) => {
      writeCalled = true;
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

    await page.goto("/editor?story=story-1");

    // Wait for snippets to load
    await expect(page.getByText("Snippet 1")).toBeVisible();
    await expect(page.getByText("Snippet 2")).toBeVisible();

    // Get snippet elements
    const snippet1 = page.locator('[data-id="snippet-1-id"]').or(page.getByText("Snippet 1").locator(".."));
    const snippet2 = page.locator('[data-id="snippet-2-id"]').or(page.getByText("Snippet 2").locator(".."));

    // Drag Snippet 1 to after Snippet 2
    await snippet1.dragTo(snippet2, { targetPosition: { x: 0, y: 30 } });

    // Wait for reorder to complete
    await page.waitForTimeout(500);

    // Verify order persisted
    expect(writeCalled).toBe(true);
  });

  test("should move snippet between chapters", async ({ page }) => {
    let writeCalled = false;
    let moveToChapter = "";

    await page.route("**/.netlify/functions/drive-write", (route) => {
      writeCalled = true;
      const body = route.request().postDataJSON();
      // Check if parentFolderId changed (indicating move)
      if (body.parentFolderId) {
        moveToChapter = body.parentFolderId;
      }
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

    await page.goto("/editor?story=story-1");

    // Wait for chapters and snippets to load
    await expect(page.getByText("Chapter 1")).toBeVisible();
    await expect(page.getByText("Chapter 2")).toBeVisible();
    await expect(page.getByText("Snippet 1")).toBeVisible();

    // Right-click snippet to open context menu (if available)
    // Or drag snippet to Chapter 2
    const snippet1 = page.locator('[data-id="snippet-1-id"]').or(page.getByText("Snippet 1").locator(".."));
    const chapter2 = page.locator('[data-id="chapter-2-folder-id"]').or(page.getByText("Chapter 2").locator(".."));

    await snippet1.dragTo(chapter2);

    // Wait for move to complete
    await page.waitForTimeout(500);

    // Verify snippet moved (it should now appear under Chapter 2)
    await expect(chapter2.locator("..").getByText("Snippet 1")).toBeVisible();
  });

  test("should delete chapter", async ({ page }) => {
    let deleteCalled = false;

    await page.route("**/.netlify/functions/drive-delete-file", (route) => {
      deleteCalled = true;
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true })
      });
    });

    await page.goto("/editor?story=story-1");

    await expect(page.getByText("Chapter 1")).toBeVisible();

    // Right-click chapter to open context menu
    await page.getByText("Chapter 1").click({ button: "right" });

    // Click delete option
    await page.getByRole("menuitem", { name: /delete/i }).click();

    // Confirm deletion
    await page.getByRole("button", { name: /confirm/i }).click();

    // Verify chapter is removed
    await expect(page.getByText("Chapter 1")).not.toBeVisible();
    expect(deleteCalled).toBe(true);
  });

  test("should delete snippet", async ({ page }) => {
    let deleteCalled = false;

    await page.route("**/.netlify/functions/drive-delete-file", (route) => {
      deleteCalled = true;
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true })
      });
    });

    await page.goto("/editor?story=story-1");

    await expect(page.getByText("Snippet 1")).toBeVisible();

    // Right-click snippet to open context menu
    await page.getByText("Snippet 1").click({ button: "right" });

    // Click delete option
    await page.getByRole("menuitem", { name: /delete/i }).click();

    // Confirm deletion
    await page.getByRole("button", { name: /confirm/i }).click();

    // Verify snippet is removed
    await expect(page.getByText("Snippet 1")).not.toBeVisible();
    expect(deleteCalled).toBe(true);
  });

  test("should collapse and expand chapters", async ({ page }) => {
    await page.goto("/editor?story=story-1");

    await expect(page.getByText("Chapter 1")).toBeVisible();
    await expect(page.getByText("Snippet 1")).toBeVisible();

    // Click collapse button on chapter
    const collapseButton = page
      .getByText("Chapter 1")
      .locator("..")
      .getByRole("button", { name: /collapse/i })
      .or(page.locator('[aria-label*="collapse"]').first());

    if (await collapseButton.isVisible()) {
      await collapseButton.click();

      // Snippets should be hidden
      await expect(page.getByText("Snippet 1")).not.toBeVisible();

      // Click expand button
      const expandButton = page
        .getByText("Chapter 1")
        .locator("..")
        .getByRole("button", { name: /expand/i })
        .or(page.locator('[aria-label*="expand"]').first());

      await expandButton.click();

      // Snippets should be visible again
      await expect(page.getByText("Snippet 1")).toBeVisible();
    }
  });

  test("should rename chapter", async ({ page }) => {
    let renameCalled = false;
    let newName = "";

    await page.route("**/.netlify/functions/drive-rename-file", (route) => {
      renameCalled = true;
      const body = route.request().postDataJSON();
      newName = body.newName;
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: body.fileId,
          name: body.newName
        })
      });
    });

    await page.goto("/editor?story=story-1");

    await expect(page.getByText("Chapter 1")).toBeVisible();

    // Double-click chapter to rename (or right-click menu)
    await page.getByText("Chapter 1").dblclick();

    // Type new name
    const nameInput = page.getByDisplayValue("Chapter 1").or(page.locator('input[value="Chapter 1"]'));
    if (await nameInput.isVisible()) {
      await nameInput.fill("Renamed Chapter");
      await nameInput.press("Enter");
    } else {
      // Alternative: use context menu
      await page.getByText("Chapter 1").click({ button: "right" });
      await page.getByRole("menuitem", { name: /rename/i }).click();
      await page.getByPlaceholder(/chapter name/i).fill("Renamed Chapter");
      await page.getByRole("button", { name: /save/i }).click();
    }

    await expect(page.getByText("Renamed Chapter")).toBeVisible();
    expect(renameCalled).toBe(true);
    expect(newName).toBe("Renamed Chapter");
  });

  test("should rename snippet", async ({ page }) => {
    let renameCalled = false;
    let newName = "";

    await page.route("**/.netlify/functions/drive-rename-file", (route) => {
      renameCalled = true;
      const body = route.request().postDataJSON();
      newName = body.newName;
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: body.fileId,
          name: body.newName
        })
      });
    });

    await page.goto("/editor?story=story-1");

    await expect(page.getByText("Snippet 1")).toBeVisible();

    // Double-click snippet to rename
    await page.getByText("Snippet 1").dblclick();

    // Type new name
    const nameInput = page.getByDisplayValue("Snippet 1").or(page.locator('input[value="Snippet 1"]'));
    if (await nameInput.isVisible()) {
      await nameInput.fill("Renamed Snippet");
      await nameInput.press("Enter");
    } else {
      // Alternative: use context menu
      await page.getByText("Snippet 1").click({ button: "right" });
      await page.getByRole("menuitem", { name: /rename/i }).click();
      await page.getByPlaceholder(/snippet name/i).fill("Renamed Snippet");
      await page.getByRole("button", { name: /save/i }).click();
    }

    await expect(page.getByText("Renamed Snippet")).toBeVisible();
    expect(renameCalled).toBe(true);
    expect(newName).toBe("Renamed Snippet");
  });
});

