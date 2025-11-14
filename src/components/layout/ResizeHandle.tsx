import { Box } from "@mui/material";
import { useCallback, useEffect, useRef, type JSX } from "react";

interface ResizeHandleProps {
  onResize: (delta: number) => void;
  side: "left" | "right";
}

export function ResizeHandle({ onResize, side }: ResizeHandleProps): JSX.Element {
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      isDraggingRef.current = true;
      startXRef.current = e.clientX;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    []
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;

      // For left drawer (handle on right edge): dragging right increases width (positive delta)
      // For right drawer (handle on left edge): dragging left increases width (positive delta)
      const delta = side === "left" ? startXRef.current - e.clientX : e.clientX - startXRef.current;
      onResize(delta);
      startXRef.current = e.clientX;
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [onResize, side]);

  return (
    <Box
      onMouseDown={handleMouseDown}
      sx={{
        position: "absolute",
        top: 0,
        bottom: 0,
        [side]: -2,
        width: 4,
        cursor: "col-resize",
        zIndex: 1400,
        backgroundColor: "transparent",
        pointerEvents: "auto",
        touchAction: "none",
        "&:hover": {
          backgroundColor: "primary.main",
          opacity: 0.2
        },
        "&:active": {
          backgroundColor: "primary.main",
          opacity: 0.4
        }
      }}
    />
  );
}

