import { Box, LinearProgress, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { memo, useCallback, useMemo, type JSX, type KeyboardEvent } from "react";

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

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
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
      data-testid="today-chip"
      sx={(theme) => ({
        cursor: onClick ? "pointer" : "default",
        mb: 2,
        p: 1.5,
        borderRadius: 1.5,
        backgroundColor: theme.palette.background.paper,
        border: `1px solid ${alpha(theme.palette.text.primary, theme.palette.mode === "dark" ? 0.4 : 0.08)}`,
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
        transition: "background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
        ...(onClick && {
          "&:hover": {
            backgroundColor: theme.palette.action.hover,
            borderColor: alpha(theme.palette.primary.main, 0.3),
            boxShadow: "0 4px 14px rgba(15, 23, 42, 0.12)"
          },
          "&:focus-visible": {
            outline: `2px solid ${theme.palette.primary.main}`,
            outlineOffset: "2px"
          }
        })
      })}
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
        <Typography variant="body2" sx={(theme) => ({
          color: theme.palette.text.secondary,
          fontWeight: 500
        })}>
          Today
        </Typography>
        <Typography variant="body2" sx={(theme) => ({
          color: theme.palette.text.primary,
          fontWeight: 600
        })}>
          {formattedWords}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={(theme) => ({
          height: 4,
          borderRadius: 2,
          backgroundColor: alpha(theme.palette.text.primary, theme.palette.mode === "dark" ? 0.3 : 0.1),
          "& .MuiLinearProgress-bar": {
            borderRadius: 2,
            bgcolor: progressColor
          }
        })}
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

