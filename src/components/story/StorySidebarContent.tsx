import { Add, ExpandMore, ChevronRight, Description, MoreVert } from "@mui/icons-material";
import {
  Box,
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Typography
} from "@mui/material";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import { useState, useRef, useEffect, useCallback, useMemo, type JSX, type MouseEvent } from "react";

import { ColorPicker } from "./ColorPicker";
import { SortableChapterList, type Chapter as SortableChapter } from "./SortableChapterList";
import { SortableSnippetList, type Snippet as SortableSnippet } from "./SortableSnippetList";
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
} from "../../hooks/useStoryMutations";
import { useVisibilityGatedSnippetQueries } from "../../hooks/useVisibilityGatedQueries";
import { useYarnyStore } from "../../store/provider";
import {
  selectActiveStory,
  selectActiveStoryChapters,
  selectActiveStorySnippets,
  selectSnippetsForChapter
} from "../../store/selectors";
import {
  darkenColor,
  getReadableTextColor,
  getSoftVariant
} from "../../utils/contrastChecker";
import { normalizePlainText } from "../../editor/textExtraction";
import { ContextMenu, type ContextMenuAction } from "./ContextMenu";
import { RenameModal } from "./RenameModal";

interface StorySidebarContentProps {
  searchTerm: string;
  onSnippetClick?: (snippetId: string) => void;
  activeSnippetId?: string;
}

export function StorySidebarContent({
  searchTerm,
  onSnippetClick,
  activeSnippetId
}: StorySidebarContentProps): JSX.Element {
  const story = useYarnyStore(selectActiveStory);
  const chapters = useYarnyStore(selectActiveStoryChapters);
  const allSnippets = useYarnyStore(selectActiveStorySnippets);
  const snippetsById = useYarnyStore((state) => state.entities.snippets);
  const upsertEntities = useYarnyStore((state) => state.upsertEntities);
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
  const closeContextMenu = useCallback(() => {
    setContextMenu({
      type: null,
      id: null,
      anchorEl: null
    });
  }, []);
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

  // Mutations
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
  const { isPending: isCreatingChapter } = createChapterMutation;
  const { isPending: isCreatingSnippet } = createSnippetMutation;
  const { isPending: isDuplicatingChapter } = duplicateChapterMutation;
  const { isPending: isDuplicatingSnippet } = duplicateSnippetMutation;
  const { isPending: isDeletingChapter } = deleteChapterMutation;
  const { isPending: isDeletingSnippet } = deleteSnippetMutation;
  const { isPending: isMovingSnippet } = moveSnippetMutation;

  // Build fileIds map for visibility gating
  const snippetIds = useMemo(() => allSnippets.map((s) => s.id), [allSnippets]);
  const fileIdsMap: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {};
    allSnippets.forEach((snippet) => {
      if (snippet.driveFileId) {
        map[snippet.id] = snippet.driveFileId;
      }
    });
    return map;
  }, [allSnippets]);

  // Visibility gating for snippet loading
  const { registerElement, queries } = useVisibilityGatedSnippetQueries(
    snippetIds,
    fileIdsMap,
    Boolean(story && snippetIds.length > 0)
  );

  useEffect(() => {
    if (!story?.id || typeof window === "undefined") {
      return;
    }

    try {
      const key = `yarny_collapsed_${story.id}`;
      const saved = window.localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        setCollapsedChapters(new Set(parsed));
      } else {
        setCollapsedChapters(new Set());
      }
    } catch (error) {
      console.warn("Failed to load collapsed chapters", error);
    }
  }, [story?.id]);

  const persistCollapsedState = useCallback(
    (next: Set<string>) => {
      if (!story?.id || typeof window === "undefined") {
        return;
      }

      try {
        const key = `yarny_collapsed_${story.id}`;
        window.localStorage.setItem(key, JSON.stringify(Array.from(next)));
      } catch (error) {
        console.warn("Failed to persist collapsed chapters", error);
      }
    },
    [story?.id]
  );

  useEffect(() => {
    queries.forEach((query, index) => {
      const snippetId = snippetIds[index];
      const snippetData = query.data;
      if (!snippetId || !snippetData?.content) {
        return;
      }

      const existingSnippet = snippetsById[snippetId];
      if (!existingSnippet) {
        return;
      }

      const normalizedContent = normalizePlainText(snippetData.content);
      if (existingSnippet.content === normalizedContent) {
        return;
      }

      upsertEntities({
        snippets: [
          {
            ...existingSnippet,
            content: normalizedContent,
            updatedAt: snippetData.modifiedTime ?? existingSnippet.updatedAt
          }
        ]
      });
    });
  }, [queries, snippetIds, snippetsById, upsertEntities]);

  const toggleChapterCollapse = useCallback((chapterId: string) => {
    setCollapsedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(chapterId)) {
        next.delete(chapterId);
      } else {
        next.add(chapterId);
      }
      persistCollapsedState(next);
      return next;
    });
  }, [persistCollapsedState]);

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
  }, []);

  const handleCloseColorPicker = useCallback(() => {
    setColorPickerState(null);
  }, []);

  const handleColorSelect = useCallback((color: string) => {
    if (!colorPickerState) {
      return;
    }
    updateChapterColorMutation.mutate({
      chapterId: colorPickerState.chapterId,
      color
    });
  }, [colorPickerState, updateChapterColorMutation]);

  const activeChapterForPicker = useMemo(() => {
    if (!colorPickerState) {
      return null;
    }
    return chapters.find((chapter) => chapter.id === colorPickerState.chapterId) ?? null;
  }, [chapters, colorPickerState]);

  const handleCreateChapter = useCallback(async () => {
    try {
      const newChapter = await createChapterMutation.mutateAsync({});
      if (newChapter?.id) {
        setLastCreatedChapterId(newChapter.id);
        setCollapsedChapters((prev) => {
          const next = new Set(prev);
          next.delete(newChapter.id);
          persistCollapsedState(next);
          return next;
        });
      }
    } catch (error) {
      console.error("Failed to create chapter:", error);
    }
  }, [createChapterMutation, persistCollapsedState]);

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
            persistCollapsedState(next);
            return next;
          });
        }
      } catch (error) {
        console.error("Failed to duplicate chapter:", error);
      }
    },
    [closeContextMenu, duplicateChapterMutation, persistCollapsedState, setCollapsedChapters]
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
  }, []);

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
    [closeContextMenu, snippetsById]
  );

  const handleMoveSnippetConfirm = useCallback(
    async (targetChapterId: string) => {
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
    [handleMoveSnippetDialogClose, moveSnippetDialog.snippetId, moveSnippetMutation]
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
    [chapters, closeContextMenu, snippetsById]
  );

  const handleDeleteCancel = useCallback(() => {
    setDeleteDialog({
      open: false,
      type: null,
      id: null,
      name: ""
    });
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteDialog.type || !deleteDialog.id) {
      return;
    }

    try {
      if (deleteDialog.type === "chapter") {
        await deleteChapterMutation.mutateAsync(deleteDialog.id);
        setCollapsedChapters((prev) => {
          const next = new Set(prev);
          next.delete(deleteDialog.id as string);
          persistCollapsedState(next);
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
  }, [
    deleteChapterMutation,
    deleteDialog,
    deleteSnippetMutation,
    persistCollapsedState,
    setCollapsedChapters
  ]);

  const deleteInProgress =
    deleteDialog.type === "chapter" ? isDeletingChapter : isDeletingSnippet;

  const handleChapterMenuOpen = useCallback((chapterId: string, event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setContextMenu({
      type: "chapter",
      id: chapterId,
      anchorEl: event.currentTarget
    });
  }, []);

  const handleSnippetMenuOpen = useCallback((snippetId: string, event: MouseEvent<HTMLElement>) => {
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
  }, []);

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
    [chapters, closeContextMenu, snippetsById]
  );

  const handleRenameSubmit = useCallback(
    async (newName: string) => {
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
    [handleRenameClose, renameChapterMutation, renameDialog, renameSnippetMutation, snippetsById]
  );

  const contextMenuActions: ContextMenuAction[] = useMemo(() => {
    if (!contextMenu.type || !contextMenu.id) {
      return [];
    }

    if (contextMenu.type === "chapter") {
      return [
        {
          label: "Rename Chapter",
          onClick: () => openRenameDialog("chapter", contextMenu.id)
        },
        {
          label: "Choose Color",
          onClick: () => {
            if (!contextMenu.id) {
              return;
            }
            openChapterColorPicker(contextMenu.id, contextMenu.anchorEl);
          }
        },
        {
          label: "Duplicate Chapter",
          onClick: () => handleDuplicateChapter(contextMenu.id),
          disabled: isDuplicatingChapter
        },
        {
          label: "Delete Chapter",
          onClick: () => openDeleteDialog("chapter", contextMenu.id),
          disabled: isDeletingChapter
        }
      ];
    }

    const canMoveSnippet = chapters.length > 1;

    return [
      {
        label: "Rename Snippet",
        onClick: () => openRenameDialog("snippet", contextMenu.id)
      },
      {
        label: "Duplicate Snippet",
        onClick: () => handleDuplicateSnippet(contextMenu.id),
        disabled: isDuplicatingSnippet
      },
      {
        label: "Move to Chapter…",
        onClick: () => openMoveSnippetDialog(contextMenu.id),
        disabled: !canMoveSnippet || isMovingSnippet
      },
      {
        label: "Delete Snippet",
        onClick: () => openDeleteDialog("snippet", contextMenu.id),
        disabled: isDeletingSnippet
      }
    ];
  }, [
    chapters,
    contextMenu,
    handleDuplicateChapter,
    handleDuplicateSnippet,
    isDeletingChapter,
    isDeletingSnippet,
    isDuplicatingChapter,
    isDuplicatingSnippet,
    isMovingSnippet,
    openDeleteDialog,
    openChapterColorPicker,
    openMoveSnippetDialog,
    openRenameDialog
  ]);

  // Convert store chapters to SortableChapter format
  const sortableChapters: SortableChapter[] = useMemo(
    () => chapters.map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      color: chapter.color,
      snippetIds: chapter.snippetIds
    })),
    [chapters]
  );

  const snippetsByChapter = useMemo(() => {
    const map = new Map<string, typeof allSnippets>();
    allSnippets.forEach((snippet) => {
      const existing = map.get(snippet.chapterId);
      if (existing) {
        existing.push(snippet);
      } else {
        map.set(snippet.chapterId, [snippet]);
      }
    });
    return map;
  }, [allSnippets]);

  const searchValue = searchTerm.trim().toLowerCase();
  const visibleSnippetMap = useMemo(() => {
    const map = new Map<string, string[]>();

    chapters.forEach((chapter) => {
      const snippetList = snippetsByChapter.get(chapter.id) ?? [];

      if (!searchValue) {
        map.set(chapter.id, [...chapter.snippetIds]);
        return;
      }

      const chapterTitleMatch = chapter.title.toLowerCase().includes(searchValue);
      const matchingSnippetIds = snippetList
        .filter((snippet) => {
          const content = snippet.content ?? "";
          const firstLine = content.split("\n")[0] || "";
          const lowerContent = content.toLowerCase();
          return (
            firstLine.toLowerCase().includes(searchValue) || lowerContent.includes(searchValue)
          );
        })
        .map((snippet) => snippet.id);

      if (chapterTitleMatch) {
        map.set(chapter.id, [...chapter.snippetIds]);
      } else if (matchingSnippetIds.length > 0) {
        map.set(chapter.id, matchingSnippetIds);
      }
    });

    return map;
  }, [chapters, snippetsByChapter, searchValue]);

  const filteredChapters: SortableChapter[] = useMemo(() => {
    if (!searchValue) {
      return sortableChapters;
    }
    return sortableChapters.filter((chapter) => {
      if (lastCreatedChapterId && chapter.id === lastCreatedChapterId) {
        return true;
      }
      return visibleSnippetMap.has(chapter.id);
    });
  }, [lastCreatedChapterId, searchValue, sortableChapters, visibleSnippetMap]);

  useEffect(() => {
    if (!searchValue) {
      setLastCreatedChapterId(null);
    }
  }, [searchValue]);

  useEffect(() => {
    if (lastCreatedChapterId && !chapters.some((chapter) => chapter.id === lastCreatedChapterId)) {
      setLastCreatedChapterId(null);
    }
  }, [chapters, lastCreatedChapterId]);

  // Render a single chapter
  const renderChapter = (chapter: SortableChapter): JSX.Element => {
    const isCollapsed = collapsedChapters.has(chapter.id);
    const baseColor = chapter.color || "#3B82F6";
    const headerTextColor = getReadableTextColor(baseColor);
    const headerHoverColor = darkenColor(baseColor, 0.1);
    const iconHoverColor =
      headerTextColor === "#FFFFFF" ? "rgba(255, 255, 255, 0.16)" : "rgba(15, 23, 42, 0.12)";
    const visibleSnippetIds = visibleSnippetMap.get(chapter.id) ?? chapter.snippetIds;

    return (
      <Box
        key={chapter.id}
        sx={{
          mb: 1,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
          overflow: "hidden"
        }}
      >
        {/* Chapter Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            p: 1,
            bgcolor: baseColor,
            color: headerTextColor,
            cursor: "pointer",
            "&:hover": {
              bgcolor: headerHoverColor
            }
          }}
          onClick={() => toggleChapterCollapse(chapter.id)}
        >
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              toggleChapterCollapse(chapter.id);
            }}
            sx={{
              p: 0.5,
              color: headerTextColor,
              "&:hover": {
                bgcolor: iconHoverColor
              }
            }}
          >
            {isCollapsed ? <ChevronRight fontSize="small" /> : <ExpandMore fontSize="small" />}
          </IconButton>
          <Typography variant="body2" sx={{ flex: 1, fontWeight: 600, color: "inherit" }}>
            {chapter.title}
          </Typography>
          <ChapterSnippetCount chapterId={chapter.id} textColor={headerTextColor} />
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleAddSnippet(chapter.id);
            }}
            disabled={isCreatingSnippet}
            sx={{
              p: 0.5,
              color: headerTextColor,
              "&:hover": {
                bgcolor: iconHoverColor
              }
            }}
          >
            <Add fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            aria-label="Chapter menu"
            onClick={(event) => handleChapterMenuOpen(chapter.id, event)}
            sx={{
              p: 0.5,
              color: headerTextColor,
              "&:hover": {
                bgcolor: iconHoverColor
              }
            }}
          >
            <MoreVert fontSize="small" />
          </IconButton>
        </Box>

        {/* Chapter Snippets */}
        <Collapse in={!isCollapsed}>
          <Box sx={{ p: 0.5 }}>
            <ChapterSnippetList
              chapterId={chapter.id}
              chapterColor={baseColor}
              onReorder={handleSnippetReorder(chapter.id)}
              onMoveToChapter={handleSnippetMoveToChapter}
              onSnippetClick={onSnippetClick}
              activeSnippetId={activeSnippetId}
              registerElement={registerElement}
              visibleSnippetIds={visibleSnippetIds}
              onSnippetMenuOpen={handleSnippetMenuOpen}
            />
          </Box>
        </Collapse>
      </Box>
    );
  };

  if (!story) {
    return <></>;
  }

  if (chapters.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: "center" }}>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          No chapters yet. Create a chapter to get started.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Box sx={{ flex: 1, overflowY: "auto", px: 2, pb: 2 }}>
        {filteredChapters.length === 0 ? (
          <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", mt: 4 }}>
            No chapters match your search.
          </Typography>
        ) : (
          <SortableChapterList
            chapters={filteredChapters}
            onReorder={handleChapterReorder}
            renderChapter={renderChapter}
          />
        )}
      </Box>
      <Box sx={{ px: 2, pb: 2 }}>
        <Divider sx={{ mb: 2 }} />
        <Button
          variant="outlined"
          startIcon={<Add />}
          fullWidth
          onClick={handleCreateChapter}
          disabled={isCreatingChapter}
        >
          {isCreatingChapter ? "Creating…" : "New Chapter"}
        </Button>
      </Box>
      <ColorPicker
        open={Boolean(colorPickerState)}
        anchorEl={colorPickerState?.anchorEl ?? null}
        currentColor={activeChapterForPicker?.color}
        onClose={handleCloseColorPicker}
        onColorSelect={handleColorSelect}
      />
      <ContextMenu
        open={Boolean(contextMenu.type && contextMenu.anchorEl)}
        anchorEl={contextMenu.anchorEl}
        onClose={closeContextMenu}
        actions={contextMenuActions}
      />
      <RenameModal
        open={Boolean(renameDialog.type)}
        onClose={handleRenameClose}
        currentName={renameDialog.currentName}
        itemType={renameDialog.type ?? "chapter"}
        onRename={handleRenameSubmit}
      />
      <MoveSnippetDialog
        open={moveSnippetDialog.open}
        chapters={chapters.map((chapter) => ({
          id: chapter.id,
          title: chapter.title ?? "Untitled Chapter"
        }))}
        currentChapterId={moveSnippetDialog.currentChapterId}
        onClose={handleMoveSnippetDialogClose}
        onConfirm={handleMoveSnippetConfirm}
        isSubmitting={isMovingSnippet}
      />
      <Dialog open={deleteDialog.open} onClose={handleDeleteCancel} maxWidth="xs" fullWidth>
        <DialogTitle>
          {deleteDialog.type === "chapter" ? "Delete Chapter" : "Delete Snippet"}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure you want to delete "{deleteDialog.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={deleteInProgress}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleteInProgress}
          >
            {deleteInProgress ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// Helper component to get snippets for a chapter (needed because hooks can't be called conditionally)
function ChapterSnippetCount({
  chapterId,
  textColor
}: {
  chapterId: string;
  textColor?: string;
}): JSX.Element {
  const snippets = useYarnyStore((state) => selectSnippetsForChapter(state, chapterId));
  return (
    <Typography variant="caption" sx={{ color: textColor ?? "text.secondary" }}>
      {snippets.length} {snippets.length === 1 ? "snippet" : "snippets"}
    </Typography>
  );
}

// Helper component to render snippet list for a chapter
function ChapterSnippetList({
  chapterId,
  chapterColor,
  onReorder,
  onMoveToChapter,
  onSnippetClick,
  activeSnippetId,
  registerElement,
  visibleSnippetIds,
  onSnippetMenuOpen
}: {
  chapterId: string;
  chapterColor: string;
  onReorder: (newOrder: string[]) => void;
  onMoveToChapter?: (snippetId: string, targetChapterId: string) => void;
  onSnippetClick?: (snippetId: string) => void;
  activeSnippetId?: string;
  registerElement: (snippetId: string, element: HTMLElement | null) => void;
  visibleSnippetIds?: string[];
  onSnippetMenuOpen?: (snippetId: string, event: MouseEvent<HTMLElement>) => void;
}): JSX.Element {
  const snippets = useYarnyStore((state) => selectSnippetsForChapter(state, chapterId));

  const filteredSnippets = useMemo(() => {
    if (!visibleSnippetIds || visibleSnippetIds.length === 0) {
      return snippets;
    }
    const snippetMap = new Map(snippets.map((snippet) => [snippet.id, snippet]));
    return visibleSnippetIds
      .map((id) => snippetMap.get(id))
      .filter((snippet): snippet is typeof snippets[number] => Boolean(snippet));
  }, [snippets, visibleSnippetIds]);

  // Convert store snippets to SortableSnippet format
  const sortableSnippets: SortableSnippet[] = filteredSnippets.map((snippet) => {
    const content = snippet.content ?? "";
    return {
      id: snippet.id,
      title: content.split("\n")[0] || "Untitled",
      wordCount: content.split(/\s+/).filter((w) => w.length > 0).length
    };
  });

  return (
    <SortableSnippetList
      snippets={sortableSnippets}
      onReorder={onReorder}
      onMoveToChapter={onMoveToChapter}
      renderSnippet={(snippet) => (
        <SnippetItem
          key={snippet.id}
          snippetId={snippet.id}
          title={snippet.title}
          wordCount={snippet.wordCount}
          isActive={activeSnippetId === snippet.id}
          onClick={() => onSnippetClick?.(snippet.id)}
          registerElement={registerElement}
          chapterColor={chapterColor}
          onMenuOpen={(event) => onSnippetMenuOpen?.(snippet.id, event)}
        />
      )}
    />
  );
}

// Individual snippet item component with ref for visibility gating
function SnippetItem({
  snippetId,
  title,
  wordCount,
  isActive,
  onClick,
  registerElement,
  chapterColor,
  onMenuOpen
}: {
  snippetId: string;
  title: string;
  wordCount?: number;
  isActive: boolean;
  onClick: () => void;
  registerElement: (snippetId: string, element: HTMLElement | null) => void;
  chapterColor: string;
  onMenuOpen?: (event: MouseEvent<HTMLElement>) => void;
}): JSX.Element {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (elementRef.current) {
      registerElement(snippetId, elementRef.current);
    }
    return () => {
      registerElement(snippetId, null);
    };
  }, [snippetId, registerElement]);

  const softColor = getSoftVariant(chapterColor);
  const snippetHoverColor = darkenColor(softColor, 0.08);
  const snippetActiveColor = darkenColor(softColor, 0.16);
  const snippetBorderColor = darkenColor(softColor, 0.2);
  const snippetTextColor = getReadableTextColor(softColor, { minimumRatio: 4 });

  return (
    <Box
      ref={elementRef}
      data-snippet-id={snippetId}
      onClick={onClick}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        p: 1,
        borderRadius: 1,
        cursor: "pointer",
        bgcolor: isActive ? snippetActiveColor : softColor,
        color: snippetTextColor,
        border: "1px solid",
        borderColor: isActive ? darkenColor(chapterColor, 0.25) : snippetBorderColor,
        "&:hover": {
          bgcolor: isActive ? snippetActiveColor : snippetHoverColor
        }
      }}
    >
      <Description fontSize="small" sx={{ color: snippetTextColor, opacity: 0.85 }} />
      <Typography
        variant="body2"
        sx={{
          flex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          color: "inherit"
        }}
      >
        {title}
      </Typography>
      {wordCount !== undefined && (
        <Typography variant="caption" sx={{ color: snippetTextColor, opacity: 0.7 }}>
          {wordCount}
        </Typography>
      )}
      <IconButton
        size="small"
        onClick={(event) => {
          event.stopPropagation();
          onMenuOpen?.(event);
        }}
        sx={{
          p: 0.5,
          color: snippetTextColor,
          "&:hover": {
            bgcolor: darkenColor(chapterColor, 0.2),
            color: getReadableTextColor(darkenColor(chapterColor, 0.2))
          }
        }}
      >
        <MoreVert fontSize="small" />
      </IconButton>
    </Box>
  );
}

interface MoveSnippetDialogProps {
  open: boolean;
  chapters: Array<{ id: string; title: string }>;
  currentChapterId: string | null;
  onClose: () => void;
  onConfirm: (chapterId: string) => void;
  isSubmitting: boolean;
}

function MoveSnippetDialog({
  open,
  chapters,
  currentChapterId,
  onClose,
  onConfirm,
  isSubmitting
}: MoveSnippetDialogProps): JSX.Element {
  const [selectedChapterId, setSelectedChapterId] = useState<string>("");

  useEffect(() => {
    if (!open) {
      return;
    }

    const availableChapters = chapters.map((chapter) => chapter.id);
    if (availableChapters.length === 0) {
      setSelectedChapterId("");
      return;
    }

    const alternativeChapter = chapters.find((chapter) => chapter.id !== currentChapterId)?.id;
    if (alternativeChapter) {
      setSelectedChapterId(alternativeChapter);
      return;
    }

    const initial = currentChapterId && availableChapters.includes(currentChapterId)
      ? currentChapterId
      : availableChapters[0];
    setSelectedChapterId(initial);
  }, [chapters, currentChapterId, open]);

  const handleChange = (event: SelectChangeEvent<string>) => {
    setSelectedChapterId(event.target.value);
  };

  const handleConfirm = () => {
    if (!selectedChapterId || selectedChapterId === currentChapterId) {
      return;
    }
    onConfirm(selectedChapterId);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Move Snippet</DialogTitle>
      <DialogContent>
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel id="move-snippet-select-label">Chapter</InputLabel>
          <Select
            labelId="move-snippet-select-label"
            value={selectedChapterId}
            label="Chapter"
            onChange={handleChange}
          >
            {chapters.map((chapter) => (
              <MenuItem key={chapter.id} value={chapter.id} disabled={chapter.id === currentChapterId}>
                {chapter.title || "Untitled Chapter"}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={
            isSubmitting ||
            !selectedChapterId ||
            selectedChapterId === currentChapterId
          }
        >
          {isSubmitting ? "Moving…" : "Move"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
