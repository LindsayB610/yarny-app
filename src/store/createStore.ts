import { immer } from "zustand/middleware/immer";
import { createStore } from "zustand/vanilla";

import type { EntityId, NormalizedPayload, YarnyStore } from "./types";
import type { YarnyState } from "./types";

const createDefaultState = (): YarnyState => ({
  entities: {
    projects: {},
    projectOrder: [],
    stories: {},
    storyOrder: [],
    snippets: {}
  },
  ui: {
    selectedProjectId: undefined,
    activeStoryId: undefined,
    isSyncing: false,
    lastSyncedAt: undefined
  }
});

const ensureOrder = (order: EntityId[], id: EntityId) => {
  if (!order.includes(id)) {
    order.push(id);
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
        set((draft) => {
          draft.ui.activeStoryId = storyId;
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
            draft.entities.projects[project.id] = project;
            ensureOrder(draft.entities.projectOrder, project.id);
          });

          payload.stories?.forEach((story) => {
            draft.entities.stories[story.id] = story;
            ensureOrder(draft.entities.storyOrder, story.id);
            const project = draft.entities.projects[story.projectId];
            if (project && !project.storyIds.includes(story.id)) {
              project.storyIds.push(story.id);
            }
          });

          payload.snippets?.forEach((snippet) => {
            draft.entities.snippets[snippet.id] = snippet;
            const story = draft.entities.stories[snippet.storyId];
            if (story && !story.snippetIds.includes(snippet.id)) {
              story.snippetIds.push(snippet.id);
              story.snippetIds.sort(
                (a, b) =>
                  (draft.entities.snippets[a]?.order ?? 0) -
                  (draft.entities.snippets[b]?.order ?? 0)
              );
            }
          });
        });
      },
      clear() {
        set(() => createDefaultState());
      }
    }))
  );
};

export type YarnyStoreApi = ReturnType<typeof createYarnyStore>;

