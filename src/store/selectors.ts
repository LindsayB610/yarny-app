import type { Chapter, EntityId, Snippet, Story, YarnyStore } from "./types";

const notNil = <T>(value: T | null | undefined): value is T => value != null;

export const selectProjectSummaries = (state: YarnyStore) =>
  state.entities.projectOrder
    .map((projectId) => state.entities.projects[projectId])
    .filter(notNil)
    .map((project) => ({
      ...project,
      storyCount: project.storyIds.length,
      updatedAt: project.updatedAt
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
    .sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
};

export const selectActiveStory = (state: YarnyStore): Story | undefined => {
  const { activeStoryId } = state.ui;
  if (!activeStoryId) {
    return undefined;
  }

  return state.entities.stories[activeStoryId];
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

export const selectSnippetsForChapter = (
  state: YarnyStore,
  chapterId: EntityId
): Snippet[] => {
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

export const selectIsSyncing = (state: YarnyStore): boolean =>
  state.ui.isSyncing;

export const selectLastSyncedAt = (state: YarnyStore): string | undefined =>
  state.ui.lastSyncedAt;

