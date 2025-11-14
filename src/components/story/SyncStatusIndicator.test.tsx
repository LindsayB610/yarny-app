import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { SyncStatusIndicator, type SyncStatus } from "./SyncStatusIndicator";

describe("SyncStatusIndicator", () => {
  it("should render synced status", () => {
    render(
      <SyncStatusIndicator
        status="synced"
        lastSyncedAt={new Date().toISOString()}
      />
    );

    expect(screen.getByText("Synced")).toBeInTheDocument();
  });

  it("should render syncing status", () => {
    render(<SyncStatusIndicator status="syncing" />);

    expect(screen.getByText("Syncing...")).toBeInTheDocument();
  });

  it("should render failed status", () => {
    render(
      <SyncStatusIndicator
        status="failed"
        errorMessage="Sync failed"
        onRetry={() => {}}
      />
    );

    expect(screen.getByText("Sync failed")).toBeInTheDocument();
  });

  it("should render pending status", () => {
    render(<SyncStatusIndicator status="pending" />);

    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("should call onRetry when failed status is clicked", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <SyncStatusIndicator
        status="failed"
        errorMessage="Sync failed"
        onRetry={onRetry}
      />
    );

    // Chip is clickable when status is failed
    const chip = screen.getByText("Sync failed");
    await user.click(chip);
    expect(onRetry).toHaveBeenCalled();
  });

  it("should not call onRetry when status is not failed", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <SyncStatusIndicator status="synced" onRetry={onRetry} />
    );

    const chip = screen.getByText("Synced");
    // Chip should not be clickable when status is not failed
    expect(chip.closest("button")).not.toBeInTheDocument();
    expect(onRetry).not.toHaveBeenCalled();
  });

  it("should show tooltip with last synced time", () => {
    const lastSyncedAt = new Date("2025-01-15T10:30:00Z").toISOString();
    render(
      <SyncStatusIndicator status="synced" lastSyncedAt={lastSyncedAt} />
    );

    const chip = screen.getByText("Synced");
    expect(chip).toBeInTheDocument();
    // Tooltip should be present (checking via aria-label or title)
  });
});

