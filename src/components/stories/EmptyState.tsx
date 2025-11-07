import { Box, Button, Typography } from "@mui/material";
import { Add } from "@mui/icons-material";
import type { JSX } from "react";

interface EmptyStateProps {
  onNewStory: () => void;
}

export function EmptyState({ onNewStory }: EmptyStateProps): JSX.Element {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: 8,
        textAlign: "center"
      }}
    >
      <Typography variant="h6" sx={{ color: "rgba(255, 255, 255, 0.9)", mb: 2 }}>
        No stories yet
      </Typography>
      <Typography variant="body1" sx={{ color: "rgba(255, 255, 255, 0.7)", mb: 4 }}>
        Create your first story to get started!
      </Typography>
      <Button
        onClick={onNewStory}
        startIcon={<Add />}
        variant="contained"
        sx={{
          bgcolor: "primary.main",
          color: "white",
          "&:hover": {
            bgcolor: "primary.dark"
          },
          borderRadius: "9999px",
          textTransform: "none",
          fontWeight: "bold"
        }}
      >
        Create Your First Story
      </Button>
    </Box>
  );
}

