import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Box, IconButton, Typography } from "@mui/material";
import { useState, type JSX } from "react";

export interface Chapter {
  id: string;
  title: string;
  color?: string;
  snippetIds: string[];
}

interface SortableChapterListProps {
  chapters: Chapter[];
  onReorder: (newOrder: string[]) => void;
  renderChapter: (chapter: Chapter, index: number) => JSX.Element;
}

function SortableChapterItem({
  chapter,
  children
}: {
  chapter: Chapter;
  children: JSX.Element;
}): JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: chapter.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

export function SortableChapterList({
  chapters,
  onReorder,
  renderChapter
}: SortableChapterListProps): JSX.Element {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = chapters.findIndex((c) => c.id === active.id);
      const newIndex = chapters.findIndex((c) => c.id === over.id);
      const newOrder = arrayMove(
        chapters.map((c) => c.id),
        oldIndex,
        newIndex
      );
      onReorder(newOrder);
    }

    setActiveId(null);
  };

  const activeChapter = activeId
    ? chapters.find((c) => c.id === activeId)
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={chapters.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        {chapters.map((chapter, index) => (
          <SortableChapterItem key={chapter.id} chapter={chapter}>
            {renderChapter(chapter, index)}
          </SortableChapterItem>
        ))}
      </SortableContext>
      <DragOverlay>
        {activeChapter ? (
          <Box
            sx={{
              bgcolor: "rgba(31, 41, 55, 0.95)",
              p: 2,
              borderRadius: 1,
              border: "1px solid rgba(255, 255, 255, 0.1)",
              opacity: 0.8
            }}
          >
            <Typography variant="body1" sx={{ color: "white" }}>
              {activeChapter.title}
            </Typography>
          </Box>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

