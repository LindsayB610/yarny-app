import { describe, expect, it, vi } from "vitest";

import { GoalsPanelModal } from "./GoalsPanelModal";
import { runAxe } from "../../../tests/utils/a11y-test-utils";
import { renderWithProviders } from "../../../tests/utils/test-utils";

describe("GoalsPanelModal accessibility", () => {
  it("has no axe violations in default state", async () => {
    const onClose = vi.fn();
    const onSave = vi.fn().mockResolvedValue(undefined);

    const { container } = renderWithProviders(
      <GoalsPanelModal open={true} onClose={onClose} onSave={onSave} />
    );

    await expect(runAxe(container)).resolves.toHaveNoViolations();
  });
});

