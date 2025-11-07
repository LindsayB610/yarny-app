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
  snippetIds: EntityId[];
  updatedAt: string;
}

export interface Snippet {
  id: EntityId;
  storyId: EntityId;
  order: number;
  content: string;
  driveRevisionId?: string;
  updatedAt: string;
}

export type EntityMap<T extends { id: EntityId }> = Record<EntityId, T>;

export interface YarnyEntities {
  projects: EntityMap<Project>;
  projectOrder: EntityId[];
  stories: EntityMap<Story>;
  storyOrder: EntityId[];
  snippets: EntityMap<Snippet>;
}

export interface YarnyUIState {
  selectedProjectId?: EntityId;
  activeStoryId?: EntityId;
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
  snippets?: Snippet[];
}

export interface YarnyActions {
  selectProject: (projectId: EntityId | undefined) => void;
  selectStory: (storyId: EntityId | undefined) => void;
  setSyncing: (isSyncing: boolean) => void;
  setLastSyncedAt: (isoString: string) => void;
  upsertEntities: (payload: NormalizedPayload) => void;
  clear: () => void;
}

export type YarnyStore = YarnyState & YarnyActions;

