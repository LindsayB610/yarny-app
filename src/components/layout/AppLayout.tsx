import { Box, Divider, Stack } from "@mui/material";
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

export function AppLayout(): JSX.Element {
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
  const handleSnippetClick = useCallback(
    (snippetId: string) => {
      selectSnippet(snippetId);
    },
    [selectSnippet]
  );


  const { isPending: isStoryLoading, isFetching: isStoryFetching } = useDriveStoryQuery(activeStoryId);
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
      <Box
        sx={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "320px 1fr 280px" },
          minHeight: 0
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
          {showNoteEditor ? (
            <NoteEditor />
          ) : (
            <StoryEditor isLoading={showEditorLoading} />
          )}
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
      <EditorFooterContainer />
    </Box>
  );
}

