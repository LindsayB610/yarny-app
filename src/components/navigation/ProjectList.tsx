import { List, ListItemButton, ListItemText, Typography } from "@mui/material";
import type { JSX } from "react";

import { useYarnyStore } from "../../store/provider";
import { selectProjectSummaries } from "../../store/selectors";

export function ProjectList(): JSX.Element {
  const projects = useYarnyStore(selectProjectSummaries);
  const selectedProjectId = useYarnyStore((state) => state.ui.selectedProjectId);
  const selectProject = useYarnyStore((state) => state.selectProject);

  return (
    <>
      <Typography variant="subtitle1" sx={{ px: 2, py: 1 }}>
        Projects
      </Typography>
      <List component="nav" dense disablePadding>
        {projects.map((project) => (
          <ListItemButton
            key={project.id}
            selected={project.id === selectedProjectId}
            onClick={() => selectProject(project.id)}
          >
            <ListItemText
              primary={project.name}
              secondary={`${project.storyCount} stories`}
            />
          </ListItemButton>
        ))}
      </List>
    </>
  );
}

