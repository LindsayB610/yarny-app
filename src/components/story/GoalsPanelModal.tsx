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
import { useState, type JSX, type FormEvent } from "react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export interface Goal {
  target: number;
  deadline: string;
  mode?: "elastic" | "strict";
  writingDays?: boolean[];
  daysOff?: string[];
}

interface GoalsPanelModalProps {
  open: boolean;
  onClose: () => void;
  initialGoal?: Goal;
  initialWordGoal?: number;
  onSave: (wordGoal: number, goal?: Goal) => Promise<void>;
}

export function GoalsPanelModal({
  open,
  onClose,
  initialGoal,
  initialWordGoal = 3000,
  onSave
}: GoalsPanelModalProps): JSX.Element {
  const [wordGoal, setWordGoal] = useState(initialWordGoal);
  const [goalTarget, setGoalTarget] = useState(initialGoal?.target || 3000);
  const [goalDeadline, setGoalDeadline] = useState(
    initialGoal?.deadline ? initialGoal.deadline.split("T")[0] : ""
  );
  const [goalMode, setGoalMode] = useState<"elastic" | "strict">(
    initialGoal?.mode || "elastic"
  );
  const [writingDays, setWritingDays] = useState(
    initialGoal?.writingDays || [true, true, true, true, true, true, true]
  );
  const [daysOff, setDaysOff] = useState(
    initialGoal?.daysOff?.join(", ") || ""
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleWritingDayChange = (index: number) => {
    const newDays = [...writingDays];
    newDays[index] = !newDays[index];
    setWritingDays(newDays);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      // Parse days off
      const daysOffArray = daysOff
        .split(",")
        .map((d) => d.trim())
        .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));

      // Build goal metadata if deadline is provided
      const goalMetadata = goalDeadline
        ? {
            target: goalTarget,
            deadline: goalDeadline + "T23:59:59", // End of day
            writingDays,
            daysOff: daysOffArray,
            mode: goalMode
          }
        : undefined;

      await onSave(wordGoal, goalMetadata);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save goals");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setWordGoal(initialWordGoal);
    setGoalTarget(initialGoal?.target || 3000);
    setGoalDeadline(initialGoal?.deadline ? initialGoal.deadline.split("T")[0] : "");
    setGoalMode(initialGoal?.mode || "elastic");
    setWritingDays(initialGoal?.writingDays || [true, true, true, true, true, true, true]);
    setDaysOff(initialGoal?.daysOff?.join(", ") || "");
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
          color: "white",
          maxHeight: "90vh"
        }
      }}
    >
      <DialogTitle sx={{ color: "white", fontWeight: 600 }}>
        Writing Goals
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
            label="Word Count Target"
            type="number"
            required
            value={wordGoal}
            onChange={(e) => setWordGoal(parseInt(e.target.value) || 3000)}
            inputProps={{ min: 1 }}
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
            {isSaving ? "Saving..." : "Save Goals"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

