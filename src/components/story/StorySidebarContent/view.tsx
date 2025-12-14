import { Add } from "@mui/icons-material";
import { Box, Button, Divider, Typography } from "@mui/material";
import { useEffect, useCallback, useMemo, type JSX, type MouseEvent } from "react";

import { ColorPicker } from "../ColorPicker";
import { ContextMenu } from "../ContextMenu";
import { RenameModal } from "../RenameModal";
import { SortableChapterList, type Chapter as SortableChapter } from "../SortableChapterList";
import { ChapterItem } from "./ChapterItem";
import { DeleteDialog } from "./DeleteDialog";
import { MoveSnippetDialog } from "./MoveSnippetDialog";
import type { StorySidebarContentProps } from "./types";
import { useCollapsedState } from "./useCollapsedState";
import { useContextMenuActions } from "./useContextMenuActions";
import { useSearchFilter } from "./useSearchFilter";
import { useSidebarHandlers } from "./useSidebarHandlers";
import { useSidebarState } from "./useSidebarState";

import { normalizePlainText } from "@/editor/textExtraction";
import { useActiveStory } from "@/hooks/useActiveStory";
import { useVisibilityGatedSnippetQueries } from "@/hooks/useVisibilityGatedQueries";
import { useYarnyStore } from "@/store/provider";
import {
  selectStoryChapters,
  selectStorySnippets
} from "@/store/selectors";

export function StorySidebarContentView({
  searchTerm,
  onSnippetClick,
  activeSnippetId
}: StorySidebarContentProps): JSX.Element {
  const story = useActiveStory();
  const chapters = useYarnyStore((state) => 
    story ? selectStoryChapters(state, story.id) : []
  );
  const allSnippets = useYarnyStore((state) => 
    story ? selectStorySnippets(state, story.id) : []
  );
  const snippetsById = useYarnyStore((state) => state.entities.snippets);
  const upsertEntities = useYarnyStore((state) => state.upsertEntities);
  const { collapsedChapters, setCollapsedChapters, toggleChapterCollapse } = useCollapsedState(story?.id);
  const sidebarState = useSidebarState();
  const {
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
  } = sidebarState;

  const handlers = useSidebarHandlers(
    setCollapsedChapters,
    setLastCreatedChapterId,
    setColorPickerState,
    colorPickerState,
    closeContextMenu,
    setRenameDialog,
    setMoveSnippetDialog,
    setDeleteDialog,
    snippetsById,
    chapters
  );

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


  const { filteredChapters, visibleSnippetMap } = useSearchFilter(
    chapters,
    allSnippets,
    searchTerm,
    lastCreatedChapterId
  );

  const contextMenuActions = useContextMenuActions(
    contextMenu,
    chapters,
    handlers.isDuplicatingChapter,
    handlers.isDuplicatingSnippet,
    handlers.isDeletingChapter,
    handlers.isDeletingSnippet,
    handlers.isMovingSnippet,
    handlers.openRenameDialog,
    handlers.openChapterColorPicker,
    (chapterId: string) => {
      void handlers.handleDuplicateChapter(chapterId);
    },
    (snippetId: string) => {
      void handlers.handleDuplicateSnippet(snippetId);
    },
    handlers.openMoveSnippetDialog,
    handlers.openDeleteDialog
  );

  const handleMoveSnippetConfirm = useCallback(
    (targetChapterId: string) => {
      void handlers.handleMoveSnippetConfirm(targetChapterId, moveSnippetDialog);
    },
    [handlers, moveSnippetDialog]
  );

  const handleDeleteConfirm = useCallback(() => {
    void handlers.handleDeleteConfirm(deleteDialog);
  }, [handlers, deleteDialog]);

  const handleRenameSubmit = useCallback(
    async (newName: string) => {
      await handlers.handleRenameSubmit(newName, renameDialog);
    },
    [handlers, renameDialog]
  );

  const handleChapterMenuOpen = useCallback(
    (chapterId: string, event: MouseEvent<HTMLElement>) => {
      handlers.handleChapterMenuOpen(chapterId, event, setContextMenu);
    },
    [handlers, setContextMenu]
  );

  const handleSnippetMenuOpen = useCallback(
    (snippetId: string, event: MouseEvent<HTMLElement>) => {
      handlers.handleSnippetMenuOpen(snippetId, event, setContextMenu);
    },
    [handlers, setContextMenu]
  );

  const deleteInProgress =
    deleteDialog.type === "chapter" ? handlers.isDeletingChapter : handlers.isDeletingSnippet;

  useEffect(() => {
    if (!searchTerm.trim()) {
      setLastCreatedChapterId(null);
    }
  }, [searchTerm, setLastCreatedChapterId]);

  useEffect(() => {
    if (lastCreatedChapterId && !chapters.some((chapter) => chapter.id === lastCreatedChapterId)) {
      setLastCreatedChapterId(null);
    }
  }, [chapters, lastCreatedChapterId, setLastCreatedChapterId]);

  const renderChapter = (chapter: SortableChapter): JSX.Element => {
    const isCollapsed = collapsedChapters.has(chapter.id);
    const visibleSnippetIds = visibleSnippetMap.get(chapter.id) ?? chapter.snippetIds;

    return (
      <ChapterItem
        key={chapter.id}
        chapter={chapter}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => toggleChapterCollapse(chapter.id)}
        onAddSnippet={() => {
          void handlers.handleAddSnippet(chapter.id);
        }}
        onMenuOpen={(event) => handleChapterMenuOpen(chapter.id, event)}
        onReorder={handlers.handleSnippetReorder(chapter.id)}
        onMoveToChapter={handlers.handleSnippetMoveToChapter}
        onSnippetClick={onSnippetClick}
        activeSnippetId={activeSnippetId}
        registerElement={registerElement}
        visibleSnippetIds={visibleSnippetIds}
        onSnippetMenuOpen={handleSnippetMenuOpen}
        isCreatingSnippet={handlers.isCreatingSnippet}
        searchTerm={searchTerm}
      />
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
            onReorder={handlers.handleChapterReorder}
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
          onClick={() => {
            void handlers.handleCreateChapter();
          }}
          disabled={handlers.isCreatingChapter}
        >
          {handlers.isCreatingChapter ? "Creating…" : "New Chapter"}
        </Button>
      </Box>
      <ColorPicker
        open={Boolean(colorPickerState)}
        anchorEl={colorPickerState?.anchorEl ?? null}
        currentColor={handlers.activeChapterForPicker?.color}
        onClose={handlers.handleCloseColorPicker}
        onColorSelect={handlers.handleColorSelect}
      />
      <ContextMenu
        open={Boolean(contextMenu.type && contextMenu.anchorEl)}
        anchorEl={contextMenu.anchorEl}
        onClose={closeContextMenu}
        actions={contextMenuActions}
      />
      <RenameModal
        open={Boolean(renameDialog.type)}
        onClose={handlers.handleRenameClose}
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
        onClose={handlers.handleMoveSnippetDialogClose}
        onConfirm={handleMoveSnippetConfirm}
        isSubmitting={handlers.isMovingSnippet}
      />
      <DeleteDialog
        open={deleteDialog.open}
        type={deleteDialog.type}
        name={deleteDialog.name}
        onClose={handlers.handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        isSubmitting={deleteInProgress}
      />
    </Box>
  );
}
