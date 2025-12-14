import type { Note } from "../../store/types";

export type NoteCategory = "characters" | "worldbuilding";

/**
 * Loads notes from a local file system directory
 * Scans Characters/ or Worldbuilding/ folders for markdown files
 */
export async function loadNotesFromLocal(
  rootHandle: FileSystemDirectoryHandle,
  noteCategory: NoteCategory
): Promise<Note[]> {
  const folderName = noteCategory === "characters" ? "Characters" : "Worldbuilding";
  const kind = noteCategory === "characters" ? "character" : "worldbuilding";
  
  // Try to get the notes folder
  let notesFolderHandle: FileSystemDirectoryHandle;
  try {
    notesFolderHandle = await rootHandle.getDirectoryHandle(folderName);
  } catch (error) {
    if ((error as DOMException).name === "NotFoundError") {
      // No notes folder - return empty array
      return [];
    }
    throw error;
  }

  const notes: Note[] = [];
  
  // Load order file if it exists
  let noteOrder: string[] = [];
  try {
    const orderFileHandle = await notesFolderHandle.getFileHandle("_order.json");
    const orderFile = await orderFileHandle.getFile();
    const orderContent = await orderFile.text();
    const parsed = JSON.parse(orderContent) as { order?: unknown };
    if (Array.isArray(parsed.order)) {
      noteOrder = parsed.order.filter((id): id is string => typeof id === "string");
    }
  } catch (error) {
    // Order file doesn't exist or can't be read - that's okay
    if ((error as DOMException).name !== "NotFoundError") {
      console.warn(`Failed to read notes order for ${folderName}:`, error);
    }
  }

  // Scan for markdown files
  const noteFiles: Array<{ name: string; content: string; lastModified: number }> = [];
  for await (const entry of notesFolderHandle.values()) {
    if (entry.kind === "file" && (entry.name.endsWith(".md") || entry.name.endsWith(".txt"))) {
      // Skip the order file
      if (entry.name === "_order.json") {
        continue;
      }
      
      try {
        const fileHandle = await notesFolderHandle.getFileHandle(entry.name);
        const file = await fileHandle.getFile();
        const content = await file.text();
        noteFiles.push({
          name: entry.name,
          content,
          lastModified: file.lastModified
        });
      } catch (error) {
        console.error(`Error reading note file ${entry.name}:`, error);
      }
    }
  }

  // Create note entities
  for (let index = 0; index < noteFiles.length; index++) {
    const { name, content, lastModified } = noteFiles[index];
    
    // Use filename (without extension) as note ID
    const noteId = name.replace(/\.(md|txt)$/, "");
    
    // Determine order: use order from _order.json if available, otherwise use index
    const orderIndex = noteOrder.indexOf(noteId);
    const order = orderIndex !== -1 ? orderIndex : index;
    
    // Generate a story ID - for local projects, we'll need to get this from context
    // For now, we'll use a placeholder that will be replaced when upserting
    const storyId = ""; // Will be set by caller
    
    notes.push({
      id: noteId,
      storyId, // Will be set by caller
      kind,
      order,
      content,
      updatedAt: lastModified ? new Date(lastModified).toISOString() : new Date().toISOString()
    });
  }

  // Sort by order
  if (noteOrder.length > 0) {
    const orderMap = new Map<string, number>();
    noteOrder.forEach((id, index) => {
      orderMap.set(id, index);
    });
    
    notes.sort((a, b) => {
      const indexA = orderMap.has(a.id) ? orderMap.get(a.id)! : Number.MAX_SAFE_INTEGER;
      const indexB = orderMap.has(b.id) ? orderMap.get(b.id)! : Number.MAX_SAFE_INTEGER;
      
      if (indexA !== indexB) {
        return indexA - indexB;
      }
      
      return a.id.localeCompare(b.id, undefined, { sensitivity: "base" });
    });
  } else {
    // Sort by filename if no order file
    notes.sort((a, b) => a.id.localeCompare(b.id, undefined, { sensitivity: "base" }));
  }

  return notes;
}

