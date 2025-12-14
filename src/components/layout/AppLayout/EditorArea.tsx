import { Menu, Notes, Search } from "@mui/icons-material";
import { Box, IconButton, Tooltip } from "@mui/material";
import type { JSX } from "react";

import { OfflineBanner } from "../OfflineBanner";

import { StoryEditor } from "@/components/story/StoryEditor";

interface EditorAreaProps {
  isMobile: boolean;
  leftDrawerOpen: boolean;
  rightDrawerOpen: boolean;
  onLeftDrawerToggle: () => void;
  onRightDrawerToggle: () => void;
  onGlobalSearchOpen: () => void;
  isLoading: boolean;
}

export function EditorArea({
  isMobile,
  leftDrawerOpen,
  rightDrawerOpen,
  onLeftDrawerToggle,
  onRightDrawerToggle,
  onGlobalSearchOpen,
  isLoading
}: EditorAreaProps): JSX.Element {
  return (
    <Box
      component="main"
      sx={{
        flex: 1,
        px: { xs: 2, md: 6 },
        pt: 4,
        display: "flex",
        flexDirection: "column",
        gap: 4,
        overflow: "hidden",
        minWidth: 0, // Prevent flex item from overflowing
        position: "relative"
      }}
    >
      {/* Drawer Toggle Buttons - Only on mobile */}
      {isMobile && (
        <>
          <Box
            sx={{
              position: "absolute",
              top: 8,
              left: 8,
              zIndex: 1200
            }}
          >
            <Tooltip title={leftDrawerOpen ? "Hide sidebar" : "Show sidebar"}>
              <IconButton
                onClick={onLeftDrawerToggle}
                size="small"
                sx={{
                  bgcolor: "background.paper",
                  boxShadow: 2,
                  "&:hover": {
                    bgcolor: "action.hover"
                  }
                }}
              >
                <Menu />
              </IconButton>
            </Tooltip>
          </Box>
          <Box
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              zIndex: 1200
            }}
          >
            <Tooltip title={rightDrawerOpen ? "Hide notes" : "Show notes"}>
              <IconButton
                onClick={onRightDrawerToggle}
                size="small"
                sx={{
                  bgcolor: "background.paper",
                  boxShadow: 2,
                  "&:hover": {
                    bgcolor: "action.hover"
                  }
                }}
              >
                <Notes />
              </IconButton>
            </Tooltip>
          </Box>
        </>
      )}

      {/* Global Search Button - Desktop */}
      {!isMobile && (
        <Box
          sx={{
            position: "absolute",
            top: 16,
            right: 16,
            zIndex: 1200
          }}
        >
          <Tooltip title="Search (⌘K or Ctrl+K)">
            <IconButton
              onClick={onGlobalSearchOpen}
              size="small"
              sx={{
                bgcolor: "background.paper",
                boxShadow: 2,
                "&:hover": {
                  bgcolor: "action.hover"
                }
              }}
            >
              <Search />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      <OfflineBanner />
      <StoryEditor isLoading={isLoading} />
    </Box>
  );
}

