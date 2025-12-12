import { ChevronLeft, ChevronRight, Menu, Notes } from "@mui/icons-material";
import {
  Box,
  Divider,
  Drawer,
  IconButton,
  Stack,
  Tooltip,
  useTheme,
  useMediaQuery
} from "@mui/material";
import { useCallback, useEffect, useState, type JSX } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { OfflineBanner } from "./OfflineBanner";
import { ResizeHandle } from "./ResizeHandle";
import { useActiveStory } from "../../hooks/useActiveStory";
import { useDriveProjectsQuery, useDriveStoryQuery } from "../../hooks/useDriveQueries";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import { useWindowFocusReconciliation } from "../../hooks/useWindowFocusReconciliation";
import { mirrorStoryFolderEnsure } from "../../services/localFs/localBackupMirror";
import { useYarnyStore } from "../../store/provider";
import { BackToStoriesLink } from "../story/BackToStoriesLink";
import { EditorFooterContainer } from "../story/EditorFooterContainer";
import { NotesSidebar } from "../story/NotesSidebar";
import { StoryEditor } from "../story/StoryEditor";
import { StorySidebarContent } from "../story/StorySidebarContent";
import { StorySidebarHeader } from "../story/StorySidebarHeader";

const DRAWER_WIDTH_LEFT = 420;
const DRAWER_WIDTH_RIGHT = 420;
const DRAWER_COLLAPSED_WIDTH = 64;
const DRAWER_MIN_WIDTH = 200;
const DRAWER_MAX_WIDTH = 800;
const DRAWER_STORAGE_KEY_LEFT = "yarny_left_drawer_open";
const DRAWER_STORAGE_KEY_RIGHT = "yarny_right_drawer_open";
const DRAWER_WIDTH_STORAGE_KEY_LEFT = "yarny_left_drawer_width";
const DRAWER_WIDTH_STORAGE_KEY_RIGHT = "yarny_right_drawer_width";

export function AppLayout(): JSX.Element {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const navigate = useNavigate();
  const { storyId, snippetId, noteId } = useParams<{
    storyId?: string;
    snippetId?: string;
    noteId?: string;
  }>();
  const { data } = useDriveProjectsQuery();
  const selectProject = useYarnyStore((state) => state.selectProject);
  const selectContent = useYarnyStore((state) => state.selectContent);
  const selectedProjectId = useYarnyStore((state) => state.ui.selectedProjectId);
  const activeStory = useActiveStory();
  const { isOnline } = useNetworkStatus();
  
  // Sync URL params with store
  useEffect(() => {
    if (snippetId) {
      selectContent(snippetId, "snippet");
    } else if (noteId) {
      selectContent(noteId, "note");
    } else {
      selectContent(undefined, "snippet");
    }
  }, [snippetId, noteId, selectContent]);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [isResizing, setIsResizing] = useState(false);

  // Drawer state with persistence
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem(DRAWER_STORAGE_KEY_LEFT);
    return stored !== null ? stored === "true" : true; // Default to open
  });

  const [rightDrawerOpen, setRightDrawerOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem(DRAWER_STORAGE_KEY_RIGHT);
    return stored !== null ? stored === "true" : true; // Default to open
  });

  // Drawer widths with persistence
  const [leftDrawerWidth, setLeftDrawerWidth] = useState(() => {
    if (typeof window === "undefined") return DRAWER_WIDTH_LEFT;
    const stored = localStorage.getItem(DRAWER_WIDTH_STORAGE_KEY_LEFT);
    return stored ? Math.max(DRAWER_MIN_WIDTH, Math.min(DRAWER_MAX_WIDTH, Number(stored))) : DRAWER_WIDTH_LEFT;
  });

  const [rightDrawerWidth, setRightDrawerWidth] = useState(() => {
    if (typeof window === "undefined") return DRAWER_WIDTH_RIGHT;
    const stored = localStorage.getItem(DRAWER_WIDTH_STORAGE_KEY_RIGHT);
    return stored ? Math.max(DRAWER_MIN_WIDTH, Math.min(DRAWER_MAX_WIDTH, Number(stored))) : DRAWER_WIDTH_RIGHT;
  });

  // Persist drawer state
  useEffect(() => {
    localStorage.setItem(DRAWER_STORAGE_KEY_LEFT, String(leftDrawerOpen));
  }, [leftDrawerOpen]);

  useEffect(() => {
    localStorage.setItem(DRAWER_STORAGE_KEY_RIGHT, String(rightDrawerOpen));
  }, [rightDrawerOpen]);

  // Persist drawer widths
  useEffect(() => {
    localStorage.setItem(DRAWER_WIDTH_STORAGE_KEY_LEFT, String(leftDrawerWidth));
  }, [leftDrawerWidth]);

  useEffect(() => {
    localStorage.setItem(DRAWER_WIDTH_STORAGE_KEY_RIGHT, String(rightDrawerWidth));
  }, [rightDrawerWidth]);

  // Handle resize
  const handleLeftResize = useCallback((delta: number) => {
    setIsResizing(true);
    setLeftDrawerWidth((prev) => Math.max(DRAWER_MIN_WIDTH, Math.min(DRAWER_MAX_WIDTH, prev + delta)));
  }, []);

  const handleRightResize = useCallback((delta: number) => {
    setIsResizing(true);
    setRightDrawerWidth((prev) => Math.max(DRAWER_MIN_WIDTH, Math.min(DRAWER_MAX_WIDTH, prev + delta)));
  }, []);

  useEffect(() => {
    if (!isResizing) return;
    const timeoutId = setTimeout(() => setIsResizing(false), 100);
    return () => clearTimeout(timeoutId);
  }, [isResizing]);

  const handleSnippetClick = useCallback(
    (clickedSnippetId: string) => {
      if (storyId && clickedSnippetId !== snippetId) {
        navigate(`/stories/${storyId}/snippets/${clickedSnippetId}`);
      }
    },
    [navigate, storyId, snippetId]
  );


  const { data: storyData, isPending: isStoryLoading, isFetching: isStoryFetching } = useDriveStoryQuery(storyId);
  const upsertEntities = useYarnyStore((state) => state.upsertEntities);
  const selectStory = useYarnyStore((state) => state.selectStory);
  const storiesFromStore = useYarnyStore((state) => state.entities.stories);
  
  // Select story when route changes
  useEffect(() => {
    if (storyId && storiesFromStore[storyId]) {
      selectStory(storyId);
    }
  }, [storyId, storiesFromStore, selectStory]);
  
  // Ensure story data from query is upserted into store (in case it came from cache)
  useEffect(() => {
    if (storyData) {
      upsertEntities(storyData);
    }
  }, [storyData, upsertEntities]);
  
  const hasActiveContent = Boolean(snippetId || noteId);
  const showEditorLoading =
    !hasActiveContent &&
    Boolean(storyId) &&
    (isStoryLoading || (!activeStory && isStoryFetching));

  // Reconcile auth and query state on window focus
  useWindowFocusReconciliation();

  // Sync project selection with active story from route
  useEffect(() => {
    if (activeStory && selectedProjectId !== activeStory.projectId) {
      selectProject(activeStory.projectId);
    }
  }, [activeStory, selectProject, selectedProjectId]);

  // Auto-select first project if none selected and we have projects
  useEffect(() => {
    if (!data?.projects?.length) {
      return;
    }

    if (!activeStory && !selectedProjectId) {
      selectProject(data.projects[0].id);
    }
  }, [activeStory, data?.projects, selectProject, selectedProjectId]);

  // Mirror story folder for local backup
  useEffect(() => {
    if (!storyId) {
      return;
    }
    void mirrorStoryFolderEnsure(storyId);
  }, [storyId]);

  // Process queued saves on story load (bypasses hooks to prevent loops)
  useEffect(() => {
    if (!storyId || !isOnline) {
      return;
    }
    
    // Process queued saves after a short delay to ensure story is loaded
    const timeoutId = setTimeout(() => {
      import("../../services/queuedSaveProcessor").then(({ processQueuedSavesDirectly }) => {
        void processQueuedSavesDirectly().catch((error: unknown) => {
          console.error("[AppLayout] Failed to process queued saves:", error);
        });
      });
    }, 1000);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [storyId, isOnline]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.default"
      }}
    >
      <Box sx={{ flex: 1, display: "flex", minHeight: 0, position: "relative" }}>
        {/* Left Drawer: Projects & Stories */}
        {isMobile ? (
          <Drawer
            variant="temporary"
            open={leftDrawerOpen}
            onClose={() => setLeftDrawerOpen(false)}
            sx={{
              "& .MuiDrawer-paper": {
                width: leftDrawerWidth,
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
                    onClick={() => setLeftDrawerOpen(false)}
                    size="small"
                    sx={{ ml: "auto" }}
                  >
                    <ChevronLeft fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <Divider />
              <Box sx={{ flex: 1, overflow: "auto" }}>
                <StorySidebarHeader searchTerm={sidebarSearch} onSearchChange={setSidebarSearch} />
                <Box sx={{ flex: 1, overflow: "auto" }}>
                  <StorySidebarContent
                    searchTerm={sidebarSearch}
                    onSnippetClick={handleSnippetClick}
                    activeSnippetId={snippetId}
                  />
                </Box>
              </Box>
            </Stack>
          </Drawer>
        ) : (
          <Box
            sx={{
              position: "relative",
              width: leftDrawerOpen ? leftDrawerWidth : DRAWER_COLLAPSED_WIDTH,
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
              open={leftDrawerOpen}
              sx={{
                width: leftDrawerOpen ? leftDrawerWidth : DRAWER_COLLAPSED_WIDTH,
                flexShrink: 0,
                transition: isResizing
                  ? "none"
                  : theme.transitions.create("width", {
                      easing: theme.transitions.easing.sharp,
                      duration: theme.transitions.duration.enteringScreen
                    }),
                    height: "100%",
                "& .MuiDrawer-paper": {
                  width: leftDrawerOpen ? leftDrawerWidth : DRAWER_COLLAPSED_WIDTH,
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
                  {leftDrawerOpen && <BackToStoriesLink />}
                  <Tooltip title={leftDrawerOpen ? "Collapse sidebar" : "Expand sidebar"}>
                    <IconButton
                      onClick={() => setLeftDrawerOpen(!leftDrawerOpen)}
                      size="small"
                      sx={{ ml: leftDrawerOpen ? "auto" : 0, mx: leftDrawerOpen ? 0 : "auto" }}
                    >
                      {leftDrawerOpen ? <ChevronLeft fontSize="small" /> : <ChevronRight fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                </Box>
                {leftDrawerOpen && (
                  <>
                    <Divider />
                    <Box sx={{ flex: 1, overflow: "auto" }}>
                      <StorySidebarHeader searchTerm={sidebarSearch} onSearchChange={setSidebarSearch} />
                      <Box sx={{ flex: 1, overflow: "auto" }}>
                        <StorySidebarContent
                          searchTerm={sidebarSearch}
                          onSnippetClick={handleSnippetClick}
                          activeSnippetId={snippetId}
                        />
                      </Box>
                    </Box>
                  </>
                )}
              </Stack>
            </Drawer>
            {leftDrawerOpen && !isMobile && (
              <ResizeHandle onResize={handleLeftResize} side="right" />
            )}
          </Box>
        )}

        {/* Center: Editor */}
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
                    onClick={() => setLeftDrawerOpen(!leftDrawerOpen)}
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
                    onClick={() => setRightDrawerOpen(!rightDrawerOpen)}
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

          <OfflineBanner />
          <StoryEditor isLoading={showEditorLoading} />
        </Box>

        {/* Right Drawer: Notes */}
        {isMobile ? (
          <Drawer
            variant="temporary"
            anchor="right"
            open={rightDrawerOpen}
            onClose={() => setRightDrawerOpen(false)}
            sx={{
              "& .MuiDrawer-paper": {
                width: rightDrawerWidth,
                boxSizing: "border-box",
                borderLeft: "1px solid",
                borderColor: "divider",
                borderRadius: 0
              }
            }}
          >
            <NotesSidebar onClose={() => setRightDrawerOpen(false)} />
          </Drawer>
        ) : (
          <Box
            sx={{
              position: "relative",
              width: rightDrawerOpen ? rightDrawerWidth : DRAWER_COLLAPSED_WIDTH,
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
              open={rightDrawerOpen}
              sx={{
                width: rightDrawerOpen ? rightDrawerWidth : DRAWER_COLLAPSED_WIDTH,
                flexShrink: 0,
                transition: isResizing
                  ? "none"
                  : theme.transitions.create("width", {
                      easing: theme.transitions.easing.sharp,
                      duration: theme.transitions.duration.enteringScreen
                    }),
                    height: "100%",
                "& .MuiDrawer-paper": {
                  width: rightDrawerOpen ? rightDrawerWidth : DRAWER_COLLAPSED_WIDTH,
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
                isCollapsed={!rightDrawerOpen}
                onToggle={() => setRightDrawerOpen(!rightDrawerOpen)}
              />
            </Drawer>
            {rightDrawerOpen && !isMobile && (
              <ResizeHandle onResize={handleRightResize} side="left" />
            )}
          </Box>
        )}
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
    </Box>
  );
}

