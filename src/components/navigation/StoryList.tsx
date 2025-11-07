import {
  Avatar,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Typography
} from "@mui/material";
import type { JSX } from "react";

import { useDriveStoryQuery, useSelectedProjectStories } from "../../hooks/useDriveQueries";
import { useYarnyStore } from "../../store/provider";

const getInitials = (title: string) => {
  const words = title.trim().split(/\s+/);
  const [first = "", second = ""] = words;
  return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase();
};

export function StoryList(): JSX.Element {
  const stories = useSelectedProjectStories();
  const selectStory = useYarnyStore((state) => state.selectStory);
  const activeStoryId = useYarnyStore((state) => state.ui.activeStoryId);

  useDriveStoryQuery(activeStoryId);

  if (stories.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 4 }}>
        Select a project to load its stories.
      </Typography>
    );
  }

  return (
    <>
      <Typography variant="subtitle1" sx={{ px: 2, py: 1 }}>
        Stories
      </Typography>
      <List dense disablePadding>
        {stories.map((story) => (
          <ListItemButton
            key={story.id}
            selected={story.id === activeStoryId}
            onClick={() => selectStory(story.id)}
          >
            <ListItemAvatar>
              <Avatar sx={{ bgcolor: "primary.light", color: "primary.dark" }}>
                {getInitials(story.title)}
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={story.title}
              secondary={`Updated ${new Date(story.updatedAt).toLocaleString()}`}
            />
          </ListItemButton>
        ))}
      </List>
    </>
  );
}

