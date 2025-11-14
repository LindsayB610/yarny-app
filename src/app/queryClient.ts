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

  }
  return queryClientInstance;
}

