import { Box, Grid } from "@mui/material";
import type { JSX } from "react";

import type { StoryFolder } from "../../hooks/useStoriesQuery";
import { StoryCard } from "./StoryCard";

interface StoriesListProps {
  stories: StoryFolder[];
}

export function StoriesList({ stories }: StoriesListProps): JSX.Element {
  return (
    <Grid container spacing={2}>
      {stories.map((story) => (
        <Grid item xs={12} sm={6} md={4} key={story.id}>
          <StoryCard story={story} />
        </Grid>
      ))}
    </Grid>
  );
}

