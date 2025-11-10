import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { NewStoryModal } from "./NewStoryModal";
import { server } from "../../../tests/setup/msw-server";
import { runAxe } from "../../../tests/utils/a11y-test-utils";
import { renderWithProviders, screen, waitFor } from "../../../tests/utils/test-utils";


describe("NewStoryModal", () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("has no accessibility violations when open with default state", async () => {
    const { container } = renderWithProviders(<NewStoryModal open={true} onClose={mockOnClose} />);

    await expect(runAxe(container)).resolves.toHaveNoViolations();
  });

  it("renders when open", () => {
    renderWithProviders(<NewStoryModal open={true} onClose={mockOnClose} />);

    expect(screen.getByText("Create New Story")).toBeInTheDocument();
    // Use getByRole for textbox or getByPlaceholderText as fallback
    expect(screen.getByRole("textbox", { name: /story name/i })).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    renderWithProviders(<NewStoryModal open={false} onClose={mockOnClose} />);

    expect(screen.queryByText("Create New Story")).not.toBeInTheDocument();
  });

  it("validates required story name", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NewStoryModal open={true} onClose={mockOnClose} />);

    // Find the form and submit button
    const form = screen.getByRole("dialog").querySelector("form");
    const submitButton = screen.getByRole("button", { name: /create story/i });
    
    // Submit the form directly to trigger validation
    if (form) {
      const submitEvent = new Event("submit", { bubbles: true, cancelable: true });
      form.dispatchEvent(submitEvent);
    } else {
      await user.click(submitButton);
    }

    // Wait for the error message to appear
    await waitFor(
      () => {
        expect(screen.getByText(/please enter a story name/i)).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
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
      // Mock all drive-create-folder calls - the first one is the story folder
      http.post("/.netlify/functions/drive-create-folder", async ({ request }) => {
        const requestData = await request.json();
        // Only capture the first request (the story folder creation)
        if (!capturedRequest) {
          capturedRequest = requestData;
        }
        // Return appropriate response based on folder name
        const folderName = requestData.name || "";
        return HttpResponse.json({
          id: `folder-${folderName.toLowerCase().replace(/\s+/g, "-")}-id`,
          name: folderName,
          created: true
        });
      }),
      // Mock other Drive API calls that might be made
      http.post("/.netlify/functions/drive-write", () => {
        return HttpResponse.json({ success: true });
      })
    );

    renderWithProviders(<NewStoryModal open={true} onClose={mockOnClose} />);

    // Use getByRole for textboxes
    await user.type(screen.getByRole("textbox", { name: /story name/i }), "My Novel");
    const genreSelect = screen.getByRole("combobox", { name: /genre/i });
    await user.click(genreSelect);
    const fantasyOption = await screen.findByRole("option", { name: "Fantasy" });
    await user.click(fantasyOption);
    const wordCountInput = screen.getByRole("textbox", { name: /word count target/i });
    await user.clear(wordCountInput);
    await user.type(wordCountInput, "5000");

    const submitButton = screen.getByRole("button", { name: /create story/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(capturedRequest).toBeTruthy();
      expect(capturedRequest.name).toBe("My Novel");
    });
  });

  it("prevents submission when word count is zero or less", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NewStoryModal open={true} onClose={mockOnClose} />);

    await user.type(screen.getByRole("textbox", { name: /story name/i }), "My Novel");
    const wordCountInput = screen.getByRole("textbox", { name: /word count target/i });
    await user.clear(wordCountInput);
    await user.type(wordCountInput, "0");

    const submitButton = screen.getByRole("button", { name: /create story/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/please enter a word count greater than 0/i)).toBeInTheDocument();
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

    const storyNameInput = screen.getByRole("textbox", { name: /story name/i });
    await user.type(storyNameInput, "Test Story");
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    rerender(<NewStoryModal open={true} onClose={mockOnClose} />);

    // After rerender, find the input again and check it's empty
    const resetInput = screen.getByRole("textbox", { name: /story name/i });
    expect(resetInput).toHaveValue("");
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

    // Find the Select by clicking on the visible text "Elastic (rebalance daily targets)"
    // which is displayed in the Select component
    const elasticText = screen.getByText("Elastic (rebalance daily targets)");
    await user.click(elasticText);

    // Wait for the menu to open and find the strict option
    const strictOption = await screen.findByText("Strict (fixed daily target)");
    await user.click(strictOption);

    // Verify the value changed - the Select should now show "Strict"
    await waitFor(() => {
      expect(screen.getByText("Strict (fixed daily target)")).toBeInTheDocument();
    });
  });
});

