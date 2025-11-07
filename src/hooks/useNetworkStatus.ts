import { useEffect, useState } from "react";

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
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [isSlowConnection, setIsSlowConnection] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined") {
      return;
    }

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
        (navigator as any).connection ||
        (navigator as any).mozConnection ||
        (navigator as any).webkitConnection;

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
    const connection =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

    if (connection) {
      connection.addEventListener("change", checkConnectionQuality);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (connection) {
        connection.removeEventListener("change", checkConnectionQuality);
      }
    };
  }, []);

  return {
    isOnline,
    isSlowConnection,
    wasOffline
  };
}

