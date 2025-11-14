import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent
} from "@mui/material";
import { useState, type JSX } from "react";

interface MoveSnippetDialogProps {
  open: boolean;
  chapters: Array<{ id: string; title: string }>;
  currentChapterId: string | null;
  onClose: () => void;
  onConfirm: (chapterId: string) => void;
  isSubmitting: boolean;
}

export function MoveSnippetDialog({
  open,
  chapters,
  currentChapterId,
  onClose,
  onConfirm,
  isSubmitting
}: MoveSnippetDialogProps): JSX.Element {
  const [selectedChapterId, setSelectedChapterId] = useState<string>("");

  const handleChange = (event: SelectChangeEvent<string>) => {
    setSelectedChapterId(event.target.value);
  };

  const handleConfirm = () => {
    if (selectedChapterId) {
      onConfirm(selectedChapterId);
      setSelectedChapterId("");
    }
  };

  const handleClose = () => {
    setSelectedChapterId("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Move Snippet</DialogTitle>
      <DialogContent>
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel>Target Chapter</InputLabel>
          <Select value={selectedChapterId} onChange={handleChange} label="Target Chapter">
            {chapters
              .filter((chapter) => chapter.id !== currentChapterId)
              .map((chapter) => (
                <MenuItem key={chapter.id} value={chapter.id}>
                  {chapter.title || "Untitled Chapter"}
                </MenuItem>
              ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleConfirm} variant="contained" disabled={!selectedChapterId || isSubmitting}>
          Move
        </Button>
      </DialogActions>
    </Dialog>
  );
}

