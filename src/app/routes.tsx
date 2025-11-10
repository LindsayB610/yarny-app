import { createBrowserRouter, Navigate } from "react-router-dom";

import { editorLoader, storiesLoader } from "./loaders";
import { getQueryClient } from "./queryClient";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { RouteErrorBoundary } from "../components/errors/RouteErrorBoundary";
import { LoginPage } from "../components/auth/LoginPage";
import { StoriesPage } from "../components/stories/StoriesPage";
import { DocsPage } from "../components/docs/DocsPage";
import { SettingsPage } from "../components/settings/SettingsPage";
import { AppLayout } from "../components/layout/AppLayout";

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
      path: "/docs",
      element: <DocsPage />,
      errorElement: <RouteErrorBoundary />
    },
    {
      path: "/docs.html",
      element: <DocsPage />,
      errorElement: <RouteErrorBoundary />
    },
    {
      path: "/",
      element: (
        <ProtectedRoute>
          <Navigate to="/stories" replace />
        </ProtectedRoute>
      ),
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
    },
    {
      path: "/settings",
      element: (
        <ProtectedRoute>
          <Navigate to="/settings/storage" replace />
        </ProtectedRoute>
      ),
      errorElement: <RouteErrorBoundary />
    },
    {
      path: "/settings/storage",
      element: (
        <ProtectedRoute>
          <SettingsPage />
        </ProtectedRoute>
      ),
      errorElement: <RouteErrorBoundary />
    }
  ]
);

