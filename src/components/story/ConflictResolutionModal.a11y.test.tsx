import { describe, expect, it, vi } from "vitest";

import { ConflictResolutionModal } from "./ConflictResolutionModal";
import type { ConflictInfo } from "../../hooks/useConflictDetection";
import { runAxe } from "../../../tests/utils/a11y-test-utils";
import { renderWithProviders } from "../../../tests/utils/test-utils";

const baseConflict: ConflictInfo = {
  snippetId: "snippet-1",
  localModifiedTime: "2025-01-01T10:00:00.000Z",
  driveModifiedTime: "2025-01-01T12:00:00.000Z",
  localContent: "Local content",
  driveContent: "Drive content"
};

describe("ConflictResolutionModal accessibility", () => {
  it("has no axe violations with conflict content", async () => {
    const onResolve = vi.fn();

    const { container } = renderWithProviders(
      <ConflictResolutionModal open={true} conflict={baseConflict} onResolve={onResolve} />
    );

    await expect(runAxe(container)).resolves.toHaveNoViolations();
  });
});

