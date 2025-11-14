import { useState, useCallback } from "react";

export function useSidebarState() {
  const [collapsedChapters, setCollapsedChapters] = useState<Set<string>>(new Set());
  const [lastCreatedChapterId, setLastCreatedChapterId] = useState<string | null>(null);
  const [colorPickerState, setColorPickerState] = useState<{
    chapterId: string;
    anchorEl: HTMLElement | null;
  } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    type: "chapter" | "snippet" | null;
    id: string | null;
    anchorEl: HTMLElement | null;
  }>({
    type: null,
    id: null,
    anchorEl: null
  });
  const [renameDialog, setRenameDialog] = useState<{
    type: "chapter" | "snippet" | null;
    id: string | null;
    currentName: string;
  }>({
    type: null,
    id: null,
    currentName: ""
  });
  const [moveSnippetDialog, setMoveSnippetDialog] = useState<{
    open: boolean;
    snippetId: string | null;
    currentChapterId: string | null;
  }>({
    open: false,
    snippetId: null,
    currentChapterId: null
  });
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    type: "chapter" | "snippet" | null;
    id: string | null;
    name: string;
  }>({
    open: false,
    type: null,
    id: null,
    name: ""
  });

  const closeContextMenu = useCallback(() => {
    setContextMenu({
      type: null,
      id: null,
      anchorEl: null
    });
  }, []);

  return {
    collapsedChapters,
    setCollapsedChapters,
    lastCreatedChapterId,
    setLastCreatedChapterId,
    colorPickerState,
    setColorPickerState,
    contextMenu,
    setContextMenu,
    closeContextMenu,
    renameDialog,
    setRenameDialog,
    moveSnippetDialog,
    setMoveSnippetDialog,
    deleteDialog,
    setDeleteDialog
  };
}

