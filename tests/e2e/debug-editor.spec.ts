import { test } from "@playwright/test";

test("debug editor error", async ({ page }) => {
  // Seed auth/session storage before the app boots
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "yarny_auth",
      JSON.stringify({ token: "debug-token" })
    );
    window.localStorage.setItem(
      "yarny_user",
      JSON.stringify({ email: "debug@example.com", token: "debug-token" })
    );
    window.localStorage.setItem(
      "yarny_current_story",
      JSON.stringify({ id: "placeholder-story" })
    );
  });

  page.on("console", (message) => {
    // eslint-disable-next-line no-console
    console.log(`console(${message.type()}): ${message.text()}`);
  });

  await page.goto("/editor");

  await page.waitForTimeout(5000);
});
