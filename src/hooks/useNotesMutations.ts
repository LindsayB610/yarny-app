import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "../api/client";
import { mirrorNoteOrderWrite, mirrorNoteWrite } from "../services/localFs/localBackupMirror";
import type { Note, NoteType } from "./useNotesQuery";

interface CreateNoteVariables {
  noteType: NoteType;
}

interface CreateNoteResult {
  id: string;
  name: string;
  modifiedTime: string;
  noteType: NoteType;
}

const NOTE_FOLDER_NAMES: Record<NoteType, string> = {
  people: "People",
  places: "Places",
  things: "Things"
};

const NOTE_FILE_PREFIX: Record<NoteType, string> = {
  people: "Person",
  places: "Place",
  things: "Thing"
};

export async function ensureNotesFolder(
  storyFolderId: string,
  noteType: NoteType
): Promise<string> {
  const folderName = NOTE_FOLDER_NAMES[noteType];

  const storyFilesResponse = await apiClient.listDriveFiles({
    folderId: storyFolderId
  });

  const existingFolder = storyFilesResponse.files?.find(
    (file) => file.name === folderName && file.mimeType === "application/vnd.google-apps.folder"
  );

  if (existingFolder?.id) {
    return existingFolder.id;
  }

  const createdFolder = await apiClient.createDriveFolder({
    name: folderName,
    parentFolderId: storyFolderId
  });

  return createdFolder.id;
}

async function getNextNoteFilename(folderId: string, noteType: NoteType): Promise<{
  fileName: string;
  displayName: string;
}> {
  const baseName = NOTE_FILE_PREFIX[noteType];

  const notesResponse = await apiClient.listDriveFiles({
    folderId
  });

  const existingNames = new Set(
    (notesResponse.files ?? [])
      .map((file) => file.name ?? "")
      .filter((name) => Boolean(name))
      .map((name) => name.replace(/\.(txt|md)$/i, ""))
  );

  let counter = 1;
  let displayName = `${baseName} ${counter}`;

  while (existingNames.has(displayName)) {
    counter += 1;
    displayName = `${baseName} ${counter}`;
  }

  return {
    fileName: `${displayName}.txt`,
    displayName
  };
}

export function useCreateNoteMutation(storyFolderId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<CreateNoteResult, Error, CreateNoteVariables>({
    mutationFn: async ({ noteType }) => {
      if (!storyFolderId) {
        throw new Error("Cannot create note without an active story.");
      }

      const folderId = await ensureNotesFolder(storyFolderId, noteType);
      const { fileName, displayName } = await getNextNoteFilename(folderId, noteType);

      const response = await apiClient.writeDriveFile({
        parentFolderId: folderId,
        fileName,
        content: "",
        mimeType: "text/plain"
      });

      await mirrorNoteWrite(storyFolderId, noteType, response.id, "");

      return {
        id: response.id,
        name: displayName,
        modifiedTime: response.modifiedTime,
        noteType
      };
    },
    onSuccess: (_data, variables) => {
      if (!storyFolderId) {
        return;
      }

      void queryClient.invalidateQueries({
        queryKey: ["notes", storyFolderId, variables.noteType]
      });
    }
  });
}

interface ReorderNotesVariables {
  noteType: NoteType;
  newOrder: string[];
}

export function useReorderNotesMutation(storyFolderId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, ReorderNotesVariables>({
    mutationFn: async ({ noteType, newOrder }) => {
      if (!storyFolderId) {
        throw new Error("Cannot reorder notes without an active story.");
      }

      const folderId = await ensureNotesFolder(storyFolderId, noteType);
      const filesResponse = await apiClient.listDriveFiles({ folderId });
      const orderFile = filesResponse.files?.find(
        (file) => file.name === "_order.json" && file.id
      );

      const sanitizedOrder = Array.from(
        new Set(newOrder.filter((id): id is string => typeof id === "string" && id.length > 0))
      );

      const payload = {
        order: sanitizedOrder,
        updatedAt: new Date().toISOString(),
        version: 1
      };

      const serialized = JSON.stringify(payload, null, 2);

      if (orderFile?.id) {
        await apiClient.writeDriveFile({
          fileId: orderFile.id,
          fileName: "_order.json",
          parentFolderId: folderId,
          mimeType: "application/json",
          content: serialized
        });
      } else {
        await apiClient.writeDriveFile({
          fileName: "_order.json",
          parentFolderId: folderId,
          mimeType: "application/json",
          content: serialized
        });
      }

      await mirrorNoteOrderWrite(storyFolderId, noteType, serialized);
    },
    onMutate: async ({ noteType, newOrder }) => {
      if (!storyFolderId) {
        return undefined;
      }

      const queryKey = ["notes", storyFolderId, noteType] as const;
      await queryClient.cancelQueries({ queryKey });

      const previousNotes = queryClient.getQueryData<Note[]>(queryKey);

      if (previousNotes) {
        const noteMap = new Map(previousNotes.map((note) => [note.id, note]));
        const ordered = newOrder
          .map((id) => noteMap.get(id))
          .filter((note): note is Note => Boolean(note));
        const leftovers = previousNotes.filter((note) => !newOrder.includes(note.id));
        queryClient.setQueryData<Note[]>(queryKey, [...ordered, ...leftovers]);
      }

      return { previousNotes, queryKey };
    },
    onError: (_error, { noteType }, context) => {
      if (!storyFolderId || !context?.previousNotes) {
        return;
      }

      const queryKey = ["notes", storyFolderId, noteType] as const;
      queryClient.setQueryData(queryKey, context.previousNotes);
    },
    onSettled: (_data, _error, { noteType }) => {
      if (!storyFolderId) {
        return;
      }

      const queryKey = ["notes", storyFolderId, noteType] as const;
      void queryClient.invalidateQueries({ queryKey });
    }
  });
}


