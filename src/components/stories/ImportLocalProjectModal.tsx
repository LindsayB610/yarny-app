import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography
} from "@mui/material";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import { requestDirectoryHandle } from "../../services/localFs/LocalFsCapability";
import { importLocalProject } from "../../services/localFileStorage/importLocalProject";
import { useYarnyStore } from "../../store/provider";

interface ImportLocalProjectModalProps {
  open: boolean;
  onClose: () => void;
}

export function ImportLocalProjectModal({
  open,
  onClose
}: ImportLocalProjectModalProps): JSX.Element {
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedHandle, setSelectedHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const upsertEntities = useYarnyStore((state) => state.upsertEntities);
  const selectProject = useYarnyStore((state) => state.selectProject);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const handleSelectDirectory = async () => {
    setError(null);
    setSelectedHandle(null);

    try {
      console.log("[ImportLocalProject] Requesting directory handle...");
      const handle = await requestDirectoryHandle();
      if (!handle) {
        console.log("[ImportLocalProject] User cancelled directory selection");
        // User cancelled
        return;
      }

      console.log("[ImportLocalProject] Directory selected:", handle.name);
      setSelectedHandle(handle);
    } catch (err) {
      console.error("[ImportLocalProject] Directory selection error:", err);
      setError(err instanceof Error ? err.message : "Failed to select directory");
    }
  };

  const handleImport = async () => {
    if (!selectedHandle) {
      setError("Please select a directory first");
      return;
    }

    setError(null);
    setIsImporting(true);

    try {
      console.log("[ImportLocalProject] Starting import...");
      
      // Import the project
      const normalized = await importLocalProject(selectedHandle);
      console.log("[ImportLocalProject] Import completed:", normalized);
      
      // Update store with imported project
      upsertEntities(normalized);
      console.log("[ImportLocalProject] Store updated");

      // Select the imported project so it shows in the UI
      if (normalized.projects && normalized.projects.length > 0) {
        const projectId = normalized.projects[0].id;
        selectProject(projectId);
        console.log("[ImportLocalProject] Project selected:", projectId);
      }

      // Invalidate queries to refresh the UI
      await queryClient.invalidateQueries({ queryKey: ["drive", "projects"] });
      await queryClient.invalidateQueries({ queryKey: ["drive", "stories"] });
      console.log("[ImportLocalProject] Queries invalidated");

      // Navigate to the imported story
      if (normalized.stories && normalized.stories.length > 0) {
        const storyId = normalized.stories[0].id;
        console.log("[ImportLocalProject] Navigating to story:", storyId);
        navigate(`/stories/${storyId}/snippets`);
      } else {
        console.warn("[ImportLocalProject] No stories in normalized payload");
      }

      handleClose();
    } catch (err) {
      console.error("[ImportLocalProject] Import failed:", err);
      setError(err instanceof Error ? err.message : "Failed to import project");
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setSelectedHandle(null);
    setIsImporting(false);
    onClose();
  };

  // Check if File System Access API is supported
  const isSupported =
    typeof window !== "undefined" &&
    typeof window.showDirectoryPicker === "function";

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: "rgba(31, 41, 55, 0.95)",
          backdropFilter: "blur(10px)",
          color: "white"
        }
      }}
    >
      <DialogTitle sx={{ color: "white", fontWeight: 600 }}>
        Import Local Project
      </DialogTitle>
      <DialogContent>
        {!isSupported && (
          <Box
            sx={{
              bgcolor: "rgba(239, 68, 68, 0.2)",
              color: "rgba(255, 255, 255, 0.9)",
              p: 2,
              borderRadius: 2,
              mb: 2,
              borderLeft: "4px solid",
              borderColor: "error.main"
            }}
          >
            <Typography variant="body2">
              File System Access API is not supported in this browser. Please use
              a Chromium-based browser (Chrome, Edge, etc.) to import local
              projects.
            </Typography>
          </Box>
        )}

        <Typography
          variant="body1"
          sx={{ color: "rgba(255, 255, 255, 0.9)", mb: 3 }}
        >
          Select a local directory containing your novel project. Yarny will scan
          the <code>drafts/</code> folder for chapters and snippets.
        </Typography>

        {error && (
          <Box
            sx={{
              bgcolor: "rgba(239, 68, 68, 0.2)",
              color: "rgba(255, 255, 255, 0.9)",
              p: 2,
              borderRadius: 2,
              mb: 2,
              borderLeft: "4px solid",
              borderColor: "error.main"
            }}
          >
            {error}
          </Box>
        )}

        {selectedHandle && (
          <Box
            sx={{
              bgcolor: "rgba(59, 130, 246, 0.2)",
              color: "rgba(255, 255, 255, 0.9)",
              p: 2,
              borderRadius: 2,
              mb: 2,
              borderLeft: "4px solid",
              borderColor: "primary.main"
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
              Selected:
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
              {selectedHandle.name}
            </Typography>
            <Typography variant="caption" sx={{ display: "block", mt: 1, opacity: 0.7 }}>
              Ready to import. Click "Import" to continue.
            </Typography>
          </Box>
        )}

        <Box sx={{ display: "flex", gap: 2, flexDirection: "column" }}>
          <Button
            variant="outlined"
            onClick={handleSelectDirectory}
            disabled={!isSupported || isImporting}
            fullWidth
            sx={{
              color: "white",
              borderColor: "rgba(255, 255, 255, 0.3)",
              "&:hover": {
                borderColor: "rgba(255, 255, 255, 0.5)",
                bgcolor: "rgba(255, 255, 255, 0.1)"
              }
            }}
          >
            {selectedHandle ? "Change Directory" : "Select Directory"}
          </Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isImporting} sx={{ color: "white" }}>
          Cancel
        </Button>
        <Button
          onClick={handleImport}
          disabled={!isSupported || !selectedHandle || isImporting}
          variant="contained"
          sx={{
            bgcolor: "primary.main",
            "&:hover": {
              bgcolor: "primary.dark"
            },
            "&:disabled": {
              bgcolor: "rgba(255, 255, 255, 0.1)",
              color: "rgba(255, 255, 255, 0.3)"
            }
          }}
          title={
            !isSupported
              ? "File System Access API not supported"
              : !selectedHandle
                ? "Please select a directory first"
                : ""
          }
        >
          {isImporting ? "Importing..." : "Import"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

