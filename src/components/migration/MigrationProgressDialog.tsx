import {
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Typography
} from "@mui/material";
import type { MigrationProgress } from "../../services/migration";

interface MigrationProgressDialogProps {
  open: boolean;
  progress: MigrationProgress;
}

export function MigrationProgressDialog({
  open,
  progress
}: MigrationProgressDialogProps) {
  const percentage =
    progress.totalStories > 0
      ? Math.round((progress.completedStories / progress.totalStories) * 100)
      : 0;

  return (
    <Dialog open={open} maxWidth="sm" fullWidth>
      <DialogTitle>Migrating Stories to JSON</DialogTitle>
      <DialogContent>
        <Box sx={{ py: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Migrating {progress.totalStories} stories to JSON format...
          </Typography>

          <Box sx={{ mt: 2, mb: 1 }}>
            <LinearProgress variant="determinate" value={percentage} />
          </Box>

          <Typography variant="body2" color="text.secondary" align="center">
            {progress.completedStories} / {progress.totalStories} stories completed ({percentage}%)
          </Typography>

          {progress.currentStory && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Current: {progress.currentStory}
            </Typography>
          )}

          {progress.errors.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="error">
                {progress.errors.length} error(s) occurred. Check console for details.
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}

