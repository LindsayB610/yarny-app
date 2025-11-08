import { LocalFsPathResolver, type NoteCategory } from "./LocalFsPathResolver";

type FileContent = BlobPart | BlobPart[];

interface WriteOptions {
  type?: string;
}

const isBrowser = typeof window !== "undefined";

export class LocalFsRepository {
  constructor(private readonly rootHandle: FileSystemDirectoryHandle) {}

  static async initialize(handle: FileSystemDirectoryHandle): Promise<LocalFsRepository> {
    const repo = new LocalFsRepository(handle);
    await repo.ensureBaseStructure();
    return repo;
  }

  private async ensureDirectory(pathSegments: string[]): Promise<FileSystemDirectoryHandle> {
    let current = this.rootHandle;
    for (const segment of pathSegments) {
      current = await current.getDirectoryHandle(segment, { create: true });
    }
    return current;
  }

  private async ensureBaseStructure(): Promise<void> {
    await this.rootHandle.getDirectoryHandle("stories", { create: true });
    await this.rootHandle.getDirectoryHandle("index", { create: true });
    await this.rootHandle.getDirectoryHandle("exports", { create: true });
  }

  async ensureStoryStructure(storyId: string): Promise<void> {
    if (!storyId) {
      return;
    }

    await this.ensureDirectory(LocalFsPathResolver.storyRoot(storyId));
    await this.ensureDirectory(LocalFsPathResolver.metadataDirectory(storyId));
    await this.ensureDirectory(LocalFsPathResolver.notesDirectory(storyId));
    await this.ensureDirectory(LocalFsPathResolver.snippetsDirectory(storyId));
    await this.ensureDirectory(LocalFsPathResolver.attachmentsDirectory(storyId));
  }

  private async writeFile(pathSegments: string[], content: FileContent, options: WriteOptions = {}) {
    const directorySegments = pathSegments.slice(0, -1);
    const fileName = pathSegments[pathSegments.length - 1];
    const directory = await this.ensureDirectory(directorySegments);
    const fileHandle = await directory.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();

    const data = options.type ? new Blob([content], { type: options.type }) : new Blob([content]);

    await writable.write(data);
    await writable.close();
  }

  async writeStoryDocument(storyId: string, content: string): Promise<void> {
    await this.writeFile(LocalFsPathResolver.storyDocument(storyId), content, {
      type: "text/markdown"
    });
  }

  async writeDataJson(storyId: string, json: string): Promise<void> {
    await this.writeFile(LocalFsPathResolver.dataFile(storyId), json, {
      type: "application/json"
    });
  }

  async writeProjectJson(storyId: string, json: string): Promise<void> {
    await this.writeFile(LocalFsPathResolver.projectFile(storyId), json, {
      type: "application/json"
    });
  }

  async writeGoalJson(storyId: string, json: string): Promise<void> {
    await this.writeFile(LocalFsPathResolver.goalFile(storyId), json, {
      type: "application/json"
    });
  }

  async writeSnippet(storyId: string, snippetId: string, content: string): Promise<void> {
    await this.writeFile(LocalFsPathResolver.snippetFile(storyId, snippetId), content, {
      type: "text/markdown"
    });
  }

  async writeNote(
    storyId: string,
    category: NoteCategory,
    noteId: string,
    content: string
  ): Promise<void> {
    await this.ensureDirectory(LocalFsPathResolver.noteCategoryDirectory(storyId, category));
    await this.writeFile(LocalFsPathResolver.noteFile(storyId, category, noteId), content, {
      type: "text/markdown"
    });
  }

  async writeNoteOrder(
    storyId: string,
    category: NoteCategory,
    content: string
  ): Promise<void> {
    await this.ensureDirectory(LocalFsPathResolver.noteCategoryDirectory(storyId, category));
    await this.writeFile(LocalFsPathResolver.noteOrderFile(storyId, category), content, {
      type: "application/json"
    });
  }

  async writeAttachment(storyId: string, attachmentId: string, content: FileContent, type?: string) {
    await this.writeFile(LocalFsPathResolver.attachmentFile(storyId, attachmentId), content, {
      type
    });
  }

  async writeIndex(content: string): Promise<void> {
    await this.ensureDirectory(LocalFsPathResolver.indexDirectory());
    await this.writeFile(LocalFsPathResolver.indexFile(), content, {
      type: "application/json"
    });
  }

  async writeExportFile(fileName: string, content: string, type = "text/markdown"): Promise<void> {
    await this.ensureDirectory(LocalFsPathResolver.exportsDirectory());
    await this.writeFile(LocalFsPathResolver.exportFile(fileName), content, {
      type
    });
  }

  async deleteEntry(pathSegments: string[], options: { recursive?: boolean } = {}): Promise<void> {
    const directorySegments = pathSegments.slice(0, -1);
    const name = pathSegments[pathSegments.length - 1];
    const directory = await this.ensureDirectory(directorySegments);
    try {
      await directory.removeEntry(name, { recursive: options.recursive ?? false });
    } catch (error) {
      if ((error as DOMException).name !== "NotFoundError") {
        console.warn("[LocalFsRepository] Failed to delete entry", error);
      }
    }
  }
}

export const createLocalFsRepository = async (
  handle: FileSystemDirectoryHandle | null | undefined
): Promise<LocalFsRepository | null> => {
  if (!isBrowser || !handle) {
    return null;
  }

  try {
    return await LocalFsRepository.initialize(handle);
  } catch (error) {
    console.warn("[LocalFsRepository] Failed to initialize repository", error);
    return null;
  }
};


