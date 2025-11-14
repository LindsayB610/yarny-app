export type StoryEditorProps = {
  isLoading: boolean;
};

export type ConflictModalState = {
  open: boolean;
  conflict: {
    snippetId: string;
    localModifiedTime: string;
    driveModifiedTime: string;
    localContent: string;
    driveContent: string;
  } | null;
};

