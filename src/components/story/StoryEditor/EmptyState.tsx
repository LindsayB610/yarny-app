import { Box, CircularProgress, Stack, Typography, useTheme } from "@mui/material";
import type { JSX } from "react";

interface EmptyStateProps {
  variant: "loading" | "no-story" | "no-snippet" | "note-active";
}

export function EmptyState({ variant }: EmptyStateProps): JSX.Element {
  const theme = useTheme();

  if (variant === "loading") {
    return (
      <Stack spacing={3} sx={{ height: "100%" }}>
        <Box
          sx={{
            flex: 1,
            borderRadius: 3,
            border: `1px solid ${theme.palette.divider}`,
            backgroundColor: "background.paper",
            boxShadow: "inset 0 2px 6px rgba(15, 23, 42, 0.04)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            py: 8
          }}
        >
          <CircularProgress size={32} />
          <Typography variant="h6">Loading story…</Typography>
          <Typography variant="body2" color="text.secondary">
            Fetching your project from Google Drive
          </Typography>
        </Box>
      </Stack>
    );
  }

  return (
    <Stack
      spacing={2}
      sx={{
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        color: "text.secondary"
      }}
    >
      <Typography variant="h5">
        {variant === "no-story" && "Select a story to start writing"}
        {variant === "no-snippet" && "Create a snippet to start writing"}
        {variant === "note-active" && "Select a snippet to start writing"}
      </Typography>
      <Typography variant="body2">
        {variant === "no-story" &&
          "Your projects and snippets will appear here once synced from Google Drive."}
        {variant === "no-snippet" &&
          "Add a snippet from the sidebar, then select it to begin writing."}
        {variant === "note-active" &&
          "Pick a chapter snippet from the sidebar to edit your story content. People, places, and things notes open in the notes editor."}
      </Typography>
    </Stack>
  );
}

