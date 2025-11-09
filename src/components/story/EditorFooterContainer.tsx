import { CloudUpload, SaveAlt } from "@mui/icons-material";
import { Menu, MenuItem, Box } from "@mui/material";
import { useState, type MouseEvent, type JSX } from "react";

import { EditorFooter } from "./EditorFooter";
import { ExportProgressDialog } from "./ExportProgressDialog";
import { useExport } from "../../hooks/useExport";
import { useLocalBackups } from "../../hooks/useLocalBackups";
import { useAuth } from "../../hooks/useAuth";
import { useYarnyStore } from "../../store/provider";
import {
  selectActiveStory,
  selectActiveStorySnippets
} from "../../store/selectors";

type ExportDestination = "drive" | "local";

export function EditorFooterContainer(): JSX.Element {
  const story = useYarnyStore(selectActiveStory);
  const snippets = useYarnyStore(selectActiveStorySnippets);
  const { logout, isLoading: isAuthLoading } = useAuth();

  const [exportMenuAnchor, setExportMenuAnchor] =
    useState<HTMLElement | null>(null);
  const [exportProgress, setExportProgress] = useState<{
    open: boolean;
    fileName: string;
    destination: ExportDestination;
  }>({ open: false, fileName: "", destination: "drive" });

  const {
    exportSnippets: exportSnippetsFromHook,
    isExporting,
    progress: exportProgressState
  } = useExport();

  const localBackups = useLocalBackups();
  const canExportLocally =
    localBackups.enabled && localBackups.permission === "granted";

  const handleExportClick = (event: MouseEvent<HTMLButtonElement>) => {
    setExportMenuAnchor(event.currentTarget);
  };

  const handleExportClose = () => {
    setExportMenuAnchor(null);
  };

  const buildSnippetsForExport = () =>
    snippets.map((snippet, index) => ({
      id: snippet.id,
      title: `Snippet ${index + 1}`,
      content: snippet.content
    }));

  const handleExport = async (destination: ExportDestination) => {
    if (!story) {
      return;
    }

    const isLocal = destination === "local";
    if (isLocal && !canExportLocally) {
      alert("Enable local backups in Settings to export locally.");
      return;
    }

    const defaultFileName = `${story.title} - Chapters`;
    const promptLabel = isLocal
      ? "Enter filename for local export:"
      : "Enter filename for export:";
    const fileName = prompt(promptLabel, defaultFileName);
    if (!fileName) return;

    setExportProgress({ open: true, fileName, destination });

    try {
      const snippetsForExport = buildSnippetsForExport();
      await exportSnippetsFromHook({
        fileName,
        snippets: snippetsForExport,
        destination,
        parentFolderId: !isLocal ? story.driveFileId : undefined,
        fileExtension: isLocal ? ".md" : undefined,
        onProgress: () => {
          setExportProgress((prev) => ({ ...prev }));
        }
      });

      setTimeout(() => {
        setExportProgress((prev) => ({ ...prev, open: false }));
      }, 1500);
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  return (
    <Box sx={{ width: "100%" }}>
      <EditorFooter
        onExportClick={handleExportClick}
        exportDisabled={snippets.length === 0}
        isExporting={isExporting}
        isExportMenuOpen={Boolean(exportMenuAnchor)}
        onLogout={logout}
        isLogoutDisabled={isAuthLoading}
      />

      <Menu
        id="editor-export-menu"
        anchorEl={exportMenuAnchor}
        open={Boolean(exportMenuAnchor)}
        onClose={handleExportClose}
        MenuListProps={{ "aria-labelledby": "editor-export-button" }}
      >
        <MenuItem
          onClick={() => {
            handleExportClose();
            void handleExport("drive");
          }}
          disabled={isExporting || !story}
        >
          <CloudUpload sx={{ mr: 1 }} />
          Export Chapters
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleExportClose();
            void handleExport("local");
          }}
          disabled={isExporting || !story || !canExportLocally}
        >
          <SaveAlt sx={{ mr: 1 }} />
          Export Chapters to Local
        </MenuItem>
      </Menu>

      <ExportProgressDialog
        open={exportProgress.open}
        progress={
          exportProgress.open
            ? {
                ...exportProgressState,
                destination: exportProgress.destination
              }
            : exportProgressState
        }
        fileName={exportProgress.fileName}
      />
    </Box>
  );
}


