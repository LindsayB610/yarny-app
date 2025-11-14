import { useCallback, useMemo } from "react";

import {
  useCreateChapterMutation,
  useCreateSnippetMutation,
  useDeleteChapterMutation,
  useDeleteSnippetMutation,
  useDuplicateChapterMutation,
  useDuplicateSnippetMutation,
  useMoveSnippetToChapterMutation,
  useRenameChapterMutation,
  useRenameSnippetMutation,
  useReorderChaptersMutation,
  useReorderSnippetsMutation,
  useUpdateChapterColorMutation
} from "../../../hooks/useStoryMutations";
import type { useYarnyStore } from "../../../store/provider";
import type { selectActiveStoryChapters } from "../../../store/selectors";
import type { Snippet } from "../../../store/types";

export function useSidebarHandlers(
  setCollapsedChapters: React.Dispatch<React.SetStateAction<Set<string>>>,
  setLastCreatedChapterId: React.Dispatch<React.SetStateAction<string | null>>,
  setColorPickerState: React.Dispatch<React.SetStateAction<{
    chapterId: string;
    anchorEl: HTMLElement | null;
  } | null>>,
  colorPickerState: {
    chapterId: string;
    anchorEl: HTMLElement | null;
  } | null,
  closeContextMenu: () => void,
  setRenameDialog: React.Dispatch<React.SetStateAction<{
    type: "chapter" | "snippet" | null;
    id: string | null;
    currentName: string;
  }>>,
  setMoveSnippetDialog: React.Dispatch<React.SetStateAction<{
    open: boolean;
    snippetId: string | null;
    currentChapterId: string | null;
  }>>,
  setDeleteDialog: React.Dispatch<React.SetStateAction<{
    open: boolean;
    type: "chapter" | "snippet" | null;
    id: string | null;
    name: string;
  }>>,
  snippetsById: Record<string, Snippet>,
  chapters: ReturnType<typeof useYarnyStore<typeof selectActiveStoryChapters>>
) {
  const createChapterMutation = useCreateChapterMutation();
  const createSnippetMutation = useCreateSnippetMutation();
  const duplicateChapterMutation = useDuplicateChapterMutation();
  const duplicateSnippetMutation = useDuplicateSnippetMutation();
  const deleteChapterMutation = useDeleteChapterMutation();
  const deleteSnippetMutation = useDeleteSnippetMutation();
  const reorderChaptersMutation = useReorderChaptersMutation();
  const reorderSnippetsMutation = useReorderSnippetsMutation();
  const moveSnippetMutation = useMoveSnippetToChapterMutation();
  const renameChapterMutation = useRenameChapterMutation();
  const renameSnippetMutation = useRenameSnippetMutation();
  const updateChapterColorMutation = useUpdateChapterColorMutation();

  const handleChapterReorder = useCallback((newOrder: string[]) => {
    reorderChaptersMutation.mutate(newOrder);
  }, [reorderChaptersMutation]);

  const handleSnippetReorder = useCallback((chapterId: string) => (newOrder: string[]) => {
    reorderSnippetsMutation.mutate({ chapterId, newOrder });
  }, [reorderSnippetsMutation]);

  const handleSnippetMoveToChapter = useCallback((snippetId: string, targetChapterId: string) => {
    moveSnippetMutation.mutate({ snippetId, targetChapterId });
  }, [moveSnippetMutation]);

  const openChapterColorPicker = useCallback((chapterId: string, anchorEl: HTMLElement | null) => {
    setColorPickerState({
      chapterId,
      anchorEl
    });
  }, [setColorPickerState]);

  const handleCloseColorPicker = useCallback(() => {
    setColorPickerState(null);
  }, [setColorPickerState]);

  const handleColorSelect = useCallback((color: string) => {
    if (!colorPickerState) {
      return;
    }
    updateChapterColorMutation.mutate({
      chapterId: colorPickerState.chapterId,
      color
    });
  }, [colorPickerState, updateChapterColorMutation]);

  const handleCreateChapter = useCallback(async () => {
    try {
      const newChapter = await createChapterMutation.mutateAsync({});
      if (newChapter?.id) {
        setLastCreatedChapterId(newChapter.id);
        setCollapsedChapters((prev) => {
          const next = new Set(prev);
          next.delete(newChapter.id);
          return next;
        });
      }
    } catch (error) {
      console.error("Failed to create chapter:", error);
    }
  }, [createChapterMutation, setLastCreatedChapterId, setCollapsedChapters]);

  const handleAddSnippet = useCallback(
    async (chapterId: string) => {
      try {
        await createSnippetMutation.mutateAsync({ chapterId });
      } catch (error) {
        console.error("Failed to create snippet:", error);
      }
    },
    [createSnippetMutation]
  );

  const handleDuplicateChapter = useCallback(
    async (chapterId: string) => {
      closeContextMenu();
      try {
        const newChapterId = await duplicateChapterMutation.mutateAsync({ chapterId });
        if (newChapterId) {
          setCollapsedChapters((prev) => {
            const next = new Set(prev);
            next.delete(newChapterId);
            return next;
          });
        }
      } catch (error) {
        console.error("Failed to duplicate chapter:", error);
      }
    },
    [closeContextMenu, duplicateChapterMutation, setCollapsedChapters]
  );

  const handleDuplicateSnippet = useCallback(
    async (snippetId: string) => {
      closeContextMenu();
      try {
        await duplicateSnippetMutation.mutateAsync({ snippetId });
      } catch (error) {
        console.error("Failed to duplicate snippet:", error);
      }
    },
    [closeContextMenu, duplicateSnippetMutation]
  );

  const handleMoveSnippetDialogClose = useCallback(() => {
    setMoveSnippetDialog({
      open: false,
      snippetId: null,
      currentChapterId: null
    });
  }, [setMoveSnippetDialog]);

  const openMoveSnippetDialog = useCallback(
    (snippetId: string) => {
      closeContextMenu();
      const snippet = snippetsById[snippetId];
      setMoveSnippetDialog({
        open: true,
        snippetId,
        currentChapterId: snippet?.chapterId ?? null
      });
    },
    [closeContextMenu, snippetsById, setMoveSnippetDialog]
  );

  const handleMoveSnippetConfirm = useCallback(
    async (targetChapterId: string, moveSnippetDialog: { snippetId: string | null }) => {
      if (!moveSnippetDialog.snippetId) {
        return;
      }

      try {
        await moveSnippetMutation.mutateAsync({
          snippetId: moveSnippetDialog.snippetId,
          targetChapterId
        });
        handleMoveSnippetDialogClose();
      } catch (error) {
        console.error("Failed to move snippet:", error);
      }
    },
    [handleMoveSnippetDialogClose, moveSnippetMutation]
  );

  const openDeleteDialog = useCallback(
    (type: "chapter" | "snippet", id: string) => {
      closeContextMenu();
      const name =
        type === "chapter"
          ? chapters.find((chapter) => chapter.id === id)?.title ?? "Untitled Chapter"
          : (() => {
              const snippet = snippetsById[id];
              const content = snippet?.content ?? "";
              return content.split("\n")[0] || "Untitled Snippet";
            })();
      setDeleteDialog({
        open: true,
        type,
        id,
        name
      });
    },
    [chapters, closeContextMenu, snippetsById, setDeleteDialog]
  );

  const handleDeleteCancel = useCallback(() => {
    setDeleteDialog({
      open: false,
      type: null,
      id: null,
      name: ""
    });
  }, [setDeleteDialog]);

  const handleDeleteConfirm = useCallback(
    async (deleteDialog: { type: "chapter" | "snippet" | null; id: string | null }) => {
      if (!deleteDialog.type || !deleteDialog.id) {
        return;
      }

      try {
        if (deleteDialog.type === "chapter") {
          await deleteChapterMutation.mutateAsync(deleteDialog.id);
          setCollapsedChapters((prev) => {
            const next = new Set(prev);
            next.delete(deleteDialog.id as string);
            return next;
          });
        } else {
          await deleteSnippetMutation.mutateAsync(deleteDialog.id);
        }
      } catch (error) {
        console.error("Failed to delete item:", error);
      } finally {
        setDeleteDialog({
          open: false,
          type: null,
          id: null,
          name: ""
        });
      }
    },
    [deleteChapterMutation, deleteSnippetMutation, setCollapsedChapters, setDeleteDialog]
  );

  const handleChapterMenuOpen = useCallback((chapterId: string, event: React.MouseEvent<HTMLElement>, setContextMenu: React.Dispatch<React.SetStateAction<{
    type: "chapter" | "snippet" | null;
    id: string | null;
    anchorEl: HTMLElement | null;
  }>>) => {
    event.stopPropagation();
    setContextMenu({
      type: "chapter",
      id: chapterId,
      anchorEl: event.currentTarget
    });
  }, []);

  const handleSnippetMenuOpen = useCallback((snippetId: string, event: React.MouseEvent<HTMLElement>, setContextMenu: React.Dispatch<React.SetStateAction<{
    type: "chapter" | "snippet" | null;
    id: string | null;
    anchorEl: HTMLElement | null;
  }>>) => {
    event.stopPropagation();
    setContextMenu({
      type: "snippet",
      id: snippetId,
      anchorEl: event.currentTarget
    });
  }, []);

  const handleRenameClose = useCallback(() => {
    setRenameDialog({
      type: null,
      id: null,
      currentName: ""
    });
  }, [setRenameDialog]);

  const openRenameDialog = useCallback(
    (type: "chapter" | "snippet", id: string) => {
      closeContextMenu();

      if (type === "chapter") {
        const chapter = chapters.find((item) => item.id === id);
        setRenameDialog({
          type,
          id,
          currentName: chapter?.title ?? "Untitled Chapter"
        });
      } else {
        const snippet = snippetsById[id];
        const content = snippet?.content ?? "";
        const firstLine = content.split("\n")[0] || "Untitled Snippet";
        setRenameDialog({
          type,
          id,
          currentName: firstLine
        });
      }
    },
    [chapters, closeContextMenu, snippetsById, setRenameDialog]
  );

  const handleRenameSubmit = useCallback(
    async (newName: string, renameDialog: {
      type: "chapter" | "snippet" | null;
      id: string | null;
    }) => {
      if (!renameDialog.type || !renameDialog.id) {
        return;
      }

      try {
        if (renameDialog.type === "chapter") {
          await renameChapterMutation.mutateAsync({
            chapterId: renameDialog.id,
            title: newName
          });
        } else {
          const snippet = snippetsById[renameDialog.id];
          if (!snippet) {
            throw new Error("Snippet not found for rename");
          }
          await renameSnippetMutation.mutateAsync({
            snippetId: renameDialog.id,
            chapterId: snippet.chapterId,
            title: newName
          });
        }
      } catch (error) {
        console.error("Failed to rename item:", error);
      } finally {
        handleRenameClose();
      }
    },
    [handleRenameClose, renameChapterMutation, renameSnippetMutation, snippetsById]
  );

  const activeChapterForPicker = useMemo(() => {
    if (!colorPickerState) {
      return null;
    }
    return chapters.find((chapter) => chapter.id === colorPickerState.chapterId) ?? null;
  }, [chapters, colorPickerState]);

  return {
    handleChapterReorder,
    handleSnippetReorder,
    handleSnippetMoveToChapter,
    openChapterColorPicker,
    handleCloseColorPicker,
    handleColorSelect,
    handleCreateChapter,
    handleAddSnippet,
    handleDuplicateChapter,
    handleDuplicateSnippet,
    handleMoveSnippetDialogClose,
    openMoveSnippetDialog,
    handleMoveSnippetConfirm,
    openDeleteDialog,
    handleDeleteCancel,
    handleDeleteConfirm,
    handleChapterMenuOpen,
    handleSnippetMenuOpen,
    handleRenameClose,
    openRenameDialog,
    handleRenameSubmit,
    activeChapterForPicker,
    isCreatingChapter: createChapterMutation.isPending,
    isCreatingSnippet: createSnippetMutation.isPending,
    isDuplicatingChapter: duplicateChapterMutation.isPending,
    isDuplicatingSnippet: duplicateSnippetMutation.isPending,
    isDeletingChapter: deleteChapterMutation.isPending,
    isDeletingSnippet: deleteSnippetMutation.isPending,
    isMovingSnippet: moveSnippetMutation.isPending
  };
}

