import { createBrowserRouter } from "react-router-dom";

import { editorLoader, storiesLoader } from "./loaders";
import { getQueryClient } from "./queryClient";
import { LoginPage } from "../components/auth/LoginPage";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { RouteErrorBoundary } from "../components/errors/RouteErrorBoundary";
import { AppLayout } from "../components/layout/AppLayout";
import { StoriesPage } from "../components/stories/StoriesPage";

// Get shared query client instance
const queryClient = getQueryClient();

export const router = createBrowserRouter(
  [
    {
      path: "/login",
      element: <LoginPage />,
      errorElement: <RouteErrorBoundary />
    },
    {
      path: "/",
      element: (
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      ),
      loader: () => storiesLoader(queryClient),
      errorElement: <RouteErrorBoundary />,
      // Note: React Router v6.4+ handles loading states via Suspense
      // We'll wrap routes in Suspense in App.tsx
    },
    {
      path: "/stories",
      element: (
        <ProtectedRoute>
          <StoriesPage />
        </ProtectedRoute>
      ),
      loader: () => storiesLoader(queryClient),
      errorElement: <RouteErrorBoundary />
    },
    {
      path: "/editor",
      element: (
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      ),
      loader: () => editorLoader(queryClient),
      errorElement: <RouteErrorBoundary />
    }
  ],
  {
    basename: "/react"
  }
);

