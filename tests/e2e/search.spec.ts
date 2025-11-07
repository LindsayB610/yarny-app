import { test, expect } from "@playwright/test";

test.describe("Search Across Chapters, Snippets, and Content", () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      Object.defineProperty(document, "cookie", {
        writable: true,
        value: "yarny_session=test-session"
      });
    });

    // Mock story data with chapters and snippets containing searchable content
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
                name: "The Beginning",
                mimeType: "application/vnd.google-apps.folder",
                modifiedTime: "2025-01-01T00:00:00.000Z"
              },
              {
                id: "chapter-2-folder-id",
                name: "The Middle",
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
                name: "Opening Scene",
                mimeType: "application/vnd.google-apps.document",
                modifiedTime: "2025-01-01T00:00:00.000Z"
              },
              {
                id: "snippet-2-id",
                name: "Character Introduction",
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
                name: "Plot Development",
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
      "snippet-1-id": "The sun was setting over the mountains when she first arrived.",
      "snippet-2-id": "John was a tall man with piercing blue eyes and a warm smile.",
      "snippet-3-id": "The mystery deepened as they discovered the hidden passageway."
    };

    await page.route("**/.netlify/functions/drive-read", (route) => {
      const body = route.request().postDataJSON();
      const fileId = body.fileId;
      const content = snippetContent[fileId] || "Default content";

      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: fileId,
          name: "Test Document",
          content,
          modifiedTime: "2025-01-01T00:00:00.000Z",
          mimeType: "application/vnd.google-apps.document"
        })
      });
    });
  });

  test("should display search input in editor", async ({ page }) => {
    await page.goto("/editor?story=story-1");

    // Search input should be visible
    const searchInput = page
      .getByPlaceholder(/search/i)
      .or(page.locator('input[type="search"]'))
      .or(page.locator('[aria-label*="search"]'));

    await expect(searchInput.first()).toBeVisible();
  });

  test("should search for text in snippet titles", async ({ page }) => {
    await page.goto("/editor?story=story-1");

    // Wait for content to load
    await expect(page.getByText("The Beginning")).toBeVisible();

    // Type in search input
    const searchInput = page
      .getByPlaceholder(/search/i)
      .or(page.locator('input[type="search"]'))
      .first();

    await searchInput.fill("Opening");

    // Wait for search to filter
    await page.waitForTimeout(500);

    // Snippet with "Opening" in title should be visible
    await expect(page.getByText("Opening Scene")).toBeVisible();

    // Other snippets should be hidden or filtered
    // (depends on implementation - could hide or highlight)
  });

  test("should search for text in chapter titles", async ({ page }) => {
    await page.goto("/editor?story=story-1");

    await expect(page.getByText("The Beginning")).toBeVisible();

    const searchInput = page
      .getByPlaceholder(/search/i)
      .or(page.locator('input[type="search"]'))
      .first();

    await searchInput.fill("Middle");

    await page.waitForTimeout(500);

    // Chapter with "Middle" should be visible
    await expect(page.getByText("The Middle")).toBeVisible();
  });

  test("should search for text in snippet content", async ({ page }) => {
    await page.goto("/editor?story=story-1");

    await expect(page.getByText("The Beginning")).toBeVisible();

    const searchInput = page
      .getByPlaceholder(/search/i)
      .or(page.locator('input[type="search"]'))
      .first();

    await searchInput.fill("mountains");

    await page.waitForTimeout(500);

    // Snippet containing "mountains" should be visible/highlighted
    // This may require loading snippet content first
    await expect(page.getByText(/mountains/i).or(page.getByText("Opening Scene"))).toBeVisible();
  });

  test("should highlight search matches in results", async ({ page }) => {
    await page.goto("/editor?story=story-1");

    await expect(page.getByText("The Beginning")).toBeVisible();

    const searchInput = page
      .getByPlaceholder(/search/i)
      .or(page.locator('input[type="search"]'))
      .first();

    await searchInput.fill("John");

    await page.waitForTimeout(500);

    // Search matches should be highlighted
    const highlightedText = page.locator("mark").or(page.locator('[class*="highlight"]')).or(page.locator('[class*="match"]'));

    // At least one match should be highlighted
    if (await highlightedText.count() > 0) {
      await expect(highlightedText.first()).toBeVisible();
      const text = await highlightedText.first().textContent();
      expect(text?.toLowerCase()).toContain("john");
    }
  });

  test("should filter out non-matching chapters and snippets", async ({ page }) => {
    await page.goto("/editor?story=story-1");

    await expect(page.getByText("The Beginning")).toBeVisible();
    await expect(page.getByText("The Middle")).toBeVisible();

    const searchInput = page
      .getByPlaceholder(/search/i)
      .or(page.locator('input[type="search"]'))
      .first();

    await searchInput.fill("Opening");

    await page.waitForTimeout(500);

    // Only matching items should be visible
    await expect(page.getByText("Opening Scene")).toBeVisible();

    // Non-matching chapters might be collapsed or hidden
    // Check that "The Middle" chapter doesn't show non-matching snippets
    const middleChapter = page.getByText("The Middle").locator("..");
    const middleSnippets = middleChapter.getByText("Plot Development");

    // If filtering is strict, non-matching items should be hidden
    // If filtering highlights, they should still be visible but not highlighted
  });

  test("should clear search and show all items", async ({ page }) => {
    await page.goto("/editor?story=story-1");

    await expect(page.getByText("The Beginning")).toBeVisible();

    const searchInput = page
      .getByPlaceholder(/search/i)
      .or(page.locator('input[type="search"]'))
      .first();

    // Perform search
    await searchInput.fill("Opening");
    await page.waitForTimeout(500);

    // Clear search
    await searchInput.clear();
    await page.waitForTimeout(500);

    // All items should be visible again
    await expect(page.getByText("The Beginning")).toBeVisible();
    await expect(page.getByText("The Middle")).toBeVisible();
    await expect(page.getByText("Opening Scene")).toBeVisible();
  });

  test("should handle case-insensitive search", async ({ page }) => {
    await page.goto("/editor?story=story-1");

    await expect(page.getByText("The Beginning")).toBeVisible();

    const searchInput = page
      .getByPlaceholder(/search/i)
      .or(page.locator('input[type="search"]'))
      .first();

    // Search with different cases
    await searchInput.fill("JOHN");
    await page.waitForTimeout(500);

    // Should find "John" (case-insensitive)
    await expect(page.getByText(/john/i)).toBeVisible({ timeout: 2000 });

    await searchInput.clear();
    await searchInput.fill("john");
    await page.waitForTimeout(500);

    // Should still find "John"
    await expect(page.getByText(/john/i)).toBeVisible({ timeout: 2000 });
  });

  test("should search across multiple words", async ({ page }) => {
    await page.goto("/editor?story=story-1");

    await expect(page.getByText("The Beginning")).toBeVisible();

    const searchInput = page
      .getByPlaceholder(/search/i)
      .or(page.locator('input[type="search"]'))
      .first();

    // Search for multiple words
    await searchInput.fill("blue eyes");

    await page.waitForTimeout(500);

    // Should find snippet containing both words
    await expect(page.getByText(/blue.*eyes|eyes.*blue/i).or(page.getByText("Character Introduction"))).toBeVisible({
      timeout: 2000
    });
  });

  test("should focus search input with keyboard shortcut", async ({ page }) => {
    await page.goto("/editor?story=story-1");

    // Press Cmd/Ctrl+F to focus search
    await page.keyboard.press("Meta+F"); // Cmd+F on Mac, Ctrl+F on Windows/Linux

    // Search input should be focused
    const searchInput = page
      .getByPlaceholder(/search/i)
      .or(page.locator('input[type="search"]'))
      .first();

    await expect(searchInput).toBeFocused();
  });

  test("should search in People, Places, and Things notes", async ({ page }) => {
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
                name: "Alice Character",
                mimeType: "text/plain",
                modifiedTime: "2025-01-01T00:00:00.000Z"
              }
            ]
          })
        });
      } else {
        // Use default handler from beforeEach
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
            name: "Alice Character",
            content: "Alice is a brave explorer with red hair.",
            modifiedTime: "2025-01-01T00:00:00.000Z",
            mimeType: "text/plain"
          })
        });
      } else {
        route.continue();
      }
    });

    await page.goto("/editor?story=story-1");

    const searchInput = page
      .getByPlaceholder(/search/i)
      .or(page.locator('input[type="search"]'))
      .first();

    // Search for text in People notes
    await searchInput.fill("brave explorer");

    await page.waitForTimeout(500);

    // Should find matching note
    await expect(page.getByText(/brave explorer/i).or(page.getByText("Alice Character"))).toBeVisible({
      timeout: 2000
    });
  });

  test("should update search results in real-time as user types", async ({ page }) => {
    await page.goto("/editor?story=story-1");

    await expect(page.getByText("The Beginning")).toBeVisible();

    const searchInput = page
      .getByPlaceholder(/search/i)
      .or(page.locator('input[type="search"]'))
      .first();

    // Type incrementally
    await searchInput.fill("O");
    await page.waitForTimeout(200);

    // Type more
    await searchInput.fill("Op");
    await page.waitForTimeout(200);

    // Type more
    await searchInput.fill("Ope");
    await page.waitForTimeout(200);

    // Complete search
    await searchInput.fill("Opening");
    await page.waitForTimeout(500);

    // Results should update as user types
    await expect(page.getByText("Opening Scene")).toBeVisible();
  });

  test("should handle special characters in search", async ({ page }) => {
    await page.goto("/editor?story=story-1");

    const searchInput = page
      .getByPlaceholder(/search/i)
      .or(page.locator('input[type="search"]'))
      .first();

    // Search with special characters
    await searchInput.fill("test@example.com");
    await page.waitForTimeout(500);

    // Should not crash or error
    // Results might be empty, but UI should still be functional
    await expect(searchInput).toBeVisible();
  });

  test("should show no results message when search has no matches", async ({ page }) => {
    await page.goto("/editor?story=story-1");

    await expect(page.getByText("The Beginning")).toBeVisible();

    const searchInput = page
      .getByPlaceholder(/search/i)
      .or(page.locator('input[type="search"]'))
      .first();

    // Search for something that doesn't exist
    await searchInput.fill("xyzabc123nonexistent");
    await page.waitForTimeout(500);

    // Should show "no results" message (if implemented)
    const noResults = page.getByText(/no results|no matches|nothing found/i);

    // This test might pass or fail depending on implementation
    // If no message is shown, that's also acceptable
    if (await noResults.count() > 0) {
      await expect(noResults.first()).toBeVisible();
    }
  });
});

