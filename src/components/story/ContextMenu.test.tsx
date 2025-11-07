import { describe, expect, it, vi } from "vitest";

import { ContextMenu, type ContextMenuAction } from "./ContextMenu";
import { renderWithProviders, screen, userEvent } from "../../../tests/utils/test-utils";

describe("ContextMenu", () => {
  const mockAnchorEl = document.createElement("div");

  const mockActions: ContextMenuAction[] = [
    {
      label: "Edit",
      icon: "✏️",
      onClick: vi.fn()
    },
    {
      label: "Delete",
      icon: "🗑️",
      onClick: vi.fn()
    },
    {
      label: "Disabled Action",
      onClick: vi.fn(),
      disabled: true
    }
  ];

  it("renders all actions", () => {
    renderWithProviders(
      <ContextMenu
        open={true}
        anchorEl={mockAnchorEl}
        onClose={vi.fn()}
        actions={mockActions}
      />
    );

    expect(screen.getByText("Edit")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
    expect(screen.getByText("Disabled Action")).toBeInTheDocument();
  });

  it("renders icons when provided", () => {
    renderWithProviders(
      <ContextMenu
        open={true}
        anchorEl={mockAnchorEl}
        onClose={vi.fn()}
        actions={mockActions}
      />
    );

    expect(screen.getByText("✏️")).toBeInTheDocument();
    expect(screen.getByText("🗑️")).toBeInTheDocument();
  });

  it("calls onClick and onClose when action is clicked", async () => {
    const handleClose = vi.fn();
    const handleEdit = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <ContextMenu
        open={true}
        anchorEl={mockAnchorEl}
        onClose={handleClose}
        actions={[
          {
            label: "Edit",
            onClick: handleEdit
          }
        ]}
      />
    );

    await user.click(screen.getByText("Edit"));

    expect(handleEdit).toHaveBeenCalledTimes(1);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("disables disabled actions", () => {
    renderWithProviders(
      <ContextMenu
        open={true}
        anchorEl={mockAnchorEl}
        onClose={vi.fn()}
        actions={mockActions}
      />
    );

    const disabledAction = screen.getByText("Disabled Action").closest("li");
    expect(disabledAction).toHaveAttribute("aria-disabled", "true");
  });

  it("does not render when open is false", () => {
    renderWithProviders(
      <ContextMenu
        open={false}
        anchorEl={mockAnchorEl}
        onClose={vi.fn()}
        actions={mockActions}
      />
    );

    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
  });
});

