import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormGroup,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography
} from "@mui/material";
import React, { useId, useMemo, useState } from "react";

import { useCreateStory } from "../../hooks/useStoryMutations";
import { STORY_GENRES, isStoryGenre } from "../../constants/storyGenres";

interface NewStoryModalProps {
  open: boolean;
  onClose: () => void;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function NewStoryModal({ open, onClose }: NewStoryModalProps) {
  const [storyName, setStoryName] = useState("");
  const [genre, setGenre] = useState("");
  const [description, setDescription] = useState("");
  const [goalTarget, setGoalTarget] = useState("3000");
  const [goalDeadline, setGoalDeadline] = useState("");
  const [goalMode, setGoalMode] = useState<"elastic" | "strict">("elastic");
  const [writingDays, setWritingDays] = useState([true, true, true, true, true, true, true]);
  const [daysOff, setDaysOff] = useState("");
  const [error, setError] = useState<string | null>(null);
  const genreLabelId = useId();
  const genreSelectId = useId();

  const genreOptions = useMemo(() => {
    const extras = genre ? [genre] : [];
    const customOptions = extras.filter((value) => value && !isStoryGenre(value));
    return [...new Set([...customOptions, ...STORY_GENRES])];
  }, [genre]);

  const createStory = useCreateStory();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!storyName.trim()) {
      setError("Please enter a story name");
      return;
    }

    // Make sure word goal is valid before continuing
    const trimmedGoalTarget = goalTarget.trim();
    const parsedGoalTarget = parseInt(trimmedGoalTarget, 10);

    if (!trimmedGoalTarget || Number.isNaN(parsedGoalTarget) || parsedGoalTarget <= 0) {
      setError("Please enter a word count greater than 0");
      return;
    }

    // Parse days off
    const daysOffArray = daysOff
      .split(",")
      .map((d) => d.trim())
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));

    // Build goal metadata if deadline is provided
    const goalMetadata = goalDeadline
      ? {
          target: parsedGoalTarget,
          deadline: goalDeadline + "T23:59:59", // End of day
          writingDays,
          daysOff: daysOffArray,
          mode: goalMode
        }
      : undefined;

    try {
      await createStory.mutateAsync({
        storyName: storyName.trim(),
        metadata: {
          genre: genre.trim() || undefined,
          description: description.trim() || undefined,
          wordGoal: parsedGoalTarget,
          goal: goalMetadata
        }
      });
      // Modal will close and navigation happens in the mutation's onSuccess
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create story");
    }
  };

  const handleClose = () => {
    setStoryName("");
    setGenre("");
    setDescription("");
    setGoalTarget("3000");
    setGoalDeadline("");
    setGoalMode("elastic");
    setWritingDays([true, true, true, true, true, true, true]);
    setDaysOff("");
    setError(null);
    onClose();
  };

  const handleWritingDayChange = (index: number) => {
    const newDays = [...writingDays];
    newDays[index] = !newDays[index];
    setWritingDays(newDays);
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
          color: "white",
          maxHeight: "90vh"
        }
      }}
    >
      <DialogTitle sx={{ color: "white", fontWeight: 600 }}>
        Create New Story
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
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
            label="Story Name"
            required
            value={storyName}
            onChange={(e) => setStoryName(e.target.value)}
            placeholder="My Novel"
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
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A brief description of your story..."
            inputProps={{ maxLength: 500 }}
            helperText={`${description.length}/500 characters`}
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
            FormHelperTextProps={{
              style: { color: "rgba(255, 255, 255, 0.5)" }
            }}
          />

          <TextField
            fullWidth
            label="Word Count Target"
            required
            value={goalTarget}
            onChange={(e) => {
              const value = e.target.value;
              if (/^\d*$/.test(value)) {
                setGoalTarget(value);
              }
            }}
            inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
            helperText="Total words you want to write"
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
            FormHelperTextProps={{
              style: { color: "rgba(255, 255, 255, 0.5)" }
            }}
          />

          <TextField
            fullWidth
            label="Deadline (optional)"
            type="date"
            value={goalDeadline}
            onChange={(e) => setGoalDeadline(e.target.value)}
            InputLabelProps={{
              shrink: true,
              style: { color: "rgba(255, 255, 255, 0.7)" }
            }}
            helperText="When do you want to finish?"
            sx={{ mb: 3 }}
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

          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.7)", mb: 1 }}>
              Writing Days (optional)
            </Typography>
            <FormGroup row>
              {DAYS.map((day, index) => (
                <FormControlLabel
                  key={day}
                  control={
                    <Checkbox
                      checked={writingDays[index]}
                      onChange={() => handleWritingDayChange(index)}
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
                      {day}
                    </Typography>
                  }
                />
              ))}
            </FormGroup>
            <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.5)", mt: 1, display: "block" }}>
              Which days of the week do you write?
            </Typography>
          </Box>

          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel sx={{ color: "rgba(255, 255, 255, 0.7)" }}>Mode (optional)</InputLabel>
            <Select
              value={goalMode}
              onChange={(e) => setGoalMode(e.target.value as "elastic" | "strict")}
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
                "& .MuiSvgIcon-root": {
                  color: "rgba(255, 255, 255, 0.7)"
                }
              }}
            >
              <MenuItem value="elastic">Elastic (rebalance daily targets)</MenuItem>
              <MenuItem value="strict">Strict (fixed daily target)</MenuItem>
            </Select>
            <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.5)", mt: 1, display: "block" }}>
              Elastic adjusts targets based on progress; Strict keeps fixed targets
            </Typography>
          </FormControl>

          <TextField
            fullWidth
            label="Days Off (optional)"
            value={daysOff}
            onChange={(e) => setDaysOff(e.target.value)}
            placeholder="YYYY-MM-DD, YYYY-MM-DD, ..."
            helperText="Comma-separated dates (e.g., 2025-12-25, 2026-01-01)"
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
            disabled={createStory.isPending}
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
            {createStory.isPending ? "Creating..." : "Create Story"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

