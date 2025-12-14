import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type * as ReactRouterDom from "react-router-dom";

import { createYarnyStore } from "@/store/createStore";
import { YarnyStoreContext } from "@/store/provider";
import type { YarnyState } from "@/store/types";
import { useGlobalSearch } from "./useGlobalSearch";

const mockUseParams = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof ReactRouterDom>("react-router-dom");
  return {
    ...actual,
    useParams: () => mockUseParams()
  };
});

// Helper to create a test wrapper with store and router
function createWrapper(initialState?: Partial<YarnyState>) {
  const store = createYarnyStore(initialState);
  return ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter>
      <YarnyStoreContext.Provider value={store}>
        {children}
      </YarnyStoreContext.Provider>
    </MemoryRouter>
  );
}

describe("useGlobalSearch", () => {
  const mockStoryId = "story-1";
  const mockChapterId = "chapter-1";
  const mockSnippetId = "snippet-1";
  const mockCharacterId = "character-1";
  const mockWorldbuildingId = "worldbuilding-1";

  const baseState: Partial<YarnyState> = {
    entities: {
      projects: {
        "project-1": {
          id: "project-1",
          name: "Test Project",
          driveFolderId: "drive-folder-1",
          storyIds: [mockStoryId],
          updatedAt: new Date().toISOString()
        }
      },
      projectOrder: ["project-1"],
      stories: {
        [mockStoryId]: {
          id: mockStoryId,
          projectId: "project-1",
          title: "Test Story",
          driveFileId: mockStoryId,
          chapterIds: [mockChapterId],
          updatedAt: new Date().toISOString()
        }
      },
      storyOrder: [mockStoryId],
      chapters: {
        [mockChapterId]: {
          id: mockChapterId,
          storyId: mockStoryId,
          title: "Chapter One",
          order: 0,
          snippetIds: [mockSnippetId],
          driveFolderId: "chapter-folder-1",
          updatedAt: new Date().toISOString()
        }
      },
      snippets: {
        [mockSnippetId]: {
          id: mockSnippetId,
          storyId: mockStoryId,
          chapterId: mockChapterId,
          content: "This is the first snippet content",
          order: 0,
          updatedAt: new Date().toISOString()
        }
      },
      notes: {
        [mockCharacterId]: {
          id: mockCharacterId,
          storyId: mockStoryId,
          kind: "character",
          content: "# John Doe\n\nA brave warrior",
          order: 0,
          updatedAt: new Date().toISOString()
        },
        [mockWorldbuildingId]: {
          id: mockWorldbuildingId,
          storyId: mockStoryId,
          kind: "worldbuilding",
          content: "# The Kingdom\n\nA vast realm",
          order: 0,
          updatedAt: new Date().toISOString()
        }
      }
    },
    ui: {
      selectedProjectId: "project-1",
      activeStoryId: mockStoryId
    }
  };

  beforeEach(() => {
    mockUseParams.mockReturnValue({ storyId: mockStoryId });
  });

  it("returns empty array when search term is empty", () => {
    const { result } = renderHook(() => useGlobalSearch(""), {
      wrapper: createWrapper(baseState)
    });

    expect(result.current).toEqual([]);
  });

  it("returns empty array when search term is only whitespace", () => {
    const { result } = renderHook(() => useGlobalSearch("   "), {
      wrapper: createWrapper(baseState)
    });

    expect(result.current).toEqual([]);
  });

  it("searches chapters by title", () => {
    const { result } = renderHook(() => useGlobalSearch("Chapter One"), {
      wrapper: createWrapper(baseState)
    });

    expect(result.current.length).toBeGreaterThan(0);
    const chapterResult = result.current.find((r) => r.type === "chapter");
    expect(chapterResult).toBeDefined();
    expect(chapterResult?.title).toBe("Chapter One");
  });

  it("searches snippets by first line", () => {
    const { result } = renderHook(() => useGlobalSearch("first snippet"), {
      wrapper: createWrapper(baseState)
    });

    expect(result.current.length).toBeGreaterThan(0);
    const snippetResult = result.current.find((r) => r.type === "snippet");
    expect(snippetResult).toBeDefined();
    expect(snippetResult?.title).toContain("first snippet");
  });

  it("searches snippets by content", () => {
    const { result } = renderHook(() => useGlobalSearch("content"), {
      wrapper: createWrapper(baseState)
    });

    expect(result.current.length).toBeGreaterThan(0);
    const snippetResult = result.current.find((r) => r.type === "snippet");
    expect(snippetResult).toBeDefined();
    expect(snippetResult?.preview).toContain("content");
  });

  it("searches characters by name", () => {
    const { result } = renderHook(() => useGlobalSearch("John"), {
      wrapper: createWrapper(baseState)
    });

    expect(result.current.length).toBeGreaterThan(0);
    const characterResult = result.current.find((r) => r.type === "character");
    expect(characterResult).toBeDefined();
    expect(characterResult?.title).toContain("John");
  });

  it("searches characters by content", () => {
    const { result } = renderHook(() => useGlobalSearch("warrior"), {
      wrapper: createWrapper(baseState)
    });

    expect(result.current.length).toBeGreaterThan(0);
    const characterResult = result.current.find((r) => r.type === "character");
    expect(characterResult).toBeDefined();
    expect(characterResult?.preview).toContain("warrior");
  });

  it("searches worldbuilding by name", () => {
    const { result } = renderHook(() => useGlobalSearch("Kingdom"), {
      wrapper: createWrapper(baseState)
    });

    expect(result.current.length).toBeGreaterThan(0);
    const worldbuildingResult = result.current.find((r) => r.type === "worldbuilding");
    expect(worldbuildingResult).toBeDefined();
    expect(worldbuildingResult?.title).toContain("Kingdom");
  });

  it("searches worldbuilding by content", () => {
    const { result } = renderHook(() => useGlobalSearch("realm"), {
      wrapper: createWrapper(baseState)
    });

    expect(result.current.length).toBeGreaterThan(0);
    const worldbuildingResult = result.current.find((r) => r.type === "worldbuilding");
    expect(worldbuildingResult).toBeDefined();
    expect(worldbuildingResult?.preview).toContain("realm");
  });

  it("is case-insensitive", () => {
    const { result } = renderHook(() => useGlobalSearch("chapter one"), {
      wrapper: createWrapper(baseState)
    });

    expect(result.current.length).toBeGreaterThan(0);
    const chapterResult = result.current.find((r) => r.type === "chapter");
    expect(chapterResult).toBeDefined();
  });

  it("includes chapter title in snippet results", () => {
    const { result } = renderHook(() => useGlobalSearch("snippet"), {
      wrapper: createWrapper(baseState)
    });

    const snippetResult = result.current.find((r) => r.type === "snippet");
    expect(snippetResult?.chapterTitle).toBe("Chapter One");
  });

  it("strips markdown headers from note names", () => {
    const { result } = renderHook(() => useGlobalSearch("John Doe"), {
      wrapper: createWrapper(baseState)
    });

    const characterResult = result.current.find((r) => r.type === "character");
    expect(characterResult?.title).toBe("John Doe");
    expect(characterResult?.title).not.toContain("#");
  });

  it("returns empty array when no story is active", () => {
    const stateWithoutStory: Partial<YarnyState> = {
      ...baseState,
      entities: {
        ...baseState.entities!,
        stories: {}
      }
    };

    const { result } = renderHook(() => useGlobalSearch("test"), {
      wrapper: createWrapper(stateWithoutStory)
    });

    expect(result.current).toEqual([]);
  });

  it("handles notes without markdown headers", () => {
    const stateWithPlainNote: Partial<YarnyState> = {
      ...baseState,
      entities: {
        ...baseState.entities!,
        notes: {
          "plain-note": {
            id: "plain-note",
            storyId: mockStoryId,
            kind: "character",
            content: "Plain text note without header",
            order: 0,
            updatedAt: new Date().toISOString()
          }
        }
      }
    };

    const { result } = renderHook(() => useGlobalSearch("Plain text"), {
      wrapper: createWrapper(stateWithPlainNote)
    });

    const noteResult = result.current.find((r) => r.id === "plain-note");
    expect(noteResult).toBeDefined();
    expect(noteResult?.title).toBe("Plain text note without header");
  });

  it("truncates long previews", () => {
    const longContent = "A".repeat(200);
    const stateWithLongContent: Partial<YarnyState> = {
      ...baseState,
      entities: {
        ...baseState.entities!,
        snippets: {
          [mockSnippetId]: {
            id: mockSnippetId,
            storyId: mockStoryId,
            chapterId: mockChapterId,
            content: longContent,
            order: 0,
            updatedAt: new Date().toISOString()
          }
        }
      }
    };

    const { result } = renderHook(() => useGlobalSearch("A"), {
      wrapper: createWrapper(stateWithLongContent)
    });

    const snippetResult = result.current.find((r) => r.type === "snippet");
    expect(snippetResult?.preview).toBeDefined();
    expect(snippetResult?.preview?.length).toBeLessThanOrEqual(103); // 100 + "..."
    expect(snippetResult?.preview).toContain("...");
  });
});

