import {
  Box,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Typography
} from "@mui/material";
import { type JSX } from "react";

import { StoryTabs, type TabItem } from "./StoryTabs";
import { useNotesQuery, type NoteType } from "../../hooks/useNotesQuery";
import { useYarnyStore } from "../../store/provider";
import { selectActiveStory } from "../../store/selectors";

interface NotesListProps {
  notes: Array<{ id: string; name: string; content: string; modifiedTime: string }>;
  isLoading: boolean;
  noteType: NoteType;
}

function NotesList({ notes, isLoading, noteType }: NotesListProps): JSX.Element {
  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          p: 4
        }}
      >
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (notes.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          No {noteType} notes yet. Create one to get started.
        </Typography>
      </Box>
    );
  }

  return (
    <List sx={{ p: 0 }}>
      {notes.map((note) => (
        <ListItem
          key={note.id}
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            "&:hover": {
              bgcolor: "action.hover"
            }
          }}
        >
          <ListItemText
            primary={
              <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
                {note.name}
              </Typography>
            }
            secondary={
              <Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mt: 0.5,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }}
                >
                  {note.content || "(empty)"}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                  {new Date(note.modifiedTime).toLocaleDateString()}
                </Typography>
              </Box>
            }
          />
        </ListItem>
      ))}
    </List>
  );
}

export function NotesSidebar(): JSX.Element {
  const story = useYarnyStore(selectActiveStory);

  // Get story folder ID - stories are folders in Drive, so the story ID is the folder ID
  const storyFolderId = story?.id;

  const peopleQuery = useNotesQuery(storyFolderId, "people", Boolean(story));
  const placesQuery = useNotesQuery(storyFolderId, "places", Boolean(story));
  const thingsQuery = useNotesQuery(storyFolderId, "things", Boolean(story));

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
        <NotesList
          notes={peopleQuery.data || []}
          isLoading={peopleQuery.isLoading}
          noteType="people"
        />
      )
    },
    {
      id: "places",
      label: "Places",
      content: (
        <NotesList
          notes={placesQuery.data || []}
          isLoading={placesQuery.isLoading}
          noteType="places"
        />
      )
    },
    {
      id: "things",
      label: "Things",
      content: (
        <NotesList
          notes={thingsQuery.data || []}
          isLoading={thingsQuery.isLoading}
          noteType="things"
        />
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
      <Box sx={{ flex: 1, overflow: "auto" }}>
        <StoryTabs tabs={tabs} defaultTab="people" />
      </Box>
    </Box>
  );
}

