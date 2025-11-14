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

import { OfflineBanner } from "./OfflineBanner";
import { useDriveProjectsQuery, useDriveStoryQuery, useSelectedProjectStories } from "../../hooks/useDriveQueries";
import { useWindowFocusReconciliation } from "../../hooks/useWindowFocusReconciliation";
import { mirrorStoryFolderEnsure } from "../../services/localFs/localBackupMirror";
import { useYarnyStore } from "../../store/provider";
import { selectActiveNote, selectActiveSnippetId, selectActiveStory } from "../../store/selectors";
import { BackToStoriesLink } from "../story/BackToStoriesLink";
import { EditorFooterContainer } from "../story/EditorFooterContainer";
import { NoteEditor } from "../story/NoteEditor";
import { NotesSidebar } from "../story/NotesSidebar";
import { StoryEditor } from "../story/StoryEditor";
import { StorySidebarContent } from "../story/StorySidebarContent";
import { StorySidebarHeader } from "../story/StorySidebarHeader";

const DRAWER_WIDTH_LEFT = 320;
const DRAWER_WIDTH_RIGHT = 280;
const DRAWER_COLLAPSED_WIDTH = 64;
const DRAWER_STORAGE_KEY_LEFT = "yarny_left_drawer_open";
const DRAWER_STORAGE_KEY_RIGHT = "yarny_right_drawer_open";

export function AppLayout(): JSX.Element {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { data } = useDriveProjectsQuery();
  const selectProject = useYarnyStore((state) => state.selectProject);
  const selectStory = useYarnyStore((state) => state.selectStory);
  const selectedProjectId = useYarnyStore((state) => state.ui.selectedProjectId);
  const activeStoryId = useYarnyStore((state) => state.ui.activeStoryId);
  const activeStory = useYarnyStore(selectActiveStory);
  const activeNote = useYarnyStore(selectActiveNote);
  const selectSnippet = useYarnyStore((state) => state.selectSnippet);
  const activeSnippetId = useYarnyStore(selectActiveSnippetId);
  const storiesForProject = useSelectedProjectStories();
  const [sidebarSearch, setSidebarSearch] = useState("");

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

  // Persist drawer state
  useEffect(() => {
    localStorage.setItem(DRAWER_STORAGE_KEY_LEFT, String(leftDrawerOpen));
  }, [leftDrawerOpen]);

  useEffect(() => {
    localStorage.setItem(DRAWER_STORAGE_KEY_RIGHT, String(rightDrawerOpen));
  }, [rightDrawerOpen]);
  const handleSnippetClick = useCallback(
    (snippetId: string) => {
      selectSnippet(snippetId);
    },
    [selectSnippet]
  );


  const { isPending: isStoryLoading, isFetching: isStoryFetching } = useDriveStoryQuery(activeStoryId);
  
  useEffect(() => {
    console.log("[AppLayout] activeStoryId changed:", activeStoryId, "isLoading:", isStoryLoading, "isFetching:", isStoryFetching);
  }, [activeStoryId, isStoryLoading, isStoryFetching]);
  
  const showEditorLoading =
    !activeNote &&
    Boolean(activeStoryId) &&
    (isStoryLoading || (!activeStory && isStoryFetching));
  const showNoteEditor = Boolean(activeNote);

  // Reconcile auth and query state on window focus
  useWindowFocusReconciliation();

  // Read localStorage in useState/useEffect to avoid hydration mismatches
  const [storedStory, setStoredStory] = useState<{ id: string } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const raw = window.localStorage.getItem("yarny_current_story");
      if (!raw) {
        setStoredStory(null);
        return;
      }
      const parsed = JSON.parse(raw) as { id: string };
      setStoredStory(parsed);
    } catch {
      setStoredStory(null);
    }
  }, []);

  useEffect(() => {
    if (storedStory) {
      if (activeStoryId !== storedStory.id) {
        console.log("[AppLayout] Selecting story from localStorage:", storedStory.id, "current:", activeStoryId);
        selectStory(storedStory.id);
      }
    }
  }, [storedStory, activeStoryId, selectStory]);

  useEffect(() => {
    if (activeStory && selectedProjectId !== activeStory.projectId) {
      selectProject(activeStory.projectId);
    }
  }, [activeStory, selectProject, selectedProjectId]);

  useEffect(() => {
    if (!data?.projects?.length) {
      return;
    }

    if (!storedStory && !activeStory && !selectedProjectId) {
      selectProject(data.projects[0].id);
    }
  }, [activeStory, data?.projects, selectProject, selectedProjectId, storedStory]);

  useEffect(() => {
    if (!activeStoryId && storiesForProject[0]) {
      console.log("[AppLayout] Auto-selecting first story:", storiesForProject[0].id, "from", storiesForProject.length, "stories");
      selectStory(storiesForProject[0].id);
    }
  }, [activeStoryId, selectStory, storiesForProject]);

  useEffect(() => {
    if (!activeStoryId) {
      return;
    }
    void mirrorStoryFolderEnsure(activeStoryId);
  }, [activeStoryId]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.default"
      }}
    >
      <Box sx={{ flex: 1, display: "flex", minHeight: 0, position: "relative", pb: { xs: 8, md: 8 } }}>
        {/* Left Drawer: Projects & Stories */}
        {isMobile ? (
          <Drawer
            variant="temporary"
            open={leftDrawerOpen}
            onClose={() => setLeftDrawerOpen(false)}
            sx={{
              "& .MuiDrawer-paper": {
                width: DRAWER_WIDTH_LEFT,
                boxSizing: "border-box",
                borderRight: "1px solid",
                borderColor: "divider",
                borderRadius: 0
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
                    activeSnippetId={activeSnippetId}
                  />
                </Box>
              </Box>
            </Stack>
          </Drawer>
        ) : (
          <Drawer
            variant="permanent"
            open={leftDrawerOpen}
            sx={{
              width: leftDrawerOpen ? DRAWER_WIDTH_LEFT : DRAWER_COLLAPSED_WIDTH,
              flexShrink: 0,
              transition: theme.transitions.create("width", {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen
              }),
              "& .MuiDrawer-paper": {
                width: leftDrawerOpen ? DRAWER_WIDTH_LEFT : DRAWER_COLLAPSED_WIDTH,
                boxSizing: "border-box",
                borderRight: "1px solid",
                borderColor: "divider",
                borderRadius: 0,
                transition: theme.transitions.create("width", {
                  easing: theme.transitions.easing.sharp,
                  duration: theme.transitions.duration.enteringScreen
                }),
                overflowX: "hidden"
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
                        activeSnippetId={activeSnippetId}
                      />
                    </Box>
                  </Box>
                </>
              )}
            </Stack>
          </Drawer>
        )}

        {/* Center: Editor */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            px: { xs: 2, md: 6 },
            py: 4,
            display: "flex",
            flexDirection: "column",
            gap: 4,
            overflow: "hidden",
            width: {
              xs: "100%",
              md: `calc(100% - ${leftDrawerOpen ? DRAWER_WIDTH_LEFT : DRAWER_COLLAPSED_WIDTH}px - ${rightDrawerOpen ? DRAWER_WIDTH_RIGHT : DRAWER_COLLAPSED_WIDTH}px)`
            },
            transition: theme.transitions.create(["width", "margin"], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen
            }),
            marginLeft: {
              xs: 0,
              md: leftDrawerOpen ? `${DRAWER_WIDTH_LEFT}px` : `${DRAWER_COLLAPSED_WIDTH}px`
            },
            marginRight: {
              xs: 0,
              md: rightDrawerOpen ? `${DRAWER_WIDTH_RIGHT}px` : `${DRAWER_COLLAPSED_WIDTH}px`
            },
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
          {showNoteEditor ? (
            <NoteEditor />
          ) : (
            <StoryEditor isLoading={showEditorLoading} />
          )}
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
                width: DRAWER_WIDTH_RIGHT,
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
          <Drawer
            variant="permanent"
            anchor="right"
            open={rightDrawerOpen}
            sx={{
              width: rightDrawerOpen ? DRAWER_WIDTH_RIGHT : DRAWER_COLLAPSED_WIDTH,
              flexShrink: 0,
              transition: theme.transitions.create("width", {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen
              }),
              "& .MuiDrawer-paper": {
                width: rightDrawerOpen ? DRAWER_WIDTH_RIGHT : DRAWER_COLLAPSED_WIDTH,
                boxSizing: "border-box",
                borderLeft: "1px solid",
                borderColor: "divider",
                borderRadius: 0,
                transition: theme.transitions.create("width", {
                  easing: theme.transitions.easing.sharp,
                  duration: theme.transitions.duration.enteringScreen
                }),
                overflowX: "hidden"
              }
            }}
          >
          <NotesSidebar 
            isCollapsed={!rightDrawerOpen}
            onToggle={() => setRightDrawerOpen(!rightDrawerOpen)}
          />
          </Drawer>
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

