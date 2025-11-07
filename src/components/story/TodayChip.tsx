import { Box, LinearProgress, Typography } from "@mui/material";
import { memo, useCallback, useMemo, type JSX } from "react";

interface TodayChipProps {
  todayWords: number;
  target: number;
  isAhead?: boolean;
  isBehind?: boolean;
  onClick?: () => void;
}

export const TodayChip = memo(function TodayChip({
  todayWords,
  target,
  isAhead,
  isBehind,
  onClick
}: TodayChipProps): JSX.Element {
  const progress = useMemo(
    () => target > 0 ? Math.min(100, Math.round((todayWords / target) * 100)) : 0,
    [todayWords, target]
  );
  const formattedWords = useMemo(() => todayWords.toLocaleString(), [todayWords]);

  // Determine progress bar color
  const progressColor = useMemo(() => {
    if (isAhead) {
      return "#10B981"; // Green for ahead
    } else if (isBehind) {
      return "#EF4444"; // Red for behind
    } else {
      return "#3B82F6"; // Blue for on track
    }
  }, [isAhead, isBehind]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (onClick && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onClick();
    }
  }, [onClick]);

  return (
    <Box
      onClick={onClick}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? "button" : undefined}
      aria-label={onClick ? "Today's writing goal: Click to edit" : undefined}
      onKeyDown={handleKeyDown}
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
          },
          "&:focus-visible": {
            outline: "2px solid #6D4AFF",
            outlineOffset: "2px"
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
}, (prevProps, nextProps) => {
  // Only re-render if props that affect rendering change
  return prevProps.todayWords === nextProps.todayWords &&
    prevProps.target === nextProps.target &&
    prevProps.isAhead === nextProps.isAhead &&
    prevProps.isBehind === nextProps.isBehind &&
    prevProps.onClick === nextProps.onClick;
});

