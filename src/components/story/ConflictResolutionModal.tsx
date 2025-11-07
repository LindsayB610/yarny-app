import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography
} from "@mui/material";
import { type JSX } from "react";

import type { ConflictInfo } from "../../hooks/useConflictDetection";

interface ConflictResolutionModalProps {
  open: boolean;
  conflict: ConflictInfo | null;
  onResolve: (action: "useLocal" | "useDrive" | "cancel") => void;
}

export function ConflictResolutionModal({
  open,
  conflict,
  onResolve
}: ConflictResolutionModalProps): JSX.Element {
  if (!conflict) {
    return <></>;
  }

  const localDate = new Date(conflict.localModifiedTime).toLocaleString();
  const driveDate = new Date(conflict.driveModifiedTime).toLocaleString();

  return (
    <Dialog
      open={open}
      onClose={() => onResolve("cancel")}
      maxWidth="md"
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
        Conflict Detected
      </DialogTitle>
      <DialogContent>
        <Typography
          variant="body1"
          sx={{ color: "rgba(255, 255, 255, 0.9)", mb: 3 }}
        >
          This snippet has been modified in Google Drive since you last loaded it.
          Choose which version to keep:
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Typography
            variant="subtitle2"
            sx={{ color: "rgba(255, 255, 255, 0.8)", mb: 1 }}
          >
            Local Version (Your current edits)
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: "rgba(255, 255, 255, 0.6)", display: "block", mb: 2 }}
          >
            Last modified: {localDate}
          </Typography>
          <Box
            sx={{
              bgcolor: "rgba(255, 255, 255, 0.05)",
              p: 2,
              borderRadius: 1,
              border: "1px solid rgba(255, 255, 255, 0.1)",
              maxHeight: 200,
              overflow: "auto",
              fontFamily: "monospace",
              fontSize: "0.875rem",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word"
            }}
          >
            {conflict.localContent || "(empty)"}
          </Box>
        </Box>

        <Box>
          <Typography
            variant="subtitle2"
            sx={{ color: "rgba(255, 255, 255, 0.8)", mb: 1 }}
          >
            Drive Version (From Google Drive)
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: "rgba(255, 255, 255, 0.6)", display: "block", mb: 2 }}
          >
            Last modified: {driveDate}
          </Typography>
          <Box
            sx={{
              bgcolor: "rgba(255, 255, 255, 0.05)",
              p: 2,
              borderRadius: 1,
              border: "1px solid rgba(255, 255, 255, 0.1)",
              maxHeight: 200,
              overflow: "auto",
              fontFamily: "monospace",
              fontSize: "0.875rem",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word"
            }}
          >
            {conflict.driveContent || "(empty)"}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, pt: 1 }}>
        <Button
          onClick={() => onResolve("cancel")}
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
          onClick={() => onResolve("useLocal")}
          variant="contained"
          sx={{
            bgcolor: "primary.main",
            "&:hover": {
              bgcolor: "primary.dark"
            }
          }}
        >
          Keep Local
        </Button>
        <Button
          onClick={() => onResolve("useDrive")}
          variant="contained"
          sx={{
            bgcolor: "info.main",
            "&:hover": {
              bgcolor: "info.dark"
            }
          }}
        >
          Use Drive
        </Button>
      </DialogActions>
    </Dialog>
  );
}

