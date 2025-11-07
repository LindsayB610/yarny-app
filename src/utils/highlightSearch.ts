/**
 * Utility function to highlight search matches in text
 * @param text - The text to highlight
 * @param searchQuery - The search query to highlight
 * @returns An array of text parts with highlight markers
 */
export function highlightSearchText(text: string, searchQuery: string): Array<{ text: string; highlight: boolean }> {
  if (!searchQuery.trim()) {
    return [{ text, highlight: false }];
  }

  const parts: Array<{ text: string; highlight: boolean }> = [];
  const searchLower = searchQuery.toLowerCase();
  const textLower = text.toLowerCase();
  let lastIndex = 0;
  let searchIndex = 0;

  while ((searchIndex = textLower.indexOf(searchLower, lastIndex)) !== -1) {
    // Add non-highlighted text before the match
    if (searchIndex > lastIndex) {
      parts.push({
        text: text.substring(lastIndex, searchIndex),
        highlight: false
      });
    }

    // Add highlighted match
    parts.push({
      text: text.substring(searchIndex, searchIndex + searchQuery.length),
      highlight: true
    });

    lastIndex = searchIndex + searchQuery.length;
  }

  // Add remaining text after last match
  if (lastIndex < text.length) {
    parts.push({
      text: text.substring(lastIndex),
      highlight: false
    });
  }

  return parts.length > 0 ? parts : [{ text, highlight: false }];
}

