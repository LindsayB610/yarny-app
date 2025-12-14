import { Box, Button, CircularProgress, Stack, Tooltip, Typography } from "@mui/material";
import type { JSX } from "react";

import { ManualSyncButton } from "../ManualSyncButton";

interface EditorHeaderProps {
  title: string;
  statusText: string;
  onSave: () => void;
  isSaving: boolean;
  isSyncing: boolean;
  hasUnsavedChanges: boolean;
  canSave: boolean;
  isLocalProject?: boolean;
}

export function EditorHeader({
  title,
  statusText,
  onSave,
  isSaving,
  isSyncing,
  hasUnsavedChanges,
  canSave,
  isLocalProject = false
}: EditorHeaderProps): JSX.Element {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={2}
      alignItems={{ xs: "flex-start", sm: "center" }}
      justifyContent="space-between"
    >
      <Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="h3">{title}</Typography>
          {isLocalProject && (
            <Typography
              variant="caption"
              sx={{
                bgcolor: "rgba(59, 130, 246, 0.2)",
                color: "primary.main",
                px: 1,
                py: 0.5,
                borderRadius: 1,
                fontWeight: 600,
                textTransform: "uppercase",
                fontSize: "0.65rem"
              }}
            >
              Local
            </Typography>
          )}
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {statusText}
        </Typography>
      </Box>
      <Stack direction="row" spacing={1}>
        {!isLocalProject && <ManualSyncButton />}
        <Tooltip
          title={isLocalProject && !hasUnsavedChanges ? "All changes are saved. Local projects also save automatically." : ""}
          disableHoverListener={!(isLocalProject && !hasUnsavedChanges)}
        >
          <span>
            <Button
              onClick={onSave}
              variant="contained"
              disabled={isSaving || isSyncing || !canSave || !hasUnsavedChanges}
              startIcon={isSaving || isSyncing ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {isSyncing || isSaving 
                ? "Saving..." 
                : isLocalProject 
                  ? "Save to Local Files" 
                  : "Save to Drive"}
            </Button>
          </span>
        </Tooltip>
      </Stack>
    </Stack>
  );
}

