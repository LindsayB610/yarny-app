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
import type { AlertColor } from "@mui/material";
import { type ChangeEvent, useEffect, useState } from "react";

import { useLocalBackups } from "../../hooks/useLocalBackups";
import { useYarnyStoreApi } from "../../store/provider";
import { refreshAllStoriesToLocal } from "../../services/localFs/localBackupMirror";

export function StorageSettingsSection(): JSX.Element {
  const {
    enabled,
    isSupported,
    isInitializing,
    permission,
    lastSyncedAt,
    error,
    refreshStatus,
    refreshMessage,
    refreshCompletedAt,
    setRefreshStatus,
    enableLocalBackups,
    disableLocalBackups,
    refreshPermission,
    openLocalFolder
  } = useLocalBackups();
  const yarnyStore = useYarnyStoreApi();

  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusSeverity, setStatusSeverity] = useState<AlertColor>("info");

  const runEnable = async () => {
    if (isProcessing) {
      return;
    }

    setStatusMessage(null);
    setIsProcessing(true);

    try {
      const result = await enableLocalBackups();
      if (result.success) {
        setStatusSeverity("info");
        setStatusMessage("Local backups enabled. Files will mirror Drive saves.");
      } else if (!isSupported) {
        setStatusSeverity("error");
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
      setStatusSeverity("info");
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

  const handleRefreshAll = () => {
    if (refreshStatus === "running") {
      return;
    }
    if (!enabled || permission !== "granted") {
      setStatusSeverity("error");
      setStatusMessage("Enable local backups before running a full refresh.");
      return;
    }

    const yarnyState = yarnyStore.getState();

    setStatusSeverity("info");
    setStatusMessage(
      "Refreshing local backups. This may take a few minutes; you can continue writing while it completes."
    );
    setRefreshStatus("running", "Refreshing local backups...");

    void (async () => {
      try {
        const result = await refreshAllStoriesToLocal(yarnyState);
        if (result.skipped) {
          setRefreshStatus(
            "error",
            "Local backups must remain enabled to run a full refresh."
          );
        } else if (!result.success) {
          setRefreshStatus(
            "error",
            "Unable to refresh local backups. Check the banner for details."
          );
        }
      } catch (error) {
        console.error("[StorageSettingsSection] Refresh local backups failed", error);
        setRefreshStatus(
          "error",
          "Unexpected error while refreshing local backups."
        );
      }
    })();
  };

  useEffect(() => {
    if (refreshStatus === "running") {
      setStatusSeverity("info");
      setStatusMessage(
        "Refreshing local backups. This may take a few minutes; you can continue writing while it completes."
      );
    } else if (refreshStatus === "success") {
      setStatusSeverity("success");
      const timestamp = refreshCompletedAt
        ? new Date(refreshCompletedAt).toLocaleString()
        : new Date().toLocaleString();
      setStatusMessage(`Local backups refreshed successfully at ${timestamp}.`);
    } else if (refreshStatus === "error") {
      setStatusSeverity("error");
      setStatusMessage(
        refreshMessage ??
          "Unable to refresh local backups. Check the banner for details."
      );
    }
  }, [refreshStatus, refreshMessage, refreshCompletedAt]);

  const showUnsupportedBanner = !isSupported;
  const toggleDisabled = isProcessing || !isSupported;
  const isRefreshRunning = refreshStatus === "running";

  return (
    <Card
      variant="outlined"
      sx={{
        background: "linear-gradient(135deg, rgba(17, 24, 39, 0.95) 0%, rgba(30, 41, 59, 0.92) 100%)",
        borderRadius: 3,
        border: "1px solid rgba(148, 163, 184, 0.25)",
        boxShadow: "0 25px 60px rgba(15, 23, 42, 0.45)",
        color: "rgba(248, 250, 252, 0.96)",
        "& .MuiTypography-root": {
          color: "rgba(241, 245, 249, 0.95)"
        },
        "& .MuiTypography-root.MuiTypography-body2": {
          color: "rgba(203, 213, 225, 0.78)"
        },
        "& .MuiTypography-root.MuiTypography-caption": {
          color: "rgba(148, 163, 184, 0.7)"
        }
      }}
    >
      <CardHeader
        title="Local Story Backups"
        subheader="Mirror Drive saves to a local folder for offline work and testing."
        titleTypographyProps={{
          fontWeight: 700,
          color: "rgba(241, 245, 249, 0.98)"
        }}
        subheaderTypographyProps={{
          sx: { color: "rgba(191, 219, 254, 0.75)" }
        }}
      />
      <CardContent>
        <Stack spacing={3}>
          {showUnsupportedBanner ? (
            <Alert
              severity="warning"
              sx={{
                bgcolor: "rgba(251, 191, 36, 0.15)",
                color: "rgba(254, 243, 199, 0.95)",
                border: "1px solid rgba(251, 191, 36, 0.35)"
              }}
            >
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
              sx={{
                textTransform: "none",
                fontWeight: 600,
                borderRadius: "9999px",
                px: 3,
                bgcolor: "primary.main",
                boxShadow: "0 12px 30px rgba(16, 185, 129, 0.45)",
                "&:hover": {
                  bgcolor: "primary.dark"
                }
              }}
            >
              Choose Folder
            </Button>
            <Button
              variant="outlined"
              onClick={handleOpenFolder}
              disabled={isProcessing || !enabled || permission !== "granted"}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                borderRadius: "9999px",
                px: 3,
                color: "rgba(148, 163, 184, 0.9)",
                borderColor: "rgba(148, 163, 184, 0.4)",
                "&:hover": {
                  borderColor: "rgba(226, 232, 240, 0.95)",
                  color: "rgba(226, 232, 240, 0.95)"
                }
              }}
            >
              Open Folder
            </Button>
            <Button
              color="error"
              variant="text"
              onClick={runDisable}
              disabled={isProcessing || !enabled}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                color: "rgba(248, 113, 113, 0.9)",
                "&:hover": {
                  color: "rgba(252, 165, 165, 1)"
                }
              }}
            >
              Disconnect
            </Button>
            <Button
              variant="text"
              onClick={handleReconnect}
              disabled={isProcessing || !enabled}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                color: "rgba(129, 140, 248, 0.9)",
                "&:hover": {
                  color: "rgba(165, 180, 252, 1)"
                }
              }}
            >
              Reconnect
            </Button>
            <Button
              variant="outlined"
              onClick={handleRefreshAll}
              disabled={isRefreshRunning}
              startIcon={isRefreshRunning ? <CircularProgress size={16} /> : undefined}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                borderRadius: "9999px",
                px: 3,
                color: "rgba(94, 234, 212, 0.95)",
                borderColor: "rgba(94, 234, 212, 0.45)",
                "&:hover": {
                  borderColor: "rgba(94, 234, 212, 0.85)",
                  color: "rgba(125, 248, 225, 1)"
                }
              }}
            >
              Refresh Local Backups
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
            <Alert
              severity={statusSeverity}
              onClose={() => setStatusMessage(null)}
              sx={{
                bgcolor:
                  statusSeverity === "success"
                    ? "rgba(134, 239, 172, 0.15)"
                    : statusSeverity === "error"
                      ? "rgba(248, 113, 113, 0.15)"
                      : "rgba(56, 189, 248, 0.18)",
                color: "rgba(226, 232, 240, 0.95)",
                border: "1px solid rgba(148, 163, 184, 0.35)"
              }}
            >
              {statusMessage}
            </Alert>
          ) : null}

          {error ? (
            <Alert
              severity="error"
              sx={{
                bgcolor: "rgba(248, 113, 113, 0.15)",
                color: "rgba(254, 226, 226, 0.95)",
                border: "1px solid rgba(248, 113, 113, 0.4)"
              }}
            >
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


