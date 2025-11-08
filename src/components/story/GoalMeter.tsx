import { Box, LinearProgress, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
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
      title={onClick ? "Click to edit word count goal" : undefined}
    >
      <Typography
        variant="body2"
        sx={(theme) => ({
          color: theme.palette.text.primary,
          fontWeight: 600,
          mb: 1
        })}
      >
        {formattedWords} / {formattedGoal}
      </Typography>
      <LinearProgress
        variant="determinate"
        value={percentage}
        sx={(theme) => ({
          height: 6,
          borderRadius: 3,
          backgroundColor: alpha(theme.palette.text.primary, theme.palette.mode === "dark" ? 0.3 : 0.1),
          "& .MuiLinearProgress-bar": {
            borderRadius: 3,
            background:
              percentage >= 100
                ? "linear-gradient(90deg, #F59E0B 0%, #FBBF24 100%)"
                : "linear-gradient(90deg, #10B981 0%, #059669 100%)"
          }
        })}
      />
    </Box>
  );
}, (prevProps, nextProps) => {
  // Only re-render if totalWords or goal changes
  return prevProps.totalWords === nextProps.totalWords &&
    prevProps.goal === nextProps.goal &&
    prevProps.onClick === nextProps.onClick;
});

