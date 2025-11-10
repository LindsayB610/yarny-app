import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography
} from "@mui/material";
import { useId, useMemo, useState, type JSX, type FormEvent } from "react";

import { STORY_GENRES, isStoryGenre } from "../../constants/storyGenres";

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
  const genreLabelId = useId();
  const genreSelectId = useId();

  const genreOptions = useMemo(() => {
    const extras = [initialGenre, genre].filter(
      (value): value is string => Boolean(value && !isStoryGenre(value))
    );
    return [...new Set([...extras, ...STORY_GENRES])];
  }, [genre, initialGenre]);

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

          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel id={genreLabelId} sx={{ color: "rgba(255, 255, 255, 0.7)" }}>
              Genre (optional)
            </InputLabel>
            <Select
              labelId={genreLabelId}
              id={genreSelectId}
              value={genre}
              label="Genre (optional)"
              onChange={(event) => setGenre(event.target.value)}
              displayEmpty
              renderValue={(selected) =>
                selected ? (
                  selected
                ) : (
                  <Typography sx={{ color: "rgba(255, 255, 255, 0.7)" }}>None</Typography>
                )
              }
              sx={{
                bgcolor: "rgba(255, 255, 255, 0.1)",
                color: "white",
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(255, 255, 255, 0.2)"
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(255, 255, 255, 0.3)"
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "primary.main"
                },
                "& .MuiSelect-icon": {
                  color: "rgba(255, 255, 255, 0.7)"
                }
              }}
              MenuProps={{
                PaperProps: {
                  sx: {
                    bgcolor: "rgba(15, 23, 42, 0.98)",
                    color: "rgba(255, 255, 255, 0.92)"
                  }
                }
              }}
            >
              <MenuItem value="">
                <Typography sx={{ color: "rgba(255, 255, 255, 0.85)" }}>None</Typography>
              </MenuItem>
              {genreOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

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
              color: "white",
              fontWeight: 600,
              "&:hover": {
                bgcolor: "primary.dark"
              },
              "&.Mui-disabled": {
                bgcolor: "rgba(59, 130, 246, 0.35)",
                color: "rgba(255, 255, 255, 0.75)",
                border: "1px solid rgba(59, 130, 246, 0.5)"
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

