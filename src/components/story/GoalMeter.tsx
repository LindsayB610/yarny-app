import { Box, LinearProgress, Typography } from "@mui/material";
import { memo, useCallback, useMemo, type JSX, type KeyboardEvent } from "react";

interface GoalMeterProps {
  totalWords: number;
  goal: number;
  onClick?: () => void;
}

export const GoalMeter = memo(function GoalMeter({
  totalWords,
  goal,
  onClick
}: GoalMeterProps): JSX.Element {
  const percentage = useMemo(
    () => goal > 0 ? Math.min(100, Math.round((totalWords / goal) * 100)) : 0,
    [totalWords, goal]
  );
  const formattedWords = useMemo(() => totalWords.toLocaleString(), [totalWords]);
  const formattedGoal = useMemo(() => goal.toLocaleString(), [goal]);

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
      aria-label={onClick ? "Word count goal: Click to edit" : undefined}
      onKeyDown={handleKeyDown}
      data-testid="goal-meter"
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
      title={onClick ? "Click to edit word count goal" : undefined}
    >
      <Typography
        variant="body2"
        sx={{
          color: "rgba(255, 255, 255, 0.9)",
          fontWeight: 500,
          mb: 1
        }}
      >
        {formattedWords} / {formattedGoal}
      </Typography>
      <LinearProgress
        variant="determinate"
        value={percentage}
        sx={{
          height: 6,
          borderRadius: 3,
          bgcolor: "rgba(0, 0, 0, 0.15)",
          "& .MuiLinearProgress-bar": {
            borderRadius: 3,
            background:
              percentage >= 100
                ? "linear-gradient(90deg, #F59E0B 0%, #FBBF24 100%)"
                : "linear-gradient(90deg, #10B981 0%, #059669 100%)"
          }
        }}
      />
    </Box>
  );
}, (prevProps, nextProps) => {
  // Only re-render if totalWords or goal changes
  return prevProps.totalWords === nextProps.totalWords &&
    prevProps.goal === nextProps.goal &&
    prevProps.onClick === nextProps.onClick;
});

