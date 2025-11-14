import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DragIndicator } from "@mui/icons-material";
import { ListItem, ListItemIcon, ListItemText, Typography } from "@mui/material";
import { useRef, type JSX, type CSSProperties } from "react";

import type { SortableNoteItemProps } from "./types";

export function SortableNoteItem({ note, disabled, isActive, onClick }: SortableNoteItemProps): JSX.Element {
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
        pointerDownRef.current = {
          x: e.clientX,
          y: e.clientY,
          time: Date.now()
        };
        if (listeners?.onPointerDown) {
          listeners.onPointerDown(e);
        }
      }}
      onClick={(e) => {
        const pointerDown = pointerDownRef.current;
        if (pointerDown) {
          const timeDiff = Date.now() - pointerDown.time;
          const moved = Math.abs(e.clientX - pointerDown.x) > 5 || Math.abs(e.clientY - pointerDown.y) > 5;
          
          if (timeDiff < 300 && !moved && onClick) {
            onClick();
          }
          pointerDownRef.current = null;
        } else if (onClick) {
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
          <Typography component="span" variant="subtitle2" sx={{ fontWeight: 500 }}>
            {note.name}
          </Typography>
        }
        secondary={
          <>
            <Typography
              component="span"
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
            <Typography component="span" variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
              {new Date(note.modifiedTime).toLocaleDateString()}
            </Typography>
          </>
        }
      />
    </ListItem>
  );
}

