import { describe, expect, it, vi } from "vitest";

import { StoryInfoModal } from "./StoryInfoModal";
import { runAxe } from "../../../tests/utils/a11y-test-utils";
import { renderWithProviders } from "../../../tests/utils/test-utils";

describe("StoryInfoModal accessibility", () => {
  it("has no axe violations with populated fields", async () => {
    const onClose = vi.fn();
    const onSave = vi.fn().mockResolvedValue(undefined);

    const { container } = renderWithProviders(
      <StoryInfoModal
        open={true}
        onClose={onClose}
        storyName="The Great Adventure"
        genre="Fantasy"
        description="An epic tale of discovery."
        onSave={onSave}
      />
    );

    await expect(runAxe(container)).resolves.toHaveNoViolations();
  });
});

