import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ManualSyncButton } from "./ManualSyncButton";
import { useManualSync } from "../../hooks/useManualSync";

// Mock the hook
vi.mock("../../hooks/useManualSync", () => ({
  useManualSync: vi.fn()
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("ManualSyncButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render sync button", () => {
    vi.mocked(useManualSync).mockReturnValue({
      sync: vi.fn(),
      isSyncing: false,
      error: null
    });

    render(<ManualSyncButton />, { wrapper: createWrapper() });

    expect(screen.getByText("Sync Story")).toBeInTheDocument();
  });

  it("should show syncing state when sync is in progress", () => {
    vi.mocked(useManualSync).mockReturnValue({
      sync: vi.fn(),
      isSyncing: true,
      error: null
    });

    render(<ManualSyncButton />, { wrapper: createWrapper() });

    expect(screen.getByText("Syncing...")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("should call sync when button is clicked", async () => {
    const user = userEvent.setup();
    const syncMock = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useManualSync).mockReturnValue({
      sync: syncMock,
      isSyncing: false,
      error: null
    });

    render(<ManualSyncButton />, { wrapper: createWrapper() });

    const button = screen.getByRole("button");
    await user.click(button);

    expect(syncMock).toHaveBeenCalled();
  });

  it("should handle sync errors gracefully", async () => {
    const user = userEvent.setup();
    const syncMock = vi.fn().mockRejectedValue(new Error("Sync failed"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.mocked(useManualSync).mockReturnValue({
      sync: syncMock,
      isSyncing: false,
      error: null
    });

    render(<ManualSyncButton />, { wrapper: createWrapper() });

    const button = screen.getByRole("button");
    await user.click(button);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Manual sync failed:",
        expect.any(Error)
      );
    });

    consoleErrorSpy.mockRestore();
  });
});

