import { ArrowBack } from "@mui/icons-material";
import { Box, Link, Typography } from "@mui/material";
import type { JSX } from "react";
import { Link as RouterLink } from "react-router-dom";

export function BackToStoriesLink(): JSX.Element {
  return (
    <Link
      component={RouterLink}
      to="/stories"
      underline="none"
      color="inherit"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 1,
        fontWeight: 500,
        "&:hover": {
          color: "primary.main"
        }
      }}
      aria-label="Back to stories"
    >
      <Box
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 1
        }}
      >
        <ArrowBack fontSize="small" />
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          Stories
        </Typography>
      </Box>
    </Link>
  );
}


