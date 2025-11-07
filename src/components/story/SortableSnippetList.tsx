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
import { Box, Typography } from "@mui/material";
import { type CSSProperties } from "react";
import { useState, type JSX } from "react";

export interface Snippet {
  id: string;
  title: string;
  wordCount?: number;
}

interface SortableSnippetListProps {
  snippets: Snippet[];
  onReorder: (newOrder: string[]) => void;
  onMoveToChapter?: (snippetId: string, targetChapterId: string) => void;
  renderSnippet: (snippet: Snippet, index: number) => JSX.Element;
}

function SortableSnippetItem({
  snippet,
  children
}: {
  snippet: Snippet;
  children: JSX.Element;
}): JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: snippet.id });

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
      aria-label={`Snippet: ${snippet.title}. Press Space to activate drag mode, then use arrow keys to reorder.`}
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

export function SortableSnippetList({
  snippets,
  onReorder,
  renderSnippet
}: SortableSnippetListProps): JSX.Element {
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
      const oldIndex = snippets.findIndex((s) => s.id === active.id);
      const newIndex = snippets.findIndex((s) => s.id === over.id);
      const newOrder = arrayMove(
        snippets.map((s) => s.id),
        oldIndex,
        newIndex
      );
      onReorder(newOrder);
    }

    setActiveId(null);
  };

  const activeSnippet = activeId
    ? snippets.find((s) => s.id === activeId)
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={snippets.map((s) => s.id)}
        strategy={verticalListSortingStrategy}
      >
        {snippets.map((snippet, index) => (
          <SortableSnippetItem key={snippet.id} snippet={snippet}>
            {renderSnippet(snippet, index)}
          </SortableSnippetItem>
        ))}
      </SortableContext>
      <DragOverlay>
        {activeSnippet ? (
          <Box
            sx={{
              bgcolor: "rgba(31, 41, 55, 0.95)",
              p: 2,
              borderRadius: 1,
              border: "1px solid rgba(255, 255, 255, 0.1)",
              opacity: 0.8
            }}
          >
            <Typography variant="body2" sx={{ color: "white" }}>
              {activeSnippet.title}
            </Typography>
          </Box>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

