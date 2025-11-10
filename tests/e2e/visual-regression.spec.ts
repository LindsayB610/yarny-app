import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

// Helper function to compare two images and generate a diff
async function compareImages(
  image1Path: string,
  image2Path: string,
  diffPath: string,
  threshold: number = 0.1 // 10% difference threshold
): Promise<{ diffPixels: number; diffPercentage: number }> {
  const img1 = PNG.sync.read(readFileSync(image1Path));
  const img2 = PNG.sync.read(readFileSync(image2Path));

  // Ensure images are the same size
  if (img1.width !== img2.width || img1.height !== img2.height) {
    throw new Error(
      `Image dimensions don't match: ${img1.width}x${img1.height} vs ${img2.width}x${img2.height}`
    );
  }

  const diff = new PNG({ width: img1.width, height: img1.height });
  const numDiffPixels = pixelmatch(
    img1.data,
    img2.data,
    diff.data,
    img1.width,
    img1.height,
    {
      threshold: 0.1, // Per-pixel threshold
      alpha: 0.1, // Alpha channel threshold
      diffColor: [255, 0, 0], // Red for differences
      diffColorAlt: [0, 0, 255] // Blue for differences (alternative)
    }
  );

  const totalPixels = img1.width * img1.height;
  const diffPercentage = (numDiffPixels / totalPixels) * 100;

  // Write diff image
  mkdirSync(join(diffPath, ".."), { recursive: true });
  writeFileSync(diffPath, PNG.sync.write(diff));

  return { diffPixels: numDiffPixels, diffPercentage };
}

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

test.describe("Visual Regression - React vs Legacy Comparison", () => {
  const screenshotsDir = "test-results/visual-regression";
  const maxDiffPercentage = 5; // Maximum allowed difference percentage

  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      Object.defineProperty(document, "cookie", {
        writable: true,
        value: "yarny_session=test-session"
      });
    });

    // Mock story data for both apps
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
          content: "Test content for visual comparison",
          modifiedTime: "2025-01-01T00:00:00.000Z",
          mimeType: "application/vnd.google-apps.document"
        })
      });
    });

    // Create screenshots directory
    mkdirSync(screenshotsDir, { recursive: true });
  });

  test("should compare goal meter between React and legacy apps", async ({ page }) => {
    const reactPath = join(screenshotsDir, "react-goal-meter.png");
    const legacyPath = join(screenshotsDir, "legacy-goal-meter.png");
    const diffPath = join(screenshotsDir, "diff-goal-meter.png");

    // Take screenshot of React app goal meter
    await page.goto("/editor");
    await page.waitForSelector('[contenteditable="true"]', { timeout: 10000 });
    await page.waitForTimeout(500); // Wait for any animations
    
    const reactGoalMeter = page.locator('[role="progressbar"]').first();
    const reactVisible = await reactGoalMeter.isVisible();
    expect(reactVisible).toBeTruthy();
    
    await reactGoalMeter.screenshot({ path: reactPath });

    // Take screenshot of legacy app goal meter
    await page.goto("/editor.html");
    await page.waitForSelector('[contenteditable="true"]', { timeout: 10000 });
    await page.waitForTimeout(500); // Wait for any animations
    
    const legacyGoalMeter = page.locator('.goal-meter').first();
    const legacyVisible = await legacyGoalMeter.isVisible();
    expect(legacyVisible).toBeTruthy();
    
    await legacyGoalMeter.screenshot({ path: legacyPath });

    // Compare images with pixel-diff
    const { diffPixels, diffPercentage } = await compareImages(
      reactPath,
      legacyPath,
      diffPath,
      0.1
    );

    console.log(`Goal Meter - Diff pixels: ${diffPixels}, Diff percentage: ${diffPercentage.toFixed(2)}%`);

    // Fail if difference exceeds threshold
    expect(diffPercentage).toBeLessThanOrEqual(maxDiffPercentage);
  });

  test("should compare Today chip between React and legacy apps", async ({ page }) => {
    const reactPath = join(screenshotsDir, "react-today-chip.png");
    const legacyPath = join(screenshotsDir, "legacy-today-chip.png");
    const diffPath = join(screenshotsDir, "diff-today-chip.png");

    // Take screenshot of React app Today chip
    await page.goto("/editor");
    await page.waitForSelector('[contenteditable="true"]', { timeout: 10000 });
    await page.waitForTimeout(500);
    
    const reactTodayChip = page.locator('[data-testid="today-chip"], .today-chip').first();
    const reactVisible = await reactTodayChip.isVisible();
    expect(reactVisible).toBeTruthy();
    
    await reactTodayChip.screenshot({ path: reactPath });

    // Take screenshot of legacy app Today chip
    await page.goto("/editor.html");
    await page.waitForSelector('[contenteditable="true"]', { timeout: 10000 });
    await page.waitForTimeout(500);
    
    const legacyTodayChip = page.locator('.today-chip').first();
    const legacyVisible = await legacyTodayChip.isVisible();
    expect(legacyVisible).toBeTruthy();
    
    await legacyTodayChip.screenshot({ path: legacyPath });

    // Compare images with pixel-diff
    const { diffPixels, diffPercentage } = await compareImages(
      reactPath,
      legacyPath,
      diffPath,
      0.1
    );

    console.log(`Today Chip - Diff pixels: ${diffPixels}, Diff percentage: ${diffPercentage.toFixed(2)}%`);

    // Fail if difference exceeds threshold
    expect(diffPercentage).toBeLessThanOrEqual(maxDiffPercentage);
  });

  test("should compare footer counts between React and legacy apps", async ({ page }) => {
    const reactPath = join(screenshotsDir, "react-footer.png");
    const legacyPath = join(screenshotsDir, "legacy-footer.png");
    const diffPath = join(screenshotsDir, "diff-footer.png");

    // Take screenshot of React app footer
    await page.goto("/editor");
    await page.waitForSelector('[contenteditable="true"]', { timeout: 10000 });
    await page.waitForTimeout(500);
    
    const reactFooter = page.locator('footer, [role="contentinfo"]').first();
    const reactVisible = await reactFooter.isVisible();
    expect(reactVisible).toBeTruthy();
    
    await reactFooter.screenshot({ path: reactPath });

    // Take screenshot of legacy app footer
    await page.goto("/editor.html");
    await page.waitForSelector('[contenteditable="true"]', { timeout: 10000 });
    await page.waitForTimeout(500);
    
    const legacyFooter = page.locator('.editor-footer, footer').first();
    const legacyVisible = await legacyFooter.isVisible();
    expect(legacyVisible).toBeTruthy();
    
    await legacyFooter.screenshot({ path: legacyPath });

    // Compare images with pixel-diff
    const { diffPixels, diffPercentage } = await compareImages(
      reactPath,
      legacyPath,
      diffPath,
      0.1
    );

    console.log(`Footer - Diff pixels: ${diffPixels}, Diff percentage: ${diffPercentage.toFixed(2)}%`);

    // Fail if difference exceeds threshold
    expect(diffPercentage).toBeLessThanOrEqual(maxDiffPercentage);
  });

  test("should compare stories page between React and legacy apps", async ({ page }) => {
    const reactPath = join(screenshotsDir, "react-stories-page.png");
    const legacyPath = join(screenshotsDir, "legacy-stories-page.png");
    const diffPath = join(screenshotsDir, "diff-stories-page.png");

    // Take screenshot of React app stories page
    await page.goto("/stories");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    await page.screenshot({
      path: reactPath,
      fullPage: true
    });

    // Take screenshot of legacy app stories page
    await page.goto("/stories.html");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    await page.screenshot({
      path: legacyPath,
      fullPage: true
    });

    // Compare images with pixel-diff
    const { diffPixels, diffPercentage } = await compareImages(
      reactPath,
      legacyPath,
      diffPath,
      0.1
    );

    console.log(`Stories Page - Diff pixels: ${diffPixels}, Diff percentage: ${diffPercentage.toFixed(2)}%`);

    // For full page comparisons, allow slightly higher threshold
    expect(diffPercentage).toBeLessThanOrEqual(maxDiffPercentage * 2);
  });

  test("should compare editor layout between React and legacy apps", async ({ page }) => {
    const reactPath = join(screenshotsDir, "react-editor.png");
    const legacyPath = join(screenshotsDir, "legacy-editor.png");
    const diffPath = join(screenshotsDir, "diff-editor.png");

    // Take screenshot of React app editor
    await page.goto("/editor");
    await page.waitForSelector('[contenteditable="true"]', { timeout: 10000 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: reactPath,
      fullPage: true
    });

    // Take screenshot of legacy app editor
    await page.goto("/editor.html");
    await page.waitForSelector('[contenteditable="true"]', { timeout: 10000 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: legacyPath,
      fullPage: true
    });

    // Compare images with pixel-diff
    const { diffPixels, diffPercentage } = await compareImages(
      reactPath,
      legacyPath,
      diffPath,
      0.1
    );

    console.log(`Editor Layout - Diff pixels: ${diffPixels}, Diff percentage: ${diffPercentage.toFixed(2)}%`);

    // For full page comparisons, allow slightly higher threshold
    expect(diffPercentage).toBeLessThanOrEqual(maxDiffPercentage * 2);
  });
});

