import { useMemo } from "react";

import type { ContextMenuAction } from "../ContextMenu";

export function useContextMenuActions(
  contextMenu: {
    type: "chapter" | "snippet" | null;
    id: string | null;
    anchorEl: HTMLElement | null;
  },
  chapters: Array<{ id: string }>,
  isDuplicatingChapter: boolean,
  isDuplicatingSnippet: boolean,
  isDeletingChapter: boolean,
  isDeletingSnippet: boolean,
  isMovingSnippet: boolean,
  openRenameDialog: (type: "chapter" | "snippet", id: string) => void,
  openChapterColorPicker: (chapterId: string, anchorEl: HTMLElement | null) => void,
  handleDuplicateChapter: (chapterId: string) => void,
  handleDuplicateSnippet: (snippetId: string) => void,
  openMoveSnippetDialog: (snippetId: string) => void,
  openDeleteDialog: (type: "chapter" | "snippet", id: string) => void
): ContextMenuAction[] {
  return useMemo(() => {
    if (!contextMenu.type || !contextMenu.id) {
      return [];
    }

    if (contextMenu.type === "chapter") {
      return [
        {
          label: "Rename Chapter",
          onClick: () => openRenameDialog("chapter", contextMenu.id!)
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
          onClick: () => {
            void handleDuplicateChapter(contextMenu.id!);
          },
          disabled: isDuplicatingChapter
        },
        {
          label: "Delete Chapter",
          onClick: () => openDeleteDialog("chapter", contextMenu.id!),
          disabled: isDeletingChapter
        }
      ];
    }

    const canMoveSnippet = chapters.length > 1;

    return [
      {
        label: "Rename Snippet",
        onClick: () => openRenameDialog("snippet", contextMenu.id!)
      },
      {
        label: "Duplicate Snippet",
        onClick: () => {
          void handleDuplicateSnippet(contextMenu.id!);
        },
        disabled: isDuplicatingSnippet
      },
      {
        label: "Move to Chapter…",
        onClick: () => openMoveSnippetDialog(contextMenu.id!),
        disabled: !canMoveSnippet || isMovingSnippet
      },
      {
        label: "Delete Snippet",
        onClick: () => openDeleteDialog("snippet", contextMenu.id!),
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
}

