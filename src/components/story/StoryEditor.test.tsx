import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor, act } from "@testing-library/react";
import { renderWithProviders } from "../../../tests/utils/test-utils";
import { StoryEditor } from "./StoryEditor";
import { useAutoSave } from "../../hooks/useAutoSave";
import { useConflictDetection } from "../../hooks/useConflictDetection";
import { useStoryMetadata } from "../../hooks/useStoryMetadata";
import { useEditorContent } from "./StoryEditor/useEditorContent";

// Mock useParams to provide route params
const mockUseParams = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: () => mockUseParams()
  };
});

// Mock dependencies
vi.mock("../../hooks/useAutoSave", () => ({
  useAutoSave: vi.fn()
}));

vi.mock("../../hooks/useConflictDetection", () => ({
  useConflictDetection: vi.fn()
}));

vi.mock("../../hooks/useStoryMetadata", () => ({
  useStoryMetadata: vi.fn()
}));

vi.mock("./StoryEditor/useEditorContent", () => ({
  useEditorContent: vi.fn()
}));

vi.mock("../../editor/plainTextEditor", () => ({
  usePlainTextEditor: vi.fn(() => ({
    getJSON: vi.fn(() => ({ type: "doc", content: [] })),
    commands: { setContent: vi.fn(), focus: vi.fn() },
    on: vi.fn(),
    off: vi.fn(),
    isDestroyed: false,
    isEditable: true,
    isFocused: false,
    setEditable: vi.fn()
  }))
}));

/**
 * StoryEditor Component Tests
 * 
 * Tests focus on app behavior, not TipTap internals:
 * - When editorContent changes → auto-save triggers
 * - When snippet changes → editorContent updates
 * - When content changes → conflict detection runs
 * 
 * We do NOT test TipTap internals like:
 * - editor.commands.setContent()
 * - editor.getJSON()
 * - editor event handlers
 */
describe("StoryEditor", () => {
  const mockStory = {
    id: "story-1",
    title: "Test Story",
    driveFileId: "drive-story-1",
    projectId: "project-1",
    chapterIds: ["chapter-1"],
    updatedAt: "2024-01-01T00:00:00Z"
  };

  const mockChapter = {
    id: "chapter-1",
    storyId: "story-1",
    title: "Chapter 1",
    order: 0,
    snippetIds: ["snippet-1"],
    driveFolderId: "drive-chapter-1",
    updatedAt: "2024-01-01T00:00:00Z"
  };

  const mockSnippet = {
    id: "snippet-1",
    storyId: "story-1",
    chapterId: "chapter-1",
    order: 0,
    content: "Initial snippet content",
    driveFileId: "drive-snippet-1",
    updatedAt: "2024-01-01T00:00:00Z"
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Default mock for useParams - return empty params
    mockUseParams.mockReturnValue({});

    // Mock hooks
    vi.mocked(useAutoSave).mockReturnValue({
      save: vi.fn(),
      isSaving: false,
      hasUnsavedChanges: false,
      lastSavedContent: "",
      markAsSaved: vi.fn()
    } as any);

    vi.mocked(useConflictDetection).mockReturnValue({
      checkSnippetConflict: vi.fn().mockResolvedValue(null),
      resolveConflictWithDrive: vi.fn()
    } as any);

    vi.mocked(useStoryMetadata).mockReturnValue({
      data: { title: "Test Story" },
      isLoading: false,
      isError: false
    } as any);

    // Mock useEditorContent to return initial content
    vi.mocked(useEditorContent).mockReturnValue([
      mockSnippet.content,
      vi.fn()
    ] as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("displays loading state when isLoading is true", () => {
    renderWithProviders(<StoryEditor isLoading={true} />);

    expect(screen.getByText(/loading story/i)).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("displays empty state when no story is selected", () => {
    const initialState = {
      entities: {
        stories: {}
      },
      ui: {
        activeStoryId: undefined,
        activeSnippetId: undefined
      }
    };

    renderWithProviders(<StoryEditor isLoading={false} />, { initialState });

    expect(screen.getByText(/select a story to start writing/i)).toBeInTheDocument();
  });

  it("displays message when no snippet is selected", () => {
    mockUseParams.mockReturnValue({ storyId: mockStory.id });
    
    const initialState = {
      entities: {
        stories: {
          [mockStory.id]: mockStory
        },
        chapters: {
          [mockChapter.id]: mockChapter
        },
        snippets: {}
      },
      ui: {
        activeStoryId: mockStory.id,
        activeSnippetId: undefined
      }
    };

    renderWithProviders(<StoryEditor isLoading={false} />, { initialState });

    expect(screen.getByText(/create a snippet to start writing/i)).toBeInTheDocument();
  });

  describe("Auto-Save Behavior", () => {
    it("configures auto-save with editorContent from useEditorContent", () => {
      const initialContent = "Initial content";
      vi.mocked(useEditorContent).mockReturnValue([
        initialContent,
        vi.fn()
      ] as any);

      const initialState = {
        entities: {
          stories: {
            [mockStory.id]: mockStory
          },
          chapters: {
            [mockChapter.id]: mockChapter
          },
          snippets: {
            [mockSnippet.id]: mockSnippet
          }
        },
        ui: {
          activeStoryId: mockStory.id,
          activeSnippetId: mockSnippet.id
        }
      };

      renderWithProviders(<StoryEditor isLoading={false} />, { initialState });

      // Verify useAutoSave was called with content from useEditorContent
      // Note: useAutoSave is called multiple times (for snippets and notes)
      // Check that it was called with the editorContent
      const calls = vi.mocked(useAutoSave).mock.calls;
      const callWithContent = calls.find(call => call[1] === initialContent);
      expect(callWithContent).toBeDefined();
      expect(callWithContent![2]).toMatchObject({
        debounceMs: 2000
      });
    });

    it("updates auto-save configuration when editorContent changes", () => {
      const setEditorContent = vi.fn();
      let currentContent = "Initial content";
      
      // Mock useEditorContent to return different content on subsequent calls
      vi.mocked(useEditorContent).mockImplementation(() => {
        return [currentContent, setEditorContent] as any;
      });

      const initialState = {
        entities: {
          stories: {
            [mockStory.id]: mockStory
          },
          chapters: {
            [mockChapter.id]: mockChapter
          },
          snippets: {
            [mockSnippet.id]: mockSnippet
          }
        },
        ui: {
          activeStoryId: mockStory.id,
          activeSnippetId: mockSnippet.id
        }
      };

      const { rerender } = renderWithProviders(<StoryEditor isLoading={false} />, { initialState });

      // Verify initial call
      const initialCalls = vi.mocked(useAutoSave).mock.calls;
      const initialCall = initialCalls.find(call => call[1] === "Initial content");
      expect(initialCall).toBeDefined();

      // Simulate editorContent change
      currentContent = "Updated content";
      rerender(<StoryEditor isLoading={false} />);

      // Verify useAutoSave was called again with updated content
      const updatedCalls = vi.mocked(useAutoSave).mock.calls;
      const updatedCall = updatedCalls.find(call => call[1] === "Updated content");
      expect(updatedCall).toBeDefined();
    });

    it("enables auto-save when snippet and chapter are available", () => {
      vi.mocked(useEditorContent).mockReturnValue([
        mockSnippet.content,
        vi.fn()
      ] as any);

      const initialState = {
        entities: {
          stories: {
            [mockStory.id]: mockStory
          },
          chapters: {
            [mockChapter.id]: mockChapter
          },
          snippets: {
            [mockSnippet.id]: mockSnippet
          }
        },
        ui: {
          activeStoryId: mockStory.id,
          activeSnippetId: mockSnippet.id
        }
      };

      renderWithProviders(<StoryEditor isLoading={false} />, { initialState });

      // Verify auto-save is configured when snippet and chapter exist
      // Check that useAutoSave was called with the snippet content
      const calls = vi.mocked(useAutoSave).mock.calls;
      const callWithSnippetContent = calls.find(call => call[1] === mockSnippet.content);
      expect(callWithSnippetContent).toBeDefined();
      expect(callWithSnippetContent![2]).toMatchObject({
        debounceMs: 2000
      });
    });
  });

  describe("Content Synchronization", () => {
    it("calls useEditorContent hook with active snippet", () => {
      // Mock useEditorContent to return content based on snippet
      vi.mocked(useEditorContent).mockImplementation((snippet) => {
        return [snippet?.content || "", vi.fn()] as any;
      });

      const initialState = {
        entities: {
          stories: {
            [mockStory.id]: mockStory
          },
          chapters: {
            [mockChapter.id]: mockChapter
          },
          snippets: {
            [mockSnippet.id]: mockSnippet
          }
        },
        ui: {
          activeStoryId: mockStory.id,
          activeSnippetId: mockSnippet.id
        }
      };

      renderWithProviders(<StoryEditor isLoading={false} />, { initialState });

      // Verify useEditorContent was called (component uses it to get editor content)
      expect(useEditorContent).toHaveBeenCalled();
    });

    it("uses editorContent from useEditorContent hook", () => {
      const editorContentValue = "Editor content from hook";
      // Mock useEditorContent to return specific content
      vi.mocked(useEditorContent).mockReturnValue([
        editorContentValue,
        vi.fn()
      ] as any);

      const initialState = {
        entities: {
          stories: {
            [mockStory.id]: mockStory
          },
          chapters: {
            [mockChapter.id]: mockChapter
          },
          snippets: {
            [mockSnippet.id]: mockSnippet
          }
        },
        ui: {
          activeStoryId: mockStory.id,
          activeSnippetId: mockSnippet.id
        }
      };

      renderWithProviders(<StoryEditor isLoading={false} />, { initialState });

      // Verify useEditorContent was called and its return value is used
      expect(useEditorContent).toHaveBeenCalled();
      
      // Verify useAutoSave was called with content from useEditorContent
      const calls = vi.mocked(useAutoSave).mock.calls;
      const callWithContent = calls.find(call => call[1] === editorContentValue);
      expect(callWithContent).toBeDefined();
    });
  });

  describe("Conflict Detection", () => {
    it("configures conflict detection hook with snippet and editorContent", () => {
      const mockCheckConflict = vi.fn().mockResolvedValue(null);
      vi.mocked(useConflictDetection).mockReturnValue({
        checkSnippetConflict: mockCheckConflict,
        resolveConflictWithDrive: vi.fn()
      } as any);

      vi.mocked(useEditorContent).mockReturnValue([
        "Initial content",
        vi.fn()
      ] as any);

      const initialState = {
        entities: {
          stories: {
            [mockStory.id]: mockStory
          },
          chapters: {
            [mockChapter.id]: mockChapter
          },
          snippets: {
            [mockSnippet.id]: mockSnippet
          }
        },
        ui: {
          activeStoryId: mockStory.id,
          activeSnippetId: mockSnippet.id
        }
      };

      renderWithProviders(<StoryEditor isLoading={false} />, { initialState });

      // Verify useConflictDetection was called (component sets up conflict detection)
      expect(useConflictDetection).toHaveBeenCalled();
    });

    it("sets up conflict detection when snippet has driveFileId", () => {
      const mockConflict = {
        driveContent: "Drive content",
        driveModifiedTime: "2024-01-02T00:00:00Z",
        localContent: "Local content",
        localModifiedTime: "2024-01-01T00:00:00Z"
      };

      const mockCheckConflict = vi.fn().mockResolvedValue(mockConflict);
      vi.mocked(useConflictDetection).mockReturnValue({
        checkSnippetConflict: mockCheckConflict,
        resolveConflictWithDrive: vi.fn()
      } as any);

      const initialState = {
        entities: {
          stories: {
            [mockStory.id]: mockStory
          },
          chapters: {
            [mockChapter.id]: mockChapter
          },
          snippets: {
            [mockSnippet.id]: mockSnippet
          }
        },
        ui: {
          activeStoryId: mockStory.id,
          activeSnippetId: mockSnippet.id
        }
      };

      renderWithProviders(<StoryEditor isLoading={false} />, { initialState });

      // Verify conflict detection hook is configured
      // The actual conflict checking happens in useConflictDetectionHook
      // which is tested separately
      expect(useConflictDetection).toHaveBeenCalled();
    });
  });

  describe("Story Metadata", () => {
    it("fetches story metadata when story has driveFileId", () => {
      vi.mocked(useStoryMetadata).mockReturnValue({
        data: { title: "Metadata Title" },
        isLoading: false,
        isError: false
      } as any);

      const initialState = {
        entities: {
          stories: {
            [mockStory.id]: mockStory
          },
          chapters: {
            [mockChapter.id]: mockChapter
          },
          snippets: {
            [mockSnippet.id]: mockSnippet
          }
        },
        ui: {
          activeStoryId: mockStory.id,
          activeSnippetId: mockSnippet.id
        }
      };

      renderWithProviders(<StoryEditor isLoading={false} />, { initialState });

      // Verify useStoryMetadata was called (component fetches metadata)
      expect(useStoryMetadata).toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("handles missing chapter gracefully", () => {
      const initialState = {
        entities: {
          stories: {
            [mockStory.id]: mockStory
          },
          chapters: {},
          snippets: {
            [mockSnippet.id]: {
              ...mockSnippet,
              chapterId: "non-existent-chapter"
            }
          }
        },
        ui: {
          activeStoryId: mockStory.id,
          activeSnippetId: mockSnippet.id
        }
      };

      // Component should render without crashing
      renderWithProviders(<StoryEditor isLoading={false} />, { initialState });

      // Component should render without crashing
      // Auto-save may be disabled when chapter is missing (no driveFolderId)
      expect(useAutoSave).toHaveBeenCalled();
    });
  });
});
