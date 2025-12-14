import { Add, ChevronLeft, ChevronRight, Search } from "@mui/icons-material";
import { Box, IconButton, InputAdornment, TextField, Tooltip, Typography } from "@mui/material";
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
    if (pathname.includes("/characters/")) return "characters";
    if (pathname.includes("/worldbuilding/")) return "worldbuilding";
    return undefined;
  }, [location]);
  
  // Use store notes if available, otherwise fall back to query
  const storeNotes = useYarnyStore((state) => 
    story ? selectNotesByKind(state, story.id, "character") : []
  );
  const hasStoreNotes = storeNotes.length > 0;

  const storyFolderId = story?.id;

  const charactersQuery = useNotesQuery(storyFolderId, "characters", Boolean(story) && !hasStoreNotes);
  const worldbuildingQuery = useNotesQuery(storyFolderId, "worldbuilding", Boolean(story) && !hasStoreNotes);

  const [activeTab, setActiveTab] = useState<NoteType>("characters");
  const [searchTerm, setSearchTerm] = useState("");

  const createNoteMutation = useCreateNoteMutation(storyFolderId);
  const reorderNotesMutation = useReorderNotesMutation(storyFolderId);

  const handleTabChange = useCallback((tabId: string) => {
    if (tabId === "characters" || tabId === "worldbuilding") {
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
          void navigate(`/stories/${storyId}/${noteType}/${result.id}`);
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
        void navigate(`/stories/${storyId}/${clickedNoteType}/${clickedNoteId}`);
      }
    },
    [navigate, storyId, noteId]
  );

  // Get notes from store
  const charactersNotesFromStore = useYarnyStore((state) => 
    story ? selectNotesByKind(state, story.id, "character") : []
  );
  const worldbuildingNotesFromStore = useYarnyStore((state) => 
    story ? selectNotesByKind(state, story.id, "worldbuilding") : []
  );

  // Filter notes based on search term
  const filterNotes = useCallback(
    (notes: Array<{ id: string; name: string; content: string; modifiedTime: string }>) => {
      if (!searchTerm.trim()) {
        return notes;
      }
      const searchValue = searchTerm.trim().toLowerCase();
      return notes.filter((note) => {
        const nameMatch = note.name.toLowerCase().includes(searchValue);
        const contentMatch = note.content.toLowerCase().includes(searchValue);
        return nameMatch || contentMatch;
      });
    },
    [searchTerm]
  );

  const tabs: TabItem[] = useMemo(
    () => [
      {
        id: "characters",
        label: "Characters",
        content: (
          <NotesList
            notes={filterNotes(
              hasStoreNotes && story 
                ? charactersNotesFromStore.map(note => {
                    const firstLine = note.content.split("\n")[0]?.trim();
                    // Strip markdown headers (leading # and whitespace)
                    const nameWithoutMarkdown = firstLine?.replace(/^#+\s*/, "").trim() ?? "";
                    return {
                      id: note.id,
                      name: nameWithoutMarkdown || "New Character",
                      content: note.content,
                      modifiedTime: note.updatedAt
                    };
                  })
                : (charactersQuery.data ?? [])
            )}
            isLoading={charactersQuery.isLoading}
            noteType="characters"
            onReorder={handleReorderNotes}
            isReordering={reorderNotesMutation.isPending}
            activeNoteId={noteTypeFromPath === "characters" && noteId ? noteId : undefined}
            onNoteClick={handleNoteClick}
          />
        )
      },
      {
        id: "worldbuilding",
        label: "Worldbuilding",
        content: (
          <NotesList
            notes={filterNotes(
              hasStoreNotes && story
                ? worldbuildingNotesFromStore.map(note => {
                    const firstLine = note.content.split("\n")[0]?.trim();
                    // Strip markdown headers (leading # and whitespace)
                    const nameWithoutMarkdown = firstLine?.replace(/^#+\s*/, "").trim() ?? "";
                    return {
                      id: note.id,
                      name: nameWithoutMarkdown || "New Worldbuilding",
                      content: note.content,
                      modifiedTime: note.updatedAt
                    };
                  })
                : (worldbuildingQuery.data ?? [])
            )}
            isLoading={worldbuildingQuery.isLoading}
            noteType="worldbuilding"
            onReorder={handleReorderNotes}
            isReordering={reorderNotesMutation.isPending}
            activeNoteId={noteTypeFromPath === "worldbuilding" && noteId ? noteId : undefined}
            onNoteClick={handleNoteClick}
          />
        )
      }
    ],
    [
      hasStoreNotes,
      story,
      charactersNotesFromStore,
      charactersQuery.data,
      charactersQuery.isLoading,
      worldbuildingNotesFromStore,
      worldbuildingQuery.data,
      worldbuildingQuery.isLoading,
      handleReorderNotes,
      reorderNotesMutation.isPending,
      handleNoteClick,
      noteTypeFromPath,
      noteId,
      filterNotes
    ]
  );

  const isCreateDisabled = !story || createNoteMutation.isPending;

  const renderActions = useCallback(
    (tabId: string) => {
      if (tabId !== "characters" && tabId !== "worldbuilding") {
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
              onClick={() => void handleCreateNote(noteType)}
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
          Select a story to view its characters and worldbuilding
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
      <Box sx={{ px: 2, pb: 2 }}>
        <TextField
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search notes..."
          size="small"
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            )
          }}
        />
      </Box>
      <Box sx={{ flex: 1, overflow: "auto", p: 2, pt: 0 }}>
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
