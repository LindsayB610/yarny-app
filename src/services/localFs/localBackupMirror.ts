import type { LocalBackupError } from "../../store/localBackupStore";
import { localBackupStore } from "../../store/localBackupStore";
import type { Chapter, Snippet, Story, YarnyState } from "../../store/types";
import { LocalFsPathResolver, type NoteCategory } from "./LocalFsPathResolver";
import { createLocalFsRepository, type LocalFsRepository } from "./LocalFsRepository";
import { ensureDirectoryPermission } from "./LocalFsCapability";

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

const buildStoryDocumentFromState = (story: Story, state: YarnyState): string => {
  const contents: string[] = [];
  story.chapterIds.forEach((chapterId) => {
    const chapter = state.entities.chapters[chapterId];
    if (!chapter) {
      return;
    }
    chapter.snippetIds.forEach((snippetId) => {
      const snippet = state.entities.snippets[snippetId];
      if (snippet?.content) {
        contents.push(snippet.content);
      }
    });
  });
  return contents.join("\n\n");
};

const buildProjectJsonFromState = (story: Story, state: YarnyState) => ({
  name: story.title,
  groupIds: story.chapterIds,
  projectId: story.projectId,
  updatedAt: story.updatedAt,
  chapterCount: story.chapterIds.length,
  snippetCount: story.chapterIds.reduce((count, chapterId) => {
    const chapter = state.entities.chapters[chapterId];
    return count + (chapter?.snippetIds.length ?? 0);
  }, 0)
});

const buildDataJsonFromState = (story: Story, state: YarnyState) => {
  const groups: Record<string, unknown> = {};
  const snippets: Record<string, unknown> = {};

  story.chapterIds.forEach((chapterId, index) => {
    const chapter = state.entities.chapters[chapterId];
    if (!chapter) {
      return;
    }

    groups[chapterId] = {
      id: chapter.id,
      storyId: chapter.storyId,
      title: chapter.title,
      position: typeof chapter.order === "number" ? chapter.order : index,
      order: typeof chapter.order === "number" ? chapter.order : index,
      snippetIds: chapter.snippetIds,
      updatedAt: chapter.updatedAt
    };

    chapter.snippetIds.forEach((snippetId, snippetIndex) => {
      const snippet = state.entities.snippets[snippetId];
      if (!snippet) {
        return;
      }
      snippets[snippetId] = {
        id: snippet.id,
        storyId: snippet.storyId,
        chapterId: snippet.chapterId,
        groupId: snippet.chapterId,
        order:
          typeof snippet.order === "number" ? snippet.order : snippetIndex,
        content: snippet.content,
        body: snippet.content,
        updatedAt: snippet.updatedAt
      };
    });
  });

  return {
    groups,
    snippets
  };
};

export async function refreshAllStoriesToLocal(state: YarnyState): Promise<MirrorResult> {
  const store = localBackupStore.getState();
  store.setRefreshStatus("running", "Refreshing local backups...");

  const currentState = localBackupStore.getState();
  if (!currentState.enabled) {
    store.setRefreshStatus("error", "Enable local backups before running a full refresh.");
    return { success: false, skipped: true };
  }

  const handle = currentState.rootHandle;
  if (!handle) {
    store.setRefreshStatus("error", "Choose a local folder before running a full refresh.");
    return { success: false, skipped: true };
  }

  if (!currentState.repository) {
    const permission = await ensureDirectoryPermission(handle, "readwrite");
    store.setPermission(permission);
    if (permission !== "granted") {
      store.setRefreshStatus("error", "Grant write access to the selected folder to continue.");
      return { success: false, skipped: true };
    }

    const repository = await createLocalFsRepository(handle);
    if (!repository) {
      store.setRefreshStatus(
        "error",
        "Unable to access the selected folder. Try reconnecting the local backups folder."
      );
      return { success: false, error: new Error("Local repository unavailable") };
    }
    store.setRepository(repository);
  }

  if (!shouldMirror()) {
    store.setRefreshStatus("error", "Enable local backups before running a full refresh.");
    return { success: false, skipped: true };
  }

  const handleMirrorFailure = (result: MirrorResult): MirrorResult => {
    if (result.skipped) {
      store.setRefreshStatus("error", "Enable local backups before running a full refresh.");
      return { success: false, skipped: true };
    }

    const errorMessage = getErrorMessage(result.error);
    store.setRefreshStatus("error", errorMessage);
    return {
      success: false,
      error: result.error
    };
  };

  const ensureSuccess = async (operation: Promise<MirrorResult>): Promise<MirrorResult | null> => {
    const result = await operation;
    if (!result.success) {
      return handleMirrorFailure(result);
    }
    return null;
  };

  try {
    for (const story of Object.values(state.entities.stories)) {
      if (!story?.id) {
        continue;
      }

      const folderResult = await ensureSuccess(mirrorStoryFolderEnsure(story.id));
      if (folderResult) {
        return folderResult;
      }

      const projectJson = JSON.stringify(buildProjectJsonFromState(story, state), null, 2);
      const projectResult = await ensureSuccess(mirrorProjectJsonWrite(story.id, projectJson));
      if (projectResult) {
        return projectResult;
      }

      const dataJson = JSON.stringify(buildDataJsonFromState(story, state), null, 2);
      const dataResult = await ensureSuccess(mirrorDataJsonWrite(story.id, dataJson));
      if (dataResult) {
        return dataResult;
      }

      const documentContent = buildStoryDocumentFromState(story, state);
      const documentResult = await ensureSuccess(mirrorStoryDocument(story.id, documentContent));
      if (documentResult) {
        return documentResult;
      }

      const chapterIds = state.entities.stories[story.id]?.chapterIds ?? [];
      for (const chapterId of chapterIds) {
        const chapter: Chapter | undefined = state.entities.chapters[chapterId];
        if (!chapter) {
          continue;
        }
        for (const snippetId of chapter.snippetIds) {
          const snippet: Snippet | undefined = state.entities.snippets[snippetId];
          if (!snippet) {
            continue;
          }
          const snippetResult = await ensureSuccess(
            mirrorSnippetWrite(story.id, snippet.id, snippet.content ?? "")
          );
          if (snippetResult) {
            return snippetResult;
          }
        }
      }
    }

    store.setRefreshStatus("success", "Local backups refreshed successfully.");
    return { success: true };
  } catch (error) {
    recordFailure(error);
    store.setRefreshStatus("error", getErrorMessage(error));
    return { success: false, error };
  }
}


