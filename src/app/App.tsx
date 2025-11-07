import { Suspense } from "react";
import { RouterProvider } from "react-router-dom";
import type { JSX } from "react";

import { AppProviders } from "./providers/AppProviders";
import { RouteLoader } from "../components/loading/RouteLoader";
import { ErrorBoundary } from "../components/errors/ErrorBoundary";
import { router } from "./routes";

export function App(): JSX.Element {
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

