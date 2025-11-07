import { Alert, AlertTitle, Box, Button, Stack } from "@mui/material";
import { CloudOff, CloudSync, WifiOff } from "@mui/icons-material";
import { useEffect, useState } from "react";

import { useNetworkStatus } from "../../hooks/useNetworkStatus";

/**
 * Banner component that displays when the user is offline or has a slow connection
 * Shows queued saves count and allows manual retry
 */
export function OfflineBanner(): JSX.Element | null {
  const { isOnline, isSlowConnection, wasOffline } = useNetworkStatus();
  const [queuedSaves, setQueuedSaves] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  // Listen for queued saves updates from localStorage
  useEffect(() => {
    const updateQueuedSaves = () => {
      try {
        const queued = localStorage.getItem("yarny_queued_saves");
        if (queued) {
          const saves = JSON.parse(queued);
          setQueuedSaves(Array.isArray(saves) ? saves.length : 0);
        } else {
          setQueuedSaves(0);
        }
      } catch {
        setQueuedSaves(0);
      }
    };

    // Check immediately
    updateQueuedSaves();

    // Listen for storage events (from other tabs)
    window.addEventListener("storage", updateQueuedSaves);

    // Poll for changes (in case same tab updates)
    const interval = setInterval(updateQueuedSaves, 1000);

    return () => {
      window.removeEventListener("storage", updateQueuedSaves);
      clearInterval(interval);
    };
  }, []);

  const handleRetry = () => {
    setIsRetrying(true);
    // Dispatch custom event to trigger save queue processing
    window.dispatchEvent(new CustomEvent("yarny:retry-queued-saves"));
    // Reset retrying state after a delay
    setTimeout(() => setIsRetrying(false), 2000);
  };

  // Only show banner when offline, slow connection, or has queued saves
  if (isOnline && !isSlowConnection && queuedSaves === 0) {
    return null;
  }

  const getStatusMessage = () => {
    if (!isOnline) {
      return {
        title: "You're offline",
        message: queuedSaves > 0
          ? `${queuedSaves} save${queuedSaves === 1 ? "" : "s"} queued. Changes will sync when you're back online.`
          : "Your changes will be saved when you're back online.",
        icon: <WifiOff />
      };
    }
    if (isSlowConnection) {
      return {
        title: "Slow connection detected",
        message: queuedSaves > 0
          ? `${queuedSaves} save${queuedSaves === 1 ? "" : "s"} queued. Saving may take longer.`
          : "Saving may take longer due to slow connection.",
        icon: <CloudSync />
      };
    }
    if (queuedSaves > 0) {
      return {
        title: "Saves queued",
        message: `${queuedSaves} save${queuedSaves === 1 ? "" : "s"} waiting to sync.`,
        icon: <CloudOff />
      };
    }
    return null;
  };

  const status = getStatusMessage();
  if (!status) {
    return null;
  }

  return (
    <Box
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 1000,
        boxShadow: 2
      }}
    >
      <Alert
        severity={!isOnline ? "warning" : "info"}
        icon={status.icon}
        action={
          queuedSaves > 0 && isOnline ? (
            <Button
              color="inherit"
              size="small"
              onClick={handleRetry}
              disabled={isRetrying}
            >
              {isRetrying ? "Retrying..." : "Retry Now"}
            </Button>
          ) : null
        }
      >
        <AlertTitle>{status.title}</AlertTitle>
        {status.message}
      </Alert>
    </Box>
  );
}

