import { QueryClient } from "@tanstack/react-query";

// Shared QueryClient instance for use in both providers and route loaders
let queryClientInstance: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  if (!queryClientInstance) {
    queryClientInstance = new QueryClient({
      defaultOptions: {
        queries: {
          retry: 3, // Maximum 3 retry attempts (4 total attempts including initial)
          retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff, max 30s
          refetchOnWindowFocus: false,
          refetchOnReconnect: false, // Don't auto-refetch on reconnect to prevent loops
          refetchOnMount: true, // Only refetch on mount if data is stale
          staleTime: 1000 * 60 * 5 // 5 minutes - data is fresh for 5 min
        },
        mutations: {
          retry: 3 // Maximum 3 retry attempts (4 total attempts including initial)
        }
      }
    });

    // Wrap invalidateQueries to log invalidations
    const originalInvalidate = queryClientInstance.invalidateQueries.bind(queryClientInstance);
    queryClientInstance.invalidateQueries = function(options) {
      const queryKey = options?.queryKey;
      console.log("[QueryClient] Invalidating queries:", queryKey ? JSON.stringify(queryKey) : "ALL QUERIES", new Error().stack?.split("\n")[2]?.trim());
      return originalInvalidate(options);
    };

    // Wrap refetchQueries to log refetches
    const originalRefetch = queryClientInstance.refetchQueries.bind(queryClientInstance);
    queryClientInstance.refetchQueries = function(options) {
      const queryKey = options?.queryKey;
      const stack = new Error().stack;
      const caller = stack?.split("\n")[2]?.trim() || "unknown";
      console.log("[QueryClient] Refetching queries:", queryKey ? JSON.stringify(queryKey) : "ALL QUERIES", "from:", caller);
      return originalRefetch(options);
    };

    // Wrap fetchQuery to log fetches
    const originalFetch = queryClientInstance.fetchQuery.bind(queryClientInstance);
    queryClientInstance.fetchQuery = function(options) {
      const queryKey = options?.queryKey;
      console.log("[QueryClient] Fetching query:", JSON.stringify(queryKey));
      return originalFetch(options);
    };
  }
  return queryClientInstance;
}

