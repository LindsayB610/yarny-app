import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  TextField,
  Typography
} from "@mui/material";
import { useState } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { useDeleteStory } from "../../hooks/useStoryMutations";
import { useYarnyStore, useYarnyStoreApi } from "../../store/provider";

interface DeleteStoryModalProps {
  open: boolean;
  onClose: () => void;
  storyId: string;
  storyName: string;
}

export function DeleteStoryModal({
  open,
  onClose,
  storyId,
  storyName
}: DeleteStoryModalProps) {
  const [confirmText, setConfirmText] = useState("");
  const [deleteFromDrive, setDeleteFromDrive] = useState(false);
  const deleteStory = useDeleteStory();
  const storeApi = useYarnyStoreApi();
  const removeSnippet = useYarnyStore((state) => state.removeSnippet);
  const removeChapter = useYarnyStore((state) => state.removeChapter);
  const upsertEntities = useYarnyStore((state) => state.upsertEntities);
  const selectStory = useYarnyStore((state) => state.selectStory);
  const stories = useYarnyStore((state) => state.entities.stories);
  const projects = useYarnyStore((state) => state.entities.projects);
  const queryClient = useQueryClient();
  
  // Check if this is a local project
  const story = stories[storyId];
  const project = story ? projects[story.projectId] : undefined;
  const isLocalProject = project?.storageType === "local";

  const handleDelete = async () => {
    if (confirmText !== "DELETE") {
      return;
    }

    try {
      if (isLocalProject && story) {
        // For local projects, remove from store
        // Remove all snippets and chapters first
        const chapters = storeApi.getState().entities.chapters;
        story.chapterIds.forEach((chapterId) => {
          const chapter = chapters[chapterId];
          if (chapter) {
            // Remove all snippets in this chapter
            chapter.snippetIds.forEach((snippetId) => {
              removeSnippet(snippetId);
            });
            // Remove the chapter
            removeChapter(chapterId);
          }
        });
        
        // Remove story from project
        if (project) {
          const updatedProject = {
            ...project,
            storyIds: project.storyIds.filter((id) => id !== storyId),
            updatedAt: new Date().toISOString()
          };
          upsertEntities({
            projects: [updatedProject],
            stories: [],
            chapters: [],
            snippets: []
          });
        }
        
        // Remove story entity from store using setState
        storeApi.setState((state) => {
          delete state.entities.stories[storyId];
          if (state.ui.activeStoryId === storyId) {
            state.ui.activeStoryId = undefined;
            state.ui.activeSnippetId = undefined;
            state.ui.activeContentId = undefined;
            state.ui.activeContentType = undefined;
          }
        });
        
        // Clear active story if it was the deleted one
        if (storeApi.getState().ui.activeStoryId === storyId) {
          selectStory(undefined);
        }
        
        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: ["local", "projects"] });
        queryClient.invalidateQueries({ queryKey: ["drive", "stories"] });
        
        onClose();
        setConfirmText("");
        setDeleteFromDrive(false);
      } else {
        // For Drive projects, use the existing delete mutation
        await deleteStory.mutateAsync({
          storyFolderId: storyId,
          deleteFromDrive
        });
        onClose();
        setConfirmText("");
        setDeleteFromDrive(false);
      }
    } catch (error) {
      console.error("Failed to delete story:", error);
      // Error handling can be added here (show toast, etc.)
    }
  };

  const handleClose = () => {
    setConfirmText("");
    setDeleteFromDrive(false);
    onClose();
  };

  const isDeleteEnabled = confirmText === "DELETE";

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: "rgba(31, 41, 55, 0.95)",
          backdropFilter: "blur(10px)",
          color: "white"
        }
      }}
    >
      <DialogTitle sx={{ color: "white", fontWeight: 600 }}>
        Delete Story
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1" sx={{ color: "rgba(255, 255, 255, 0.9)", mb: 2 }}>
          Are you sure you want to delete <strong>{storyName}</strong>?
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: "rgba(255, 255, 255, 0.7)", mb: 3 }}
        >
          This action cannot be undone. Type <strong>DELETE</strong> to confirm.
        </Typography>

        <TextField
          fullWidth
          placeholder="DELETE"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          sx={{
            mb: 2,
            "& .MuiOutlinedInput-root": {
              bgcolor: "rgba(255, 255, 255, 0.1)",
              color: "white",
              "& fieldset": {
                borderColor: "rgba(255, 255, 255, 0.2)"
              },
              "&:hover fieldset": {
                borderColor: "rgba(255, 255, 255, 0.3)"
              },
              "&.Mui-focused fieldset": {
                borderColor: "primary.main"
              }
            }
          }}
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={deleteFromDrive}
              onChange={(e) => setDeleteFromDrive(e.target.checked)}
              sx={{
                color: "rgba(255, 255, 255, 0.7)",
                "&.Mui-checked": {
                  color: "primary.main"
                }
              }}
            />
          }
          label={
            <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.9)" }}>
              Also permanently delete from Google Drive (default: move to trash)
            </Typography>
          }
        />
      </DialogContent>
      <DialogActions sx={{ p: 2, pt: 1 }}>
        <Button
          onClick={handleClose}
          sx={{
            color: "rgba(255, 255, 255, 0.7)",
            "&:hover": {
              bgcolor: "rgba(255, 255, 255, 0.1)"
            }
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleDelete}
          disabled={!isDeleteEnabled || deleteStory.isPending}
          variant="contained"
          sx={{
            bgcolor: "error.main",
            color: "white",
            fontWeight: 600,
            "&:hover": {
              bgcolor: "#DC2626"
            },
            "&.Mui-disabled": {
              bgcolor: "rgba(239, 68, 68, 0.35)",
              color: "rgba(255, 255, 255, 0.7)",
              border: "1px solid rgba(239, 68, 68, 0.6)"
            }
          }}
        >
          {deleteStory.isPending ? "Deleting..." : "Delete Story"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

