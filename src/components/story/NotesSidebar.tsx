import {
  KeyboardSensor,
  PointerSensor,
  DndContext,
  DragOverlay,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Add, DragIndicator } from "@mui/icons-material";
import {
  Box,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography
} from "@mui/material";
import { memo, useMemo, useState, useCallback, useEffect, useRef, type JSX, type CSSProperties } from "react";

import { StoryTabs, type TabItem } from "./StoryTabs";
import { useCreateNoteMutation, useReorderNotesMutation } from "../../hooks/useNotesMutations";
import { useNotesQuery, type NoteType } from "../../hooks/useNotesQuery";
import { useYarnyStore } from "../../store/provider";
import { selectActiveNote, selectActiveStory } from "../../store/selectors";

interface NotesListProps {
  notes: Array<{ id: string; name: string; content: string; modifiedTime: string }>;
  isLoading: boolean;
  noteType: NoteType;
  onReorder?: (noteType: NoteType, newOrder: string[]) => void;
  isReordering?: boolean;
  activeNoteId?: string;
  onNoteClick?: (noteType: NoteType, noteId: string) => void;
}

const NotesList = memo(function NotesList({
  notes,
  isLoading,
  noteType,
  onReorder,
  isReordering,
  activeNoteId,
  onNoteClick
}: NotesListProps): JSX.Element {
  const noteTypeLabel = noteType.charAt(0).toUpperCase() + noteType.slice(1);
  const [localNotes, setLocalNotes] = useState(notes);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    setLocalNotes(notes);
  }, [notes]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    if (isReordering) {
      return;
    }
    setActiveId(event.active.id as string);
  }, [isReordering]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id || isReordering) {
        setActiveId(null);
        return;
      }

      setLocalNotes((current) => {
        const oldIndex = current.findIndex((note) => note.id === active.id);
        const newIndex = current.findIndex((note) => note.id === over.id);
        if (oldIndex === -1 || newIndex === -1) {
          return current;
        }

        const reordered = arrayMove(current, oldIndex, newIndex);
        onReorder?.(noteType, reordered.map((note) => note.id));
        return reordered;
      });

      setActiveId(null);
    },
    [isReordering, noteType, onReorder]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const activeNote = activeId ? localNotes.find((note) => note.id === activeId) ?? null : null;

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          p: 4
        }}
      >
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (localNotes.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          No {noteTypeLabel} entries yet. Create one to get started.
        </Typography>
      </Box>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={localNotes.map((note) => note.id)} strategy={verticalListSortingStrategy}>
        <List sx={{ p: 0 }}>
          {localNotes.map((note) => (
            <SortableNoteItem
              key={note.id}
              note={note}
              disabled={isReordering}
              isActive={activeNoteId === note.id}
              onClick={() => onNoteClick?.(noteType, note.id)}
            />
          ))}
        </List>
      </SortableContext>
      <DragOverlay>
        {activeNote ? (
          <Box
            sx={{
              bgcolor: "rgba(31, 41, 55, 0.95)",
              p: 2,
              borderRadius: 1,
              border: "1px solid rgba(255, 255, 255, 0.12)",
              minWidth: 160
            }}
          >
            <Typography variant="subtitle2" sx={{ color: "white", fontWeight: 600 }}>
              {activeNote.name}
            </Typography>
          </Box>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
});

interface SortableNoteItemProps {
  note: { id: string; name: string; content: string; modifiedTime: string };
  disabled?: boolean;
  isActive?: boolean;
  onClick?: () => void;
}

function SortableNoteItem({ note, disabled, isActive, onClick }: SortableNoteItemProps): JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: note.id,
    disabled
  });
  const pointerDownRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <ListItem
      ref={setNodeRef}
      data-id={note.id}
      style={style}
      {...attributes}
      onPointerDown={(e) => {
        // Track pointer down for click detection
        pointerDownRef.current = {
          x: e.clientX,
          y: e.clientY,
          time: Date.now()
        };
        // Apply drag listeners
        if (listeners?.onPointerDown) {
          listeners.onPointerDown(e);
        }
      }}
      onClick={(e) => {
        // Ensure clicks work even when drag listeners are present
        const pointerDown = pointerDownRef.current;
        if (pointerDown) {
          const timeDiff = Date.now() - pointerDown.time;
          const moved = Math.abs(e.clientX - pointerDown.x) > 5 || Math.abs(e.clientY - pointerDown.y) > 5;
          
          // If it was a quick click without much movement, trigger onClick
          if (timeDiff < 300 && !moved && onClick) {
            onClick();
          }
          pointerDownRef.current = null;
        } else if (onClick) {
          // Fallback: if pointer tracking didn't work, still try onClick
          onClick();
        }
      }}
      sx={{
        borderBottom: 1,
        borderColor: "divider",
        bgcolor: isActive ? "action.selected" : isDragging ? "action.hover" : undefined,
        cursor: disabled ? "not-allowed" : isDragging ? "grabbing" : "grab",
        opacity: disabled ? 0.6 : 1,
        "&:hover": {
          bgcolor: isActive ? "action.selected" : "action.hover"
        }
      }}
    >
      <ListItemIcon
        sx={{
          minWidth: 32,
          display: "flex",
          alignItems: "center",
          color: "text.disabled"
        }}
      >
        <DragIndicator fontSize="small" />
      </ListItemIcon>
      <ListItemText
        primary={
          <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
            {note.name}
          </Typography>
        }
        secondary={
          <Box>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mt: 0.5,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                textOverflow: "ellipsis"
              }}
            >
              {note.content || "(empty)"}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
              {new Date(note.modifiedTime).toLocaleDateString()}
            </Typography>
          </Box>
        }
      />
    </ListItem>
  );
}

const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  people: "Person",
  places: "Place",
  things: "Thing"
};

export function NotesSidebar(): JSX.Element {
  const story = useYarnyStore(selectActiveStory);
  const activeNote = useYarnyStore(selectActiveNote);
  const selectNote = useYarnyStore((state) => state.selectNote);

  // Get story folder ID - stories are folders in Drive, so the story ID is the folder ID
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
      <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
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

