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

export interface BaseContent {
  id: EntityId;
  storyId: EntityId;
  content: string;
  driveFileId?: string;
  updatedAt: string;
}

export interface Snippet extends BaseContent {
  chapterId: EntityId; // Snippet belongs to a chapter
  order: number;
  driveRevisionId?: string;
}

export type NoteKind = "person" | "place" | "thing";

export interface Note extends BaseContent {
  kind: NoteKind;
  order: number; // For ordering within kind
}

export type Content = Snippet | Note;

export type EntityMap<T extends { id: EntityId }> = Record<EntityId, T>;

export interface YarnyEntities {
  projects: EntityMap<Project>;
  projectOrder: EntityId[];
  stories: EntityMap<Story>;
  storyOrder: EntityId[];
  chapters: EntityMap<Chapter>;
  snippets: EntityMap<Snippet>;
  notes: EntityMap<Note>;
}

export interface YarnyUIState {
  selectedProjectId?: EntityId;
  activeStoryId?: EntityId;
  activeContentId?: EntityId;
  activeContentType?: "snippet" | "note";
  // Legacy fields for backward compatibility during migration
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
  notes?: Note[];
}

export interface YarnyActions {
  selectProject: (projectId: EntityId | undefined) => void;
  selectStory: (storyId: EntityId | undefined) => void;
  selectContent: (contentId: EntityId | undefined, contentType: "snippet" | "note") => void;
  // Legacy actions for backward compatibility during migration
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
  removeNote: (noteId: EntityId) => void;
  clear: () => void;
}

export type YarnyStore = YarnyState & YarnyActions;

