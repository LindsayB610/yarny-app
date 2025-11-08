import type { LocalBackupError } from "../../store/localBackupStore";
import { localBackupStore } from "../../store/localBackupStore";
import { LocalFsPathResolver, type NoteCategory } from "./LocalFsPathResolver";
import type { LocalFsRepository } from "./LocalFsRepository";

interface MirrorResult {
  success: boolean;
  skipped?: boolean;
  error?: unknown;
}

const ensuredStories = new Set<string>();
let lastRepository: LocalFsRepository | null = null;

const getErrorMessage = (error: unknown): string => {
  if (error instanceof DOMException) {
    return error.message || `${error.name} error while writing to local storage.`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return typeof error === "string" ? error : "Unknown error while writing local backup.";
};

const buildError = (error: unknown, code?: string): LocalBackupError => ({
  code,
  message: getErrorMessage(error),
  timestamp: new Date().toISOString()
});

const shouldMirror = (): boolean => {
  const state = localBackupStore.getState();
  return Boolean(state.enabled && state.permission === "granted" && state.repository);
};

const ensureRepository = (repository: LocalFsRepository | null): LocalFsRepository | null => {
  if (!repository) {
    return null;
  }

  if (repository !== lastRepository) {
    ensuredStories.clear();
    lastRepository = repository;
  }

  return repository;
};

const ensureStory = async (repository: LocalFsRepository, storyId: string) => {
  if (!storyId) {
    return;
  }
  if (ensuredStories.has(storyId)) {
    return;
  }
  await repository.ensureStoryStructure(storyId);
  ensuredStories.add(storyId);
};

const recordSuccess = () => {
  const { setLastSyncedAt, setError } = localBackupStore.getState();
  setLastSyncedAt(new Date().toISOString());
  setError(null);
};

const recordFailure = (error: unknown, code?: string) => {
  const { setError } = localBackupStore.getState();
  setError(buildError(error, code));
};

const runWithRepository = async (
  storyId: string | null,
  operation: (repository: LocalFsRepository) => Promise<void>
): Promise<MirrorResult> => {
  if (!shouldMirror()) {
    return { success: false, skipped: true };
  }

  const state = localBackupStore.getState();
  const repository = ensureRepository(state.repository);
  if (!repository) {
    return { success: false, skipped: true };
  }

  try {
    if (storyId) {
      await ensureStory(repository, storyId);
    }
    await operation(repository);
    recordSuccess();
    return { success: true };
  } catch (error) {
    recordFailure(error);
    return { success: false, error };
  }
};

export async function mirrorStoryIndex(content: string): Promise<MirrorResult> {
  return runWithRepository(null, async (repository) => {
    await repository.writeIndex(content);
  });
}

export async function mirrorDataJsonWrite(storyId: string, content: string): Promise<MirrorResult> {
  return runWithRepository(storyId, async (repository) => {
    await repository.writeDataJson(storyId, content);
  });
}

export async function mirrorProjectJsonWrite(
  storyId: string,
  content: string
): Promise<MirrorResult> {
  return runWithRepository(storyId, async (repository) => {
    await repository.writeProjectJson(storyId, content);
  });
}

export async function mirrorGoalJsonWrite(
  storyId: string,
  content: string
): Promise<MirrorResult> {
  return runWithRepository(storyId, async (repository) => {
    await repository.writeGoalJson(storyId, content);
  });
}

export async function mirrorSnippetWrite(
  storyId: string,
  snippetId: string,
  content: string
): Promise<MirrorResult> {
  return runWithRepository(storyId, async (repository) => {
    await repository.writeSnippet(storyId, snippetId, content);
  });
}

export async function mirrorStoryDocument(
  storyId: string,
  content: string
): Promise<MirrorResult> {
  return runWithRepository(storyId, async (repository) => {
    await repository.writeStoryDocument(storyId, content);
  });
}

export async function mirrorNoteWrite(
  storyId: string,
  category: NoteCategory,
  noteId: string,
  content: string
): Promise<MirrorResult> {
  return runWithRepository(storyId, async (repository) => {
    await repository.writeNote(storyId, category, noteId, content);
  });
}

export async function mirrorNoteOrderWrite(
  storyId: string,
  category: NoteCategory,
  content: string
): Promise<MirrorResult> {
  return runWithRepository(storyId, async (repository) => {
    await repository.writeNoteOrder(storyId, category, content);
  });
}

export async function mirrorAttachmentWrite(
  storyId: string,
  attachmentId: string,
  content: BlobPart | BlobPart[],
  mimeType?: string
): Promise<MirrorResult> {
  return runWithRepository(storyId, async (repository) => {
    await repository.writeAttachment(storyId, attachmentId, content, mimeType);
  });
}

export async function mirrorSnippetDelete(storyId: string, snippetId: string): Promise<MirrorResult> {
  return runWithRepository(storyId, async (repository) => {
    await repository.deleteEntry(LocalFsPathResolver.snippetFile(storyId, snippetId));
  });
}

export async function mirrorNoteDelete(
  storyId: string,
  category: NoteCategory,
  noteId: string
): Promise<MirrorResult> {
  return runWithRepository(storyId, async (repository) => {
    await repository.deleteEntry(LocalFsPathResolver.noteFile(storyId, category, noteId));
  });
}

export async function mirrorStoryFolderEnsure(storyId: string): Promise<MirrorResult> {
  return runWithRepository(storyId, async () => {
    // ensureStory is called in runWithRepository
  });
}


