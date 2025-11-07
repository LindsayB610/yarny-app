import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { DeleteStoryModal } from "./DeleteStoryModal";
import { server } from "../../../tests/setup/msw-server";
import { renderWithProviders, screen, waitFor } from "../../../tests/utils/test-utils";


describe("DeleteStoryModal", () => {
  const mockOnClose = vi.fn();
  const storyId = "story-123";
  const storyName = "Test Story";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders when open", () => {
    renderWithProviders(
      <DeleteStoryModal
        open={true}
        onClose={mockOnClose}
        storyId={storyId}
        storyName={storyName}
      />
    );

    expect(screen.getByRole("heading", { name: "Delete Story" })).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument();
    expect(screen.getByText(storyName)).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    renderWithProviders(
      <DeleteStoryModal
        open={false}
        onClose={mockOnClose}
        storyId={storyId}
        storyName={storyName}
      />
    );

    expect(screen.queryByRole("heading", { name: "Delete Story" })).not.toBeInTheDocument();
  });

  it("requires DELETE confirmation text", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <DeleteStoryModal
        open={true}
        onClose={mockOnClose}
        storyId={storyId}
        storyName={storyName}
      />
    );

    const deleteButton = screen.getByRole("button", { name: /delete story/i });
    expect(deleteButton).toBeDisabled();

    await user.type(screen.getByPlaceholderText("DELETE"), "delete");
    expect(deleteButton).toBeDisabled();

    await user.clear(screen.getByPlaceholderText("DELETE"));
    await user.type(screen.getByPlaceholderText("DELETE"), "DELETE");
    expect(deleteButton).toBeEnabled();
  });

  it("deletes story when confirmed", async () => {
    const user = userEvent.setup();
    let capturedRequest: any = null;

    server.use(
      http.post("/.netlify/functions/drive-delete-story", async ({ request }) => {
        capturedRequest = await request.json();
        return HttpResponse.json({
          success: true,
          message: "Story deleted",
          deletedFromDrive: false
        });
      })
    );

    renderWithProviders(
      <DeleteStoryModal
        open={true}
        onClose={mockOnClose}
        storyId={storyId}
        storyName={storyName}
      />
    );

    await user.type(screen.getByPlaceholderText("DELETE"), "DELETE");
    const deleteButton = screen.getByRole("button", { name: /delete story/i });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(capturedRequest).toBeTruthy();
      expect(capturedRequest.storyFolderId).toBe(storyId);
      expect(capturedRequest.deleteFromDrive).toBe(false);
    });

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("includes deleteFromDrive option when checked", async () => {
    const user = userEvent.setup();
    let capturedRequest: any = null;

    server.use(
      http.post("/.netlify/functions/drive-delete-story", async ({ request }) => {
        capturedRequest = await request.json();
        return HttpResponse.json({
          success: true,
          message: "Story deleted",
          deletedFromDrive: true
        });
      })
    );

    renderWithProviders(
      <DeleteStoryModal
        open={true}
        onClose={mockOnClose}
        storyId={storyId}
        storyName={storyName}
      />
    );

    const deleteFromDriveCheckbox = screen.getByLabelText(
      /Also permanently delete from Google Drive/
    );
    await user.click(deleteFromDriveCheckbox);

    await user.type(screen.getByPlaceholderText("DELETE"), "DELETE");
    const deleteButton = screen.getByRole("button", { name: /delete story/i });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(capturedRequest.deleteFromDrive).toBe(true);
    });
  });

  it("closes modal on cancel", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <DeleteStoryModal
        open={true}
        onClose={mockOnClose}
        storyId={storyId}
        storyName={storyName}
      />
    );

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("resets form when closed", async () => {
    const user = userEvent.setup();
    const { rerender } = renderWithProviders(
      <DeleteStoryModal
        open={true}
        onClose={mockOnClose}
        storyId={storyId}
        storyName={storyName}
      />
    );

    await user.type(screen.getByPlaceholderText("DELETE"), "DELETE");
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    rerender(
      <DeleteStoryModal
        open={true}
        onClose={mockOnClose}
        storyId={storyId}
        storyName={storyName}
      />
    );

    expect(screen.getByPlaceholderText("DELETE")).toHaveValue("");
  });
});

