import { CloudUpload, SaveAlt } from "@mui/icons-material";
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

import type { ExportDestination, ExportProgress } from "../../hooks/useExport";

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
  const { currentChunk, totalChunks, status, error, destination } = progress;
  const progressPercentage =
    totalChunks > 0 ? (currentChunk / totalChunks) * 100 : 0;

  const getDialogTitle = () => {
    return destination === "local" ? "Exporting to Local Folder" : "Exporting to Google Docs";
  };

  const getStatusMessage = () => {
    switch (status) {
      case "creating":
        return destination === "local" ? "Creating local export file..." : "Creating document...";
      case "writing":
        return destination === "local"
          ? "Writing export content..."
          : `Writing chunk ${currentChunk} of ${totalChunks}...`;
      case "completed":
        return destination === "local"
          ? "Local export completed!"
          : "Export completed!";
      case "error":
        return `Error: ${error ?? "Export failed"}`;
      default:
        return destination === "local"
          ? "Preparing local export..."
          : "Preparing export...";
    }
  };

  const getSuccessMessage = () => {
    return destination === "local"
      ? "Local export completed successfully!"
      : "Export completed successfully!";
  };

  const renderIcon = (target: ExportDestination) => {
    return target === "local" ? <SaveAlt /> : <CloudUpload />;
  };

  return (
    <Dialog open={open} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          {renderIcon(destination)}
          <Typography variant="h6">{getDialogTitle()}</Typography>
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
                {getSuccessMessage()}
              </Typography>
            </Box>
          ) : status === "error" ? (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="error">
                {error ?? "An error occurred during export"}
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

