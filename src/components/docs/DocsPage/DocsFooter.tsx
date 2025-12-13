import { Box, Link, Stack, Typography } from "@mui/material";
import type { JSX } from "react";
import { Link as RouterLink } from "react-router-dom";

import { useAuth } from "@/hooks/useAuth";

export function DocsFooter(): JSX.Element {
  const { user } = useAuth();

  return (
    <Box
      component="footer"
      sx={{
        position: { md: "fixed" },
        bottom: 0,
        left: 0,
        right: 0,
        width: "100%",
        backgroundColor: "rgba(15, 23, 42, 0.9)",
        backdropFilter: "blur(10px)",
        borderTop: "1px solid rgba(148, 163, 184, 0.2)",
        py: { xs: 1.5, md: 2 },
        px: { xs: 3, md: 3 },
        mt: { xs: 6, md: 0 },
        zIndex: (theme) => theme.zIndex.drawer + 1
      }}
    >
      <Box
        sx={{
          maxWidth: 960,
          mx: "auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0.75,
          textAlign: "center"
        }}
      >
        <Typography
          variant="body2"
          sx={{
            color: "rgba(226, 232, 240, 0.78)",
            fontSize: "0.8125rem",
            fontWeight: 500,
            m: 0,
            lineHeight: 1.4
          }}
        >
          © {new Date().getFullYear()} Yarny. Your personal writing tool.
        </Typography>
        <Stack
          direction="row"
          spacing={{ xs: 2, md: 3 }}
          flexWrap="wrap"
          justifyContent="center"
          component="nav"
          aria-label="Footer navigation"
        >
          {user && (
            <Link
              component={RouterLink}
              to="/stories"
              sx={{
                color: "rgba(34, 211, 238, 0.9)",
                textDecoration: "none",
                fontSize: "0.8125rem",
                fontWeight: 600,
                transition: "color 0.2s ease",
                "&:hover": {
                  color: "rgba(165, 243, 252, 0.95)"
                }
              }}
            >
              My Stories
            </Link>
          )}
          <Link
            component={RouterLink}
            to="/docs"
            sx={{
              color: "rgba(34, 211, 238, 0.9)",
              textDecoration: "none",
              fontSize: "0.8125rem",
              fontWeight: 600,
              transition: "color 0.2s ease",
              "&:hover": {
                color: "rgba(165, 243, 252, 0.95)"
              }
            }}
          >
            User Guide
          </Link>
          <Link
            component="a"
            href="/migration-plan"
            sx={{
              color: "rgba(34, 211, 238, 0.9)",
              textDecoration: "none",
              fontSize: "0.8125rem",
              fontWeight: 600,
              transition: "color 0.2s ease",
              "&:hover": {
                color: "rgba(165, 243, 252, 0.95)"
              }
            }}
          >
            Migration Plan
          </Link>
          {!user && (
            <Link
              component={RouterLink}
              to="/login"
              sx={{
                color: "rgba(34, 211, 238, 0.9)",
                textDecoration: "none",
                fontSize: "0.8125rem",
                fontWeight: 600,
                transition: "color 0.2s ease",
                "&:hover": {
                  color: "rgba(165, 243, 252, 0.95)"
                }
              }}
            >
              Back to Login
            </Link>
          )}
        </Stack>
      </Box>
    </Box>
  );
}

