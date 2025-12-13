import { useCallback, useEffect, useState } from "react";

interface UptimeStatus {
  status: "up" | "warning" | "down" | "unknown";
  label: string;
  color?: string;
  uptime?: string | null;
  responseTime?: number | null;
  error?: string;
}

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function useUptimeStatus(): UptimeStatus & { isLoading: boolean } {
  const [status, setStatus] = useState<UptimeStatus>({
    status: "unknown",
    label: "Checking status..."
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch("/.netlify/functions/uptime-status");
      const data = (await response.json()) as UptimeStatus;

      setStatus({
        status: data.status || "unknown",
        label: data.label || "Status Unknown",
        color: data.color,
        uptime: data.uptime,
        responseTime: data.responseTime,
        error: data.error
      });
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

