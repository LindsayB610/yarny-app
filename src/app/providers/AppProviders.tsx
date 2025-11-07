import { CssBaseline, ThemeProvider } from "@mui/material";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { JSX, PropsWithChildren } from "react";

import { AppStoreProvider } from "../../store/provider";
import { theme } from "../../theme";

const queryClient = new QueryClient({
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

export function AppProviders({ children }: PropsWithChildren): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <AppStoreProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </AppStoreProvider>
    </QueryClientProvider>
  );
}

