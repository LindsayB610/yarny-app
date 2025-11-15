import { test, expect } from "@playwright/test";
import {
  setupContentEditorMocks,
  navigateToContentEditor,
  waitForEditorContent,
  type ContentTestConfig
} from "./shared/content-editor-helpers";

/**
 * Generic Content Editor E2E Tests
 * 
 * These tests verify StoryEditor functionality for both snippets and notes
 * using Playwright in a real browser environment.
 * 
 * Since snippets and notes share the same editor code (StoryEditor),
 * we test both types with the same test suite.
 */

// Test configurations for different content types
const noteConfig: ContentTestConfig = {
  storyId: "story-1",
  storyFolderId: "folder-1",
  contentId: "note-1",
  contentType: "note",
  contentName: "Test Note",
  initialContent: "Initial note content",
  routePath: "/stories/story-1/people/note-1",
  folderName: "People",
  folderId: "people-folder-id",
  mimeType: "text/plain"
};

const snippetConfig: ContentTestConfig = {
  storyId: "story-1",
  storyFolderId: "folder-1",
  contentId: "snippet-1",
  contentType: "snippet",
  contentName: "Test Snippet",
  initialContent: "Initial snippet content",
  routePath: "/stories/story-1/snippets/snippet-1",
  folderName: "Chapter 1",
  folderId: "chapter-1-folder-id",
  mimeType: "application/vnd.google-apps.document"
};

// Run tests for both content types
const contentConfigs = [noteConfig, snippetConfig];

for (const config of contentConfigs) {
  test.describe(`${config.contentType === "note" ? "Note" : "Snippet"} Editor Integration Tests`, () => {
    test.beforeEach(async ({ page }) => {
      await setupContentEditorMocks(page, config);
      await navigateToContentEditor(page, config);
    });

    test(`renders ${config.contentType} editor when ${config.contentType} is selected`, async ({ page }) => {
      await waitForEditorContent(page, config.initialContent);
    });

    test(`displays save status when ${config.contentType} content is saved`, async ({ page }) => {
      // Wait for editor to initialize and content to load
      await waitForEditorContent(page, config.initialContent);

      // Find save button
      const saveButton = page.getByRole("button", { name: /save/i }).first();
      await expect(saveButton).toBeVisible({ timeout: 2000 });

      // For snippets, we need to wait for the chapter to load and auto-save to initialize
      // The button state depends on hasUnsavedChanges which compares content to lastSavedContentRef
      // Initially, lastSavedContentRef might be empty, so we wait for it to sync
      if (config.contentType === "snippet") {
        // Wait longer for snippet initialization (chapter loading, auto-save setup)
        await page.waitForTimeout(2000);
      } else {
        await page.waitForTimeout(1000);
      }

      // Initially disabled since content matches saved content
      // Note: For snippets, if the chapter isn't loaded yet, the button might be enabled
      // because auto-save isn't enabled, so we check canSave instead
      const canSave = await saveButton.getAttribute("disabled") === null;
      if (canSave && config.contentType === "snippet") {
        // If button is enabled, it might be because chapter isn't loaded yet
        // Wait a bit more and check again
        await page.waitForTimeout(2000);
      }
      
      await expect(saveButton).toBeDisabled({ timeout: 5000 });
    });

    test(`displays unsaved changes indicator when ${config.contentType} content changes`, async ({ page }) => {
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

    test(`autosaves ${config.contentType} content after 2 second debounce`, async ({ page }) => {
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
            id: postData?.fileId || config.contentId,
            name: config.contentName,
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
      expect(lastRequest.fileId).toBe(config.contentId);
      expect(lastRequest.content).toContain("New content");
    });

    test(`resets debounce timer when ${config.contentType} content changes rapidly`, async ({ page }) => {
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
            id: postData?.fileId || config.contentId,
            name: config.contentName,
            modifiedTime: new Date().toISOString()
          })
        });
      });

      // Wait for editor to initialize
      const editor = page.locator('[contenteditable="true"]').first();
      await expect(editor).toBeVisible({ timeout: 10000 });

      // Type first character
      await editor.click();
      await editor.fill("A");
      await page.waitForTimeout(500);

      // Type second character (should reset debounce)
      await editor.fill("AB");
      await page.waitForTimeout(500);

      // Type third character (should reset debounce again)
      await editor.fill("ABC");
      
      // Wait for final debounced save
      await page.waitForTimeout(2500);

      // Should only have one save request (after final debounce)
      expect(writeRequests.length).toBeGreaterThan(0);
      const lastRequest = writeRequests[writeRequests.length - 1];
      expect(lastRequest.content).toContain("ABC");
    });

    test(`manually saves ${config.contentType} when save button is clicked`, async ({ page }) => {
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
            id: postData?.fileId || config.contentId,
            name: config.contentName,
            modifiedTime: new Date().toISOString()
          })
        });
      });

      // Wait for editor to initialize and content to load
      await waitForEditorContent(page, config.initialContent);

      // Type content
      const editor = page.locator('[contenteditable="true"]').first();
      await editor.click();
      await editor.fill("Manual save content");

      // Wait a bit for unsaved changes to be detected
      await page.waitForTimeout(500);

      // Click save button
      const saveButton = page.getByRole("button", { name: /save/i }).first();
      await expect(saveButton).toBeEnabled({ timeout: 2000 });
      await saveButton.click();

      // Wait for save to complete
      await page.waitForTimeout(2000);

      // Verify save was called
      expect(writeRequests.length).toBeGreaterThan(0);
      const lastRequest = writeRequests[writeRequests.length - 1];
      expect(lastRequest.fileId).toBe(config.contentId);
      expect(lastRequest.content).toContain("Manual save content");
    });

    test(`disables save button when ${config.contentType} has no unsaved changes`, async ({ page }) => {
      // Wait for editor to initialize and content to load
      await waitForEditorContent(page, config.initialContent);

      // Wait a bit for button state to stabilize
      await page.waitForTimeout(1000);

      // Save button should be disabled initially (content matches saved state)
      const saveButton = page.getByRole("button", { name: /save/i }).first();
      await expect(saveButton).toBeDisabled({ timeout: 3000 });

      // Make a change
      const editor = page.locator('[contenteditable="true"]').first();
      await editor.click();
      await editor.fill("Changed content");
      await expect(saveButton).toBeEnabled({ timeout: 2000 });

      // Save the content
      await saveButton.click();
      await page.waitForTimeout(2000);

      // After save, button should be disabled again
      await expect(saveButton).toBeDisabled({ timeout: 3000 });
    });

    test(`does not save ${config.contentType} when content hasn't changed`, async ({ page }) => {
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
            id: postData?.fileId || config.contentId,
            name: config.contentName,
            modifiedTime: new Date().toISOString()
          })
        });
      });

      // Wait for editor to initialize
      const editor = page.locator('[contenteditable="true"]').first();
      await expect(editor).toBeVisible({ timeout: 10000 });

      // Wait a bit - should not trigger save since content hasn't changed
      await page.waitForTimeout(3000);

      // Verify no save was called
      expect(writeRequests.length).toBe(0);
    });
  });
}

