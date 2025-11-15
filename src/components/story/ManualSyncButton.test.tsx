import { screen, waitFor, renderWithProviders, userEvent } from "../../../tests/utils/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Routes, Route } from "react-router-dom";
import { ManualSyncButton } from "./ManualSyncButton";
import { useManualSync } from "../../hooks/useManualSync";
import type { Story } from "../../store/types";

// Mock the hook
vi.mock("../../hooks/useManualSync", () => ({
  useManualSync: vi.fn()
}));

const testStory: Story = {
  id: "story-1",
  projectId: "project-1",
  title: "Test Story",
  driveFileId: "drive-file-1",
  chapterIds: [],
  updatedAt: new Date().toISOString()
};

describe("ManualSyncButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render sync button", () => {
    vi.mocked(useManualSync).mockReturnValue({
      sync: vi.fn(),
      isSyncing: false,
      error: null
    });

    renderWithProviders(
      <Routes>
        <Route path="/stories/:storyId/snippets/:snippetId?" element={<ManualSyncButton />} />
      </Routes>,
      {
        initialEntries: ["/stories/story-1/snippets/snippet-1"],
        initialState: {
          entities: {
            stories: {
              "story-1": testStory
            }
          }
        }
      }
    );

    expect(screen.getByText("Sync Story")).toBeInTheDocument();
  });

  it("should show syncing state when sync is in progress", () => {
    vi.mocked(useManualSync).mockReturnValue({
      sync: vi.fn(),
      isSyncing: true,
      error: null
    });

    renderWithProviders(
      <Routes>
        <Route path="/stories/:storyId/snippets/:snippetId?" element={<ManualSyncButton />} />
      </Routes>,
      {
        initialEntries: ["/stories/story-1/snippets/snippet-1"],
        initialState: {
          entities: {
            stories: {
              "story-1": testStory
            }
          }
        }
      }
    );

    expect(screen.getByText("Syncing...")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("should call sync when button is clicked", async () => {
    const user = userEvent.setup();
    const syncMock = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useManualSync).mockReturnValue({
      sync: syncMock,
      isSyncing: false,
      error: null
    });

    renderWithProviders(
      <Routes>
        <Route path="/stories/:storyId/snippets/:snippetId?" element={<ManualSyncButton />} />
      </Routes>,
      {
        initialEntries: ["/stories/story-1/snippets/snippet-1"],
        initialState: {
          entities: {
            stories: {
              "story-1": testStory
            }
          }
        }
      }
    );

    const button = screen.getByRole("button");
    await user.click(button);

    expect(syncMock).toHaveBeenCalled();
  });

  it("should handle sync errors gracefully", async () => {
    const user = userEvent.setup();
    const syncMock = vi.fn().mockRejectedValue(new Error("Sync failed"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.mocked(useManualSync).mockReturnValue({
      sync: syncMock,
      isSyncing: false,
      error: null
    });

    renderWithProviders(
      <Routes>
        <Route path="/stories/:storyId/snippets/:snippetId?" element={<ManualSyncButton />} />
      </Routes>,
      {
        initialEntries: ["/stories/story-1/snippets/snippet-1"],
        initialState: {
          entities: {
            stories: {
              "story-1": testStory
            }
          }
        }
      }
    );

    const button = screen.getByRole("button");
    await user.click(button);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Manual sync failed:",
        expect.any(Error)
      );
    });

    consoleErrorSpy.mockRestore();
  });
});

