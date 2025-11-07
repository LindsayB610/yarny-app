import { Box, Button, Typography } from "@mui/material";
import type { JSX } from "react";

export function DriveAuthPrompt(): JSX.Element {
  const handleConnectDrive = () => {
    // Redirect to Drive auth endpoint
    window.location.href = "/.netlify/functions/drive-auth";
  };

  return (
    <Box
      sx={{
        textAlign: "center",
        py: 8,
        px: 4
      }}
    >
      <Typography
        variant="h5"
        sx={{ color: "white", mb: 2, fontWeight: 600 }}
      >
        Connect to Google Drive
      </Typography>
      <Typography
        variant="body1"
        sx={{ color: "rgba(255, 255, 255, 0.7)", mb: 4 }}
      >
        To create and manage stories, you need to connect your Google Drive account.
      </Typography>
      <Button
        onClick={handleConnectDrive}
        variant="contained"
        sx={{
          bgcolor: "primary.main",
          color: "white",
          "&:hover": {
            bgcolor: "primary.dark"
          },
          borderRadius: "9999px",
          textTransform: "none",
          fontWeight: "bold",
          px: 4,
          py: 1.5
        }}
      >
        Connect to Drive
      </Button>
    </Box>
  );
}

