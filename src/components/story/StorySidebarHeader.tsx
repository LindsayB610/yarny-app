import { Box } from "@mui/material";
import { useState, type JSX } from "react";

import { useStoryProgress } from "../../hooks/useStoryProgress";
import { useYarnyStore } from "../../store/provider";
import { selectActiveStory } from "../../store/selectors";
import { GoalMeter } from "./GoalMeter";
import { GoalsPanelModal } from "./GoalsPanelModal";
import { TodayChip } from "./TodayChip";

export function StorySidebarHeader(): JSX.Element {
  const story = useYarnyStore(selectActiveStory);
  const [goalsModalOpen, setGoalsModalOpen] = useState(false);

  // Get story folder ID from story (assuming it's stored in driveFileId or we need to get it)
  // For now, we'll use the story's driveFileId as the folder ID
  const storyFolderId = story?.driveFileId;
  const { data: progress } = useStoryProgress(storyFolderId);

  if (!story) {
    return <></>;
  }

  const wordGoal = progress?.wordGoal || 3000;
  const totalWords = progress?.totalWords || 0;
  const dailyInfo = progress?.dailyInfo;

  const handleSave = async (newWordGoal: number, goal?: any) => {
    // TODO: Implement save to Drive
    console.log("Save goal:", newWordGoal, goal);
    setGoalsModalOpen(false);
  };

  return (
    <Box sx={{ px: 2, pb: 2 }}>
      <GoalMeter
        totalWords={totalWords}
        goal={wordGoal}
        onClick={() => setGoalsModalOpen(true)}
      />
      {dailyInfo && (
        <TodayChip
          todayWords={dailyInfo.todayWords}
          target={dailyInfo.target}
          isAhead={dailyInfo.isAhead}
          isBehind={dailyInfo.isBehind}
          onClick={() => setGoalsModalOpen(true)}
        />
      )}
      <GoalsPanelModal
        open={goalsModalOpen}
        onClose={() => setGoalsModalOpen(false)}
        initialWordGoal={wordGoal}
        initialGoal={progress?.goal}
        onSave={handleSave}
      />
    </Box>
  );
}

