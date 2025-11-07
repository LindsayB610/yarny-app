import type { Project, Story, Snippet, YarnyState } from "../../src/store/types";

export const createMockProject = (overrides?: Partial<Project>): Project => ({
  id: "project-1",
  name: "Test Project",
  driveFolderId: "drive-folder-1",
  storyIds: ["story-1"],
  updatedAt: "2025-01-01T00:00:00.000Z",
  ...overrides
});

export const createMockStory = (overrides?: Partial<Story>): Story => ({
  id: "story-1",
  projectId: "project-1",
  title: "Test Story",
  driveFileId: "drive-file-1",
  snippetIds: ["snippet-1"],
  updatedAt: "2025-01-01T00:00:00.000Z",
  ...overrides
});

export const createMockSnippet = (overrides?: Partial<Snippet>): Snippet => ({
  id: "snippet-1",
  storyId: "story-1",
  order: 1,
  content: "Test snippet content",
  updatedAt: "2025-01-01T00:00:00.000Z",
  ...overrides
});

export const createMockState = (overrides?: Partial<YarnyState>): YarnyState => {
  const project = createMockProject();
  const story = createMockStory();
  const snippet = createMockSnippet();

  return {
    entities: {
      projects: { [project.id]: project },
      projectOrder: [project.id],
      stories: { [story.id]: story },
      storyOrder: [story.id],
      snippets: { [snippet.id]: snippet }
    },
    ui: {
      selectedProjectId: project.id,
      activeStoryId: story.id,
      isSyncing: false,
      lastSyncedAt: "2025-01-01T00:00:00.000Z"
    },
    ...overrides
  };
};

// Large test data generators for performance testing
export const generateLargeStory = (numChapters: number, snippetsPerChapter: number) => {
  const story = createMockStory({ id: "large-story" });
  const snippets: Snippet[] = [];
  let snippetIdCounter = 1;

  for (let chapter = 1; chapter <= numChapters; chapter++) {
    for (let snippet = 1; snippet <= snippetsPerChapter; snippet++) {
      snippets.push(
        createMockSnippet({
          id: `snippet-${snippetIdCounter++}`,
          storyId: story.id,
          order: snippet,
          content: `Chapter ${chapter}, Snippet ${snippet} content. `.repeat(50) // ~500 words per snippet
        })
      );
    }
  }

  return {
    story: {
      ...story,
      snippetIds: snippets.map((s) => s.id)
    },
    snippets
  };
};

