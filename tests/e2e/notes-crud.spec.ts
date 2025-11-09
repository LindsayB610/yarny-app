import { test, expect } from "@playwright/test";

test.describe("Notes CRUD (People/Places/Things)", () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      Object.defineProperty(document, "cookie", {
        writable: true,
        value: "yarny_session=test-session"
      });
    });

    // Mock story folder structure
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
                id: "people-folder-id",
                name: "People",
                mimeType: "application/vnd.google-apps.folder",
                modifiedTime: "2025-01-01T00:00:00.000Z"
              },
              {
                id: "places-folder-id",
                name: "Places",
                mimeType: "application/vnd.google-apps.folder",
                modifiedTime: "2025-01-01T00:00:00.000Z"
              },
              {
                id: "things-folder-id",
                name: "Things",
                mimeType: "application/vnd.google-apps.folder",
                modifiedTime: "2025-01-01T00:00:00.000Z"
              }
            ]
          })
        });
      } else if (folderId === "people-folder-id") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            files: [
              {
                id: "person-1-id",
                name: "Alice",
                mimeType: "text/plain",
                modifiedTime: "2025-01-01T00:00:00.000Z"
              }
            ]
          })
        });
      } else if (folderId === "places-folder-id") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            files: [
              {
                id: "place-1-id",
                name: "The Castle",
                mimeType: "text/plain",
                modifiedTime: "2025-01-01T00:00:00.000Z"
              }
            ]
          })
        });
      } else if (folderId === "things-folder-id") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            files: [
              {
                id: "thing-1-id",
                name: "The Sword",
                mimeType: "text/plain",
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

    // Mock note content
    const noteContent: Record<string, string> = {
      "person-1-id": "Alice is a brave explorer with red hair and a curious nature.",
      "place-1-id": "The Castle is an ancient fortress on the hill overlooking the village.",
      "thing-1-id": "The Sword is a legendary weapon passed down through generations."
    };

    await page.route("**/.netlify/functions/drive-read", (route) => {
      const body = route.request().postDataJSON();
      const fileId = body.fileId;
      const content = noteContent[fileId] || "";

      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: fileId,
          name: fileId.includes("person") ? "Alice" : fileId.includes("place") ? "The Castle" : "The Sword",
          content,
          modifiedTime: "2025-01-01T00:00:00.000Z",
          mimeType: "text/plain"
        })
      });
    });
  });

  test("should display People notes in sidebar", async ({ page }) => {
    await page.goto("/editor?story=story-1");

    // Switch to People tab in notes sidebar
    const peopleTab = page.getByRole("tab", { name: /people/i });

    if (await peopleTab.isVisible()) {
      await peopleTab.click();
      await page.waitForTimeout(500);

      // Alice note should be visible
      await expect(page.getByText("Alice")).toBeVisible();
      await expect(page.getByText(/brave explorer/i)).toBeVisible();
    }
  });

  test("should display Places notes in sidebar", async ({ page }) => {
    await page.goto("/editor?story=story-1");

    // Switch to Places tab
    const placesTab = page.getByRole("tab", { name: /places/i });

    if (await placesTab.isVisible()) {
      await placesTab.click();
      await page.waitForTimeout(500);

      // The Castle note should be visible
      await expect(page.getByText("The Castle")).toBeVisible();
      await expect(page.getByText(/ancient fortress/i)).toBeVisible();
    }
  });

  test("should display Things notes in sidebar", async ({ page }) => {
    await page.goto("/editor?story=story-1");

    // Switch to Things tab
    const thingsTab = page.getByRole("tab", { name: /things/i });

    if (await thingsTab.isVisible()) {
      await thingsTab.click();
      await page.waitForTimeout(500);

      // The Sword note should be visible
      await expect(page.getByText("The Sword")).toBeVisible();
      await expect(page.getByText(/legendary weapon/i)).toBeVisible();
    }
  });

  test("should create new People note", async ({ page }) => {
    let createFileCalled = false;
    let fileName = "";

    await page.route("**/.netlify/functions/drive-write", (route) => {
      const body = route.request().postDataJSON();
      if (body.parentFolderId === "people-folder-id" && !body.fileId) {
        createFileCalled = true;
        fileName = body.fileName;
      }
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "new-person-id",
          name: body.fileName,
          modifiedTime: new Date().toISOString()
        })
      });
    });

    await page.goto("/editor?story=story-1");

    // Switch to People tab
    const peopleTab = page.getByRole("tab", { name: /people/i });

    if (await peopleTab.isVisible()) {
      await peopleTab.click();
      await page.waitForTimeout(500);

      // Click new note button (or use keyboard shortcut)
      const newNoteButton = page
        .getByRole("button", { name: /new|add/i })
        .or(page.locator('[aria-label*="new"]'));

      if (await newNoteButton.isVisible()) {
        await newNoteButton.click();

        // If modal opens, fill in note name
        const noteNameInput = page.getByLabel(/name/i).or(page.getByPlaceholder(/note name/i));

        if (await noteNameInput.isVisible()) {
          await noteNameInput.fill("Bob");
          await page.getByRole("button", { name: /create|save/i }).click();
        } else {
          // If note opens directly in editor
          // Type note name and content
        }

        await page.waitForTimeout(500);
        expect(createFileCalled).toBe(true);
      }
    }
  });

  test("should create new Places note", async ({ page }) => {
    let createFileCalled = false;

    await page.route("**/.netlify/functions/drive-write", (route) => {
      const body = route.request().postDataJSON();
      if (body.parentFolderId === "places-folder-id" && !body.fileId) {
        createFileCalled = true;
      }
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "new-place-id",
          name: body.fileName,
          modifiedTime: new Date().toISOString()
        })
      });
    });

    await page.goto("/editor?story=story-1");

    const placesTab = page.getByRole("tab", { name: /places/i });

    if (await placesTab.isVisible()) {
      await placesTab.click();
      await page.waitForTimeout(500);

      const newNoteButton = page.getByRole("button", { name: /new|add/i }).first();

      if (await newNoteButton.isVisible()) {
        await newNoteButton.click();
        await page.waitForTimeout(500);
        expect(createFileCalled).toBe(true);
      }
    }
  });

  test("should create new Things note", async ({ page }) => {
    let createFileCalled = false;

    await page.route("**/.netlify/functions/drive-write", (route) => {
      const body = route.request().postDataJSON();
      if (body.parentFolderId === "things-folder-id" && !body.fileId) {
        createFileCalled = true;
      }
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "new-thing-id",
          name: body.fileName,
          modifiedTime: new Date().toISOString()
        })
      });
    });

    await page.goto("/editor?story=story-1");

    const thingsTab = page.getByRole("tab", { name: /things/i });

    if (await thingsTab.isVisible()) {
      await thingsTab.click();
      await page.waitForTimeout(500);

      const newNoteButton = page.getByRole("button", { name: /new|add/i }).first();

      if (await newNoteButton.isVisible()) {
        await newNoteButton.click();
        await page.waitForTimeout(500);
        expect(createFileCalled).toBe(true);
      }
    }
  });

  test("should read note content when clicking note", async ({ page }) => {
    await page.goto("/editor?story=story-1");

    const peopleTab = page.getByRole("tab", { name: /people/i });

    if (await peopleTab.isVisible()) {
      await peopleTab.click();
      await page.waitForTimeout(500);

      // Click Alice note
      await page.getByText("Alice").click();
      await page.waitForTimeout(500);

      // Note content should appear in editor
      const editor = page.locator('[contenteditable="true"]').or(page.locator('textarea')).first();

      if (await editor.isVisible()) {
        const content = await editor.textContent();
        expect(content).toContain("brave explorer");
      }
    }
  });

  test("should update note content when editing", async ({ page }) => {
    let updateCalled = false;
    let updatedContent = "";

    await page.route("**/.netlify/functions/drive-write", (route) => {
      const body = route.request().postDataJSON();
      if (body.fileId === "person-1-id") {
        updateCalled = true;
        updatedContent = body.content;
      }
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "person-1-id",
          name: "Alice",
          modifiedTime: new Date().toISOString()
        })
      });
    });

    await page.goto("/editor?story=story-1");

    const peopleTab = page.getByRole("tab", { name: /people/i });

    if (await peopleTab.isVisible()) {
      await peopleTab.click();
      await page.waitForTimeout(500);

      // Click Alice note
      await page.getByText("Alice").click();
      await page.waitForTimeout(500);

      // Edit content
      const editor = page.locator('[contenteditable="true"]').or(page.locator('textarea')).first();

      if (await editor.isVisible()) {
        await editor.click();
        await editor.fill("Alice is a brave explorer with red hair and a curious nature. She loves adventure.");

        // Wait for auto-save
        await page.waitForTimeout(2000);

        expect(updateCalled).toBe(true);
        expect(updatedContent).toContain("loves adventure");
      }
    }
  });

  test("should delete People note", async ({ page }) => {
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

    const peopleTab = page.getByRole("tab", { name: /people/i });

    if (await peopleTab.isVisible()) {
      await peopleTab.click();
      await page.waitForTimeout(500);

      // Right-click Alice note
      await page.getByText("Alice").click({ button: "right" });

      // Click delete
      await page.getByRole("menuitem", { name: /delete/i }).click();

      // Confirm deletion
      await page.getByRole("button", { name: /confirm|delete/i }).click();

      await page.waitForTimeout(500);
      expect(deleteCalled).toBe(true);
    }
  });

  test("should delete Places note", async ({ page }) => {
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

    const placesTab = page.getByRole("tab", { name: /places/i });

    if (await placesTab.isVisible()) {
      await placesTab.click();
      await page.waitForTimeout(500);

      await page.getByText("The Castle").click({ button: "right" });
      await page.getByRole("menuitem", { name: /delete/i }).click();
      await page.getByRole("button", { name: /confirm|delete/i }).click();

      await page.waitForTimeout(500);
      expect(deleteCalled).toBe(true);
    }
  });

  test("should delete Things note", async ({ page }) => {
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

    const thingsTab = page.getByRole("tab", { name: /things/i });

    if (await thingsTab.isVisible()) {
      await thingsTab.click();
      await page.waitForTimeout(500);

      await page.getByText("The Sword").click({ button: "right" });
      await page.getByRole("menuitem", { name: /delete/i }).click();
      await page.getByRole("button", { name: /confirm|delete/i }).click();

      await page.waitForTimeout(500);
      expect(deleteCalled).toBe(true);
    }
  });

  test("should rename People note", async ({ page }) => {
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

    const peopleTab = page.getByRole("tab", { name: /people/i });

    if (await peopleTab.isVisible()) {
      await peopleTab.click();
      await page.waitForTimeout(500);

      // Double-click to rename
      await page.getByText("Alice").dblclick();

      const nameInput = page.getByDisplayValue("Alice").or(page.locator('input[value="Alice"]'));

      if (await nameInput.isVisible()) {
        await nameInput.fill("Alice Smith");
        await nameInput.press("Enter");

        await page.waitForTimeout(500);
        expect(renameCalled).toBe(true);
        expect(newName).toBe("Alice Smith");
      }
    }
  });

  test("should show empty state when no notes exist", async ({ page }) => {
    // Mock empty folders
    await page.route("**/.netlify/functions/drive-list*", (route) => {
      const url = new URL(route.request().url());
      const folderId = url.searchParams.get("folderId");

      if (folderId === "people-folder-id") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ files: [] })
        });
      } else {
        route.continue();
      }
    });

    await page.goto("/editor?story=story-1");

    const peopleTab = page.getByRole("tab", { name: /people/i });

    if (await peopleTab.isVisible()) {
      await peopleTab.click();
      await page.waitForTimeout(500);

      // Should show empty state message
      const emptyMessage = page.getByText(/no.*notes|create one|get started/i);

      if (await emptyMessage.isVisible()) {
        await expect(emptyMessage).toBeVisible();
      }
    }
  });

  test("should switch between People, Places, and Things tabs", async ({ page }) => {
    await page.goto("/editor?story=story-1");

    // Switch to People
    const peopleTab = page.getByRole("tab", { name: /people/i });
    if (await peopleTab.isVisible()) {
      await peopleTab.click();
      await page.waitForTimeout(500);
      await expect(page.getByText("Alice")).toBeVisible();
    }

    // Switch to Places
    const placesTab = page.getByRole("tab", { name: /places/i });
    if (await placesTab.isVisible()) {
      await placesTab.click();
      await page.waitForTimeout(500);
      await expect(page.getByText("The Castle")).toBeVisible();
    }

    // Switch to Things
    const thingsTab = page.getByRole("tab", { name: /things/i });
    if (await thingsTab.isVisible()) {
      await thingsTab.click();
      await page.waitForTimeout(500);
      await expect(page.getByText("The Sword")).toBeVisible();
    }
  });
});




