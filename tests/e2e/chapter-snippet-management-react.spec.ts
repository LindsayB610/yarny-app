import { test, expect } from "@playwright/test";

import {
  getReactEditor,
  navigateToReactEditor,
  setupReactAppMocks,
  waitForStoryLoad
} from "../utils/react-app-helpers";

const mockStoryData = {
  projectId: "project-1",
  storyId: "story-1",
  storyTitle: "Library Demo Story",
  chapters: [
    {
      id: "chapter-1",
      title: "Opening Setup",
      color: "#6D4AFF",
      snippets: [
        {
          id: "snippet-1",
          title: "Opening Scene",
          content: "Opening Scene\nThe hero wakes up to a mysterious letter."
        },
        {
          id: "snippet-2",
          title: "Second Scene",
          content: "Second Scene\nA rival character is introduced in the marketplace."
        }
      ]
    },
    {
      id: "chapter-2",
      title: "Rising Action",
      color: "#22C55E",
      snippets: [
        {
          id: "snippet-3",
          title: "Decision Point",
          content: "Decision Point\nThe hero decides to embark on the quest."
        }
      ]
    }
  ]
} as const;

test.describe.skip("Chapter & Snippet Management (React)", () => {
  test.beforeEach(async ({ page }) => {
    await setupReactAppMocks(page, mockStoryData);
  });

  test("renders chapters with snippet metadata from normalized payload", async ({ page }) => {
    await navigateToReactEditor(page, mockStoryData.storyId, mockStoryData.storyTitle);
    await waitForStoryLoad(page, mockStoryData.storyTitle);

    await expect(page.getByText("Opening Setup")).toBeVisible();
    await expect(page.getByText("Rising Action")).toBeVisible();

    await expect(page.getByText("Opening Scene")).toBeVisible();
    await expect(page.getByText("Second Scene")).toBeVisible();
    await expect(page.getByText("Decision Point")).toBeVisible();

    await expect(page.getByText("2 snippets")).toBeVisible();
    await expect(page.getByText("1 snippet")).toBeVisible();

    await expect(page.getByTestId("chapter-color-chapter-1")).toBeVisible();
    await expect(page.getByTestId("chapter-color-chapter-2")).toBeVisible();
  });

  test("loads snippet content into editor when snippet is selected", async ({ page }) => {
    await navigateToReactEditor(page, mockStoryData.storyId, mockStoryData.storyTitle);
    await waitForStoryLoad(page, mockStoryData.storyTitle);

    const editor = await getReactEditor(page);
    await editor.waitFor({ state: "visible" });

    await expect(editor).toContainText("Opening Scene");

    await page.getByText("Decision Point").click();
    await expect(editor).toContainText("The hero decides to embark on the quest.");

    await page.getByText("Second Scene").click();
    await expect(editor).toContainText("A rival character is introduced in the marketplace.");
  });

  test("allows collapsing and expanding chapter lists", async ({ page }) => {
    await navigateToReactEditor(page, mockStoryData.storyId, mockStoryData.storyTitle);
    await waitForStoryLoad(page, mockStoryData.storyTitle);

    const openingScene = page.getByText("Opening Scene");
    await expect(openingScene).toBeVisible();

    await page.getByText("Opening Setup").click();
    await expect(openingScene).toBeHidden();

    await page.getByText("Opening Setup").click();
    await expect(openingScene).toBeVisible();
  });
});


