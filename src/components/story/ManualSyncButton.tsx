import { Sync } from "@mui/icons-material";
import { Button } from "@mui/material";

import { useManualSync } from "../../hooks/useManualSync";

export function ManualSyncButton() {
  const { sync, isSyncing } = useManualSync();

  const handleSync = async () => {
    try {
      await sync();
    } catch (error) {
      console.error("Manual sync failed:", error);
    }
  };

  return (
    <Button
      onClick={handleSync}
      variant="outlined"
      color="primary"
      size="small"
      startIcon={<Sync />}
      disabled={isSyncing}
    >
      {isSyncing ? "Syncing..." : "Sync Story"}
    </Button>
  );
}



