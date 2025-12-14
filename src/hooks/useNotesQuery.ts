import { useQuery } from "@tanstack/react-query";

import { apiClient } from "../api/client";
import { loadNotesFromLocal } from "../services/localFileStorage/loadNotesFromLocal";
import { getPersistedDirectoryHandle } from "../services/localFs/LocalFsCapability";

export interface Note {
  id: string;
  name: string;
  content: string;
  modifiedTime: string;
}

export type NoteType = "characters" | "worldbuilding";

/**
 * Hook to fetch notes of a specific type (Characters or Worldbuilding) from a story folder
 */
export function useNotesQuery(
  storyFolderId: string | undefined,
  noteType: NoteType,
  enabled = true
) {
  return useQuery({
    queryKey: ["notes", storyFolderId, noteType],
    queryFn: async (): Promise<Note[]> => {
      if (!storyFolderId) {
        return [];
      }

      // Check if this is a local project
      const isLocalProject = storyFolderId.startsWith("local-story_");
      
      if (isLocalProject) {
        // Load notes from local file storage
        const rootHandle = await getPersistedDirectoryHandle();
        if (!rootHandle) {
          console.warn("[useNotesQuery] No root handle found for local project");
          return [];
        }

        const notes = await loadNotesFromLocal(rootHandle, noteType);
        
        // Convert Note[] (store type) to Note[] (query return type)
        return notes.map(note => {
          const firstLine = note.content.split("\n")[0]?.trim();
          // Strip markdown headers (leading # and whitespace)
          const nameWithoutMarkdown = firstLine?.replace(/^#+\s*/, "").trim() ?? "";
          return {
            id: note.id,
            name: nameWithoutMarkdown || note.id, // Use first line as name, without markdown (logical OR, not default)
            content: note.content,
            modifiedTime: note.updatedAt
          };
        });
      }

      // Drive project - use existing Drive API logic
      // First, find the notes folder (Characters or Worldbuilding)
      // Map noteType to folder name
      const folderNameMap: Record<NoteType, string> = {
        characters: "Characters",
        worldbuilding: "Worldbuilding"
      };
      const folderName = folderNameMap[noteType];
      const filesResponse = await apiClient.listDriveFiles({
        folderId: storyFolderId
      });

      // Find the notes folder
      const notesFolder = filesResponse.files?.find(
        (f) => f.name === folderName && f.mimeType === "application/vnd.google-apps.folder"
      );

      if (!notesFolder?.id) {
        return [];
      }

      // List all files in the notes folder
      const notesFilesResponse = await apiClient.listDriveFiles({
        folderId: notesFolder.id
      });

      if (!notesFilesResponse.files || notesFilesResponse.files.length === 0) {
        return [];
      }

      // Attempt to load custom ordering metadata
      let noteOrder: string[] = [];
      const orderFile = notesFilesResponse.files?.find(
        (file) => file.name === "_order.json" && file.id
      );
      if (orderFile?.id) {
        try {
          const orderResponse = await apiClient.readDriveFile({
            fileId: orderFile.id
          });
          const parsed = JSON.parse(orderResponse.content ?? "{}") as {
            order?: unknown;
          };
          if (Array.isArray(parsed.order)) {
            noteOrder = parsed.order.filter((id): id is string => typeof id === "string");
          }
        } catch (error) {
          console.warn(`Failed to read notes order for ${folderName}:`, error);
        }
      }

      // Fetch content for each note file
      const notesPromises = notesFilesResponse.files
        .filter((f) => f.mimeType === "text/plain" || f.mimeType === "text/markdown")
        .map(async (file) => {
          try {
            const contentResponse = await apiClient.readDriveFile({
              fileId: file.id
            });

            return {
              id: file.id,
              name: file.name.replace(/\.txt$/, "").replace(/\.md$/, ""), // Remove file extension
              content: contentResponse.content ?? "",
              modifiedTime: file.modifiedTime ?? new Date().toISOString()
            };
          } catch (error) {
            console.error(`Error reading note file ${file.id}:`, error);
            return null;
          }
        });

      const notes = (await Promise.all(notesPromises)).filter(
        (note): note is Note => note !== null
      );

      if (noteOrder.length === 0) {
        return notes;
      }

      const orderMap = new Map<string, number>();
      noteOrder.forEach((id, index) => {
        orderMap.set(id, index);
      });

      return [...notes].sort((a, b) => {
        const indexA = orderMap.has(a.id) ? orderMap.get(a.id)! : Number.MAX_SAFE_INTEGER;
        const indexB = orderMap.has(b.id) ? orderMap.get(b.id)! : Number.MAX_SAFE_INTEGER;

        if (indexA !== indexB) {
          return indexA - indexB;
        }

        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      });
    },
    enabled: enabled && Boolean(storyFolderId),
    staleTime: 30 * 1000 // 30 seconds
  });
}


