import type { NoteType } from "../../../hooks/useNotesQuery";

export interface NotesListProps {
  notes: Array<{ id: string; name: string; content: string; modifiedTime: string }>;
  isLoading: boolean;
  noteType: NoteType;
  onReorder?: (noteType: NoteType, newOrder: string[]) => void;
  isReordering?: boolean;
  activeNoteId?: string;
  onNoteClick?: (noteType: NoteType, noteId: string) => void;
  searchTerm: string;
}

export interface SortableNoteItemProps {
  note: { id: string; name: string; content: string; modifiedTime: string };
  disabled?: boolean;
  isActive?: boolean;
  onClick?: () => void;
  searchTerm: string;
}

export const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  characters: "Character",
  worldbuilding: "Worldbuilding"
};

