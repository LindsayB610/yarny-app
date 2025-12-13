import { Box, Drawer, useTheme } from "@mui/material";
import type { JSX } from "react";

import { ResizeHandle } from "../ResizeHandle";
import { DRAWER_COLLAPSED_WIDTH } from "./types";

import { NotesSidebar } from "@/components/story/NotesSidebar";

interface RightDrawerProps {
  isMobile: boolean;
  open: boolean;
  width: number;
  isResizing: boolean;
  onToggle: () => void;
  onResize: (delta: number) => void;
}

export function RightDrawer({
  isMobile,
  open,
  width,
  isResizing,
  onToggle,
  onResize
}: RightDrawerProps): JSX.Element {
  const theme = useTheme();

  if (isMobile) {
    return (
      <Drawer
        variant="temporary"
        anchor="right"
        open={open}
        onClose={onToggle}
        sx={{
          "& .MuiDrawer-paper": {
            width,
            boxSizing: "border-box",
            borderLeft: "1px solid",
            borderColor: "divider",
            borderRadius: 0
          }
        }}
      >
        <NotesSidebar onClose={onToggle} />
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
        anchor="right"
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
            borderLeft: "1px solid",
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
        <NotesSidebar 
          isCollapsed={!open}
          onToggle={onToggle}
        />
      </Drawer>
      {open && !isMobile && (
        <ResizeHandle onResize={onResize} side="left" />
      )}
    </Box>
  );
}

