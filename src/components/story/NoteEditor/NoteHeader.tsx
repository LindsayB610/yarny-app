import { Box, Button, Stack, Typography } from "@mui/material";
import type { JSX } from "react";

interface NoteHeaderProps {
  noteName: string;
  statusText: string;
  onSave: () => void;
  saving: boolean;
  hasUnsavedChanges: boolean;
}

export function NoteHeader({
  noteName,
  statusText,
  onSave,
  saving,
  hasUnsavedChanges
}: NoteHeaderProps): JSX.Element {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={2}
      alignItems={{ xs: "flex-start", sm: "center" }}
      justifyContent="space-between"
    >
      <Box>
        <Typography variant="h3">{noteName}</Typography>
        <Typography variant="body2" color="text.secondary">
          {statusText}
        </Typography>
      </Box>
      <Stack direction="row" spacing={1}>
        <Button
          onClick={onSave}
          variant="contained"
          disabled={saving || !hasUnsavedChanges}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </Stack>
    </Stack>
  );
}

