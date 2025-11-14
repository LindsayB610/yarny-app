import { Dialog, DialogActions, DialogContent, DialogTitle, Button, Typography } from "@mui/material";
import type { JSX } from "react";

interface DeleteDialogProps {
  open: boolean;
  type: "chapter" | "snippet" | null;
  name: string;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
}

export function DeleteDialog({
  open,
  type,
  name,
  onClose,
  onConfirm,
  isSubmitting
}: DeleteDialogProps): JSX.Element {
  if (!type) return <></>;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        {type === "chapter" ? "Delete Chapter" : "Delete Snippet"}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2">
          Are you sure you want to delete &ldquo;{name}&rdquo;? This action cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button onClick={onConfirm} color="error" variant="contained" disabled={isSubmitting}>
          {isSubmitting ? "Deleting…" : "Delete"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

