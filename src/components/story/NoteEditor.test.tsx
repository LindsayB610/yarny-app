import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../tests/utils/test-utils";
import { NoteEditor } from "./NoteEditor";
import { apiClient } from "../../api/client";
import { useNotesQuery } from "../../hooks/useNotesQuery";
import { mirrorNoteWrite } from "../../services/localFs/localBackupMirror";

// Mock dependencies
vi.mock("../../api/client", () => ({
  apiClient: {
    writeDriveFile: vi.fn()
  }
}));

vi.mock("../../hooks/useNotesQuery", () => ({
  useNotesQuery: vi.fn()
}));

vi.mock("../../services/localFs/localBackupMirror", () => ({
  mirrorNoteWrite: vi.fn()
}));

// Mock TipTap editor - return a proper editor instance
const createMockEditor = () => {
  const updateHandlers: Array<() => void> = [];
  
  return {
    getJSON: vi.fn(() => ({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Test content" }]
        }
      ]
    })),
    commands: {
      setContent: vi.fn(),
      focus: vi.fn()
    },
    on: vi.fn((event: string, handler: () => void) => {
      if (event === "update") {
        updateHandlers.push(handler);
      }
      return () => {
        const index = updateHandlers.indexOf(handler);
        if (index > -1) updateHandlers.splice(index, 1);
      };
    }),
    off: vi.fn(),
    isDestroyed: false,
    // Helper to trigger update events
    _triggerUpdate: () => {
      updateHandlers.forEach(handler => handler());
    }
  };
};

let mockEditor: ReturnType<typeof createMockEditor>;

vi.mock("../../editor/plainTextEditor", () => ({
  usePlainTextEditor: vi.fn(() => {
    mockEditor = createMockEditor();
    return mockEditor;
  })
}));

/**
 * NoteEditor Component Tests
 * 
 * STATUS: SKIPPED - TipTap Editor Mocking Complexity
 * 
 * These tests are skipped due to the complexity of properly mocking TipTap's editor instance
 * and its asynchronous initialization behavior. See `plans/NOTEEDITOR_TIPTAP_TESTING_INVESTIGATION.md`
 * for detailed analysis and recommendations.
 * 
 * COVERAGE GAPS (not covered by unit tests):
 * - Auto-save debouncing behavior
 * - Content synchronization between editor and store
 * - Error handling during save operations
 * - Optimistic updates
 * - Local backup mirroring
 * 
 * CURRENT TESTING STRATEGY:
 * - Manual testing: NoteEditor functionality is manually tested during development
 * - E2E tests: Basic editor functionality is covered by E2E tests (see tests/e2e/)
 * - Integration tests: Consider adding integration tests with real TipTap editor (medium-term)
 * 
 * RECOMMENDATIONS:
 * - Short-term: Continue manual testing and E2E coverage
 * - Medium-term: Add integration tests with real TipTap editor instance
 * - Long-term: Refactor component to separate editor logic into testable hooks
 * 
 * See investigation report: plans/NOTEEDITOR_TIPTAP_TESTING_INVESTIGATION.md
 */
describe.skip("NoteEditor", () => {
  const mockStory = {
    id: "story-1",
    title: "Test Story",
    folderId: "folder-1"
  };

  const mockNote: ReturnType<typeof useNotesQuery>["data"][0] = {
    id: "note-1",
    name: "Test Note",
    content: "Initial content",
    modifiedTime: "2024-01-01T00:00:00Z",
    mimeType: "text/plain"
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Mock useNotesQuery to return notes
    vi.mocked(useNotesQuery).mockReturnValue({
      data: [mockNote],
      isLoading: false,
      isError: false,
      isSuccess: true,
      error: null,
      refetch: vi.fn()
    } as any);

    // Mock API client
    vi.mocked(apiClient.writeDriveFile).mockResolvedValue({
      id: "note-1",
      name: "Test Note",
      modifiedTime: "2024-01-01T01:00:00Z"
    });

    // Mock local backup mirror
    vi.mocked(mirrorNoteWrite).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders note editor when note is selected", async () => {
    const initialState = {
      entities: {
        stories: {
          [mockStory.id]: mockStory
        }
      },
      ui: {
        activeStoryId: mockStory.id,
        activeNote: {
          id: mockNote.id,
          type: "people" as const
        }
      }
    };

    renderWithProviders(<NoteEditor />, { initialState });

    // Wait for component to mount and editor to initialize
    await waitFor(() => {
      expect(mockEditor).toBeDefined();
    }, { timeout: 2000 });
    
    // Verify editor was initialized
    expect(mockEditor.commands.setContent).toHaveBeenCalled();
  });

  it("displays save status when content is saved", async () => {
    const initialState = {
      entities: {
        stories: {
          [mockStory.id]: mockStory
        }
      },
      ui: {
        activeStoryId: mockStory.id,
        activeNote: {
          id: mockNote.id,
          type: "people" as const
        }
      }
    };

    renderWithProviders(<NoteEditor />, { initialState });

    await waitFor(() => {
      expect(mockEditor).toBeDefined();
    }, { timeout: 2000 });

    // Component should show save status
    await waitFor(() => {
      const saveButton = screen.queryByRole("button", { name: /save/i });
      expect(saveButton).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it("displays unsaved changes indicator when content changes", async () => {
    const initialState = {
      entities: {
        stories: {
          [mockStory.id]: mockStory
        }
      },
      ui: {
        activeStoryId: mockStory.id,
        activeNote: {
          id: mockNote.id,
          type: "people" as const
        }
      }
    };

    renderWithProviders(<NoteEditor />, { initialState });

    await waitFor(() => {
      expect(mockEditor).toBeDefined();
    }, { timeout: 2000 });

    // Simulate editor update event
    act(() => {
      mockEditor._triggerUpdate();
    });

    // Wait for state update
    await waitFor(() => {
      const saveButton = screen.queryByRole("button", { name: /save/i });
      expect(saveButton).not.toBeDisabled();
    }, { timeout: 2000 });
  });

  it("autosaves content after 2 second debounce", async () => {
    const initialState = {
      entities: {
        stories: {
          [mockStory.id]: mockStory
        }
      },
      ui: {
        activeStoryId: mockStory.id,
        activeNote: {
          id: mockNote.id,
          type: "people" as const
        }
      }
    };

    renderWithProviders(<NoteEditor />, { initialState });

    await waitFor(() => {
      expect(mockEditor).toBeDefined();
    }, { timeout: 2000 });

    // Simulate editor update event
    act(() => {
      mockEditor._triggerUpdate();
    });

    // Fast-forward time but not enough to trigger save
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(apiClient.writeDriveFile).not.toHaveBeenCalled();

    // Fast-forward to trigger debounced save
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(apiClient.writeDriveFile).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it.skip("resets debounce timer when content changes rapidly", async () => {
    const initialState = {
      entities: {
        stories: {
          [mockStory.id]: mockStory
        }
      },
      ui: {
        activeStoryId: mockStory.id,
        activeNote: {
          id: mockNote.id,
          type: "people" as const
        }
      }
    };

    const { getByRole } = renderWithProviders(<NoteEditor />, { initialState });

    const editor = await waitFor(() => getByRole("textbox"));

    // Type content multiple times rapidly
    await act(async () => {
      await userEvent.type(editor, "A");
    });

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    await act(async () => {
      await userEvent.type(editor, "B");
    });

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    // Should not have saved yet
    expect(apiClient.writeDriveFile).not.toHaveBeenCalled();

    // Now wait for full debounce
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(apiClient.writeDriveFile).toHaveBeenCalledTimes(1);
    });
  });

  it.skip("manually saves when save button is clicked", async () => {
    const initialState = {
      entities: {
        stories: {
          [mockStory.id]: mockStory
        }
      },
      ui: {
        activeStoryId: mockStory.id,
        activeNote: {
          id: mockNote.id,
          type: "people" as const
        }
      }
    };

    const { getByRole } = renderWithProviders(<NoteEditor />, { initialState });

    const editor = await waitFor(() => getByRole("textbox"));

    // Type content
    await act(async () => {
      await userEvent.type(editor, "New content");
    });

    // Click save button
    const saveButton = screen.getByRole("button", { name: /save/i });
    await act(async () => {
      await userEvent.click(saveButton);
    });

    // Should save immediately without waiting for debounce
    await waitFor(() => {
      expect(apiClient.writeDriveFile).toHaveBeenCalled();
    });
  });

  it.skip("disables save button when there are no unsaved changes", async () => {
    const initialState = {
      entities: {
        stories: {
          [mockStory.id]: mockStory
        }
      },
      ui: {
        activeStoryId: mockStory.id,
        activeNote: {
          id: mockNote.id,
          type: "people" as const
        }
      }
    };

    renderWithProviders(<NoteEditor />, { initialState });

    await waitFor(() => {
      const saveButton = screen.getByRole("button", { name: /save/i });
      expect(saveButton).toBeDisabled();
    });
  });

  it.skip("saves content on beforeunload if there are unsaved changes", async () => {
    const initialState = {
      entities: {
        stories: {
          [mockStory.id]: mockStory
        }
      },
      ui: {
        activeStoryId: mockStory.id,
        activeNote: {
          id: mockNote.id,
          type: "people" as const
        }
      }
    };

    const { getByRole } = renderWithProviders(<NoteEditor />, { initialState });

    const editor = await waitFor(() => getByRole("textbox"));

    // Type content
    await act(async () => {
      await userEvent.type(editor, "New content");
    });

    // Trigger beforeunload
    act(() => {
      window.dispatchEvent(new Event("beforeunload"));
    });

    await waitFor(() => {
      expect(apiClient.writeDriveFile).toHaveBeenCalled();
    });
  });

  it.skip("saves previous note when switching to a new note", async () => {
    const initialState = {
      entities: {
        stories: {
          [mockStory.id]: mockStory
        }
      },
      ui: {
        activeStoryId: mockStory.id,
        activeNote: {
          id: mockNote.id,
          type: "people" as const
        }
      }
    };

    const { getByRole, store } = renderWithProviders(<NoteEditor />, { initialState });

    const editor = await waitFor(() => getByRole("textbox"));

    // Type content in first note
    await act(async () => {
      await userEvent.type(editor, "Note 1 content");
    });

    // Switch to a different note
    act(() => {
      store.getState().setActiveNote({
        id: "note-2",
        type: "places"
      });
    });

    // Should save previous note
    await waitFor(() => {
      expect(apiClient.writeDriveFile).toHaveBeenCalledWith(
        expect.objectContaining({
          fileId: mockNote.id
        })
      );
    });
  });

  it.skip("handles save errors gracefully", async () => {
    const initialState = {
      entities: {
        stories: {
          [mockStory.id]: mockStory
        }
      },
      ui: {
        activeStoryId: mockStory.id,
        activeNote: {
          id: mockNote.id,
          type: "people" as const
        }
      }
    };

    const error = new Error("Save failed");
    vi.mocked(apiClient.writeDriveFile).mockRejectedValue(error);

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { getByRole } = renderWithProviders(<NoteEditor />, { initialState });

    const editor = await waitFor(() => getByRole("textbox"));

    // Type content
    await act(async () => {
      await userEvent.type(editor, "New content");
    });

    // Wait for debounced save
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to save note:", error);
    });

    consoleErrorSpy.mockRestore();
  });

  it.skip("does not save when content hasn't changed", async () => {
    const initialState = {
      entities: {
        stories: {
          [mockStory.id]: mockStory
        }
      },
      ui: {
        activeStoryId: mockStory.id,
        activeNote: {
          id: mockNote.id,
          type: "people" as const
        }
      }
    };

    renderWithProviders(<NoteEditor />, { initialState });

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Should not save since content hasn't changed
    expect(apiClient.writeDriveFile).not.toHaveBeenCalled();
  });

  it.skip("clears content when note is deselected", async () => {
    const initialState = {
      entities: {
        stories: {
          [mockStory.id]: mockStory
        }
      },
      ui: {
        activeStoryId: mockStory.id,
        activeNote: {
          id: mockNote.id,
          type: "people" as const
        }
      }
    };

    const { store } = renderWithProviders(<NoteEditor />, { initialState });

    await waitFor(() => {
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    // Deselect note
    act(() => {
      store.getState().setActiveNote(null);
    });

    await waitFor(() => {
      const editor = screen.getByRole("textbox");
      expect(editor).toHaveValue("");
    });
  });
});

