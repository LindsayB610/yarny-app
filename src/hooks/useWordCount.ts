import { useCallback } from "react";

import { countWords } from "../utils/wordCount";

/**
 * Hook for managing word count calculations and updates
 */
export function useWordCount() {
  /**
   * Calculate word count from text
   */
  const calculateWordCount = useCallback((text: string): number => {
    return countWords(text);
  }, []);

  /**
   * Calculate total word count from multiple text snippets
   */
  const calculateTotalWordCount = useCallback((texts: string[]): number => {
    return texts.reduce((total, text) => total + countWords(text), 0);
  }, []);

  /**
   * Update word count for a snippet
   */
  const updateSnippetWordCount = useCallback(
    (
      snippetId: string,
      content: string,
      onUpdate: (snippetId: string, wordCount: number) => void
    ) => {
      const wordCount = countWords(content);
      onUpdate(snippetId, wordCount);
      return wordCount;
    },
    []
  );

  return {
    calculateWordCount,
    calculateTotalWordCount,
    updateSnippetWordCount
  };
}

