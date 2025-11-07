import { test, expect } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Mock Google Sign-In
    await page.route("**/accounts.google.com/**", (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({ token: "mock-google-token" })
      });
    });

    // Mock verify-google endpoint
    await page.route("**/.netlify/functions/verify-google", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          verified: true,
          user: "test@example.com",
          name: "Test User",
          picture: "https://example.com/avatar.jpg",
          token: "session-token"
        })
      });
    });
  });

  test("should display login page", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByText(/sign in with google/i)).toBeVisible();
  });

  test("should redirect to stories after successful login", async ({ page }) => {
    // Mock successful authentication
    await page.goto("/login");

    // Simulate Google Sign-In click
    await page.getByText(/sign in with google/i).click();

    // Wait for redirect to stories page
    await expect(page).toHaveURL(/\/stories/);
  });

  test("should handle authentication errors", async ({ page }) => {
    // Mock failed authentication
    await page.route("**/.netlify/functions/verify-google", (route) => {
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Unauthorized",
          message: "Invalid token"
        })
      });
    });

    await page.goto("/login");
    await page.getByText(/sign in with google/i).click();

    // Should show error or stay on login page
    await expect(page).toHaveURL(/\/login/);
  });
});

