import {
  Box,
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

import { useDeleteStory } from "../../hooks/useStoryMutations";

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

  const handleDelete = async () => {
    if (confirmText !== "DELETE") {
      return;
    }

    try {
      await deleteStory.mutateAsync({
        storyFolderId: storyId,
        deleteFromDrive
      });
      onClose();
      setConfirmText("");
      setDeleteFromDrive(false);
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
            "&:hover": {
              bgcolor: "#DC2626"
            },
            "&:disabled": {
              opacity: 0.6
            }
          }}
        >
          {deleteStory.isPending ? "Deleting..." : "Delete Story"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

