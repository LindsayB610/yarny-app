import {
  Box,
  IconButton,
  InputAdornment,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import { Search, Settings } from "@mui/icons-material";
import { useState, type JSX } from "react";

import { GoalMeter } from "./GoalMeter";
import { GoalsPanelModal, type Goal } from "./GoalsPanelModal";
import { StoryInfoModal } from "./StoryInfoModal";
import { TodayChip } from "./TodayChip";
import { useStoryMetadata } from "../../hooks/useStoryMetadata";
import { useStoryProgress } from "../../hooks/useStoryProgress";
import {
  useUpdateStoryGoalsMutation,
  useUpdateStoryMetadataMutation
} from "../../hooks/useStoryMutations";
import { useYarnyStore } from "../../store/provider";
import { selectActiveStory } from "../../store/selectors";

interface StorySidebarHeaderProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

export function StorySidebarHeader({
  searchTerm,
  onSearchChange
}: StorySidebarHeaderProps): JSX.Element {
  const story = useYarnyStore(selectActiveStory);
  const [goalsModalOpen, setGoalsModalOpen] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);

  // Get story folder ID from story (assuming it's stored in driveFileId or we need to get it)
  // For now, we'll use the story's driveFileId as the folder ID
  const storyFolderId = story?.driveFileId;
  const { data: progress } = useStoryProgress(storyFolderId);
  const { data: metadata } = useStoryMetadata(storyFolderId);
  const updateGoalsMutation = useUpdateStoryGoalsMutation();
  const updateMetadataMutation = useUpdateStoryMetadataMutation();

  if (!story) {
    return <></>;
  }

  const wordGoal = progress?.wordGoal || 3000;
  const totalWords = progress?.totalWords || 0;
  const dailyInfo = progress?.dailyInfo;

  const handleSaveGoals = async (newWordGoal: number, goal?: Goal) => {
    await updateGoalsMutation.mutateAsync({
      wordGoal: newWordGoal,
      goal: goal
        ? {
            target: goal.target,
            deadline: goal.deadline,
            writingDays: goal.writingDays,
            daysOff: goal.daysOff,
            mode: goal.mode
          }
        : undefined
    });
    setGoalsModalOpen(false);
  };

  const handleSaveStoryInfo = async (updates: { genre?: string; description?: string }) => {
    await updateMetadataMutation.mutateAsync(updates);
    setInfoModalOpen(false);
  };

  return (
    <Box sx={{ px: 2, pb: 2, display: "flex", flexDirection: "column", gap: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, textTransform: "uppercase" }}>
          Story
        </Typography>
        <Tooltip title="Story info & settings">
          <IconButton
            size="small"
            onClick={() => setInfoModalOpen(true)}
            aria-label="Open story info"
          >
            <Settings fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <GoalMeter totalWords={totalWords} goal={wordGoal} onClick={() => setGoalsModalOpen(true)} />
      {dailyInfo && (
        <TodayChip
          todayWords={dailyInfo.todayWords}
          target={dailyInfo.target}
          isAhead={dailyInfo.isAhead}
          isBehind={dailyInfo.isBehind}
          onClick={() => setGoalsModalOpen(true)}
        />
      )}
      <TextField
        value={searchTerm}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search chapters or snippets"
        size="small"
        fullWidth
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search fontSize="small" />
            </InputAdornment>
          )
        }}
      />
      <GoalsPanelModal
        open={goalsModalOpen}
        onClose={() => setGoalsModalOpen(false)}
        initialWordGoal={wordGoal}
        initialGoal={progress?.goal}
        onSave={handleSaveGoals}
      />
      <StoryInfoModal
        open={infoModalOpen}
        onClose={() => setInfoModalOpen(false)}
        storyName={story.title}
        genre={metadata?.genre}
        description={metadata?.description}
        onSave={handleSaveStoryInfo}
      />
    </Box>
  );
}
