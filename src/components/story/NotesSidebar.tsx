import { Box, Typography } from "@mui/material";
import { type JSX } from "react";

import { useYarnyStore } from "../../store/provider";
import { selectActiveStory } from "../../store/selectors";
import { StoryTabs, type TabItem } from "./StoryTabs";

export function NotesSidebar(): JSX.Element {
  const story = useYarnyStore(selectActiveStory);

  if (!story) {
    return (
      <Box
        sx={{
          p: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "text.secondary"
        }}
      >
        <Typography variant="body2" textAlign="center">
          Select a story to view notes
        </Typography>
      </Box>
    );
  }

  const tabs: TabItem[] = [
    {
      id: "people",
      label: "People",
      content: (
        <Box sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary">
            People notes will appear here
          </Typography>
        </Box>
      )
    },
    {
      id: "places",
      label: "Places",
      content: (
        <Box sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Places notes will appear here
          </Typography>
        </Box>
      )
    },
    {
      id: "things",
      label: "Things",
      content: (
        <Box sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Things notes will appear here
          </Typography>
        </Box>
      )
    }
  ];

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden"
      }}
    >
      <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <Typography variant="h6">Notes</Typography>
      </Box>
      <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
        <StoryTabs tabs={tabs} defaultTab="people" />
      </Box>
    </Box>
  );
}

