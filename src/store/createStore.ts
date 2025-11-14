import { immer } from "zustand/middleware/immer";
import { createStore } from "zustand/vanilla";

import type { Chapter, EntityId, NormalizedPayload, YarnyStore } from "./types";
import type { YarnyState } from "./types";

const createDefaultState = (): YarnyState => ({
  entities: {
    projects: {},
    projectOrder: [],
    stories: {},
    storyOrder: [],
    chapters: {},
    snippets: {}
  },
  ui: {
    selectedProjectId: undefined,
    activeStoryId: undefined,
    activeSnippetId: undefined,
    activeNote: undefined,
    isSyncing: false,
    lastSyncedAt: undefined
  }
});

const ensureOrder = (order: EntityId[], id: EntityId) => {
  if (!order.includes(id)) {
    order.push(id);
  }
};

const isIncomingNewerOrEqual = (existing?: string, incoming?: string) => {
  if (!incoming) {
    return false;
  }
  if (!existing) {
    return true;
  }

  const incomingTime = Date.parse(incoming);
  const existingTime = Date.parse(existing);

  if (Number.isNaN(incomingTime)) {
    return false;
  }
  if (Number.isNaN(existingTime)) {
    return true;
  }

  return incomingTime >= existingTime;
};

const removeSnippetFromChapter = (chapter: Chapter | undefined, snippetId: EntityId) => {
  if (!chapter) {
    return;
  }

  const index = chapter.snippetIds.indexOf(snippetId);
  if (index !== -1) {
    chapter.snippetIds.splice(index, 1);
  }
};

export const createYarnyStore = (initialState?: Partial<YarnyState>) => {
  const defaultState = createDefaultState();
  const baseState = {
    ...defaultState,
    ...initialState,
    entities: {
      ...defaultState.entities,
      ...initialState?.entities
    },
    ui: {
      ...defaultState.ui,
      ...initialState?.ui
    }
  };

  return createStore<YarnyStore>()(
    immer((set) => ({
      ...baseState,
      selectProject(projectId) {
        set((draft) => {
          draft.ui.selectedProjectId = projectId;
          if (projectId && !draft.entities.projects[projectId]) {
            draft.entities.projects[projectId] = {
              id: projectId,
              name: "Unknown Project",
              driveFolderId: "",
              storyIds: [],
              updatedAt: new Date(0).toISOString()
            };
          }
        });
      },
      selectStory(storyId) {
        console.log("[Store] selectStory called:", storyId, "current:", baseState.ui.activeStoryId, new Error().stack?.split("\n")[2]?.trim());
        set((draft) => {
          draft.ui.activeStoryId = storyId;
          draft.ui.activeSnippetId = undefined;
          draft.ui.activeNote = undefined;
        });
      },
      selectSnippet(snippetId) {
        set((draft) => {
          draft.ui.activeSnippetId = snippetId;
          if (snippetId) {
            draft.ui.activeNote = undefined;
          }
        });
      },
      selectNote(selection) {
        set((draft) => {
          draft.ui.activeNote = selection;
          if (selection) {
            draft.ui.activeSnippetId = undefined;
          }
        });
      },
      setSyncing(isSyncing) {
        set((draft) => {
          draft.ui.isSyncing = isSyncing;
        });
      },
      setLastSyncedAt(isoString) {
        set((draft) => {
          draft.ui.lastSyncedAt = isoString;
        });
      },
      upsertEntities(payload: NormalizedPayload) {
        set((draft) => {
          payload.projects?.forEach((project) => {
            const existing = draft.entities.projects[project.id];
            if (!existing || isIncomingNewerOrEqual(existing.updatedAt, project.updatedAt)) {
              draft.entities.projects[project.id] = project;
            }
            ensureOrder(draft.entities.projectOrder, project.id);
          });

          payload.stories?.forEach((story) => {
            const existing = draft.entities.stories[story.id];
            if (!existing || isIncomingNewerOrEqual(existing.updatedAt, story.updatedAt)) {
              const incomingTitle = story.title?.trim();
              const existingTitle = existing?.title?.trim();
              const placeholderTitles = new Set(["New Project", "Untitled Story"]);
              const shouldPreserveExistingTitle =
                Boolean(existing) &&
                Boolean(existingTitle) &&
                existingTitle !== incomingTitle &&
                Boolean(incomingTitle) &&
                placeholderTitles.has(incomingTitle);

              draft.entities.stories[story.id] = shouldPreserveExistingTitle
                ? { ...story, title: existing.title }
                : story;
            }
            ensureOrder(draft.entities.storyOrder, story.id);
            const project = draft.entities.projects[story.projectId];
            if (project && !project.storyIds.includes(story.id)) {
              project.storyIds.push(story.id);
            }
          });

          payload.chapters?.forEach((chapter) => {
            const existing = draft.entities.chapters[chapter.id];
            if (!existing || isIncomingNewerOrEqual(existing.updatedAt, chapter.updatedAt)) {
              draft.entities.chapters[chapter.id] = chapter;
            }
            const story = draft.entities.stories[chapter.storyId];
            if (story && !story.chapterIds.includes(chapter.id)) {
              story.chapterIds.push(chapter.id);
              // Sort chapters by order
              story.chapterIds.sort(
                (a, b) =>
                  (draft.entities.chapters[a]?.order ?? 0) -
                  (draft.entities.chapters[b]?.order ?? 0)
              );
            }
          });

          payload.snippets?.forEach((snippet) => {
            const existing = draft.entities.snippets[snippet.id];
            if (!existing || isIncomingNewerOrEqual(existing.updatedAt, snippet.updatedAt)) {
              draft.entities.snippets[snippet.id] = snippet;
            }
            const chapter = draft.entities.chapters[snippet.chapterId];
            if (chapter && !chapter.snippetIds.includes(snippet.id)) {
              chapter.snippetIds.push(snippet.id);
              // Sort snippets by order within chapter
              chapter.snippetIds.sort(
                (a, b) =>
                  (draft.entities.snippets[a]?.order ?? 0) -
                  (draft.entities.snippets[b]?.order ?? 0)
              );
            }
          });
        });
      },
      removeChapter(chapterId) {
        set((draft) => {
          const chapter = draft.entities.chapters[chapterId];
          if (!chapter) {
            return;
          }

          // Delete all snippets associated with this chapter
          chapter.snippetIds.forEach((snippetId) => {
            delete draft.entities.snippets[snippetId];
            if (draft.ui.activeSnippetId === snippetId) {
              draft.ui.activeSnippetId = undefined;
            }
          });

          // Remove the chapter from its story
          const story = draft.entities.stories[chapter.storyId];
          if (story) {
            story.chapterIds = story.chapterIds.filter((id) => id !== chapterId);
          }

          delete draft.entities.chapters[chapterId];
        });
      },
      removeSnippet(snippetId) {
        set((draft) => {
          const snippet = draft.entities.snippets[snippetId];
          if (snippet) {
            const chapter = draft.entities.chapters[snippet.chapterId];
            removeSnippetFromChapter(chapter, snippetId);
          } else {
            // Ensure snippet references are removed even if entity is missing
            Object.values(draft.entities.chapters).forEach((chapter) => {
              removeSnippetFromChapter(chapter, snippetId);
            });
          }

          delete draft.entities.snippets[snippetId];
          if (draft.ui.activeSnippetId === snippetId) {
            draft.ui.activeSnippetId = undefined;
          }
        });
      },
      clear() {
        set(() => createDefaultState());
      }
    }))
  );
};

export type YarnyStoreApi = ReturnType<typeof createYarnyStore>;

