import { CloudUpload } from "@mui/icons-material";
import {
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Typography
} from "@mui/material";
import type { JSX } from "react";

import type { ExportProgress } from "../../hooks/useExport";

interface ExportProgressDialogProps {
  open: boolean;
  progress: ExportProgress;
  fileName: string;
}

/**
 * Dialog component that shows export progress with chunk information
 */
export function ExportProgressDialog({
  open,
  progress,
  fileName
}: ExportProgressDialogProps): JSX.Element {
  const { currentChunk, totalChunks, status, error } = progress;
  const progressPercentage =
    totalChunks > 0 ? (currentChunk / totalChunks) * 100 : 0;

  const getStatusMessage = () => {
    switch (status) {
      case "creating":
        return "Creating document...";
      case "writing":
        return `Writing chunk ${currentChunk} of ${totalChunks}...`;
      case "completed":
        return "Export completed!";
      case "error":
        return `Error: ${error || "Export failed"}`;
      default:
        return "Preparing export...";
    }
  };

  return (
    <Dialog open={open} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <CloudUpload />
          <Typography variant="h6">Exporting to Google Docs</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ py: 2 }}>
          <Typography variant="body1" gutterBottom>
            {fileName}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {getStatusMessage()}
          </Typography>

          {status === "completed" ? (
            <Box sx={{ mt: 2, textAlign: "center" }}>
              <CircularProgress
                variant="determinate"
                value={100}
                color="success"
                size={48}
              />
              <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                Export completed successfully!
              </Typography>
            </Box>
          ) : status === "error" ? (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="error">
                {error || "An error occurred during export"}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ mt: 3 }}>
              <LinearProgress
                variant="determinate"
                value={progressPercentage}
                sx={{ height: 8, borderRadius: 4 }}
              />
              {totalChunks > 1 && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 1, display: "block" }}
                >
                  Processing large document: {currentChunk} of {totalChunks}{" "}
                  chunks
                </Typography>
              )}
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}

