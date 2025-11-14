import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useEffect } from "react";

import type { SavePayload, SaveResult } from "./types";
import { apiClient } from "../../../api/client";
import { normalizePlainText } from "../../../editor/textExtraction";
import type { Note } from "../../../hooks/useNotesQuery";
import { mirrorNoteWrite } from "../../../services/localFs/localBackupMirror";

export function useNoteSave() {
  const queryClient = useQueryClient();
  const lastSavedContentRef = useRef<string>("");
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const saveMutation = useMutation<SaveResult, unknown, SavePayload>({
    mutationFn: async ({ storyId, noteId, noteType, content }) => {
      const normalized = normalizePlainText(content);
      const response = await apiClient.writeDriveFile({
        fileId: noteId,
        content: normalized
      });
      await mirrorNoteWrite(storyId, noteType, noteId, normalized);
      return {
        content: normalized,
        modifiedTime: response.modifiedTime ?? new Date().toISOString()
      };
    },
    onSuccess: (result, variables) => {
      lastSavedContentRef.current = result.content;
      queryClient.setQueryData<Note[]>(
        ["notes", variables.storyId, variables.noteType],
        (previous) => {
          if (!previous) {
            return previous;
          }
          return previous.map((item) =>
            item.id === variables.noteId
              ? {
                  ...item,
                  content: result.content,
                  modifiedTime: result.modifiedTime
                }
              : item
          );
        }
      );
    },
    onError: (error) => {
      console.error("Failed to save note:", error);
    }
  });

  return { saveMutation, lastSavedContentRef };
}

