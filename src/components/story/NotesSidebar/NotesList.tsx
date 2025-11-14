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
  verticalListSortingStrategy,
  sortableKeyboardCoordinates
} from "@dnd-kit/sortable";
import { Box, CircularProgress, List, Typography } from "@mui/material";
import { memo, useState, useCallback, useEffect } from "react";
import type { JSX } from "react";

import { SortableNoteItem } from "./SortableNoteItem";
import type { NotesListProps } from "./types";

export const NotesList = memo(function NotesList({
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

  const activeNote: typeof notes[number] | null = activeId
    ? localNotes.find((note) => note.id === activeId) ?? null
    : null;

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

