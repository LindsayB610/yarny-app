import { createBrowserRouter, Navigate, useLocation } from "react-router-dom";

import { editorLoader, storiesLoader } from "./loaders";
import { getQueryClient } from "./queryClient";
import { LoginPage } from "../components/auth/LoginPage";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { DocsPage } from "../components/docs/DocsPage";
import { RouteErrorBoundary } from "../components/errors/RouteErrorBoundary";
import { AppLayout } from "../components/layout/AppLayout";
import { SettingsPage } from "../components/settings/SettingsPage";
import { StoriesPage } from "../components/stories/StoriesPage";

// Get shared query client instance
const queryClient = getQueryClient();

// Component to redirect to /stories and strip error/success query params
function RedirectToStories(): JSX.Element {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  
  // Remove any drive auth error/success params to prevent them from persisting
  searchParams.delete("drive_auth_error");
  searchParams.delete("drive_auth_success");
  
  const cleanPath = searchParams.toString() 
    ? `/stories?${searchParams.toString()}`
    : "/stories";
  
  return <Navigate to={cleanPath} replace />;
}

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
          <RedirectToStories />
        </ProtectedRoute>
      ),
      errorElement: <RouteErrorBoundary />,
      // Note: React Router v6.4+ handles loading states via Suspense
      // We'll wrap routes in Suspense in App.tsx
      // RedirectToStories explicitly strips drive_auth_error/success params
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

