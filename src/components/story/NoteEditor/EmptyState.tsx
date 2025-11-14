import { Box, CircularProgress, Stack, Typography, useTheme } from "@mui/material";
import type { JSX } from "react";

interface EmptyStateProps {
  variant: "no-story" | "loading" | "not-found";
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
          <Typography variant="h6">Loading note…</Typography>
          <Typography variant="body2" color="text.secondary">
            Fetching content from Google Drive
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
        {variant === "no-story" && "Select a note to start writing"}
        {variant === "not-found" && "Note not found"}
      </Typography>
      <Typography variant="body2">
        {variant === "no-story" &&
          "Choose a person, place, or thing from the notes sidebar to edit it."}
        {variant === "not-found" &&
          "The selected note is no longer available. Choose another entry from the notes sidebar."}
      </Typography>
    </Stack>
  );
}

