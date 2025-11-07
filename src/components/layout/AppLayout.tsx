import { Box, Divider, Stack } from "@mui/material";
import { useEffect, type JSX } from "react";

import { useDriveProjectsQuery, useSelectedProjectStories } from "../../hooks/useDriveQueries";
import { useWindowFocusReconciliation } from "../../hooks/useWindowFocusReconciliation";
import { useYarnyStore } from "../../store/provider";
import { ProjectList } from "../navigation/ProjectList";
import { StoryList } from "../navigation/StoryList";
import { StoryEditor } from "../story/StoryEditor";
import { OfflineBanner } from "./OfflineBanner";

export function AppLayout(): JSX.Element {
  const { data } = useDriveProjectsQuery();
  const selectProject = useYarnyStore((state) => state.selectProject);
  const selectStory = useYarnyStore((state) => state.selectStory);
  const selectedProjectId = useYarnyStore((state) => state.ui.selectedProjectId);
  const activeStoryId = useYarnyStore((state) => state.ui.activeStoryId);
  const storiesForProject = useSelectedProjectStories();

  // Reconcile auth and query state on window focus
  useWindowFocusReconciliation();

  useEffect(() => {
    if (!selectedProjectId && data?.projects?.[0]) {
      selectProject(data.projects[0].id);
    }
  }, [data?.projects, selectedProjectId, selectProject]);

  useEffect(() => {
    if (!activeStoryId && storiesForProject[0]) {
      selectStory(storiesForProject[0].id);
    }
  }, [activeStoryId, selectStory, storiesForProject]);

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "320px 1fr" },
        minHeight: "100vh"
      }}
    >
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
        <Stack spacing={1} sx={{ flex: 1, py: 3 }}>
          <Box sx={{ px: 2 }}>
            <ProjectList />
          </Box>
          <Divider />
          <Box sx={{ px: 2 }}>
            <StoryList />
          </Box>
        </Stack>
      </Box>
      <Box
        component="main"
        sx={{
          px: { xs: 2, md: 6 },
          py: 4,
          display: "flex",
          flexDirection: "column",
          gap: 4
        }}
      >
        <OfflineBanner />
        <StoryEditor />
      </Box>
    </Box>
  );
}

