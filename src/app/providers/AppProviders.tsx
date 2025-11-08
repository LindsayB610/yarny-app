import { CssBaseline, ThemeProvider } from "@mui/material";
import { QueryClientProvider } from "@tanstack/react-query";
import type { JSX, PropsWithChildren } from "react";

import { AppStoreProvider } from "../../store/provider";
import { LocalBackupProvider } from "../../store/localBackupProvider";
import { theme } from "../../theme";
import { getQueryClient } from "../queryClient";

const queryClient = getQueryClient();

export function AppProviders({ children }: PropsWithChildren): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <AppStoreProvider>
        <LocalBackupProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            {children}
          </ThemeProvider>
        </LocalBackupProvider>
      </AppStoreProvider>
    </QueryClientProvider>
  );
}

