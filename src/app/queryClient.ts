import { QueryClient } from "@tanstack/react-query";

// Helper to check if user is authenticated
function isAuthenticated(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    const token = window.localStorage.getItem("yarny_auth");
    return !!token;
  } catch {
    return false;
  }
}

// Shared QueryClient instance for use in both providers and route loaders
let queryClientInstance: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  if (!queryClientInstance) {
    queryClientInstance = new QueryClient({
      defaultOptions: {
        queries: {
          retry: (failureCount, error) => {
            // Don't retry if it's an authentication error
            if (error instanceof Error && error.message.includes("Not authenticated")) {
              return false;
            }
            return failureCount < 3;
          },
          retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff, max 30s
          refetchOnWindowFocus: false,
          refetchOnReconnect: false, // Don't auto-refetch on reconnect to prevent loops
          refetchOnMount: (query) => {
            // Don't refetch Drive queries when not authenticated
            const queryKey = query.queryKey;
            if (Array.isArray(queryKey) && queryKey[0] === "drive") {
              return isAuthenticated();
            }
            return true; // Only refetch on mount if data is stale
          },
          staleTime: 1000 * 60 * 5 // 5 minutes - data is fresh for 5 min
        },
        mutations: {
          retry: 3 // Maximum 3 retry attempts (4 total attempts including initial)
        }
      }
    });

  }
  return queryClientInstance;
}

