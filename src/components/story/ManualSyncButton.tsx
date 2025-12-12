import { Sync } from "@mui/icons-material";
import { Button } from "@mui/material";

import { useActiveStory } from "../../hooks/useActiveStory";
import { useManualSync } from "../../hooks/useManualSync";

export function ManualSyncButton() {
  const story = useActiveStory();
  const { sync, isSyncing } = useManualSync();

  const handleSync = async () => {
    if (!story) {
      console.warn("Manual sync skipped: No active story");
      return;
    }
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
      disabled={isSyncing || !story}
    >
      {isSyncing ? "Syncing..." : "Sync Story"}
    </Button>
  );
}




