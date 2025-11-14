import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useNetworkStatus } from "./useNetworkStatus";

describe("useNetworkStatus", () => {
  beforeEach(() => {
    // Reset navigator.onLine
    Object.defineProperty(navigator, "onLine", {
      writable: true,
      configurable: true,
      value: true
    });

    // Clear any existing event listeners
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns online state initially", () => {
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isOnline).toBe(true);
    expect(result.current.isSlowConnection).toBe(false);
    expect(result.current.wasOffline).toBe(false);
  });

  it("detects offline state", async () => {
    Object.defineProperty(navigator, "onLine", {
      writable: true,
      configurable: true,
      value: false
    });

    const { result } = renderHook(() => useNetworkStatus());

    await waitFor(() => {
      expect(result.current.isOnline).toBe(false);
    });
  });

  it("updates when going offline", async () => {
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isOnline).toBe(true);

    // Simulate going offline
    Object.defineProperty(navigator, "onLine", {
      writable: true,
      configurable: true,
      value: false
    });

    window.dispatchEvent(new Event("offline"));

    await waitFor(() => {
      expect(result.current.isOnline).toBe(false);
    });
  });

  it("updates when coming back online", async () => {
    // Start offline
    Object.defineProperty(navigator, "onLine", {
      writable: true,
      configurable: true,
      value: false
    });

    const { result } = renderHook(() => useNetworkStatus());

    await waitFor(() => {
      expect(result.current.isOnline).toBe(false);
    });

    // Come back online
    Object.defineProperty(navigator, "onLine", {
      writable: true,
      configurable: true,
      value: true
    });

    window.dispatchEvent(new Event("online"));

    await waitFor(() => {
      expect(result.current.isOnline).toBe(true);
      expect(result.current.wasOffline).toBe(true);
    });
  });

  it("detects slow connection via effectiveType", async () => {
    const mockConnection = {
      effectiveType: "2g",
      saveData: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };

    Object.defineProperty(navigator, "connection", {
      writable: true,
      configurable: true,
      value: mockConnection
    });

    const { result } = renderHook(() => useNetworkStatus());

    await waitFor(() => {
      expect(result.current.isSlowConnection).toBe(true);
    });
  });

  it("detects slow connection via slow-2g", async () => {
    const mockConnection = {
      effectiveType: "slow-2g",
      saveData: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };

    Object.defineProperty(navigator, "connection", {
      writable: true,
      configurable: true,
      value: mockConnection
    });

    const { result } = renderHook(() => useNetworkStatus());

    await waitFor(() => {
      expect(result.current.isSlowConnection).toBe(true);
    });
  });

  it("detects slow connection via saveData flag", async () => {
    const mockConnection = {
      effectiveType: "4g",
      saveData: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };

    Object.defineProperty(navigator, "connection", {
      writable: true,
      configurable: true,
      value: mockConnection
    });

    const { result } = renderHook(() => useNetworkStatus());

    await waitFor(() => {
      expect(result.current.isSlowConnection).toBe(true);
    });
  });

  it("does not detect fast connection as slow", async () => {
    const mockConnection = {
      effectiveType: "4g",
      saveData: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };

    Object.defineProperty(navigator, "connection", {
      writable: true,
      configurable: true,
      value: mockConnection
    });

    const { result } = renderHook(() => useNetworkStatus());

    await waitFor(() => {
      expect(result.current.isSlowConnection).toBe(false);
    });
  });

  it("handles connection changes", async () => {
    const mockConnection = {
      effectiveType: "4g",
      saveData: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };

    Object.defineProperty(navigator, "connection", {
      writable: true,
      configurable: true,
      value: mockConnection
    });

    const { result } = renderHook(() => useNetworkStatus());

    await waitFor(() => {
      expect(result.current.isSlowConnection).toBe(false);
    });

    // Change connection to slow
    mockConnection.effectiveType = "2g";
    const changeHandler = mockConnection.addEventListener.mock.calls.find(
      (call) => call[0] === "change"
    )?.[1];

    if (changeHandler) {
      changeHandler();
    }

    await waitFor(() => {
      expect(result.current.isSlowConnection).toBe(true);
    });
  });

  it("resets slow connection flag when coming back online", async () => {
    const mockConnection = {
      effectiveType: "2g",
      saveData: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };

    Object.defineProperty(navigator, "connection", {
      writable: true,
      configurable: true,
      value: mockConnection
    });

    Object.defineProperty(navigator, "onLine", {
      writable: true,
      configurable: true,
      value: false
    });

    const { result } = renderHook(() => useNetworkStatus());

    await waitFor(() => {
      expect(result.current.isOnline).toBe(false);
      expect(result.current.isSlowConnection).toBe(true);
    });

    // Come back online
    Object.defineProperty(navigator, "onLine", {
      writable: true,
      configurable: true,
      value: true
    });

    window.dispatchEvent(new Event("online"));

    await waitFor(() => {
      expect(result.current.isOnline).toBe(true);
      expect(result.current.isSlowConnection).toBe(false);
    });
  });

  it("handles missing connection API gracefully", () => {
    delete (navigator as any).connection;
    delete (navigator as any).mozConnection;
    delete (navigator as any).webkitConnection;

    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isSlowConnection).toBe(false);
  });

  it("cleans up event listeners on unmount", () => {
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = renderHook(() => useNetworkStatus());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith("online", expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith("offline", expect.any(Function));
  });
});

