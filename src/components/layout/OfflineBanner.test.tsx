import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react"; // render, act unused
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../tests/utils/test-utils";
import { OfflineBanner } from "./OfflineBanner";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";

// Mock useNetworkStatus hook
vi.mock("../../hooks/useNetworkStatus", () => ({
  useNetworkStatus: vi.fn()
}));

describe("OfflineBanner", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("does not render when online with no queued saves", () => {
    vi.mocked(useNetworkStatus).mockReturnValue({
      isOnline: true,
      isSlowConnection: false,
      wasOffline: false
    });

    const { container } = renderWithProviders(<OfflineBanner />);

    expect(container.firstChild).toBeNull();
  });

  it("displays offline message when offline", () => {
    vi.mocked(useNetworkStatus).mockReturnValue({
      isOnline: false,
      isSlowConnection: false,
      wasOffline: false
    });

    renderWithProviders(<OfflineBanner />);

    expect(screen.getByText(/you're offline/i)).toBeInTheDocument();
    expect(screen.getByText(/your changes will be saved/i)).toBeInTheDocument();
  });

  it("displays queued saves count when offline", () => {
    vi.mocked(useNetworkStatus).mockReturnValue({
      isOnline: false,
      isSlowConnection: false,
      wasOffline: false
    });

    localStorage.setItem(
      "yarny_queued_saves",
      JSON.stringify([
        { fileId: "1", content: "test", timestamp: new Date().toISOString() },
        { fileId: "2", content: "test", timestamp: new Date().toISOString() }
      ])
    );

    renderWithProviders(<OfflineBanner />);

    expect(screen.getByText(/2 saves queued/i)).toBeInTheDocument();
  });

  it("displays singular save count correctly", () => {
    vi.mocked(useNetworkStatus).mockReturnValue({
      isOnline: false,
      isSlowConnection: false,
      wasOffline: false
    });

    localStorage.setItem(
      "yarny_queued_saves",
      JSON.stringify([{ fileId: "1", content: "test", timestamp: new Date().toISOString() }])
    );

    renderWithProviders(<OfflineBanner />);

    expect(screen.getByText(/1 save queued/i)).toBeInTheDocument();
  });

  it("displays slow connection message", () => {
    vi.mocked(useNetworkStatus).mockReturnValue({
      isOnline: true,
      isSlowConnection: true,
      wasOffline: false
    });

    renderWithProviders(<OfflineBanner />);

    expect(screen.getByText(/slow connection detected/i)).toBeInTheDocument();
    expect(screen.getByText(/saving may take longer/i)).toBeInTheDocument();
  });

  it("displays queued saves when online but has queued saves", () => {
    vi.mocked(useNetworkStatus).mockReturnValue({
      isOnline: true,
      isSlowConnection: false,
      wasOffline: false
    });

    localStorage.setItem(
      "yarny_queued_saves",
      JSON.stringify([{ fileId: "1", content: "test", timestamp: new Date().toISOString() }])
    );

    renderWithProviders(<OfflineBanner />);

    expect(screen.getByText(/saves queued/i)).toBeInTheDocument();
    expect(screen.getByText(/1 save waiting to sync/i)).toBeInTheDocument();
  });

  it("shows retry button when online with queued saves", () => {
    vi.mocked(useNetworkStatus).mockReturnValue({
      isOnline: true,
      isSlowConnection: false,
      wasOffline: false
    });

    localStorage.setItem(
      "yarny_queued_saves",
      JSON.stringify([{ fileId: "1", content: "test", timestamp: new Date().toISOString() }])
    );

    renderWithProviders(<OfflineBanner />);

    expect(screen.getByText(/retry now/i)).toBeInTheDocument();
  });

  it("does not show retry button when offline", () => {
    vi.mocked(useNetworkStatus).mockReturnValue({
      isOnline: false,
      isSlowConnection: false,
      wasOffline: false
    });

    localStorage.setItem(
      "yarny_queued_saves",
      JSON.stringify([{ fileId: "1", content: "test", timestamp: new Date().toISOString() }])
    );

    renderWithProviders(<OfflineBanner />);

    expect(screen.queryByText(/retry now/i)).not.toBeInTheDocument();
  });

  it("dispatches retry event when retry button is clicked", async () => {
    const user = userEvent.setup();
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");

    vi.mocked(useNetworkStatus).mockReturnValue({
      isOnline: true,
      isSlowConnection: false,
      wasOffline: false
    });

    localStorage.setItem(
      "yarny_queued_saves",
      JSON.stringify([{ fileId: "1", content: "test", timestamp: new Date().toISOString() }])
    );

    renderWithProviders(<OfflineBanner />);

    const retryButton = screen.getByText(/retry now/i);
    await user.click(retryButton);

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "yarny:retry-queued-saves"
      })
    );
  });

  it("updates queued saves count when localStorage changes", async () => {
    vi.mocked(useNetworkStatus).mockReturnValue({
      isOnline: true,
      isSlowConnection: false,
      wasOffline: false
    });

    localStorage.setItem(
      "yarny_queued_saves",
      JSON.stringify([{ fileId: "1", content: "test", timestamp: new Date().toISOString() }])
    );

    const { rerender } = renderWithProviders(<OfflineBanner />);

    expect(screen.getByText(/1 save waiting to sync/i)).toBeInTheDocument();

    // Update localStorage
    localStorage.setItem(
      "yarny_queued_saves",
      JSON.stringify([
        { fileId: "1", content: "test", timestamp: new Date().toISOString() },
        { fileId: "2", content: "test", timestamp: new Date().toISOString() },
        { fileId: "3", content: "test", timestamp: new Date().toISOString() }
      ])
    );

    // Trigger storage event
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: "yarny_queued_saves" }));
    });

    rerender(<OfflineBanner />);

    await waitFor(() => {
      expect(screen.getByText(/3 saves waiting to sync/i)).toBeInTheDocument();
    });
  });

  it("handles invalid localStorage data gracefully", () => {
    vi.mocked(useNetworkStatus).mockReturnValue({
      isOnline: true,
      isSlowConnection: false,
      wasOffline: false
    });

    localStorage.setItem("yarny_queued_saves", "invalid-json");

    renderWithProviders(<OfflineBanner />);

    // Should not crash and should not show queued saves
    expect(screen.queryByText(/saves queued/i)).not.toBeInTheDocument();
  });
});


