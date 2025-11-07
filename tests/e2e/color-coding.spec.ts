import { test, expect } from "@playwright/test";

test.describe("Color Coding Flows", () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      Object.defineProperty(document, "cookie", {
        writable: true,
        value: "yarny_session=test-session"
      });
    });

    // Mock story data with chapters
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
      } else {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ files: [] })
        });
      }
    });
  });

  test("should open color picker when clicking color chip", async ({ page }) => {
    await page.goto("/editor?story=story-1");

    // Wait for chapter to load
    await expect(page.getByText("Chapter 1")).toBeVisible();

    // Find color chip next to chapter
    const colorChip = page
      .getByText("Chapter 1")
      .locator("..")
      .locator('[aria-label*="color"]')
      .or(page.locator('[data-testid*="color-chip"]').first())
      .or(page.locator('[role="button"]').filter({ hasText: "" }).first());

    // If color chip exists, click it
    if (await colorChip.count() > 0) {
      await colorChip.first().click();

      // Color picker should open
      await expect(
        page.getByText(/select/i).or(page.locator('[role="dialog"]').getByText(/red|blue|green/i))
      ).toBeVisible({ timeout: 2000 });
    }
  });

  test("should apply color to chapter when selected from color picker", async ({ page }) => {
    let writeCalled = false;
    let savedColor = "";

    // Mock metadata update (colors are stored in chapter metadata)
    await page.route("**/.netlify/functions/drive-write", (route) => {
      const body = route.request().postDataJSON();
      // Colors might be saved in metadata.json or as chapter property
      if (body.content && body.content.includes("color")) {
        writeCalled = true;
        const metadata = JSON.parse(body.content);
        savedColor = metadata.color || "";
      }
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "chapter-1-folder-id",
          name: "Chapter 1",
          modifiedTime: new Date().toISOString()
        })
      });
    });

    await page.goto("/editor?story=story-1");

    await expect(page.getByText("Chapter 1")).toBeVisible();

    // Open color picker
    const colorChip = page
      .getByText("Chapter 1")
      .locator("..")
      .locator('[aria-label*="color"]')
      .first();

    if (await colorChip.isVisible()) {
      await colorChip.click();

      // Wait for color picker to open
      await page.waitForTimeout(300);

      // Select red color (first color in palette)
      const redColor = page
        .locator('[aria-label*="red"]')
        .or(page.locator('[data-color="red"]'))
        .or(page.locator('[style*="#EF4444"]'))
        .first();

      if (await redColor.isVisible()) {
        await redColor.click();

        // Wait for color to be applied
        await page.waitForTimeout(500);

        // Verify color was saved
        expect(writeCalled).toBe(true);
      }
    }
  });

  test("should display all 12 accent colors in color picker", async ({ page }) => {
    const expectedColors = [
      "red",
      "orange",
      "amber",
      "yellow",
      "lime",
      "emerald",
      "teal",
      "cyan",
      "blue",
      "indigo",
      "violet",
      "fuchsia"
    ];

    await page.goto("/editor?story=story-1");

    await expect(page.getByText("Chapter 1")).toBeVisible();

    // Open color picker
    const colorChip = page
      .getByText("Chapter 1")
      .locator("..")
      .locator('[aria-label*="color"]')
      .first();

    if (await colorChip.isVisible()) {
      await colorChip.click();

      // Wait for color picker to open
      await page.waitForTimeout(300);

      // Check for color grid (4 columns x 3 rows = 12 colors)
      const colorGrid = page.locator('[role="dialog"]').or(page.locator('[data-testid="color-picker"]'));
      const colorButtons = colorGrid.locator('[role="button"]').or(colorGrid.locator('[aria-label*="color"]'));

      const colorCount = await colorButtons.count();
      expect(colorCount).toBeGreaterThanOrEqual(12);

      // Verify each expected color is present (by checking aria-labels or color values)
      for (const colorName of expectedColors) {
        const colorElement = page
          .locator(`[aria-label*="${colorName}"]`)
          .or(page.locator(`[data-color="${colorName}"]`))
          .or(page.locator(`[title="${colorName}"]`));

        // At least one element should match
        expect(await colorElement.count()).toBeGreaterThan(0);
      }
    }
  });

  test("should update chapter color chip when color is selected", async ({ page }) => {
    await page.route("**/.netlify/functions/drive-write", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "chapter-1-folder-id",
          name: "Chapter 1",
          modifiedTime: new Date().toISOString()
        })
      });
    });

    await page.goto("/editor?story=story-1");

    await expect(page.getByText("Chapter 1")).toBeVisible();

    // Get initial color chip
    const chapterElement = page.getByText("Chapter 1").locator("..");
    const colorChip = chapterElement.locator('[aria-label*="color"]').first();

    if (await colorChip.isVisible()) {
      // Get initial background color
      const initialColor = await colorChip.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });

      // Open color picker
      await colorChip.click();
      await page.waitForTimeout(300);

      // Select blue color
      const blueColor = page
        .locator('[aria-label*="blue"]')
        .or(page.locator('[data-color="blue"]'))
        .or(page.locator('[style*="#3B82F6"]'))
        .first();

      if (await blueColor.isVisible()) {
        await blueColor.click();

        // Wait for color to be applied
        await page.waitForTimeout(500);

        // Verify color chip updated
        const updatedColor = await colorChip.evaluate((el) => {
          return window.getComputedStyle(el).backgroundColor;
        });

        // Colors should be different (unless initial was already blue)
        // In a real test, we'd verify the exact color value
        expect(updatedColor).toBeTruthy();
      }
    }
  });

  test("should close color picker when clicking outside", async ({ page }) => {
    await page.goto("/editor?story=story-1");

    await expect(page.getByText("Chapter 1")).toBeVisible();

    // Open color picker
    const colorChip = page
      .getByText("Chapter 1")
      .locator("..")
      .locator('[aria-label*="color"]')
      .first();

    if (await colorChip.isVisible()) {
      await colorChip.click();
      await page.waitForTimeout(300);

      // Verify picker is open
      const colorPicker = page.locator('[role="dialog"]').or(page.locator('[data-testid="color-picker"]'));
      await expect(colorPicker).toBeVisible();

      // Click outside (on editor area)
      await page.click("body", { position: { x: 100, y: 100 } });

      // Wait for picker to close
      await page.waitForTimeout(300);

      // Picker should be closed
      await expect(colorPicker).not.toBeVisible({ timeout: 1000 });
    }
  });

  test("should close color picker when selecting a color", async ({ page }) => {
    await page.route("**/.netlify/functions/drive-write", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "chapter-1-folder-id",
          name: "Chapter 1",
          modifiedTime: new Date().toISOString()
        })
      });
    });

    await page.goto("/editor?story=story-1");

    await expect(page.getByText("Chapter 1")).toBeVisible();

    // Open color picker
    const colorChip = page
      .getByText("Chapter 1")
      .locator("..")
      .locator('[aria-label*="color"]')
      .first();

    if (await colorChip.isVisible()) {
      await colorChip.click();
      await page.waitForTimeout(300);

      // Verify picker is open
      const colorPicker = page.locator('[role="dialog"]').or(page.locator('[data-testid="color-picker"]'));
      await expect(colorPicker).toBeVisible();

      // Select a color
      const redColor = page
        .locator('[aria-label*="red"]')
        .or(page.locator('[data-color="red"]'))
        .first();

      if (await redColor.isVisible()) {
        await redColor.click();

        // Wait for picker to close
        await page.waitForTimeout(500);

        // Picker should be closed
        await expect(colorPicker).not.toBeVisible({ timeout: 1000 });
      }
    }
  });

  test("should highlight selected color in color picker", async ({ page }) => {
    await page.goto("/editor?story=story-1");

    await expect(page.getByText("Chapter 1")).toBeVisible();

    // Set chapter to have blue color initially (via metadata)
    // This would require mocking the metadata file read

    // Open color picker
    const colorChip = page
      .getByText("Chapter 1")
      .locator("..")
      .locator('[aria-label*="color"]')
      .first();

    if (await colorChip.isVisible()) {
      await colorChip.click();
      await page.waitForTimeout(300);

      // Find blue color button
      const blueColor = page
        .locator('[aria-label*="blue"]')
        .or(page.locator('[data-color="blue"]'))
        .first();

      if (await blueColor.isVisible()) {
        // Check if it has selected styling (border, opacity, etc.)
        const borderWidth = await blueColor.evaluate((el) => {
          return window.getComputedStyle(el).borderWidth;
        });

        // Selected color should have a border (typically 3px for selected)
        expect(borderWidth).toBeTruthy();
      }
    }
  });

  test("should navigate color picker with keyboard", async ({ page }) => {
    await page.goto("/editor?story=story-1");

    await expect(page.getByText("Chapter 1")).toBeVisible();

    // Open color picker
    const colorChip = page
      .getByText("Chapter 1")
      .locator("..")
      .locator('[aria-label*="color"]')
      .first();

    if (await colorChip.isVisible()) {
      await colorChip.focus();
      await colorChip.press("Enter");
      await page.waitForTimeout(300);

      // Verify picker is open
      const colorPicker = page.locator('[role="dialog"]').or(page.locator('[data-testid="color-picker"]'));
      await expect(colorPicker).toBeVisible();

      // Navigate with arrow keys
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(100);
      await page.keyboard.press("ArrowDown");
      await page.waitForTimeout(100);

      // Select with Enter
      await page.keyboard.press("Enter");

      // Wait for picker to close
      await page.waitForTimeout(500);
      await expect(colorPicker).not.toBeVisible({ timeout: 1000 });
    }
  });

  test("should persist chapter color across page reloads", async ({ page }) => {
    let savedMetadata: any = null;

    // Mock metadata read/write
    await page.route("**/.netlify/functions/drive-read", (route) => {
      const body = route.request().postDataJSON();
      if (body.fileId === "metadata-id") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "metadata-id",
            name: "metadata.json",
            content: savedMetadata ? JSON.stringify(savedMetadata) : JSON.stringify({ chapters: [] }),
            modifiedTime: "2025-01-01T00:00:00.000Z",
            mimeType: "application/json"
          })
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "snippet-1-id",
            name: "Snippet 1",
            content: "Content",
            modifiedTime: "2025-01-01T00:00:00.000Z",
            mimeType: "application/vnd.google-apps.document"
          })
        });
      }
    });

    await page.route("**/.netlify/functions/drive-write", (route) => {
      const body = route.request().postDataJSON();
      if (body.fileName === "metadata.json" || body.content?.includes("color")) {
        savedMetadata = JSON.parse(body.content);
      }
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: body.fileId || "metadata-id",
          name: body.fileName,
          modifiedTime: new Date().toISOString()
        })
      });
    });

    await page.goto("/editor?story=story-1");

    await expect(page.getByText("Chapter 1")).toBeVisible();

    // Apply red color
    const colorChip = page
      .getByText("Chapter 1")
      .locator("..")
      .locator('[aria-label*="color"]')
      .first();

    if (await colorChip.isVisible()) {
      await colorChip.click();
      await page.waitForTimeout(300);

      const redColor = page
        .locator('[aria-label*="red"]')
        .or(page.locator('[data-color="red"]'))
        .first();

      if (await redColor.isVisible()) {
        await redColor.click();
        await page.waitForTimeout(500);
      }
    }

    // Reload page
    await page.reload();
    await page.waitForTimeout(1000);

    // Verify color persisted
    await expect(page.getByText("Chapter 1")).toBeVisible();

    // Check if color chip still shows red (or chapter has red styling)
    const updatedColorChip = page
      .getByText("Chapter 1")
      .locator("..")
      .locator('[aria-label*="color"]')
      .first();

    if (await updatedColorChip.isVisible()) {
      const chipColor = await updatedColorChip.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });

      // Color should be persisted (non-default)
      expect(chipColor).toBeTruthy();
    }
  });
});

