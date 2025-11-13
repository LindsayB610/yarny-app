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
import { useState, useRef, type JSX } from "react";

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
  const pointerDownRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <Box
      ref={setNodeRef}
      data-id={snippet.id}
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
        // If this was a click (not a drag), ensure it reaches the child snippet item
        const pointerDown = pointerDownRef.current;
        if (pointerDown) {
          const timeDiff = Date.now() - pointerDown.time;
          const moved = Math.abs(e.clientX - pointerDown.x) > 5 || Math.abs(e.clientY - pointerDown.y) > 5;
          
          // If it was a quick click without much movement, forward to child
          if (timeDiff < 300 && !moved) {
            const childSnippetItem = e.currentTarget.querySelector('[data-snippet-id]') as HTMLElement;
            if (childSnippetItem && e.target !== childSnippetItem && !childSnippetItem.contains(e.target as Node)) {
              e.stopPropagation();
              childSnippetItem.click();
            }
          }
          pointerDownRef.current = null;
        }
      }}
      sx={{
        cursor: isDragging ? "grabbing" : "grab"
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
      coordinateGetter: (_event, { context }) => {
        const activeId = context.active?.id;

        if (!activeId) {
          return { x: 0, y: 0 };
        }

        const activeElement = document.querySelector(`[data-id="${activeId}"]`) as HTMLElement | null;

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

