import { Suspense } from "react";
import type { JSX } from "react";
import { RouterProvider } from "react-router-dom";

import { AppProviders } from "./providers/AppProviders";
import { router } from "./routes";
import { ErrorBoundary } from "../components/errors/ErrorBoundary";
import { RouteLoader } from "../components/loading/RouteLoader";

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

