import { Box, LinearProgress, Typography } from "@mui/material";
import { type JSX } from "react";

interface TodayChipProps {
  todayWords: number;
  target: number;
  isAhead?: boolean;
  isBehind?: boolean;
  onClick?: () => void;
}

export function TodayChip({
  todayWords,
  target,
  isAhead,
  isBehind,
  onClick
}: TodayChipProps): JSX.Element {
  const progress = target > 0 ? Math.min(100, Math.round((todayWords / target) * 100)) : 0;
  const formattedWords = todayWords.toLocaleString();

  // Determine progress bar color
  let progressColor = "#10B981"; // Default green
  if (isAhead) {
    progressColor = "#10B981"; // Green for ahead
  } else if (isBehind) {
    progressColor = "#EF4444"; // Red for behind
  } else {
    progressColor = "#3B82F6"; // Blue for on track
  }

  return (
    <Box
      onClick={onClick}
      sx={{
        cursor: onClick ? "pointer" : "default",
        mb: 2,
        p: 1.5,
        borderRadius: 1,
        bgcolor: "rgba(255, 255, 255, 0.05)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        transition: "all 0.2s",
        ...(onClick && {
          "&:hover": {
            bgcolor: "rgba(255, 255, 255, 0.08)"
          }
        })
      }}
      title={onClick ? "Click to edit goal" : undefined}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 1
        }}
      >
        <Typography
          variant="body2"
          sx={{
            color: "rgba(255, 255, 255, 0.7)",
            fontWeight: 500
          }}
        >
          Today
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: "rgba(255, 255, 255, 0.9)",
            fontWeight: 600
          }}
        >
          {formattedWords}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: 4,
          borderRadius: 2,
          bgcolor: "rgba(0, 0, 0, 0.15)",
          "& .MuiLinearProgress-bar": {
            borderRadius: 2,
            bgcolor: progressColor
          }
        }}
      />
    </Box>
  );
}

