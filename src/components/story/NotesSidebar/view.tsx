import { Add, ChevronLeft, ChevronRight, Notes } from "@mui/icons-material";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import { useMemo, useState, useCallback, type JSX } from "react";

import { useCreateNoteMutation, useReorderNotesMutation } from "../../../hooks/useNotesMutations";
import { useNotesQuery, type NoteType } from "../../../hooks/useNotesQuery";
import { useYarnyStore } from "../../../store/provider";
import { selectActiveNote, selectActiveStory } from "../../../store/selectors";
import { StoryTabs, type TabItem } from "../StoryTabs";
import { NotesList } from "./NotesList";
import { NOTE_TYPE_LABELS } from "./types";

interface NotesSidebarViewProps {
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export function NotesSidebarView({ onClose, isCollapsed = false, onToggle }: NotesSidebarViewProps): JSX.Element {
  const story = useYarnyStore(selectActiveStory);
  const activeNote = useYarnyStore(selectActiveNote);
  const selectNote = useYarnyStore((state) => state.selectNote);

  const storyFolderId = story?.id;

  const peopleQuery = useNotesQuery(storyFolderId, "people", Boolean(story));
  const placesQuery = useNotesQuery(storyFolderId, "places", Boolean(story));
  const thingsQuery = useNotesQuery(storyFolderId, "things", Boolean(story));

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
      if (!storyFolderId) {
        return;
      }

      try {
        const result = await createNoteMutation.mutateAsync({ noteType });
        if (result?.id) {
          selectNote({
            id: result.id,
            type: noteType
          });
        }
      } catch (error) {
        console.error("Failed to create note:", error);
      }
    },
    [createNoteMutation, selectNote, storyFolderId]
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
    (noteType: NoteType, noteId: string) => {
      selectNote({
        id: noteId,
        type: noteType
      });
    },
    [selectNote]
  );

  const tabs: TabItem[] = useMemo(
    () => [
      {
        id: "people",
        label: "People",
        content: (
          <NotesList
            notes={peopleQuery.data || []}
            isLoading={peopleQuery.isLoading}
            noteType="people"
            onReorder={handleReorderNotes}
            isReordering={reorderNotesMutation.isPending}
            activeNoteId={activeNote?.type === "people" ? activeNote.id : undefined}
            onNoteClick={handleNoteClick}
          />
        )
      },
      {
        id: "places",
        label: "Places",
        content: (
          <NotesList
            notes={placesQuery.data || []}
            isLoading={placesQuery.isLoading}
            noteType="places"
            onReorder={handleReorderNotes}
            isReordering={reorderNotesMutation.isPending}
            activeNoteId={activeNote?.type === "places" ? activeNote.id : undefined}
            onNoteClick={handleNoteClick}
          />
        )
      },
      {
        id: "things",
        label: "Things",
        content: (
          <NotesList
            notes={thingsQuery.data || []}
            isLoading={thingsQuery.isLoading}
            noteType="things"
            onReorder={handleReorderNotes}
            isReordering={reorderNotesMutation.isPending}
            activeNoteId={activeNote?.type === "things" ? activeNote.id : undefined}
            onNoteClick={handleNoteClick}
          />
        )
      }
    ],
    [
      activeNote,
      peopleQuery.data,
      peopleQuery.isLoading,
      placesQuery.data,
      placesQuery.isLoading,
      thingsQuery.data,
      thingsQuery.isLoading,
      handleReorderNotes,
      reorderNotesMutation.isPending,
      handleNoteClick
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
