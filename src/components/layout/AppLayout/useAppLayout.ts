import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useActiveStory } from "@/hooks/useActiveStory";
import { useDriveProjectsQuery, useDriveStoryQuery } from "@/hooks/useDriveQueries";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useWindowFocusReconciliation } from "@/hooks/useWindowFocusReconciliation";
import { mirrorStoryFolderEnsure } from "@/services/localFs/localBackupMirror";
import { useYarnyStore } from "@/store/provider";
import {
  DRAWER_STORAGE_KEY_LEFT,
  DRAWER_STORAGE_KEY_RIGHT,
  DRAWER_WIDTH_LEFT,
  DRAWER_WIDTH_RIGHT,
  DRAWER_WIDTH_STORAGE_KEY_LEFT,
  DRAWER_WIDTH_STORAGE_KEY_RIGHT,
  DRAWER_MIN_WIDTH,
  DRAWER_MAX_WIDTH
} from "./types";

export function useAppLayout() {
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
      import("../../../services/queuedSaveProcessor").then(({ processQueuedSavesDirectly }) => {
        void processQueuedSavesDirectly().catch((error: unknown) => {
          console.error("[AppLayout] Failed to process queued saves:", error);
        });
      });
    }, 1000);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [storyId, isOnline]);

  return {
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
    showEditorLoading
  };
}

