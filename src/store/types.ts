export type EntityId = string;

export interface Project {
  id: EntityId;
  name: string;
  driveFolderId: string;
  storyIds: EntityId[];
  updatedAt: string;
}

export interface Story {
  id: EntityId;
  projectId: EntityId;
  title: string;
  driveFileId: string;
  chapterIds: EntityId[]; // Ordered list of chapter IDs
  updatedAt: string;
}

export interface Chapter {
  id: EntityId;
  storyId: EntityId;
  title: string;
  color?: string;
  order: number;
  snippetIds: EntityId[]; // Ordered list of snippet IDs within this chapter
  driveFolderId: string;
  updatedAt: string;
}

export interface Snippet {
  id: EntityId;
  storyId: EntityId;
  chapterId: EntityId; // Snippet belongs to a chapter
  order: number;
  content: string;
  driveRevisionId?: string;
  driveFileId?: string;
  updatedAt: string;
}

export type EntityMap<T extends { id: EntityId }> = Record<EntityId, T>;

export interface YarnyEntities {
  projects: EntityMap<Project>;
  projectOrder: EntityId[];
  stories: EntityMap<Story>;
  storyOrder: EntityId[];
  chapters: EntityMap<Chapter>;
  snippets: EntityMap<Snippet>;
}

export interface YarnyUIState {
  selectedProjectId?: EntityId;
  activeStoryId?: EntityId;
  activeSnippetId?: EntityId;
  activeNote?: {
    id: EntityId;
    type: "people" | "places" | "things";
  };
  isSyncing: boolean;
  lastSyncedAt?: string;
}

export interface YarnyState {
  entities: YarnyEntities;
  ui: YarnyUIState;
}

export interface NormalizedPayload {
  projects?: Project[];
  stories?: Story[];
  chapters?: Chapter[];
  snippets?: Snippet[];
}

export interface YarnyActions {
  selectProject: (projectId: EntityId | undefined) => void;
  selectStory: (storyId: EntityId | undefined) => void;
  selectSnippet: (snippetId: EntityId | undefined) => void;
  selectNote: (
    selection:
      | {
          id: EntityId;
          type: "people" | "places" | "things";
        }
      | undefined
  ) => void;
  setSyncing: (isSyncing: boolean) => void;
  setLastSyncedAt: (isoString: string) => void;
  upsertEntities: (payload: NormalizedPayload) => void;
  removeChapter: (chapterId: EntityId) => void;
  removeSnippet: (snippetId: EntityId) => void;
  clear: () => void;
}

export type YarnyStore = YarnyState & YarnyActions;

