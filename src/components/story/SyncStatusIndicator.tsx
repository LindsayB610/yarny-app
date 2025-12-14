import { CheckCircle, Error, Sync } from "@mui/icons-material";
import { Box, Chip, Tooltip } from "@mui/material";
import { useMemo } from "react";

export type SyncStatus = "synced" | "syncing" | "failed" | "pending";

interface SyncStatusIndicatorProps {
  status: SyncStatus;
  lastSyncedAt?: string;
  errorMessage?: string;
  onRetry?: () => void;
}

export function SyncStatusIndicator({
  status,
  lastSyncedAt,
  errorMessage,
  onRetry
}: SyncStatusIndicatorProps) {
  const statusConfig = useMemo(() => {
    switch (status) {
      case "synced":
        return {
          icon: <CheckCircle fontSize="small" />,
          label: "Synced",
          color: "success" as const,
          tooltip: lastSyncedAt
            ? `Synced at ${new Date(lastSyncedAt).toLocaleTimeString()}`
            : "All changes synced to Google Docs"
        };
      case "syncing":
        return {
          icon: <Sync fontSize="small" sx={{ animation: "spin 1s linear infinite" }} />,
          label: "Syncing...",
          color: "info" as const,
          tooltip: "Syncing changes to Google Docs"
        };
      case "failed":
        return {
          icon: <Error fontSize="small" />,
          label: "Sync failed",
          color: "error" as const,
          tooltip: errorMessage ?? "Failed to sync changes. Click to retry."
        };
      case "pending":
        return {
          icon: <Sync fontSize="small" />,
          label: "Pending",
          color: "default" as const,
          tooltip: "Changes queued for sync"
        };
      default:
        return {
          icon: <Sync fontSize="small" />,
          label: "Unknown",
          color: "default" as const,
          tooltip: "Sync status unknown"
        };
    }
  }, [status, lastSyncedAt, errorMessage]);

  return (
    <Box
      sx={{
        "@keyframes spin": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" }
        }
      }}
    >
      <Tooltip title={statusConfig.tooltip}>
        <Chip
          icon={statusConfig.icon}
          label={statusConfig.label}
          color={statusConfig.color}
          size="small"
          variant="outlined"
          onClick={status === "failed" && onRetry ? onRetry : undefined}
          sx={{
            cursor: status === "failed" && onRetry ? "pointer" : "default",
            "& .MuiChip-icon": {
              animation: status === "syncing" ? "spin 1s linear infinite" : undefined
            }
          }}
        />
      </Tooltip>
    </Box>
  );
}


