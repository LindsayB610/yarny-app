import { normalizePlainText } from "../../editor/textExtraction";
import type { Chapter, Snippet } from "../../store/types";

/**
 * Loads chapters and snippets from the file system based on metadata
 */
export async function loadChaptersAndSnippets(
  rootHandle: FileSystemDirectoryHandle,
  chapterMetadata: Array<{
    id: string;
    title: string;
    order: number;
    snippetIds: string[];
  }>,
  storyId: string
): Promise<{ chapters: Chapter[]; snippets: Snippet[] }> {
  const chapters: Chapter[] = [];
  const snippets: Snippet[] = [];

  // Get drafts directory
  let draftsHandle: FileSystemDirectoryHandle;
  try {
    draftsHandle = await rootHandle.getDirectoryHandle("drafts");
  } catch (error) {
    if ((error as DOMException).name === "NotFoundError") {
      // No drafts directory - return empty
      return { chapters: [], snippets: [] };
    }
    throw error;
  }

  // Load each chapter
  for (const chapterMeta of chapterMetadata) {
    const chapterId = chapterMeta.id; // e.g., "chapter-1"
    
    let chapterHandle: FileSystemDirectoryHandle;
    try {
      chapterHandle = await draftsHandle.getDirectoryHandle(chapterId);
    } catch (error) {
      if ((error as DOMException).name === "NotFoundError") {
        // Chapter folder doesn't exist - skip it
        continue;
      }
      throw error;
    }

    // Load snippets for this chapter
    const chapterSnippets: Snippet[] = [];
    for (const snippetId of chapterMeta.snippetIds) {
      const fileName = `${snippetId}.md`;
      try {
        const fileHandle = await chapterHandle.getFileHandle(fileName);
        const file = await fileHandle.getFile();
        const content = await file.text();

        chapterSnippets.push({
          id: snippetId,
          storyId,
          chapterId,
          order: chapterMeta.snippetIds.indexOf(snippetId),
          content: normalizePlainText(content),
          updatedAt: file.lastModified ? new Date(file.lastModified).toISOString() : new Date().toISOString()
        });
      } catch (error) {
        if ((error as DOMException).name === "NotFoundError") {
          // Snippet file doesn't exist - skip it
          continue;
        }
        throw error;
      }
    }

    snippets.push(...chapterSnippets);

    chapters.push({
      id: chapterId,
      storyId,
      title: chapterMeta.title,
      order: chapterMeta.order,
      snippetIds: chapterMeta.snippetIds.filter((id) =>
        chapterSnippets.some((s) => s.id === id)
      ),
      driveFolderId: "",
      updatedAt: new Date().toISOString()
    });
  }

  return { chapters, snippets };
}

