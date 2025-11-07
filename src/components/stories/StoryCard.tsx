import {
  Box,
  Card,
  CardContent,
  IconButton,
  LinearProgress,
  Typography
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { memo, useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useStoryProgress } from "../../hooks/useStoryProgress";
import type { StoryFolder } from "../../hooks/useStoriesQuery";
import { DeleteStoryModal } from "./DeleteStoryModal";
import { highlightSearchText } from "../../utils/highlightSearch";

interface StoryCardProps {
  story: StoryFolder;
  searchQuery?: string;
}

export const StoryCard = memo(function StoryCard({ story, searchQuery = "" }: StoryCardProps): JSX.Element {
  const navigate = useNavigate();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const { data: progress } = useStoryProgress(story.id);
  const percentage = progress
    ? Math.min(100, Math.round((progress.totalWords / progress.wordGoal) * 100))
    : 0;
  const exceedsGoal =
    progress && progress.wordGoal > 0 && progress.totalWords > progress.wordGoal;

  // Highlight search matches in story name
  const nameParts = useMemo(
    () => highlightSearchText(story.name, searchQuery),
    [story.name, searchQuery]
  );

  const handleClick = useCallback(() => {
    // Navigate to editor with story
    localStorage.setItem(
      "yarny_current_story",
      JSON.stringify({
        id: story.id,
        name: story.name
      })
    );
    navigate("/editor");
  }, [story.id, story.name, navigate]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleteModalOpen(true);
  }, []);

  const formatDate = useCallback((dateString?: string) => {
    if (!dateString) return "Unknown";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  }, []);

  const formatDeadline = useCallback((deadlineString: string) => {
    const date = new Date(deadlineString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  }, []);

  const formattedModifiedDate = useMemo(() => formatDate(story.modifiedTime), [story.modifiedTime, formatDate]);
  const formattedDeadlineDate = useMemo(
    () => progress?.goal?.deadline ? formatDeadline(progress.goal.deadline) : null,
    [progress?.goal?.deadline, formatDeadline]
  );

  return (
    <>
      <Card
        onClick={handleClick}
        sx={{
          cursor: "pointer",
          bgcolor: "rgba(255, 255, 255, 0.1)",
          backdropFilter: "blur(10px)",
          border: "2px solid transparent",
          transition: "all 0.2s",
          "&:hover": {
            borderColor: "primary.main",
            bgcolor: "rgba(255, 255, 255, 0.15)"
          },
          position: "relative",
          display: "flex",
          flexDirection: "column",
          minHeight: 200
        }}
      >
        <CardContent sx={{ flex: 1, pb: 1 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
            <Typography
              variant="h6"
              sx={{
                color: "white",
                fontWeight: 600,
                flex: 1
              }}
              component="div"
            >
              {nameParts.map((part, index) => (
                <span
                  key={index}
                  style={{
                    backgroundColor: part.highlight ? "rgba(255, 235, 59, 0.3)" : "transparent",
                    fontWeight: part.highlight ? 700 : 600
                  }}
                >
                  {part.text}
                </span>
              ))}
            </Typography>
            <IconButton
              size="small"
              onClick={handleDelete}
              sx={{
                color: "rgba(255, 255, 255, 0.7)",
                "&:hover": {
                  bgcolor: "rgba(239, 68, 68, 0.2)",
                  color: "error.main"
                },
                opacity: 0.6,
                ml: 1
              }}
            >
              <Close fontSize="small" />
            </IconButton>
          </Box>

          <Typography
            variant="caption"
            sx={{ color: "rgba(255, 255, 255, 0.7)", display: "block", mb: 1 }}
          >
            Last modified: {formattedModifiedDate}
          </Typography>

          {formattedDeadlineDate && (
            <Typography
              variant="caption"
              sx={{
                color: "rgba(255, 255, 255, 0.8)",
                fontWeight: 500,
                display: "block",
                mb: 1
              }}
            >
              Deadline: {formattedDeadlineDate}
            </Typography>
          )}

          {progress && (
            <Box sx={{ mt: 2 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 0.5
                }}
              >
                <Typography
                  variant="caption"
                  sx={{ color: "rgba(255, 255, 255, 0.7)", fontWeight: 500 }}
                >
                  {progress.totalWords.toLocaleString()} /{" "}
                  {progress.wordGoal.toLocaleString()} words
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={percentage}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  bgcolor: "rgba(0, 0, 0, 0.15)",
                  "& .MuiLinearProgress-bar": {
                    bgcolor: exceedsGoal ? "#F59E0B" : "primary.main",
                    borderRadius: 3,
                    ...(exceedsGoal && {
                      background: "linear-gradient(90deg, #F59E0B 0%, #FBBF24 100%)"
                    })
                  }
                }}
              />

              {progress.dailyInfo && progress.dailyInfo.target !== undefined && (
                <Box sx={{ mt: 1.5 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 0.5
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ color: "rgba(255, 255, 255, 0.7)", fontWeight: 500 }}
                    >
                      <span style={{ fontWeight: 500, color: "rgba(255, 255, 255, 0.6)" }}>
                        Today
                      </span>{" "}
                      {progress.dailyInfo.todayWords.toLocaleString()} /{" "}
                      {progress.dailyInfo.target.toLocaleString()}
                      {progress.dailyInfo.remaining > 0 && (
                        <span style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "0.7rem" }}>
                          {" "}
                          · {progress.dailyInfo.remaining} day
                          {progress.dailyInfo.remaining !== 1 ? "s" : ""} left
                        </span>
                      )}
                    </Typography>
                  </Box>
                  {progress.dailyInfo.target > 0 && (
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(
                        100,
                        Math.round(
                          (progress.dailyInfo.todayWords /
                            progress.dailyInfo.target) *
                            100
                        )
                      )}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        bgcolor: "rgba(0, 0, 0, 0.15)",
                        "& .MuiLinearProgress-bar": {
                          bgcolor: "primary.main",
                          borderRadius: 3
                        }
                      }}
                    />
                  )}
                </Box>
              )}
            </Box>
          )}

          {!progress && (
            <Typography
              variant="caption"
              sx={{ color: "rgba(255, 255, 255, 0.5)", display: "block", mt: 2 }}
            >
              Loading progress...
            </Typography>
          )}
        </CardContent>
      </Card>

      <DeleteStoryModal
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        storyId={story.id}
        storyName={story.name}
      />
    </>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if story ID, name, modifiedTime, or searchQuery changes
  return prevProps.story.id === nextProps.story.id &&
    prevProps.story.name === nextProps.story.name &&
    prevProps.story.modifiedTime === nextProps.story.modifiedTime &&
    prevProps.searchQuery === nextProps.searchQuery;
});

