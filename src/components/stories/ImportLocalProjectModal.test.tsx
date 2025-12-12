import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { ImportLocalProjectModal } from "./ImportLocalProjectModal";
import { renderWithProviders, screen, waitFor } from "../../../tests/utils/test-utils";
import * as localFsModule from "../../services/localFs/LocalFsCapability";
import * as importModule from "../../services/localFileStorage/importLocalProject";

vi.mock("../../services/localFs/LocalFsCapability");
vi.mock("../../services/localFileStorage/importLocalProject");
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn()
  };
});

describe("ImportLocalProjectModal", () => {
  const mockOnClose = vi.fn();
  const mockRequestDirectoryHandle = vi.fn();
  const mockImportLocalProject = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(localFsModule.requestDirectoryHandle).mockImplementation(mockRequestDirectoryHandle);
    vi.mocked(importModule.importLocalProject).mockImplementation(mockImportLocalProject);
  });

  it("renders when open", () => {
    renderWithProviders(<ImportLocalProjectModal open={true} onClose={mockOnClose} />);

    expect(screen.getByText("Import Local Project")).toBeInTheDocument();
    expect(screen.getByText(/Select a local directory/i)).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    renderWithProviders(<ImportLocalProjectModal open={false} onClose={mockOnClose} />);

    expect(screen.queryByText("Import Local Project")).not.toBeInTheDocument();
  });

  it("shows unsupported message when File System Access API is not available", () => {
    // Mock window.showDirectoryPicker as undefined
    const originalShowDirectoryPicker = window.showDirectoryPicker;
    // @ts-expect-error - intentionally removing for test
    delete window.showDirectoryPicker;

    renderWithProviders(<ImportLocalProjectModal open={true} onClose={mockOnClose} />);

    expect(
      screen.getByText(/File System Access API is not supported/i)
    ).toBeInTheDocument();

    // Restore
    window.showDirectoryPicker = originalShowDirectoryPicker;
  });

  it("allows selecting a directory", async () => {
    // Mock File System Access API
    window.showDirectoryPicker = vi.fn();
    
    const user = userEvent.setup();
    const mockHandle = {
      name: "test-novel",
      kind: "directory" as const
    };
    mockRequestDirectoryHandle.mockResolvedValue(mockHandle);

    renderWithProviders(<ImportLocalProjectModal open={true} onClose={mockOnClose} />);

    const selectButton = screen.getByRole("button", { name: /Select Directory/i });
    await user.click(selectButton);

    await waitFor(() => {
      expect(mockRequestDirectoryHandle).toHaveBeenCalledTimes(1);
      expect(screen.getByText("test-novel")).toBeInTheDocument();
    });
  });

  it("handles directory selection cancellation", async () => {
    // Mock File System Access API
    window.showDirectoryPicker = vi.fn();
    
    const user = userEvent.setup();
    mockRequestDirectoryHandle.mockResolvedValue(null);

    renderWithProviders(<ImportLocalProjectModal open={true} onClose={mockOnClose} />);

    const selectButton = screen.getByRole("button", { name: /Select Directory/i });
    await user.click(selectButton);

    await waitFor(() => {
      expect(mockRequestDirectoryHandle).toHaveBeenCalledTimes(1);
      // Should not show selected path
      expect(screen.queryByText(/Selected:/i)).not.toBeInTheDocument();
    });
  });

  it("imports project when import button is clicked", async () => {
    // Mock File System Access API
    window.showDirectoryPicker = vi.fn();
    
    const user = userEvent.setup();
    const mockHandle = {
      name: "test-novel",
      kind: "directory" as const
    };
    mockRequestDirectoryHandle.mockResolvedValue(mockHandle);
    mockImportLocalProject.mockResolvedValue({
      projects: [{ id: "project-1", name: "test-novel", storyIds: ["story-1"] }],
      stories: [{ id: "story-1", title: "Test Novel", chapterIds: [] }],
      chapters: [],
      snippets: []
    });

    renderWithProviders(<ImportLocalProjectModal open={true} onClose={mockOnClose} />);

    // First select directory
    const selectButton = screen.getByRole("button", { name: /Select Directory/i });
    await user.click(selectButton);

    await waitFor(() => {
      expect(screen.getByText("test-novel")).toBeInTheDocument();
    });

    // Then import
    const importButton = screen.getByRole("button", { name: /Import/i });
    await user.click(importButton);

    await waitFor(() => {
      expect(mockImportLocalProject).toHaveBeenCalledWith(mockHandle);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it("shows error when import fails", async () => {
    // Mock File System Access API
    window.showDirectoryPicker = vi.fn();
    
    const user = userEvent.setup();
    const mockHandle = {
      name: "test-novel",
      kind: "directory" as const
    };
    mockRequestDirectoryHandle.mockResolvedValue(mockHandle);
    mockImportLocalProject.mockRejectedValue(new Error("Import failed"));

    renderWithProviders(<ImportLocalProjectModal open={true} onClose={mockOnClose} />);

    const selectButton = screen.getByRole("button", { name: /Select Directory/i });
    await user.click(selectButton);

    await waitFor(() => {
      expect(screen.getByText("test-novel")).toBeInTheDocument();
    });

    const importButton = screen.getByRole("button", { name: /Import/i });
    await user.click(importButton);

    await waitFor(() => {
      expect(screen.getByText("Import failed")).toBeInTheDocument();
    });
  });

  it("closes modal on cancel", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ImportLocalProjectModal open={true} onClose={mockOnClose} />);

    const cancelButton = screen.getByRole("button", { name: /Cancel/i });
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("disables import button when no directory is selected", () => {
    renderWithProviders(<ImportLocalProjectModal open={true} onClose={mockOnClose} />);

    const importButton = screen.getByRole("button", { name: /Import/i });
    expect(importButton).toBeDisabled();
  });
});

