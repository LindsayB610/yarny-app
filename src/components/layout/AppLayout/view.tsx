import { Box, useMediaQuery, useTheme } from "@mui/material";
import type { JSX } from "react";
import { useEffect } from "react";
import { useLoaderData } from "react-router-dom";

import { EditorArea } from "./EditorArea";
import { LeftDrawer } from "./LeftDrawer";
import { RightDrawer } from "./RightDrawer";
import { useAppLayout } from "./useAppLayout";

import { GlobalSearchModal } from "@/components/search/GlobalSearchModal";
import { EditorFooterContainer } from "@/components/story/EditorFooterContainer";
import { useGlobalSearchShortcut } from "@/hooks/useGlobalSearchShortcut";
import { useYarnyStore } from "@/store/provider";

export function AppLayoutView(): JSX.Element {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  
  const {
    sidebarSearch,
    setSidebarSearch,
    isResizing,
    leftDrawerOpen,
    setLeftDrawerOpen,
    rightDrawerOpen,
    setRightDrawerOpen,
    leftDrawerWidth,
    rightDrawerWidth,
    handleLeftResize,
    handleRightResize,
    handleSnippetClick,
    snippetId,
    showEditorLoading,
    globalSearchOpen,
    setGlobalSearchOpen
  } = useAppLayout();

  // Handle keyboard shortcut for global search
  useGlobalSearchShortcut(() => setGlobalSearchOpen(true));

  // Handle local project data from loader
  const loaderData = useLoaderData();
  const upsertEntities = useYarnyStore((state) => state.upsertEntities);
  
  // For local projects, upsert data from loader (since useDriveStoryQuery is disabled)
  useEffect(() => {
    if (loaderData?.localData) {
      upsertEntities(loaderData.localData);
    }
  }, [loaderData?.localData, upsertEntities]);

  return (
    <Box
      sx={{
        height: "100vh",
        maxHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.default",
        overflow: "hidden"
      }}
    >
      <Box sx={{ flex: 1, display: "flex", minHeight: 0, position: "relative", overflow: "hidden" }}>
        <LeftDrawer
          isMobile={isMobile}
          open={leftDrawerOpen}
          width={leftDrawerWidth}
          isResizing={isResizing}
          searchTerm={sidebarSearch}
          onSearchChange={setSidebarSearch}
          onSnippetClick={handleSnippetClick}
          activeSnippetId={snippetId}
          onToggle={() => setLeftDrawerOpen(!leftDrawerOpen)}
          onResize={handleLeftResize}
        />

        <EditorArea
          isMobile={isMobile}
          leftDrawerOpen={leftDrawerOpen}
          rightDrawerOpen={rightDrawerOpen}
          onLeftDrawerToggle={() => setLeftDrawerOpen(!leftDrawerOpen)}
          onRightDrawerToggle={() => setRightDrawerOpen(!rightDrawerOpen)}
          onGlobalSearchOpen={() => setGlobalSearchOpen(true)}
          isLoading={showEditorLoading}
        />

        <RightDrawer
          isMobile={isMobile}
          open={rightDrawerOpen}
          width={rightDrawerWidth}
          isResizing={isResizing}
          onToggle={() => setRightDrawerOpen(!rightDrawerOpen)}
          onResize={handleRightResize}
        />
      </Box>
      <Box
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1300,
          width: "100%"
        }}
      >
        <EditorFooterContainer />
      </Box>
      <GlobalSearchModal
        open={globalSearchOpen}
        onClose={() => setGlobalSearchOpen(false)}
      />
    </Box>
  );
}

