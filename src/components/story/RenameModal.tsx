import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField
} from "@mui/material";
import { useState, type JSX, type FormEvent } from "react";

interface RenameModalProps {
  open: boolean;
  onClose: () => void;
  currentName: string;
  itemType: "chapter" | "snippet" | "story";
  onRename: (newName: string) => Promise<void>;
}

export function RenameModal({
  open,
  onClose,
  currentName,
  itemType,
  onRename
}: RenameModalProps): JSX.Element {
  const [newName, setNewName] = useState(currentName);
  const [error, setError] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);

  const itemLabel = itemType === "chapter" ? "Chapter" : itemType === "snippet" ? "Snippet" : "Story";

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!newName.trim()) {
      setError(`Please enter a ${itemLabel.toLowerCase()} name`);
      return;
    }

    if (newName.trim() === currentName) {
      onClose();
      return;
    }

    setIsRenaming(true);

    try {
      await onRename(newName.trim());
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to rename ${itemLabel.toLowerCase()}`);
    } finally {
      setIsRenaming(false);
    }
  };

  const handleClose = () => {
    setNewName(currentName);
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
        Rename {itemLabel}
      </DialogTitle>
      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
      >
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
            label={`${itemLabel} Name`}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
            sx={{ mt: 1 }}
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
            disabled={isRenaming || !newName.trim() || newName.trim() === currentName}
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
            {isRenaming ? "Renaming..." : "Rename"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

