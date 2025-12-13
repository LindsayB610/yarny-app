import AutoStoriesIcon from "@mui/icons-material/AutoStories";
import MenuIcon from "@mui/icons-material/Menu";
import { AppBar, Box, Button, IconButton, Stack, Toolbar, Typography, useMediaQuery, useTheme } from "@mui/material";
import type { JSX } from "react";
import { Link as RouterLink } from "react-router-dom";

import { useAuth } from "@/hooks/useAuth";

interface DocsHeaderProps {
  onMenuClick: () => void;
}

export function DocsHeader({ onMenuClick }: DocsHeaderProps): JSX.Element {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up("md"));
  const { user } = useAuth();

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        backdropFilter: "blur(14px)",
        backgroundColor: "rgba(255, 255, 255, 0.92)",
        color: theme.palette.text.primary,
        borderBottom: "1px solid rgba(255, 255, 255, 0.2)",
        width: "100%",
        ml: 0,
        borderRadius: 0,
        zIndex: (theme) => theme.zIndex.drawer + 1
      }}
    >
      <Toolbar sx={{ minHeight: 88, display: "flex", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          {!isMdUp && (
            <IconButton
              color="inherit"
              edge="start"
              onClick={onMenuClick}
              aria-label="Open navigation menu"
              sx={{ mr: 1 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexShrink: 0 }}>
            <Box
              component={RouterLink}
              to={user ? "/stories" : "/login"}
              sx={{
                display: "inline-block",
                textDecoration: "none",
                flexShrink: 0,
                "&:hover": {
                  opacity: 0.9
                }
              }}
            >
              <Box
                component="img"
                src="/yarny-wordmark.svg"
                alt="Yarny"
                sx={{
                  height: "3rem"
                }}
              />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
              User Guide
            </Typography>
          </Box>
        </Box>
        <Stack direction="row" spacing={1.5}>
          {user ? (
            <>
              <Button
                component={RouterLink}
                to="/stories"
                color="primary"
                variant="contained"
                startIcon={<AutoStoriesIcon />}
                sx={{ borderRadius: "9999px", textTransform: "none", fontWeight: 600 }}
              >
                Back to Stories
              </Button>
              <Button
                component={RouterLink}
                to="/settings/storage"
                color="inherit"
                variant="outlined"
                sx={{ borderRadius: "9999px", textTransform: "none" }}
              >
                Storage Settings
              </Button>
            </>
          ) : (
            <Button
              component={RouterLink}
              to="/login"
              color="inherit"
              variant="outlined"
              sx={{ borderRadius: "9999px", textTransform: "none" }}
            >
              Back to Sign In
            </Button>
          )}
        </Stack>
      </Toolbar>
    </AppBar>
  );
}

