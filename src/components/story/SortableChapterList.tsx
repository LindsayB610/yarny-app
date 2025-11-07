import type {
  DragEndEvent,
  DragStartEvent} from "@dnd-kit/core";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
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
import { type CSSProperties } from "react";
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

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      tabIndex={0}
      role="button"
      aria-label={`Chapter: ${chapter.title}. Press Space to activate drag mode, then use arrow keys to reorder.`}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          // Keyboard activation is handled by KeyboardSensor
        }
      }}
      sx={{
        "&:focus-visible": {
          outline: "2px solid #6D4AFF",
          outlineOffset: "2px",
          borderRadius: "4px"
        }
      }}
    >
      {children}
    </Box>
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
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: (event, { context }) => {
        const activeId = context.active.id;
        const activeElement = document.querySelector(`[data-id="${activeId}"]`) as HTMLElement;
        
        if (!activeElement) {
          return { x: 0, y: 0 };
        }
        
        const rect = activeElement.getBoundingClientRect();
        return {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        };
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

