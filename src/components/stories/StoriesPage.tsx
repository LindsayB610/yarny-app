import { Alert, Box, Container, Typography } from "@mui/material";
import { useEffect, useMemo, useState, type JSX } from "react";
import { useLoaderData, useNavigate, useSearchParams } from "react-router-dom";

import { DriveAuthPrompt } from "./DriveAuthPrompt";
import { EmptyState } from "./EmptyState";
import { LoadingState } from "./LoadingState";
import { NewStoryModal } from "./NewStoryModal";
import { StoriesHeader } from "./StoriesHeader";
import { VirtualizedStoryList } from "./VirtualizedStoryList";
import type { StoriesLoaderData } from "../../app/loaders";
import { useAuth } from "../../hooks/useAuth";
import { useStoriesQuery } from "../../hooks/useStoriesQuery";
import { useRefreshStories } from "../../hooks/useStoryMutations";
import { AppFooter } from "../layout/AppFooter";

export function StoriesPage(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const loaderData = useLoaderData() as StoriesLoaderData | undefined;
  const { user, logout } = useAuth();
  const { data: stories, isLoading, error } = useStoriesQuery();
  const refreshStories = useRefreshStories();
  const [isNewStoryModalOpen, setIsNewStoryModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState(false);

  // Check for auth error or success in URL params
  useEffect(() => {
    const errorParam = searchParams.get("drive_auth_error");
    const successParam = searchParams.get("drive_auth_success");

    // Always clear error/success params from URL to prevent them from persisting
    const hasErrorParam = errorParam !== null;
    const hasSuccessParam = successParam !== null;

    if (hasErrorParam) {
      const errorMessage = decodeURIComponent(errorParam);
      setAuthError(errorMessage);
      
      // If it's an invalid_grant error, invalidate Drive queries to force re-check
      // This will cause the loader to re-run and detect missing tokens
      if (errorMessage.toLowerCase().includes("invalid_grant")) {
        // Invalidate Drive-related queries so the loader will re-check authorization
        refreshStories.mutateAsync().catch(() => {
          // Ignore errors - this is just to trigger a re-check
        });
      }
    }

    if (hasSuccessParam && successParam === "true") {
      setAuthSuccess(true);
      // Clear success message after 5 seconds
      const timer = setTimeout(() => setAuthSuccess(false), 5000);
      
      // Clear params from URL
      if (hasErrorParam || hasSuccessParam) {
        const newParams = new URLSearchParams(searchParams);
        newParams.delete("drive_auth_error");
        newParams.delete("drive_auth_success");
        setSearchParams(newParams, { replace: true });
      }
      
      return () => clearTimeout(timer);
    } else if (hasErrorParam) {
      // Clear error param from URL immediately after reading it
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("drive_auth_error");
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams, refreshStories]);

  // Filter stories based on search query
  const filteredStories = useMemo(
    () =>
      stories?.filter((story) =>
        story.name.toLowerCase().includes(searchQuery.toLowerCase())
      ) || [],
    [stories, searchQuery]
  );

  // Check if Drive is authorized
  // If we have an auth error (especially invalid_grant), treat as unauthorized
  const isDriveAuthorized =
    loaderData?.driveAuthorized === false || authError !== null
      ? false
      : !error && (stories !== undefined || isLoading);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleRefresh = async () => {
    await refreshStories.mutateAsync();
  };

  if (!user) {
    navigate("/login");
    return <></>;
  }

  return (
    <>
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          background:
            "linear-gradient(180deg, hsla(160, 84%, 39%, 1) 0%, hsla(180, 94%, 31%, 1) 100%)"
        }}
      >
        <Container maxWidth="lg" sx={{ pt: 6, pb: 4, flexGrow: 1 }}>
          <StoriesHeader
            onLogout={handleLogout}
            onNewStory={() => setIsNewStoryModalOpen(true)}
            onRefresh={handleRefresh}
            onSearchChange={setSearchQuery}
            searchQuery={searchQuery}
          />

          <Box
            sx={{
              mt: 4,
              bgcolor: "rgba(31, 41, 55, 0.95)",
              backdropFilter: "blur(10px)",
              borderRadius: 3,
              p: 4,
              boxShadow: 6
            }}
          >
            {authError && (
              <Alert
                severity="error"
                sx={{ mb: 3 }}
                onClose={() => {
                  setAuthError(null);
                  // Also clear from URL if it somehow persists
                  const newParams = new URLSearchParams(searchParams);
                  newParams.delete("drive_auth_error");
                  setSearchParams(newParams, { replace: true });
                }}
                action={
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() => {
                      setAuthError(null);
                      // Clear from URL before redirecting
                      const newParams = new URLSearchParams(searchParams);
                      newParams.delete("drive_auth_error");
                      setSearchParams(newParams, { replace: true });
                      // Small delay to ensure URL is cleared before redirect
                      setTimeout(() => {
                        window.location.href = "/.netlify/functions/drive-auth";
                      }, 100);
                    }}
                  >
                    Try Again
                  </Button>
                }
              >
                <Typography variant="h6" gutterBottom>
                  Google Drive Authorization Failed
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  You&apos;re still logged in to the app. This error is about connecting to Google Drive.
                </Typography>
                <Typography
                  variant="body2"
                  component="pre"
                  sx={{
                    whiteSpace: "pre-wrap",
                    fontFamily: "inherit",
                    mb: 0,
                    fontSize: "0.875rem",
                    bgcolor: "rgba(0, 0, 0, 0.1)",
                    p: 1,
                    borderRadius: 1
                  }}
                >
                  {authError}
                </Typography>
              </Alert>
            )}

            {authSuccess && (
              <Alert severity="success" sx={{ mb: 3 }} onClose={() => setAuthSuccess(false)}>
                <Typography variant="body1">
                  Successfully connected to Google Drive! Your stories will now sync with Drive.
                </Typography>
              </Alert>
            )}

            {!isDriveAuthorized && !authError ? (
              // Only show DriveAuthPrompt if there's no error (error alert handles the error case)
              <DriveAuthPrompt />
            ) : !isDriveAuthorized && authError ? (
              // If there's an error, show a simplified prompt below the error
              <Box sx={{ textAlign: "center", py: 4 }}>
                <Typography variant="body1" sx={{ color: "rgba(255, 255, 255, 0.7)", mb: 3 }}>
                  Click &quot;Try Again&quot; above to reconnect to Google Drive.
                </Typography>
              </Box>
            ) : isLoading ? (
              <LoadingState />
            ) : filteredStories.length === 0 && searchQuery ? (
              <Box sx={{ textAlign: "center", py: 6 }}>
                <Typography variant="body1" sx={{ color: "rgba(255, 255, 255, 0.7)" }}>
                  No stories found matching &quot;{searchQuery}&quot;
                </Typography>
              </Box>
            ) : filteredStories.length === 0 ? (
              <EmptyState onNewStory={() => setIsNewStoryModalOpen(true)} />
            ) : (
              <VirtualizedStoryList stories={filteredStories} searchQuery={searchQuery} />
            )}
          </Box>
        </Container>

        <AppFooter variant="dark" />
      </Box>

      <NewStoryModal
        open={isNewStoryModalOpen}
        onClose={() => setIsNewStoryModalOpen(false)}
      />
    </>
  );
}

