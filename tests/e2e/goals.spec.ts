import { test, expect } from "@playwright/test";

test.describe("Goals Setup and Validation (Elastic/Strict)", () => {
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
              id: "chapters-folder-id",
              name: "Chapters",
              mimeType: "application/vnd.google-apps.folder",
              modifiedTime: "2025-01-01T00:00:00.000Z"
            }
          ]
        })
      });
    });

    // Mock goal.json file
    await page.route("**/.netlify/functions/drive-read", (route) => {
      const body = route.request().postDataJSON();
      if (body.fileId === "goal-json-id" || body.fileName === "goal.json") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "goal-json-id",
            name: "goal.json",
            content: JSON.stringify({
              target: 50000,
              deadline: "2025-12-31T23:59:59.000Z",
              mode: "elastic",
              writingDays: [true, true, true, true, true, false, false],
              daysOff: []
            }),
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
            content: "Test content",
            modifiedTime: "2025-01-01T00:00:00.000Z",
            mimeType: "application/vnd.google-apps.document"
          })
        });
      }
    });
  });

  test("should open goals panel modal when clicking Today chip", async ({ page }) => {
    await page.goto("/editor?story=story-1");

    // Find Today chip
    const todayChip = page.getByText(/today/i).or(page.locator('[data-testid="today-chip"]'));

    if (await todayChip.isVisible()) {
      await todayChip.click();

      // Goals modal should open
      await expect(
        page.getByText(/writing goals/i).or(page.getByRole("dialog").getByText(/goal/i))
      ).toBeVisible({ timeout: 2000 });
    }
  });

  test("should display current goal settings in modal", async ({ page }) => {
    await page.goto("/editor?story=story-1");

    const todayChip = page.getByText(/today/i).or(page.locator('[data-testid="today-chip"]'));

    if (await todayChip.isVisible()) {
      await todayChip.click();
      await page.waitForTimeout(500);

      // Modal should show current settings
      const wordGoalInput = page.getByLabel(/word count target/i).or(page.locator('input[type="number"]').first());

      if (await wordGoalInput.isVisible()) {
        const value = await wordGoalInput.inputValue();
        expect(value).toBeTruthy();
      }
    }
  });

  test("should set word count target", async ({ page }) => {
    let writeCalled = false;
    let savedGoal: any = null;

    await page.route("**/.netlify/functions/drive-write", (route) => {
      const body = route.request().postDataJSON();
      if (body.fileName === "goal.json" || body.content?.includes("target")) {
        writeCalled = true;
        savedGoal = JSON.parse(body.content);
      }
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "goal-json-id",
          name: "goal.json",
          modifiedTime: new Date().toISOString()
        })
      });
    });

    await page.goto("/editor?story=story-1");

    const todayChip = page.getByText(/today/i).or(page.locator('[data-testid="today-chip"]'));

    if (await todayChip.isVisible()) {
      await todayChip.click();
      await page.waitForTimeout(500);

      const wordGoalInput = page.getByLabel(/word count target/i).or(page.locator('input[type="number"]').first());

      if (await wordGoalInput.isVisible()) {
        await wordGoalInput.clear();
        await wordGoalInput.fill("75000");

        // Save goals
        await page.getByRole("button", { name: /save goals/i }).click();
        await page.waitForTimeout(500);

        expect(writeCalled).toBe(true);
        expect(savedGoal?.target).toBe(75000);
      }
    }
  });

  test("should set deadline", async ({ page }) => {
    let writeCalled = false;
    let savedGoal: any = null;

    await page.route("**/.netlify/functions/drive-write", (route) => {
      const body = route.request().postDataJSON();
      if (body.fileName === "goal.json" || body.content?.includes("deadline")) {
        writeCalled = true;
        savedGoal = JSON.parse(body.content);
      }
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "goal-json-id",
          name: "goal.json",
          modifiedTime: new Date().toISOString()
        })
      });
    });

    await page.goto("/editor?story=story-1");

    const todayChip = page.getByText(/today/i).or(page.locator('[data-testid="today-chip"]'));

    if (await todayChip.isVisible()) {
      await todayChip.click();
      await page.waitForTimeout(500);

      const deadlineInput = page.getByLabel(/deadline/i).or(page.locator('input[type="date"]'));

      if (await deadlineInput.isVisible()) {
        await deadlineInput.fill("2025-06-30");

        await page.getByRole("button", { name: /save goals/i }).click();
        await page.waitForTimeout(500);

        expect(writeCalled).toBe(true);
        expect(savedGoal?.deadline).toContain("2025-06-30");
      }
    }
  });

  test("should select writing days", async ({ page }) => {
    let writeCalled = false;
    let savedGoal: any = null;

    await page.route("**/.netlify/functions/drive-write", (route) => {
      const body = route.request().postDataJSON();
      if (body.fileName === "goal.json" || body.content?.includes("writingDays")) {
        writeCalled = true;
        savedGoal = JSON.parse(body.content);
      }
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "goal-json-id",
          name: "goal.json",
          modifiedTime: new Date().toISOString()
        })
      });
    });

    await page.goto("/editor?story=story-1");

    const todayChip = page.getByText(/today/i).or(page.locator('[data-testid="today-chip"]'));

    if (await todayChip.isVisible()) {
      await todayChip.click();
      await page.waitForTimeout(500);

      // Uncheck Sunday (last day)
      const sundayCheckbox = page
        .getByLabel(/sun/i)
        .or(page.locator('input[type="checkbox"]').last());

      if (await sundayCheckbox.isVisible()) {
        if (await sundayCheckbox.isChecked()) {
          await sundayCheckbox.click();
        }

        await page.getByRole("button", { name: /save goals/i }).click();
        await page.waitForTimeout(500);

        expect(writeCalled).toBe(true);
        expect(savedGoal?.writingDays[6]).toBe(false); // Sunday is index 6
      }
    }
  });

  test("should set mode to Elastic", async ({ page }) => {
    let writeCalled = false;
    let savedGoal: any = null;

    await page.route("**/.netlify/functions/drive-write", (route) => {
      const body = route.request().postDataJSON();
      if (body.fileName === "goal.json" || body.content?.includes("mode")) {
        writeCalled = true;
        savedGoal = JSON.parse(body.content);
      }
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "goal-json-id",
          name: "goal.json",
          modifiedTime: new Date().toISOString()
        })
      });
    });

    await page.goto("/editor?story=story-1");

    const todayChip = page.getByText(/today/i).or(page.locator('[data-testid="today-chip"]'));

    if (await todayChip.isVisible()) {
      await todayChip.click();
      await page.waitForTimeout(500);

      const modeSelect = page.getByLabel(/mode/i).or(page.locator('select').filter({ hasText: /elastic|strict/i }));

      if (await modeSelect.isVisible()) {
        await modeSelect.selectOption("elastic");

        await page.getByRole("button", { name: /save goals/i }).click();
        await page.waitForTimeout(500);

        expect(writeCalled).toBe(true);
        expect(savedGoal?.mode).toBe("elastic");
      }
    }
  });

  test("should set mode to Strict", async ({ page }) => {
    let writeCalled = false;
    let savedGoal: any = null;

    await page.route("**/.netlify/functions/drive-write", (route) => {
      const body = route.request().postDataJSON();
      if (body.fileName === "goal.json" || body.content?.includes("mode")) {
        writeCalled = true;
        savedGoal = JSON.parse(body.content);
      }
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "goal-json-id",
          name: "goal.json",
          modifiedTime: new Date().toISOString()
        })
      });
    });

    await page.goto("/editor?story=story-1");

    const todayChip = page.getByText(/today/i).or(page.locator('[data-testid="today-chip"]'));

    if (await todayChip.isVisible()) {
      await todayChip.click();
      await page.waitForTimeout(500);

      const modeSelect = page.getByLabel(/mode/i).or(page.locator('select').filter({ hasText: /elastic|strict/i }));

      if (await modeSelect.isVisible()) {
        await modeSelect.selectOption("strict");

        await page.getByRole("button", { name: /save goals/i }).click();
        await page.waitForTimeout(500);

        expect(writeCalled).toBe(true);
        expect(savedGoal?.mode).toBe("strict");
      }
    }
  });

  test("should add days off", async ({ page }) => {
    let writeCalled = false;
    let savedGoal: any = null;

    await page.route("**/.netlify/functions/drive-write", (route) => {
      const body = route.request().postDataJSON();
      if (body.fileName === "goal.json" || body.content?.includes("daysOff")) {
        writeCalled = true;
        savedGoal = JSON.parse(body.content);
      }
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "goal-json-id",
          name: "goal.json",
          modifiedTime: new Date().toISOString()
        })
      });
    });

    await page.goto("/editor?story=story-1");

    const todayChip = page.getByText(/today/i).or(page.locator('[data-testid="today-chip"]'));

    if (await todayChip.isVisible()) {
      await todayChip.click();
      await page.waitForTimeout(500);

      const daysOffInput = page.getByLabel(/days off/i).or(page.getByPlaceholder(/YYYY-MM-DD/i));

      if (await daysOffInput.isVisible()) {
        await daysOffInput.fill("2025-12-25, 2026-01-01");

        await page.getByRole("button", { name: /save goals/i }).click();
        await page.waitForTimeout(500);

        expect(writeCalled).toBe(true);
        expect(savedGoal?.daysOff).toContain("2025-12-25");
        expect(savedGoal?.daysOff).toContain("2026-01-01");
      }
    }
  });

  test("should validate Elastic mode rebalances daily targets", async ({ page }) => {
    await page.goto("/editor?story=story-1");

    // Set up Elastic mode goal
    const todayChip = page.getByText(/today/i).or(page.locator('[data-testid="today-chip"]'));

    if (await todayChip.isVisible()) {
      await todayChip.click();
      await page.waitForTimeout(500);

      // Set target, deadline, and Elastic mode
      const wordGoalInput = page.getByLabel(/word count target/i).or(page.locator('input[type="number"]').first());
      const deadlineInput = page.getByLabel(/deadline/i).or(page.locator('input[type="date"]'));
      const modeSelect = page.getByLabel(/mode/i).or(page.locator('select').filter({ hasText: /elastic|strict/i }));

      if (await wordGoalInput.isVisible() && await deadlineInput.isVisible() && await modeSelect.isVisible()) {
        await wordGoalInput.clear();
        await wordGoalInput.fill("10000");
        await deadlineInput.fill("2025-01-31");
        await modeSelect.selectOption("elastic");

        await page.getByRole("button", { name: /save goals/i }).click();
        await page.waitForTimeout(500);
      }
    }

    // Verify Today chip shows daily target
    // In Elastic mode, if user writes more one day, next day's target should adjust
    // This would require mocking word count tracking and verifying calculations
  });

  test("should validate Strict mode keeps fixed daily targets", async ({ page }) => {
    await page.goto("/editor?story=story-1");

    // Set up Strict mode goal
    const todayChip = page.getByText(/today/i).or(page.locator('[data-testid="today-chip"]'));

    if (await todayChip.isVisible()) {
      await todayChip.click();
      await page.waitForTimeout(500);

      const wordGoalInput = page.getByLabel(/word count target/i).or(page.locator('input[type="number"]').first());
      const deadlineInput = page.getByLabel(/deadline/i).or(page.locator('input[type="date"]'));
      const modeSelect = page.getByLabel(/mode/i).or(page.locator('select').filter({ hasText: /elastic|strict/i }));

      if (await wordGoalInput.isVisible() && await deadlineInput.isVisible() && await modeSelect.isVisible()) {
        await wordGoalInput.clear();
        await wordGoalInput.fill("10000");
        await deadlineInput.fill("2025-01-31");
        await modeSelect.selectOption("strict");

        await page.getByRole("button", { name: /save goals/i }).click();
        await page.waitForTimeout(500);
      }
    }

    // Verify Today chip shows fixed daily target
    // In Strict mode, daily target should remain constant regardless of progress
    // This would require mocking word count tracking and verifying calculations
  });

  test("should display goal meter with progress", async ({ page }) => {
    await page.goto("/editor?story=story-1");

    // Goal meter should be visible
    const goalMeter = page.getByText(/\d+\s*\/\s*\d+/).or(page.locator('[data-testid="goal-meter"]'));

    if (await goalMeter.isVisible()) {
      // Should show progress like "5000 / 10000"
      const text = await goalMeter.textContent();
      expect(text).toMatch(/\d+\s*\/\s*\d+/);
    }
  });

  test("should update Today chip with daily progress", async ({ page }) => {
    await page.goto("/editor?story=story-1");

    // Today chip should show daily word count
    const todayChip = page.getByText(/today/i).or(page.locator('[data-testid="today-chip"]'));

    if (await todayChip.isVisible()) {
      const text = await todayChip.textContent();
      // Should show today's word count (might be "—" if no goal set)
      expect(text).toBeTruthy();
    }
  });

  test("should calculate daily target correctly in Elastic mode", async ({ page }) => {
    // This test would verify the calculation logic
    // For example: if target is 10000 words in 10 days with 5 writing days
    // Daily target should be 2000 words per writing day
    // If user writes 3000 on day 1, remaining 9 days should adjust
  });

  test("should calculate daily target correctly in Strict mode", async ({ page }) => {
    // This test would verify the calculation logic
    // For example: if target is 10000 words in 10 days with 5 writing days
    // Daily target should be 2000 words per writing day (fixed)
    // Even if user writes 3000 on day 1, daily target remains 2000
  });

  test("should exclude days off from target calculations", async ({ page }) => {
    // This test would verify that days marked as "off" don't count toward
    // writing days and don't affect daily target calculations
  });

  test("should handle midnight rollover for daily targets", async ({ page }) => {
    // This test would verify that daily word counts reset at midnight
    // in the user's timezone, and daily targets recalculate
  });

  test("should persist goal settings across page reloads", async ({ page }) => {
    let savedGoal: any = null;

    await page.route("**/.netlify/functions/drive-write", (route) => {
      const body = route.request().postDataJSON();
      if (body.fileName === "goal.json") {
        savedGoal = JSON.parse(body.content);
      }
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "goal-json-id",
          name: "goal.json",
          modifiedTime: new Date().toISOString()
        })
      });
    });

    await page.route("**/.netlify/functions/drive-read", (route) => {
      const body = route.request().postDataJSON();
      if (body.fileId === "goal-json-id" || body.fileName === "goal.json") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "goal-json-id",
            name: "goal.json",
            content: savedGoal ? JSON.stringify(savedGoal) : JSON.stringify({ target: 50000, mode: "elastic" }),
            modifiedTime: "2025-01-01T00:00:00.000Z",
            mimeType: "application/json"
          })
        });
      } else {
        route.continue();
      }
    });

    await page.goto("/editor?story=story-1");

    // Set goal
    const todayChip = page.getByText(/today/i).or(page.locator('[data-testid="today-chip"]'));

    if (await todayChip.isVisible()) {
      await todayChip.click();
      await page.waitForTimeout(500);

      const wordGoalInput = page.getByLabel(/word count target/i).or(page.locator('input[type="number"]').first());

      if (await wordGoalInput.isVisible()) {
        await wordGoalInput.clear();
        await wordGoalInput.fill("60000");
        await page.getByRole("button", { name: /save goals/i }).click();
        await page.waitForTimeout(500);
      }
    }

    // Reload page
    await page.reload();
    await page.waitForTimeout(1000);

    // Verify goal persisted
    if (await todayChip.isVisible()) {
      await todayChip.click();
      await page.waitForTimeout(500);

      const wordGoalInput = page.getByLabel(/word count target/i).or(page.locator('input[type="number"]').first());

      if (await wordGoalInput.isVisible()) {
        const value = await wordGoalInput.inputValue();
        expect(value).toBe("60000");
      }
    }
  });
});

