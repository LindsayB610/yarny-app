import { Box, Popover } from "@mui/material";
import { type JSX } from "react";

const COLORS = [
  { name: "red", value: "#EF4444" },
  { name: "orange", value: "#F97316" },
  { name: "amber", value: "#F59E0B" },
  { name: "yellow", value: "#EAB308" },
  { name: "lime", value: "#84CC16" },
  { name: "emerald", value: "#10B981" },
  { name: "teal", value: "#14B8A6" },
  { name: "cyan", value: "#06B6D4" },
  { name: "blue", value: "#3B82F6" },
  { name: "indigo", value: "#6366F1" },
  { name: "violet", value: "#8B5CF6" },
  { name: "fuchsia", value: "#D946EF" }
];

interface ColorPickerProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  currentColor?: string;
  onColorSelect: (color: string) => void;
}

export function ColorPicker({
  open,
  anchorEl,
  onClose,
  currentColor = "#3B82F6",
  onColorSelect
}: ColorPickerProps): JSX.Element {
  const handleColorSelect = (color: string) => {
    onColorSelect(color);
    onClose();
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "left"
      }}
      transformOrigin={{
        vertical: "top",
        horizontal: "left"
      }}
      PaperProps={{
        sx: {
          bgcolor: "rgba(31, 41, 55, 0.95)",
          backdropFilter: "blur(10px)",
          p: 2,
          borderRadius: 2,
          border: "1px solid rgba(255, 255, 255, 0.1)"
        }
      }}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 1.5
        }}
      >
        {COLORS.map((color) => (
          <Box
            key={color.name}
            onClick={() => handleColorSelect(color.value)}
            tabIndex={0}
            role="button"
            aria-label={`Select ${color.name} color`}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleColorSelect(color.value);
              }
            }}
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1,
              bgcolor: color.value,
              cursor: "pointer",
              border:
                currentColor === color.value
                  ? "3px solid white"
                  : "2px solid rgba(255, 255, 255, 0.2)",
              transition: "all 0.2s",
              "&:hover": {
                transform: "scale(1.1)",
                borderColor: "white"
              },
              "&:focus-visible": {
                outline: "2px solid #6D4AFF",
                outlineOffset: "2px"
              }
            }}
            title={color.name}
          />
        ))}
      </Box>
    </Popover>
  );
}

