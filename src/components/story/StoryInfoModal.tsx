import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography
} from "@mui/material";
import { useState, type JSX, type FormEvent } from "react";

interface StoryInfoModalProps {
  open: boolean;
  onClose: () => void;
  storyName: string;
  genre?: string;
  description?: string;
  onSave: (updates: { genre?: string; description?: string }) => Promise<void>;
}

export function StoryInfoModal({
  open,
  onClose,
  storyName,
  genre: initialGenre = "",
  description: initialDescription = "",
  onSave
}: StoryInfoModalProps): JSX.Element {
  const [genre, setGenre] = useState(initialGenre);
  const [description, setDescription] = useState(initialDescription);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      await onSave({
        genre: genre.trim() || undefined,
        description: description.trim() || undefined
      });
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save story info");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setGenre(initialGenre);
    setDescription(initialDescription);
    setError(null);
    onClose();
  };

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
        Story Info & Settings
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Typography
            variant="body1"
            sx={{ color: "rgba(255, 255, 255, 0.9)", mb: 3, fontWeight: 500 }}
          >
            {storyName}
          </Typography>

          {error && (
            <Box
              sx={{
                bgcolor: "rgba(239, 68, 68, 0.2)",
                color: "rgba(255, 255, 255, 0.9)",
                p: 2,
                borderRadius: 2,
                mb: 2,
                borderLeft: "4px solid",
                borderColor: "error.main"
              }}
            >
              {error}
            </Box>
          )}

          <TextField
            fullWidth
            label="Genre (optional)"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            placeholder="e.g., Fantasy, Sci-Fi, Romance"
            sx={{ mb: 3 }}
            InputLabelProps={{ style: { color: "rgba(255, 255, 255, 0.7)" } }}
            InputProps={{
              sx: {
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

          <TextField
            fullWidth
            label="Story Description (optional)"
            multiline
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A brief description of your story..."
            inputProps={{ maxLength: 500 }}
            helperText={`${description.length}/500 characters`}
            InputLabelProps={{ style: { color: "rgba(255, 255, 255, 0.7)" } }}
            InputProps={{
              sx: {
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
            FormHelperTextProps={{
              style: { color: "rgba(255, 255, 255, 0.5)" }
            }}
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
            type="submit"
            variant="contained"
            disabled={isSaving}
            sx={{
              bgcolor: "primary.main",
              "&:hover": {
                bgcolor: "primary.dark"
              },
              "&:disabled": {
                opacity: 0.6
              }
            }}
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

