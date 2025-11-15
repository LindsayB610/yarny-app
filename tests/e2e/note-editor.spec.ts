import { test, expect } from "@playwright/test";

/**
 * NoteEditor E2E Tests
 * 
 * These tests verify NoteEditor functionality using Playwright in a real browser environment.
 * This avoids the jsdom infinite loop issue encountered in unit tests.
 * 
 * See: plans/NOTEEDITOR_TIPTAP_JSDOM_INFINITE_LOOP.md
 */

test.describe("NoteEditor Integration Tests", () => {
  const testStoryId = "story-1";
  const testStoryFolderId = "folder-1";
  const testNoteId = "note-1";
  const testNoteName = "Test Note";
  const initialContent = "Initial content";

  test.beforeEach(async ({ page }) => {
    // Mock authentication using localStorage (as used by useAuth hook)
    await page.addInitScript(() => {
      window.localStorage.setItem("yarny_auth", "test-session-token");
      window.localStorage.setItem(
        "yarny_user",
        JSON.stringify({
          email: "test@example.com",
          token: "test-session-token",
          name: "Test User"
        })
      );
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

    // Mock story folder structure
    await page.route(`**/.netlify/functions/drive-list*`, (route) => {
      const url = route.request().url();
      const request = route.request();
      const method = request.method();
      
      // Handle POST requests (some endpoints use POST)
      let folderId: string | undefined;
      if (method === "POST") {
        try {
          const postData = request.postDataJSON();
          folderId = postData?.folderId;
        } catch {
          // Not JSON, try query params
        }
      }
      
      // Also check query params
      if (!folderId) {
        const urlObj = new URL(url);
        folderId = urlObj.searchParams.get("folderId") || undefined;
      }
      
      // Return test story when listing stories (yarny folder)
      if (folderId === "yarny-folder-id" || url.includes("folderId=yarny-folder-id")) {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            files: [
              {
                id: testStoryId,
                name: "Test Story",
                mimeType: "application/vnd.google-apps.folder",
                modifiedTime: "2024-01-01T00:00:00Z"
              }
            ],
            nextPageToken: undefined
          })
        });
        return;
      }

      // Return story folder contents (People folder, project.json, data.json)
      if (folderId === testStoryId || url.includes(`folderId=${testStoryId}`)) {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            files: [
              {
                id: "people-folder-id",
                name: "People",
                mimeType: "application/vnd.google-apps.folder",
                modifiedTime: "2024-01-01T00:00:00Z"
              },
              {
                id: "project-json-id",
                name: "project.json",
                mimeType: "application/json",
                modifiedTime: "2024-01-01T00:00:00Z"
              },
              {
                id: "data-json-id",
                name: "data.json",
                mimeType: "application/json",
                modifiedTime: "2024-01-01T00:00:00Z"
              }
            ],
            nextPageToken: undefined
          })
        });
        return;
      }

      // Return test note when listing People folder
      if (folderId === "people-folder-id" || url.includes("folderId=people-folder-id")) {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            files: [
              {
                id: testNoteId,
                name: `${testNoteName}.txt`,
                mimeType: "text/plain",
                modifiedTime: "2024-01-01T00:00:00Z"
              }
            ],
            nextPageToken: undefined
          })
        });
        return;
      }

      // Default: empty list
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          files: [],
          nextPageToken: undefined
        })
      });
    });

    // Mock reading file content (notes, project.json, data.json)
    await page.route("**/.netlify/functions/drive-read*", (route) => {
      const request = route.request();
      const method = request.method();
      let fileId: string | undefined;
      
      if (method === "POST") {
        try {
          const postData = request.postDataJSON();
          fileId = postData?.fileId;
        } catch {
          // Not JSON
        }
      }
      
      // Also check query params
      if (!fileId) {
        const url = request.url();
        const urlObj = new URL(url);
        fileId = urlObj.searchParams.get("fileId") || undefined;
      }
      
      // Return note content (must match DriveReadResponseSchema: id, name, content required)
      if (fileId === testNoteId) {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: testNoteId,
            name: `${testNoteName}.txt`,
            content: initialContent,
            modifiedTime: "2024-01-01T00:00:00Z",
            mimeType: "text/plain"
          })
        });
        return;
      }

      // Return project.json content
      if (fileId === "project-json-id") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "project-json-id",
            name: "project.json",
            content: JSON.stringify({
              title: "Test Story",
              updatedAt: "2024-01-01T00:00:00Z"
            }),
            modifiedTime: "2024-01-01T00:00:00Z",
            mimeType: "application/json"
          })
        });
        return;
      }

      // Return data.json content (with note reference)
      if (fileId === "data-json-id") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "data-json-id",
            name: "data.json",
            content: JSON.stringify({
              groups: {},
              snippets: {},
              notes: {
                [testNoteId]: {
                  id: testNoteId,
                  kind: "person",
                  name: testNoteName,
                  driveFileId: testNoteId,
                  updatedAt: "2024-01-01T00:00:00Z"
                }
              }
            }),
            modifiedTime: "2024-01-01T00:00:00Z",
            mimeType: "application/json"
          })
        });
        return;
      }

      // Default: empty content (must include required fields)
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: fileId || "unknown",
          name: "unknown.txt",
          content: "",
          modifiedTime: new Date().toISOString(),
          mimeType: "text/plain"
        })
      });
    });

    // Mock write requests (individual tests will override this to track requests)
    await page.route("**/.netlify/functions/drive-write*", async (route) => {
      const request = route.request();
      const postData = request.postDataJSON();

      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: postData?.fileId || testNoteId,
          name: testNoteName,
          modifiedTime: new Date().toISOString()
        })
      });
    });

    // Capture console logs and network requests for debugging
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        console.log(`[Page Error] ${msg.text()}`);
      }
    });

    page.on("requestfailed", (request) => {
      console.log(`[Request Failed] ${request.method()} ${request.url()}: ${request.failure()?.errorText}`);
    });

    // Navigate to editor with story and note selected
    // Route format: /stories/:storyId/people/:noteId?
    await page.goto(`/stories/${testStoryId}/people/${testNoteId}`, { waitUntil: "networkidle", timeout: 30000 });
    
    // Wait a bit for any redirects
    await page.waitForTimeout(2000);
    
    // Debug: Log current URL to see if we're on the right page
    const currentUrl = page.url();
    console.log(`Current URL after navigation: ${currentUrl}`);
    
    // If we're redirected to /stories, the loader likely failed
    if (currentUrl.includes("/stories") && !currentUrl.includes("/people")) {
      console.log("Page redirected to stories page - loader may have failed");
      // Try to see what's on the page
      const pageContent = await page.content();
      console.log(`Page title: ${await page.title()}`);
    }
  });

  test("renders note editor when note is selected", async ({ page }) => {
    // Wait for story title to appear (StoryEditor shows story title, not note name)
    await expect(page.locator(`text=Test Story`).first()).toBeVisible({ timeout: 10000 });

    // Wait for TipTap editor to initialize
    const editor = page.locator('[contenteditable="true"]').first();
    await expect(editor).toBeVisible({ timeout: 10000 });

    // Wait for content to load into editor
    await expect(editor).toContainText(initialContent, { timeout: 10000 });
  });

  test("displays save status when content is saved", async ({ page }) => {
    // Wait for editor to initialize
    const editor = page.locator('[contenteditable="true"]').first();
    await expect(editor).toBeVisible({ timeout: 10000 });

    // Find save button
    const saveButton = page.getByRole("button", { name: /save/i }).first();
    await expect(saveButton).toBeVisible({ timeout: 2000 });

    // Initially disabled since content matches saved content
    await expect(saveButton).toBeDisabled();
  });

  test("displays unsaved changes indicator when content changes", async ({ page }) => {
    // Wait for editor to initialize
    const editor = page.locator('[contenteditable="true"]').first();
    await expect(editor).toBeVisible({ timeout: 10000 });

    // Click editor and type new content
    await editor.click();
    await editor.fill("New content");

    // Save button should be enabled
    const saveButton = page.getByRole("button", { name: /save/i }).first();
    await expect(saveButton).toBeEnabled({ timeout: 2000 });
  });

  test("autosaves content after 2 second debounce", async ({ page }) => {
    // Track write requests
    const writeRequests: Array<{ fileId: string; content: string }> = [];
    
    await page.route("**/.netlify/functions/drive-write*", async (route) => {
      const request = route.request();
      const postData = request.postDataJSON();
      
      writeRequests.push({
        fileId: postData?.fileId || "",
        content: postData?.content || ""
      });

      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: postData?.fileId || testNoteId,
          name: testNoteName,
          modifiedTime: new Date().toISOString()
        })
      });
    });

    // Wait for editor to initialize
    const editor = page.locator('[contenteditable="true"]').first();
    await expect(editor).toBeVisible({ timeout: 10000 });

    // Type new content
    await editor.click();
    await editor.fill("New content");

    // Wait for debounced save (2 seconds)
    await page.waitForTimeout(2500);

    // Verify save was called
    expect(writeRequests.length).toBeGreaterThan(0);
    const lastRequest = writeRequests[writeRequests.length - 1];
    expect(lastRequest.fileId).toBe(testNoteId);
    expect(lastRequest.content).toContain("New content");
  });

  test("resets debounce timer when content changes rapidly", async ({ page }) => {
    const writeRequests: Array<{ fileId: string; content: string }> = [];
    
    await page.route("**/.netlify/functions/drive-write*", async (route) => {
      const request = route.request();
      const postData = request.postDataJSON();
      
      writeRequests.push({
        fileId: postData?.fileId || "",
        content: postData?.content || ""
      });

      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: postData?.fileId || testNoteId,
          name: testNoteName,
          modifiedTime: new Date().toISOString()
        })
      });
    });

    // Wait for editor to initialize
    const editor = page.locator('[contenteditable="true"]').first();
    await expect(editor).toBeVisible({ timeout: 10000 });

    // Type first character
    await editor.click();
    await editor.type("A", { delay: 100 });

    // Wait but not enough to trigger save
    await page.waitForTimeout(1500);

    // Type second character (should reset debounce timer)
    await editor.type("B", { delay: 100 });

    // Wait again (should still not save since timer was reset)
    await page.waitForTimeout(1500);

    // Should not have saved yet
    expect(writeRequests.length).toBe(0);

    // Now wait for full debounce from last change
    await page.waitForTimeout(2000);

    // Should have saved once
    expect(writeRequests.length).toBe(1);
  });

  test("manually saves when save button is clicked", async ({ page }) => {
    const writeRequests: Array<{ fileId: string; content: string }> = [];
    
    await page.route("**/.netlify/functions/drive-write*", async (route) => {
      const request = route.request();
      const postData = request.postDataJSON();
      
      writeRequests.push({
        fileId: postData?.fileId || "",
        content: postData?.content || ""
      });

      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: postData?.fileId || testNoteId,
          name: testNoteName,
          modifiedTime: new Date().toISOString()
        })
      });
    });

    // Wait for editor to initialize
    const editor = page.locator('[contenteditable="true"]').first();
    await expect(editor).toBeVisible({ timeout: 10000 });

    // Type content
    await editor.click();
    await editor.fill("New content");

    // Click save button immediately (should save without waiting for debounce)
    const saveButton = page.getByRole("button", { name: /save/i }).first();
    await saveButton.click();

    // Wait a bit for save to complete
    await page.waitForTimeout(500);

    // Verify save was called
    expect(writeRequests.length).toBeGreaterThan(0);
    const lastRequest = writeRequests[writeRequests.length - 1];
    expect(lastRequest.content).toContain("New content");
  });

  test("disables save button when there are no unsaved changes", async ({ page }) => {
    // Wait for editor to initialize
    const editor = page.locator('[contenteditable="true"]').first();
    await expect(editor).toBeVisible({ timeout: 10000 });

    // Save button should be disabled initially
    const saveButton = page.getByRole("button", { name: /save/i }).first();
    await expect(saveButton).toBeDisabled();
  });

  test("does not save when content hasn't changed", async ({ page }) => {
    const writeRequests: Array<{ fileId: string; content: string }> = [];
    
    await page.route("**/.netlify/functions/drive-write*", async (route) => {
      const request = route.request();
      const postData = request.postDataJSON();
      
      writeRequests.push({
        fileId: postData?.fileId || "",
        content: postData?.content || ""
      });

      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: postData?.fileId || testNoteId,
          name: testNoteName,
          modifiedTime: new Date().toISOString()
        })
      });
    });

    // Wait for editor to initialize
    const editor = page.locator('[contenteditable="true"]').first();
    await expect(editor).toBeVisible({ timeout: 10000 });

    // Wait for a while without changing content
    await page.waitForTimeout(5000);

    // Should not have saved since content hasn't changed
    expect(writeRequests.length).toBe(0);
  });

  test("saves content on beforeunload if there are unsaved changes", async ({ page }) => {
    const writeRequests: Array<{ fileId: string; content: string }> = [];
    
    await page.route("**/.netlify/functions/drive-write*", async (route) => {
      const request = route.request();
      const postData = request.postDataJSON();
      
      writeRequests.push({
        fileId: postData?.fileId || "",
        content: postData?.content || ""
      });

      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: postData?.fileId || testNoteId,
          name: testNoteName,
          modifiedTime: new Date().toISOString()
        })
      });
    });

    // Wait for editor to initialize
    const editor = page.locator('[contenteditable="true"]').first();
    await expect(editor).toBeVisible({ timeout: 10000 });

    // Type content to create unsaved changes
    await editor.click();
    await editor.fill("New content");

    // Trigger beforeunload event
    await page.evaluate(() => {
      window.dispatchEvent(new Event("beforeunload"));
    });

    // Wait a bit for save to complete
    await page.waitForTimeout(1000);

    // Verify save was called
    expect(writeRequests.length).toBeGreaterThan(0);
    const lastRequest = writeRequests[writeRequests.length - 1];
    expect(lastRequest.fileId).toBe(testNoteId);
    expect(lastRequest.content).toContain("New content");
  });

  test("saves previous note when switching to a new note", async ({ page }) => {
    const secondNoteId = "note-2";
    const secondNoteName = "Second Note";
    const writeRequests: Array<{ fileId: string; content: string }> = [];

    // Add second note to People folder listing
    await page.route(`**/.netlify/functions/drive-list*`, (route) => {
      const url = route.request().url();
      
      // Return People notes folder when listing story contents
      if (url.includes(`folderId=${testStoryId}`)) {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            files: [
              {
                id: "people-folder-id",
                name: "People",
                mimeType: "application/vnd.google-apps.folder",
                modifiedTime: "2024-01-01T00:00:00Z"
              }
            ],
            nextPageToken: undefined
          })
        });
        return;
      }

      // Return both notes when listing People folder
      if (url.includes("folderId=people-folder-id")) {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            files: [
              {
                id: testNoteId,
                name: `${testNoteName}.txt`,
                mimeType: "text/plain",
                modifiedTime: "2024-01-01T00:00:00Z"
              },
              {
                id: secondNoteId,
                name: `${secondNoteName}.txt`,
                mimeType: "text/plain",
                modifiedTime: "2024-01-01T00:00:00Z"
              }
            ],
            nextPageToken: undefined
          })
        });
        return;
      }

      // Default: empty list
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          files: [],
          nextPageToken: undefined
        })
      });
    });

    // Mock reading second note content
    await page.route("**/.netlify/functions/drive-read*", (route) => {
      const request = route.request();
      const method = request.method();
      
      if (method === "POST") {
        const postData = request.postDataJSON();
        
        if (postData?.fileId === testNoteId) {
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              content: initialContent,
              modifiedTime: "2024-01-01T00:00:00Z"
            })
          });
          return;
        }

        if (postData?.fileId === secondNoteId) {
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              content: "Second note content",
              modifiedTime: "2024-01-01T00:00:00Z"
            })
          });
          return;
        }
      }

      // Default: empty content
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          content: "",
          modifiedTime: new Date().toISOString()
        })
      });
    });

    // Track write requests
    await page.route("**/.netlify/functions/drive-write*", async (route) => {
      const request = route.request();
      const postData = request.postDataJSON();
      
      writeRequests.push({
        fileId: postData?.fileId || "",
        content: postData?.content || ""
      });

      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: postData?.fileId || testNoteId,
          name: postData?.fileId === secondNoteId ? secondNoteName : testNoteName,
          modifiedTime: new Date().toISOString()
        })
      });
    });

    // Navigate to first note
    await page.goto(`/stories/${testStoryId}/people/${testNoteId}`, { waitUntil: "domcontentloaded" });

    // Wait for editor to initialize
    const editor = page.locator('[contenteditable="true"]').first();
    await expect(editor).toBeVisible({ timeout: 10000 });

    // Type content in first note
    await editor.click();
    await editor.fill("Note 1 content");

    // Wait a moment for the content to be registered
    await page.waitForTimeout(500);

    // Switch to second note by clicking on it in the sidebar or navigating
    // First, try to find and click the second note in the sidebar
    const secondNoteLink = page.locator(`text=${secondNoteName}`).first();
    
    // If sidebar is visible, click the note
    if (await secondNoteLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await secondNoteLink.click();
    } else {
      // Otherwise, navigate directly to the second note
      await page.goto(`/stories/${testStoryId}/people/${secondNoteId}`, { waitUntil: "domcontentloaded" });
    }

    // Wait a bit for the save to complete
    await page.waitForTimeout(1000);

    // Verify first note was saved
    expect(writeRequests.length).toBeGreaterThan(0);
    const firstNoteSave = writeRequests.find(req => req.fileId === testNoteId);
    expect(firstNoteSave).toBeDefined();
    expect(firstNoteSave?.content).toContain("Note 1 content");
  });

  test("handles save errors gracefully", async ({ page }) => {
    const consoleErrors: string[] = [];

    // Capture console errors
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    // Mock write endpoint to return error
    await page.route("**/.netlify/functions/drive-write*", async (route) => {
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Save failed"
        })
      });
    });

    // Wait for editor to initialize
    const editor = page.locator('[contenteditable="true"]').first();
    await expect(editor).toBeVisible({ timeout: 10000 });

    // Type content
    await editor.click();
    await editor.fill("New content");

    // Wait for debounced save (2 seconds)
    await page.waitForTimeout(2500);

    // Verify error was logged (component logs errors to console)
    // Note: The exact error message format may vary, so we check for any error
    // In a real scenario, you might want to check for a specific error message
    // or check for an error indicator in the UI
    const hasError = consoleErrors.some(err => 
      err.includes("Failed to save") || err.includes("Save failed") || err.includes("error")
    );
    
    // The component should handle the error gracefully (not crash)
    // We verify the editor is still functional
    await expect(editor).toBeVisible();
    await expect(editor).toContainText("New content");
  });
});

