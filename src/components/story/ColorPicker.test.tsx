import { describe, expect, it, vi } from "vitest";

import { ColorPicker } from "./ColorPicker";
import { renderWithProviders, screen, waitFor, userEvent } from "../../../tests/utils/test-utils";

describe("ColorPicker", () => {
  const mockAnchorEl = document.createElement("div");

  it("renders all 12 colors", () => {
    renderWithProviders(
      <ColorPicker
        open={true}
        anchorEl={mockAnchorEl}
        onClose={vi.fn()}
        onColorSelect={vi.fn()}
      />
    );

    const colors = [
      "red",
      "orange",
      "amber",
      "yellow",
      "lime",
      "emerald",
      "teal",
      "cyan",
      "blue",
      "indigo",
      "violet",
      "fuchsia"
    ];

    colors.forEach((color) => {
      expect(screen.getByLabelText(`Select ${color} color`)).toBeInTheDocument();
    });
  });

  it("calls onColorSelect and onClose when color is clicked", async () => {
    const handleColorSelect = vi.fn();
    const handleClose = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <ColorPicker
        open={true}
        anchorEl={mockAnchorEl}
        onClose={handleClose}
        onColorSelect={handleColorSelect}
      />
    );

    const redColor = screen.getByLabelText("Select red color");
    await user.click(redColor);

    expect(handleColorSelect).toHaveBeenCalledWith("#EF4444");
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("calls onColorSelect on Enter key", async () => {
    const handleColorSelect = vi.fn();
    const handleClose = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <ColorPicker
        open={true}
        anchorEl={mockAnchorEl}
        onClose={handleClose}
        onColorSelect={handleColorSelect}
      />
    );

    const blueColor = screen.getByLabelText("Select blue color");
    blueColor.focus();
    await user.keyboard("{Enter}");

    expect(handleColorSelect).toHaveBeenCalledWith("#3B82F6");
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("calls onColorSelect on Space key", async () => {
    const handleColorSelect = vi.fn();
    const handleClose = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <ColorPicker
        open={true}
        anchorEl={mockAnchorEl}
        onClose={handleClose}
        onColorSelect={handleColorSelect}
      />
    );

    const greenColor = screen.getByLabelText("Select emerald color");
    greenColor.focus();
    await user.keyboard(" ");

    expect(handleColorSelect).toHaveBeenCalledWith("#10B981");
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("highlights current color", () => {
    renderWithProviders(
      <ColorPicker
        open={true}
        anchorEl={mockAnchorEl}
        onClose={vi.fn()}
        currentColor="#EF4444"
        onColorSelect={vi.fn()}
      />
    );

    const redColor = screen.getByLabelText("Select red color");
    // The border should be thicker for selected color (3px vs 2px)
    expect(redColor).toBeInTheDocument();
  });

  it("does not render when open is false", () => {
    renderWithProviders(
      <ColorPicker
        open={false}
        anchorEl={mockAnchorEl}
        onClose={vi.fn()}
        onColorSelect={vi.fn()}
      />
    );

    expect(screen.queryByLabelText("Select red color")).not.toBeInTheDocument();
  });
});

