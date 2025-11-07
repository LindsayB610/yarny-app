/**
 * Count words in a text string
 */
export function countWords(text: string): number {
  if (!text || text.trim().length === 0) {
    return 0;
  }
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

/**
 * Count characters in a text string
 */
export function countCharacters(text: string): number {
  return text ? text.length : 0;
}

/**
 * Calculate total word count from multiple text snippets
 */
export function calculateTotalWordCount(texts: string[]): number {
  return texts.reduce((total, text) => total + countWords(text), 0);
}

