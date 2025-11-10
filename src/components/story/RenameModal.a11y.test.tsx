import { describe, expect, it, vi } from "vitest";

import { RenameModal } from "./RenameModal";
import { runAxe } from "../../../tests/utils/a11y-test-utils";
import { renderWithProviders } from "../../../tests/utils/test-utils";

describe("RenameModal accessibility", () => {
  it("has no axe violations when rename button is disabled", async () => {
    const onClose = vi.fn();
    const onRename = vi.fn().mockResolvedValue(undefined);

    const { container } = renderWithProviders(
      <RenameModal
        open={true}
        onClose={onClose}
        currentName="Chapter 1"
        itemType="chapter"
        onRename={onRename}
      />
    );

    await expect(runAxe(container)).resolves.toHaveNoViolations();
  });
});

