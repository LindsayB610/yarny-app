import { Suspense, useEffect } from "react";
import type { JSX } from "react";
import { RouterProvider } from "react-router-dom";

import { AppProviders } from "./providers/AppProviders";
import { router } from "./routes";
import { ErrorBoundary } from "../components/errors/ErrorBoundary";
import { RouteLoader } from "../components/loading/RouteLoader";

export function App(): JSX.Element {

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.sessionStorage.removeItem("yarny_chunk_reload_attempted");
    } catch {
      // Ignore storage access errors (e.g. privacy mode)
    }
  }, []);

  return (
    <AppProviders>
      <ErrorBoundary>
        <Suspense fallback={<RouteLoader />}>
          <RouterProvider router={router} />
        </Suspense>
      </ErrorBoundary>
    </AppProviders>
  );
}

