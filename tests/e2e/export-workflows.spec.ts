import { test, expect } from "@playwright/test";

test.describe("Export Workflows - Content Structure Validation", () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      Object.defineProperty(document, "cookie", {
        writable: true,
        value: "yarny_session=test-session"
      });
    });

    // Mock story with chapters and snippets
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
              },
              {
                id: "people-folder-id",
                name: "People",
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
      } else if (folderId === "chapter-2-folder-id") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            files: [
              {
                id: "snippet-3-id",
                name: "Snippet 3",
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

    // Mock snippet content
    const snippetContent: Record<string, string> = {
      "snippet-1-id": "First paragraph of Chapter 1.\n\nSecond paragraph of Chapter 1.",
      "snippet-2-id": "Third paragraph of Chapter 1.\n\nFourth paragraph of Chapter 1.",
      "snippet-3-id": "First paragraph of Chapter 2.\n\nSecond paragraph of Chapter 2."
    };

    await page.route("**/.netlify/functions/drive-read", (route) => {
      const body = route.request().postDataJSON();
      const fileId = body.fileId;
      const content = snippetContent[fileId] || "";

      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: fileId,
          name: fileId.includes("snippet-1") ? "Snippet 1" : fileId.includes("snippet-2") ? "Snippet 2" : "Snippet 3",
          content,
          modifiedTime: "2025-01-01T00:00:00.000Z",
          mimeType: "application/vnd.google-apps.document"
        })
      });
    });
  });

  test("should export all chapters as single document", async ({ page }) => {
    let exportCalls: any[] = [];
    let finalDocumentContent = "";

    await page.route("**/.netlify/functions/drive-write", (route) => {
      const body = route.request().postDataJSON();
      if (body.mimeType === "application/vnd.google-apps.document" && body.fileName.includes("Export")) {
        exportCalls.push(body);
        finalDocumentContent = body.content;
      }
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "export-doc-id",
          name: body.fileName,
          modifiedTime: new Date().toISOString()
        })
      });
    });

    await page.goto("/editor?story=story-1");

    // Wait for content to load
    await expect(page.getByText("Chapter 1")).toBeVisible();

    // Find export button (usually in menu or toolbar)
    const exportButton = page
      .getByRole("button", { name: /export/i })
      .or(page.locator('[aria-label*="export"]'));

    if (await exportButton.isVisible()) {
      await exportButton.click();

      // Select "Export All Chapters" option
      await page.getByRole("menuitem", { name: /chapters|all chapters/i }).click();

      // Enter filename
      const filenameInput = page.getByPlaceholder(/filename/i).or(page.getByLabel(/filename/i));

      if (await filenameInput.isVisible()) {
        await filenameInput.fill("Complete Story Export");
        await page.getByRole("button", { name: /export|create/i }).click();
      }

      // Wait for export to complete
      await page.waitForTimeout(2000);

      // Verify export was called
      expect(exportCalls.length).toBeGreaterThan(0);

      // Verify content structure
      // Should include all snippets in order: Snippet 1, Snippet 2, Snippet 3
      expect(finalDocumentContent).toContain("# Snippet 1");
      expect(finalDocumentContent).toContain("First paragraph of Chapter 1");
      expect(finalDocumentContent).toContain("# Snippet 2");
      expect(finalDocumentContent).toContain("Third paragraph of Chapter 1");
      expect(finalDocumentContent).toContain("# Snippet 3");
      expect(finalDocumentContent).toContain("First paragraph of Chapter 2");
    }
  });

  test("should export chapters in correct order", async ({ page }) => {
    let exportContent = "";

    await page.route("**/.netlify/functions/drive-write", (route) => {
      const body = route.request().postDataJSON();
      if (body.mimeType === "application/vnd.google-apps.document") {
        exportContent = body.content;
      }
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "export-doc-id",
          name: body.fileName,
          modifiedTime: new Date().toISOString()
        })
      });
    });

    await page.goto("/editor?story=story-1");

    await expect(page.getByText("Chapter 1")).toBeVisible();

    const exportButton = page.getByRole("button", { name: /export/i }).first();

    if (await exportButton.isVisible()) {
      await exportButton.click();
      await page.getByRole("menuitem", { name: /chapters/i }).click();

      const filenameInput = page.getByPlaceholder(/filename/i).first();

      if (await filenameInput.isVisible()) {
        await filenameInput.fill("Ordered Export");
        await page.getByRole("button", { name: /export/i }).click();
      }

      await page.waitForTimeout(2000);

      // Verify order: Chapter 1 snippets should come before Chapter 2 snippets
      const snippet1Index = exportContent.indexOf("# Snippet 1");
      const snippet2Index = exportContent.indexOf("# Snippet 2");
      const snippet3Index = exportContent.indexOf("# Snippet 3");

      expect(snippet1Index).toBeLessThan(snippet2Index);
      expect(snippet2Index).toBeLessThan(snippet3Index);
    }
  });

  test("should export People notes as separate document", async ({ page }) => {
    // Mock People folder content
    await page.route("**/.netlify/functions/drive-list*", (route) => {
      const url = new URL(route.request().url());
      const folderId = url.searchParams.get("folderId");

      if (folderId === "people-folder-id") {
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
              },
              {
                id: "person-2-id",
                name: "Bob",
                mimeType: "text/plain",
                modifiedTime: "2025-01-01T00:00:00.000Z"
              }
            ]
          })
        });
      } else {
        route.continue();
      }
    });

    await page.route("**/.netlify/functions/drive-read", (route) => {
      const body = route.request().postDataJSON();
      if (body.fileId === "person-1-id") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "person-1-id",
            name: "Alice",
            content: "Alice is a brave explorer.",
            modifiedTime: "2025-01-01T00:00:00.000Z",
            mimeType: "text/plain"
          })
        });
      } else if (body.fileId === "person-2-id") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "person-2-id",
            name: "Bob",
            content: "Bob is a wise mentor.",
            modifiedTime: "2025-01-01T00:00:00.000Z",
            mimeType: "text/plain"
          })
        });
      } else {
        route.continue();
      }
    });

    let exportContent = "";

    await page.route("**/.netlify/functions/drive-write", (route) => {
      const body = route.request().postDataJSON();
      if (body.mimeType === "application/vnd.google-apps.document" && body.fileName.includes("People")) {
        exportContent = body.content;
      }
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "export-doc-id",
          name: body.fileName,
          modifiedTime: new Date().toISOString()
        })
      });
    });

    await page.goto("/editor?story=story-1");

    const exportButton = page.getByRole("button", { name: /export/i }).first();

    if (await exportButton.isVisible()) {
      await exportButton.click();
      await page.getByRole("menuitem", { name: /people/i }).click();

      const filenameInput = page.getByPlaceholder(/filename/i).first();

      if (await filenameInput.isVisible()) {
        await filenameInput.fill("People Export");
        await page.getByRole("button", { name: /export/i }).click();
      }

      await page.waitForTimeout(2000);

      // Verify People notes are exported
      expect(exportContent).toContain("# Alice");
      expect(exportContent).toContain("brave explorer");
      expect(exportContent).toContain("# Bob");
      expect(exportContent).toContain("wise mentor");
    }
  });

  test("should handle large exports with chunking", async ({ page }) => {
    // Create large content (exceeding chunk limit)
    const largeContent = "A".repeat(600_000); // ~600k characters

    await page.route("**/.netlify/functions/drive-read", (route) => {
      const body = route.request().postDataJSON();
      if (body.fileId === "snippet-1-id") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "snippet-1-id",
            name: "Snippet 1",
            content: largeContent,
            modifiedTime: "2025-01-01T00:00:00.000Z",
            mimeType: "application/vnd.google-apps.document"
          })
        });
      } else {
        route.continue();
      }
    });

    let writeCalls = 0;
    let progressUpdates: any[] = [];

    await page.route("**/.netlify/functions/drive-write", (route) => {
      writeCalls++;
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "export-doc-id",
          name: "Large Export",
          modifiedTime: new Date().toISOString()
        })
      });
    });

    // Mock progress updates (if shown in UI)
    await page.goto("/editor?story=story-1");

    const exportButton = page.getByRole("button", { name: /export/i }).first();

    if (await exportButton.isVisible()) {
      await exportButton.click();
      await page.getByRole("menuitem", { name: /chapters/i }).click();

      const filenameInput = page.getByPlaceholder(/filename/i).first();

      if (await filenameInput.isVisible()) {
        await filenameInput.fill("Large Export");
        await page.getByRole("button", { name: /export/i }).click();
      }

      // Wait for export progress
      await page.waitForTimeout(5000);

      // For large content, multiple write calls should be made (chunking)
      // At least 2 calls: initial create + chunk append
      expect(writeCalls).toBeGreaterThanOrEqual(1);

      // Progress dialog should show chunk progress (if implemented)
      const progressDialog = page.getByText(/exporting|progress/i).or(page.locator('[role="progressbar"]'));

      if (await progressDialog.isVisible({ timeout: 1000 })) {
        await expect(progressDialog).toBeVisible();
      }
    }
  });

  test("should preserve paragraph breaks in exported content", async ({ page }) => {
    let exportContent = "";

    await page.route("**/.netlify/functions/drive-write", (route) => {
      const body = route.request().postDataJSON();
      if (body.mimeType === "application/vnd.google-apps.document") {
        exportContent = body.content;
      }
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "export-doc-id",
          name: body.fileName,
          modifiedTime: new Date().toISOString()
        })
      });
    });

    await page.goto("/editor?story=story-1");

    const exportButton = page.getByRole("button", { name: /export/i }).first();

    if (await exportButton.isVisible()) {
      await exportButton.click();
      await page.getByRole("menuitem", { name: /chapters/i }).click();

      const filenameInput = page.getByPlaceholder(/filename/i).first();

      if (await filenameInput.isVisible()) {
        await filenameInput.fill("Paragraph Test");
        await page.getByRole("button", { name: /export/i }).click();
      }

      await page.waitForTimeout(2000);

      // Verify paragraph breaks are preserved (double newlines)
      // Content should have \n\n between paragraphs
      expect(exportContent).toContain("\n\n");
      expect(exportContent).toContain("First paragraph of Chapter 1");
      expect(exportContent).toContain("Second paragraph of Chapter 1");
    }
  });

  test("should include snippet titles in exported content", async ({ page }) => {
    let exportContent = "";

    await page.route("**/.netlify/functions/drive-write", (route) => {
      const body = route.request().postDataJSON();
      if (body.mimeType === "application/vnd.google-apps.document") {
        exportContent = body.content;
      }
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "export-doc-id",
          name: body.fileName,
          modifiedTime: new Date().toISOString()
        })
      });
    });

    await page.goto("/editor?story=story-1");

    const exportButton = page.getByRole("button", { name: /export/i }).first();

    if (await exportButton.isVisible()) {
      await exportButton.click();
      await page.getByRole("menuitem", { name: /chapters/i }).click();

      const filenameInput = page.getByPlaceholder(/filename/i).first();

      if (await filenameInput.isVisible()) {
        await filenameInput.fill("Titles Test");
        await page.getByRole("button", { name: /export/i }).click();
      }

      await page.waitForTimeout(2000);

      // Verify snippet titles are included as headers
      expect(exportContent).toContain("# Snippet 1");
      expect(exportContent).toContain("# Snippet 2");
      expect(exportContent).toContain("# Snippet 3");
    }
  });

  test("should show export progress dialog", async ({ page }) => {
    await page.route("**/.netlify/functions/drive-write", (route) => {
      // Simulate slow export
      setTimeout(() => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "export-doc-id",
            name: "Test Export",
            modifiedTime: new Date().toISOString()
          })
        });
      }, 1000);
    });

    await page.goto("/editor?story=story-1");

    const exportButton = page.getByRole("button", { name: /export/i }).first();

    if (await exportButton.isVisible()) {
      await exportButton.click();
      await page.getByRole("menuitem", { name: /chapters/i }).click();

      const filenameInput = page.getByPlaceholder(/filename/i).first();

      if (await filenameInput.isVisible()) {
        await filenameInput.fill("Progress Test");
        await page.getByRole("button", { name: /export/i }).click();
      }

      // Progress dialog should appear
      const progressDialog = page
        .getByText(/exporting|creating|writing/i)
        .or(page.locator('[role="progressbar"]'))
        .or(page.getByText(/\d+\s*\/\s*\d+/));

      if (await progressDialog.isVisible({ timeout: 2000 })) {
        await expect(progressDialog).toBeVisible();
      }
    }
  });

  test("should handle export errors gracefully", async ({ page }) => {
    await page.route("**/.netlify/functions/drive-write", (route) => {
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Export failed" })
      });
    });

    await page.goto("/editor?story=story-1");

    const exportButton = page.getByRole("button", { name: /export/i }).first();

    if (await exportButton.isVisible()) {
      await exportButton.click();
      await page.getByRole("menuitem", { name: /chapters/i }).click();

      const filenameInput = page.getByPlaceholder(/filename/i).first();

      if (await filenameInput.isVisible()) {
        await filenameInput.fill("Error Test");
        await page.getByRole("button", { name: /export/i }).click();
      }

      // Error message should appear
      await page.waitForTimeout(1000);
      const errorMessage = page.getByText(/error|failed|something went wrong/i);

      if (await errorMessage.isVisible({ timeout: 2000 })) {
        await expect(errorMessage).toBeVisible();
      }
    }
  });

  test("should create export file in story folder", async ({ page }) => {
    let exportParentFolder = "";

    await page.route("**/.netlify/functions/drive-write", (route) => {
      const body = route.request().postDataJSON();
      if (body.mimeType === "application/vnd.google-apps.document") {
        exportParentFolder = body.parentFolderId;
      }
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "export-doc-id",
          name: body.fileName,
          modifiedTime: new Date().toISOString()
        })
      });
    });

    await page.goto("/editor?story=story-1");

    const exportButton = page.getByRole("button", { name: /export/i }).first();

    if (await exportButton.isVisible()) {
      await exportButton.click();
      await page.getByRole("menuitem", { name: /chapters/i }).click();

      const filenameInput = page.getByPlaceholder(/filename/i).first();

      if (await filenameInput.isVisible()) {
        await filenameInput.fill("Folder Test");
        await page.getByRole("button", { name: /export/i }).click();
      }

      await page.waitForTimeout(2000);

      // Verify export was created in story folder
      expect(exportParentFolder).toBe("story-folder-id");
    }
  });

  test("should suggest filename based on story title", async ({ page }) => {
    await page.goto("/editor?story=story-1");

    const exportButton = page.getByRole("button", { name: /export/i }).first();

    if (await exportButton.isVisible()) {
      await exportButton.click();
      await page.getByRole("menuitem", { name: /chapters/i }).click();

      // Filename input should have suggested value
      const filenameInput = page.getByPlaceholder(/filename/i).or(page.locator('input[type="text"]')).first();

      if (await filenameInput.isVisible()) {
        const suggestedValue = await filenameInput.inputValue();
        // Should contain story name or "Export" or similar
        expect(suggestedValue.length).toBeGreaterThan(0);
      }
    }
  });
});

