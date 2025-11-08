import { Box, Divider, Stack } from "@mui/material";
import { useEffect, useMemo, type JSX } from "react";

import { OfflineBanner } from "./OfflineBanner";
import { useDriveProjectsQuery, useDriveStoryQuery, useSelectedProjectStories } from "../../hooks/useDriveQueries";
import { useWindowFocusReconciliation } from "../../hooks/useWindowFocusReconciliation";
import { useYarnyStore } from "../../store/provider";
import { selectActiveStory } from "../../store/selectors";
import { NotesSidebar } from "../story/NotesSidebar";
import { StoryEditor } from "../story/StoryEditor";
import { BackToStoriesLink } from "../story/BackToStoriesLink";
import { StorySidebarContent } from "../story/StorySidebarContent";
import { StorySidebarHeader } from "../story/StorySidebarHeader";

export function AppLayout(): JSX.Element {
  const { data } = useDriveProjectsQuery();
  const selectProject = useYarnyStore((state) => state.selectProject);
  const selectStory = useYarnyStore((state) => state.selectStory);
  const selectedProjectId = useYarnyStore((state) => state.ui.selectedProjectId);
  const activeStoryId = useYarnyStore((state) => state.ui.activeStoryId);
  const activeStory = useYarnyStore(selectActiveStory);
  const storiesForProject = useSelectedProjectStories();

  useDriveStoryQuery(activeStoryId);

  // Reconcile auth and query state on window focus
  useWindowFocusReconciliation();

  const storedStory = useMemo(() => {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      const raw = window.localStorage.getItem("yarny_current_story");
      if (!raw) {
        return null;
      }
      return JSON.parse(raw) as { id: string };
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (storedStory) {
      if (activeStoryId !== storedStory.id) {
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
      selectStory(storiesForProject[0].id);
    }
  }, [activeStoryId, selectStory, storiesForProject]);

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "320px 1fr 280px" },
        minHeight: "100vh"
      }}
    >
      {/* Left Sidebar: Projects & Stories */}
      <Box
        component="aside"
        sx={{
          bgcolor: "background.paper",
          borderRight: { md: "1px solid", xs: "none" },
          borderColor: "divider",
          display: "flex",
          flexDirection: "column"
        }}
      >
        <Stack spacing={0} sx={{ flex: 1, py: 3, overflow: "hidden" }}>
          <Box sx={{ px: 2, pb: 2 }}>
            <BackToStoriesLink />
          </Box>
          <Divider />
          <Box sx={{ flex: 1, overflow: "auto" }}>
            <StorySidebarHeader />
            <Box sx={{ flex: 1, overflow: "auto" }}>
              <StorySidebarContent />
            </Box>
          </Box>
        </Stack>
      </Box>
      {/* Center: Editor */}
      <Box
        component="main"
        sx={{
          px: { xs: 2, md: 6 },
          py: 4,
          display: "flex",
          flexDirection: "column",
          gap: 4,
          overflow: "hidden"
        }}
      >
        <OfflineBanner />
        <StoryEditor />
      </Box>
      {/* Right Sidebar: Notes */}
      <Box
        component="aside"
        sx={{
          bgcolor: "background.paper",
          borderLeft: { md: "1px solid", xs: "none" },
          borderColor: "divider",
          display: { xs: "none", md: "flex" },
          flexDirection: "column",
          overflow: "hidden"
        }}
      >
        <NotesSidebar />
      </Box>
    </Box>
  );
}

