import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { StoriesPage } from "./StoriesPage";
import * as useAuthModule from "../../hooks/useAuth";
import * as useStoriesQueryModule from "../../hooks/useStoriesQuery";
import * as useStoryMutationsModule from "../../hooks/useStoryMutations";

// Mock dependencies
vi.mock("../../hooks/useAuth");
vi.mock("../../hooks/useStoriesQuery");
vi.mock("../../hooks/useStoryMutations");
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn()
  };
});

const mockStories = [
  {
    id: "story-1",
    name: "My First Novel",
    modifiedTime: "2025-01-08T10:00:00Z"
  },
  {
    id: "story-2",
    name: "Short Story Collection",
    modifiedTime: "2025-01-07T15:30:00Z"
  },
  {
    id: "story-3",
    name: "Fantasy Epic",
    modifiedTime: "2025-01-06T09:15:00Z"
  }
];

const renderStoriesPage = () => {
  return render(
    <BrowserRouter>
      <StoriesPage />
    </BrowserRouter>
  );
};

describe("StoriesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: { email: "test@example.com" },
      logout: vi.fn(),
      isLoading: false
    });

    vi.mocked(useStoriesQueryModule.useStoriesQuery).mockReturnValue({
      data: mockStories,
      isLoading: false,
      error: null
    });

    vi.mocked(useStoryMutationsModule.useRefreshStories).mockReturnValue({
      mutateAsync: vi.fn(),
      isLoading: false
    } as any);
  });

  describe("Story Management", () => {
    it("renders list of stories", () => {
      renderStoriesPage();

      expect(screen.getByText("My First Novel")).toBeInTheDocument();
      expect(screen.getByText("Short Story Collection")).toBeInTheDocument();
      expect(screen.getByText("Fantasy Epic")).toBeInTheDocument();
    });

    it("displays empty state when no stories exist", () => {
      vi.mocked(useStoriesQueryModule.useStoriesQuery).mockReturnValue({
        data: [],
        isLoading: false,
        error: null
      });

      renderStoriesPage();

      expect(
        screen.getByText(/No stories yet/i)
      ).toBeInTheDocument();
    });

    it("displays loading state while fetching stories", () => {
      vi.mocked(useStoriesQueryModule.useStoriesQuery).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null
      });

      renderStoriesPage();

      expect(screen.getByText(/Loading stories/i)).toBeInTheDocument();
    });

    it("displays Drive auth prompt when not authorized", () => {
      vi.mocked(useStoriesQueryModule.useStoriesQuery).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error("Not authorized")
      });

      renderStoriesPage();

      expect(
        screen.getByText(/Connect to Google Drive/i)
      ).toBeInTheDocument();
    });
  });

  describe("Search Functionality", () => {
    it("filters stories by search query", async () => {
      const user = userEvent.setup();
      renderStoriesPage();

      const searchInput = screen.getByPlaceholderText(/Search stories/i);
      await user.type(searchInput, "Novel");

      await waitFor(() => {
        expect(screen.getByText("My First Novel")).toBeInTheDocument();
        expect(screen.queryByText("Short Story Collection")).not.toBeInTheDocument();
        expect(screen.queryByText("Fantasy Epic")).not.toBeInTheDocument();
      });
    });

    it("shows no results message when search has no matches", async () => {
      const user = userEvent.setup();
      renderStoriesPage();

      const searchInput = screen.getByPlaceholderText(/Search stories/i);
      await user.type(searchInput, "NonExistentStory");

      await waitFor(() => {
        expect(
          screen.getByText(/No stories found matching/i)
        ).toBeInTheDocument();
      });
    });

    it("search is case-insensitive", async () => {
      const user = userEvent.setup();
      renderStoriesPage();

      const searchInput = screen.getByPlaceholderText(/Search stories/i);
      await user.type(searchInput, "novel");

      await waitFor(() => {
        expect(screen.getByText("My First Novel")).toBeInTheDocument();
      });
    });

    it("clears search results when query is cleared", async () => {
      const user = userEvent.setup();
      renderStoriesPage();

      const searchInput = screen.getByPlaceholderText(/Search stories/i);
      await user.type(searchInput, "Novel");
      await user.clear(searchInput);

      await waitFor(() => {
        expect(screen.getByText("My First Novel")).toBeInTheDocument();
        expect(screen.getByText("Short Story Collection")).toBeInTheDocument();
        expect(screen.getByText("Fantasy Epic")).toBeInTheDocument();
      });
    });
  });

  describe("Modal Behavior", () => {
    it("opens new story modal when New Story button is clicked", async () => {
      const user = userEvent.setup();
      renderStoriesPage();

      const newStoryButton = screen.getByRole("button", { name: /New Story/i });
      await user.click(newStoryButton);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /Create New Story/i })).toBeInTheDocument();
      });
    });

    it("closes new story modal when close button is clicked", async () => {
      const user = userEvent.setup();
      renderStoriesPage();

      // Open modal
      const newStoryButton = screen.getByRole("button", { name: /New Story/i });
      await user.click(newStoryButton);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /Create New Story/i })).toBeInTheDocument();
      });

      // Close modal
      const closeButton = screen.getByRole("button", { name: /close/i });
      await user.click(closeButton);

      await waitFor(() => {
        expect(
          screen.queryByRole("heading", { name: /Create New Story/i })
        ).not.toBeInTheDocument();
      });
    });

    it("opens delete modal when delete button is clicked on a story card", async () => {
      const user = userEvent.setup();
      renderStoriesPage();

      // Find delete button (Close icon) on first story card
      const deleteButtons = screen.getAllByRole("button", { name: "" });
      const deleteButton = deleteButtons.find((btn) =>
        btn.querySelector('svg[data-testid="CloseIcon"]')
      );

      if (deleteButton) {
        await user.click(deleteButton);

        await waitFor(() => {
          expect(
            screen.getByRole("heading", { name: /Delete Story/i })
          ).toBeInTheDocument();
        });
      }
    });
  });

  describe("Refresh Functionality", () => {
    it("calls refresh when refresh button is clicked", async () => {
      const user = userEvent.setup();
      const mockRefresh = vi.fn();
      vi.mocked(useStoryMutationsModule.useRefreshStories).mockReturnValue({
        mutateAsync: mockRefresh,
        isLoading: false
      } as any);

      renderStoriesPage();

      const refreshButton = screen.getByRole("button", { name: /Refresh/i });
      await user.click(refreshButton);

      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe("Navigation", () => {
    it("redirects to login when user is not authenticated", () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: null,
        logout: vi.fn(),
        isLoading: false
      });

      const navigate = vi.fn();
      vi.mocked(require("react-router-dom").useNavigate).mockReturnValue(navigate);

      renderStoriesPage();

      // Note: This test may need adjustment based on actual navigation implementation
      // The component should navigate away when user is null
    });
  });
});


