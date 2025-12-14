import { useEffect, useState } from "react";

interface NetworkInformation {
  effectiveType?: string;
  saveData?: boolean;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
}

type NavigatorWithConnection = Navigator & {
  connection?: NetworkInformation;
  mozConnection?: NetworkInformation;
  webkitConnection?: NetworkInformation;
};

export interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  wasOffline: boolean;
}

/**
 * Hook to monitor network status and connection quality
 * Detects online/offline state and slow connections
 */
export function useNetworkStatus(): NetworkStatus {
  // Initialize with safe defaults to avoid hydration mismatches
  const [isOnline, setIsOnline] = useState(true);
  const [isSlowConnection, setIsSlowConnection] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined") {
      return;
    }

    // Set initial online state after mount to avoid hydration mismatch
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setWasOffline(true);
      // Reset slow connection flag when coming back online
      setIsSlowConnection(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    // Check connection quality using Network Information API if available
    const checkConnectionQuality = () => {
      const connection =
        (navigator as NavigatorWithConnection).connection ??
        (navigator as NavigatorWithConnection).mozConnection ??
        (navigator as NavigatorWithConnection).webkitConnection;

      if (connection) {
        // Consider slow if effectiveType is 2g or slow-2g
        const isSlow =
          connection.effectiveType === "slow-2g" ||
          connection.effectiveType === "2g" ||
          connection.saveData === true;

        setIsSlowConnection(isSlow);
      }
    };

    // Initial check
    checkConnectionQuality();

    // Listen for online/offline events
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Listen for connection changes
    const navigatorWithConnection = navigator as NavigatorWithConnection;
    const connection =
      navigatorWithConnection.connection ??
      navigatorWithConnection.mozConnection ??
      navigatorWithConnection.webkitConnection;

    if (connection) {
      connection.addEventListener?.("change", checkConnectionQuality);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (connection) {
        connection.removeEventListener?.("change", checkConnectionQuality);
      }
    };
  }, []);

  return {
    isOnline,
    isSlowConnection,
    wasOffline
  };
}

