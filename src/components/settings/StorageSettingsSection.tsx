import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Stack,
  Switch,
  Tooltip,
  Typography
} from "@mui/material";
import { type ChangeEvent, useState } from "react";

import { useLocalBackups } from "../../hooks/useLocalBackups";

export function StorageSettingsSection(): JSX.Element {
  const {
    enabled,
    isSupported,
    isInitializing,
    permission,
    lastSyncedAt,
    error,
    enableLocalBackups,
    disableLocalBackups,
    refreshPermission,
    openLocalFolder
  } = useLocalBackups();

  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const runEnable = async () => {
    if (isProcessing) {
      return;
    }

    setStatusMessage(null);
    setIsProcessing(true);

    try {
      const result = await enableLocalBackups();
      if (result.success) {
        setStatusMessage("Local backups enabled. Files will mirror Drive saves.");
      } else if (!isSupported) {
        setStatusMessage("Local backups are not supported in this browser.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const runDisable = async () => {
    if (isProcessing) {
      return;
    }

    setStatusMessage(null);
    setIsProcessing(true);

    try {
      await disableLocalBackups();
      setStatusMessage("Local backups disabled and folder disconnected.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggle = async (_event: ChangeEvent<HTMLInputElement>, checked: boolean) => {
    if (checked) {
      await runEnable();
    } else {
      await runDisable();
    }
  };

  const handleReconnect = async () => {
    if (isProcessing) {
      return;
    }
    setStatusMessage(null);
    setIsProcessing(true);
    try {
      await refreshPermission();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenFolder = async () => {
    if (isProcessing) {
      return;
    }
    setStatusMessage(null);
    setIsProcessing(true);
    try {
      await openLocalFolder();
    } finally {
      setIsProcessing(false);
    }
  };

  const showUnsupportedBanner = !isSupported;
  const toggleDisabled = isProcessing || !isSupported;

  return (
    <Card variant="outlined">
      <CardHeader
        title="Local Story Backups"
        subheader="Mirror Drive saves to a local folder for offline work and testing."
      />
      <CardContent>
        <Stack spacing={3}>
          {showUnsupportedBanner ? (
            <Alert severity="warning">
              Your browser does not support the File System Access API. Please use a Chromium-based
              browser such as Chrome or Edge to enable local backups.
            </Alert>
          ) : null}

          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={2}
          >
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>
                Enable Local Story Backups
              </Typography>
              <Typography variant="body2" color="text.secondary">
                When enabled, Yarny will mirror Drive writes to the selected local folder.
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1.5}>
              {isProcessing || isInitializing ? <CircularProgress size={20} /> : null}
              <Tooltip
                title={
                  !isSupported
                    ? "Local backups require the File System Access API."
                    : undefined
                }
              >
                <span>
                  <Switch
                    inputProps={{ "aria-label": "Enable local story backups" }}
                    checked={enabled}
                    onChange={handleToggle}
                    disabled={toggleDisabled || isInitializing}
                  />
                </span>
              </Tooltip>
            </Box>
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Button
              variant="contained"
              onClick={runEnable}
              disabled={isProcessing || !isSupported}
            >
              Choose Folder
            </Button>
            <Button
              variant="outlined"
              onClick={handleOpenFolder}
              disabled={isProcessing || !enabled || permission !== "granted"}
            >
              Open Folder
            </Button>
            <Button
              color="error"
              variant="text"
              onClick={runDisable}
              disabled={isProcessing || !enabled}
            >
              Disconnect
            </Button>
            <Button
              variant="text"
              onClick={handleReconnect}
              disabled={isProcessing || !enabled}
            >
              Reconnect
            </Button>
          </Stack>

          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary">
              Permission status: <strong>{permission}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Last mirrored write:{" "}
              {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : "No local syncs yet"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Drives continue to sync even if local backups fail. Check the save status banner for
              issues.
            </Typography>
          </Stack>

          {statusMessage ? (
            <Alert severity="info" onClose={() => setStatusMessage(null)}>
              {statusMessage}
            </Alert>
          ) : null}

          {error ? (
            <Alert severity="error">
              {error.message}
              <Typography variant="caption" display="block" mt={0.5} color="text.secondary">
                {new Date(error.timestamp).toLocaleString()}
              </Typography>
            </Alert>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}


