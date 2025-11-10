import { describe, expect, it } from "vitest";

import { ExportProgressDialog } from "./ExportProgressDialog";
import type { ExportProgress } from "../../hooks/useExport";
import { runAxe } from "../../../tests/utils/a11y-test-utils";
import { renderWithProviders } from "../../../tests/utils/test-utils";

const baseProgress: ExportProgress = {
  currentChunk: 1,
  totalChunks: 4,
  status: "writing",
  destination: "drive"
};

describe("ExportProgressDialog accessibility", () => {
  it("has no axe violations in progress state", async () => {
    const { container } = renderWithProviders(
      <ExportProgressDialog open={true} progress={baseProgress} fileName="My Story.md" />
    );

    await expect(runAxe(container)).resolves.toHaveNoViolations();
  });
});

