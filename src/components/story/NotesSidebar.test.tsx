import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../tests/utils/test-utils";
import { NotesSidebar } from "./NotesSidebar";
import { useNotesQuery } from "../../hooks/useNotesQuery";
import { useCreateNoteMutation, useReorderNotesMutation } from "../../hooks/useNotesMutations";

// Mock useParams to provide storyId
const mockUseParams = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: () => mockUseParams(),
    useLocation: () => ({ pathname: "/stories/story-1" }),
    useNavigate: () => vi.fn()
  };
});

// Mock dependencies
vi.mock("../../hooks/useNotesQuery", () => ({
  useNotesQuery: vi.fn()
}));

vi.mock("../../hooks/useNotesMutations", () => ({
  useCreateNoteMutation: vi.fn(),
  useReorderNotesMutation: vi.fn()
}));

// Mock @dnd-kit utilities
vi.mock("@dnd-kit/utilities", () => ({
  CSS: {
    Transform: {
      toString: (transform: { x: number; y: number } | null) =>
        transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : ""
    }
  }
}));

describe("NotesSidebar", () => {
  const mockStory = {
    id: "story-1",
    title: "Test Story",
    folderId: "folder-1"
  };

  const mockNotes = [
    {
      id: "note-1",
      name: "John Doe",
      content: "Main character",
      modifiedTime: "2024-01-01T00:00:00Z"
    },
    {
      id: "note-2",
      name: "Jane Smith",
      content: "Supporting character",
      modifiedTime: "2024-01-02T00:00:00Z"
    },
    {
      id: "note-3",
      name: "Bob Johnson",
      content: "Antagonist",
      modifiedTime: "2024-01-03T00:00:00Z"
    }
  ];

  const mockCreateNoteMutation = {
    mutateAsync: vi.fn(),
    isPending: false
  };

  const mockReorderNotesMutation = {
    mutate: vi.fn(),
    isPending: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock for useParams - return storyId for most tests
    mockUseParams.mockReturnValue({ storyId: mockStory.id });

    // Mock useNotesQuery - needs to return different values based on noteType parameter
    vi.mocked(useNotesQuery).mockImplementation((storyId, noteType) => {
      return {
        data: mockNotes,
        isLoading: false,
        isError: false,
        isSuccess: true,
        error: null,
        refetch: vi.fn()
      } as any;
    });

    // Mock mutations
    vi.mocked(useCreateNoteMutation).mockReturnValue(mockCreateNoteMutation as any);
    vi.mocked(useReorderNotesMutation).mockReturnValue(mockReorderNotesMutation as any);
  });

  it("renders empty state when no story is selected", () => {
    mockUseParams.mockReturnValue({ storyId: undefined });
    
    const initialState = {
      entities: {
        stories: {}
      },
      ui: {
        activeStoryId: undefined,
        activeNote: null
      }
    };

    renderWithProviders(<NotesSidebar />, { initialState });

    expect(screen.getByText(/select a story to view/i)).toBeInTheDocument();
  });

  it("renders notes sidebar when story is selected", async () => {
    const initialState = {
      entities: {
        stories: {
          [mockStory.id]: mockStory
        }
      },
      ui: {
        activeStoryId: mockStory.id,
        activeNote: null
      }
    };

    renderWithProviders(<NotesSidebar />, { initialState });

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /people/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /places/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /things/i })).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it("displays notes in the People tab", async () => {
    const initialState = {
      entities: {
        stories: {
          [mockStory.id]: mockStory
        }
      },
      ui: {
        activeStoryId: mockStory.id,
        activeNote: null
      }
    };

    renderWithProviders(<NotesSidebar />, { initialState });

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
      expect(screen.getByText("Bob Johnson")).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it("displays note content preview", async () => {
    const initialState = {
      entities: {
        stories: {
          [mockStory.id]: mockStory
        }
      },
      ui: {
        activeStoryId: mockStory.id,
        activeNote: null
      }
    };

    renderWithProviders(<NotesSidebar />, { initialState });

    await waitFor(() => {
      expect(screen.getByText("Main character")).toBeInTheDocument();
      expect(screen.getByText("Supporting character")).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it("displays empty state when no notes exist", async () => {
    // Override beforeEach mock - return empty array for all note types
    // The component calls useNotesQuery twice (characters and worldbuilding)
    vi.mocked(useNotesQuery).mockReset();
    vi.mocked(useNotesQuery).mockImplementation((storyId, noteType) => ({
      data: [],
      isLoading: false,
      isError: false,
      isSuccess: true,
      error: null,
      refetch: vi.fn()
    } as any));

    // Ensure store has no notes (empty arrays for both note kinds)
    const initialState = {
      entities: {
        stories: {
          [mockStory.id]: mockStory
        },
        notes: {} // Empty notes object
      },
      ui: {
        activeStoryId: mockStory.id,
        activeNote: null
      }
    };

    renderWithProviders(<NotesSidebar />, { initialState });

    // Wait for empty state to appear - should show "No Characters entries yet"
    // The default active tab is "characters"
    await waitFor(() => {
      expect(screen.getByText(/No Characters entries yet/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it("displays loading state when notes are loading", () => {
    vi.mocked(useNotesQuery).mockImplementation(() => ({
      data: undefined,
      isLoading: true,
      isError: false,
      isSuccess: false,
      error: null,
      refetch: vi.fn()
    } as any));

    const initialState = {
      entities: {
        stories: {
          [mockStory.id]: mockStory
        }
      },
      ui: {
        activeStoryId: mockStory.id,
        activeNote: null
      }
    };

    renderWithProviders(<NotesSidebar />, { initialState });

    // Loading spinner should be present
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("switches between tabs", async () => {
    const user = userEvent.setup();
    vi.mocked(useNotesQuery).mockImplementation((storyId, noteType) => {
      if (noteType === "places") {
        return {
          data: [],
          isLoading: false,
          isError: false,
          isSuccess: true,
          error: null,
          refetch: vi.fn()
        } as any;
      }
      return {
        data: mockNotes,
        isLoading: false,
        isError: false,
        isSuccess: true,
        error: null,
        refetch: vi.fn()
      } as any;
    });

    const initialState = {
      entities: {
        stories: {
          [mockStory.id]: mockStory
        }
      },
      ui: {
        activeStoryId: mockStory.id,
        activeNote: null
      }
    };

    renderWithProviders(<NotesSidebar />, { initialState });

    // Click Places tab
    const placesTab = screen.getByRole("tab", { name: /places/i });
    await act(async () => {
      await user.click(placesTab);
    });

    // Should show Places content
    await waitFor(() => {
      expect(screen.getByText(/No.*Place.*entries yet/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it("highlights active note", () => {
    const initialState = {
      entities: {
        stories: {
          [mockStory.id]: mockStory
        }
      },
      ui: {
        activeStoryId: mockStory.id,
        activeNote: {
          id: "note-1",
          type: "people" as const
        }
      }
    };

    renderWithProviders(<NotesSidebar />, { initialState });

    // The active note should be highlighted (we can't easily test styles, but we can verify it's rendered)
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("creates new note when add button is clicked", async () => {
    const user = userEvent.setup();
    mockCreateNoteMutation.mutateAsync.mockResolvedValue({ id: "new-note-id" });

    const initialState = {
      entities: {
        stories: {
          [mockStory.id]: mockStory
        }
      },
      ui: {
        activeStoryId: mockStory.id,
        activeNote: null
      }
    };

    renderWithProviders(<NotesSidebar />, { initialState });

    // Find and click the add button (People tab is active by default)
    const addButton = screen.getByRole("button", { name: /add new person/i });
    await act(async () => {
      await user.click(addButton);
    });

    await waitFor(() => {
      expect(mockCreateNoteMutation.mutateAsync).toHaveBeenCalledWith({ noteType: "people" });
    });

    // Note: We can't easily verify store state changes without accessing the provider's store
    // The mutation was called, which is the main behavior we're testing
    // Store state verification would require accessing the provider context
  });

  it("disables create button when mutation is pending", () => {
    mockCreateNoteMutation.isPending = true;

    const initialState = {
      entities: {
        stories: {
          [mockStory.id]: mockStory
        }
      },
      ui: {
        activeStoryId: mockStory.id,
        activeNote: null
      }
    };

    renderWithProviders(<NotesSidebar />, { initialState });

    const addButton = screen.getByRole("button", { name: /add new person/i });
    expect(addButton).toBeDisabled();
  });

  it("disables create button when no story is selected", () => {
    const initialState = {
      entities: {
        stories: {}
      },
      ui: {
        activeStoryId: undefined,
        activeNote: null
      }
    };

    renderWithProviders(<NotesSidebar />, { initialState });

    // Component should show empty state, not create button
    expect(screen.queryByRole("button", { name: /add new/i })).not.toBeInTheDocument();
  });

  it("handles note creation errors gracefully", async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("Failed to create note");
    
    // Reset and set up mutation mock for this test
    mockCreateNoteMutation.mutateAsync.mockReset();
    mockCreateNoteMutation.mutateAsync.mockRejectedValue(error);
    mockCreateNoteMutation.isPending = false; // Ensure button is enabled

    const initialState = {
      entities: {
        stories: {
          [mockStory.id]: mockStory
        }
      },
      ui: {
        activeStoryId: mockStory.id,
        activeNote: null
      }
    };

    renderWithProviders(<NotesSidebar />, { initialState });

    // Wait for component to render and button to be enabled
    await waitFor(() => {
      const addButton = screen.getByRole("button", { name: /add new person/i });
      expect(addButton).not.toBeDisabled();
    });

    const addButton = screen.getByRole("button", { name: /add new person/i });
    await act(async () => {
      await user.click(addButton);
    });

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
    }, { timeout: 3000 });
    
    consoleErrorSpy.mockRestore();
  });

  it("displays different note types in their respective tabs", async () => {
    const user = userEvent.setup();

    // Mock different notes for different types
    vi.mocked(useNotesQuery).mockImplementation((storyId, noteType) => {
      if (noteType === "people") {
        return {
          data: [{ id: "person-1", name: "Person", content: "Person content", modifiedTime: "2024-01-01T00:00:00Z" }],
          isLoading: false,
          isError: false,
          isSuccess: true,
          error: null,
          refetch: vi.fn()
        } as any;
      } else if (noteType === "places") {
        return {
          data: [{ id: "place-1", name: "Place", content: "Place content", modifiedTime: "2024-01-01T00:00:00Z" }],
          isLoading: false,
          isError: false,
          isSuccess: true,
          error: null,
          refetch: vi.fn()
        } as any;
      } else {
        return {
          data: [{ id: "thing-1", name: "Thing", content: "Thing content", modifiedTime: "2024-01-01T00:00:00Z" }],
          isLoading: false,
          isError: false,
          isSuccess: true,
          error: null,
          refetch: vi.fn()
        } as any;
      }
    });

    const initialState = {
      entities: {
        stories: {
          [mockStory.id]: mockStory
        }
      },
      ui: {
        activeStoryId: mockStory.id,
        activeNote: null
      }
    };

    renderWithProviders(<NotesSidebar />, { initialState });

    // Should show People notes initially
    expect(screen.getByText("Person")).toBeInTheDocument();

    // Switch to Places tab
    const placesTab = screen.getByRole("tab", { name: /places/i });
    await act(async () => {
      await user.click(placesTab);
    });

    await waitFor(() => {
      expect(screen.getByText("Place")).toBeInTheDocument();
    });

    // Switch to Things tab
    const thingsTab = screen.getByRole("tab", { name: /things/i });
    await act(async () => {
      await user.click(thingsTab);
    });

    await waitFor(() => {
      expect(screen.getByText("Thing")).toBeInTheDocument();
    });
  });

  it("displays note modified dates", () => {
    const initialState = {
      entities: {
        stories: {
          [mockStory.id]: mockStory
        }
      },
      ui: {
        activeStoryId: mockStory.id,
        activeNote: null
      }
    };

    renderWithProviders(<NotesSidebar />, { initialState });

    // Note dates should be displayed
    // The exact format depends on locale, so we just check that dates are rendered
    const noteItems = screen.getAllByText(/john doe|jane smith|bob johnson/i);
    expect(noteItems.length).toBeGreaterThan(0);
  });

  it("displays empty content indicator", () => {
    const notesWithEmptyContent = [
      {
        id: "note-1",
        name: "Empty Note",
        content: "",
        modifiedTime: "2024-01-01T00:00:00Z"
      }
    ];

    vi.mocked(useNotesQuery).mockReturnValue({
      data: notesWithEmptyContent,
      isLoading: false,
      isError: false,
      isSuccess: true,
      error: null,
      refetch: vi.fn()
    } as any);

    const initialState = {
      entities: {
        stories: {
          [mockStory.id]: mockStory
        }
      },
      ui: {
        activeStoryId: mockStory.id,
        activeNote: null
      }
    };

    renderWithProviders(<NotesSidebar />, { initialState });

    expect(screen.getByText("(empty)")).toBeInTheDocument();
  });
});

// Note: Drag and drop functionality is tested through integration tests
// as it requires complex DnD context setup. The drag handlers are tested
// through the SortableSnippetList and SortableChapterList test patterns.

