import { useCallback, useEffect, useState } from "react";

// Discriminated union for uptime status
type UptimeStatus =
  | { status: "up"; label: string; color?: string; uptime?: string | null; responseTime?: number | null }
  | { status: "warning"; label: string; color?: string; uptime?: string | null; responseTime?: number | null }
  | { status: "down"; label: string; color?: string; uptime?: string | null; responseTime?: number | null; error?: string }
  | { status: "unknown"; label: string; error?: string };

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function useUptimeStatus(): UptimeStatus & { isLoading: boolean } {
  const [status, setStatus] = useState<UptimeStatus>({
    status: "unknown",
    label: "Checking status..."
  });
  const [isLoading, setIsLoading] = useState(true);

  const validateUptimeStatus = (data: unknown): UptimeStatus => {
    if (!data || typeof data !== "object") {
      return { status: "unknown", label: "Invalid response" };
    }

    const obj = data as Record<string, unknown>;
    const status = obj.status;
    
    if (status === "up" || status === "warning" || status === "down" || status === "unknown") {
      const label = typeof obj.label === "string" ? obj.label : "Status Unknown";
      const color = typeof obj.color === "string" ? obj.color : undefined;
      const uptime = typeof obj.uptime === "string" || obj.uptime === null ? obj.uptime : undefined;
      const responseTime = typeof obj.responseTime === "number" || obj.responseTime === null ? obj.responseTime : undefined;
      const error = typeof obj.error === "string" ? obj.error : undefined;

      if (status === "up" || status === "warning") {
        return { status, label, color, uptime, responseTime };
      } else if (status === "down") {
        return { status, label, color, uptime, responseTime, error };
      } else {
        return { status, label, error };
      }
    }

    return { status: "unknown", label: "Invalid status" };
  };

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch("/.netlify/functions/uptime-status");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data: unknown = await response.json();
      const validatedStatus = validateUptimeStatus(data);
      setStatus(validatedStatus);
    } catch (error) {
      console.error("Error fetching status:", error);
      setStatus({
        status: "unknown",
        label: "Status Unavailable",
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetch immediately on mount
    void fetchStatus();

    // Set up polling every 5 minutes
    const interval = setInterval(() => {
      void fetchStatus();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [fetchStatus]);

  return { ...status, isLoading };
}

