import { Suspense, useEffect, useState } from "react";
import type { JSX } from "react";
import { RouterProvider } from "react-router-dom";

import { AppProviders } from "./providers/AppProviders";
import { router } from "./routes";
import { ErrorBoundary } from "../components/errors/ErrorBoundary";
import { RouteLoader } from "../components/loading/RouteLoader";
import { MigrationProgressDialog } from "../components/migration/MigrationProgressDialog";
import {
  migrateStoriesToJson,
  isMigrationComplete,
  type MigrationProgress
} from "../services/migration";

export function App(): JSX.Element {
  const [migrationProgress, setMigrationProgress] = useState<MigrationProgress | null>(null);
  const [showMigrationDialog, setShowMigrationDialog] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.sessionStorage.removeItem("yarny_chunk_reload_attempted");
    } catch {
      // Ignore storage access errors (e.g. privacy mode)
    }

    // Run one-time migration if not already complete
    const runMigration = async () => {
      if (!isMigrationComplete()) {
        setShowMigrationDialog(true);
        try {
          const progress = await migrateStoriesToJson({
            onProgress: (p) => setMigrationProgress(p)
          });
          setMigrationProgress(progress);
          // Close dialog after a short delay
          setTimeout(() => {
            setShowMigrationDialog(false);
          }, 1000);
        } catch (error) {
          console.error("Migration failed:", error);
          setShowMigrationDialog(false);
        }
      }
    };

    // Run migration after a short delay to let app initialize
    const timeoutId = setTimeout(runMigration, 2000);
    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <AppProviders>
      <ErrorBoundary>
        <Suspense fallback={<RouteLoader />}>
          <RouterProvider router={router} />
        </Suspense>
        {showMigrationDialog && migrationProgress && (
          <MigrationProgressDialog open={showMigrationDialog} progress={migrationProgress} />
        )}
      </ErrorBoundary>
    </AppProviders>
  );
}

