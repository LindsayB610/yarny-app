export interface SearchResult {
  id: string;
  type: "chapter" | "snippet" | "character" | "worldbuilding" | "editor";
  title: string;
  preview?: string;
  chapterId?: string;
  chapterTitle?: string;
  storyId: string;
  noteType?: "characters" | "worldbuilding";
}

export interface GlobalSearchModalProps {
  open: boolean;
  onClose: () => void;
}

export interface SearchResultGroup {
  type: SearchResult["type"];
  label: string;
  results: SearchResult[];
}

