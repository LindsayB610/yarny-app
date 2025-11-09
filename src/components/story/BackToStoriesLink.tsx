import { ArrowBack } from "@mui/icons-material";
import { Box, Link, Typography } from "@mui/material";
import { useCallback, type JSX, type MouseEvent } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";

export function BackToStoriesLink(): JSX.Element {
  const navigate = useNavigate();

  const handleClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      navigate("/stories");
    },
    [navigate]
  );

  return (
    <Link
      component={RouterLink}
      to="/stories"
      onClick={handleClick}
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


