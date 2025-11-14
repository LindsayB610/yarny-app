import type {
  Chapter,
  Content,
  EntityId,
  Note,
  NoteKind,
  Snippet,
  Story,
  YarnyStore,
} from "./types";

const notNil = <T>(value: T | null | undefined): value is T => value != null;

export const selectProjectSummaries = (state: YarnyStore) =>
  state.entities.projectOrder
    .map((projectId) => state.entities.projects[projectId])
    .filter(notNil)
    .map((project) => ({
      ...project,
      storyCount: project.storyIds.length,
      updatedAt: project.updatedAt,
    }));

export const selectStoriesForSelectedProject = (state: YarnyStore): Story[] => {
  const projectId = state.ui.selectedProjectId;
  if (!projectId) {
    return [];
  }

  const project = state.entities.projects[projectId];
  if (!project) {
    return [];
  }

  return project.storyIds
    .map((storyId) => state.entities.stories[storyId])
    .filter(notNil)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
};

export const selectActiveStory = (state: YarnyStore): Story | undefined => {
  const { activeStoryId } = state.ui;
  if (!activeStoryId) {
    return undefined;
  }

  return state.entities.stories[activeStoryId];
};

export const selectActiveSnippetId = (state: YarnyStore): EntityId | undefined =>
  state.ui.activeSnippetId;

export const selectActiveSnippet = (state: YarnyStore): Snippet | undefined => {
  const activeSnippetId = state.ui.activeSnippetId;
  if (!activeSnippetId) {
    return undefined;
  }
  return state.entities.snippets[activeSnippetId];
};

export const selectActiveNote = (state: YarnyStore) => state.ui.activeNote;

export const selectActiveContent = (state: YarnyStore): Content | undefined => {
  const { activeContentId, activeContentType } = state.ui;
  if (!activeContentId || !activeContentType) {
    return undefined;
  }

  if (activeContentType === "snippet") {
    return state.entities.snippets[activeContentId];
  } else if (activeContentType === "note") {
    return state.entities.notes[activeContentId];
  }

  return undefined;
};

export const selectNotesByKind = (state: YarnyStore, storyId: EntityId, kind: NoteKind): Note[] => {
  const notes = Object.values(state.entities.notes).filter(
    (note) => note.storyId === storyId && note.kind === kind,
  );
  return notes.sort((a, b) => a.order - b.order);
};

export const selectAllContentForStory = (state: YarnyStore, storyId: EntityId): Content[] => {
  const snippets = selectStorySnippets(state, storyId);
  const notes = Object.values(state.entities.notes).filter((note) => note.storyId === storyId);
  return [...snippets, ...notes];
};

export const selectActiveStoryChapters = (state: YarnyStore): Chapter[] => {
  const story = selectActiveStory(state);
  if (!story) {
    return [];
  }

  return story.chapterIds
    .map((id) => state.entities.chapters[id])
    .filter(notNil)
    .sort((a, b) => a.order - b.order);
};

export const selectStoryChapters = (state: YarnyStore, storyId: EntityId): Chapter[] => {
  const story = state.entities.stories[storyId];
  if (!story) {
    return [];
  }

  return story.chapterIds
    .map((id) => state.entities.chapters[id])
    .filter(notNil)
    .sort((a, b) => a.order - b.order);
};

export const selectSnippetsForChapter = (state: YarnyStore, chapterId: EntityId): Snippet[] => {
  const chapter = state.entities.chapters[chapterId];
  if (!chapter) {
    return [];
  }

  return chapter.snippetIds
    .map((id) => state.entities.snippets[id])
    .filter(notNil)
    .sort((a, b) => a.order - b.order);
};

export const selectActiveStorySnippets = (state: YarnyStore): Snippet[] => {
  const chapters = selectActiveStoryChapters(state);
  const allSnippets: Snippet[] = [];

  chapters.forEach((chapter) => {
    const chapterSnippets = selectSnippetsForChapter(state, chapter.id);
    allSnippets.push(...chapterSnippets);
  });

  return allSnippets;
};

export const selectStorySnippets = (state: YarnyStore, storyId: EntityId): Snippet[] => {
  const story = state.entities.stories[storyId];
  if (!story) {
    return [];
  }

  const allSnippets: Snippet[] = [];
  story.chapterIds.forEach((chapterId) => {
    const chapterSnippets = selectSnippetsForChapter(state, chapterId);
    allSnippets.push(...chapterSnippets);
  });

  return allSnippets;
};

export const selectIsSyncing = (state: YarnyStore): boolean => state.ui.isSyncing;

export const selectLastSyncedAt = (state: YarnyStore): string | undefined => state.ui.lastSyncedAt;
