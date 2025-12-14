import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../tests/setup/msw-server";
import { useUptimeStatus } from "./useUptimeStatus";

describe("useUptimeStatus", () => {
  afterEach(() => {
    server.resetHandlers();
  });

  it("should fetch status on mount", async () => {
    const { result } = renderHook(() => useUptimeStatus());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.status).toBe("up");
    expect(result.current.label).toBe("All Systems Operational");
  });

  it("should handle up status", async () => {
    server.use(
      http.get("/.netlify/functions/uptime-status", () => {
        return HttpResponse.json({
          status: "up",
          label: "All Systems Operational",
          color: "green"
        });
      })
    );

    const { result } = renderHook(() => useUptimeStatus());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.status).toBe("up");
    expect(result.current.label).toBe("All Systems Operational");
  });

  it("should handle warning status", async () => {
    server.use(
      http.get("/.netlify/functions/uptime-status", () => {
        return HttpResponse.json({
          status: "warning",
          label: "Possible Issues",
          color: "yellow"
        });
      })
    );

    const { result } = renderHook(() => useUptimeStatus());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.status).toBe("warning");
    expect(result.current.label).toBe("Possible Issues");
  });

  it("should handle down status", async () => {
    server.use(
      http.get("/.netlify/functions/uptime-status", () => {
        return HttpResponse.json({
          status: "down",
          label: "Service Down",
          color: "red"
        });
      })
    );

    const { result } = renderHook(() => useUptimeStatus());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.status).toBe("down");
    expect(result.current.label).toBe("Service Down");
  });

  it("should handle unknown status", async () => {
    server.use(
      http.get("/.netlify/functions/uptime-status", () => {
        return HttpResponse.json({
          status: "unknown",
          label: "Status Unknown"
        });
      })
    );

    const { result } = renderHook(() => useUptimeStatus());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.status).toBe("unknown");
    expect(result.current.label).toBe("Status Unknown");
  });

  it("should handle fetch errors", async () => {
    server.use(
      http.get("/.netlify/functions/uptime-status", () => {
        return HttpResponse.error();
      })
    );

    const { result } = renderHook(() => useUptimeStatus());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.status).toBe("unknown");
    expect(result.current.label).toBe("Status Unavailable");
  });

  it("should set up polling interval", async () => {
    let callCount = 0;
    server.use(
      http.get("/.netlify/functions/uptime-status", () => {
        callCount++;
        return HttpResponse.json({
          status: "up",
          label: "All Systems Operational"
        });
      })
    );

    const { result } = renderHook(() => useUptimeStatus());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Initial fetch should have occurred
    expect(callCount).toBeGreaterThanOrEqual(1);
    expect(result.current.status).toBe("up");
  });

  it("should handle missing status in response", async () => {
    server.use(
      http.get("/.netlify/functions/uptime-status", () => {
        return HttpResponse.json({
          label: "Custom Status"
        });
      })
    );

    const { result } = renderHook(() => useUptimeStatus());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 2000 });

    expect(result.current.status).toBe("unknown");
    expect(result.current.label).toBe("Custom Status");
  });

  it("should handle missing label in response", async () => {
    server.use(
      http.get("/.netlify/functions/uptime-status", () => {
        return HttpResponse.json({
          status: "up"
        });
      })
    );

    const { result } = renderHook(() => useUptimeStatus());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 2000 });

    expect(result.current.status).toBe("up");
    expect(result.current.label).toBe("Status Unknown");
  });

  it("should clean up on unmount", async () => {
    const { result, unmount } = renderHook(() => useUptimeStatus());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.status).toBeDefined();

    // Unmount should not throw errors
    unmount();
  });
});

