export interface StorySidebarContentProps {
  searchTerm: string;
  onSnippetClick?: (snippetId: string) => void;
  activeSnippetId?: string;
}

