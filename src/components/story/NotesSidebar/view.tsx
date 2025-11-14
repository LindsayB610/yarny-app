import { Add, ChevronLeft, ChevronRight } from "@mui/icons-material";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import { useMemo, useState, useCallback, type JSX } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";

import { useActiveStory } from "../../../hooks/useActiveStory";
import { useCreateNoteMutation, useReorderNotesMutation } from "../../../hooks/useNotesMutations";
import { useNotesQuery, type NoteType } from "../../../hooks/useNotesQuery";
import { useYarnyStore } from "../../../store/provider";
import { selectNotesByKind } from "../../../store/selectors";
import { StoryTabs, type TabItem } from "../StoryTabs";
import { NotesList } from "./NotesList";
import { NOTE_TYPE_LABELS } from "./types";

interface NotesSidebarViewProps {
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export function NotesSidebarView({ onClose, isCollapsed = false, onToggle }: NotesSidebarViewProps): JSX.Element {
  const story = useActiveStory();
  const { storyId, noteId } = useParams<{
    storyId?: string;
    noteId?: string;
  }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Detect note type from route pathname
  const noteTypeFromPath = useMemo(() => {
    const pathname = location.pathname;
    if (pathname.includes("/people/")) return "people";
    if (pathname.includes("/places/")) return "places";
    if (pathname.includes("/things/")) return "things";
    return undefined;
  }, [location.pathname]);
  
  // Use store notes if available, otherwise fall back to query
  const storeNotes = useYarnyStore((state) => 
    story ? selectNotesByKind(state, story.id, "person") : []
  );
  const hasStoreNotes = storeNotes.length > 0;

  const storyFolderId = story?.id;

  const peopleQuery = useNotesQuery(storyFolderId, "people", Boolean(story) && !hasStoreNotes);
  const placesQuery = useNotesQuery(storyFolderId, "places", Boolean(story) && !hasStoreNotes);
  const thingsQuery = useNotesQuery(storyFolderId, "things", Boolean(story) && !hasStoreNotes);

  const [activeTab, setActiveTab] = useState<NoteType>("people");

  const createNoteMutation = useCreateNoteMutation(storyFolderId);
  const reorderNotesMutation = useReorderNotesMutation(storyFolderId);

  const handleTabChange = useCallback((tabId: string) => {
    if (tabId === "people" || tabId === "places" || tabId === "things") {
      setActiveTab(tabId);
    }
  }, []);

  const handleCreateNote = useCallback(
    async (noteType: NoteType) => {
      if (!storyFolderId || !storyId) {
        return;
      }

      try {
        const result = await createNoteMutation.mutateAsync({ noteType });
        if (result?.id) {
          navigate(`/stories/${storyId}/${noteType}/${result.id}`);
        }
      } catch (error) {
        console.error("Failed to create note:", error);
      }
    },
    [createNoteMutation, navigate, storyFolderId, storyId]
  );

  const handleReorderNotes = useCallback(
    (noteType: NoteType, newOrder: string[]) => {
      if (!storyFolderId) {
        return;
      }
      reorderNotesMutation.mutate({ noteType, newOrder });
    },
    [reorderNotesMutation, storyFolderId]
  );

  const handleNoteClick = useCallback(
    (clickedNoteType: NoteType, clickedNoteId: string) => {
      if (storyId && clickedNoteId !== noteId) {
        navigate(`/stories/${storyId}/${clickedNoteType}/${clickedNoteId}`);
      }
    },
    [navigate, storyId, noteId]
  );

  // Get notes from store
  const peopleNotesFromStore = useYarnyStore((state) => 
    story ? selectNotesByKind(state, story.id, "person") : []
  );
  const placesNotesFromStore = useYarnyStore((state) => 
    story ? selectNotesByKind(state, story.id, "place") : []
  );
  const thingsNotesFromStore = useYarnyStore((state) => 
    story ? selectNotesByKind(state, story.id, "thing") : []
  );

  const tabs: TabItem[] = useMemo(
    () => [
      {
        id: "people",
        label: "People",
        content: (
          <NotesList
            notes={hasStoreNotes && story 
              ? peopleNotesFromStore.map(note => {
                  const firstLine = note.content.split("\n")[0]?.trim();
                  return {
                    id: note.id,
                    name: firstLine || "New Person",
                    content: note.content,
                    modifiedTime: note.updatedAt
                  };
                })
              : (peopleQuery.data || [])}
            isLoading={peopleQuery.isLoading}
            noteType="people"
            onReorder={handleReorderNotes}
            isReordering={reorderNotesMutation.isPending}
            activeNoteId={noteTypeFromPath === "people" && noteId ? noteId : undefined}
            onNoteClick={handleNoteClick}
          />
        )
      },
      {
        id: "places",
        label: "Places",
        content: (
          <NotesList
            notes={hasStoreNotes && story
              ? placesNotesFromStore.map(note => {
                  const firstLine = note.content.split("\n")[0]?.trim();
                  return {
                    id: note.id,
                    name: firstLine || "New Place",
                    content: note.content,
                    modifiedTime: note.updatedAt
                  };
                })
              : (placesQuery.data || [])}
            isLoading={placesQuery.isLoading}
            noteType="places"
            onReorder={handleReorderNotes}
            isReordering={reorderNotesMutation.isPending}
            activeNoteId={noteTypeFromPath === "places" && noteId ? noteId : undefined}
            onNoteClick={handleNoteClick}
          />
        )
      },
      {
        id: "things",
        label: "Things",
        content: (
          <NotesList
            notes={hasStoreNotes && story
              ? thingsNotesFromStore.map(note => {
                  const firstLine = note.content.split("\n")[0]?.trim();
                  return {
                    id: note.id,
                    name: firstLine || "New Thing",
                    content: note.content,
                    modifiedTime: note.updatedAt
                  };
                })
              : (thingsQuery.data || [])}
            isLoading={thingsQuery.isLoading}
            noteType="things"
            onReorder={handleReorderNotes}
            isReordering={reorderNotesMutation.isPending}
            activeNoteId={noteTypeFromPath === "things" && noteId ? noteId : undefined}
            onNoteClick={handleNoteClick}
          />
        )
      }
    ],
    [
      hasStoreNotes,
      story,
      peopleNotesFromStore,
      peopleQuery.data,
      peopleQuery.isLoading,
      placesNotesFromStore,
      placesQuery.data,
      placesQuery.isLoading,
      thingsNotesFromStore,
      thingsQuery.data,
      thingsQuery.isLoading,
      handleReorderNotes,
      reorderNotesMutation.isPending,
      handleNoteClick,
      noteTypeFromPath,
      noteId
    ]
  );

  const isCreateDisabled = !story || createNoteMutation.isPending;

  const renderActions = useCallback(
    (tabId: string) => {
      if (tabId !== "people" && tabId !== "places" && tabId !== "things") {
        return null;
      }

      const noteType = tabId as NoteType;
      const label = NOTE_TYPE_LABELS[noteType];

      return (
        <Tooltip title={`Add new ${label}`}>
          <span>
            <IconButton
              size="small"
              color="primary"
              onClick={() => handleCreateNote(noteType)}
              aria-label={`Add new ${label}`}
              disabled={isCreateDisabled}
            >
              <Add fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      );
    },
    [handleCreateNote, isCreateDisabled]
  );

  if (isCollapsed) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          height: "100%",
          pt: 3
        }}
      >
        {onToggle && (
          <Tooltip title="Expand notes" placement="left">
            <IconButton
              onClick={onToggle}
              size="small"
            >
              <ChevronLeft fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    );
  }

  if (!story) {
    return (
      <Box
        sx={{
          p: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "text.secondary"
        }}
      >
        <Typography variant="body2" textAlign="center">
          Select a story to view its people, places, and things
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden"
      }}
    >
      {onToggle && (
        <Box sx={{ p: 2, pb: 1, display: "flex", justifyContent: "flex-end" }}>
          <Tooltip title="Collapse notes">
            <IconButton
              onClick={onToggle}
              size="small"
            >
              <ChevronRight fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )}
      {onClose && !onToggle && (
        <Box sx={{ p: 2, pb: 1, display: "flex", justifyContent: "flex-end" }}>
          <Tooltip title="Close notes">
            <IconButton
              onClick={onClose}
              size="small"
            >
              <ChevronLeft fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )}
      <Box sx={{ flex: 1, overflow: "auto", p: 2, pt: (onClose || onToggle) ? 0 : 2 }}>
        <StoryTabs
          tabs={tabs}
          value={activeTab}
          onChange={handleTabChange}
          renderActions={renderActions}
        />
      </Box>
    </Box>
  );
}
