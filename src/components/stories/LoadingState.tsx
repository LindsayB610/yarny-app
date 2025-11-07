import { Box, CircularProgress, Typography } from "@mui/material";
import type { JSX } from "react";

export function LoadingState(): JSX.Element {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: 8
      }}
    >
      <CircularProgress sx={{ mb: 2, color: "primary.main" }} />
      <Typography variant="body1" sx={{ color: "rgba(255, 255, 255, 0.9)" }}>
        Loading stories...
      </Typography>
    </Box>
  );
}

