import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useSyncStatus } from "./useSyncStatus";

describe("useSyncStatus", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("should return synced status when no queued syncs and no errors", () => {
    const { result } = renderHook(() => useSyncStatus());

    expect(result.current.status).toBe("synced");
    expect(result.current.errorMessage).toBeUndefined();
    expect(result.current.lastSyncedAt).toBeUndefined();
  });

  it("should return synced status when lastSyncTime is set", () => {
    const syncTime = new Date().toISOString();
    localStorage.setItem("yarny_last_sync_time", syncTime);

    const { result } = renderHook(() => useSyncStatus());

    expect(result.current.status).toBe("synced");
    expect(result.current.lastSyncedAt).toBe(syncTime);
  });

  it("should return pending status when queued syncs exist", () => {
    const queuedSyncs = [
      {
        snippetId: "snippet-1",
        content: "test content",
        gdocFileId: "gdoc-1",
        parentFolderId: "folder-1",
        timestamp: new Date().toISOString()
      }
    ];
    localStorage.setItem("yarny_queued_syncs", JSON.stringify(queuedSyncs));

    const { result } = renderHook(() => useSyncStatus());

    expect(result.current.status).toBe("pending");
  });

  it("should return failed status when sync error exists", () => {
    localStorage.setItem("yarny_sync_error", "Sync failed");
    localStorage.setItem("yarny_last_sync_time", new Date().toISOString());

    const { result } = renderHook(() => useSyncStatus());

    expect(result.current.status).toBe("failed");
    expect(result.current.errorMessage).toBe("Sync failed");
  });

  it("should update status to syncing when SYNC_START message received", async () => {
    // Mock Service Worker before hook renders
    let messageHandler: ((event: MessageEvent) => void) | null = null;
    const mockServiceWorker = {
      addEventListener: vi.fn((event: string, handler: (event: MessageEvent) => void) => {
        if (event === "message") {
          messageHandler = handler;
        }
      }),
      removeEventListener: vi.fn()
    };

    Object.defineProperty(navigator, "serviceWorker", {
      value: mockServiceWorker,
      writable: true,
      configurable: true
    });

    const { result } = renderHook(() => useSyncStatus());

    // Wait for hook to set up listener
    await waitFor(() => {
      expect(messageHandler).not.toBeNull();
    }, { timeout: 500 });

    // Simulate Service Worker message
    const messageEvent = new MessageEvent("message", {
      data: { type: "SYNC_START", snippetId: "snippet-1" }
    });

    if (messageHandler) {
      act(() => {
        messageHandler!(messageEvent);
      });
    }

    await waitFor(() => {
      expect(result.current.status).toBe("syncing");
    }, { timeout: 500 });
  });

  it("should update status to synced when SYNC_SUCCESS message received", async () => {
    let messageHandler: ((event: MessageEvent) => void) | null = null;
    const mockServiceWorker = {
      addEventListener: vi.fn((event: string, handler: (event: MessageEvent) => void) => {
        if (event === "message") {
          messageHandler = handler;
        }
      }),
      removeEventListener: vi.fn()
    };

    Object.defineProperty(navigator, "serviceWorker", {
      value: mockServiceWorker,
      writable: true,
      configurable: true
    });

    const { result } = renderHook(() => useSyncStatus());

    await waitFor(() => {
      expect(messageHandler).not.toBeNull();
    }, { timeout: 500 });

    const messageEvent = new MessageEvent("message", {
      data: { type: "SYNC_SUCCESS", snippetId: "snippet-1" }
    });

    if (messageHandler) {
      act(() => {
        messageHandler!(messageEvent);
      });
    }

    await waitFor(() => {
      expect(localStorage.getItem("yarny_last_sync_time")).toBeTruthy();
      expect(localStorage.getItem("yarny_sync_error")).toBeNull();
    }, { timeout: 500 });
  });

  it("should update status to failed when SYNC_ERROR message received", async () => {
    let messageHandler: ((event: MessageEvent) => void) | null = null;
    const mockServiceWorker = {
      addEventListener: vi.fn((event: string, handler: (event: MessageEvent) => void) => {
        if (event === "message") {
          messageHandler = handler;
        }
      }),
      removeEventListener: vi.fn()
    };

    Object.defineProperty(navigator, "serviceWorker", {
      value: mockServiceWorker,
      writable: true,
      configurable: true
    });

    const { result } = renderHook(() => useSyncStatus());

    await waitFor(() => {
      expect(messageHandler).not.toBeNull();
    }, { timeout: 500 });

    const errorMessage = "Network error";
    const messageEvent = new MessageEvent("message", {
      data: { type: "SYNC_ERROR", snippetId: "snippet-1", error: errorMessage }
    });

    if (messageHandler) {
      act(() => {
        messageHandler!(messageEvent);
      });
    }

    await waitFor(() => {
      expect(result.current.status).toBe("failed");
      expect(result.current.errorMessage).toBe(errorMessage);
      expect(localStorage.getItem("yarny_sync_error")).toBe(errorMessage);
    }, { timeout: 500 });
  });

  it("should handle custom sync-start event", async () => {
    const { result } = renderHook(() => useSyncStatus());

    // Wait for hook to set up event listeners
    await waitFor(() => {
      expect(result.current).toBeDefined();
    }, { timeout: 100 });

    act(() => {
      window.dispatchEvent(new CustomEvent("yarny:sync-start"));
    });

    await waitFor(() => {
      expect(result.current.status).toBe("syncing");
    }, { timeout: 500 });
  });

  it("should handle custom sync-success event", async () => {
    const { result } = renderHook(() => useSyncStatus());

    act(() => {
      window.dispatchEvent(new CustomEvent("yarny:sync-success"));
    });

    await waitFor(() => {
      expect(localStorage.getItem("yarny_last_sync_time")).toBeTruthy();
      expect(localStorage.getItem("yarny_sync_error")).toBeNull();
    });
  });

  it("should handle custom sync-error event", async () => {
    const { result } = renderHook(() => useSyncStatus());

    // Wait for hook to set up event listeners
    await waitFor(() => {
      expect(result.current).toBeDefined();
    }, { timeout: 100 });

    const errorMessage = "Custom error";
    act(() => {
      window.dispatchEvent(
        new CustomEvent("yarny:sync-error", {
          detail: { error: errorMessage }
        })
      );
    });

    await waitFor(() => {
      expect(result.current.status).toBe("failed");
      expect(result.current.errorMessage).toBe(errorMessage);
    }, { timeout: 500 });
  });

  it("should retry sync when retry is called", () => {
    localStorage.setItem("yarny_sync_error", "Previous error");

    const { result } = renderHook(() => useSyncStatus());

    const dispatchSpy = vi.spyOn(window, "dispatchEvent");

    act(() => {
      result.current.retry();
    });

    expect(localStorage.getItem("yarny_sync_error")).toBeNull();
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "yarny:retry-queued-saves"
      })
    );
  });

  it("should handle malformed queued syncs gracefully", () => {
    localStorage.setItem("yarny_queued_syncs", "invalid json");

    const { result } = renderHook(() => useSyncStatus());

    // Should not throw error, should default to synced
    expect(result.current.status).toBe("synced");
  });
});

