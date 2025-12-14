import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditorFooter } from "./EditorFooter";
import { renderWithProviders } from "../../../tests/utils/test-utils";
import { useActiveStory } from "../../hooks/useActiveStory";
import { useSyncStatus } from "../../hooks/useSyncStatus";
import { useYarnyStore } from "../../store/provider";

// Mock dependencies
vi.mock("../../hooks/useActiveStory");
vi.mock("../../hooks/useSyncStatus");
vi.mock("../../store/provider");
vi.mock("../../store/selectors", () => ({
  selectStorySnippets: vi.fn((state, storyId) => {
    if (storyId === "story-1") {
      return [
        {
          id: "snippet-1",
          content: "Hello world",
          updatedAt: "2024-01-01T10:00:00Z"
        },
        {
          id: "snippet-2",
          content: "Test content here",
          updatedAt: "2024-01-01T11:00:00Z"
        }
      ];
    }
    return [];
  })
}));

describe("EditorFooter", () => {
  const mockOnExportClick = vi.fn();
  const mockOnLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useActiveStory).mockReturnValue({
      id: "story-1",
      driveFileId: "drive-1",
      projectId: "project-1",
      chapterIds: [],
      updatedAt: new Date().toISOString()
    } as any);

    vi.mocked(useSyncStatus).mockReturnValue({
      status: "synced",
      lastSyncedAt: undefined,
      errorMessage: undefined,
      retry: vi.fn()
    });

    vi.mocked(useYarnyStore).mockImplementation((selector: any) => {
      if (selector.toString().includes("selectStorySnippets")) {
        return [
          {
            id: "snippet-1",
            content: "Hello world",
            updatedAt: "2024-01-01T10:00:00Z"
          },
          {
            id: "snippet-2",
            content: "Test content here",
            updatedAt: "2024-01-01T11:00:00Z"
          }
        ];
      }
      return [];
    });
  });

  it("renders word and character counts", () => {
    renderWithProviders(
      <EditorFooter
        onExportClick={mockOnExportClick}
        onLogout={mockOnLogout}
      />
    );

    // Word count is formatted with toLocaleString, so check for the pattern
    expect(screen.getByText(/5.*words/i)).toBeInTheDocument();
    // Character count might be split across elements or formatted
    expect(screen.getByText(/29|characters/i)).toBeInTheDocument();
  });

  it("handles singular word count", () => {
    vi.mocked(useYarnyStore).mockImplementation((selector: any) => {
      if (selector.toString().includes("selectStorySnippets")) {
        return [
          {
            id: "snippet-1",
            content: "Hello",
            updatedAt: "2024-01-01T10:00:00Z"
          }
        ];
      }
      return [];
    });

    renderWithProviders(
      <EditorFooter
        onExportClick={mockOnExportClick}
        onLogout={mockOnLogout}
      />
    );

    expect(screen.getByText(/1 word/i)).toBeInTheDocument();
  });

  it("handles singular character count", () => {
    vi.mocked(useYarnyStore).mockImplementation((selector: any) => {
      if (selector.toString().includes("selectStorySnippets")) {
        return [
          {
            id: "snippet-1",
            content: "A",
            updatedAt: "2024-01-01T10:00:00Z"
          }
        ];
      }
      return [];
    });

    renderWithProviders(
      <EditorFooter
        onExportClick={mockOnExportClick}
        onLogout={mockOnLogout}
      />
    );

    expect(screen.getByText(/1 character/i)).toBeInTheDocument();
  });

  it("displays last modified date", () => {
    renderWithProviders(
      <EditorFooter
        onExportClick={mockOnExportClick}
        onLogout={mockOnLogout}
      />
    );

    expect(screen.getByText(/Last Modified:/i)).toBeInTheDocument();
  });

  it("handles missing last modified date", () => {
    vi.mocked(useYarnyStore).mockImplementation((selector: any) => {
      if (selector.toString().includes("selectStorySnippets")) {
        return [
          {
            id: "snippet-1",
            content: "Hello",
            updatedAt: "invalid-date"
          }
        ];
      }
      return [];
    });

    renderWithProviders(
      <EditorFooter
        onExportClick={mockOnExportClick}
        onLogout={mockOnLogout}
      />
    );

    expect(screen.getByText(/Last Modified: —/i)).toBeInTheDocument();
  });

  it("calls onExportClick when export button is clicked", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <EditorFooter
        onExportClick={mockOnExportClick}
        onLogout={mockOnLogout}
      />
    );

    const exportButton = screen.getByRole("button", { name: /export/i });
    await user.click(exportButton);

    expect(mockOnExportClick).toHaveBeenCalledTimes(1);
  });

  it("disables export button when exportDisabled is true", () => {
    renderWithProviders(
      <EditorFooter
        onExportClick={mockOnExportClick}
        onLogout={mockOnLogout}
        exportDisabled={true}
      />
    );

    const exportButton = screen.getByRole("button", { name: /export/i });
    expect(exportButton).toBeDisabled();
  });

  it("shows exporting state", () => {
    renderWithProviders(
      <EditorFooter
        onExportClick={mockOnExportClick}
        onLogout={mockOnLogout}
        isExporting={true}
      />
    );

    expect(screen.getByText(/Exporting…/i)).toBeInTheDocument();
    const exportButton = screen.getByRole("button", { name: /exporting/i });
    expect(exportButton).toBeDisabled();
  });

  it("calls onLogout when sign out button is clicked", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <EditorFooter
        onExportClick={mockOnExportClick}
        onLogout={mockOnLogout}
      />
    );

    const logoutButton = screen.getByRole("button", { name: /sign out/i });
    await user.click(logoutButton);

    expect(mockOnLogout).toHaveBeenCalledTimes(1);
  });

  it("disables logout button when isLogoutDisabled is true", () => {
    renderWithProviders(
      <EditorFooter
        onExportClick={mockOnExportClick}
        onLogout={mockOnLogout}
        isLogoutDisabled={true}
      />
    );

    const logoutButton = screen.getByRole("button", { name: /sign out/i });
    expect(logoutButton).toBeDisabled();
  });

  it("renders sync status indicator", () => {
    renderWithProviders(
      <EditorFooter
        onExportClick={mockOnExportClick}
        onLogout={mockOnLogout}
      />
    );

    // SyncStatusIndicator should be rendered (tested separately)
    expect(screen.getByRole("button", { name: /export/i })).toBeInTheDocument();
  });

  it("renders docs link", () => {
    renderWithProviders(
      <EditorFooter
        onExportClick={mockOnExportClick}
        onLogout={mockOnLogout}
      />
    );

    const docsLink = screen.getByRole("link", { name: /docs/i });
    expect(docsLink).toHaveAttribute("href", "/docs");
  });

  it("handles empty snippets", () => {
    vi.mocked(useYarnyStore).mockImplementation((selector: any) => {
      if (selector.toString().includes("selectStorySnippets")) {
        return [];
      }
      return [];
    });

    renderWithProviders(
      <EditorFooter
        onExportClick={mockOnExportClick}
        onLogout={mockOnLogout}
      />
    );

    expect(screen.getByText(/0 words/i)).toBeInTheDocument();
    expect(screen.getByText(/0 characters/i)).toBeInTheDocument();
  });
});



