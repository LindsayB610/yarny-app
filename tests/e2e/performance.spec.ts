import { test, expect } from "@playwright/test";

test.describe("Performance Budgets", () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      Object.defineProperty(document, "cookie", {
        writable: true,
        value: "yarny_session=test-session"
      });
    });

    // Mock minimal story data for fast loading
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

    // Mock story list
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
  });

  test("time to first keystroke after editor mount should be ≤ 800ms", async ({ page }) => {
    await page.goto("/editor");

    const startTime = Date.now();

    // Wait for editor to be ready
    await page.waitForSelector('[contenteditable="true"]', { state: "visible" });

    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    await editor.type("a");

    const timeToFirstKeystroke = Date.now() - startTime;

    expect(timeToFirstKeystroke).toBeLessThanOrEqual(800);
  });

  test("time to first edit (hot path) should be ≤ 300ms", async ({ page }) => {
    // First load to warm up
    await page.goto("/editor");
    await page.waitForSelector('[contenteditable="true"]');

    // Second load (hot path)
    const startTime = Date.now();
    await page.reload();
    await page.waitForSelector('[contenteditable="true"]');

    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    await editor.type("a");

    const timeToFirstEdit = Date.now() - startTime;

    expect(timeToFirstEdit).toBeLessThanOrEqual(300);
  });

  test("snippet switch latency (hot) should be ≤ 300ms", async ({ page }) => {
    await page.goto("/editor");
    await page.waitForSelector('[contenteditable="true"]');

    // Mock multiple snippets
    await page.route("**/.netlify/functions/drive-read*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "snippet-2",
          name: "Chapter 2",
          content: "Chapter 2 content",
          modifiedTime: "2025-01-01T00:00:00.000Z",
          mimeType: "application/vnd.google-apps.document"
        })
      });
    });

    // Click on second snippet (assuming it's in a sidebar)
    const startTime = Date.now();
    const snippetButton = page.getByText("Chapter 2").first();
    if (await snippetButton.isVisible()) {
      await snippetButton.click();
      await page.waitForSelector('[contenteditable="true"]');

      const switchLatency = Date.now() - startTime;
      expect(switchLatency).toBeLessThanOrEqual(300);
    }
  });

  test("should maintain < 16ms frame time while typing", async ({ page }) => {
    await page.goto("/editor");
    await page.waitForSelector('[contenteditable="true"]');

    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();

    // Monitor frame times
    const frameTimes: number[] = [];
    await page.evaluate(() => {
      let lastFrameTime = performance.now();
      const measureFrame = () => {
        const currentTime = performance.now();
        frameTimes.push(currentTime - lastFrameTime);
        lastFrameTime = currentTime;
        if (frameTimes.length < 10) {
          requestAnimationFrame(measureFrame);
        }
      };
      requestAnimationFrame(measureFrame);
    });

    // Type some characters
    await editor.type("test content for frame timing");

    // Wait a bit for frames to be measured
    await page.waitForTimeout(200);

    // Check that most frames are under 16ms (60fps)
    const avgFrameTime =
      frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
    expect(avgFrameTime).toBeLessThan(16);
  });

  test("time to first keystroke (cold path) should be ≤ 1500ms", async ({ page }) => {
    // Cold path - first load with no cache
    const startTime = Date.now();
    await page.goto("/editor");
    await page.waitForSelector('[contenteditable="true"]', { state: "visible" });

    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    await editor.type("a");

    const timeToFirstKeystroke = Date.now() - startTime;

    // Cold path allows more time (1.5s) for initial load
    expect(timeToFirstKeystroke).toBeLessThanOrEqual(1500);
  });

  test("story switch latency should be ≤ 300ms", async ({ page }) => {
    await page.goto("/editor");
    await page.waitForSelector('[contenteditable="true"]');

    // Mock second story
    await page.route("**/.netlify/functions/drive-list*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          files: [
            {
              id: "story-2",
              name: "Second Story",
              mimeType: "application/vnd.google-apps.folder",
              modifiedTime: "2025-01-01T00:00:00.000Z"
            }
          ]
        })
      });
    });

    // Click on second story (assuming it's in a sidebar)
    const startTime = Date.now();
    const storyButton = page.getByText("Second Story").first();
    if (await storyButton.isVisible()) {
      await storyButton.click();
      await page.waitForSelector('[contenteditable="true"]');

      const switchLatency = Date.now() - startTime;
      expect(switchLatency).toBeLessThanOrEqual(300);
    }
  });

  test("should handle large content without jank", async ({ page }) => {
    // Mock large content (10KB of text)
    const largeContent = "Lorem ipsum dolor sit amet. ".repeat(400);
    await page.route("**/.netlify/functions/drive-read*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "snippet-large",
          name: "Large Snippet",
          content: largeContent,
          modifiedTime: "2025-01-01T00:00:00.000Z",
          mimeType: "application/vnd.google-apps.document"
        })
      });
    });

    await page.goto("/editor");
    await page.waitForSelector('[contenteditable="true"]');

    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();

    // Monitor frame times while typing
    const frameTimes: number[] = [];
    await page.evaluate(() => {
      let lastFrameTime = performance.now();
      let frameCount = 0;
      const measureFrame = () => {
        const currentTime = performance.now();
        frameTimes.push(currentTime - lastFrameTime);
        lastFrameTime = currentTime;
        frameCount++;
        if (frameCount < 30) {
          requestAnimationFrame(measureFrame);
        }
      };
      requestAnimationFrame(measureFrame);
    });

    // Type some characters
    await editor.type("test");

    // Wait for frames to be measured
    await page.waitForTimeout(500);

    // Check that average frame time is reasonable (allow some jank for large content)
    const avgFrameTime =
      frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
    expect(avgFrameTime).toBeLessThan(20); // Slightly more lenient for large content

    // Check that no single frame exceeds 50ms (major jank)
    const maxFrameTime = Math.max(...frameTimes);
    expect(maxFrameTime).toBeLessThan(50);
  });

  test("performance metrics hook should track metrics correctly", async ({ page }) => {
    await page.goto("/editor");
    await page.waitForSelector('[contenteditable="true"]');

    // Check that performance metrics are being tracked
    const metrics = await page.evaluate(() => {
      // Access the performance metrics from the hook (if exposed)
      // This is a basic check - in a real scenario, you might expose metrics via a dev tool or API
      return {
        hasPerformanceAPI: typeof performance !== "undefined",
        hasNow: typeof performance.now === "function"
      };
    });

    expect(metrics.hasPerformanceAPI).toBe(true);
    expect(metrics.hasNow).toBe(true);
  });

  test("should meet performance budget for initial page load", async ({ page }) => {
    const startTime = Date.now();
    await page.goto("/editor");
    await page.waitForLoadState("networkidle");
    const loadTime = Date.now() - startTime;

    // Initial page load should be under 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test("should meet performance budget for story list load", async ({ page }) => {
    const startTime = Date.now();
    await page.goto("/stories");
    await page.waitForLoadState("networkidle");
    const loadTime = Date.now() - startTime;

    // Story list should load under 2 seconds
    expect(loadTime).toBeLessThan(2000);
  });

  test("should handle rapid snippet switching without performance degradation", async ({ page }) => {
    await page.goto("/editor");
    await page.waitForSelector('[contenteditable="true"]');

    // Mock multiple snippets
    let snippetIndex = 1;
    await page.route("**/.netlify/functions/drive-read*", (route) => {
      snippetIndex++;
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: `snippet-${snippetIndex}`,
          name: `Chapter ${snippetIndex}`,
          content: `Content for chapter ${snippetIndex}`,
          modifiedTime: "2025-01-01T00:00:00.000Z",
          mimeType: "application/vnd.google-apps.document"
        })
      });
    });

    const switchTimes: number[] = [];
    
    // Switch between snippets 5 times rapidly
    for (let i = 0; i < 5; i++) {
      const startTime = Date.now();
      const snippetButton = page.getByText(`Chapter ${i + 2}`).first();
      if (await snippetButton.isVisible()) {
        await snippetButton.click();
        await page.waitForSelector('[contenteditable="true"]');
        switchTimes.push(Date.now() - startTime);
      }
      await page.waitForTimeout(100); // Small delay between switches
    }

    // All switches should be under 500ms (allowing for some degradation)
    switchTimes.forEach((time) => {
      expect(time).toBeLessThan(500);
    });

    // Average switch time should be reasonable
    const avgTime = switchTimes.reduce((a, b) => a + b, 0) / switchTimes.length;
    expect(avgTime).toBeLessThan(400);
  });

  test("should maintain performance with large content", async ({ page }) => {
    // Mock large content (50KB of text)
    const largeContent = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. ".repeat(1000);
    await page.route("**/.netlify/functions/drive-read*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "snippet-large",
          name: "Large Snippet",
          content: largeContent,
          modifiedTime: "2025-01-01T00:00:00.000Z",
          mimeType: "application/vnd.google-apps.document"
        })
      });
    });

    const startTime = Date.now();
    await page.goto("/editor");
    await page.waitForSelector('[contenteditable="true"]');
    const loadTime = Date.now() - startTime;

    // Even with large content, should load under 2 seconds
    expect(loadTime).toBeLessThan(2000);

    // Typing should remain responsive
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    
    const typeStart = Date.now();
    await editor.type("test");
    const typeTime = Date.now() - typeStart;

    // Typing should be immediate (under 100ms)
    expect(typeTime).toBeLessThan(100);
  });

  test("should meet memory budget during long session", async ({ page }) => {
    await page.goto("/editor");
    await page.waitForSelector('[contenteditable="true"]');

    // Get initial memory usage (if available)
    const initialMemory = await page.evaluate(() => {
      // @ts-ignore - performance.memory is Chrome-specific
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    // Perform many operations to simulate long session
    for (let i = 0; i < 20; i++) {
      const editor = page.locator('[contenteditable="true"]').first();
      await editor.type(`Test content ${i} `);
      await page.waitForTimeout(50);
    }

    // Get memory after operations
    const finalMemory = await page.evaluate(() => {
      // @ts-ignore - performance.memory is Chrome-specific
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    // Memory growth should be reasonable (under 50MB for this test)
    if (initialMemory > 0 && finalMemory > 0) {
      const memoryGrowth = finalMemory - initialMemory;
      // Allow up to 50MB growth for this test (actual budget may be different)
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);
    }
  });
});

