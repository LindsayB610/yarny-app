import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderWithProviders, screen, waitFor } from "../../../tests/utils/test-utils";
import userEvent from "@testing-library/user-event";
import { NewStoryModal } from "./NewStoryModal";
import { server } from "../../../tests/setup/msw-server";
import { http, HttpResponse } from "msw";

describe("NewStoryModal", () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders when open", () => {
    renderWithProviders(<NewStoryModal open={true} onClose={mockOnClose} />);

    expect(screen.getByText("Create New Story")).toBeInTheDocument();
    expect(screen.getByLabelText("Story Name")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    renderWithProviders(<NewStoryModal open={false} onClose={mockOnClose} />);

    expect(screen.queryByText("Create New Story")).not.toBeInTheDocument();
  });

  it("validates required story name", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NewStoryModal open={true} onClose={mockOnClose} />);

    const submitButton = screen.getByRole("button", { name: /create story/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Please enter a story name")).toBeInTheDocument();
    });
  });

  it("submits form with valid data", async () => {
    const user = userEvent.setup();
    let capturedRequest: any = null;

    server.use(
      http.post("/.netlify/functions/drive-get-or-create-yarny-stories", () => {
        return HttpResponse.json({
          id: "yarny-folder-id",
          name: "Yarny Stories",
          created: false
        });
      }),
      http.post("/.netlify/functions/drive-create-folder", async ({ request }) => {
        capturedRequest = await request.json();
        return HttpResponse.json({
          id: "story-folder-id",
          name: "My Novel",
          created: true
        });
      })
    );

    renderWithProviders(<NewStoryModal open={true} onClose={mockOnClose} />);

    await user.type(screen.getByLabelText("Story Name"), "My Novel");
    await user.type(screen.getByLabelText("Genre (optional)"), "Fantasy");
    await user.type(screen.getByLabelText("Word Count Target"), "5000");

    const submitButton = screen.getByRole("button", { name: /create story/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(capturedRequest).toBeTruthy();
      expect(capturedRequest.name).toBe("My Novel");
    });
  });

  it("closes modal on cancel", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NewStoryModal open={true} onClose={mockOnClose} />);

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("resets form when closed", async () => {
    const user = userEvent.setup();
    const { rerender } = renderWithProviders(
      <NewStoryModal open={true} onClose={mockOnClose} />
    );

    await user.type(screen.getByLabelText("Story Name"), "Test Story");
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    rerender(<NewStoryModal open={true} onClose={mockOnClose} />);

    expect(screen.getByLabelText("Story Name")).toHaveValue("");
  });

  it("allows selecting writing days", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NewStoryModal open={true} onClose={mockOnClose} />);

    // All days should be checked by default
    const mondayCheckbox = screen.getByLabelText("Mon");
    expect(mondayCheckbox).toBeChecked();

    await user.click(mondayCheckbox);
    expect(mondayCheckbox).not.toBeChecked();

    await user.click(mondayCheckbox);
    expect(mondayCheckbox).toBeChecked();
  });

  it("allows selecting goal mode", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NewStoryModal open={true} onClose={mockOnClose} />);

    const modeSelect = screen.getByLabelText("Mode (optional)");
    await user.click(modeSelect);

    const strictOption = screen.getByText("Strict (fixed daily target)");
    await user.click(strictOption);

    expect(screen.getByText("Strict (fixed daily target)")).toBeInTheDocument();
  });
});

