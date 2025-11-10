import { lazy } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";

import { editorLoader, storiesLoader } from "./loaders";
import { getQueryClient } from "./queryClient";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { RouteErrorBoundary } from "../components/errors/RouteErrorBoundary";

const LoginPage = lazy(async () => {
  const module = await import("../components/auth/LoginPage");
  return { default: module.LoginPage };
});

const StoriesPage = lazy(async () => {
  const module = await import("../components/stories/StoriesPage");
  return { default: module.StoriesPage };
});

const SettingsPage = lazy(async () => {
  const module = await import("../components/settings/SettingsPage");
  return { default: module.SettingsPage };
});

const AppLayout = lazy(async () => {
  const module = await import("../components/layout/AppLayout");
  return { default: module.AppLayout };
});

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

