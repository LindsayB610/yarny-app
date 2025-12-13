import { ChevronLeft, ChevronRight, Menu } from "@mui/icons-material";
import { Box, Divider, Drawer, IconButton, Stack, Tooltip, useMediaQuery, useTheme } from "@mui/material";
import type { JSX } from "react";

import { BackToStoriesLink } from "@/components/story/BackToStoriesLink";
import { StorySidebarContent } from "@/components/story/StorySidebarContent";
import { StorySidebarHeader } from "@/components/story/StorySidebarHeader";
import { ResizeHandle } from "../ResizeHandle";
import { DRAWER_COLLAPSED_WIDTH } from "./types";

interface LeftDrawerProps {
  isMobile: boolean;
  open: boolean;
  width: number;
  isResizing: boolean;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onSnippetClick: (snippetId: string) => void;
  activeSnippetId: string | undefined;
  onToggle: () => void;
  onResize: (delta: number) => void;
}

export function LeftDrawer({
  isMobile,
  open,
  width,
  isResizing,
  searchTerm,
  onSearchChange,
  onSnippetClick,
  activeSnippetId,
  onToggle,
  onResize
}: LeftDrawerProps): JSX.Element {
  const theme = useTheme();

  if (isMobile) {
    return (
      <Drawer
        variant="temporary"
        open={open}
        onClose={onToggle}
        sx={{
          "& .MuiDrawer-paper": {
            width,
            boxSizing: "border-box",
            borderRight: "1px solid",
            borderColor: "divider",
            borderRadius: 0,
            height: "100%"
          }
        }}
      >
        <Stack spacing={0} sx={{ flex: 1, py: 3, overflow: "hidden", height: "100%" }}>
          <Box sx={{ px: 2, pb: 2, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
            <BackToStoriesLink />
            <Tooltip title="Close sidebar">
              <IconButton
                onClick={onToggle}
                size="small"
                sx={{ ml: "auto" }}
              >
                <ChevronLeft fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <Divider />
          <Box sx={{ flex: 1, overflow: "auto" }}>
            <StorySidebarHeader searchTerm={searchTerm} onSearchChange={onSearchChange} />
            <Box sx={{ flex: 1, overflow: "auto" }}>
              <StorySidebarContent
                searchTerm={searchTerm}
                onSnippetClick={onSnippetClick}
                activeSnippetId={activeSnippetId}
              />
            </Box>
          </Box>
        </Stack>
      </Drawer>
    );
  }

  return (
    <Box
      sx={{
        position: "relative",
        width: open ? width : DRAWER_COLLAPSED_WIDTH,
        height: "calc(100vh - 55px)",
        flexShrink: 0,
        transition: isResizing
          ? "none"
          : theme.transitions.create("width", {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen
            })
      }}
    >
      <Drawer
        variant="permanent"
        open={open}
        sx={{
          width: open ? width : DRAWER_COLLAPSED_WIDTH,
          flexShrink: 0,
          transition: isResizing
            ? "none"
            : theme.transitions.create("width", {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen
              }),
          height: "100%",
          "& .MuiDrawer-paper": {
            width: open ? width : DRAWER_COLLAPSED_WIDTH,
            boxSizing: "border-box",
            borderRight: "1px solid",
            borderColor: "divider",
            borderRadius: 0,
            transition: isResizing
              ? "none"
              : theme.transitions.create("width", {
                  easing: theme.transitions.easing.sharp,
                  duration: theme.transitions.duration.enteringScreen
                }),
            overflowX: "hidden",
            position: "relative"
          }
        }}
      >
        <Stack spacing={0} sx={{ flex: 1, py: 3, overflow: "hidden", height: "100%" }}>
          <Box sx={{ px: 2, pb: 2, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
            {open && <BackToStoriesLink />}
            <Tooltip title={open ? "Collapse sidebar" : "Expand sidebar"}>
              <IconButton
                onClick={onToggle}
                size="small"
                sx={{ ml: open ? "auto" : 0, mx: open ? 0 : "auto" }}
              >
                {open ? <ChevronLeft fontSize="small" /> : <ChevronRight fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Box>
          {open && (
            <>
              <Divider />
              <Box sx={{ flex: 1, overflow: "auto" }}>
                <StorySidebarHeader searchTerm={searchTerm} onSearchChange={onSearchChange} />
                <Box sx={{ flex: 1, overflow: "auto" }}>
                  <StorySidebarContent
                    searchTerm={searchTerm}
                    onSnippetClick={onSnippetClick}
                    activeSnippetId={activeSnippetId}
                  />
                </Box>
              </Box>
            </>
          )}
        </Stack>
      </Drawer>
      {open && !isMobile && (
        <ResizeHandle onResize={onResize} side="right" />
      )}
    </Box>
  );
}

