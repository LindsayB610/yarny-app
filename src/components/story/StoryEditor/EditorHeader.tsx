import { Box, Button, Stack, Typography } from "@mui/material";
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
}

export function EditorHeader({
  title,
  statusText,
  onSave,
  isSaving,
  isSyncing,
  canSave
}: EditorHeaderProps): JSX.Element {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={2}
      alignItems={{ xs: "flex-start", sm: "center" }}
      justifyContent="space-between"
    >
      <Box>
        <Typography variant="h3">{title}</Typography>
        <Typography variant="body2" color="text.secondary">
          {statusText}
        </Typography>
      </Box>
      <Stack direction="row" spacing={1}>
        <ManualSyncButton />
        <Button
          onClick={onSave}
          variant="contained"
          disabled={isSaving || isSyncing || !canSave}
        >
          {isSyncing || isSaving ? "Saving..." : "Save to Drive"}
        </Button>
      </Stack>
    </Stack>
  );
}

