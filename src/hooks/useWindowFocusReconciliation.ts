import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { useAuth } from "./useAuth";

/**
 * Hook to reconcile authentication state and query data when window gains focus.
 * This ensures that if the user logs in/out in another tab, the current tab
 * reflects those changes.
 */
export function useWindowFocusReconciliation(): void {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    const handleFocus = () => {
      // Check if auth state has changed
      const storedAuth = localStorage.getItem("yarny_auth");

      const currentToken = user?.token;
      const storedToken = storedAuth;

      // If tokens don't match, invalidate all queries to trigger re-fetch
      if (currentToken !== storedToken) {
        console.log("[Reconciliation] Auth state changed, invalidating queries");
        queryClient.invalidateQueries();

        // If user logged out in another tab, clear all data
        if (!storedToken && currentToken) {
          queryClient.clear();
        }
      }

      // Refetch active queries to ensure data is fresh
      queryClient.refetchQueries({
        type: "active"
      });
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [queryClient, user?.token]);
}

