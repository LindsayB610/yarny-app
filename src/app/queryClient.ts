import { QueryClient } from "@tanstack/react-query";

// Shared QueryClient instance for use in both providers and route loaders
let queryClientInstance: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  if (!queryClientInstance) {
    queryClientInstance = new QueryClient({
      defaultOptions: {
        queries: {
          retry: 2,
          refetchOnWindowFocus: false,
          staleTime: 1000 * 60 * 5
        },
        mutations: {
          retry: 1
        }
      }
    });
  }
  return queryClientInstance;
}

